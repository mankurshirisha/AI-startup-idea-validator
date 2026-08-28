"""Enterprise Guardrails Module for BetaBuddy Chatbot.

Enforces strict domain scoping, prompt injection detection, and infrastructure safety:
- Detects prompt injection and system leak attempts
- Rejects source code, credential, and infrastructure inspection requests
- Filters unrelated general knowledge queries (weather, trivia, tutorials, etc.)
- Ensures zero exceptions are thrown for invalid user inputs (graceful fail-safe)
"""

import re
from dataclasses import dataclass
from typing import List, Set

from app.logging_config import get_logger

logger = get_logger("chatbot.guardrails")


@dataclass(frozen=True)
class GuardrailResult:
    """Immutable result payload for guardrail validation checks."""

    allowed: bool
    reason: str


# Rejection Token / Phrase Lists
PROMPT_INJECTION_PHRASES: List[str] = [
    "ignore previous instructions",
    "ignore all instructions",
    "reveal system prompt",
    "developer prompt",
    "hidden instructions",
    "jailbreak",
    "bypass",
    "pretend you are",
    "act as chatgpt",
    "internal prompt",
    "reveal prompt",
    "system prompt",
    "override rules",
]

SENSITIVE_REQUEST_PHRASES: List[str] = [
    "source code",
    "backend",
    "api key",
    "password",
    "token",
    "secret",
    "database",
    "config",
    "yaml",
    "json file",
    ".env",
    "docker",
    "kubernetes",
]

GENERAL_KNOWLEDGE_PHRASES: List[str] = [
    "weather",
    "joke",
    "movie",
    "capital of france",
    "history",
    "python tutorial",
    "leetcode",
    "openai",
    "chatgpt",
    "news",
]

ALLOWED_DOMAIN_TOKENS: Set[str] = {
    "dashboard",
    "startup",
    "validation",
    "report",
    "competitor",
    "competitors",
    "competition",
    "swot",
    "market",
    "recommendation",
    "recommendations",
    "business model",
    "validation score",
    "score",
    "risks",
    "risk",
    "analysis",
    "idea",
    "hi",
    "hello",
    "help",
    "strengths",
    "weaknesses",
    "opportunities",
    "threats",
    "tam",
    "sam",
    "som",
    "verdict",
    "pitch",
    "summary",
    "overview",
}


class Guardrails:
    """Enterprise guardrail validator for BetaBuddy queries."""

    def detect_prompt_injection(self, question: str) -> bool:
        """Check if question contains prompt injection or system leak attempt."""
        if not question:
            return False
        q_lower = question.lower().strip()
        for phrase in PROMPT_INJECTION_PHRASES:
            if phrase in q_lower:
                logger.warning("Prompt injection detected: '%s'", phrase)
                return True
        return False

    def contains_sensitive_request(self, question: str) -> bool:
        """Check if question asks for sensitive source code, keys, or infrastructure."""
        if not question:
            return False
        q_lower = question.lower().strip()
        for phrase in SENSITIVE_REQUEST_PHRASES:
            if phrase in q_lower:
                logger.warning("Sensitive request detected: '%s'", phrase)
                return True
        return False

    def is_relevant(self, question: str) -> bool:
        """Check if question is relevant to the startup validation dashboard domain."""
        if not question or not question.strip():
            return False
        q_clean = re.sub(r"[^\w\s]", " ", question.lower()).strip()
        tokens = set(q_clean.split())

        # Check explicit rejection list first
        for phrase in GENERAL_KNOWLEDGE_PHRASES:
            if phrase in q_clean:
                logger.info("General knowledge pattern detected: '%s'", phrase)
                return False

        # Check if any allowed domain token or multi-token exists
        for token in ALLOWED_DOMAIN_TOKENS:
            if " " in token:
                if token in q_clean:
                    return True
            elif token in tokens:
                return True

        return False

    def validate(self, question: str) -> GuardrailResult:
        """Run all guardrail checks safely. Never raises exceptions for invalid input.

        Args:
            question: User input question string.

        Returns:
            GuardrailResult: Allowed state and rejection reason string.
        """
        try:
            if not question or not question.strip():
                return GuardrailResult(
                    allowed=False,
                    reason="Question cannot be empty.",
                )

            # 1. Prompt Injection Check
            if self.detect_prompt_injection(question):
                return GuardrailResult(
                    allowed=False,
                    reason="Prompt injection attempt blocked.",
                )

            # 2. Sensitive Infrastructure Check
            if self.contains_sensitive_request(question):
                return GuardrailResult(
                    allowed=False,
                    reason="Request for sensitive system data blocked.",
                )

            # 3. Domain Relevance Check
            if not self.is_relevant(question):
                return GuardrailResult(
                    allowed=False,
                    reason="I can help explain your startup validation dashboard, competitors, SWOT, risks, recommendations, market analysis, and validation results. I can't answer unrelated questions.",
                )

            return GuardrailResult(allowed=True, reason="Allowed")

        except Exception as exc:
            logger.exception("Unexpected error in Guardrails.validate; failing gracefully")
            return GuardrailResult(
                allowed=False,
                reason="Invalid query format.",
            )
