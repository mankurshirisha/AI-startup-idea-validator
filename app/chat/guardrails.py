"""Guardrails Module for BetaBuddy Chatbot.

Enforces security and domain scoping:
1. Rejects prompt injection, system prompt requests, roleplay, and jailbreaks.
2. Rejects off-topic domains (politics, religion, medical diagnosis, legal advice, coding, general trivia).
3. Returns polite, standard boundary message when blocked.
"""

import re
from typing import Tuple, Optional
from app.logging_config import get_logger

logger = get_logger("chat.guardrails")

# Injection / Jailbreak patterns
INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|above)\s+(instructions|prompts|rules)",
    r"system\s+prompt",
    r"developer\s+(instructions|prompt|mode)",
    r"roleplay\s+as",
    r"pretend\s+to\s+be",
    r"jailbreak",
    r"bypass\s+rules",
    r"reveal\s+your\s+prompt",
    r"what\s+are\s+your\s+instructions",
    r"act\s+as\s+a",
    r"dan\s+mode",
]

# Off-topic domain patterns
OFF_TOPIC_PATTERNS = [
    r"\b(politics|election|president|democrat|republican|government\s+policy)\b",
    r"\b(god|religion|jesus|bible|quran|buddha|atheism)\b",
    r"\b(diagnose|symptom|prescription|medical\s+advice|cure|treatment)\b",
    r"\b(lawsuit|legal\s+advice|statute|attorney|lawyer|court\s+case)\b",
    r"\b(write\s+code|python\s+script|react\s+component|debug\s+this|html|css)\b",
    r"\b(calculate\s+\d+|math\s+problem|equation|solve\s+for\s+x)\b",
    r"\b(weather\s+in|who\s+is\s+the\s+ceo\s+of|capital\s+of|movie\s+review)\b",
]

POLITE_REJECTION_MSG = (
    "I can help explain your startup validation dashboard, competitors, SWOT, risks, "
    "recommendations, market analysis, and validation results. I can't answer unrelated questions."
)


def check_guardrails(question: str) -> Tuple[bool, Optional[str]]:
    """Check question against security & domain guardrails.

    Returns:
        (is_allowed: bool, rejection_message: Optional[str])
    """
    if not question or not question.strip():
        return False, POLITE_REJECTION_MSG

    q_lower = question.lower().strip()

    # 1. Prompt Injection & Jailbreak Check
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, q_lower):
            logger.warning("Guardrails BLOCKED prompt injection pattern: %s", pattern)
            return False, POLITE_REJECTION_MSG

    # 2. Off-Topic Domain Check
    for pattern in OFF_TOPIC_PATTERNS:
        if re.search(pattern, q_lower):
            logger.info("Guardrails BLOCKED off-topic domain pattern: %s", pattern)
            return False, POLITE_REJECTION_MSG

    return True, None
