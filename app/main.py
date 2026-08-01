from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
    startup_idea: str, web_result: dict
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
    for field_name in CustomerAnalysis.model_fields:
        if field_name == "customerSegments":
            customer_analysis_payload[field_name] = [
                "Students",
                "Job Seekers",
                "Professionals",
            ]
        elif field_name == "customerPainPoints":
            customer_analysis_payload[field_name] = [
                "Limited market visibility",
                "Need for clear differentiation",
                "Need for faster validation",
            ]

    return MarketOpportunityRequest(
    startupIdea=startup_idea,
    industry=web_result.get("industry", ""),
    targetCustomer=["Job Seekers"],
    location="Global",
    startupStage="Idea Stage",
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
    responses={
        200: {
            "description": "Service is running",
            "content": {
                "application/json": {
                    "example": {"message": "AI Startup Idea Validator Running!"}
                }
            },
        }
    },
)
def home():
    """Return a simple availability message.

    Returns:
        dict: A JSON response indicating that the API is running.
    """
    return {"message": "AI Startup Idea Validator Running!"}


# ==========================================================
# COMPLETE STARTUP VALIDATION PIPELINE
# ==========================================================


@app.post(
    "/api/startup-validator",
    summary="Run the full startup validation pipeline",
    description="Runs the complete startup validation workflow across web search, market opportunity, competitor discovery, and comparison analysis.",
    response_description="Combined validation results from all analysis stages",
    responses={
        200: {
            "description": "Validation completed successfully",
            "content": {
                "application/json": {
                    "example": {
                        "status": "success",
                        "web_search": {
                            "market_size": "",
                            "industry": "",
                            "market_trends": [],
                            "real_competitors": [],
                            "confidence_score": "",
                            "verified_sources": [],
                        },
                        "market_opportunity": {
                            "startupIdea": "AI Resume Builder",
                            "industryInsights": {
                                "industry": "",
                                "marketSize": "",
                                "growthRate": "",
                                "trends": [],
                            },
                            "marketOpportunity": {
                                "TAM": "$50 Billion",
                                "SAM": "$8 Billion",
                                "SOM": "$500 Million",
                            },
                            "marketOpportunityScore": 91,
                            "customerInsights": {
                                "targetSegments": [],
                                "keyPainPoints": [],
                                "marketDemand": "High",
                            },
                            "recommendations": [],
                            "sources": [],
                        },
                        "competitor_analysis": {},
                        "comparison": {
                            "status": "success",
                            "startup": "AI Resume Builder",
                            "description": "An AI platform that helps job seekers create tailored resumes and prepare for interviews.",
                            "industry": "",
                            "startup_features": [],
                            "comparison": [],
                            "similarity_scores": [],
                            "market_gaps": [],
                            "business_insights": {
                                "strengths": [],
                                "weaknesses": [],
                                "opportunities": [],
                                "recommendations": [],
                            },
                        },
                    }
                }
            },
        },
        400: {"description": "Invalid request payload"},
        500: {"description": "Internal processing error"},
    },
)
def validate(request: StartupRequest):
    """Run the end-to-end startup validation workflow.

    Args:
        request: The startup idea request payload containing the idea and description.

    Returns:
        dict: A dictionary containing the web search, market opportunity,
            competitor analysis, and comparison results.

    Raises:
        HTTPException: If the request payload is invalid or any downstream step fails.
    """
    logger.info("Startup validation request received")

    # ======================================================
    # STEP 1 - WEB SEARCH
    # ======================================================

    logger.info("Starting web search step")
    web_result = run_web_search_agent(
        request.startupIdea,
        request.description,
    )

    # ======================================================
    # STEP 2 - MARKET OPPORTUNITY
    # ======================================================

    market_request = _build_market_opportunity_request(
        request.startupIdea,
        web_result,
    )

    logger.info("Starting market opportunity step")
    market_result = run_market_opportunity_agent(market_request)

    # ======================================================
    # STEP 3 - COMPETITOR DISCOVERY
    # ======================================================

    logger.info("Starting competitor discovery step")
    competitor_result = run_competitor_discovery_agent(
        startup_idea=request.startupIdea,
        industry_analysis={"industry": web_result.get("industry", "")},
        customer_segments=[
            "Students",
            "Job Seekers",
            "Professionals",
        ],
        market_opportunity=market_result.get(
            "marketOpportunity",
            {},
        ),
        market_opportunity_score=market_result.get(
            "marketOpportunityScore",
            0,
        ),
        recommendations=market_result.get(
            "recommendations",
            [],
        ),
    )

    # ======================================================
    # STEP 4 - COMPARISON
    # ======================================================

    logger.info("Starting comparison step")
    comparison_result = run_comparison_agent(
        startup_idea=request.startupIdea,
        description=request.description,
        industry=web_result.get("industry", ""),
        competitors=competitor_result.get(
            "competitors",
            [],
        ),
    )

    # ======================================================
    # FINAL RESPONSE
    # ======================================================

    return {
        "status": "success",
        "web_search": web_result,
        "market_opportunity": market_result,
        "competitor_analysis": competitor_result,
        "comparison": comparison_result,
    }


# ==========================================================
# INDIVIDUAL AGENT ENDPOINTS
# ==========================================================


@app.post(
    "/api/search-agent",
    summary="Run the web search agent",
    description="Performs the web search analysis step and returns structured market research information.",
    response_description="Structured market research payload",
    responses={
        200: {
            "description": "Web search analysis completed",
            "content": {
                "application/json": {
                    "example": {
                        "market_size": "",
                        "industry": "",
                        "market_trends": [],
                        "real_competitors": [],
                        "confidence_score": "",
                        "verified_sources": [],
                    }
                }
            },
        },
        400: {"description": "Invalid search request"},
        500: {"description": "Search processing error"},
    },
)
def search_agent(request: IdeaRequest):
    """Run the web search analysis agent.

    Args:
        request: The search request containing the startup idea and description.

    Returns:
        dict: The market research payload produced by the web search agent.

    Raises:
        HTTPException: If the input is invalid or the search analysis fails.
    """
    return run_web_search_agent(
        request.idea,
        request.description,
    )


@app.post(
    "/api/market-opportunity-agent",
    summary="Run the market opportunity agent",
    description="Returns a market opportunity summary based on the provided startup and market context.",
    response_description="Market opportunity analysis response",
    responses={
        200: {
            "description": "Market opportunity analysis completed",
            "content": {
                "application/json": {
                    "example": {
                        "startupIdea": "AI Resume Builder",
                        "industryInsights": {
                            "industry": "",
                            "marketSize": "",
                            "growthRate": "",
                            "trends": [],
                        },
                        "marketOpportunity": {
                            "TAM": "$50 Billion",
                            "SAM": "$8 Billion",
                            "SOM": "$500 Million",
                        },
                        "marketOpportunityScore": 91,
                        "customerInsights": {
                            "targetSegments": [],
                            "keyPainPoints": [],
                            "marketDemand": "High",
                        },
                        "recommendations": [],
                        "sources": [],
                    }
                }
            },
        }
    },
)
def market_opportunity_agent(request: MarketOpportunityRequest):
    """Run the market opportunity summarization agent.

    Args:
        request: The market opportunity request payload.

    Returns:
        dict: A structured market opportunity analysis response.
    """
    return run_market_opportunity_agent(request)


@app.post(
    "/api/competitor-agent",
    summary="Run the competitor discovery agent",
    description="Finds and structures competitor information for the supplied startup and industry context.",
    response_description="Competitor discovery analysis response",
    responses={
        200: {
            "description": "Competitor discovery completed",
            "content": {
                "application/json": {
                    "example": {
                        "startupIdea": "AI Resume Builder",
                        "industry": "",
                        "competitors": [
                            {
                                "name": "",
                                "website": "",
                                "description": "",
                                "key_features": [],
                                "target_customers": "",
                                "pricing": "",
                                "source": "",
                            }
                        ],
                    }
                }
            },
        },
        404: {"description": "No competitor information found"},
        500: {"description": "Competitor processing error"},
    },
)
def competitor_agent(request: CompetitorRequest):
    """Run the competitor discovery analysis agent.

    Args:
        request: The competitor discovery request payload.

    Returns:
        dict: The competitor analysis payload returned by the agent.

    Raises:
        HTTPException: If the request is invalid or no competitor data can be found.
    """
    return run_competitor_discovery_agent(
        request.startupIdea,
        request.industryAnalysis,
        request.customerSegments,
        request.marketOpportunity,
        request.marketOpportunityScore,
        request.recommendations,
    )


@app.post(
    "/api/comparison-agent",
    summary="Run the comparison agent",
    description="Compares the startup against competitors and returns structured business insights and recommendations.",
    response_description="Comparison and insight response",
    responses={
        200: {
            "description": "Comparison completed successfully",
            "content": {
                "application/json": {
                    "example": {
                        "status": "success",
                        "startup": "AI Resume Builder",
                        "description": "An AI platform that helps job seekers create tailored resumes and prepare for interviews.",
                        "industry": "",
                        "startup_features": [],
                        "comparison": [],
                        "similarity_scores": [],
                        "market_gaps": [],
                        "business_insights": {
                            "strengths": [],
                            "weaknesses": [],
                            "opportunities": [],
                            "recommendations": [],
                        },
                    }
                }
            },
        },
        400: {"description": "Invalid comparison request"},
        500: {"description": "Comparison processing error"},
    },
)
def comparison_agent(request: ComparisonRequest):
    """Run the final comparison and insight generation agent.

    Args:
        request: The comparison request payload containing the startup and competitors.

    Returns:
        dict: A structured comparison response with business insights.

    Raises:
        HTTPException: If the request is invalid or the comparison workflow fails.
    """
    return run_comparison_agent(
        request.startupIdea,
        request.description,
        request.industry,
        request.competitors,
    )


if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
    )
