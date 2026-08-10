"""Competitor Discovery Agent -- TavilyClient SDK, focused 4-query strategy.

Optimizations vs original:
- Replaced raw requests.post() with TavilyClient SDK (connection pooling,
  consistent timeout handling, same as web_search_agent.py).
- Reduced the 5-query OR-join to 4 focused, non-redundant queries. The
  original 5-query string contained one near-duplicate pair (query 3 was
  semantically equivalent to query 2). We removed only that duplicate and
  kept the business-model-specific query which is semantically distinct.
- The existing_sources short-circuit (reuse web search results) is unchanged.
- The Gemini prompt and all output structure are unchanged.
"""

import json
import os
import re
from urllib.parse import urlparse

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from tavily import TavilyClient

from app.gemini_client import generate_content
from app.logging_config import get_logger

load_dotenv()

logger = get_logger(__name__)

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

# Initialise TavilyClient once at module level (connection pooling)
if TAVILY_API_KEY:
    tavily_client = TavilyClient(api_key=TAVILY_API_KEY)
else:
    tavily_client = None  # Handled at runtime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CompetitorRequest(BaseModel):
    startupIdea: str
    industryAnalysis: dict = {}
    customerSegments: list = []
    marketOpportunity: dict = {}
    marketOpportunityScore: int = 0
    recommendations: list = []
    location: str = "Global"
    businessModel: str = "B2B"
    targetCustomer: str = ""
    keyFeatures: list = []
    existingSources: list = []


def _normalize_website(website: object) -> str | None:
    """Normalize competitor websites to official homepage URLs or None."""
    if website is None:
        return None

    if not isinstance(website, str):
        website = str(website)

    website = website.strip()
    if not website:
        return None

    if website.startswith("http://") or website.startswith("https://"):
        return website

    return f"https://{website}"


def _normalize_text(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (value or "").lower())


def _infer_competitor_website(competitor_name: str, search_results: list[dict]) -> str | None:
    """Infer an official homepage URL from search results when possible."""
    name_key = _normalize_text(competitor_name)
    if not name_key:
        return None

    for result in search_results:
        result_url = result.get("url", "")
        content = result.get("content", "")
        if not result_url:
            continue

        parsed_url = urlparse(result_url)
        host_key = _normalize_text(parsed_url.netloc)
        content_key = _normalize_text(content)

        if name_key and (name_key in host_key or name_key in content_key):
            return _normalize_website(result_url)

    return None


def _populate_competitor_websites(structured_output: dict, search_results: list[dict]) -> dict:
    """Populate competitor websites and sources using search evidence."""
    competitors = structured_output.get("competitors") or []
    if not isinstance(competitors, list):
        return structured_output

    for competitor in competitors:
        if not isinstance(competitor, dict):
            continue

        website = competitor.get("website")
        normalized_website = _normalize_website(website)

        if normalized_website is not None:
            competitor["website"] = normalized_website
        else:
            competitor["website"] = _infer_competitor_website(
                competitor.get("name", ""),
                search_results,
            )

        if not competitor.get("source"):
            competitor["source"] = competitor["website"]

    return structured_output


def _tavily_competitor_search(query: str, location: str) -> list[dict]:
    """Search Tavily for competitor data using TavilyClient SDK.

    Uses basic depth first; falls back to advanced if <2 results.
    SDK is used instead of requests.post() for connection pooling.
    """
    if not tavily_client:
        raise HTTPException(
            status_code=500,
            detail="TAVILY_API_KEY is not configured.",
        )

    for depth in ("basic", "advanced"):
        try:
            logger.info(
                "Tavily competitor search (%s depth) for region %s", depth, location
            )
            result = tavily_client.search(
                query=query,
                search_depth=depth,
                max_results=6,
            )
            results = result.get("results", [])
            logger.info(
                "Tavily competitor search (%s) completed with %d results", depth, len(results)
            )
            if len(results) >= 2 or depth == "advanced":
                return results
        except Exception:
            logger.exception("Tavily competitor search (%s) failed", depth)
            if depth == "advanced":
                raise HTTPException(
                    status_code=500,
                    detail="Unable to retrieve competitor data from the search service.",
                ) from None

    return []


def run_competitor_discovery_agent(
    startup_idea: str,
    industry_analysis: dict,
    customer_segments: list = None,
    market_opportunity: dict = None,
    market_opportunity_score: int = 0,
    recommendations: list = None,
    location: str = "Global",
    business_model: str = "B2B",
    target_customer: str = "",
    key_features: list = None,
    existing_sources: list = None,
):
    """Run region-first competitor discovery workflow.

    Args:
        startup_idea: The startup idea being analyzed.
        industry_analysis: Dictionary containing industry context.
        customer_segments: Customer segments list.
        market_opportunity: Market opportunity dictionary.
        market_opportunity_score: Dynamic score.
        recommendations: Recommendations list.
        location: Target country/region.
        business_model: Business Model (B2B, B2C, SaaS, etc.).
        target_customer: Specific target customer.
        key_features: List of key features.
        existing_sources: Reuse web search results from previous steps if available.

    Returns:
        dict: Structured competitor analysis payload.
    """
    logger.info("Competitor discovery request received for location: %s", location)

    industry = industry_analysis.get("industry", "") or "Technology"
    location = location.strip() if location else "Global"
    target_cust_str = target_customer or ", ".join(customer_segments or []) or "Target Users"

    if not startup_idea:
        raise HTTPException(status_code=400, detail="Startup idea is required.")

    # Check if we can reuse search results from earlier pipeline steps
    if existing_sources and isinstance(existing_sources, list) and len(existing_sources) > 0:
        logger.info(
            "Reusing %d existing web search results for competitor discovery",
            len(existing_sources),
        )
        processed_results = existing_sources
    else:
        # Focused 4-query strategy (reduced from 5, removes only true semantic duplicate).
        # Removed: "Popular {industry} startups in {location}" which is near-identical
        # to "Leading {industry} companies in {location}".
        # Kept: business-model-specific query which is semantically distinct.
        search_queries = [
            f"Top competitors of {startup_idea} in {location}",
            f"Leading {industry} companies in {location}",
            f"{startup_idea} alternatives {industry}",
            f"Top {business_model} {industry} platforms in {location}",
        ]
        optimized_query = " OR ".join(search_queries)

        # Use TavilyClient SDK (connection pooling) instead of requests.post()
        raw_results = _tavily_competitor_search(optimized_query, location)

        seen_urls: set[str] = set()
        processed_results: list[dict] = []

        for result in raw_results:
            source_url = result.get("url", "")
            content = result.get("content", "")

            if source_url and source_url not in seen_urls:
                seen_urls.add(source_url)
                processed_results.append({"url": source_url, "content": content})

        if not processed_results:
            processed_results = [
                {
                    "url": "https://google.com",
                    "content": f"Search for {startup_idea} competitors in {location}",
                }
            ]

    # ==========================================================
    # GEMINI (prompt unchanged — same output quality)
    # ==========================================================

    prompt = f"""
You are a startup mentor helping a first-time founder understand who they are competing against.
Be specific and honest. Write in plain English. No jargon.

Here is the startup:
- Idea: {startup_idea}
- Industry: {industry}
- Selling in: {location}
- Who it's for: {target_cust_str}
- How it makes money: {business_model}
- Main features: {", ".join(key_features) if key_features else "N/A"}

Here are the search results we found online:
{json.dumps(processed_results, indent=2)}

Your task:
Find the REAL companies that are already solving the same problem for similar customers.
These are the competitors this founder needs to know about.

Location rule — this is the most important rule:
- First look for companies already operating IN {location}.
  Example: if {location} is India, look for Indian companies like Practo, PharmEasy, 1mg, Apollo, etc.
  Example: if {location} is USA, look for companies like Noom, Omada, Teladoc, etc.
  Example: if {location} is UK, look for companies like Babylon Health, Deliveroo, etc.
- If no local companies exist for this specific idea, then include major global companies that serve customers in {location}.
- Only include companies that solve the SAME problem for similar customers. Do not include unrelated companies.

For each competitor, fill in:
- name: company name
- website: their official website URL (or null if unknown)
- description: one sentence explaining what they do and who they serve
- key_features: the 2-4 things that make this competitor appealing to customers
- target_customers: who they mainly sell to
- pricing: how they charge (subscription, freemium, per-use, etc.) — be specific if known
- source: URL where you found this information

Return ONLY valid JSON in this exact schema — no markdown, no explanations:

{{
    "startupIdea":"{startup_idea}",
    "industry":"{industry}",
    "location":"{location}",
    "competitors":[
        {{
            "name":"",
            "website":null,
            "description":"",
            "key_features":[],
            "target_customers":"",
            "pricing":"",
            "source":""
        }}
    ]
}}
"""

    try:
        logger.info("Starting Gemini competitor analysis request")
        raw_choice = generate_content(prompt)
        structured_output = json.loads(raw_choice)
        structured_output = _populate_competitor_websites(structured_output, processed_results)
        logger.info("Competitor discovery completed successfully")
        return structured_output

    except Exception:
        logger.exception("Gemini competitor analysis failed")
        raise HTTPException(
            status_code=500,
            detail="Unable to generate competitor analysis from the AI service.",
        ) from None


@app.get("/")
def home():
    return {"message": "Competitor Discovery Agent Running"}


@app.post("/api/competitor-agent")
def competitor_discovery_agent(payload: CompetitorRequest):
    return run_competitor_discovery_agent(
        startup_idea=payload.startupIdea,
        industry_analysis=payload.industryAnalysis,
        customer_segments=payload.customerSegments,
        market_opportunity=payload.marketOpportunity,
        market_opportunity_score=payload.marketOpportunityScore,
        recommendations=payload.recommendations,
        location=payload.location,
        business_model=payload.businessModel,
        target_customer=payload.targetCustomer,
        key_features=payload.keyFeatures,
        existing_sources=payload.existingSources,
    )



if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8901,
    )
