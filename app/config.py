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

GEMINI_MODEL = "gemini-2.5-flash"

GEMINI_MODEL_FALLBACKS = [
    "gemini-2.5-flash-preview-05-20",
]

# ==============================
# Validation
# ==============================

if not TAVILY_API_KEY:
    raise ValueError("TAVILY_API_KEY is missing in .env file.")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY is missing in .env file.")
