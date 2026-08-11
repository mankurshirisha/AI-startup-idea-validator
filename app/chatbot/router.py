"""FastAPI Router Module for BetaBuddy Chatbot.

Exposes production-grade FastAPI endpoints:
- POST /api/chat/session: Create new chatbot session ID
- POST /api/chat/: Send question and receive structured response

Features:
- Rate limiting: 30 requests / min / session (In-memory, thread-safe, 429 response)
- UUID4 request tracing ID attached to every response
- Clean exception-to-HTTP-status code mapping (404 for DashboardNotFound)
- Strict Pydantic input/output validation
- Dependency injection for ChatService and BetaBuddyService
"""

import threading
import time
import uuid
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.chatbot.chat_service import ChatService
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
from app.chatbot.models import ChatAPIRequest, ChatAPIResponse
from app.chatbot.service import BetaBuddyService
from app.logging_config import get_logger

logger = get_logger("chatbot.router")

router = APIRouter(prefix="/api/chat", tags=["BetaBuddy"])

# Singleton services for dependency injection
_DEFAULT_SERVICE = BetaBuddyService()
_DEFAULT_CHAT_SERVICE = ChatService(service=_DEFAULT_SERVICE)

# Thread-safe in-memory rate limiter: session_id -> list of timestamps
_RATE_LIMIT_STORE: Dict[str, List[float]] = {}
_RATE_LIMIT_LOCK = threading.Lock()
MAX_REQUESTS_PER_MINUTE = 30
WINDOW_SECONDS = 60.0


def get_chat_service() -> ChatService:
    """Dependency provider for ChatService."""
    return _DEFAULT_CHAT_SERVICE


def get_beta_service() -> BetaBuddyService:
    """Dependency provider for BetaBuddyService."""
    return _DEFAULT_SERVICE


def _check_rate_limit(session_id: str) -> None:
    """Check and enforce 30 req/min rate limit per session_id."""
    now = time.time()
    with _RATE_LIMIT_LOCK:
        timestamps = _RATE_LIMIT_STORE.setdefault(session_id, [])
        # Prune timestamps older than 60 seconds
        valid_timestamps = [t for t in timestamps if now - t < WINDOW_SECONDS]
        if len(valid_timestamps) >= MAX_REQUESTS_PER_MINUTE:
            logger.warning("Rate limit exceeded for session_id: '%s'", session_id)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Maximum 30 requests per minute allowed.",
            )
        valid_timestamps.append(now)
        _RATE_LIMIT_STORE[session_id] = valid_timestamps


@router.post(
    "/session",
    summary="Create a new BetaBuddy session",
    description="Initializes a new isolated chatbot session ID.",
    response_description="JSON object containing session_id",
)
def create_session(
    payload: Optional[dict] = None,
    service: BetaBuddyService = Depends(get_beta_service),
):
    """Endpoint creating a new chatbot session."""
    dashboard_id = payload.get("dashboard_id") if payload else None
    session_id = service.create_session(dashboard_id=dashboard_id)
    return {"session_id": session_id}


@router.post(
    "/",
    response_model=ChatAPIResponse,
    summary="Send a question to BetaBuddy",
    description="Process a dashboard question and return a structured conversational response.",
    response_description="Structured ChatAPIResponse object",
)
def chat_endpoint(
    request: ChatAPIRequest,
    chat_service: ChatService = Depends(get_chat_service),
    beta_service: BetaBuddyService = Depends(get_beta_service),
):
    """Main production chatbot endpoint."""
    request_id = str(uuid.uuid4())
    start_time = time.perf_counter()

    # 1. Input Validation
    question = request.question.strip() if request.question else ""
    if not question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty or whitespace.",
        )
    if len(question) > 500:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question length exceeds limit of 500 characters.",
        )
    if not request.session_id or not request.session_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="session_id is required.",
        )
    if not request.dashboard_id or not request.dashboard_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="dashboard_id is required.",
        )

    # 2. Save incoming validation_result to memory if provided
    if request.validation_result:
        beta_service.save_dashboard(request.dashboard_id, request.validation_result)

    # 3. Retrieve existing validation result from memory
    val_result = beta_service.get_dashboard(request.dashboard_id) or request.validation_result
    if not val_result:
        logger.warning("Dashboard not found for dashboard_id: '%s'", request.dashboard_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Startup validation dashboard '{request.dashboard_id}' not found.",
        )

    # 4. Rate Limiting Check (30 req / min)
    _check_rate_limit(request.session_id)

    logger.info("Request started | request_id: %s", request_id)

    # 5. Delegate to ChatService
    try:
        result = chat_service.chat(
            session_id=request.session_id,
            dashboard_id=request.dashboard_id,
            validation_result=val_result,
            user_question=question,
        )

        overhead_ms = (time.perf_counter() - start_time) * 1000

        logger.info(
            "Request finished | request_id: %s | status: %s | latency: %.2f ms",
            request_id,
            result.status,
            overhead_ms,
        )

        return ChatAPIResponse(
            status=result.status,
            response=result.response,
            intent=result.intent,
            latency_ms=result.latency_ms,
            conversation_length=result.conversation_length,
            request_id=request_id,
        )

    # 6. Clean Exception-to-HTTP-Status Mapping
    except DashboardNotFound as exc:
        logger.warning("DashboardNotFound error | request_id: %s", request_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    except SessionExpired as exc:
        logger.warning("SessionExpired error | request_id: %s", request_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    except InvalidQuestion as exc:
        logger.warning("InvalidQuestion error | request_id: %s", request_id)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    except GuardrailViolation as exc:
        logger.warning("GuardrailViolation error | request_id: %s", request_id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc

    except ChatbotTimeoutError as exc:
        logger.error("ChatbotTimeoutError | request_id: %s", request_id)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=str(exc),
        ) from exc

    except InvalidLLMResponse as exc:
        logger.error("InvalidLLMResponse | request_id: %s", request_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    except LLMGenerationError as exc:
        logger.error("LLMGenerationError | request_id: %s", request_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    except HTTPException:
        raise

    except Exception as exc:
        logger.exception("Unhandled error in chat endpoint | request_id: %s", request_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal server error occurred.",
        ) from exc
