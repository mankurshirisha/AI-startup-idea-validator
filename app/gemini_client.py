"""Gemini API client with thread-safe TTL response cache and enforced request timeout.

Features:
- Singleton Client reusing connection pool.
- Transport deadline enforced via google.genai types.HttpOptions(timeout=30000).
- ReadTimeout & network timeout error retries with exponential backoff.
- Privacy-safe diagnostic logging (Model, Prompt Chars, Est Tokens, Latency ms, Response Length).
- NEVER logs prompt text, user data, or dashboard payloads.
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


def _get_client() -> genai.Client:
    """Return singleton genai.Client with enforced 30s transport timeout."""
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = genai.Client(
            api_key=GEMINI_API_KEY,
            http_options=types.HttpOptions(timeout=30000),  # 30,000 ms (30s) deadline
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


def _should_retry(exc: Exception) -> bool:
    """Check if exception is retryable (includes ReadTimeout and rate limits)."""
    message = str(exc).upper()
    err_type = type(exc).__name__.upper()
    return any(
        token in message or token in err_type
        for token in (
            "429",
            "503",
            "RESOURCE_EXHAUSTED",
            "UNAVAILABLE",
            "TIMEOUT",
            "READTIMEOUT",
            "TIMED OUT",
            "CONNECTTIMEOUT",
        )
    )


def generate_content(prompt: str, timeout: int = 30) -> str:
    """Call Gemini and return the cleaned text response.

    Args:
        prompt: The prompt to send to Gemini.
        timeout: Maximum seconds to wait for a single Gemini API response.

    Returns:
        Cleaned response text (code fences stripped, JSON extracted).
    """
    if not prompt:
        return ""

    # Measure Prompt Size (Privacy-Safe Metrics Only)
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
        raise RuntimeError("Gemini API is not configured.")

    client = _get_client()
    ordered_models = [
        model
        for model in [GEMINI_MODEL, *GEMINI_MODEL_FALLBACKS]
        if model and model not in {""}
    ]
    ordered_models = list(dict.fromkeys(ordered_models))

    last_error: Optional[Exception] = None

    for model_index, model_name in enumerate(ordered_models):
        fallback_model_used = (
            ordered_models[model_index - 1] if model_index > 0 else None
        )

        for attempt in range(2):  # 2 attempts per model (initial + 1 retry)
            started = time.perf_counter()
            logger.info(
                "DIAGNOSTICS | Gemini Request Start | Model: %s | Chars: %d | Est. Tokens: %d | Attempt: %d",
                model_name,
                char_count,
                est_tokens,
                attempt + 1,
            )

            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                )

                raw_text = getattr(response, "text", "") or ""
                cleaned_text = _extract_json_like_text(raw_text)
                elapsed_ms = (time.perf_counter() - started) * 1000

                # Thread-safe cache write
                with _CACHE_LOCK:
                    _RESPONSE_CACHE[cache_key] = cleaned_text

                logger.info(
                    "DIAGNOSTICS | Gemini Request Success | Model: %s | Latency: %.2f ms | Retries: %d | Resp Chars: %d | Fallback: %s",
                    model_name,
                    elapsed_ms,
                    attempt,
                    len(cleaned_text),
                    fallback_model_used,
                )
                return cleaned_text

            except Exception as exc:
                last_error = exc
                elapsed_ms = (time.perf_counter() - started) * 1000
                is_retryable = _should_retry(exc)

                logger.warning(
                    "DIAGNOSTICS | Gemini Request Attempt Failed | Model: %s | Latency: %.2f ms | Attempt: %d | ErrorType: %s | Retryable: %s",
                    model_name,
                    elapsed_ms,
                    attempt + 1,
                    type(exc).__name__,
                    is_retryable,
                )

                if is_retryable and attempt < 1:
                    wait_seconds = 1.5 * (attempt + 1)
                    logger.info("Retrying Gemini request after %.1fs backoff", wait_seconds)
                    time.sleep(wait_seconds)
                    continue

                break

    logger.error("All Gemini model attempts failed. Last error: %s", last_error)
    raise RuntimeError(
        "Unable to generate content from Gemini at the moment."
    ) from last_error
