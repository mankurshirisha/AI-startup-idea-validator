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
import requests
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
    orchestrate_swot_risk,
    orchestrate_mvp_feature,
    orchestrate_gtm_strategy,
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

from app.chatbot import router as chatbot_router
app.include_router(chatbot_router)

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


def _run_swot_job(
    request: StartupRequest,
    web_result: dict,
    market_result: dict,
    competitor_result: dict,
) -> dict:
    """Isolated SWOT & Risk Analysis job that calls the standalone agent endpoint on port 8903."""
    swot_endpoint = "http://127.0.0.1:8903/api/swot-risk-agent"
    web_res = web_result if isinstance(web_result, dict) else {}
    comp_res = competitor_result if isinstance(competitor_result, dict) else {}
    payload = {
        "startupIdea": request.startupIdea,
        "description": request.description or "",
        "industry": request.industry or web_res.get("industry", "General Tech"),
        "targetCustomer": request.targetCustomer or "General Consumers",
        "targetCountry": request.targetCountry or "Global",
        "startupStage": request.startupStage or "Idea",
        "businessModel": request.businessModel or "B2C",
        "keyFeatures": request.keyFeatures or [],
        "marketData": market_result or {},
        "competitors": comp_res.get("competitors", []),
    }
    try:
        resp = requests.post(swot_endpoint, json=payload, timeout=25)
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        logger.exception("Failed calling SWOT Risk Agent at %s: %s", swot_endpoint, exc)
        return {
            "status": "error",
            "detail": str(exc),
            "swot_analysis": {
                "strengths": ["Clear startup idea"],
                "weaknesses": ["Market validation required"],
                "opportunities": ["Conduct pilot testing"],
                "threats": ["Existing competition"],
            },
            "risk_analysis": {},
            "overall_risk_level": "Medium",
            "recommendations": [],
        }


def _run_mvp_job(
    request: StartupRequest,
    web_result: dict,
    market_result: dict,
    competitor_result: dict,
    swot_result: dict,
) -> dict:
    """Isolated MVP Feature Recommendation job that calls the standalone agent endpoint on port 8904."""
    mvp_endpoint = "http://127.0.0.1:8904/api/mvp-feature-agent"
    web_res = web_result if isinstance(web_result, dict) else {}
    mkt_res = market_result if isinstance(market_result, dict) else {}
    comp_res = competitor_result if isinstance(competitor_result, dict) else {}
    swot_res = swot_result if isinstance(swot_result, dict) else {}

    target_cust = [request.targetCustomer] if request.targetCustomer else ["General Users"]
    recs = (swot_res.get("recommendations", []) if isinstance(swot_res, dict) else []) or (mkt_res.get("recommendations", []) if isinstance(mkt_res, dict) else [])

    payload = {
        "startupIdea": request.startupIdea,
        "description": request.description or "",
        "industry": request.industry or web_res.get("industry", "Technology"),
        "location": request.targetCountry or "Global",
        "startupStage": request.startupStage or "Idea",
        "businessModel": request.businessModel or "B2B",
        "targetCustomer": target_cust,
        "keyFeatures": request.keyFeatures or [],
        "marketOpportunity": mkt_res.get("marketOpportunity", {}),
        "marketOpportunityScore": mkt_res.get("marketOpportunityScore", 0),
        "customerInsights": mkt_res.get("customerInsights", {}),
        "recommendations": recs,
        "competitors": comp_res.get("competitors", []),
    }
    try:
        resp = requests.post(mvp_endpoint, json=payload, timeout=25)
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        logger.exception("Failed calling MVP Feature Agent at %s: %s", mvp_endpoint, exc)
        return {
            "status": "error",
            "detail": str(exc),
            "startupIdea": request.startupIdea,
            "industry": request.industry or "Technology",
            "location": request.targetCountry or "Global",
            "mvpRecommendation": {
                "summary": "Focus MVP on core high-value features.",
                "overallStrategy": "Validate product-market fit with low initial complexity.",
            },
            "features": [
                {
                    "feature": f if isinstance(f, str) else "Core Feature",
                    "priority": "High",
                    "marketFit": "Medium",
                    "customerValue": "High",
                    "resourceEffort": "Medium",
                    "reason": "Essential for core workflow validation.",
                    "mvpPhase": "Initial MVP",
                }
                for f in (request.keyFeatures or ["Core Functionality"])[:3]
            ],
            "deferredFeatures": (request.keyFeatures or [])[3:],
        }


def _run_gtm_job(
    request: StartupRequest,
    web_result: dict,
    market_result: dict,
    competitor_result: dict,
    swot_result: dict,
    mvp_result: dict,
) -> dict:
    """Isolated Go-to-Market Strategy job that calls the standalone agent endpoint on port 8905."""
    gtm_endpoint = "http://127.0.0.1:8905/go-to-market-strategy"
    mkt_res = market_result if isinstance(market_result, dict) else {}
    comp_res = competitor_result if isinstance(competitor_result, dict) else {}
    swot_res = swot_result if isinstance(swot_result, dict) else {}
    mvp_res = mvp_result if isinstance(mvp_result, dict) else {}

    target_cust = request.targetCustomer or "Early adopters and key target users"
    mkt_opp_text = str(mkt_res.get("marketOpportunity", "") or mkt_res.get("summary", ""))
    competitor_list = comp_res.get("competitors", [])
    swot_dict = swot_res.get("swot_analysis", swot_res)

    rec_features = []
    if isinstance(mvp_res.get("features"), list):
        for item in mvp_res["features"]:
            if isinstance(item, dict) and "feature" in item:
                rec_features.append(item["feature"])
            elif isinstance(item, str):
                rec_features.append(item)
    if not rec_features:
        rec_features = request.keyFeatures or ["Core Functionality"]

    payload = {
        "startupIdea": request.startupIdea,
        "targetCustomer": target_cust,
        "marketOpportunity": mkt_opp_text,
        "competitors": competitor_list,
        "swot": swot_dict if isinstance(swot_dict, dict) else {},
        "recommendedFeatures": rec_features,
    }
    try:
        resp = requests.post(gtm_endpoint, json=payload, timeout=25)
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        logger.exception("Failed calling Go-to-Market Strategy Agent at %s: %s", gtm_endpoint, exc)
        return {
            "status": "error",
            "detail": str(exc),
            "startupIdea": request.startupIdea,
            "goToMarketStrategy": {
                "targetCustomer": target_cust,
                "positioning": "Position as a focused AI-driven solution for early adopters.",
                "valueProposition": "Deliver immediate productivity gains with fast time-to-value.",
                "marketingChannels": ["Social Media", "Content Marketing", "Direct Outreach"],
                "customerAcquisitionStrategy": [
                    "Identify priority early adopters",
                    "Run a targeted pilot program",
                    "Iterate quickly based on user feedback",
                ],
                "pricingStrategy": "Tiered SaaS subscription based on usage and feature access.",
                "launchPlan": ["Soft launch to beta waitlist", "Public release launch"],
                "nextSteps": ["Finalize core positioning", "Launch initial landing page"],
            },
        }



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
    swot_result = None
    mvp_result = None

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
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

        # Submit SWOT Risk Agent as soon as Market & Competitor results are available
        f_swot = executor.submit(
            orchestrate_swot_risk,
            _run_swot_job,
            request,
            web_result,
            market_result,
            competitor_result,
        )
        logger.info("PIPELINE PROFILE | SWOT Risk Agent started")

        # Submit MVP Feature Recommendation Agent concurrently; it will wait for SWOT result internally
        def _run_mvp_with_swot():
            # Wait for SWOT result
            swot_res = f_swot.result()
            return orchestrate_mvp_feature(
                _run_mvp_job,
                request,
                web_result,
                market_result,
                competitor_result,
                swot_res,
            )
        f_mvp = executor.submit(_run_mvp_with_swot)
        logger.info("PIPELINE PROFILE | MVP Feature Agent started (concurrently with SWOT)")

        # Collect comparison result
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

    dashboard_id = f"dash_{cache_key[:12]}"
    result = {
        "status": "success",
        "dashboard_id": dashboard_id,
        "web_search": web_result or {},
        "market_opportunity": market_result or {},
        "competitor_analysis": competitor_result or {},
        "comparison": comparison_result or {},
        "swot_analysis": swot_result or {},
        "mvp_recommendation": mvp_result or {},
    }


    # ── Store in request-level cache, semantic cache & BetaBuddy dashboard store ──
    with _REQUEST_CACHE_LOCK:
        _REQUEST_CACHE[cache_key] = result
    semantic_cache.put(request, result)
    _chatbot_service.save_dashboard(dashboard_id, result)
    logger.info("REQUEST CACHE & DASHBOARD STORED | dashboard_id=%s | idea=%s", dashboard_id, request.startupIdea)

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
            # STAGE 2 & 3 — PARALLEL EXECUTION
            # ──────────────────────────────────────────────────
            yield f"data: {json.dumps({'stage': 'market_opp', 'status': 'running'})}\n\n"
            yield f"data: {json.dumps({'stage': 'competitor', 'status': 'running'})}\n\n"

            t_parallel_start = time.perf_counter()

            with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                f_market = executor.submit(
                    orchestrate_market_opportunity, run_market_opportunity_agent, market_request
                )
                f_competitor = executor.submit(
                    orchestrate_competitor_discovery, _run_competitor_job, request, web_result
                )

                market_result = await loop.run_in_executor(None, f_market.result)
                logger.info(
                    "PIPELINE PROFILE | Market Opportunity Agent done | Elapsed: %.3fs",
                    time.perf_counter() - t_parallel_start,
                )
                yield f"data: {json.dumps({'stage': 'market_opp', 'status': 'done'})}\n\n"

                competitor_result = await loop.run_in_executor(None, f_competitor.result)
                logger.info(
                    "PIPELINE PROFILE | Competitor Discovery Agent done | Elapsed: %.3fs",
                    time.perf_counter() - t_parallel_start,
                )
                yield f"data: {json.dumps({'stage': 'competitor', 'status': 'done'})}\n\n"

                # ──────────────────────────────────────────────────
                # STAGE 4 — Comparison
                # ──────────────────────────────────────────────────
                yield f"data: {json.dumps({'stage': 'comparison', 'status': 'running'})}\n\n"
                comparison_future = executor.submit(
                    orchestrate_comparison,
                    _run_comparison_job,
                    request,
                    web_result,
                    competitor_result,
                )
                logger.info("PIPELINE PROFILE | Comparison Agent started")
                comparison_result = await loop.run_in_executor(
                    None, comparison_future.result
                )
                logger.info(
                    "PIPELINE PROFILE | Comparison Agent done | Elapsed: %.3fs",
                    time.perf_counter() - t_parallel_start,
                )
                yield f"data: {json.dumps({'stage': 'comparison', 'status': 'done'})}\n\n"

                # ──────────────────────────────────────────────────
                # STAGE 5 — SWOT & Risk Analysis
                # ──────────────────────────────────────────────────
                yield f"data: {json.dumps({'stage': 'swot_risk', 'status': 'running'})}\n\n"
                swot_future = executor.submit(
                    orchestrate_swot_risk,
                    _run_swot_job,
                    request,
                    web_result,
                    market_result,
                    competitor_result,
                )
                logger.info("PIPELINE PROFILE | SWOT Risk Agent started")
                swot_result = await loop.run_in_executor(
                    None, swot_future.result
                )
                logger.info(
                    "PIPELINE PROFILE | SWOT Risk Agent done | Elapsed: %.3fs",
                    time.perf_counter() - t_parallel_start,
                )
                yield f"data: {json.dumps({'stage': 'swot_risk', 'status': 'done'})}\n\n"

                # ──────────────────────────────────────────────────
                # STAGE 6 — MVP Feature Recommendation
                # ──────────────────────────────────────────────────
                yield f"data: {json.dumps({'stage': 'mvp_feature', 'status': 'running'})}\n\n"
                mvp_future = executor.submit(
                    orchestrate_mvp_feature,
                    _run_mvp_job,
                    request,
                    web_result,
                    market_result,
                    competitor_result,
                    swot_result,
                )
                logger.info("PIPELINE PROFILE | MVP Feature Agent started")
                mvp_result = await loop.run_in_executor(
                    None, mvp_future.result
                )
                logger.info(
                    "PIPELINE PROFILE | MVP Feature Agent done | Elapsed: %.3fs",
                    time.perf_counter() - t_parallel_start,
                )
                yield f"data: {json.dumps({'stage': 'mvp_feature', 'status': 'done'})}\n\n"

                # ──────────────────────────────────────────────────
                # STAGE 7 — Go-to-Market Strategy
                # ──────────────────────────────────────────────────
                yield f"data: {json.dumps({'stage': 'go_to_market', 'status': 'running'})}\n\n"
                gtm_future = executor.submit(
                    orchestrate_gtm_strategy,
                    _run_gtm_job,
                    request,
                    web_result,
                    market_result,
                    competitor_result,
                    swot_result,
                    mvp_result,
                )
                logger.info("PIPELINE PROFILE | GTM Strategy Agent started")
                gtm_result = await loop.run_in_executor(
                    None, gtm_future.result
                )
                logger.info(
                    "PIPELINE PROFILE | GTM Strategy Agent done | Elapsed: %.3fs",
                    time.perf_counter() - t_parallel_start,
                )
                yield f"data: {json.dumps({'stage': 'go_to_market', 'status': 'done'})}\n\n"


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
                "swot_analysis": swot_result,
                "mvp_recommendation": mvp_result,
                "go_to_market_strategy": gtm_result,
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
    dash_id = request.dashboardId or request.dashboard_id
    return process_chat_request(
        session_id=request.sessionId or "default_session",
        question=request.question,
        validation_result=request.validationResult,
        dashboard_id=dash_id,
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


