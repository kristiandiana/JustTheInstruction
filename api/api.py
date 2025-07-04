from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
from openai import OpenAI
import os

# ------------------------
# Config
# ------------------------
from google.cloud import secretmanager

def get_openai_api_key():
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/justtheinstructions-462120/secrets/openai_api_key/versions/latest"
    response = client.access_secret_version(request={"name": name})
    return response.payload.data.decode("UTF-8")


app = Flask(__name__)
CORS(app)  # 🔒 Replace after testing
client = OpenAI(api_key=get_openai_api_key())
# In-memory usage tracker: { userId: { 'date': 'YYYY-MM-DD', 'count': int } }
usage_tracker = {}

# ------------------------
# Routes
# ------------------------
@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json()
    user_id = data.get("userId")
    raw_html_or_text = data.get("prompt", "")  # you're sending the whole page here

    if not user_id or not raw_html_or_text:
        return jsonify({ "error": "Missing userId or prompt" }), 400

    today = datetime.utcnow().date().isoformat()
    record = usage_tracker.get(user_id)

    # Enforce daily limit
    if record:
        if record['date'] == today:
            if record['count'] >= 100:
                return jsonify({ "error": "Daily GPT limit reached (3/day)" }), 429
            record['count'] += 1
        else:
            usage_tracker[user_id] = { 'date': today, 'count': 1 }
    else:
        usage_tracker[user_id] = { 'date': today, 'count': 1 }

    # GPT prompt instructions
    system_prompt = (
        "You are an instruction extraction engine. "
        "Given a webpage or article, return ONLY the core step-by-step instructions "
        "in plain, clear language. Do NOT include intros, background, commentary, or fluff. "
        "Include all details needed to replicate the task exactly, even if they appear deep in the text. "
        "Number each step clearly if applicable. Keep formatting clean."
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4o",  # or gpt-4-turbo / gpt-3.5-turbo
            messages=[
                { "role": "system", "content": system_prompt },
                { "role": "user", "content": raw_html_or_text }
            ],
        )
        return jsonify({ "response": response.choices[0].message.content.strip() })
    except Exception as e:
        return jsonify({ "error": str(e) }), 500


# ------------------------
# Entrypoint
# ------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
