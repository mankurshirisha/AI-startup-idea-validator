"""LLM Gateway Module for BetaBuddy Chatbot.

Dedicated execution gateway communicating with Gemini LLM:
- Accepts PromptPackage (system_prompt + user_prompt)
- Executes single Gemini request with enforced configuration:
  - Temperature: 0.2
  - Top P: 0.9
  - Max Tokens: 700
  - Response MIME: text/plain
  - Timeout: 20 seconds
  - Max Retries: 1 retry on 429 / 503 / Timeout
- Validates output (rejects empty/whitespace or > 3000 chars)
- Measures & returns generation latency in LLMResponse
"""

import time
from dataclasses import dataclass
from typing import Any, Optional

from google.genai import types

from app.chatbot.exceptions import (
    ChatbotTimeoutError,
    InvalidLLMResponse,
    LLMGenerationError,
)
from app.chatbot.prompt_builder import PromptPackage
from app.config import GEMINI_MODEL
from app.logging_config import get_logger

logger = get_logger("chatbot.llm_gateway")

MAX_RESPONSE_LENGTH = 3000
TIMEOUT_SECONDS = 20.0
MAX_RETRIES = 1


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
        """Generate response from Gemini for a PromptPackage.

        Args:
            prompt_package: Immutable PromptPackage containing system & user prompts.

        Returns:
            LLMResponse: Formatted response text and execution latency.

        Raises:
            InvalidLLMResponse: If prompt_package is invalid or response fails validation.
            ChatbotTimeoutError: If request times out.
            LLMGenerationError: If LLM call fails after retries.
        """
        if not prompt_package or not prompt_package.user_prompt:
            raise InvalidLLMResponse("PromptPackage or user_prompt cannot be empty.")

        client = self._get_client()
        system_prompt = prompt_package.system_prompt
        user_prompt = prompt_package.user_prompt

        config = types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.2,
            top_p=0.9,
            max_output_tokens=700,
            response_mime_type="text/plain",
            http_options=types.HttpOptions(timeout=20000),  # 20s deadline in ms
        )

        start_time = time.perf_counter()
        ordered_models = [
            model for model in [GEMINI_MODEL, *GEMINI_MODEL_FALLBACKS]
            if model and model not in {""}
        ]
        ordered_models = list(dict.fromkeys(ordered_models))

        response_text = ""
        last_exception: Optional[Exception] = None

        for model_name in ordered_models:
            for attempt in range(1 + MAX_RETRIES):
                try:
                    logger.info("DIAGNOSTICS | Gemini Request Start | Model: %s | Attempt: %d", model_name, attempt + 1)
                    raw_res = client.models.generate_content(
                        model=model_name,
                        contents=user_prompt,
                        config=config,
                    )
                    text = getattr(raw_res, "text", "") or ""
                    if text and len(text.strip()) > 10:
                        response_text = text.strip()
                        logger.info("DIAGNOSTICS | Gemini Response Success | Model: %s | Chars: %d", model_name, len(response_text))
                        break
                    else:
                        logger.warning("Gemini response invalid or < 10 chars. Retrying...")
                        if attempt < MAX_RETRIES:
                            time.sleep(0.5)
                            continue
                except Exception as exc:
                    last_exception = exc
                    err_str = (str(exc) + " " + type(exc).__name__).lower()

                    is_retryable = any(
                        token in err_str
                        for token in ("timeout", "readtimeout", "connecttimeout", "429", "503", "resource_exhausted", "unavailable")
                    )

                    if is_retryable:
                        logger.warning("LLM model %s attempt %d failed (%s). Retrying/fallback...", model_name, attempt + 1, type(exc).__name__)
                        if attempt < MAX_RETRIES:
                            time.sleep(0.5)
                            continue
                        # Break inner retry loop to try next fallback model
                        break

                    logger.error("LLM request failed with non-retryable error: %s", exc)
                    raise LLMGenerationError(f"LLM generation failed: {exc}") from exc

            if response_text:
                break

        elapsed_ms = (time.perf_counter() - start_time) * 1000

        # Validate Output
        if not response_text or len(response_text) <= 10:
            logger.error("Output validation failed: empty or <= 10 chars response")
            raise InvalidLLMResponse("LLM response was empty or <= 10 characters.")

        if len(response_text) > MAX_RESPONSE_LENGTH:
            logger.warning("Response length %d exceeds max %d; truncating safely", len(response_text), MAX_RESPONSE_LENGTH)
            response_text = response_text[:MAX_RESPONSE_LENGTH]

        logger.info("DIAGNOSTICS | LLM Request Finished | Latency: %.2f ms | Output Chars: %d", elapsed_ms, len(response_text))
        return LLMResponse(response_text=response_text, latency_ms=elapsed_ms)
