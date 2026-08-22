"""Session Memory Module for BetaBuddy.

Maintains in-memory conversation history per session ID with active TTL refresh.
Strict Requirements:
- Remembers ONLY the last 4 exchanges (question + answer).
- No summarization.
- No long-term storage or disk writes.
- Thread-safe & self-cleaning TTL.
"""

import threading
import time
from typing import Dict, List, Tuple
from datetime import datetime, timezone
from app.logging_config import get_logger

logger = get_logger("chat.memory")

# In-memory session store: session_id -> { "exchanges": [...], "updated_at": timestamp }
_SESSION_STORE: Dict[str, dict] = {}
_MEMORY_LOCK = threading.Lock()
_SESSION_TTL = 3600  # 1 hour TTL


def get_session_history(session_id: str) -> List[Tuple[str, str]]:
    """Retrieve last 4 exchanges for a session ID, refreshing active TTL."""
    if not session_id:
        return []

    now = time.time()
    now_iso = datetime.now(timezone.utc).isoformat()

    with _MEMORY_LOCK:
        _cleanup_expired_sessions()
        session = _SESSION_STORE.get(session_id)
        if session:
            session["updated_at"] = now
            logger.info("Session Retrieved | session_id: '%s' | timestamp: '%s'", session_id, now_iso)
            logger.info("Session Refreshed | session_id: '%s' | timestamp: '%s'", session_id, now_iso)
            return session.get("exchanges", [])[-4:]
        return []


def add_exchange(session_id: str, question: str, answer: str) -> None:
    """Add a question & answer exchange to session memory (capped at 4)."""
    if not session_id or not question or not answer:
        return

    now = time.time()
    now_iso = datetime.now(timezone.utc).isoformat()

    with _MEMORY_LOCK:
        _cleanup_expired_sessions()
        session = _SESSION_STORE.setdefault(session_id, {"exchanges": [], "updated_at": now})
        exchanges = session["exchanges"]
        exchanges.append((question.strip(), answer.strip()))
        session["exchanges"] = exchanges[-4:]
        session["updated_at"] = now
        logger.info("Session Refreshed | session_id: '%s' | timestamp: '%s'", session_id, now_iso)


def clear_session(session_id: str) -> None:
    """Clear memory for a session ID."""
    if not session_id:
        return
    now_iso = datetime.now(timezone.utc).isoformat()
    with _MEMORY_LOCK:
        if session_id in _SESSION_STORE:
            _SESSION_STORE.pop(session_id, None)
            logger.info("Session Deleted | session_id: '%s' | timestamp: '%s'", session_id, now_iso)


def _cleanup_expired_sessions() -> None:
    """Internal helper to clean up inactive sessions older than 1 hour."""
    now = time.time()
    now_iso = datetime.now(timezone.utc).isoformat()
    expired = [sid for sid, data in _SESSION_STORE.items() if now - data.get("updated_at", 0) > _SESSION_TTL]
    for sid in expired:
        _SESSION_STORE.pop(sid, None)
        logger.info("Session Expired | session_id: '%s' | timestamp: '%s'", sid, now_iso)
