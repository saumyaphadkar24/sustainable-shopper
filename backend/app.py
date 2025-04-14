import os
import time
import requests
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import base64

# Initialize Flask app
app = Flask(__name__, static_folder='../frontend/build')
CORS(app)  # Enable CORS for all routes

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
BASE_URL = "https://api.fashn.ai/v1"
API_KEY = os.environ.get('FASHN_AI_API_KEY', '')  # Get API key from environment variable
MAX_POLLING_TIME = 120  # Maximum polling time in seconds
POLLING_INTERVAL = 2  # Time between status checks in seconds

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size

# Create uploads directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/try-on', methods=['POST'])
def try_on():
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
                # Success! Return the output data to the frontend
                return jsonify({
                    'status': 'success',
                    'result_image': status_data.get("output"),
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