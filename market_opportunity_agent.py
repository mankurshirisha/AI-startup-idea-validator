from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

app = FastAPI(
    title="Market Opportunity Agent",
    version="1.0"
)

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
    return {
        "message": "Market Opportunity Agent is Running Successfully!"
    }


# -----------------------------
# Market Opportunity API
# -----------------------------

@app.post("/api/market-opportunity-agent")
def analyze_market_opportunity(request: MarketOpportunityRequest):

    return {

        "startupIdea": request.startupIdea,

        "industryInsights": {
            "industry": request.industry,
            "marketSize": request.marketAnalysis.marketSize,
            "growthRate": request.marketAnalysis.growthRate,
            "trends": request.marketAnalysis.marketTrends
        },

        "marketOpportunity": {
            "TAM": "$50 Billion",
            "SAM": "$8 Billion",
            "SOM": "$500 Million"
        },

        "marketOpportunityScore": 91,

        "customerInsights": {
            "targetSegments": request.customerAnalysis.customerSegments,
            "keyPainPoints": request.customerAnalysis.customerPainPoints,
            "marketDemand": "High"
        },

        "recommendations": [
            "Focus on high-growth customer segments.",
            "Validate product-market fit through pilot launches.",
            "Use digital marketing to reach target customers.",
            "Offer competitive pricing during the initial launch."
        ],

        "sources": [
            "Industry Market Reports",
            "Government Startup Statistics",
            "Market Research Publications"
        ]
    }