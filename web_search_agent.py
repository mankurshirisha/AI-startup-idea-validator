import json
import os
from datetime import datetime

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from tavily import TavilyClient

from app.gemini_client import generate_content
from app.logging_config import get_logger

load_dotenv()

logger = get_logger(__name__)

# ==========================================================
# API KEYS
# ==========================================================

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

if not TAVILY_API_KEY:
    raise RuntimeError("TAVILY_API_KEY not found.")

# ==========================================================
# CLIENTS
# ==========================================================

tavily_client = TavilyClient(api_key=TAVILY_API_KEY)

# ==========================================================
# FASTAPI
# ==========================================================

app = FastAPI(title="Web Search Agent", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================================
# REQUEST MODEL
# ==========================================================


class IdeaRequest(BaseModel):
    idea: str
    description: str = ""
    industry: str = ""
    targetCustomer: str = ""
    targetCountry: str = "Global"
    startupStage: str = "Idea"
    businessModel: str = "B2B"
    keyFeatures: list = []


# ==========================================================
# WEB SEARCH AGENT
# ==========================================================


def run_web_search_agent(
    idea: str,
    description: str = "",
    industry: str = "",
    target_customer: str = "",
    target_country: str = "Global",
    startup_stage: str = "Idea",
    business_model: str = "B2B",
    key_features: list = None,
):
    """Run the context-aware web search analysis workflow.

    Args:
        idea: The startup idea to analyze.
        description: A description of the startup idea.
        industry: Industry / Domain.
        target_customer: Target Customer segment.
        target_country: Target Country / Location.
        startup_stage: Startup Stage (Idea, MVP, Beta, Launched).
        business_model: Business Model (B2B, B2C, SaaS, etc.).
        key_features: List of key features.

    Returns:
        dict: A structured market research payload.
    """
    logger.info("Web search agent request received")

    idea = idea.strip()
    description = description.strip() if description else idea
    industry = industry.strip() if industry else "General Tech"
    target_customer = target_customer.strip() if target_customer else "Target Users"
    target_country = target_country.strip() if target_country else "Global"
    business_model = business_model.strip() if business_model else "B2C"
    features_str = ", ".join(key_features) if key_features else "N/A"

    if len(idea) < 2:
        raise HTTPException(status_code=400, detail="Invalid startup idea.")

    # Location-specific query building
    query = (
        f"{idea} in {target_country}. "
        f"Industry: {industry}. Target Customer: {target_customer}. Business Model: {business_model}. "
        f"Key features: {features_str}. "
        f"Local market size, local competitors, government regulations, demand trends, funding."
    )

    # ======================================================
    # TAVILY SEARCH
    # ======================================================

    try:
        logger.info("Starting Tavily search request for region: %s", target_country)
        search = tavily_client.search(query=query, search_depth="advanced")

        processed_sources = []

        for item in search.get("results", []):
            processed_sources.append(
                {"url": item.get("url"), "content": item.get("content")}
            )

        logger.info(
            "Tavily search completed successfully with %s results",
            len(processed_sources),
        )

    except Exception:
        logger.exception("Tavily search failed while processing startup idea")
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve search results from the search service.",
        ) from None

    # ======================================================
    # GEMINI PROMPT
    # ======================================================

    prompt = f"""
You are an expert Startup Market Research Agent specializing in regional and industry analysis.

Current Year:
{datetime.now().year}

STARTUP CONTEXT:
- Startup Idea: {idea}
- Description: {description}
- Industry / Domain: {industry}
- Target Customer: {target_customer}
- Target Country / Region: {target_country}
- Startup Stage: {startup_stage}
- Business Model: {business_model}
- Key Features: {features_str}

Verified Sources:
{json.dumps(processed_sources, indent=2)}

Task:
Analyze the startup idea using the verified sources provided above and your knowledge of {target_country}.
IMPORTANT LOCATION & CURRENCY RULE:
- Focus on market dynamics, demand, regulations, and competitors SPECIFIC to {target_country}.
- Format all market size numbers and currency values using the local currency context for {target_country} (e.g. INR ₹ for India, USD $ for USA, GBP £ for UK, EUR € for Europe, etc.).

Return ONLY valid JSON in exactly the following format:

{{
    "market_size": "",
    "growth_rate": "",
    "industry": "{industry}",
    "market_trends": [],
    "real_competitors": [],
    "confidence_score": 0,
    "verified_sources": []
}}

Rules:
1. Return ONLY valid JSON. Do not include markdown, explanations, or code fences.
2. "confidence_score" MUST be an integer between 0 and 100.
3. Do NOT include "%" or text in confidence_score.
4. Calculate confidence based on data completeness and source quality for {target_country}.
5. "verified_sources" MUST contain real URLs from the provided Verified Sources.
6. "real_competitors" MUST prioritize existing companies operating in {target_country} or relevant globally.
7. Include regional regulations or policies for {target_country} under market_trends if found.
"""

    # ======================================================
    # GEMINI
    # ======================================================

    try:
        logger.info("Starting Gemini analysis request")
        raw = generate_content(prompt)
        result = json.loads(raw)
        logger.info("Web search agent completed successfully")
        return result

    except Exception:
        logger.exception("Gemini analysis failed while processing startup idea")
        raise HTTPException(
            status_code=500,
            detail="Unable to generate market analysis from the AI service.",
        ) from None


# ==========================================================
# ROUTES
# ==========================================================


@app.get("/")
def home():
    return {"message": "Web Search Agent Running"}


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



# ==========================================================
# MAIN
# ==========================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8900)
