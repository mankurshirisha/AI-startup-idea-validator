import json
import os
import re
from urllib.parse import urlparse

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.gemini_client import generate_content
from app.logging_config import get_logger

load_dotenv()

logger = get_logger(__name__)

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

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

    Returns:
        dict: Structured competitor analysis payload.
    """
    logger.info("Competitor discovery request received for location: %s", location)

    industry = industry_analysis.get("industry", "") or "Technology"
    location = location.strip() if location else "Global"
    target_cust_str = target_customer or ", ".join(customer_segments or []) or "Target Users"

    if not startup_idea:
        raise HTTPException(status_code=400, detail="Startup idea is required.")

    # Region-focused search queries
    search_queries = [
        f"Top competitors of {startup_idea} in {location}",
        f"Leading {industry} companies in {location}",
        f"Popular {industry} startups in {location}",
        f"{startup_idea} alternatives in {location}",
        f"Top {business_model} {industry} platforms in {location}",
    ]

    optimized_query = " OR ".join(search_queries)

    # ==========================================================
    # TAVILY SEARCH
    # ==========================================================

    url = "https://api.tavily.com/search"

    tavily_payload = {
        "api_key": TAVILY_API_KEY,
        "query": optimized_query,
        "search_depth": "advanced",
        "include_domains": [],
    }

    try:
        logger.info("Starting Tavily competitor search request for region %s", location)
        response = requests.post(
            url,
            json=tavily_payload,
            timeout=60,
        )
        response.raise_for_status()
        search_data = response.json()
        logger.info("Tavily competitor search completed successfully")

    except Exception:
        logger.exception("Tavily search failed while discovering competitors")
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve competitor data from the search service.",
        ) from None

    seen_urls = set()
    processed_results = []

    for result in search_data.get("results", []):
        source_url = result.get("url", "")
        content = result.get("content", "")

        if source_url and source_url not in seen_urls:
            seen_urls.add(source_url)
            processed_results.append(
                {
                    "url": source_url,
                    "content": content,
                }
            )

    if not processed_results:
        processed_results = [{"url": "https://google.com", "content": f"Search for {startup_idea} competitors in {location}"}]

    # ==========================================================
    # GEMINI
    # ==========================================================

    prompt = f"""
You are an expert Startup Competitor Discovery Agent specializing in regional market analysis.

STARTUP CONTEXT:
- Startup Idea: {startup_idea}
- Industry: {industry}
- Target Region / Country: {location}
- Target Customers: {target_cust_str}
- Business Model: {business_model}
- Key Features: {", ".join(key_features) if key_features else "N/A"}

Search Results:
{json.dumps(processed_results, indent=2)}

Task:
Identify DIRECT competitors for this startup idea.
CRITICAL REGIONAL RULE:
- Prioritize competitors operating in {location} first!
  (e.g., if Location is India -> look for Indian players like Practo, PharmEasy, 1mg, Apollo, etc.; if USA -> Noom, Omada, Teladoc, etc.; if UK -> Babylon Health, Deliveroo, etc.).
- If direct local competitors in {location} do not exist, include major global competitors that serve users in {location}.
- Return companies that solve the SAME problem for similar target customers.

Return ONLY valid JSON in this schema:

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
    )



if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8901,
    )
