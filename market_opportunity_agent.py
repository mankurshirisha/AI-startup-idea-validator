from typing import List

from fastapi import FastAPI
from pydantic import BaseModel

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
    industry: str
    targetCustomer: List[str]
    location: str
    startupStage: str
    marketAnalysis: MarketAnalysis
    customerAnalysis: CustomerAnalysis
    analysisGoal: str
    analysisDepth: str


# -----------------------------
# Home API
# -----------------------------


@app.get("/")
def home():
    """Return a basic health message for the market opportunity agent.

    Returns:
        dict: A simple status message.
    """
    return {"message": "Market Opportunity Agent is Running Successfully!"}


# -----------------------------
# Market Opportunity API
# -----------------------------


def run_market_opportunity_agent(request: MarketOpportunityRequest):
    """Return a prebuilt market opportunity response for the provided request.

    Args:
        request: The market opportunity request payload.

    Returns:
        dict: A structured market opportunity response.
    """
    logger.info("Market opportunity request received")
    logger.info("Processing market opportunity response")

    return {
        "startupIdea": request.startupIdea,
        "industryInsights": {
            "industry": request.industry,
            "marketSize": request.marketAnalysis.marketSize,
            "growthRate": request.marketAnalysis.growthRate,
            "trends": request.marketAnalysis.marketTrends,
        },
        "marketOpportunity": {
            "TAM": "$50 Billion",
            "SAM": "$8 Billion",
            "SOM": "$500 Million",
        },
        "marketOpportunityScore": 91,
        "customerInsights": {
            "targetSegments": request.customerAnalysis.customerSegments,
            "keyPainPoints": request.customerAnalysis.customerPainPoints,
            "marketDemand": "High",
        },
        "recommendations": [
            "Focus on high-growth customer segments.",
            "Validate product-market fit through pilot launches.",
            "Use digital marketing to reach target customers.",
            "Offer competitive pricing during the initial launch.",
        ],
        "sources": [
            "Industry Market Reports",
            "Government Startup Statistics",
            "Market Research Publications",
        ],
    }

    logger.info("Market opportunity completed successfully")


@app.post("/api/market-opportunity-agent")
def analyze_market_opportunity(request: MarketOpportunityRequest):
    return run_market_opportunity_agent(request)
