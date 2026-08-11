"""Custom Exceptions Module for BetaBuddy Chatbot.

Defines domain-specific exception classes for error handling across session management,
guardrail checks, dashboard context, and request validation.
"""


class ChatbotError(Exception):
    """Base exception class for all chatbot-related errors."""

    def __init__(self, message: str = "An unexpected chatbot error occurred"):
        self.message = message
        super().__init__(self.message)


class InvalidQuestion(ChatbotError):
    """Raised when an incoming user question is malformed, empty, or unprocessable."""

    def __init__(self, message: str = "Invalid or empty question provided"):
        super().__init__(message)


class SessionExpired(ChatbotError):
    """Raised when a requested chatbot session ID has expired or does not exist."""

    def __init__(self, message: str = "Chatbot session has expired or is invalid"):
        super().__init__(message)


class DashboardNotFound(ChatbotError):
    """Raised when the requested dashboard data or ID cannot be located."""

    def __init__(self, message: str = "Startup validation dashboard data not found"):
        super().__init__(message)


class GuardrailViolation(ChatbotError):
    """Raised when a user prompt violates security, safety, or domain guardrails."""

    def __init__(self, message: str = "Prompt violates safety or domain guardrails"):
        super().__init__(message)
