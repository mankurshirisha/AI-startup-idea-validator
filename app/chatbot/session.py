"""Thread-Safe Session Manager for BetaBuddy Chatbot.

Maintains in-memory chat session history using TTLCache:
- Max size: 500 active sessions
- TTL: 1 hour (3600 seconds)
- Keeps strictly the last 4 exchanges (up to 8 messages)
- Thread-safe via threading.Lock()
- Session isolation (no cross-user shared memory)
"""

import threading
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional
from cachetools import TTLCache

from app.chatbot.exceptions import SessionExpired
from app.chatbot.models import ChatMessage
from app.logging_config import get_logger

logger = get_logger("chatbot.session")

MAX_SESSIONS = 500
SESSION_TTL_SECONDS = 3600  # 1 hour
MAX_EXCHANGES = 4  # Keep last 4 exchanges (up to 8 messages)


class SessionManager:
    """Thread-safe manager for isolated chatbot sessions."""

    def __init__(self, maxsize: int = MAX_SESSIONS, ttl: int = SESSION_TTL_SECONDS):
        self._cache: TTLCache = TTLCache(maxsize=maxsize, ttl=ttl)
        self._lock = threading.Lock()

    def create_session(self, dashboard_id: Optional[str] = None) -> str:
        """Create a new isolated session ID and initialize session context.

        Args:
            dashboard_id: Optional dashboard identifier linked to the session.

        Returns:
            str: Newly generated unique session ID string.
        """
        session_id = f"sess_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        session_data = {
            "session_id": session_id,
            "dashboard_id": dashboard_id,
            "created_at": now_iso,
            "updated_at": now_iso,
            "messages": [],
        }

        with self._lock:
            self._cache[session_id] = session_data

        logger.info("Created new chatbot session: '%s' (dashboard_id: '%s')", session_id, dashboard_id)
        return session_id

    def get_session(self, session_id: str) -> dict:
        """Retrieve session data for a given session ID.

        Args:
            session_id: Target session identifier.

        Returns:
            dict: Session dictionary payload.

        Raises:
            SessionExpired: If session ID is missing or expired.
        """
        if not session_id:
            raise SessionExpired("Session ID cannot be empty.")

        with self._lock:
            session_data = self._cache.get(session_id)
            if not session_data:
                logger.warning("Attempted access to invalid or expired session: '%s'", session_id)
                raise SessionExpired(f"Session '{session_id}' has expired or does not exist.")
            return session_data

    def append_message(self, session_id: str, role: str, content: str) -> ChatMessage:
        """Append a single message (user or assistant) to session history.

        Caps total retained messages to the last 4 exchanges (8 messages max).
        """
        session = self.get_session(session_id)
        now_iso = datetime.now(timezone.utc).isoformat()

        message_obj = ChatMessage(
            role=role,
            content=content,
            timestamp=now_iso,
        )

        with self._lock:
            messages: List[dict] = session.get("messages", [])
            messages.append(message_obj.model_dump())
            # Retain max 8 messages (4 exchanges * 2)
            session["messages"] = messages[-(MAX_EXCHANGES * 2):]
            session["updated_at"] = now_iso
            self._cache[session_id] = session

        logger.info("Appended '%s' message to session '%s' (history len: %d)", role, session_id, len(session["messages"]))
        return message_obj

    def get_history(self, session_id: str) -> List[ChatMessage]:
        """Retrieve message history for a session (last 4 exchanges max)."""
        session = self.get_session(session_id)
        with self._lock:
            raw_messages = session.get("messages", [])
            return [ChatMessage(**msg) for msg in raw_messages[-(MAX_EXCHANGES * 2):]]

    def clear_session(self, session_id: str) -> None:
        """Explicitly destroy and remove a session from memory."""
        with self._lock:
            if session_id in self._cache:
                del self._cache[session_id]
                logger.info("Cleared chatbot session: '%s'", session_id)
