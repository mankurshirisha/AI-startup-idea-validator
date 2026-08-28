"""Intent Classifier Module for BetaBuddy.

Uses deterministic keyword/rule matching first, followed by lightweight token-overlap
similarity when confidence is low. Zero embedding APIs or vector databases used.
"""

import re
from typing import Tuple, Dict, Set
from app.logging_config import get_logger

logger = get_logger("chat.intent_classifier")

# Deterministic Keyword Maps for Dashboard Intents
INTENT_KEYWORDS: Dict[str, Set[str]] = {
    "summary": {
        "summary", "summarize", "overview", "pitch", "explain report", "executive", "about",
        "synopsis", "recap", "brief"
    },
    "competitors": {
        "competitor", "competitors", "rival", "rivals", "alternative", "alternatives",
        "market players", "who else", "competing", "biggest competitor"
    },
    "market": {
        "market", "tam", "sam", "som", "market size", "growth rate", "growth", "trends",
        "industry", "demand", "market opportunity", "market demand"
    },
    "swot": {
        "swot", "strength", "strengths", "weakness", "weaknesses", "opportunity",
        "opportunities", "threat", "threats"
    },
    "risk": {
        "risk", "risks", "danger", "dangers", "vulnerability", "vulnerabilities",
        "challenges", "pitfalls", "threats"
    },
    "recommendations": {
        "recommendation", "recommendations", "action", "actions", "next steps", "advise",
        "advice", "guidance", "what should i do", "strategic steps"
    },
    "score": {
        "score", "rating", "verdict", "validation score", "points", "grade", "score explanation"
    },
    "sources": {
        "source", "sources", "citation", "citations", "urls", "references", "web search"
    },
    "business_model": {
        "business model", "monetization", "revenue", "pricing", "pricing model", "how it makes money"
    },
    "features": {
        "feature", "features", "value proposition", "offering", "main features", "functionality"
    },
    "comparison": {
        "comparison", "compare", "vs", "versus", "feature gap", "similarity", "differs"
    },
    "general_dashboard": {
        "dashboard", "report", "validation", "analysis", "result", "results"
    }
}


def classify_intent(question: str) -> Tuple[str, float]:
    """Classify user question intent using rule matching & token overlap.

    Returns:
        (intent: str, confidence: float)
    """
    if not question:
        return "general_dashboard", 0.5

    q_clean = re.sub(r"[^\w\s]", " ", question.lower())
    q_tokens = set(q_clean.split())

    best_intent = "general_dashboard"
    max_matches = 0
    max_score = 0.0

    # 1. Deterministic Multi-word & Exact Keyword Matching
    for intent, kw_set in INTENT_KEYWORDS.items():
        for kw in kw_set:
            if " " in kw:
                if kw in q_clean:
                    logger.info("Deterministic multi-word intent hit: %s (%s)", intent, kw)
                    return intent, 0.95
            else:
                if kw in q_tokens:
                    matches = sum(1 for k in kw_set if k in q_tokens or k in q_clean)
                    score = float(matches) / len(kw_set)
                    if matches > max_matches:
                        max_matches = matches
                        max_score = max(score, 0.85)
                        best_intent = intent

    if max_matches > 0:
        logger.info("Rule-based intent match: %s (confidence: %.2f)", best_intent, max_score)
        return best_intent, max_score

    # 2. Token Overlap Similarity Fallback
    for intent, kw_set in INTENT_KEYWORDS.items():
        overlap = len(q_tokens & kw_set)
        if overlap > max_matches:
            max_matches = overlap
            best_intent = intent
            max_score = 0.60

    if max_matches > 0:
        logger.info("Token overlap fallback intent match: %s (confidence: %.2f)", best_intent, max_score)
        return best_intent, max_score

    logger.info("No explicit intent matched; using general_dashboard")
    return "general_dashboard", 0.50
