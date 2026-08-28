"""app.chat Package — BetaBuddy Dashboard AI Assistant Backend."""

from app.chat.chat_service import process_chat_request
from app.chat.guardrails import check_guardrails
from app.chat.intent_classifier import classify_intent
from app.chat.kb_builder import build_knowledge_base
from app.chat.kb_retriever import retrieve_context
from app.chat.memory import get_session_history, add_exchange, clear_session

__all__ = [
    "process_chat_request",
    "check_guardrails",
    "classify_intent",
    "build_knowledge_base",
    "retrieve_context",
    "get_session_history",
    "add_exchange",
    "clear_session",
]
