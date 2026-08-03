import asyncio
import concurrent.futures
import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.logging_config import get_logger
from app.models import StartupRequest

try:
    from comparison_agent import ComparisonRequest, run_comparison_agent
    from competitor_discovery_agent import (CompetitorRequest,
                                            run_competitor_discovery_agent)
    from market_opportunity_agent import (CustomerAnalysis, MarketAnalysis,
                                          MarketOpportunityRequest,
                                          run_market_opportunity_agent)
    from web_search_agent import IdeaRequest, run_web_search_agent

except ImportError:
    from ..comparison_agent import ComparisonRequest, run_comparison_agent
    from ..competitor_discovery_agent import (CompetitorRequest,
                                              run_competitor_discovery_agent)
    from ..market_opportunity_agent import (CustomerAnalysis, MarketAnalysis,
                                            MarketOpportunityRequest,
                                            run_market_opportunity_agent)
    from ..web_search_agent import IdeaRequest, run_web_search_agent


logger = get_logger(__name__)

app = FastAPI(title="AI Startup Idea Validator", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.get(
    "/",
    summary="Health check",
    description="Returns a simple message confirming that the API service is running.",
    response_description="Service status message",
)
def home():
    return {"message": "AI Startup Idea Validator Running!"}


# ==========================================================
# COMPLETE STARTUP VALIDATION PIPELINE (OPTIMIZED PARALLEL)
# ==========================================================


@app.post(
    "/api/startup-validator",
    summary="Run the full startup validation pipeline",
    description="Runs the complete startup validation workflow with parallel market opportunity and competitor discovery execution.",
    response_description="Combined validation results from all analysis stages",
)
def validate(request: StartupRequest):
    logger.info("Startup validation request received for idea: %s", request.startupIdea)

    # ──────────────────────────────────────────────────────
    # STEP 1 - WEB SEARCH
    # ──────────────────────────────────────────────────────
    logger.info("Starting web search step")
    web_result = run_web_search_agent(
        idea=request.startupIdea,
        description=request.description,
        industry=request.industry or "",
        target_customer=request.targetCustomer or "",
        target_country=request.targetCountry or "Global",
        startup_stage=request.startupStage or "Idea",
        business_model=request.businessModel or "B2B",
        key_features=request.keyFeatures or [],
    )

    # ──────────────────────────────────────────────────────
    # STEP 2 & STEP 3 - PARALLEL EXECUTION (Market Opp & Competitors)
    # ──────────────────────────────────────────────────────
    market_request = _build_market_opportunity_request(request, web_result)
    logger.info("Starting parallel execution for Market Opportunity & Competitor Discovery")

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        future_market = executor.submit(run_market_opportunity_agent, market_request)
        future_competitor = executor.submit(
            run_competitor_discovery_agent,
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
        )

        market_result = future_market.result()
        competitor_result = future_competitor.result()

    # ──────────────────────────────────────────────────────
    # STEP 4 - COMPARISON
    # ──────────────────────────────────────────────────────
    logger.info("Starting comparison step")
    comparison_result = run_comparison_agent(
        startup_idea=request.startupIdea,
        description=request.description,
        industry=request.industry or web_result.get("industry", ""),
        competitors=competitor_result.get("competitors", []),
        location=request.targetCountry or "Global",
        business_model=request.businessModel or "B2B",
        target_customer=request.targetCustomer or "",
        key_features=request.keyFeatures or [],
    )

    return {
        "status": "success",
        "web_search": web_result,
        "market_opportunity": market_result,
        "competitor_analysis": competitor_result,
        "comparison": comparison_result,
    }


# ==========================================================
# SSE STREAMING PIPELINE (OPTIMIZED PARALLEL STREAMING)
# ==========================================================


@app.post(
    "/api/startup-validator-stream",
    summary="Stream real-time pipeline progress",
    description="Runs the full validation pipeline with parallel execution for Stage 2 & 3, streaming SSE events for each stage.",
    response_description="text/event-stream of stage progress and final result",
)
def validate_stream(request: StartupRequest):
    def _generate():
        try:
            # ──────────────────────────────────────────────────
            # STAGE 1 — Web Search
            # ──────────────────────────────────────────────────
            yield f"data: {json.dumps({'stage': 'web_search', 'status': 'running'})}\n\n"
            web_result = run_web_search_agent(
                idea=request.startupIdea,
                description=request.description,
                industry=request.industry or "",
                target_customer=request.targetCustomer or "",
                target_country=request.targetCountry or "Global",
                startup_stage=request.startupStage or "Idea",
                business_model=request.businessModel or "B2B",
                key_features=request.keyFeatures or [],
            )
            yield f"data: {json.dumps({'stage': 'web_search', 'status': 'done'})}\n\n"

            # ──────────────────────────────────────────────────
            # STAGE 2 & STAGE 3 — PARALLEL EXECUTION
            # ──────────────────────────────────────────────────
            yield f"data: {json.dumps({'stage': 'market_opp', 'status': 'running'})}\n\n"
            yield f"data: {json.dumps({'stage': 'competitor', 'status': 'running'})}\n\n"

            market_request = _build_market_opportunity_request(request, web_result)

            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                future_market = executor.submit(run_market_opportunity_agent, market_request)
                future_competitor = executor.submit(
                    run_competitor_discovery_agent,
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
                )

                # Wait for both parallel agents to complete
                market_result = future_market.result()
                yield f"data: {json.dumps({'stage': 'market_opp', 'status': 'done'})}\n\n"

                competitor_result = future_competitor.result()
                yield f"data: {json.dumps({'stage': 'competitor', 'status': 'done'})}\n\n"

            # ──────────────────────────────────────────────────
            # STAGE 4 — Comparison Agent
            # ──────────────────────────────────────────────────
            yield f"data: {json.dumps({'stage': 'comparison', 'status': 'running'})}\n\n"
            comparison_result = run_comparison_agent(
                startup_idea=request.startupIdea,
                description=request.description,
                industry=request.industry or web_result.get("industry", ""),
                competitors=competitor_result.get("competitors", []),
                location=request.targetCountry or "Global",
                business_model=request.businessModel or "B2B",
                target_customer=request.targetCustomer or "",
                key_features=request.keyFeatures or [],
            )
            yield f"data: {json.dumps({'stage': 'comparison', 'status': 'done'})}\n\n"

            # All stages complete — emit full result payload
            full_result = {
                "status": "success",
                "web_search": web_result,
                "market_opportunity": market_result,
                "competitor_analysis": competitor_result,
                "comparison": comparison_result,
            }

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
# INDIVIDUAL AGENT ENDPOINTS
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
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
