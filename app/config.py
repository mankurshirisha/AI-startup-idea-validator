import os
from dotenv import load_dotenv

load_dotenv()

# ==============================
# API Keys
# ==============================

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# ==============================
# OpenRouter Model
# ==============================

OPENROUTER_MODEL = "openrouter/google/gemini-2.5-flash"

# ==============================
# Validation
# ==============================

if not TAVILY_API_KEY:
    raise ValueError("TAVILY_API_KEY is missing in .env file.")

if not OPENROUTER_API_KEY:
    raise ValueError("OPENROUTER_API_KEY is missing in .env file.")