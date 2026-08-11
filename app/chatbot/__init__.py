"""app.chatbot Package — BetaBuddy Infrastructure & Session Management Layer."""

from app.chatbot.chat_service import ChatResult, ChatService
from app.chatbot.exceptions import (
    ChatbotError,
    ChatbotTimeoutError,
    DashboardNotFound,
    GuardrailViolation,
    InvalidLLMResponse,
    InvalidQuestion,
    LLMGenerationError,
    SessionExpired,
)
from app.chatbot.guardrails import GuardrailResult, Guardrails
from app.chatbot.intent_classifier import IntentClassifier, IntentResult
from app.chatbot.kb_retriever import KnowledgeRetriever, RetrievedContext
from app.chatbot.knowledge_builder import (
    DashboardKnowledge,
    DashboardKnowledgeBuilder,
)
from app.chatbot.llm_gateway import LLMGateway, LLMResponse
from app.chatbot.models import (
    ChatAPIRequest,
    ChatAPIResponse,
    ChatMessage,
    ChatRequest,
    ChatResponse,
)
from app.chatbot.orchestrator import BetaBuddyOrchestrator, PreparedChatRequest
from app.chatbot.prompt_builder import PromptBuilder, PromptPackage
from app.chatbot.router import router
from app.chatbot.service import BetaBuddyService
from app.chatbot.session import SessionManager

__all__ = [
    "router",
    "ChatService",
    "ChatResult",
    "BetaBuddyService",
    "SessionManager",
    "DashboardKnowledgeBuilder",
    "DashboardKnowledge",
    "IntentClassifier",
    "IntentResult",
    "Guardrails",
    "GuardrailResult",
    "KnowledgeRetriever",
    "RetrievedContext",
    "PromptBuilder",
    "PromptPackage",
    "BetaBuddyOrchestrator",
    "PreparedChatRequest",
    "LLMGateway",
    "LLMResponse",
    "ChatRequest",
    "ChatResponse",
    "ChatMessage",
    "ChatAPIRequest",
    "ChatAPIResponse",
    "ChatbotError",
    "InvalidQuestion",
    "SessionExpired",
    "DashboardNotFound",
    "GuardrailViolation",
    "ChatbotTimeoutError",
    "InvalidLLMResponse",
    "LLMGenerationError",
]
