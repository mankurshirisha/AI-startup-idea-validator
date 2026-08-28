"""Thread-Safe Session Manager for BetaBuddy Chatbot.

Maintains in-memory chat session history with dynamic activity TTL refresh:
- Max size: 500 active sessions
- TTL: 1 hour (3600 seconds), dynamically refreshed on user activity
- Automatic transparent session healing on server restarts
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
    """Thread-safe manager for isolated chatbot sessions with active TTL refresh and transparent healing."""

    def __init__(self, maxsize: int = MAX_SESSIONS, ttl: int = SESSION_TTL_SECONDS):
        self._cache: TTLCache = TTLCache(maxsize=maxsize, ttl=ttl)
        self._lock = threading.Lock()

    def create_session(self, session_id: Optional[str] = None, dashboard_id: Optional[str] = None) -> str:
        """Create or re-initialize an isolated session context.

        Args:
            session_id: Optional existing session identifier to assign.
            dashboard_id: Optional dashboard identifier linked to the session.

        Returns:
            str: Session ID string.
        """
        sid = session_id.strip() if session_id and session_id.strip() else f"sess_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        session_data = {
            "session_id": sid,
            "dashboard_id": dashboard_id,
            "created_at": now_iso,
            "updated_at": now_iso,
            "messages": [],
        }

        with self._lock:
            self._cache[sid] = session_data

        logger.info("Session Created | session_id: '%s' | timestamp: '%s'", sid, now_iso)
        return sid

    def get_session(self, session_id: str, auto_heal: bool = True) -> dict:
        """Retrieve session data for a given session ID, dynamically refreshing TTL.

        Args:
            session_id: Target session identifier.
            auto_heal: If True, transparently re-initializes missing/expired session IDs.

        Returns:
            dict: Session dictionary payload.

        Raises:
            SessionExpired: If session ID is empty or expired when auto_heal is False.
        """
        if not session_id or not session_id.strip():
            logger.warning("Session Expired | session_id: 'EMPTY' | timestamp: '%s'", datetime.now(timezone.utc).isoformat())
            raise SessionExpired("Session ID cannot be empty.")

        sid = session_id.strip()
        now_iso = datetime.now(timezone.utc).isoformat()

        with self._lock:
            session_data = self._cache.get(sid)

            if session_data:
                # Refresh timestamp & re-set in TTLCache to reset cachetools TTL timer
                session_data["updated_at"] = now_iso
                self._cache[sid] = session_data
                logger.info("Session Retrieved | session_id: '%s' | timestamp: '%s'", sid, now_iso)
                logger.info("Session Refreshed | session_id: '%s' | timestamp: '%s'", sid, now_iso)
                return session_data

            # Session expired or missing from cache (e.g. after server restart)
            logger.info("Session Expired | session_id: '%s' | timestamp: '%s'", sid, now_iso)

            if auto_heal:
                # Transparently re-create session context for smooth UX
                new_data = {
                    "session_id": sid,
                    "dashboard_id": None,
                    "created_at": now_iso,
                    "updated_at": now_iso,
                    "messages": [],
                }
                self._cache[sid] = new_data
                logger.info("Session Recreated | session_id: '%s' | timestamp: '%s'", sid, now_iso)
                return new_data

            raise SessionExpired(f"Session '{sid}' has expired or does not exist.")

    def append_message(self, session_id: str, role: str, content: str) -> ChatMessage:
        """Append a single message (user or assistant) to session history.

        Caps total retained messages to the last 4 exchanges (8 messages max).
        """
        session = self.get_session(session_id, auto_heal=True)
        now_iso = datetime.now(timezone.utc).isoformat()

        message_obj = ChatMessage(
            role=role,
            content=content,
            timestamp=now_iso,
        )

        sid = session.get("session_id") or (session_id.strip() if session_id else "")
        with self._lock:
            messages: List[dict] = session.get("messages", [])
            messages.append(message_obj.model_dump())
            # Retain max 8 messages (4 exchanges * 2)
            session["messages"] = messages[-(MAX_EXCHANGES * 2):]
            session["updated_at"] = now_iso
            # Re-set in cache to refresh TTL clock
            self._cache[sid] = session

        logger.info("Session Refreshed | session_id: '%s' | timestamp: '%s'", sid, now_iso)
        return message_obj

    def get_history(self, session_id: str) -> List[ChatMessage]:
        """Retrieve message history for a session (last 4 exchanges max)."""
        session = self.get_session(session_id, auto_heal=True)
        with self._lock:
            raw_messages = session.get("messages", [])
            return [ChatMessage(**msg) for msg in raw_messages[-(MAX_EXCHANGES * 2):]]

    def clear_session(self, session_id: str) -> None:
        """Explicitly destroy and remove a session from memory."""
        if not session_id or not session_id.strip():
            return
        sid = session_id.strip()
        now_iso = datetime.now(timezone.utc).isoformat()
        with self._lock:
            if sid in self._cache:
                del self._cache[sid]
                logger.info("Session Deleted | session_id: '%s' | timestamp: '%s'", session_id, now_iso)
