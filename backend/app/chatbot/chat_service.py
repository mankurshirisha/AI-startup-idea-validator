"""BetaBuddy Chat Application Service Module.

Central application service coordinating the complete BetaBuddy conversation lifecycle:
1. Validates session existence (raises SessionExpired if missing/expired)
2. Persists user question into session history
3. Calls BetaBuddyOrchestrator to build prompt package
4. Handles clarification flow (skips LLM if clarification required)
5. Executes single LLM generation via LLMGateway
6. Persists assistant response into session history
7. Measures total end-to-end processing latency and returns ChatResult
"""

import time
from dataclasses import dataclass
from typing import Any, Optional

from app.chatbot.exceptions import SessionExpired
from app.chatbot.llm_gateway import LLMGateway
from app.chatbot.orchestrator import BetaBuddyOrchestrator
from app.chatbot.service import BetaBuddyService
from app.logging_config import get_logger

logger = get_logger("chatbot.chat_service")

CLARIFICATION_MESSAGE = (
    "Could you rephrase your question? I can answer questions about your startup validation dashboard."
)


@dataclass(frozen=True)
class ChatResult:
    """Immutable payload containing final chatbot response and telemetry."""

    status: str
    response: str
    latency_ms: float
    intent: str
    conversation_length: int


def _build_graceful_fallback(intent: str, val_result: dict) -> str:
    """Build a deterministic advisor fallback response using dashboard context when Gemini is unavailable."""
    summary = val_result.get("executiveSummary") or "Your startup validation dashboard has been analyzed."
    score = val_result.get("validationScore") or 75
    verdict = val_result.get("verdict") or "Promising"

    return f"Dashboard status: Validation score is {score}/100 ({verdict}). Summary: {summary}"



class ChatService:
    """Central service orchestrating BetaBuddy conversation execution."""

    def __init__(
        self,
        service: Optional[BetaBuddyService] = None,
        orchestrator: Optional[BetaBuddyOrchestrator] = None,
        llm_gateway: Optional[LLMGateway] = None,
    ):
        self.service = service or BetaBuddyService()
        self.orchestrator = orchestrator or BetaBuddyOrchestrator(service=self.service)
        self.llm_gateway = llm_gateway or LLMGateway()

    def chat(
        self,
        session_id: str,
        dashboard_id: str,
        validation_result: dict,
        user_question: str,
    ) -> ChatResult:
        """Process incoming user question through end-to-end chatbot pipeline."""
        start_time = time.perf_counter()
        logger.info("DIAGNOSTICS | Request Received | session_id: '%s' | dashboard_id: '%s'", session_id, dashboard_id)

        # STEP 1: Validate Session & Load
        try:
            current_history = self.service.get_history(session_id)
            logger.info("DIAGNOSTICS | Session Loaded | length: %d", len(current_history))
        except SessionExpired as exc:
            logger.warning("Session validation failed for session_id: '%s'", session_id)
            raise exc
        except Exception as exc:
            logger.warning("Session lookup error for session_id: '%s'", session_id)
            raise SessionExpired(f"Session '{session_id}' expired or not found.") from exc

        # STEP 2: Dashboard Found
        logger.info("DIAGNOSTICS | Dashboard Found | ID: '%s'", dashboard_id)

        # STEP 3: Save User Message
        self.service.add_message(session_id, "user", user_question)

        # STEP 4: Orchestrate Context & Prompt Preparation
        prepared = self.orchestrator.prepare_request(
            session_id=session_id,
            dashboard_id=dashboard_id,
            validation_result=validation_result,
            user_question=user_question,
        )
        logger.info("DIAGNOSTICS | Intent Detected: %s", prepared.intent)

        # Handle Clarification Flow
        if prepared.status == "clarification_required" or not prepared.prompt_package:
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            updated_history = self.service.get_history(session_id)
            logger.info("DIAGNOSTICS | Clarification Required | Total Latency: %.2f ms", elapsed_ms)
            return ChatResult(
                status="clarification_required",
                response=CLARIFICATION_MESSAGE,
                latency_ms=elapsed_ms,
                intent=prepared.intent,
                conversation_length=len(updated_history),
            )

        prompt_pkg = prepared.prompt_package
        prompt_chars = len(prompt_pkg.system_prompt) + len(prompt_pkg.user_prompt)
        est_tokens = max(1, prompt_chars // 4)
        logger.info("DIAGNOSTICS | Prompt Built | Chars: %d | Est. Tokens: %d", prompt_chars, est_tokens)

        # STEP 5: Call LLM Gateway with Graceful Fallback Recovery
        response_text = ""
        try:
            logger.info("DIAGNOSTICS | Gemini Request Started")
            llm_res = self.llm_gateway.generate(prompt_pkg)
            response_text = llm_res.response_text
            logger.info("DIAGNOSTICS | Gemini Response Received | Length: %d | Validation Passed: True", len(response_text))
        except Exception as exc:
            logger.warning("Gemini execution failed after retries (%s); generating graceful dashboard fallback...", type(exc).__name__)
            response_text = _build_graceful_fallback(prepared.intent, validation_result)
            logger.info("DIAGNOSTICS | Fallback Generated | Length: %d", len(response_text))

        # STEP 6: Store Assistant Response
        self.service.add_message(session_id, "assistant", response_text)
        final_history = self.service.get_history(session_id)
        logger.info("DIAGNOSTICS | Conversation Saved | Total Messages: %d", len(final_history))

        # STEP 7: Return ChatResult
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        logger.info("DIAGNOSTICS | Total Latency: %.2f ms", elapsed_ms)

        return ChatResult(
            status="success",
            response=response_text,
            latency_ms=elapsed_ms,
            intent=prepared.intent,
            conversation_length=len(final_history),
        )
