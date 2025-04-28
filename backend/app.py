import os
import time
import requests
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import base64
from bson.objectid import ObjectId
from flask_bcrypt import Bcrypt

# Import database and authentication modules
from db import test_connection, users, try_on_history
from auth import token_required, register_user, authenticate_user, generate_token

# Initialize Flask app
app = Flask(__name__, static_folder='../frontend/build')
CORS(app)  # Enable CORS for all routes
bcrypt = Bcrypt(app)

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
BASE_URL = "https://api.fashn.ai/v1"
API_KEY = os.environ.get('FASHN_AI_API_KEY', '')  # Get API key from environment variable
MAX_POLLING_TIME = 120  # Maximum polling time in seconds
POLLING_INTERVAL = 2  # Time between status checks in seconds

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-for-development-only')

# Create uploads directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Check database connection on startup
with app.app_context():
    test_connection()

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Authentication Routes
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    
    # Validate input
    if not data or not data.get('email') or not data.get('password') or not data.get('name'):
        return jsonify({'error': 'Email, password, and name are required'}), 400
    
    # Register the user
    user_id, error = register_user(data['email'], data['password'], data['name'])
    
    if error:
        return jsonify({'error': error}), 400
    
    # Generate token
    token = generate_token(user_id)
    
    return jsonify({
        'message': 'User registered successfully',
        'token': token, 
        'user': {
            'id': user_id,
            'email': data['email'],
            'name': data['name']
        }
    }), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    
    # Validate input
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password are required'}), 400
    
    # Authenticate the user
    user, error = authenticate_user(data['email'], data['password'])
    
    if error:
        return jsonify({'error': error}), 401
    
    # Generate token
    token = generate_token(str(user['_id']))
    
    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': {
            'id': str(user['_id']),
            'email': user['email'],
            'name': user['name']
        }
    }), 200

@app.route('/api/user', methods=['GET'])
@token_required
def get_user(current_user):
    # Return the current user's information
    return jsonify({
        'id': str(current_user['_id']),
        'email': current_user['email'],
        'name': current_user['name']
    }), 200

# Virtual Try-On Route (protected)
@app.route('/api/try-on', methods=['POST'])
@token_required
def try_on(current_user):
    if 'model_image' not in request.files or 'garment_image' not in request.files:
        return jsonify({'error': 'Both model and garment images are required'}), 400
    
    model_image = request.files['model_image']
    garment_image = request.files['garment_image']
    
    # Validate files
    if model_image.filename == '' or garment_image.filename == '':
        return jsonify({'error': 'Both files must have a filename'}), 400
    
    if not allowed_file(model_image.filename) or not allowed_file(garment_image.filename):
        return jsonify({'error': 'Only image files (png, jpg, jpeg) are allowed'}), 400
    
    # Save files temporarily
    model_filename = secure_filename(model_image.filename)
    garment_filename = secure_filename(garment_image.filename)
    
    model_path = os.path.join(app.config['UPLOAD_FOLDER'], model_filename)
    garment_path = os.path.join(app.config['UPLOAD_FOLDER'], garment_filename)
    
    model_image.save(model_path)
    garment_image.save(garment_path)
    
    # Convert images to base64 for API
    with open(model_path, "rb") as f:
        model_data = base64.b64encode(f.read()).decode('utf-8')
    
    with open(garment_path, "rb") as f:
        garment_data = base64.b64encode(f.read()).decode('utf-8')
    
    # Clean up temporary files after reading them
    os.remove(model_path)
    os.remove(garment_path)
    
    # Step 1: Submit the prediction request
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        # Start the prediction
        run_response = requests.post(
            f"{BASE_URL}/run",
            headers=headers,
            json={
                "model_image": f"data:image/jpeg;base64,{model_data}",
                "garment_image": f"data:image/jpeg;base64,{garment_data}",
                "category": "auto",
            },
            timeout=30  # 30 seconds timeout for initial request
        )
        
        if run_response.status_code != 200:
            return jsonify({
                'error': f'API request failed with status code {run_response.status_code}',
                'details': run_response.text
            }), 500
        
        # Get the prediction ID
        run_data = run_response.json()
        prediction_id = run_data.get("id")
        
        if not prediction_id:
            return jsonify({'error': 'Failed to get prediction ID from API response'}), 500
        
        # Step 2: Poll for status until complete (or timeout)
        start_time = time.time()
        while (time.time() - start_time) < MAX_POLLING_TIME:
            status_response = requests.get(
                f"{BASE_URL}/status/{prediction_id}", 
                headers=headers,
                timeout=10
            )
            
            if status_response.status_code != 200:
                return jsonify({
                    'error': f'Status check failed with status code {status_response.status_code}',
                    'details': status_response.text
                }), 500
            
            status_data = status_response.json()
            status = status_data.get("status")
            
            if status == "completed":
                # Success! Add to user's history
                result_image = status_data.get("output")
                
                # Create history record
                history_record = {
                    'user_id': str(current_user['_id']),
                    'result_image': result_image,
                    'prediction_id': prediction_id,
                    'created_at': time.time()
                }
                
                # Save to database
                try_on_history.insert_one(history_record)
                
                # Return the output data to the frontend
                return jsonify({
                    'status': 'success',
                    'result_image': result_image,
                    'prediction_id': prediction_id
                })
            
            elif status in ["starting", "in_queue", "processing"]:
                # Still processing, wait and try again
                time.sleep(POLLING_INTERVAL)
                continue
            
            else:
                # Failed or unknown status
                error_message = status_data.get("error", "Unknown error occurred")
                return jsonify({
                    'error': f'Prediction failed with status: {status}',
                    'details': error_message
                }), 500
        
        # If we get here, we've timed out
        return jsonify({
            'error': f'Prediction timed out after {MAX_POLLING_TIME} seconds',
            'prediction_id': prediction_id
        }), 504
        
    except Exception as e:
        return jsonify({'error': f'API request failed: {str(e)}'}), 500

# History endpoint
@app.route('/api/history', methods=['GET'])
@token_required
def get_history(current_user):
    # Get user's try-on history
    history = list(try_on_history.find({'user_id': str(current_user['_id'])}).sort('created_at', -1))
    
    # Format for JSON response
    formatted_history = []
    for item in history:
        formatted_history.append({
            'id': str(item['_id']),
            'result_image': item['result_image'],
            'prediction_id': item['prediction_id'],
            'created_at': item['created_at']
        })
    
    return jsonify(formatted_history), 200

# Serve React frontend in production
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)