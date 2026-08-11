"""Intent Classifier Module for BetaBuddy Chatbot.

Deterministic, lightweight, zero-cost intent classifier using Python standard library token
and phrase matching.

Intents supported:
- EXECUTIVE_SUMMARY
- VALIDATION_SCORE
- SWOT
- COMPETITORS
- MARKET_OPPORTUNITY
- BUSINESS_RISKS
- RECOMMENDATIONS
- BUSINESS_MODEL
- GENERAL_EXPLANATION
- GREETING
- HELP
- UNKNOWN

Confidence Rules:
- Direct keyword / phrase match: 1.00
- Strong synonym / multi-token match: 0.90
- Weak synonym match: 0.75
- Otherwise: UNKNOWN (0.00)
"""

import re
from dataclasses import dataclass
from typing import Dict, List, Tuple

from app.logging_config import get_logger

logger = get_logger("chatbot.intent_classifier")


@dataclass(frozen=True)
class IntentResult:
    """Immutable result payload for intent classification."""

    intent: str
    confidence: float


# Intent Mapping Dictionaries
DIRECT_KEYWORDS: Dict[str, List[str]] = {
    "GREETING": ["hi", "hello", "hey", "greetings", "good morning", "good afternoon"],
    "HELP": ["help", "what can you do", "commands", "options", "usage"],
    "EXECUTIVE_SUMMARY": [
        "summary",
        "executive summary",
        "summarize report",
        "summarize my report",
        "overview",
        "synopsis",
        "recap",
    ],
    "VALIDATION_SCORE": [
        "validation score",
        "score", "verdict",
        "rating",
        "what is my score",
        "score explanation",
    ],
    "SWOT": [
        "swot",
        "swot analysis",
        "strengths",
        "weaknesses",
        "opportunities",
        "threats",
        "explain swot",
    ],
    "COMPETITORS": [
        "competitor",
        "competitors",
        "rivals",
        "biggest competitor",
        "top competitor",
        "alternatives",
        "competing products",
    ],
    "MARKET_OPPORTUNITY": [
        "market opportunity",
        "market",
        "market size",
        "tam",
        "sam",
        "som",
        "market demand",
        "trends",
    ],
    "BUSINESS_RISKS": [
        "business risks",
        "risks",
        "danger",
        "vulnerabilities",
        "pitfalls",
        "challenges",
    ],
    "RECOMMENDATIONS": [
        "recommendations",
        "recommendation",
        "action plan",
        "next steps",
        "advice",
        "suggestions",
    ],
    "BUSINESS_MODEL": [
        "business model",
        "monetization",
        "pricing",
        "revenue model",
        "how we make money",
    ],
    "GENERAL_EXPLANATION": [
        "explain dashboard",
        "explain my dashboard",
        "explain startup",
        "explain my startup",
        "dashboard overview",
        "explain report",
    ],
}

STRONG_SYNONYMS: Dict[str, List[str]] = {
    "SWOT": ["strength", "weakness", "opportunity", "threat"],
    "COMPETITORS": ["rival", "alternative", "who competes", "market players"],
    "MARKET_OPPORTUNITY": ["market trends", "industry", "customer demand"],
    "BUSINESS_RISKS": ["risk", "hazard", "threats"],
    "RECOMMENDATIONS": ["advise", "suggest", "what should i do"],
    "BUSINESS_MODEL": ["pricing strategy", "revenue", "monetize"],
    "EXECUTIVE_SUMMARY": ["brief", "pitch", "about startup"],
    "VALIDATION_SCORE": ["points", "grade", "validation rating"],
}

WEAK_SYNONYMS: Dict[str, List[str]] = {
    "SWOT": ["pros", "cons", "plus", "minus"],
    "COMPETITORS": ["other apps", "vs", "versus"],
    "MARKET_OPPORTUNITY": ["buyers", "target"],
    "BUSINESS_RISKS": ["problem", "issue"],
    "RECOMMENDATIONS": ["tips", "guidance"],
    "BUSINESS_MODEL": ["cost", "charge"],
    "EXECUTIVE_SUMMARY": ["describe", "details"],
    "GENERAL_EXPLANATION": ["explain", "understand", "show", "tell me"],
}


class IntentClassifier:
    """Lightweight rule-based intent classifier."""

    def classify(self, question: str) -> IntentResult:
        """Classify incoming user question into an intent category.

        Args:
            question: User input query text.

        Returns:
            IntentResult: Immutable intent and confidence score.
        """
        if not question or not question.strip():
            return IntentResult(intent="UNKNOWN", confidence=0.00)

        cleaned = re.sub(r"[^\w\s]", " ", question.lower()).strip()
        tokens = set(cleaned.split())

        # 1. Direct Keyword / Phrase Match (Confidence: 1.00)
        for intent, phrases in DIRECT_KEYWORDS.items():
            for phrase in phrases:
                if phrase == cleaned or (len(phrase.split()) > 1 and phrase in cleaned):
                    logger.info("Direct phrase match hit: '%s' -> %s (1.00)", phrase, intent)
                    return IntentResult(intent=intent, confidence=1.00)
                if phrase in tokens:
                    logger.info("Direct token match hit: '%s' -> %s (1.00)", phrase, intent)
                    return IntentResult(intent=intent, confidence=1.00)

        # 2. Strong Synonym Match (Confidence: 0.90)
        for intent, phrases in STRONG_SYNONYMS.items():
            for phrase in phrases:
                if phrase in cleaned or any(tok in tokens for tok in phrase.split()):
                    logger.info("Strong synonym match hit: '%s' -> %s (0.90)", phrase, intent)
                    return IntentResult(intent=intent, confidence=0.90)

        # 3. Weak Synonym Match (Confidence: 0.75)
        for intent, phrases in WEAK_SYNONYMS.items():
            for phrase in phrases:
                if phrase in cleaned or any(tok in tokens for tok in phrase.split()):
                    logger.info("Weak synonym match hit: '%s' -> %s (0.75)", phrase, intent)
                    return IntentResult(intent=intent, confidence=0.75)

        # Fallback UNKNOWN
        logger.info("No matching intent found for question: '%s'", question[:30])
        return IntentResult(intent="UNKNOWN", confidence=0.00)
