import os
import base64
from openai import OpenAI
from flask import Flask, request, jsonify
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@app.route('/api/suggest-outfit', methods=['POST'])
def suggest_outfit():
    data = request.json
    weather = data.get("weather")
    wardrobe = data.get("wardrobe")
    image_base64 = data.get("image_base64")  # optional

    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": f"""Based on the weather trends {weather} today, suggest elements for the outfit in terms of type, material, and layering. 
Here is the database of clothes available: {wardrobe}. Suggest a few prospective items from this set along with general advice."""
                }
            ]
        }
    ]

    if image_base64:
        messages[0]["content"].append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/jpeg;base64,{image_base64}",
                "detail": "high"
            }
        })

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        max_tokens=300
    )

    return jsonify({"recommendation": response.choices[0].message.content})
