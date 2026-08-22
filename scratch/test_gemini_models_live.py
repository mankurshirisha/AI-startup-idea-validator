import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=15000))

models_to_test = [
    "gemini-3-flash-preview",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
]

print("=== TESTING LIVE GEMINI MODELS FOR CHATBOT ===")
for model in models_to_test:
    try:
        print(f"\nTesting model: {model}...")
        res = client.models.generate_content(
            model=model,
            contents="Say 'OK: Model working' and nothing else."
        )
        print(f"[SUCCESS] {model} -> {res.text.strip()}")
    except Exception as e:
        err_str = str(e)
        status = getattr(e, "code", getattr(e, "status_code", "N/A"))
        print(f"[FAILED] {model} -> Status: {status} | Exception: {type(e).__name__} | Msg: {err_str[:150]}")
