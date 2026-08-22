"""Chat Service Module for BetaBuddy — Core Orchestrator.

Implements the complete question flow:
User Question -> Guardrails -> Intent Classifier -> Knowledge Retrieval ->
Prompt Builder -> Gemini (Max 1 Call, Zero Tavily) -> Formatter -> Response.
"""

from typing import Dict, Any, Optional

from app.gemini_client import generate_content
from app.logging_config import get_logger

from app.chat.guardrails import check_guardrails
from app.chat.intent_classifier import classify_intent
from app.chat.kb_builder import build_knowledge_base
from app.chat.kb_retriever import retrieve_context
from app.chat.memory import get_session_history, add_exchange
from app.chat.prompt_builder import build_chat_prompt
from app.chat.response_formatter import format_response

logger = get_logger("chat.service")


def process_chat_request(
    session_id: str,
    question: str,
    validation_result: Optional[dict] = None,
    dashboard_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Process incoming BetaBuddy user question.

    Args:
        session_id: Unique session identifier string.
        question: User query string.
        validation_result: Optional startup validation result payload.
        dashboard_id: Optional dashboard identifier string for stored dashboard lookup.

    Returns:
        dict: Standardized chat response object.
    """
    logger.info("Processing chat request | session_id: '%s' | question: '%s'", session_id, question)

    # 1. Guardrails Check
    allowed, rejection_msg = check_guardrails(question)
    if not allowed:
        logger.info("Chat request blocked by guardrails")
        return {
            "status": "blocked",
            "answer": rejection_msg,
            "intent": "off_topic",
            "sources_used": [],
        }

    # 2. Intent Classification
    intent, confidence = classify_intent(question)
    logger.info("Intent classified: '%s' (confidence: %.2f)", intent, confidence)

    # 3. Knowledge Base Construction (In-Memory, Session Isolated & Dashboard Reuse)
    if not validation_result:
        from app.chatbot.service import BetaBuddyService
        _service = BetaBuddyService()

        target_dashboard_id = dashboard_id
        if not target_dashboard_id and session_id:
            try:
                sess_data = _service.session_manager.get_session(session_id, auto_heal=False)
                target_dashboard_id = sess_data.get("dashboard_id")
            except Exception:
                pass

        if target_dashboard_id:
            validation_result = _service.get_dashboard(target_dashboard_id)

        # Fallback to session_id lookup for backwards compatibility
        if not validation_result:
            validation_result = _service.get_dashboard(session_id) or {}

        if validation_result:
            logger.info("Reused stored dashboard result for session '%s' (dashboard_id: '%s')", session_id, target_dashboard_id or session_id)

    kb = build_knowledge_base(validation_result or {})

    # 4. Context Retrieval (Minimal Required Context Only)
    context = retrieve_context(kb, intent, question)

    # 5. Retrieve Memory (Last 4 Exchanges Only)
    history = get_session_history(session_id)

    # 6. Prompt Construction
    prompt = build_chat_prompt(context, history, question)

    # 7. Gemini LLM Call (MAX 1 CALL, ZERO Tavily)
    raw_response = ""
    try:
        logger.info("DIAGNOSTICS | Chat Gemini Request Started | Intent: %s | Prompt Length: %d", intent, len(prompt))
        raw_response = generate_content(prompt)
        logger.info("DIAGNOSTICS | Chat Gemini Request Completed | Intent: %s | Raw Length: %d", intent, len(raw_response))
    except Exception as exc:
        logger.exception("DIAGNOSTICS | Gemini call failed in chat service | Exception: %s | Error: %s", type(exc).__name__, exc)
        raw_response = "I couldn't find that information in your startup validation dashboard."


    # 8. Response Formatter
    formatted_answer = format_response(raw_response, intent)

    # 9. Update Session Memory
    add_exchange(session_id, question, formatted_answer)

    # 10. Extract Sources Used
    sources_used = kb.get("sources", [])

    return {
        "status": "success",
        "answer": formatted_answer,
        "intent": intent,
        "sources_used": sources_used if isinstance(sources_used, list) else [],
    }
