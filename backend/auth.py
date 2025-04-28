import jwt
import datetime
from functools import wraps
from flask import request, jsonify, current_app
from flask_bcrypt import Bcrypt
from db import users
from bson.objectid import ObjectId

bcrypt = Bcrypt()

def generate_token(user_id):
    """Generate a JWT token for a user"""
    try:
        # Token payload
        payload = {
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7),  # Extended token validity
            'iat': datetime.datetime.utcnow(),
            'sub': str(user_id)
        }
        
        # Create token
        token = jwt.encode(
            payload,
            current_app.config.get('SECRET_KEY'),
            algorithm='HS256'
        )
        
        return token
    except Exception as e:
        print(f"Error generating token: {str(e)}")
        return str(e)

def token_required(f):
    """Decorator for endpoints that require authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check if token is in headers
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'error': 'Token is missing or invalid'}), 401
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            # Decode the token
            data = jwt.decode(
                token,
                current_app.config.get('SECRET_KEY'),
                algorithms=['HS256']
            )
            
            # Get current user from token data
            current_user = users.find_one({'_id': ObjectId(data['sub'])})
            
            if not current_user:
                return jsonify({'error': 'User not found'}), 401
                
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError as e:
            print(f"Invalid token error: {str(e)}")
            return jsonify({'error': 'Token is invalid'}), 401
        except Exception as e:
            print(f"Token validation error: {str(e)}")
            return jsonify({'error': 'Token validation failed'}), 401
        
        # Pass the current user to the route
        return f(current_user, *args, **kwargs)
    
    return decorated

def register_user(email, password, name):
    """Register a new user"""
    # Check if user already exists
    if users.find_one({'email': email}):
        return None, "Email already registered"
    
    # Hash the password
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    
    # Create user object
    new_user = {
        'email': email,
        'password': hashed_password,
        'name': name,
        'created_at': datetime.datetime.utcnow(),
        'try_on_history': []
    }
    
    # Insert into database
    result = users.insert_one(new_user)
    
    # Return the user ID
    return str(result.inserted_id), None

def authenticate_user(email, password):
    """Authenticate a user by email and password"""
    # Find the user
    user = users.find_one({'email': email})
    
    if not user:
        return None, "Email not found"
    
    # Check password
    if bcrypt.check_password_hash(user['password'], password):
        return user, None
    
    return None, "Invalid password"