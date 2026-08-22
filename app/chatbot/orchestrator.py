"""BetaBuddy Chat Orchestrator Module.

Coordinates the deterministic, grounded RAG pipeline:
Session History -> Knowledge Building -> Intent Classification -> Context Retrieval -> Prompt Preparation.

Stateless, thread-safe, pure orchestration layer.
Zero LLM calls, zero HTTP requests, zero external dependencies.
Execution target: < 2 ms.
"""

from dataclasses import dataclass
from typing import List, Optional

from app.chatbot.intent_classifier import IntentClassifier
from app.chatbot.kb_retriever import KnowledgeRetriever, RetrievedContext
from app.chatbot.knowledge_builder import DashboardKnowledgeBuilder
from app.chatbot.models import ChatMessage
from app.chatbot.prompt_builder import PromptBuilder, PromptPackage
from app.chatbot.service import BetaBuddyService
from app.logging_config import get_logger

logger = get_logger("chatbot.orchestrator")


@dataclass(frozen=True)
class PreparedChatRequest:
    """Immutable payload containing all prepared components for LLM execution."""

    session_id: str
    dashboard_id: str
    intent: str
    retrieved_context: RetrievedContext
    prompt_package: Optional[PromptPackage]
    conversation_history: List[ChatMessage]
    status: str = "ready"  # "ready" or "clarification_required"


class BetaBuddyOrchestrator:
    """Orchestrates RAG context preparation for BetaBuddy."""

    def __init__(
        self,
        service: Optional[BetaBuddyService] = None,
        kb_builder: Optional[DashboardKnowledgeBuilder] = None,
        classifier: Optional[IntentClassifier] = None,
        retriever: Optional[KnowledgeRetriever] = None,
        prompt_builder: Optional[PromptBuilder] = None,
        min_confidence: float = 0.50,
    ):
        self.service = service or BetaBuddyService()
        self.kb_builder = kb_builder or DashboardKnowledgeBuilder()
        self.classifier = classifier or IntentClassifier()
        self.retriever = retriever or KnowledgeRetriever()
        self.prompt_builder = prompt_builder or PromptBuilder()
        self.min_confidence = min_confidence

    def prepare_request(
        self,
        session_id: str,
        dashboard_id: str,
        validation_result: dict,
        user_question: str,
    ) -> PreparedChatRequest:
        """Run complete 5-step context preparation pipeline.

        Args:
            session_id: Active session identifier string.
            dashboard_id: Dashboard identifier string.
            validation_result: Raw validation result dictionary.
            user_question: User's input question string.

        Returns:
            PreparedChatRequest: Immutable prepared request object.
        """
        # STEP 1: Load Session & History
        history: List[ChatMessage] = []
        try:
            history = self.service.get_history(session_id)
            logger.debug("Session loaded: '%s' (history len: %d)", session_id, len(history))
        except Exception:
            # If session expired or missing, auto-create
            session_id = self.service.create_session(dashboard_id=dashboard_id)
            history = []
            logger.debug("Session auto-created: '%s'", session_id)

        # STEP 2: Build Session-Isolated Dashboard Knowledge
        knowledge = self.kb_builder.build(validation_result, dashboard_id=dashboard_id)
        logger.debug("Knowledge built for dashboard: '%s'", dashboard_id)

        # STEP 3: Intent Classification
        intent_result = self.classifier.classify(user_question)
        logger.debug("Intent classified: '%s' (confidence: %.2f)", intent_result.intent, intent_result.confidence)

        # Check if clarification is required (empty question, UNKNOWN intent, or low confidence)
        needs_clarification = (
            not user_question
            or not user_question.strip()
            or intent_result.intent == "UNKNOWN"
            or intent_result.confidence < self.min_confidence
        )

        if needs_clarification:
            clarification_retrieved = self.retriever.retrieve(knowledge, intent_result, history)
            logger.debug(
                "Clarification required | intent: '%s' | confidence: %.2f",
                intent_result.intent,
                intent_result.confidence,
            )
            return PreparedChatRequest(
                session_id=session_id,
                dashboard_id=dashboard_id,
                intent=intent_result.intent,
                retrieved_context=clarification_retrieved,
                prompt_package=None,
                conversation_history=history,
                status="clarification_required",
            )

        # STEP 4: Retrieve Minimal Intent Context
        retrieved_context = self.retriever.retrieve(knowledge, intent_result, history)
        logger.debug("Context retrieved for intent: '%s'", intent_result.intent)

        # STEP 5: Build Token-Optimized Prompt Package
        prompt_package = self.prompt_builder.build(retrieved_context, user_question)
        logger.debug("Prompt prepared for intent: '%s'", intent_result.intent)

        return PreparedChatRequest(
            session_id=session_id,
            dashboard_id=dashboard_id,
            intent=intent_result.intent,
            retrieved_context=retrieved_context,
            prompt_package=prompt_package,
            conversation_history=history,
            status="ready",
        )
