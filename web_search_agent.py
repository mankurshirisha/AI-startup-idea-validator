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
    # TAVILY SEARCH (OPTIMIZED WITH AUTOMATIC FALLBACK)
    # ======================================================

    try:
        logger.info("Starting Tavily search request (basic depth) for region: %s", target_country)
        search_results = []
        try:
            search = tavily_client.search(query=query, search_depth="basic", max_results=6)
            search_results = search.get("results", [])
        except Exception:
            logger.warning("Basic Tavily search failed; retrying with advanced search")

        # Fallback to advanced search if basic search returned fewer than 2 results
        if len(search_results) < 2:
            logger.info("Basic search returned %d results; upgrading to advanced search", len(search_results))
            try:
                search = tavily_client.search(query=query, search_depth="advanced", max_results=6)
                search_results = search.get("results", [])
            except Exception:
                logger.exception("Advanced Tavily search fallback also failed")

        processed_sources = []
        for item in search_results:
            if item.get("url") and item.get("content"):
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
You are a startup mentor helping a first-time founder understand their market.
Write as if you are explaining this over a coffee chat — plain English, no jargon.

Year: {datetime.now().year}

Startup being evaluated:
- Idea: {idea}
- What it does: {description}
- Industry: {industry}
- Who it's for: {target_customer}
- Where it will sell: {target_country}
- Current stage: {startup_stage}
- How it makes money: {business_model}
- Main features: {features_str}

Here are the search results we found online:
{json.dumps(processed_sources, indent=2)}

Using the search results above and your knowledge of {target_country}, give a realistic picture of the market.

Currency rule — use the local currency for {target_country}:
- India → INR (₹, in Crores)
- USA → USD ($, in Billions/Millions)
- UK → GBP (£)
- Europe → EUR (€)
- Japan → JPY (¥)
- Australia → AUD ($)
- Canada → CAD ($)
Do NOT use USD if the country is not USA or Global.

Return ONLY valid JSON in exactly this format — no markdown, no extra text:

{{
    "market_size": "<total size of this market in local currency, e.g. ₹12,000 Crore or $4.5 Billion>",
    "growth_rate": "<how fast this market is growing per year, e.g. 18% per year>",
    "industry": "{industry}",
    "market_trends": ["<what is changing in this market right now>", "<another real trend>"],
    "real_competitors": ["<name of company 1 operating in {target_country}>", "<name of company 2>"],
    "confidence_score": 0,
    "verified_sources": []
}}

Rules:
1. Return ONLY valid JSON. No markdown, no explanations, no code fences.
2. "confidence_score" must be a whole number between 0 and 100. No % sign.
   Set it lower (below 60) if you found little data about {target_country}. Be honest.
3. "verified_sources" must contain real URLs from the search results above only.
4. "real_competitors" should focus on companies that operate in {target_country}.
   If no local companies exist, list major global ones that serve users there.
5. "market_trends" should include any local rules, government policies, or regulations for {target_country} if found.
6. Keep all text short and factual. No consultant language.
"""

    # ======================================================
    # GEMINI
    # ======================================================

    try:
        logger.info("Starting Gemini analysis request")
        raw = generate_content(prompt)
        result = json.loads(raw)
        if isinstance(result, dict):
            result["raw_sources"] = processed_sources
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
