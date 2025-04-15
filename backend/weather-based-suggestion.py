import requests
import os
from datetime import datetime
from PIL import Image

# Optional: image classification can go here later

from dotenv import load_dotenv
load_dotenv()

# Step 1: Get location (via IP)
def get_location():
    ip_info = requests.get("http://ip-api.com/json/").json()
    return ip_info['city'], ip_info['lat'], ip_info['lon']

def get_weather(lat, lon):
    api_key = os.environ.get("OPENWEATHER_API_KEY", "")
    url = f"http://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric"
    response = requests.get(url).json()

    if response.get("cod") != 200:
        print("❌ Weather API Error:", response.get("message"))
        return None

    return {
        "temp": response['main']['temp'],
        "weather": response['weather'][0]['main'],
        "humidity": response['main']['humidity'],
        "wind_speed": response['wind']['speed']
    }
# Step 3: Suggestion logic
def make_suggestion(weather_data, clothing_type="tshirt"):
    temp = weather_data["temp"]
    condition = weather_data["weather"]
    humidity = weather_data["humidity"]
    wind = weather_data["wind_speed"]

    suggestions = []

    if temp < 10:
        suggestions.append("Too cold! Add thermal layers or a winter jacket.")
    elif temp < 20:
        suggestions.append("Slightly chilly — layer with a hoodie or jacket.")
    else:
        suggestions.append("Temperature is comfortable for casual wear.")

    if "rain" in condition.lower():
        suggestions.append("Carry an umbrella or wear waterproof clothing.")
    elif "clear" in condition.lower() and temp > 22:
        suggestions.append("Sunny day — consider wearing sunglasses or a cap.")

    if humidity > 70:
        suggestions.append("High humidity — go for breathable fabrics like cotton or linen.")
    if wind > 10:
        suggestions.append("Windy conditions — wear something wind-resistant.")

    return " ".join(suggestions)


if __name__ == "__main__":
    city, lat, lon = get_location()
    weather_data = get_weather(lat, lon)
    if weather_data:
        print(f"📍 {city} | 🌡️ {weather_data['temp']}°C | 🌤️ {weather_data['weather']} | 💧 {weather_data['humidity']}% | 💨 {weather_data['wind_speed']} m/s")

        clothing_type = "tshirt"  # to be detected later
        suggestion = make_suggestion(weather_data, clothing_type)
        print("👕 Suggestion:", suggestion)

