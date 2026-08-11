"""FastAPI main — optimized pipeline with Stage 3→4 overlap, async SSE, and request cache.

Optimizations applied:
1. Stage 3→4 overlap: comparison starts immediately when competitor finishes,
   overlapping any remaining market-opportunity time.
2. Async SSE generator: non-blocking uvicorn workers under concurrent load.
3. Request-level 5-minute TTL cache: duplicate/retry submissions return in < 10 ms
   with zero Gemini or Tavily API calls.
4. seed_competitor_names: competitor names from Agent 1 (real_competitors[]) are
   forwarded to Agent 3, enabling enrichment instead of re-discovery.
5. All agent function signatures, output shapes, and SSE event payloads are
   UNCHANGED — the frontend receives exactly the same structured data.
"""

import asyncio
import concurrent.futures
import hashlib
import json
import threading
import time
from typing import Optional, Dict, Any

from cachetools import TTLCache

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.logging_config import get_logger
from app.models import StartupRequest, BetaBuddyChatRequest
from app.chat import process_chat_request
from app.chatbot import BetaBuddyService

_chatbot_service = BetaBuddyService()
from app.orchestrator import (
    orchestrate_web_search,
    orchestrate_market_opportunity,
    orchestrate_competitor_discovery,
    orchestrate_comparison,
)
from app.semantic_cache import semantic_cache

try:
    from comparison_agent import ComparisonRequest, run_comparison_agent
    from competitor_discovery_agent import (CompetitorRequest,
                                            run_competitor_discovery_agent)
    from market_opportunity_agent import (CustomerAnalysis, MarketAnalysis,
                                          MarketOpportunityRequest,
                                          run_market_opportunity_agent)
    from web_search_agent import IdeaRequest, run_web_search_agent

except ImportError:
    from comparison_agent import ComparisonRequest, run_comparison_agent
    from competitor_discovery_agent import (
        CompetitorRequest,
        run_competitor_discovery_agent,
    )
    from market_opportunity_agent import (
        CustomerAnalysis,
        MarketAnalysis,
        MarketOpportunityRequest,
        run_market_opportunity_agent,
    )
    from web_search_agent import IdeaRequest, run_web_search_agent


logger = get_logger(__name__)

app = FastAPI(title="AI Startup Idea Validator", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================================
# REQUEST-LEVEL CACHE — 5-MINUTE TTL
# ==========================================================
# Caches the complete pipeline result keyed by a normalised hash of the
# request payload. Any duplicate or retry submission within 5 minutes
# returns instantly with ZERO Gemini or Tavily API calls.
_REQUEST_CACHE: TTLCache = TTLCache(maxsize=100, ttl=300)
_REQUEST_CACHE_LOCK = threading.Lock()


def _make_request_cache_key(request: StartupRequest) -> str:
    """Produce a stable, normalised cache key from the request fields.

    Fields are lower-cased and sorted before hashing so that minor
    formatting differences in the same logical request still hit the cache.
    """
    payload = json.dumps(
        {
            "idea": request.startupIdea.strip().lower(),
            "description": (request.description or "").strip().lower(),
            "industry": (request.industry or "").lower(),
            "customer": (request.targetCustomer or "").lower(),
            "country": (request.targetCountry or "Global").lower(),
            "stage": (request.startupStage or "Idea").lower(),
            "model": (request.businessModel or "B2B").lower(),
            "features": sorted(f.lower() for f in (request.keyFeatures or [])),
        },
        sort_keys=True,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _build_market_opportunity_request(
    request: StartupRequest, web_result: dict
) -> MarketOpportunityRequest:
    market_analysis_payload = {}
    for field_name in MarketAnalysis.model_fields:
        if field_name == "marketSize":
            market_analysis_payload[field_name] = web_result.get(
                "market_size", "Unknown"
            )
        elif field_name == "growthRate":
            market_analysis_payload[field_name] = web_result.get("growth_rate", "High")
        elif field_name == "marketTrends":
            market_analysis_payload[field_name] = web_result.get("market_trends", [])

    customer_analysis_payload = {}
    target_cust_list = [request.targetCustomer] if request.targetCustomer else ["General Consumers"]
    for field_name in CustomerAnalysis.model_fields:
        if field_name == "customerSegments":
            customer_analysis_payload[field_name] = target_cust_list
        elif field_name == "customerPainPoints":
            customer_analysis_payload[field_name] = [
                f"Needs tailored solution for {request.targetCustomer or 'users'}",
                "Efficiency and product-market fit",
            ]

    ind = request.industry if request.industry else web_result.get("industry", "Technology")

    return MarketOpportunityRequest(
        startupIdea=request.startupIdea,
        description=request.description or "",
        industry=ind,
        targetCustomer=target_cust_list,
        location=request.targetCountry or "Global",
        startupStage=request.startupStage or "Idea",
        businessModel=request.businessModel or "B2B",
        keyFeatures=request.keyFeatures or [],
        marketAnalysis=MarketAnalysis(**market_analysis_payload),
        customerAnalysis=CustomerAnalysis(**customer_analysis_payload),
        analysisGoal="Startup Validation",
        analysisDepth="Detailed",
        verifiedSources=web_result.get("verified_sources", []),
    )


def _run_competitor_job(request: StartupRequest, web_result: dict) -> dict:
    """Isolated competitor job for thread pool submission."""
    return run_competitor_discovery_agent(
        startup_idea=request.startupIdea,
        industry_analysis={"industry": request.industry or web_result.get("industry", "")},
        customer_segments=[request.targetCustomer] if request.targetCustomer else ["General Users"],
        market_opportunity={},
        market_opportunity_score=0,
        recommendations=[],
        location=request.targetCountry or "Global",
        business_model=request.businessModel or "B2B",
        target_customer=request.targetCustomer or "",
        key_features=request.keyFeatures or [],
        existing_sources=web_result.get("raw_sources", []),
        # Forward Agent 1's already-identified competitor names so Agent 3
        # enriches known names instead of re-discovering them from scratch.
        seed_competitor_names=web_result.get("real_competitors", []),
    )


def _run_comparison_job(request: StartupRequest, web_result: dict, competitor_result: dict) -> dict:
    """Isolated comparison job for thread pool submission."""
    return run_comparison_agent(
        startup_idea=request.startupIdea,
        description=request.description,
        industry=request.industry or web_result.get("industry", ""),
        competitors=competitor_result.get("competitors", []),
        location=request.targetCountry or "Global",
        business_model=request.businessModel or "B2B",
        target_customer=request.targetCustomer or "",
        key_features=request.keyFeatures or [],
        startup_stage=request.startupStage or "Idea",
    )


@app.get(
    "/",
    summary="Health check",
    description="Returns a simple message confirming that the API service is running.",
    response_description="Service status message",
)
def home():
    return {"message": "AI Startup Idea Validator Running!"}


# ==========================================================
# COMPLETE STARTUP VALIDATION PIPELINE (STAGE 3→4 OVERLAP)
# ==========================================================


@app.post(
    "/api/startup-validator",
    summary="Run the full startup validation pipeline",
    description=(
        "Runs the complete startup validation workflow. "
        "Stage 2 (Market) and Stage 3 (Competitor) run in parallel. "
        "Stage 4 (Comparison) starts as soon as Stage 3 finishes, "
        "overlapping any remaining Stage 2 time."
    ),
    response_description="Combined validation results from all analysis stages",
)
def validate(request: StartupRequest):
    logger.info("Startup validation request received for idea: %s", request.startupIdea)

    # ── Semantic cache check (1-hour TTL, fuzzy token similarity) ─────────────
    semantic_hit = semantic_cache.get(request)
    if semantic_hit is not None:
        return semantic_hit

    # ── Request-level cache check (5-minute TTL) ─────────────────────────────
    # Returns instantly (< 10 ms) with 0 Gemini / 0 Tavily calls on hit.
    cache_key = _make_request_cache_key(request)
    with _REQUEST_CACHE_LOCK:
        cached = _REQUEST_CACHE.get(cache_key)
    if cached is not None:
        logger.info("REQUEST CACHE HIT | idea=%s | returning instantly", request.startupIdea)
        return cached

    pipeline_start = time.perf_counter()

    # ──────────────────────────────────────────────────────
    # STEP 1 — Web Search
    # ──────────────────────────────────────────────────────
    logger.info("Starting web search step")
    t0 = time.perf_counter()
    web_result = orchestrate_web_search(
        run_web_search_agent,
        idea=request.startupIdea,
        description=request.description,
        industry=request.industry or "",
        target_customer=request.targetCustomer or "",
        target_country=request.targetCountry or "Global",
        startup_stage=request.startupStage or "Idea",
        business_model=request.businessModel or "B2B",
        key_features=request.keyFeatures or [],
    )
    logger.info("PIPELINE PROFILE | Web Search Agent | Elapsed: %.3fs", time.perf_counter() - t0)

    market_request = _build_market_opportunity_request(request, web_result)

    # ──────────────────────────────────────────────────────
    # STEP 2 & 3 — PARALLEL: Market Opportunity + Competitor
    # STEP 4 — Comparison starts as soon as Step 3 finishes
    # (no need to wait for Step 2 — comparison only uses competitor data)
    # ──────────────────────────────────────────────────────
    logger.info(
        "Starting parallel execution: Market Opportunity & Competitor Discovery. "
        "Comparison will start immediately after Competitor finishes."
    )
    t_parallel_start = time.perf_counter()

    market_result = None
    competitor_result = None
    comparison_result = None

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        f_market = executor.submit(
            orchestrate_market_opportunity, run_market_opportunity_agent, market_request
        )
        f_competitor = executor.submit(
            orchestrate_competitor_discovery, _run_competitor_job, request, web_result
        )

        # Process futures as they complete — start comparison as soon as
        # competitor finishes, regardless of whether market is done yet.
        comparison_future = None
        for future in concurrent.futures.as_completed([f_market, f_competitor]):
            if future is f_market:
                market_result = future.result()
                logger.info(
                    "PIPELINE PROFILE | Market Opportunity Agent done | Elapsed: %.3fs",
                    time.perf_counter() - t_parallel_start,
                )
            elif future is f_competitor:
                competitor_result = future.result()
                logger.info(
                    "PIPELINE PROFILE | Competitor Discovery Agent done | Elapsed: %.3fs",
                    time.perf_counter() - t_parallel_start,
                )
                # ── Stage 3→4 OVERLAP: start comparison immediately ──
                comparison_future = executor.submit(
                    orchestrate_comparison,
                    _run_comparison_job,
                    request,
                    web_result,
                    competitor_result,
                )
                logger.info("PIPELINE PROFILE | Comparison Agent started (overlapping Market)")

        # Collect comparison result (market_result already collected above)
        if comparison_future is not None:
            comparison_result = comparison_future.result()
        logger.info(
            "PIPELINE PROFILE | Comparison Agent done | Elapsed: %.3fs",
            time.perf_counter() - t_parallel_start,
        )

    logger.info(
        "PIPELINE PROFILE | Full Validation Pipeline Total | Elapsed: %.3fs",
        time.perf_counter() - pipeline_start,
    )

    result = {
        "status": "success",
        "web_search": web_result,
        "market_opportunity": market_result,
        "competitor_analysis": competitor_result,
        "comparison": comparison_result,
    }

    # ── Store in request-level cache & semantic cache ───────────────────
    with _REQUEST_CACHE_LOCK:
        _REQUEST_CACHE[cache_key] = result
    semantic_cache.put(request, result)
    logger.info("REQUEST CACHE STORED | idea=%s", request.startupIdea)

    return result


# ==========================================================
# SSE STREAMING PIPELINE — ASYNC GENERATOR (NON-BLOCKING)
# ==========================================================


@app.post(
    "/api/startup-validator-stream",
    summary="Stream real-time pipeline progress",
    description=(
        "Runs the full validation pipeline with parallel execution for Stage 2 & 3, "
        "and Stage 3→4 overlap. Streams SSE events for each stage. "
        "Uses an async generator to avoid blocking uvicorn workers."
    ),
    response_description="text/event-stream of stage progress and final result",
)
def validate_stream(request: StartupRequest):
    """SSE endpoint — synchronous wrapper that returns an async StreamingResponse."""

    async def _generate():
        # ── Semantic cache check ───────────────────────────────────────────
        semantic_hit = semantic_cache.get(request)
        if semantic_hit is not None:
            yield f"data: {json.dumps({'stage': 'done', 'result': semantic_hit})}\n\n"
            return

        # ── Request-level cache check ──────────────────────────────────────
        # Returns a single `done` event instantly on hit with 0 API calls.
        cache_key = _make_request_cache_key(request)
        with _REQUEST_CACHE_LOCK:
            cached = _REQUEST_CACHE.get(cache_key)
        if cached is not None:
            logger.info(
                "SSE REQUEST CACHE HIT | idea=%s | streaming cached result",
                request.startupIdea,
            )
            yield f"data: {json.dumps({'stage': 'done', 'result': cached})}\n\n"
            return

        loop = asyncio.get_running_loop()
        pipeline_start = time.perf_counter()

        try:
            # ──────────────────────────────────────────────────
            # STAGE 1 — Web Search
            # ──────────────────────────────────────────────────
            yield f"data: {json.dumps({'stage': 'web_search', 'status': 'running'})}\n\n"

            t0 = time.perf_counter()
            web_result = await loop.run_in_executor(
                None,
                lambda: orchestrate_web_search(
                    run_web_search_agent,
                    idea=request.startupIdea,
                    description=request.description,
                    industry=request.industry or "",
                    target_customer=request.targetCustomer or "",
                    target_country=request.targetCountry or "Global",
                    startup_stage=request.startupStage or "Idea",
                    business_model=request.businessModel or "B2B",
                    key_features=request.keyFeatures or [],
                ),
            )
            logger.info(
                "PIPELINE PROFILE | Web Search Agent | Elapsed: %.3fs",
                time.perf_counter() - t0,
            )
            yield f"data: {json.dumps({'stage': 'web_search', 'status': 'done'})}\n\n"

            market_request = _build_market_opportunity_request(request, web_result)

            # ──────────────────────────────────────────────────
            # STAGE 2 & 3 — PARALLEL + STAGE 3→4 OVERLAP
            # ──────────────────────────────────────────────────
            yield f"data: {json.dumps({'stage': 'market_opp', 'status': 'running'})}\n\n"
            yield f"data: {json.dumps({'stage': 'competitor', 'status': 'running'})}\n\n"

            t_parallel_start = time.perf_counter()

            market_result = None
            competitor_result = None
            comparison_result = None

            with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
                f_market = executor.submit(
                    orchestrate_market_opportunity, run_market_opportunity_agent, market_request
                )
                f_competitor = executor.submit(
                    orchestrate_competitor_discovery, _run_competitor_job, request, web_result
                )

                comparison_future = None

                # Poll completed futures; yield SSE events as each finishes.
                pending = {f_market, f_competitor}
                while pending:
                    done, pending = await loop.run_in_executor(
                        None,
                        lambda p=pending: concurrent.futures.wait(
                            p, return_when=concurrent.futures.FIRST_COMPLETED
                        ),
                    )
                    for future in done:
                        if future is f_market:
                            market_result = future.result()
                            logger.info(
                                "PIPELINE PROFILE | Market Opportunity Agent done | Elapsed: %.3fs",
                                time.perf_counter() - t_parallel_start,
                            )
                            yield f"data: {json.dumps({'stage': 'market_opp', 'status': 'done'})}\n\n"

                        elif future is f_competitor:
                            competitor_result = future.result()
                            logger.info(
                                "PIPELINE PROFILE | Competitor Discovery Agent done | Elapsed: %.3fs",
                                time.perf_counter() - t_parallel_start,
                            )
                            yield f"data: {json.dumps({'stage': 'competitor', 'status': 'done'})}\n\n"
                            yield f"data: {json.dumps({'stage': 'comparison', 'status': 'running'})}\n\n"

                            # ── Stage 3→4 OVERLAP: start comparison immediately ──
                            comparison_future = executor.submit(
                                orchestrate_comparison,
                                _run_comparison_job,
                                request,
                                web_result,
                                competitor_result,
                            )
                            logger.info(
                                "PIPELINE PROFILE | Comparison Agent started (overlapping Market)"
                            )
                            pending.add(comparison_future)

                        elif comparison_future is not None and future is comparison_future:
                            comparison_result = future.result()
                            logger.info(
                                "PIPELINE PROFILE | Comparison Agent done | Elapsed: %.3fs",
                                time.perf_counter() - t_parallel_start,
                            )
                            yield f"data: {json.dumps({'stage': 'comparison', 'status': 'done'})}\n\n"

            logger.info(
                "PIPELINE PROFILE | Full Validation Stream Pipeline Total | Elapsed: %.3fs",
                time.perf_counter() - pipeline_start,
            )

            full_result = {
                "status": "success",
                "web_search": web_result,
                "market_opportunity": market_result,
                "competitor_analysis": competitor_result,
                "comparison": comparison_result,
            }

            # ── Store in request-level cache & semantic cache ───────────────────
            with _REQUEST_CACHE_LOCK:
                _REQUEST_CACHE[cache_key] = full_result
            semantic_cache.put(request, full_result)
            logger.info("REQUEST CACHE STORED | idea=%s", request.startupIdea)

            yield f"data: {json.dumps({'stage': 'done', 'result': full_result})}\n\n"

        except Exception as exc:
            logger.exception("SSE validation pipeline error")
            yield f"data: {json.dumps({'stage': 'error', 'detail': str(exc)})}\n\n"

    return StreamingResponse(
        _generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ==========================================================
# INDIVIDUAL AGENT ENDPOINTS (unchanged)
# ==========================================================


@app.post("/api/search-agent")
def search_agent(request: IdeaRequest):
    return run_web_search_agent(
        idea=request.idea,
        description=request.description,
        industry=request.industry,
        target_customer=request.targetCustomer,
        target_country=request.targetCountry,
        startup_stage=request.startupStage,
        business_model=request.businessModel,
        key_features=request.keyFeatures,
    )


@app.post("/api/market-opportunity-agent")
def market_opportunity_agent(request: MarketOpportunityRequest):
    return run_market_opportunity_agent(request)


@app.post("/api/competitor-agent")
def competitor_agent(request: CompetitorRequest):
    return run_competitor_discovery_agent(
        request.startupIdea,
        request.industryAnalysis,
        request.customerSegments,
        request.marketOpportunity,
        request.marketOpportunityScore,
        request.recommendations,
        location=request.location,
        business_model=request.businessModel,
        target_customer=request.targetCustomer,
        key_features=request.keyFeatures,
    )


@app.post("/api/comparison-agent")
def comparison_agent(request: ComparisonRequest):
    return run_comparison_agent(
        request.startupIdea,
        request.description,
        request.industry,
        request.competitors,
        location=request.location,
        business_model=request.businessModel,
        target_customer=request.targetCustomer,
        key_features=request.keyFeatures,
        startup_stage=request.startupStage,
    )


@app.post(
    "/api/betabuddy/chat",
    summary="BetaBuddy AI Companion endpoint",
    description="Answers questions strictly based on the current session's startup validation dashboard.",
    response_description="Structured conversational response from BetaBuddy",
)
def betabuddy_chat(request: BetaBuddyChatRequest):
    return process_chat_request(
        session_id=request.sessionId or "default_session",
        question=request.question,
        validation_result=request.validationResult,
    )


@app.post(
    "/api/chat/session",
    summary="Create a new BetaBuddy chatbot session",
    description="Initializes a new isolated chatbot session ID.",
    response_description="JSON object containing generated session_id",
)
def create_chat_session(payload: Optional[dict] = None):
    dashboard_id = payload.get("dashboard_id") if payload else None
    session_id = _chatbot_service.create_session(dashboard_id=dashboard_id)
    return {"session_id": session_id}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)


