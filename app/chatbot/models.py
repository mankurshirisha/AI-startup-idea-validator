"""Pydantic Data Models for BetaBuddy Chatbot.

Defines schemas for incoming requests, outgoing responses, and session chat messages.
Lightweight data containers with zero business logic.
"""

from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Schema for incoming chatbot message requests."""

    session_id: Optional[str] = Field(
        default=None,
        description="Active session identifier string.",
    )
    message: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="User input question or message text.",
    )
    dashboard_id: Optional[str] = Field(
        default=None,
        description="Associated startup validation dashboard identifier.",
    )


class ChatResponse(BaseModel):
    """Schema for chatbot response output."""

    response: str = Field(
        ...,
        description="Formatted answer text generated for the user.",
    )
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 UTC timestamp of the response.",
    )
    source: Optional[str] = Field(
        default="dashboard",
        description="Origin source of the response content.",
    )
    conversation_id: Optional[str] = Field(
        default=None,
        description="Unique conversation / session identifier.",
    )


class ChatMessage(BaseModel):
    """Schema for a single chat exchange message stored in session history."""

    role: str = Field(
        ...,
        description="Role of the sender ('user' or 'assistant').",
    )
    content: str = Field(
        ...,
        description="Text content of the message.",
    )
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 UTC timestamp when message was created.",
    )
