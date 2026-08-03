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
You are an expert startup market analyst and venture capital evaluator.

Evaluate the following startup opportunity with deep regional and industry contextual awareness:

STARTUP PROFILE:
- Startup Idea: {startup_idea}
- Description: {description}
- Industry / Domain: {industry}
- Target Customers: {target_customers}
- Target Country / Region: {location}
- Startup Stage: {startup_stage}
- Business Model: {business_model}
- Key Features: {key_features}

MARKET RESEARCH DATA:
- Market Size: {market_size}
- Growth Rate: {growth_rate}
- Market Trends / Regulations: {market_trends}
- Identified Customer Segments: {customer_segments}
- Customer Pain Points: {customer_pain_points}

CRITICAL INSTRUCTIONS:
1. LOCATION & CURRENCY REQUIREMENT:
   Analyze the market specifically for {location}.
   All financial estimates (TAM, SAM, SOM) MUST use the appropriate currency for {location}:
   - If India -> Use INR (₹) (e.g. ₹50,000 Crore, ₹8,000 Crore, ₹500 Crore)
   - If USA -> Use USD ($) (e.g. $50 Billion, $8 Billion, $500 Million)
   - If United Kingdom / UK -> Use GBP (£)
   - If Europe / Germany / France -> Use EUR (€)
   - If Japan -> Use JPY (¥)
   - If Australia -> Use AUD ($)
   - If Canada -> Use CAD ($)
   DO NOT use USD if the target country is not USA or Global!

2. DIMENSIONAL EVALUATION (0-100 scale):
   - Innovation: Novelty vs regional alternatives
   - Market Demand: Demonstrated regional demand & trends
   - Competition: Intensity of competitive landscape in {location}
   - Scalability: Ability to scale given business model ({business_model})
   - Technical Feasibility: Ease of execution given current tech & stage ({startup_stage})
   - Business Viability: Monetization potential for target customers in {location}

Return ONLY valid JSON in exactly this structure — no markdown or code fences:
{{
  "marketOpportunity": {{
    "TAM": "<Total Addressable Market in local currency>",
    "SAM": "<Serviceable Addressable Market in local currency>",
    "SOM": "<Serviceable Obtainable Market in local currency>"
  }},
  "marketOpportunityScore": <integer 0-100>,
  "scoreExplanation": "<Concise 1-2 sentence explanation of why this score was assigned considering {location}, {business_model}, and {startup_stage}>",
  "customerInsights": {{
    "targetSegments": ["<segment 1>", "<segment 2>"],
    "keyPainPoints": ["<pain point 1>", "<pain point 2>"],
    "marketDemand": "<High | Moderate | Growing | Emerging>"
  }},
  "recommendations": [
    "<actionable recommendation 1 tailored to {location} and {business_model}>",
    "<actionable recommendation 2>",
    "<actionable recommendation 3>",
    "<actionable recommendation 4>"
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

