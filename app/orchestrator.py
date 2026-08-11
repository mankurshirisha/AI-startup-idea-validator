"""Enterprise Agent Orchestration Layer.

Decides whether each agent in the multi-agent pipeline needs to execute or can be
skipped by leveraging per-agent TTL caches, existing structured data, and
short-circuit rules for empty data sets.

Log Format (as required):
- [ORCHESTRATOR] Agent Executed | Agent: <name>
- [ORCHESTRATOR] Agent Skipped | Agent: <name> | Reason: <reason>
- [ORCHESTRATOR] Cache Hit | Agent: <name> | Key: <hash>
- [ORCHESTRATOR] Cache Miss | Agent: <name> | Key: <hash>
"""

import hashlib
import json
import threading
from typing import Any, Dict, List, Optional
from cachetools import TTLCache

from app.logging_config import get_logger

logger = get_logger("orchestrator")

# ──────────────────────────────────────────────────────────
# PER-AGENT THREAD-SAFE TTL CACHES (1-Hour TTL, 256 Maxsize)
# ──────────────────────────────────────────────────────────
_WEB_SEARCH_CACHE: TTLCache = TTLCache(maxsize=256, ttl=3600)
_MARKET_OPP_CACHE: TTLCache = TTLCache(maxsize=256, ttl=3600)
_COMPETITOR_CACHE: TTLCache = TTLCache(maxsize=256, ttl=3600)
_COMPARISON_CACHE: TTLCache = TTLCache(maxsize=256, ttl=3600)

_ORCHESTRATOR_LOCK = threading.Lock()


# ──────────────────────────────────────────────────────────
# CACHE KEY GENERATORS
# ──────────────────────────────────────────────────────────
def _hash_key(data: dict) -> str:
    """Generate a stable sha256 hash from a JSON-serializable dict."""
    payload = json.dumps(data, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _make_web_search_key(idea: str, country: str, industry: str) -> str:
    return _hash_key({
        "agent": "web_search",
        "idea": idea.strip().lower(),
        "country": country.strip().lower(),
        "industry": industry.strip().lower(),
    })


def _make_market_opp_key(idea: str, country: str, industry: str, market_size: str, growth_rate: str) -> str:
    return _hash_key({
        "agent": "market_opportunity",
        "idea": idea.strip().lower(),
        "country": country.strip().lower(),
        "industry": industry.strip().lower(),
        "market_size": market_size.strip().lower(),
        "growth_rate": growth_rate.strip().lower(),
    })


def _make_competitor_key(idea: str, country: str, seed_names: List[str]) -> str:
    return _hash_key({
        "agent": "competitor_discovery",
        "idea": idea.strip().lower(),
        "country": country.strip().lower(),
        "seed_names": sorted(str(s).strip().lower() for s in seed_names if s),
    })


def _make_comparison_key(idea: str, country: str, competitor_names: List[str]) -> str:
    return _hash_key({
        "agent": "comparison",
        "idea": idea.strip().lower(),
        "country": country.strip().lower(),
        "competitors": sorted(str(c).strip().lower() for c in competitor_names if c),
    })


# ──────────────────────────────────────────────────────────
# ORCHESTRATED AGENT EXECUTORS
# ──────────────────────────────────────────────────────────

def orchestrate_web_search(
    fn_run_agent,
    idea: str,
    description: str = "",
    industry: str = "",
    target_customer: str = "",
    target_country: str = "Global",
    startup_stage: str = "Idea",
    business_model: str = "B2B",
    key_features: list = None,
) -> dict:
    """Orchestrate Web Search Agent execution with per-agent caching."""
    cache_key = _make_web_search_key(idea, target_country, industry)

    with _ORCHESTRATOR_LOCK:
        cached = _WEB_SEARCH_CACHE.get(cache_key)

    if cached is not None:
        logger.info(
            "[ORCHESTRATOR] Cache Hit | Agent: WebSearch | Key: %s...", cache_key[:12]
        )
        logger.info(
            "[ORCHESTRATOR] Agent Skipped | Agent: WebSearch | Reason: Reusing cached structured web search output"
        )
        return cached

    logger.info(
        "[ORCHESTRATOR] Cache Miss | Agent: WebSearch | Key: %s...", cache_key[:12]
    )
    logger.info("[ORCHESTRATOR] Agent Executed | Agent: WebSearch")

    result = fn_run_agent(
        idea=idea,
        description=description,
        industry=industry,
        target_customer=target_customer,
        target_country=target_country,
        startup_stage=startup_stage,
        business_model=business_model,
        key_features=key_features,
    )

    with _ORCHESTRATOR_LOCK:
        _WEB_SEARCH_CACHE[cache_key] = result

    return result


def orchestrate_market_opportunity(
    fn_run_agent,
    market_request,
) -> dict:
    """Orchestrate Market Opportunity Agent execution with caching."""
    cache_key = _make_market_opp_key(
        market_request.startupIdea,
        market_request.location,
        market_request.industry,
        market_request.marketAnalysis.marketSize or "",
        market_request.marketAnalysis.growthRate or "",
    )

    with _ORCHESTRATOR_LOCK:
        cached = _MARKET_OPP_CACHE.get(cache_key)

    if cached is not None:
        logger.info(
            "[ORCHESTRATOR] Cache Hit | Agent: MarketOpportunity | Key: %s...", cache_key[:12]
        )
        logger.info(
            "[ORCHESTRATOR] Agent Skipped | Agent: MarketOpportunity | Reason: Reusing cached market opportunity analysis"
        )
        return cached

    logger.info(
        "[ORCHESTRATOR] Cache Miss | Agent: MarketOpportunity | Key: %s...", cache_key[:12]
    )
    logger.info("[ORCHESTRATOR] Agent Executed | Agent: MarketOpportunity")

    result = fn_run_agent(market_request)

    with _ORCHESTRATOR_LOCK:
        _MARKET_OPP_CACHE[cache_key] = result

    return result


def orchestrate_competitor_discovery(
    fn_run_agent,
    request,
    web_result: dict,
) -> dict:
    """Orchestrate Competitor Discovery Agent execution with short-circuits & caching."""
    seed_names = web_result.get("real_competitors", []) or []
    cache_key = _make_competitor_key(
        request.startupIdea,
        request.targetCountry or "Global",
        seed_names,
    )

    with _ORCHESTRATOR_LOCK:
        cached = _COMPETITOR_CACHE.get(cache_key)

    if cached is not None:
        logger.info(
            "[ORCHESTRATOR] Cache Hit | Agent: CompetitorDiscovery | Key: %s...", cache_key[:12]
        )
        logger.info(
            "[ORCHESTRATOR] Agent Skipped | Agent: CompetitorDiscovery | Reason: Reusing cached competitor discovery output"
        )
        return cached

    logger.info(
        "[ORCHESTRATOR] Cache Miss | Agent: CompetitorDiscovery | Key: %s...", cache_key[:12]
    )
    logger.info("[ORCHESTRATOR] Agent Executed | Agent: CompetitorDiscovery")

    result = fn_run_agent(request, web_result)

    with _ORCHESTRATOR_LOCK:
        _COMPETITOR_CACHE[cache_key] = result

    return result


def orchestrate_comparison(
    fn_run_agent,
    request,
    web_result: dict,
    competitor_result: dict,
) -> dict:
    """Orchestrate Comparison Agent execution with caching."""
    competitors = competitor_result.get("competitors", []) or []
    comp_names = [c.get("name", "") for c in competitors if isinstance(c, dict) and c.get("name")]

    cache_key = _make_comparison_key(
        request.startupIdea,
        request.targetCountry or "Global",
        comp_names,
    )

    with _ORCHESTRATOR_LOCK:
        cached = _COMPARISON_CACHE.get(cache_key)

    if cached is not None:
        logger.info(
            "[ORCHESTRATOR] Cache Hit | Agent: Comparison | Key: %s...", cache_key[:12]
        )
        logger.info(
            "[ORCHESTRATOR] Agent Skipped | Agent: Comparison | Reason: Reusing cached comparison analysis"
        )
        return cached

    logger.info(
        "[ORCHESTRATOR] Cache Miss | Agent: Comparison | Key: %s...", cache_key[:12]
    )
    logger.info("[ORCHESTRATOR] Agent Executed | Agent: Comparison")

    result = fn_run_agent(request, web_result, competitor_result)

    with _ORCHESTRATOR_LOCK:
        _COMPARISON_CACHE[cache_key] = result

    return result
