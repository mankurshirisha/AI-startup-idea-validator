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
            http_options={"timeout": TIMEOUT_SECONDS},
        )

        start_time = time.perf_counter()
        logger.debug("LLM request started (model: %s)", GEMINI_MODEL)

        response_text = ""
        last_exception: Optional[Exception] = None

        for attempt in range(1 + MAX_RETRIES):
            try:
                raw_res = client.models.generate_content(
                    model=GEMINI_MODEL,
                    contents=user_prompt,
                    config=config,
                )
                if raw_res and raw_res.text:
                    response_text = raw_res.text.strip()
                    break
                else:
                    raise InvalidLLMResponse("Received empty response from Gemini.")
            except Exception as exc:
                last_exception = exc
                err_str = str(exc).lower()

                # Check if timeout
                if "timeout" in err_str or "timed out" in err_str:
                    logger.warning("LLM request attempt %d timed out", attempt + 1)
                    if attempt < MAX_RETRIES:
                        time.sleep(0.5)
                        continue
                    raise ChatbotTimeoutError("LLM generation request timed out after 20s.") from exc

                # Check if retryable status (429 Rate Limit, 503 Service Unavailable)
                if "429" in err_str or "503" in err_str or "resource_exhausted" in err_str or "unavailable" in err_str:
                    logger.warning("LLM request attempt %d hit retryable status: %s", attempt + 1, exc)
                    if attempt < MAX_RETRIES:
                        time.sleep(0.5)
                        continue
                    raise LLMGenerationError(f"LLM call failed with status error: {exc}") from exc

                # Non-retryable validation or client error
                logger.error("LLM request failed with non-retryable error: %s", exc)
                raise LLMGenerationError(f"LLM generation failed: {exc}") from exc

        elapsed_ms = (time.perf_counter() - start_time) * 1000

        # Validate Output
        if not response_text or not response_text.strip():
            logger.error("Output validation failed: empty or whitespace-only response")
            raise InvalidLLMResponse("LLM response was empty or whitespace-only.")

        if len(response_text) > MAX_RESPONSE_LENGTH:
            logger.error("Output validation failed: response length %d exceeds max %d", len(response_text), MAX_RESPONSE_LENGTH)
            raise InvalidLLMResponse(f"LLM response length ({len(response_text)}) exceeded limit of {MAX_RESPONSE_LENGTH} characters.")

        logger.debug("LLM request finished (latency: %.2f ms, output chars: %d)", elapsed_ms, len(response_text))
        return LLMResponse(response_text=response_text, latency_ms=elapsed_ms)
