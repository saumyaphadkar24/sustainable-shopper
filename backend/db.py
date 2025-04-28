import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB connection details
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
DB_NAME = os.getenv('MONGO_DB_NAME', 'sustainable_shopper')

# Create MongoDB client
client = MongoClient(MONGO_URI)
db = client[DB_NAME]

# Collections
users = db.users
try_on_history = db.try_on_history

# Test connection
def test_connection():
    try:
        # The ismaster command is cheap and does not require auth
        client.admin.command('ismaster')
        print("MongoDB connection successful")
        return True
    except Exception as e:
        print(f"MongoDB connection failed: {e}")
        return False