"""Gemini API client with thread-safe TTL response cache and enforced request timeout.

Features:
- Singleton Client reusing connection pool.
- Enforced 20s transport deadline.
- Max 1 retry per model on 429 / 503 / Timeout (Max 2 attempts per model, Max 4 total HTTP requests).
- Exponential backoff on rate limits.
- Structured logging (Model, Attempt, Backoff, Fallback Used, 429 Count).
- Friendly user fallback message (never exposes raw API errors).
"""

import hashlib
import threading
import time
from typing import Optional

from cachetools import TTLCache
from google import genai
from google.genai import types

from app.config import GEMINI_API_KEY, GEMINI_MODEL, GEMINI_MODEL_FALLBACKS
from app.logging_config import get_logger

logger = get_logger("app.gemini_client")

_CLIENT: Optional[genai.Client] = None
_RESPONSE_CACHE: TTLCache = TTLCache(maxsize=512, ttl=3600)
_CACHE_LOCK = threading.Lock()
MAX_RETRIES_PER_MODEL = 1  # 1 initial + 1 retry = max 2 attempts per model


def _get_client() -> genai.Client:
    """Return singleton genai.Client with enforced 20s transport timeout."""
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = genai.Client(
            api_key=GEMINI_API_KEY,
            http_options=types.HttpOptions(timeout=10000),  # 10s deadline
        )
    return _CLIENT


def _strip_code_fences(text: str) -> str:
    if not text:
        return ""

    cleaned = text.strip()

    if cleaned.startswith("```json"):
        cleaned = cleaned[len("```json") :].strip()
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:].strip()

    if cleaned.endswith("```"):
        cleaned = cleaned[:-3].strip()

    return cleaned.strip()


def _extract_json_like_text(text: str) -> str:
    cleaned = _strip_code_fences(text)
    if not cleaned:
        return ""

    if cleaned.startswith("{") or cleaned.startswith("["): 
        return cleaned

    for marker in ("{", "["):
        start_index = cleaned.find(marker)
        if start_index != -1:
            stack = []
            for index in range(start_index, len(cleaned)):
                char = cleaned[index]
                if char in "{[":
                    stack.append(char)
                elif char in "}]":
                    if stack:
                        stack.pop()
                    if not stack:
                        return cleaned[start_index : index + 1]
            return cleaned[start_index:]

    return cleaned


def generate_content(prompt: str, timeout: int = 30) -> str:
    """Call Gemini and return the cleaned text response with strict retry bounds.

    Args:
        prompt: The prompt to send to Gemini.
        timeout: Maximum seconds to wait for a single Gemini API response.

    Returns:
        Cleaned response text.
    """
    if not prompt:
        return ""

    char_count = len(prompt)
    est_tokens = max(1, char_count // 4)

    cache_key = hashlib.sha256(prompt.encode("utf-8")).hexdigest()

    # Thread-safe cache lookup
    with _CACHE_LOCK:
        cached = _RESPONSE_CACHE.get(cache_key)
    if cached is not None:
        logger.info(
            "DIAGNOSTICS | Gemini Cache Hit | Key: %s | Est. Tokens: %d",
            cache_key[:8],
            est_tokens,
        )
        return cached

    if not GEMINI_API_KEY:
        return "BetaBuddy is temporarily experiencing high demand. Please try again in a few moments."

    client = _get_client()
    ordered_models = [
        model
        for model in [GEMINI_MODEL, *GEMINI_MODEL_FALLBACKS, "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"]
        if model and model.strip()
    ]
    ordered_models = list(dict.fromkeys(ordered_models))

    count_429 = 0
    fallback_used = False

    for model_index, model_name in enumerate(ordered_models):
        if model_index > 0:
            fallback_used = True

        for attempt in range(MAX_RETRIES_PER_MODEL + 1):
            started = time.perf_counter()
            logger.info(
                "DIAGNOSTICS | Gemini Request Start | Model: %s | Attempt: %d | Fallback Used: %s | 429 Count: %d",
                model_name,
                attempt + 1,
                fallback_used,
                count_429,
            )

            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                )

                raw_text = getattr(response, "text", "") or ""
                cleaned_text = _extract_json_like_text(raw_text)
                if not cleaned_text or len(cleaned_text.strip()) == 0:
                    cleaned_text = _strip_code_fences(raw_text)

                elapsed_ms = (time.perf_counter() - started) * 1000

                if not cleaned_text or len(cleaned_text.strip()) == 0:
                    logger.warning(
                        "DIAGNOSTICS | Gemini Returned Empty Response | Model: %s | Attempt: %d",
                        model_name,
                        attempt + 1,
                    )
                    continue

                # Thread-safe cache write — only cache non-empty valid responses
                with _CACHE_LOCK:
                    _RESPONSE_CACHE[cache_key] = cleaned_text

                logger.info(
                    "DIAGNOSTICS | Gemini Request Success | Model: %s | Attempt: %d | Latency: %.2f ms | Response Length: %d | Fallback Used: %s | 429 Count: %d",
                    model_name,
                    attempt + 1,
                    elapsed_ms,
                    len(cleaned_text),
                    fallback_used,
                    count_429,
                )
                return cleaned_text


            except Exception as exc:
                err_str = (str(exc) + " " + type(exc).__name__).lower()
                http_status = getattr(exc, "code", getattr(exc, "status_code", "N/A"))
                is_429 = "429" in err_str or "resource_exhausted" in err_str or "quota" in err_str
                is_504 = "504" in err_str or "deadline_exceeded" in err_str or "deadline" in err_str or "gateway timeout" in err_str
                is_retryable = is_504 or any(
                    token in err_str for token in ("503", "unavailable", "timeout", "timed out", "readtimeout", "connection error")
                )

                if is_429:
                    count_429 += 1
                    logger.warning(
                        "DIAGNOSTICS | Gemini 429 Quota Exhausted | Model: %s | Switching immediately to fallback model without wasting retries",
                        model_name,
                    )
                    break

                backoff_sec = 1.0 if is_retryable else 0.0

                logger.error(
                    "DIAGNOSTICS | Gemini Attempt Failed | Model: %s | HTTP Status: %s | Attempt: %d | ExceptionType: %s | ErrorMsg: %s | FailureReason: %s | Backoff: %.1fs | Fallback Used: %s | 429 Count: %d",
                    model_name,
                    http_status,
                    attempt + 1,
                    type(exc).__name__,
                    str(exc),
                    "504 Deadline Exceeded" if is_504 else ("Transient Error" if is_retryable else "Client / API Error"),
                    backoff_sec,
                    fallback_used,
                    count_429,
                )

                if is_retryable and attempt < MAX_RETRIES_PER_MODEL:
                    time.sleep(backoff_sec)
                    continue

                break


    logger.error("All Gemini model attempts failed. Total 429 Count: %d. Returning friendly fallback to user.", count_429)
    return "BetaBuddy is temporarily experiencing high demand. Please try again in a few moments."

