import requests
import os
import base64
from dotenv import load_dotenv
from PIL import Image
import pillow_heif
from openai import OpenAI

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)

def get_location():
    ip_info = requests.get("http://ip-api.com/json/").json()
    return ip_info['city'], ip_info['lat'], ip_info['lon']

def get_weather(lat, lon):
    api_key = os.environ.get("OPENWEATHER_API_KEY", "")
    url = f"http://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric"
    response = requests.get(url).json()

    if response.get("cod") != 200:
        print("Weather API Error:", response.get("message"))
        return None

    return {
        "temp": response['main']['temp'],
        "weather": response['weather'][0]['main'],
        "humidity": response['main']['humidity'],
        "wind_speed": response['wind']['speed']
    }

pillow_heif.register_heif_opener()

def convert_to_jpg(img_path):
    ext = os.path.splitext(img_path)[1].lower()
    if ext in [".jpg", ".jpeg"]:
        return img_path
    jpg_path = os.path.splitext(img_path)[0] + ".jpg"
    try:
        with Image.open(img_path) as img:
            img.convert("RGB").save(jpg_path, "JPEG")
        print(f"Converted: {img_path} → {jpg_path}")
        return jpg_path
    except Exception as e:
        print(f"Conversion failed: {e}")
        return None

def classify_with_gpt_vision(img_path):
    img_path = convert_to_jpg(img_path)
    if not img_path:
        return "error"

    with open(img_path, "rb") as f:
        b64_img = base64.b64encode(f.read()).decode("utf-8")
        
    city, lat, lon = get_location()
    weather_data = get_weather(lat, lon)

    response = client.chat.completions.create(
        model="gpt-4o",
        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"""Understand the clothing (type, material, and layering) in this image.
        Now based on this and the weather trends in {city} today, suggest tweaks to the outfit such as adding a jacket or thermal.
        Current weather is as follows: Temperature: {weather_data['temp']}°C, Weather Data: {weather_data['weather']}, Humidity: {weather_data['humidity']}%, Wind Speed: {weather_data['wind_speed']}
        Only return the suggestions for the outfit"""
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{b64_img}",
                            "detail": "high"
                        }
                    }
                ]
            }
        ],
        max_tokens=300
    )

    return response.choices[0].message.content

if __name__ == "__main__":
    result = classify_with_gpt_vision("backend/assets/Test_Outfit_Images/test-1.jpg")
    print("Suggestion:", result)
