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
_WEB_SEARCH_CACHE: TTLCache = TTLCache(maxsize=256, ttl=300)  # 5‑minute TTL per plan
_MARKET_OPP_CACHE: TTLCache = TTLCache(maxsize=256, ttl=300)
_COMPETITOR_CACHE: TTLCache = TTLCache(maxsize=256, ttl=3600)
_COMPARISON_CACHE: TTLCache = TTLCache(maxsize=256, ttl=3600)
_SWOT_RISK_CACHE: TTLCache = TTLCache(maxsize=256, ttl=3600)
_MVP_FEATURE_CACHE: TTLCache = TTLCache(maxsize=256, ttl=3600)

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


def _make_swot_risk_key(idea: str, country: str, industry: str) -> str:
    return _hash_key({
        "agent": "swot_risk",
        "idea": idea.strip().lower(),
        "country": country.strip().lower(),
        "industry": industry.strip().lower(),
    })


def _make_mvp_feature_key(idea: str, country: str, industry: str) -> str:
    return _hash_key({
        "agent": "mvp_feature",
        "idea": idea.strip().lower(),
        "country": country.strip().lower(),
        "industry": industry.strip().lower(),
    })


# In-flight request tracking to deduplicate concurrent requests for the exact same key
_IN_FLIGHT_EVENTS: Dict[str, threading.Event] = {}


def _orchestrate_generic(
    cache: TTLCache,
    cache_key: str,
    agent_name: str,
    fn_run: callable,
    *args,
    **kwargs,
) -> dict:
    """Generic orchestrator wrapper with TTL caching and singleflight in-flight deduplication."""
    with _ORCHESTRATOR_LOCK:
        cached = cache.get(cache_key)
        if cached is not None:
            logger.info(
                "[ORCHESTRATOR] Cache Hit | Agent: %s | Key: %s...", agent_name, cache_key[:12]
            )
            logger.info(
                "[ORCHESTRATOR] Agent Skipped | Agent: %s | Reason: Reusing cached structured output", agent_name
            )
            return cached

        if cache_key in _IN_FLIGHT_EVENTS:
            event = _IN_FLIGHT_EVENTS[cache_key]
            logger.info(
                "[ORCHESTRATOR] In-Flight Execution Detected | Agent: %s | Key: %s... | Waiting for in-flight request to complete",
                agent_name,
                cache_key[:12],
            )
            # Release lock while waiting for the in-flight request
            # so other threads can still access the orchestrator
            pass

    # Handle in-flight wait outside lock block to prevent deadlock
    with _ORCHESTRATOR_LOCK:
        event = _IN_FLIGHT_EVENTS.get(cache_key)

    if event is not None and cache_key in _IN_FLIGHT_EVENTS:
        event.wait(timeout=120)
        with _ORCHESTRATOR_LOCK:
            cached_after = cache.get(cache_key)
        if cached_after is not None:
            logger.info(
                "[ORCHESTRATOR] Agent Skipped | Agent: %s | Reason: Returned result from completed in-flight request",
                agent_name,
            )
            return cached_after

    # Register as the primary executing thread for this cache key
    event = threading.Event()
    with _ORCHESTRATOR_LOCK:
        # Double check cache
        cached = cache.get(cache_key)
        if cached is not None:
            return cached
        _IN_FLIGHT_EVENTS[cache_key] = event
        logger.info(
            "[ORCHESTRATOR] Cache Miss | Agent: %s | Key: %s...", agent_name, cache_key[:12]
        )
        logger.info("[ORCHESTRATOR] Agent Executed | Agent: %s", agent_name)

    try:
        result = fn_run(*args, **kwargs)
        with _ORCHESTRATOR_LOCK:
            cache[cache_key] = result
        return result
    finally:
        with _ORCHESTRATOR_LOCK:
            _IN_FLIGHT_EVENTS.pop(cache_key, None)
            event.set()


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
    """Orchestrate Web Search Agent execution with per-agent caching and singleflight deduplication."""
    cache_key = _make_web_search_key(idea, target_country, industry)
    return _orchestrate_generic(
        _WEB_SEARCH_CACHE,
        cache_key,
        "WebSearch",
        fn_run_agent,
        idea=idea,
        description=description,
        industry=industry,
        target_customer=target_customer,
        target_country=target_country,
        startup_stage=startup_stage,
        business_model=business_model,
        key_features=key_features,
    )


def orchestrate_market_opportunity(
    fn_run_agent,
    market_request,
) -> dict:
    """Orchestrate Market Opportunity Agent execution with caching and singleflight deduplication."""
    cache_key = _make_market_opp_key(
        market_request.startupIdea,
        market_request.location,
        market_request.industry,
        market_request.marketAnalysis.marketSize or "",
        market_request.marketAnalysis.growthRate or "",
    )
    return _orchestrate_generic(
        _MARKET_OPP_CACHE,
        cache_key,
        "MarketOpportunity",
        fn_run_agent,
        market_request,
    )


def orchestrate_competitor_discovery(
    fn_run_agent,
    request,
    web_result: dict,
) -> dict:
    """Orchestrate Competitor Discovery Agent execution with caching and singleflight deduplication."""
    web_result = web_result if isinstance(web_result, dict) else {}
    seed_names = web_result.get("real_competitors", []) or []
    cache_key = _make_competitor_key(
        request.startupIdea,
        request.targetCountry or "Global",
        seed_names,
    )
    return _orchestrate_generic(
        _COMPETITOR_CACHE,
        cache_key,
        "CompetitorDiscovery",
        fn_run_agent,
        request,
        web_result,
    )


def orchestrate_comparison(
    fn_run_agent,
    request,
    web_result: dict,
    competitor_result: dict,
) -> dict:
    """Orchestrate Comparison Agent execution with caching and singleflight deduplication."""
    competitor_result = competitor_result if isinstance(competitor_result, dict) else {}
    competitors = competitor_result.get("competitors", []) or []
    comp_names = [c.get("name", "") for c in competitors if isinstance(c, dict) and c.get("name")]


    cache_key = _make_comparison_key(
        request.startupIdea,
        request.targetCountry or "Global",
        comp_names,
    )
    return _orchestrate_generic(
        _COMPARISON_CACHE,
        cache_key,
        "Comparison",
        fn_run_agent,
        request,
        web_result,
        competitor_result,
    )


def orchestrate_swot_risk(
    fn_run_agent,
    request,
    web_result: dict,
    market_result: dict,
    competitor_result: dict,
) -> dict:
    """Orchestrate SWOT & Risk Analysis Agent execution with caching and singleflight deduplication."""
    web_result = web_result if isinstance(web_result, dict) else {}
    industry = request.industry or web_result.get("industry", "")
    cache_key = _make_swot_risk_key(
        request.startupIdea,
        request.targetCountry or "Global",
        industry,
    )
    return _orchestrate_generic(
        _SWOT_RISK_CACHE,
        cache_key,
        "SwotRisk",
        fn_run_agent,
        request,
        web_result,
        market_result,
        competitor_result,
    )


def orchestrate_mvp_feature(
    fn_run_agent,
    request,
    web_result: dict,
    market_result: dict,
    competitor_result: dict,
    swot_result: dict,
) -> dict:
    """Orchestrate MVP Feature Recommendation Agent execution with caching and singleflight deduplication."""
    web_result = web_result if isinstance(web_result, dict) else {}
    industry = request.industry or web_result.get("industry", "")
    cache_key = _make_mvp_feature_key(
        request.startupIdea,
        request.targetCountry or "Global",
        industry,
    )
    return _orchestrate_generic(
        _MVP_FEATURE_CACHE,
        cache_key,
        "MVPFeature",
        fn_run_agent,
        request,
        web_result,
        market_result,
        competitor_result,
        swot_result,
    )

