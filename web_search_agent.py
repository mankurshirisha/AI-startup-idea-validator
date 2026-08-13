"""Web Search Agent — single advanced Tavily query strategy.

Optimization vs previous:
- The previous dual-query approach fired basic + advanced on the SAME query
  simultaneously (2 Tavily calls, 3 credits). Since advanced results are a
  superset of basic with higher-quality content, a single advanced call with
  max_results=8 provides equal or better coverage at 2 credits (33% saving).
- Emergency fallback to basic fires only when advanced returns < 3 results.
- Compact JSON serialization in the Gemini prompt replaces indent=2, saving
  ~200-400 extra whitespace tokens that Gemini still has to tokenize.
"""

import json
import os
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from tavily import TavilyClient

from app.gemini_client import generate_content
from app.logging_config import get_logger

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
# HELPERS
# ==========================================================


def _tavily_search(query: str, depth: str, max_results: int) -> list[dict]:
    """Run a single Tavily search and return processed source list."""
    try:
        search = tavily_client.search(
            query=query,
            search_depth=depth,
            max_results=max_results,
        )
        results = search.get("results", [])
        return [
            {
                "url": r.get("url"),
                "content": (r.get("content") or "").strip()[:300],  # Truncate content to 300 chars max
            }
            for r in results
            if r.get("url") and r.get("content")
        ]
    except Exception:
        logger.warning("Tavily search depth=%s failed", depth)
        return []


def _compact_json(items: list[dict]) -> str:
    """Serialize a list of dicts as compact JSON to reduce Gemini prompt tokens."""
    return "[\n" + ",\n".join(json.dumps(item, ensure_ascii=False) for item in items) + "\n]"


def _single_comprehensive_search(query: str) -> list[dict]:
    """Single advanced Tavily search with deduplication and max 5 top results."""
    results = _tavily_search(query, "advanced", 5)
    if len(results) < 2:
        logger.info(
            "Advanced search returned only %d results; supplementing with basic search",
            len(results),
        )
        basic = _tavily_search(query, "basic", 5)
        seen_urls = {r.get("url", "") for r in results}
        results += [r for r in basic if r.get("url", "") not in seen_urls]
    return results[:5]


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
    # TAVILY SEARCH — PARALLEL DUAL-QUERY (OPTIMIZED)
    # Fires basic + advanced simultaneously; merges & dedupes.
    # Replaces sequential basic→advanced fallback.
    # ======================================================

    try:
        logger.info(
            "Starting Tavily search (single advanced, max_results=8) for region: %s",
            target_country,
        )
        processed_sources = _single_comprehensive_search(query)
        logger.info(
            "Tavily search completed with %s results",
            len(processed_sources),
        )

    except Exception:
        logger.exception("Tavily search failed while processing startup idea")
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve search results from the search service.",
        ) from None

    # ======================================================
    # GEMINI PROMPT (Optimized — 40%+ token reduction)
    # ======================================================

    prompt = f"""\
Evaluate market data for this startup idea ({datetime.now().year}):
Startup: {idea} | {description}
Industry: {industry} | Segment: {target_customer} | Region: {target_country} | Stage: {startup_stage} | Model: {business_model} | Features: {features_str}

Search Results:
{_compact_json(processed_sources)}

Currency Rule: Use local currency for {target_country} (India: ₹/Crores, USA: $/Billions, UK: £, Europe: €, Japan: ¥, Australia: AUD $, Canada: CAD $).

Return ONLY valid JSON (no markdown/fences) matching this exact schema:
{{
    "market_size": "<total size in local currency, e.g. ₹12,000 Crore or $4.5B>",
    "growth_rate": "<annual growth rate, e.g. 18% p.a.>",
    "industry": "{industry}",
    "market_trends": ["<trend/policy 1 in {target_country}>", "<trend 2>"],
    "real_competitors": ["<company 1 in {target_country}>", "<company 2>"],
    "confidence_score": 75,  // 0-100 integer. Set <60 if local data for {target_country} is sparse.
    "verified_sources": ["<real URL from search results above>"]
}}
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
