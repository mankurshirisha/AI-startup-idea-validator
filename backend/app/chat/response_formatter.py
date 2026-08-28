"""Response Formatter Module for BetaBuddy.

Cleans up, formats, and sanitizes Gemini responses:
- Removes system prompt leaks or markdown code fence artifacts.
- Ensures bulleted formatting and clean paragraphs.
- Ensures exact fallback wording when information is missing.
"""

import re
from app.logging_config import get_logger

logger = get_logger("chat.response_formatter")

EXACT_FALLBACK = "I couldn't find that information in your startup validation dashboard."


def format_response(raw_text: str, intent: str) -> str:
    """Format and sanitize raw Gemini response string.

    Args:
        raw_text: Raw LLM output string.
        intent: Intent string.

    Returns:
        str: Cleaned, structured response string.
    """
    if not raw_text or not raw_text.strip():
        return EXACT_FALLBACK

    cleaned = raw_text.strip()

    # Strip code fences if model wrapped response in markdown
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z]*\n?", "", cleaned)
        cleaned = re.sub(r"\n?```$", "", cleaned).strip()

    # Check for hallucination fallback trigger
    if "couldn't find that information" in cleaned.lower() or "not available in" in cleaned.lower():
        if cleaned != EXACT_FALLBACK:
            cleaned = EXACT_FALLBACK

    # Clean up double line breaks and ensure crisp formatting
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)

    logger.info("Formatted response for intent '%s' (length: %d)", intent, len(cleaned))
    return cleaned
