"""BetaBuddy Service Layer.

Provides clean facade methods for managing session creation, message storage,
history retrieval, and in-memory dashboard result persistence with bounded TTL caching.
"""

import threading
from typing import List, Optional
from cachetools import TTLCache

from app.chatbot.models import ChatMessage
from app.chatbot.session import SessionManager
from app.logging_config import get_logger

logger = get_logger("chatbot.service")

# Global singleton SessionManager instance for the application lifecycle
_SESSION_MANAGER = SessionManager()

# Bounded thread-safe in-memory dashboard result store (maxsize=500, ttl=1 hour)
_DASHBOARD_STORE: TTLCache = TTLCache(maxsize=500, ttl=3600)
_DASHBOARD_LOCK = threading.Lock()


class BetaBuddyService:
    """Service layer managing BetaBuddy session and dashboard infrastructure."""

    def __init__(self, session_manager: Optional[SessionManager] = None):
        self.session_manager = session_manager or _SESSION_MANAGER

    def save_dashboard(self, dashboard_id: str, validation_result: dict) -> None:
        """Store dashboard validation result in memory.

        Args:
            dashboard_id: Dashboard identifier string.
            validation_result: Complete validation result payload dictionary.
        """
        if dashboard_id and validation_result:
            with _DASHBOARD_LOCK:
                _DASHBOARD_STORE[dashboard_id] = validation_result
            logger.info("Saved dashboard result in memory (dashboard_id: '%s')", dashboard_id)

    def get_dashboard(self, dashboard_id: str) -> Optional[dict]:
        """Retrieve stored in-memory dashboard result by dashboard_id.

        Args:
            dashboard_id: Dashboard identifier string.

        Returns:
            Optional[dict]: Validation result dictionary if present, else None.
        """
        if not dashboard_id:
            return None
        with _DASHBOARD_LOCK:
            res = _DASHBOARD_STORE.get(dashboard_id)
            if res:
                logger.info("Retrieved stored dashboard result (dashboard_id: '%s')", dashboard_id)
            return res

    def create_session(self, dashboard_id: Optional[str] = None) -> str:
        """Create a new chatbot session linked to a dashboard_id."""
        logger.info("BetaBuddyService.create_session called (dashboard_id: '%s')", dashboard_id)
        return self.session_manager.create_session(dashboard_id=dashboard_id)

    def add_message(self, session_id: str, role: str, content: str) -> ChatMessage:
        """Add a user or assistant message to the session history."""
        logger.info("BetaBuddyService.add_message called for session '%s' (role: '%s')", session_id, role)
        return self.session_manager.append_message(session_id, role, content)

    def get_history(self, session_id: str) -> List[ChatMessage]:
        """Retrieve recent message history for a session (last 4 exchanges max)."""
        logger.info("BetaBuddyService.get_history called for session '%s'", session_id)
        return self.session_manager.get_history(session_id)

    def clear_history(self, session_id: str) -> None:
        """Clear and destroy a session's message history."""
        logger.info("BetaBuddyService.clear_history called for session '%s'", session_id)
        self.session_manager.clear_session(session_id)
