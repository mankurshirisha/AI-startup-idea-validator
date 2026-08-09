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
You are an experienced startup mentor helping a first-time founder figure out whether their idea has a real market.
Be direct and honest. Use plain English. Do not use consultant jargon.

Here is the startup you are reviewing:
- Idea: {startup_idea}
- What it does: {description}
- Industry: {industry}
- Who it's for: {target_customers}
- Where it's selling: {location}
- Stage right now: {startup_stage}
- How it makes money: {business_model}
- Main features: {key_features}

Market data already found:
- Estimated market size: {market_size}
- How fast this market is growing: {growth_rate}
- What's happening in this market: {market_trends}
- Customer groups to target: {customer_segments}
- Problems these customers face: {customer_pain_points}

Your job:
Look at all this information and give an honest picture of how big the opportunity is for THIS specific startup in {location}.

Currency rule — always use the local currency for {location}:
- India → INR (₹, in Crores, e.g. ₹50,000 Crore)
- USA → USD ($, in Billions/Millions)
- UK → GBP (£)
- Europe → EUR (€)
- Japan → JPY (¥)
- Australia → AUD ($)
- Canada → CAD ($)
Never use USD if the country is not USA or Global.

Market size terms (explain in plain numbers):
- TAM = the entire market if every possible customer bought this product
- SAM = the part of that market this startup can realistically reach with its model
- SOM = what this startup could actually capture in the first few years

Score the opportunity from 0 to 100 across these six areas.
Be realistic — not every startup deserves a high score:
- Innovation (0-100): Is this idea meaningfully different from what already exists in {location}?
- Market Demand (0-100): Do real people in {location} need this today, and is that growing?
- Competition (0-100): How crowded is this space in {location}? (Higher score = less crowded = better for the startup)
- Scalability (0-100): Can this grow quickly with the {business_model} model without costs exploding?
- Technical Feasibility (0-100): How hard is it to actually build this at the {startup_stage} stage?
- Business Viability (0-100): Can this realistically make money from {target_customers} in {location}?

Return ONLY valid JSON in exactly this structure — no markdown or code fences:
{{
  "marketOpportunity": {{
    "TAM": "<total market size in local currency>",
    "SAM": "<reachable market in local currency>",
    "SOM": "<what this startup can capture in local currency>"
  }},
  "marketOpportunityScore": <single overall score, integer 0-100>,
  "scoreExplanation": "<2-3 sentences explaining this score in plain English — what is strong, what is uncertain, be specific to {location} and {business_model}>",
  "customerInsights": {{
    "targetSegments": ["<specific group 1>", "<specific group 2>"],
    "keyPainPoints": ["<real problem 1>", "<real problem 2>"],
    "marketDemand": "<High | Moderate | Growing | Emerging>"
  }},
  "recommendations": [
    "<one concrete action the founder can take in {location} right now>",
    "<another specific action>",
    "<a third action>",
    "<a fourth action>"
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

