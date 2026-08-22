import os

from dotenv import load_dotenv

from app.logging_config import configure_logging

load_dotenv()
configure_logging()

# ==============================
# API Keys
# ==============================

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# ==============================
# Gemini Model
# ==============================

GEMINI_MODEL = "gemini-3-flash-preview"

GEMINI_MODEL_FALLBACKS = [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
]

# ==============================
# Validation
# ==============================

if not TAVILY_API_KEY:
    raise ValueError("TAVILY_API_KEY is missing in .env file.")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY is missing in .env file.")
