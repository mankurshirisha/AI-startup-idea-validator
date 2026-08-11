"""Session Memory Module for BetaBuddy.

Maintains in-memory conversation history per session ID.
Strict Requirements:
- Remembers ONLY the last 4 exchanges (question + answer).
- No summarization.
- No long-term storage or disk writes.
- Thread-safe & self-cleaning TTL.
"""

import threading
import time
from typing import Dict, List, Tuple
from app.logging_config import get_logger

logger = get_logger("chat.memory")

# In-memory session store: session_id -> { "exchanges": [...], "updated_at": timestamp }
_SESSION_STORE: Dict[str, dict] = {}
_MEMORY_LOCK = threading.Lock()
_SESSION_TTL = 3600  # 1 hour TTL


def get_session_history(session_id: str) -> List[Tuple[str, str]]:
    """Retrieve last 4 exchanges for a session ID.

    Returns:
        list of (user_question, assistant_answer) tuples.
    """
    if not session_id:
        return []

    with _MEMORY_LOCK:
        _cleanup_expired_sessions()
        session = _SESSION_STORE.get(session_id)
        if session:
            return session.get("exchanges", [])[-4:]
        return []


def add_exchange(session_id: str, question: str, answer: str) -> None:
    """Add a question & answer exchange to session memory (capped at 4)."""
    if not session_id or not question or not answer:
        return

    with _MEMORY_LOCK:
        _cleanup_expired_sessions()
        session = _SESSION_STORE.setdefault(session_id, {"exchanges": [], "updated_at": time.time()})
        exchanges = session["exchanges"]
        exchanges.append((question.strip(), answer.strip()))
        # Cap at last 4 exchanges
        session["exchanges"] = exchanges[-4:]
        session["updated_at"] = time.time()
        logger.info("Updated session memory for '%s' (exchanges: %d)", session_id, len(session["exchanges"]))


def clear_session(session_id: str) -> None:
    """Clear memory for a session ID."""
    if not session_id:
        return
    with _MEMORY_LOCK:
        _SESSION_STORE.pop(session_id, None)


def _cleanup_expired_sessions() -> None:
    """Internal helper to clean up inactive sessions older than 1 hour."""
    now = time.time()
    expired = [sid for sid, data in _SESSION_STORE.items() if now - data.get("updated_at", 0) > _SESSION_TTL]
    for sid in expired:
        _SESSION_STORE.pop(sid, None)
    if expired:
        logger.info("Cleaned up %d expired chat sessions", len(expired))
