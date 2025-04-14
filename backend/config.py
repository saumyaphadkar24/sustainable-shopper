import os
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

# Configuration settings
class Config:
    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-key-for-development-only')
    DEBUG = os.environ.get('FLASK_DEBUG', 'True') == 'True'
    
    # File upload settings
    UPLOAD_FOLDER = 'uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max upload size
    
    # API settings
    FASHN_AI_API_URL = "https://api.fashn.ai/v1/run"
    FASHN_AI_API_KEY = os.environ.get('FASHN_AI_API_KEY', '')
    
    # CORS settings
    CORS_ORIGINS = ['http://localhost:3000', 'https://sustainableshopper.com']
