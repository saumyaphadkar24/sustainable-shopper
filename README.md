# 🛍️ SustainableShopper

SustainableShopper is a Flask-based web application that empowers users to manage a digital wardrobe, try on clothes virtually, and receive AI-generated outfit suggestions based on weather and occasion. The app promotes sustainable fashion by helping users make smarter clothing choices.

---

## 🚀 Features

- 🔐 **User Authentication**
  - Register, login, and JWT-secured endpoints

- 👗 **Virtual Try-On**
  - Upload a photo and garment image
  - Integrates with Fashn.ai API to generate try-on visuals
  - Save and reuse model photos

- 👚 **Wardrobe Manager**
  - Add, update, delete wardrobe items with images
  - Classify with tags, color, and fit description
  - Generate AI-powered garment descriptions

- 💡 **Outfit Recommendations**
  - AI-generated outfit suggestions based on:
    - Occasion (e.g. formal, casual, gym)
    - Weather (temperature + condition)
  - Uses only items available in your wardrobe

- 🔍 **Sustainable Alternatives**
  - Upload a garment image to find visually similar alternatives via CLIP model

- ☁️ **Weather Integration**
  - Fetch real-time weather using OpenWeatherMap API

---

## 🧱 Tech Stack

| Layer       | Tech                  |
|-------------|-----------------------|
| Backend     | Python, Flask         |
| Auth        | JWT, Flask-Bcrypt     |
| Database    | MongoDB               |
| AI Services | OpenAI GPT-4, CLIP    |
| APIs        | Fashn.ai, OpenWeather |
| Frontend    | React (served via Flask) |

---

## 🔧 Project Layout

This project follows a two-part structure:
- `backend/`: Flask app with APIs, authentication, try-on logic, and MongoDB integration.
- `frontend/`: React app served by Flask, built using standard Create React App structure.

Additional components:
- `clip_index/`: CLIP-based visual search
- `suggest_outfit.py`: Weather + occasion-based outfit generator


---

## 🛠️ Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/sustainableshopper.git
cd sustainableshopper

### 2. Install Dependencies

```bash
pip install -r requirements.txt

### 3. Set Environment Variables
Create a .env file in the backend/ directory or export the variables manually:

FASHN_AI_API_KEY=your_fashn_api_key
WEATHER_API_KEY=your_openweathermap_api_key
OPENAI_API_KEY=your_openai_api_key
SECRET_KEY=your_flask_secret

### 4. Start MongoDB

Ensure MongoDB is running locally or configure a cloud MongoDB URI in db.py.

### 5. Run the Application
python backend/app.py

Visit the app at: http://localhost:5001

---

## 🧪 API Endpoints

| Endpoint                  | Method           | Description                                |
|---------------------------|------------------|--------------------------------------------|
| `/api/register`           | POST             | Register a new user                        |
| `/api/login`              | POST             | Login and receive a JWT                    |
| `/api/user`               | GET              | Get current user info (auth required)      |
| `/api/try-on`             | POST             | Try on a garment using uploaded photo      |
| `/api/photos`             | GET / POST / DELETE | Manage model photos                    |
| `/api/wardrobe`           | GET / POST       | Manage wardrobe items                      |
| `/api/outfit-suggestions` | POST             | Get outfit ideas from wardrobe             |
| `/api/weather`            | GET              | Get weather data for a location            |
| `/api/alternatives`       | POST             | Search for similar clothing items          |

## 🤖 AI Features

Garment Descriptions: Generated using OpenAI GPT-4.1 mini
Outfit Suggestions: Tailored recommendations based on weather and occasion
Image Alternatives: CLIP-based visual similarity search to promote sustainability

## 🧑‍💻 Contributing

We welcome PRs and issue reports. Please fork the repository and open a pull request with a clear description of your changes.

## 📜 License
MIT License. See the LICENSE file for details.

## 🙌 Acknowledgements
OpenAI
Fashn.ai
OpenWeatherMap