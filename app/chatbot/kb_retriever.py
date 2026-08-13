"""Knowledge Base Retriever Module for BetaBuddy Chatbot.

Retrieves ONLY the relevant dashboard context section based on classified intent.
Aggressively strips unused sections, metadata, IDs, timestamps, and empty fields.

Section Mapping:
- EXECUTIVE_SUMMARY -> executive_summary
- VALIDATION_SCORE -> validation_score
- SWOT -> swot
- COMPETITORS -> competitors
- MARKET_OPPORTUNITY -> market_opportunity
- BUSINESS_RISKS -> business_risks
- RECOMMENDATIONS -> recommendations
- BUSINESS_MODEL -> business_model
- GENERAL_EXPLANATION -> executive_summary, validation_score, recommendations, swot
- GREETING / HELP / UNKNOWN -> minimal empty dict
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.chatbot.intent_classifier import IntentResult
from app.chatbot.knowledge_builder import DashboardKnowledge
from app.chatbot.models import ChatMessage
from app.logging_config import get_logger

logger = get_logger("chatbot.kb_retriever")

# Maximum conversation messages retained (last 4 exchanges = 8 messages)
MAX_CONVERSATION_MESSAGES = 8


@dataclass(frozen=True)
class RetrievedContext:
    """Immutable payload containing relevant context section and truncated history."""

    intent: str
    context: Dict[str, Any]
    conversation: List[ChatMessage]
    confidence: float


def _clean_context(d: Any) -> Any:
    """Recursively strip metadata, IDs, timestamps, and empty values to optimize tokens."""
    if isinstance(d, dict):
        cleaned = {}
        for k, v in d.items():
            if k in (
                "dashboard_id",
                "created_at",
                "version",
                "id",
                "session_id",
                "timestamp",
                "cache_key",
                "section_names",
                "available_sections",
            ):
                continue
            c_v = _clean_context(v)
            if c_v not in ("", [], {}, None):
                cleaned[k] = c_v
        return cleaned
    elif isinstance(d, list):
        cleaned_list = []
        for item in d:
            c_item = _clean_context(item)
            if c_item not in ("", [], {}, None):
                cleaned_list.append(c_item)
        return cleaned_list
    elif isinstance(d, str):
        return d.strip()
    return d


class KnowledgeRetriever:
    """Retrieves minimal intent-grounded context from DashboardKnowledge."""

    def retrieve(
        self,
        knowledge: DashboardKnowledge,
        intent_result: IntentResult,
        conversation_history: Optional[List[ChatMessage]] = None,
    ) -> RetrievedContext:
        """Select and clean only the required section matching the intent.

        Args:
            knowledge: Immutable DashboardKnowledge object.
            intent_result: Classified IntentResult.
            conversation_history: Optional conversation history.

        Returns:
            RetrievedContext: Immutable retrieved context payload.
        """
        intent = intent_result.intent if intent_result else "UNKNOWN"
        confidence = intent_result.confidence if intent_result else 0.0

        raw_context: Dict[str, Any] = {}

        if intent == "EXECUTIVE_SUMMARY":
            if knowledge.executive_summary:
                raw_context["executive_summary"] = knowledge.executive_summary

        elif intent == "VALIDATION_SCORE":
            if knowledge.validation_score:
                raw_context["validation_score"] = knowledge.validation_score

        elif intent == "SWOT":
            if knowledge.swot:
                raw_context["swot"] = knowledge.swot

        elif intent == "COMPETITORS":
            if knowledge.competitors:
                raw_context["competitors"] = knowledge.competitors

        elif intent == "MARKET_OPPORTUNITY":
            if knowledge.market_opportunity:
                raw_context["market_opportunity"] = knowledge.market_opportunity

        elif intent == "BUSINESS_RISKS":
            if knowledge.business_risks:
                raw_context["business_risks"] = knowledge.business_risks

        elif intent == "RECOMMENDATIONS":
            if knowledge.recommendations:
                raw_context["recommendations"] = knowledge.recommendations

        elif intent == "BUSINESS_MODEL":
            if knowledge.business_model:
                raw_context["business_model"] = knowledge.business_model

        elif intent in ("GENERAL_EXPLANATION", "GENERAL_BUSINESS_KNOWLEDGE", "FOLLOW_UP", "UNKNOWN"):
            if knowledge.executive_summary:
                raw_context["executive_summary"] = knowledge.executive_summary
            if knowledge.validation_score:
                raw_context["validation_score"] = knowledge.validation_score
            if knowledge.swot:
                raw_context["swot"] = knowledge.swot
            if knowledge.market_opportunity:
                raw_context["market_opportunity"] = knowledge.market_opportunity
            if knowledge.recommendations:
                raw_context["recommendations"] = knowledge.recommendations

        # Clean metadata, IDs, timestamps, and empty fields
        cleaned_context = _clean_context(raw_context)

        # Truncate conversation history to last 4 exchanges (max 8 messages)
        history: List[ChatMessage] = []
        if conversation_history:
            history = conversation_history[-MAX_CONVERSATION_MESSAGES:]

        logger.info(
            "Retrieved context for intent '%s' (keys: %s, history len: %d)",
            intent,
            list(cleaned_context.keys()) if isinstance(cleaned_context, dict) else [],
            len(history),
        )

        return RetrievedContext(
            intent=intent,
            context=cleaned_context if isinstance(cleaned_context, dict) else {},
            conversation=history,
            confidence=confidence,
        )
