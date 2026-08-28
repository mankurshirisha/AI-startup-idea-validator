"""Knowledge Base Retriever Module for BetaBuddy.

Selects and injects ONLY the minimum required knowledge base sections based on intent.
Never sends the entire dashboard context if only 1 or 2 sections are needed.
"""

from typing import Any, Dict
from app.logging_config import get_logger

logger = get_logger("chat.kb_retriever")


def retrieve_context(kb: Dict[str, Any], intent: str, question: str) -> Dict[str, Any]:
    """Retrieve minimal section context matching the intent.

    Args:
        kb: In-memory knowledge base dictionary.
        intent: Classified user intent string.
        question: Original user question.

    Returns:
        dict: Minimal context payload.
    """
    if not isinstance(kb, dict) or not kb:
        return {}

    meta = kb.get("meta", {})
    context: Dict[str, Any] = {"meta": meta}

    if intent == "summary":
        context["executive_summary"] = kb.get("executive_summary")
        context["score_breakdown"] = kb.get("score_breakdown")

    elif intent == "competitors":
        context["competitors"] = kb.get("competitors")
        context["market_gaps"] = kb.get("comparison", {}).get("market_gaps")

    elif intent == "market":
        context["market"] = kb.get("market")

    elif intent == "swot":
        context["swot"] = kb.get("swot")

    elif intent == "risk":
        context["risk_analysis"] = kb.get("risk_analysis")

    elif intent == "recommendations":
        context["recommendations"] = kb.get("recommendations")

    elif intent == "score":
        context["score_breakdown"] = kb.get("score_breakdown")

    elif intent == "sources":
        context["sources"] = kb.get("sources")

    elif intent == "business_model":
        context["business_model"] = meta.get("businessModel")
        context["recommendations"] = kb.get("recommendations")

    elif intent == "features":
        context["features"] = kb.get("comparison", {}).get("startup_features")
        context["value_proposition"] = kb.get("comparison", {}).get("final_value_proposition")

    elif intent == "comparison":
        context["competitors"] = kb.get("competitors")
        context["comparison"] = kb.get("comparison")

    else:
        # General Dashboard / Overview — inject concise summary + SWOT + top recommendations
        context["executive_summary"] = kb.get("executive_summary")
        context["swot"] = kb.get("swot")
        context["recommendations"] = kb.get("recommendations")

    logger.info("Retrieved context for intent '%s' (keys: %s)", intent, list(context.keys()))
    return context
