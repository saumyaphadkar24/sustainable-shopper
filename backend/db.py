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
user_photos = db.user_photos
wardrobe_items = db.wardrobe_items

# Clothing categories and tags
CLOTHING_CATEGORIES = {
    "Tops": ["T-shirt", "Shirt / Blouse", "Sweater", "Hoodie / Sweatshirt", "Tank top"],
    "Bottoms": ["Jeans", "Trousers / Pants", "Shorts", "Skirt"],
    "Dresses & Jumpsuits": ["Dress", "Jumpsuit / Romper"],
    "Outerwear": ["Jacket", "Coat", "Blazer / Suit jacket", "Cardigan"],
    "Footwear": ["Sneakers", "Boots", "Sandals", "Formal shoes"],
    "Accessories": ["Bag", "Hat / Cap", "Scarf", "Belt", "Sunglasses", "Jewelry"],
    "Special/Other": ["Swimwear", "Activewear / Sportswear", "Sleepwear / Loungewear", "Formalwear / Occasionwear", "Other"]
}

# Category colors for UI
CATEGORY_COLORS = {
    "Tops": "#4CAF50",        # Green
    "Bottoms": "#2196F3",     # Blue
    "Dresses & Jumpsuits": "#9C27B0", # Purple
    "Outerwear": "#FF9800",   # Orange
    "Footwear": "#795548",    # Brown
    "Accessories": "#E91E63", # Pink
    "Special/Other": "#607D8B" # Blue-gray
}

# Get all available tags
def get_all_tags():
    tags = []
    for category, category_tags in CLOTHING_CATEGORIES.items():
        for tag in category_tags:
            tags.append({"category": category, "tag": tag, "color": CATEGORY_COLORS[category]})
    return tags

# Get category for a tag
def get_category_for_tag(tag):
    for category, tags in CLOTHING_CATEGORIES.items():
        if tag in tags:
            return category
    return None

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