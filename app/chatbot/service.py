"""BetaBuddy Service Layer.

Provides clean facade methods for managing session creation, message storage,
and history retrieval.

Strict Phase 2 Scope:
- Infrastructure methods only.
- No AI logic, no Tavily, no Gemini, no RAG, no prompt engineering.
"""

from typing import List, Optional

from app.chatbot.models import ChatMessage
from app.chatbot.session import SessionManager
from app.logging_config import get_logger

logger = get_logger("chatbot.service")

# Global singleton SessionManager instance for the application lifecycle
_SESSION_MANAGER = SessionManager()


class BetaBuddyService:
    """Service layer managing BetaBuddy session infrastructure."""

    def __init__(self, session_manager: Optional[SessionManager] = None):
        self.session_manager = session_manager or _SESSION_MANAGER

    def create_session(self, dashboard_id: Optional[str] = None) -> str:
        """Create a new chatbot session.

        Args:
            dashboard_id: Optional dashboard identifier linked to the session.

        Returns:
            str: Generated session ID string.
        """
        logger.info("BetaBuddyService.create_session called (dashboard_id: '%s')", dashboard_id)
        return self.session_manager.create_session(dashboard_id=dashboard_id)

    def add_message(self, session_id: str, role: str, content: str) -> ChatMessage:
        """Add a user or assistant message to the session history.

        Args:
            session_id: Active session ID.
            role: Sender role ('user' or 'assistant').
            content: Message text content.

        Returns:
            ChatMessage: Created message instance.
        """
        logger.info("BetaBuddyService.add_message called for session '%s' (role: '%s')", session_id, role)
        return self.session_manager.append_message(session_id, role, content)

    def get_history(self, session_id: str) -> List[ChatMessage]:
        """Retrieve recent message history for a session (last 4 exchanges max).

        Args:
            session_id: Active session ID.

        Returns:
            List[ChatMessage]: List of historical message objects.
        """
        logger.info("BetaBuddyService.get_history called for session '%s'", session_id)
        return self.session_manager.get_history(session_id)

    def clear_history(self, session_id: str) -> None:
        """Clear and destroy a session's message history.

        Args:
            session_id: Active session ID to clear.
        """
        logger.info("BetaBuddyService.clear_history called for session '%s'", session_id)
        self.session_manager.clear_session(session_id)
