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
import datetime
import tempfile
import openai

# Import database and authentication modules
from db import test_connection, users, try_on_history, user_photos, wardrobe_items, get_all_tags, get_category_for_tag
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
WEATHER_API_KEY = os.environ.get('WEATHER_API_KEY', '')  # API key for weather service
openai.api_key = os.environ.get('OPENAI_API_KEY', '')
print(f'Weather api key loaded correctly: {WEATHER_API_KEY}')
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
    
    # Save model and garment data to variables before removing files
    model_image_base64 = f"data:image/jpeg;base64,{model_data}"
    garment_image_base64 = f"data:image/jpeg;base64,{garment_data}"
    
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
                "model_image": model_image_base64,
                "garment_image": garment_image_base64,
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
                    'model_image': model_image_base64,
                    'garment_image': garment_image_base64,
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
                    'garment_image': garment_image_base64,
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

# User Photos endpoints
@app.route('/api/photos', methods=['GET'])
@token_required
def get_user_photos(current_user):
    # Get all photos for the current user
    photos = list(user_photos.find({'user_id': str(current_user['_id'])}).sort('created_at', -1))
    
    # Format for JSON response
    formatted_photos = []
    for photo in photos:
        formatted_photos.append({
            'id': str(photo['_id']),
            'name': photo.get('name', 'Photo'),
            'image': photo['image'],
            'created_at': photo['created_at']
        })
    
    return jsonify(formatted_photos), 200

@app.route('/api/photos', methods=['POST'])
@token_required
def upload_user_photo(current_user):
    if 'photo' not in request.files:
        return jsonify({'error': 'Photo is required'}), 400
    
    photo = request.files['photo']
    name = request.form.get('name', 'My Photo')
    
    # Validate file
    if photo.filename == '':
        return jsonify({'error': 'File must have a filename'}), 400
    
    if not allowed_file(photo.filename):
        return jsonify({'error': 'Only image files (png, jpg, jpeg) are allowed'}), 400
    
    # Save file temporarily
    filename = secure_filename(photo.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    photo.save(filepath)
    
    # Convert to base64
    with open(filepath, "rb") as f:
        photo_data = base64.b64encode(f.read()).decode('utf-8')
    
    # Clean up temporary file
    os.remove(filepath)
    
    # Save to database
    photo_record = {
        'user_id': str(current_user['_id']),
        'name': name,
        'image': f"data:image/jpeg;base64,{photo_data}",
        'created_at': time.time()
    }
    
    result = user_photos.insert_one(photo_record)
    
    return jsonify({
        'id': str(result.inserted_id),
        'name': name,
        'image': photo_record['image'],
        'created_at': photo_record['created_at']
    }), 201

@app.route('/api/photos/<photo_id>', methods=['DELETE'])
@token_required
def delete_user_photo(current_user, photo_id):
    # Find the photo
    photo = user_photos.find_one({
        '_id': ObjectId(photo_id), 
        'user_id': str(current_user['_id'])
    })
    
    if not photo:
        return jsonify({'error': 'Photo not found'}), 404
    
    # Delete the photo
    user_photos.delete_one({'_id': ObjectId(photo_id)})
    
    return jsonify({'message': 'Photo deleted successfully'}), 200

# Try-on with saved photo
@app.route('/api/try-on-with-saved', methods=['POST'])
@token_required
def try_on_with_saved(current_user):
    data = request.get_json()
    
    if not data or not data.get('photo_id') or 'garment_image' not in request.files:
        return jsonify({'error': 'Both photo ID and garment image are required'}), 400
    
    # Find the user's photo
    photo = user_photos.find_one({
        '_id': ObjectId(data['photo_id']), 
        'user_id': str(current_user['_id'])
    })
    
    if not photo:
        return jsonify({'error': 'Photo not found'}), 404
    
    garment_image = request.files['garment_image']
    
    # Validate garment file
    if garment_image.filename == '':
        return jsonify({'error': 'Garment file must have a filename'}), 400
    
    if not allowed_file(garment_image.filename):
        return jsonify({'error': 'Only image files (png, jpg, jpeg) are allowed'}), 400
    
    # Save garment file temporarily
    garment_filename = secure_filename(garment_image.filename)
    garment_path = os.path.join(app.config['UPLOAD_FOLDER'], garment_filename)
    garment_image.save(garment_path)
    
    # Convert to base64
    with open(garment_path, "rb") as f:
        garment_data = base64.b64encode(f.read()).decode('utf-8')
    
    # Clean up temporary file
    os.remove(garment_path)
    
    # Get the model image from the saved photo
    model_image_base64 = photo['image']
    garment_image_base64 = f"data:image/jpeg;base64,{garment_data}"
    
    # Make the API request (similar to regular try-on)
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
                "model_image": model_image_base64,
                "garment_image": garment_image_base64,
                "category": "auto",
            },
            timeout=30
        )
        
        # Continue with polling and result handling (same as regular try-on)
        # ... [Rest of the code is similar to the try_on function]
        
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
                    'model_image': model_image_base64,
                    'garment_image': garment_image_base64,
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
                    'garment_image': garment_image_base64,
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

# History endpoint with enhanced data
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
            'garment_image': item.get('garment_image', ''), 
            'prediction_id': item['prediction_id'],
            'created_at': item['created_at']
        })
    
    return jsonify(formatted_history), 200

# Wardrobe endpoints

def describe_garment(image_data_list):
    """
    Given a list of image data strings (base64), sends them to the OpenAI API
    and returns a textual description of the garment/clothing item.
    """
    if not (1 <= len(image_data_list) <= 5):
        raise ValueError("You must provide between 1 and 5 images.")
    
    # Create temporary files for the images
    temp_image_paths = []
    try:
        for img_data in image_data_list:
            # Remove the data URI prefix if present
            if ',' in img_data:
                img_data = img_data.split(',', 1)[1]
            
            # Create a temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
                temp_file.write(base64.b64decode(img_data))
                temp_image_paths.append(temp_file.name)
        
        # Prepare the multimodal content payload
        content = []
        for img_path in temp_image_paths:
            with open(img_path, "rb") as f:
                img_bytes = f.read()
            img_b64 = base64.b64encode(img_bytes).decode("utf-8")
            content.append(
                {"type": "input_image", 
                "image_url": f"data:image/png;base64,{img_b64}"}
            )
        
        # Append the user instruction
        content.append({
            "type": "input_text",
            "text": "Please provide a detailed textual description of the garment or clothing item shown in these images."
        })
        
        # Call the ChatGPT API with GPT-4.1 Mini
        response = openai.responses.create(
            model="gpt-4.1-mini",
            input=[{"role": "user", "content": content}]
        )
        return response.output_text
    
    finally:
        # Clean up temporary files
        for path in temp_image_paths:
            try:
                os.unlink(path)
            except Exception as e:
                print(f"Error removing temporary file: {e}")


@app.route('/api/wardrobe', methods=['GET'])
@token_required
def get_wardrobe(current_user):
    # Get all wardrobe items for the current user
    items = list(wardrobe_items.find({'user_id': str(current_user['_id'])}).sort('created_at', -1))
    
    # Format for JSON response
    formatted_items = []
    for item in items:
        formatted_item = {
            'id': str(item['_id']),
            'name': item.get('name', ''),
            'fit_description': item.get('fit_description', ''),
            'category': item['category'],
            'tag': item['tag'],
            'color': item.get('color', ''),
            'in_laundry': item.get('in_laundry', False),
            'unavailable': item.get('unavailable', False),
            'created_at': item['created_at']
        }
        
        # Ensure images are properly included
        if 'images' in item and isinstance(item['images'], list):
            formatted_item['images'] = item['images']
        else:
            formatted_item['images'] = []
        
        formatted_items.append(formatted_item)
    
    return jsonify(formatted_items), 200

@app.route('/api/wardrobe/tags', methods=['GET'])
def get_wardrobe_tags():
    # Return all clothing tags with their categories and colors
    return jsonify(get_all_tags()), 200

@app.route('/api/wardrobe', methods=['POST'])
@token_required
def add_wardrobe_item(current_user):
    data = {}
    image_data_list = []
    
    # Check if this is a multipart form or JSON
    if request.content_type and 'multipart/form-data' in request.content_type:
        # Handle multipart form data (with files)
        data = {
            'name': request.form.get('name', ''),
            'fit_description': request.form.get('fit_description', ''),
            'tag': request.form.get('tag', ''),
            'in_laundry': request.form.get('in_laundry', 'false').lower() == 'true',
            'unavailable': request.form.get('unavailable', 'false').lower() == 'true',
        }
        
        # Handle multiple image files
        if 'images[]' in request.files:
            image_files = request.files.getlist('images[]')
            for image_file in image_files:
                if image_file.filename != '':
                    if allowed_file(image_file.filename):
                        # Save file temporarily
                        filename = secure_filename(image_file.filename)
                        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                        image_file.save(filepath)
                        
                        # Convert to base64
                        with open(filepath, "rb") as f:
                            img_data = base64.b64encode(f.read()).decode('utf-8')
                        
                        # Add to image data list
                        image_data_list.append(f"data:image/jpeg;base64,{img_data}")
                        
                        # Clean up temporary file
                        os.remove(filepath)
                    else:
                        return jsonify({'error': 'Only image files (png, jpg, jpeg) are allowed'}), 400
    else:
        # Handle JSON data
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # If there's base64 image data in the JSON
        if 'images' in data and isinstance(data['images'], list):
            image_data_list = data['images']
    
    # Validate required fields
    if not data.get('tag'):
        return jsonify({'error': 'Clothing tag is required'}), 400
    
    if not image_data_list:
        return jsonify({'error': 'At least one image is required'}), 400
    
    if len(image_data_list) > 5:
        return jsonify({'error': 'Maximum 5 images allowed'}), 400
    
    # Get category based on tag
    category = get_category_for_tag(data['tag'])
    if not category:
        return jsonify({'error': 'Invalid clothing tag'}), 400
    
    # Generate AI description of the garment
    try:
        ai_description = describe_garment([img.split(',')[1] if ',' in img else img for img in image_data_list])
    except Exception as e:
        print(f"Error generating AI description: {e}")
        ai_description = "Description could not be generated."
    
    # Create wardrobe item
    item = {
        'user_id': str(current_user['_id']),
        'name': data.get('name', ''),
        'fit_description': data.get('fit_description', ''),
        'images': image_data_list,
        'ai_description': ai_description,
        'category': category,
        'tag': data['tag'],
        'color': data.get('color', ''),
        'in_laundry': data.get('in_laundry', False),
        'unavailable': data.get('unavailable', False),
        'created_at': time.time()
    }
    
    # Save to database
    result = wardrobe_items.insert_one(item)
    
    return jsonify({
        'id': str(result.inserted_id),
        'name': item['name'],
        'fit_description': item['fit_description'],
        'images': item['images'],
        'category': item['category'],
        'tag': item['tag'],
        'color': item['color'],
        'in_laundry': item['in_laundry'],
        'unavailable': item['unavailable'],
        'created_at': item['created_at']
    }), 201

@app.route('/api/wardrobe/<item_id>', methods=['PUT'])
@token_required
def update_wardrobe_item(current_user, item_id):
    # Find the item
    item = wardrobe_items.find_one({
        '_id': ObjectId(item_id), 
        'user_id': str(current_user['_id'])
    })
    
    if not item:
        return jsonify({'error': 'Item not found'}), 404
    
    data = {}
    image_data_list = []
    
    # Check if this is a multipart form or JSON
    if request.content_type and 'multipart/form-data' in request.content_type:
        # Handle multipart form data (with file)
        data = {
            'name': request.form.get('name', item.get('name', '')),
            'fit_description': request.form.get('fit_description', item.get('fit_description', '')),
            'tag': request.form.get('tag', item['tag']),
            'in_laundry': request.form.get('in_laundry', str(item.get('in_laundry', False))).lower() == 'true',
            'unavailable': request.form.get('unavailable', str(item.get('unavailable', False))).lower() == 'true',
        }
        
        # Handle multiple image files
        if 'images[]' in request.files:
            image_files = request.files.getlist('images[]')
            for image_file in image_files:
                if image_file.filename != '':
                    if allowed_file(image_file.filename):
                        # Save file temporarily
                        filename = secure_filename(image_file.filename)
                        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                        image_file.save(filepath)
                        
                        # Convert to base64
                        with open(filepath, "rb") as f:
                            img_data = base64.b64encode(f.read()).decode('utf-8')
                        
                        # Add to image data list
                        image_data_list.append(f"data:image/jpeg;base64,{img_data}")
                        
                        # Clean up temporary file
                        os.remove(filepath)
                    else:
                        return jsonify({'error': 'Only image files (png, jpg, jpeg) are allowed'}), 400
        
        # If no new images were uploaded, keep the existing ones
        if not image_data_list and 'images' in item:
            image_data_list = item['images']
    else:
        # Handle JSON data
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # If there's base64 image data in the JSON
        if 'images' in data and isinstance(data['images'], list):
            image_data_list = data['images']
        elif 'images' in item:
            image_data_list = item['images']
    
    # Validate required fields
    if not data.get('tag'):
        return jsonify({'error': 'Clothing tag is required'}), 400
    
    if not image_data_list:
        return jsonify({'error': 'At least one image is required'}), 400
    
    if len(image_data_list) > 5:
        return jsonify({'error': 'Maximum 5 images allowed'}), 400
    
    # Get category based on tag
    category = get_category_for_tag(data['tag'])
    if not category:
        return jsonify({'error': 'Invalid clothing tag'}), 400
    
    # Generate AI description of the garment if images have changed
    images_changed = ('images' not in item) or (set(image_data_list) != set(item['images']))
    
    ai_description = item.get('ai_description', '')
    if images_changed:
        try:
            ai_description = describe_garment([img.split(',')[1] if ',' in img else img for img in image_data_list])
        except Exception as e:
            print(f"Error generating AI description: {e}")
            if not ai_description:
                ai_description = "Description could not be generated."
    
    # Update the item
    update_data = {
        'name': data.get('name', item.get('name', '')),
        'fit_description': data.get('fit_description', item.get('fit_description', '')),
        'images': image_data_list,
        'ai_description': ai_description,
        'category': category,
        'tag': data['tag'],
        'color': data.get('color', item.get('color', '')),
        'in_laundry': data.get('in_laundry', item.get('in_laundry', False)),
        'unavailable': data.get('unavailable', item.get('unavailable', False)),
        'updated_at': time.time()
    }
    
    # Update in database
    wardrobe_items.update_one(
        {'_id': ObjectId(item_id)},
        {'$set': update_data}
    )
    
    # Get the updated item
    updated_item = wardrobe_items.find_one({'_id': ObjectId(item_id)})
    
    return jsonify({
        'id': str(updated_item['_id']),
        'name': updated_item.get('name', ''),
        'fit_description': updated_item.get('fit_description', ''),
        'images': updated_item.get('images', []),
        'category': updated_item['category'],
        'tag': updated_item['tag'],
        'color': updated_item.get('color', ''),
        'in_laundry': updated_item.get('in_laundry', False),
        'unavailable': updated_item.get('unavailable', False),
        'created_at': updated_item['created_at'],
        'updated_at': updated_item.get('updated_at', '')
    }), 200

@app.route('/api/wardrobe/<item_id>', methods=['DELETE'])
@token_required
def delete_wardrobe_item(current_user, item_id):
    # Find the item
    item = wardrobe_items.find_one({
        '_id': ObjectId(item_id), 
        'user_id': str(current_user['_id'])
    })
    
    if not item:
        return jsonify({'error': 'Item not found'}), 404
    
    # Delete the item
    wardrobe_items.delete_one({'_id': ObjectId(item_id)})
    
    return jsonify({'message': 'Item deleted successfully'}), 200

@app.route('/api/wardrobe/toggle/<item_id>', methods=['PATCH'])
@token_required
def toggle_wardrobe_item_status(current_user, item_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Find the item
    item = wardrobe_items.find_one({
        '_id': ObjectId(item_id), 
        'user_id': str(current_user['_id'])
    })
    
    if not item:
        return jsonify({'error': 'Item not found'}), 404
    
    # Update status fields
    update_data = {}
    
    if 'in_laundry' in data:
        update_data['in_laundry'] = bool(data['in_laundry'])
    
    if 'unavailable' in data:
        update_data['unavailable'] = bool(data['unavailable'])
    
    if not update_data:
        return jsonify({'error': 'No status fields provided to update'}), 400
    
    update_data['updated_at'] = time.time()
    
    # Update in database
    wardrobe_items.update_one(
        {'_id': ObjectId(item_id)},
        {'$set': update_data}
    )
    
    # Get the updated item
    updated_item = wardrobe_items.find_one({'_id': ObjectId(item_id)})
    
    return jsonify({
        'id': str(updated_item['_id']),
        'in_laundry': updated_item.get('in_laundry', False),
        'unavailable': updated_item.get('unavailable', False),
        'updated_at': updated_item.get('updated_at', '')
    }), 200

# Weather API
@app.route('/api/weather', methods=['GET'])
@token_required
def get_weather(current_user):
    # Get location from query parameters
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    
    if not lat or not lon:
        return jsonify({'error': 'Latitude and longitude are required'}), 400
    
    try:
        # Make API request to weather service (OpenWeatherMap in this example)
        response = requests.get(
            f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={WEATHER_API_KEY}&units=metric",
            timeout=10
        )
        print(response.status_code)
        if response.status_code != 200:
            return jsonify({
                'error': f'Weather API request failed with status code {response.status_code}',
                'details': response.text
            }), 500
        
        # Return the weather data
        return jsonify(response.json()), 200
        
    except Exception as e:
        return jsonify({'error': f'Weather API request failed: {str(e)}'}), 500

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