"""Lightweight Local Semantic Cache Module.

Provides semantic similarity matching for startup validation requests without
external vector databases, LLM calls, or paid infrastructure.

Key Features:
- Text Normalization & Stop-Word Filtering
- O(1) Canonical Token Key Lookup
- Jaccard Token Overlap (Threshold: >= 0.85)
- Thread-Safe TTL Storage (1-Hour TTL, 200 Maxsize)
- Audit Logging ([SEMANTIC CACHE] HIT / MISS)
"""

import re
import threading
import time
from typing import Dict, Optional, Set, Tuple
from cachetools import TTLCache

from app.logging_config import get_logger

logger = get_logger("semantic_cache")

# Filler / stop words that don't alter the core startup domain or concept
STOP_WORDS: Set[str] = {
    "a", "an", "the", "for", "with", "and", "or", "in", "of", "to", "on", "at", "by",
    "app", "application", "platform", "system", "tool", "service", "startup", "solution",
    "based", "powered", "driven", "enabled", "smart", "automated", "digital", "online",
    "software", "company", "business", "product", "tech", "technology", "ai", "artificial",
    "intelligence", "ml", "machine", "learning"
}

# ──────────────────────────────────────────────────────────
# NORMALIZATION & TOKEN EXTRACTION
# ──────────────────────────────────────────────────────────

def extract_semantic_tokens(text: str) -> Set[str]:
    """Extract normalized semantic tokens from text, filtering out filler words."""
    if not text:
        return set()
    # Replace punctuation/hyphens with spaces and lowercase
    cleaned = re.sub(r"[^\w\s]", " ", text.lower())
    tokens = cleaned.split()
    # Retain meaningful domain terms
    domain_tokens = {t for t in tokens if t not in STOP_WORDS and len(t) >= 2}
    # If all tokens were filtered (e.g. "AI App"), retain non-stop words >= 2 chars
    if not domain_tokens:
        domain_tokens = {t for t in tokens if len(t) >= 2}
    return domain_tokens


def make_canonical_semantic_key(idea: str, country: str, industry: str) -> str:
    """Produce a canonical key based on sorted domain tokens."""
    tokens = sorted(extract_semantic_tokens(idea))
    country_norm = (country or "Global").strip().lower()
    industry_norm = (industry or "General").strip().lower()
    return f"{country_norm}::{industry_norm}::" + "_".join(tokens)


def compute_jaccard_similarity(set_a: Set[str], set_b: Set[str]) -> float:
    """Compute Jaccard similarity coefficient between two token sets."""
    if not set_a or not set_b:
        return 0.0
    intersection = len(set_a & set_b)
    union = len(set_a | set_b)
    return float(intersection) / float(union) if union > 0 else 0.0


# ──────────────────────────────────────────────────────────
# THREAD-SAFE SEMANTIC CACHE MANAGER
# ──────────────────────────────────────────────────────────

class SemanticCacheManager:
    """Thread-safe local Semantic Cache with canonical and fuzzy matching."""

    def __init__(self, maxsize: int = 200, ttl: int = 3600, threshold: float = 0.85):
        self._cache: TTLCache = TTLCache(maxsize=maxsize, ttl=ttl)
        self._metadata: Dict[str, dict] = {}
        self._lock: threading.Lock = threading.Lock()
        self._threshold: float = threshold

    def get(self, request) -> Optional[dict]:
        """Attempt to find a semantic match for an incoming StartupRequest."""
        idea = request.startupIdea
        country = request.targetCountry or "Global"
        industry = request.industry or ""

        canonical_key = make_canonical_semantic_key(idea, country, industry)
        tokens_incoming = extract_semantic_tokens(idea)

        with self._lock:
            # 1. Tier 1: Fast O(1) Canonical Token Key Match
            cached_result = self._cache.get(canonical_key)
            if cached_result is not None:
                meta = self._metadata.get(canonical_key, {})
                cached_idea = meta.get("idea", idea)
                logger.info(
                    "[SEMANTIC CACHE] HIT (Canonical O(1)) | Incoming: '%s' matched Cached: '%s' (Similarity: 1.00) | Saved: 4 Gemini calls, 1 Tavily call",
                    idea,
                    cached_idea,
                )
                return cached_result

            # 2. Tier 2: Fuzzy Jaccard Overlap Match for same country & industry
            country_norm = country.strip().lower()
            industry_norm = industry.strip().lower()

            best_match_key: Optional[str] = None
            best_similarity: float = 0.0
            best_cached_idea: str = ""

            for key, meta in list(self._metadata.items()):
                if meta.get("country") == country_norm and meta.get("industry") == industry_norm:
                    cached_tokens = meta.get("tokens", set())
                    sim = compute_jaccard_similarity(tokens_incoming, cached_tokens)
                    if sim > best_similarity:
                        best_similarity = sim
                        best_match_key = key
                        best_cached_idea = meta.get("idea", "")

            if best_match_key and best_similarity >= self._threshold:
                cached_result = self._cache.get(best_match_key)
                if cached_result is not None:
                    logger.info(
                        "[SEMANTIC CACHE] HIT (Fuzzy Jaccard) | Incoming: '%s' matched Cached: '%s' (Similarity: %.2f >= %.2f) | Saved: 4 Gemini calls, 1 Tavily call",
                        idea,
                        best_cached_idea,
                        best_similarity,
                        self._threshold,
                    )
                    return cached_result

            logger.info(
                "[SEMANTIC CACHE] MISS | Incoming: '%s' | Canonical Key: %s",
                idea,
                canonical_key,
            )
            return None

    def put(self, request, result: dict) -> None:
        """Store a full validation result under its semantic canonical key."""
        idea = request.startupIdea
        country = request.targetCountry or "Global"
        industry = request.industry or ""

        canonical_key = make_canonical_semantic_key(idea, country, industry)
        tokens = extract_semantic_tokens(idea)

        with self._lock:
            self._cache[canonical_key] = result
            self._metadata[canonical_key] = {
                "idea": idea,
                "country": country.strip().lower(),
                "industry": industry.strip().lower(),
                "tokens": tokens,
                "created_at": time.time(),
            }
            logger.info(
                "[SEMANTIC CACHE] STORED | Idea: '%s' | Key: %s", idea, canonical_key
            )


# Singleton Semantic Cache Manager
semantic_cache = SemanticCacheManager()
