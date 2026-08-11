import json
from typing import List

from fastapi import FastAPI
from pydantic import BaseModel

from app.gemini_client import generate_content
from app.logging_config import get_logger

logger = get_logger(__name__)

app = FastAPI(title="Market Opportunity Agent", version="1.0")

# -----------------------------
# Input Models
# -----------------------------


class MarketAnalysis(BaseModel):
    marketSize: str
    growthRate: str
    marketTrends: List[str]


class CustomerAnalysis(BaseModel):
    customerSegments: List[str]
    customerPainPoints: List[str]


class MarketOpportunityRequest(BaseModel):
    startupIdea: str
    description: str = ""
    industry: str = ""
    targetCustomer: List[str] = []
    location: str = "Global"
    startupStage: str = "Idea"
    businessModel: str = "B2B"
    keyFeatures: List[str] = []
    marketAnalysis: MarketAnalysis
    customerAnalysis: CustomerAnalysis
    analysisGoal: str = "Startup Validation"
    analysisDepth: str = "Detailed"
    verifiedSources: List[str] = []


# -----------------------------
# Home API
# -----------------------------


@app.get("/")
def home():
    return {"message": "Market Opportunity Agent is Running Successfully!"}


# -----------------------------
# Dynamic Analysis & Scoring via Gemini
# -----------------------------

_MARKET_OPP_PROMPT_TEMPLATE = """\
Analyze market opportunity for this startup:
Startup: {startup_idea} | {description}
Industry: {industry} | Region: {location} | Target: {target_customers} | Model: {business_model} | Stage: {startup_stage} | Features: {key_features}

Market Context:
Size: {market_size} | Growth: {growth_rate} | Trends: {market_trends}
Segments: {customer_segments} | Pain Points: {customer_pain_points}

Currency Rule: Use local currency for {location} (India: ₹/Crores, USA: $/Billions, UK: £, Europe: €, Japan: ¥, Australia: AUD $, Canada: CAD $).

Return ONLY valid JSON (no markdown/fences) matching this exact schema:
{{
  "marketOpportunity": {{
    "TAM": "<total market size in local currency>",
    "SAM": "<serviceable reachable market in local currency>",
    "SOM": "<obtainable market capture in local currency>"
  }},
  "marketOpportunityScore": 75,  // 0-100 overall integer score based on innovation, demand, competition, scalability, feasibility & viability
  "scoreExplanation": "<2-3 concise sentences explaining score for {location} and {business_model}>",
  "customerInsights": {{
    "targetSegments": ["<segment 1>", "<segment 2>"],
    "keyPainPoints": ["<pain point 1>", "<pain point 2>"],
    "marketDemand": "<High | Moderate | Growing | Emerging>"
  }},
  "recommendations": [
    "<action 1 in {location}>",
    "<action 2>",
    "<action 3>",
    "<action 4>"
  ]
}}
"""


def run_market_opportunity_agent(request: MarketOpportunityRequest) -> dict:
    """Return a market opportunity response with AI-generated, localized analysis and validation score.

    Args:
        request: The market opportunity request payload.

    Returns:
        dict: A structured market opportunity response with a dynamic score and currency context.
    """
    logger.info("Market opportunity request received for location: %s", request.location)

    prompt = _MARKET_OPP_PROMPT_TEMPLATE.format(
        startup_idea=request.startupIdea,
        description=request.description or request.startupIdea,
        industry=request.industry,
        target_customers=", ".join(request.targetCustomer) if request.targetCustomer else "General consumers",
        location=request.location or "Global",
        startup_stage=request.startupStage or "Idea",
        business_model=request.businessModel or "B2B",
        key_features=", ".join(request.keyFeatures) if request.keyFeatures else "Standard product features",
        market_size=request.marketAnalysis.marketSize or "N/A",
        growth_rate=request.marketAnalysis.growthRate or "High",
        market_trends=", ".join(request.marketAnalysis.marketTrends) or "Not specified",
        customer_segments=", ".join(request.customerAnalysis.customerSegments) or "Primary users",
        customer_pain_points=", ".join(request.customerAnalysis.customerPainPoints) or "Cost & efficiency",
    )

    # Defaults in case of fallback
    score = 75
    explanation = f"Evaluated based on market signals for {request.industry} in {request.location}."
    tam_sam_som = {"TAM": "N/A", "SAM": "N/A", "SOM": "N/A"}
    cust_insights = {
        "targetSegments": request.customerAnalysis.customerSegments or ["Target Users"],
        "keyPainPoints": request.customerAnalysis.customerPainPoints or ["Efficiency", "Cost"],
        "marketDemand": "High",
    }
    recommendations = [
        f"Focus on initial customer acquisition in {request.location}.",
        f"Leverage {request.businessModel} model to optimize cash flow.",
        "Validate core features with target segment beta users.",
        "Monitor local regulations and competitor movements.",
    ]

    try:
        raw = generate_content(prompt)
        parsed = json.loads(raw)

        if isinstance(parsed.get("marketOpportunityScore"), (int, float)):
            score = int(max(0, min(100, round(float(parsed["marketOpportunityScore"])))))
        if parsed.get("scoreExplanation"):
            explanation = str(parsed["scoreExplanation"]).strip()
        if isinstance(parsed.get("marketOpportunity"), dict):
            tam_sam_som = parsed["marketOpportunity"]
        if isinstance(parsed.get("customerInsights"), dict):
            cust_insights = parsed["customerInsights"]
        if isinstance(parsed.get("recommendations"), list) and parsed["recommendations"]:
            recommendations = parsed["recommendations"]

    except Exception:
        logger.exception("AI market opportunity analysis failed; using fallback values")

    return {
        "startupIdea": request.startupIdea,
        "industryInsights": {
            "industry": request.industry,
            "marketSize": request.marketAnalysis.marketSize,
            "growthRate": request.marketAnalysis.growthRate,
            "trends": request.marketAnalysis.marketTrends,
        },
        "marketOpportunity": tam_sam_som,
        "marketOpportunityScore": score,
        "scoreExplanation": explanation,
        "customerInsights": cust_insights,
        "recommendations": recommendations,
        "sources": request.verifiedSources,
    }


@app.post("/api/market-opportunity-agent")
def analyze_market_opportunity(request: MarketOpportunityRequest):
    return run_market_opportunity_agent(request)

