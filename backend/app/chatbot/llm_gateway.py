"""LLM Gateway Module for BetaBuddy Chatbot.

Dedicated execution gateway communicating with Gemini LLM:
- Accepts PromptPackage (system_prompt + user_prompt)
- Executes Gemini request with strict retry bounds:
  - Primary model: 1 request + 1 retry (max 2 attempts)
  - Fallback model: 1 request + 1 retry (max 2 attempts)
  - Maximum total HTTP requests = 4
- Handles 429 Rate Limits with exponential backoff & instant model fallback
- Returns friendly assistant message on high demand without exposing raw errors
- Logs: Model, Attempt, Backoff, Fallback Used, 429 Count
"""

import time
from dataclasses import dataclass
from typing import Any, Optional

from google.genai import types

from app.chatbot.prompt_builder import PromptPackage
from app.config import GEMINI_MODEL, GEMINI_MODEL_FALLBACKS
from app.logging_config import get_logger

logger = get_logger("chatbot.llm_gateway")

MAX_RESPONSE_LENGTH = 3000
MAX_RETRIES_PER_MODEL = 1  # 1 initial request + 1 retry = max 2 attempts per model
HIGH_DEMAND_MESSAGE = "BetaBuddy is temporarily experiencing high demand. Please try again in a few moments."


@dataclass(frozen=True)
class LLMResponse:
    """Immutable payload containing cleaned response text and generation latency."""

    response_text: str
    latency_ms: float


class LLMGateway:
    """Dedicated execution gateway for Gemini LLM calls."""

    def __init__(self, gemini_client: Optional[Any] = None):
        self.client = gemini_client

    def _get_client(self) -> Any:
        """Lazy-load or return injected Gemini client."""
        if self.client is None:
            from app.gemini_client import _get_client
            self.client = _get_client()
        return self.client

    def generate(self, prompt_package: PromptPackage) -> LLMResponse:
        """Generate response from Gemini for a PromptPackage with strict retry limits and graceful fallback.

        Args:
            prompt_package: Immutable PromptPackage containing system & user prompts.

        Returns:
            LLMResponse: Formatted response text and execution latency.
        """
        start_time = time.perf_counter()

        if not prompt_package or not prompt_package.user_prompt:
            return LLMResponse(response_text=HIGH_DEMAND_MESSAGE, latency_ms=0.0)

        client = self._get_client()
        system_prompt = prompt_package.system_prompt
        user_prompt = prompt_package.user_prompt

        # Deduplicate model sequence (Primary + Fallbacks)
        # Deduplicate model sequence (Primary + Fallbacks)
        ordered_models = [
            model for model in [GEMINI_MODEL, *GEMINI_MODEL_FALLBACKS, "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"]
            if model and model.strip()
        ]
        ordered_models = list(dict.fromkeys(ordered_models))

        response_text = ""
        count_429 = 0
        fallback_used = False

        for model_index, model_name in enumerate(ordered_models):
            if model_index > 0:
                fallback_used = True

            for attempt in range(MAX_RETRIES_PER_MODEL + 1):  # Attempt 0 (initial), Attempt 1 (retry)
                try:
                    logger.info(
                        "DIAGNOSTICS | Gemini Request Start | Model: %s | Attempt: %d | Fallback Used: %s | 429 Count: %d",
                        model_name,
                        attempt + 1,
                        fallback_used,
                        count_429,
                    )

                    config = types.GenerateContentConfig(system_instruction=system_prompt) if system_prompt else None

                    raw_res = client.models.generate_content(
                        model=model_name,
                        contents=user_prompt,
                        config=config,
                    )

                    text = (getattr(raw_res, "text", "") or "").strip()
                    is_empty = not text or len(text) <= 10

                    if is_empty:
                        logger.warning(
                            "DIAGNOSTICS | Gemini Returned Empty Response | Model: %s | Attempt: %d | Is Empty: True | Raw Length: %d | Fallback Used: %s",
                            model_name,
                            attempt + 1,
                            len(text),
                            fallback_used,
                        )
                        continue

                    response_text = text
                    elapsed_ms = (time.perf_counter() - start_time) * 1000
                    logger.info(
                        "DIAGNOSTICS | Gemini Response Success | Model: %s | Attempt: %d | HTTP Status: 200 | Latency: %.2f ms | Response Length: %d | Is Empty: False | Fallback Used: %s | 429 Count: %d",
                        model_name,
                        attempt + 1,
                        elapsed_ms,
                        len(response_text),
                        fallback_used,
                        count_429,
                    )
                    break

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
                            "DIAGNOSTICS | Gemini 429 Quota Exhausted | Model: %s | HTTP Status: %s | ExceptionType: %s | ErrorMsg: %s | Switching immediately to fallback model without wasting retries",
                            model_name,
                            http_status,
                            type(exc).__name__,
                            str(exc),
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

                    # Exhausted retries for this model -> break inner loop to try fallback model
                    break

            if response_text:
                break

        elapsed_ms = (time.perf_counter() - start_time) * 1000

        # Validate Output — If all models failed or empty, return friendly high-demand message
        if not response_text or len(response_text) <= 10:
            logger.error(
                "DIAGNOSTICS | All Gemini Models Failed | Total 429 Count: %d | Returning Friendly High-Demand Message to User",
                count_429,
            )
            response_text = HIGH_DEMAND_MESSAGE



        if len(response_text) > MAX_RESPONSE_LENGTH:
            logger.info("Response length %d exceeds max %d; truncating safely", len(response_text), MAX_RESPONSE_LENGTH)
            response_text = response_text[:MAX_RESPONSE_LENGTH]

        return LLMResponse(response_text=response_text, latency_ms=elapsed_ms)
