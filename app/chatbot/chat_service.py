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
        """Process incoming user question through end-to-end chatbot pipeline.

        Args:
            session_id: Active session identifier string.
            dashboard_id: Target dashboard identifier string.
            validation_result: Raw validation output payload dictionary.
            user_question: User's input question string.

        Returns:
            ChatResult: Immutable result containing response text and latency metrics.

        Raises:
            SessionExpired: If session_id is invalid or has expired.
        """
        start_time = time.perf_counter()

        # STEP 1: Validate Session (raises SessionExpired if missing)
        try:
            current_history = self.service.get_history(session_id)
            logger.debug("Session validated (session_id: '%s')", session_id)
        except SessionExpired as exc:
            logger.warning("Session validation failed for session_id: '%s'", session_id)
            raise exc
        except Exception as exc:
            logger.warning("Session lookup error for session_id: '%s'", session_id)
            raise SessionExpired(f"Session '{session_id}' expired or not found.") from exc

        # STEP 2: Save User Message
        self.service.add_message(session_id, "user", user_question)
        logger.debug("User message stored in session history")

        # STEP 3: Orchestrate Context & Prompt Preparation
        prepared = self.orchestrator.prepare_request(
            session_id=session_id,
            dashboard_id=dashboard_id,
            validation_result=validation_result,
            user_question=user_question,
        )
        logger.debug("Prompt prepared by orchestrator")

        # STEP 4: Handle Clarification Flow (No LLM Call)
        if prepared.status == "clarification_required" or not prepared.prompt_package:
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            updated_history = self.service.get_history(session_id)
            logger.debug("Clarification required; request finished without LLM call")
            return ChatResult(
                status="clarification_required",
                response=CLARIFICATION_MESSAGE,
                latency_ms=elapsed_ms,
                intent=prepared.intent,
                conversation_length=len(updated_history),
            )

        # STEP 5: Call LLM Gateway (Exactly ONE Call)
        llm_response = self.llm_gateway.generate(prepared.prompt_package)
        logger.debug("LLM completed generation")

        # STEP 6: Store Assistant Response
        self.service.add_message(session_id, "assistant", llm_response.response_text)
        logger.debug("Assistant message stored in session history")

        # STEP 7: Return ChatResult with End-to-End Latency
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        final_history = self.service.get_history(session_id)

        logger.debug(
            "Request finished (status: success, latency: %.2f ms, conv_length: %d)",
            elapsed_ms,
            len(final_history),
        )

        return ChatResult(
            status="success",
            response=llm_response.response_text,
            latency_ms=elapsed_ms,
            intent=prepared.intent,
            conversation_length=len(final_history),
        )
