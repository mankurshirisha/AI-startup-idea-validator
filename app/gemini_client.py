import hashlib
import time
from typing import Dict, Optional

from google import genai

from app.config import GEMINI_API_KEY, GEMINI_MODEL, GEMINI_MODEL_FALLBACKS
from app.logging_config import get_logger

logger = get_logger("app.gemini_client")

_CLIENT: Optional[genai.Client] = None
_RESPONSE_CACHE: Dict[str, str] = {}


def _get_client() -> genai.Client:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = genai.Client(api_key=GEMINI_API_KEY)
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
    message = str(exc).upper()
    return any(
        token in message
        for token in ("429", "503", "RESOURCE_EXHAUSTED", "UNAVAILABLE")
    )


def generate_content(prompt: str) -> str:
    if not prompt:
        return ""

    cache_key = hashlib.sha256(prompt.encode("utf-8")).hexdigest()
    if cache_key in _RESPONSE_CACHE:
        return _RESPONSE_CACHE[cache_key]

    if not GEMINI_API_KEY:
        raise RuntimeError("Gemini API is not configured.")

    try:
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

            for attempt in range(4):
                started = time.perf_counter()
                logger.info(
                    "Gemini request start model=%s prompt_length=%s",
                    model_name,
                    len(prompt),
                )

                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                    )

                    raw_text = getattr(response, "text", "") or ""
                    cleaned_text = _extract_json_like_text(raw_text)
                    elapsed = time.perf_counter() - started

                    _RESPONSE_CACHE[cache_key] = cleaned_text
                    logger.info(
                        "Gemini request success model=%s elapsed=%.3fs retries=%s fallback_model_used=%s",
                        model_name,
                        elapsed,
                        attempt,
                        fallback_model_used,
                    )
                    return cleaned_text

                except Exception as exc:
                    last_error = exc
                    elapsed = time.perf_counter() - started
                    is_retryable = _should_retry(exc)
                    logger.exception(
                        "Gemini request failed model=%s elapsed=%.3fs retries=%s fallback_model_used=%s",
                        model_name,
                        elapsed,
                        attempt,
                        fallback_model_used,
                    )

                    if is_retryable and attempt < 3:
                        wait_seconds = 2 ** (attempt + 1)
                        logger.info("Retrying Gemini request after %ss", wait_seconds)
                        time.sleep(wait_seconds)
                        continue

                    break

        raise RuntimeError(
            "Unable to generate content from Gemini at the moment."
        ) from last_error
    except Exception as exc:
        logger.exception("Unexpected error while calling Gemini")
        raise RuntimeError(
            "Unable to generate content from Gemini at the moment."
        ) from exc
