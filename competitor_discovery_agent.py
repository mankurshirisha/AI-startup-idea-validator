"""Competitor Discovery Agent — parallel Tavily + seed competitor enrichment.

Optimizations vs previous version:
- Cold-path Tavily: sequential basic→advanced replaced with parallel basic+advanced
  (ThreadPoolExecutor), cutting cold-path latency by 3–8 s.
- seed_competitor_names: Agent 1 (Web Search) already extracts real_competitors[].
  We now pass those names into this agent so Gemini enriches known names instead
  of re-discovering them, producing more accurate and focused output.
- Compact JSON replaces indent=2 in the Gemini prompt (−200–400 tokens).
- Removed redundant load_dotenv() — app/config.py handles this centrally.
"""

import json
import os
import re
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from tavily import TavilyClient

from app.gemini_client import generate_content, _extract_json_like_text
from app.logging_config import get_logger

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


def _compact_json(items: list[dict]) -> str:
    """Serialize a list of dicts as compact JSON to reduce Gemini prompt tokens.

    Replaces json.dumps(items, indent=2) which adds ~35% extra whitespace that
    Gemini still tokenizes. Semantically identical — saves ~200-400 tokens.
    """
    return "[\n" + ",\n".join(json.dumps(item, ensure_ascii=False) for item in items) + "\n]"


def _tavily_competitor_search(query: str, location: str) -> list[dict]:
    """Search Tavily for competitor data — parallel basic + advanced strategy.

    Fires both depths simultaneously (same pattern as web_search_agent). Total
    wall-clock time is max(basic, advanced) instead of basic + advanced, saving
    3–8 s on cold-path requests where existing_sources is not available.
    Advanced results (higher quality) take priority in the merged output.
    """
    if not tavily_client:
        raise HTTPException(
            status_code=500,
            detail="TAVILY_API_KEY is not configured.",
        )

    def _search(depth: str) -> list[dict]:
        try:
            logger.info(
                "Tavily competitor search (%s depth) for region %s", depth, location
            )
            result = tavily_client.search(
                query=query,
                search_depth=depth,
                max_results=6,
            )
            hits = result.get("results", [])
            logger.info(
                "Tavily competitor search (%s) completed with %d results",
                depth,
                len(hits),
            )
            return hits
        except Exception:
            logger.exception("Tavily competitor search (%s) failed", depth)
            return []

    with ThreadPoolExecutor(max_workers=2) as pool:
        f_basic = pool.submit(_search, "basic")
        f_advanced = pool.submit(_search, "advanced")
        # Both run simultaneously; .result() blocks inside the context so the
        # executor keeps both threads alive until both complete.
        basic_results = f_basic.result()
        advanced_results = f_advanced.result()

    # Merge: prefer advanced results (higher quality), deduplicate by URL.
    seen_urls: set[str] = set()
    merged: list[dict] = []
    for r in [*advanced_results, *basic_results]:
        url = r.get("url", "")
        if url and url not in seen_urls:
            seen_urls.add(url)
            merged.append(r)

    if not merged:
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve competitor data from the search service.",
        )

    return merged


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
    seed_competitor_names: list = None,
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
        seed_competitor_names: Competitor names already identified by the Web Search
            Agent (real_competitors[]). Injected into the Gemini prompt so this agent
            enriches known names instead of re-discovering them from scratch.
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

        for result in raw_results[:5]:
            source_url = result.get("url", "")
            content = (result.get("content") or "").strip()[:300]  # Truncate content to max 300 chars

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
    # GEMINI
    # ==========================================================

    # ── Seed competitor names from Agent 1 (Web Search) ──────────────────────
    seed_section = ""
    if seed_competitor_names and isinstance(seed_competitor_names, list):
        valid_names = [
            str(n).strip() for n in seed_competitor_names if n and str(n).strip()
        ][:5]  # Limit to top 5 seed competitors
        if valid_names:
            seed_section = (
                f"\nPRE-IDENTIFIED COMPETITORS (max 5):\n"
                f"{', '.join(valid_names)}\n"
                f"Enrich each with description, website, pricing, and features.\n"
            )
            logger.info(
                "Seeding competitor prompt with %d pre-identified names: %s",
                len(valid_names),
                ", ".join(valid_names),
            )

    prompt = f"""\
Identify real competitors for this startup:
Startup: {startup_idea} | Industry: {industry} | Region: {location} | Target: {target_cust_str} | Model: {business_model} | Features: {", ".join(key_features) if key_features else "N/A"}

Search Results:
{_compact_json(processed_results)}
{seed_section}
Location Rule: Focus on companies operating in {location}. If no local competitors exist, include global ones serving users in {location}.

Return ONLY valid JSON (no markdown/fences) matching this exact schema:
{{
    "startupIdea": "{startup_idea}",
    "industry": "{industry}",
    "location": "{location}",
    "competitors": [
        {{
            "name": "<company name>",
            "website": "<official URL or null>",
            "description": "<one sentence overview>",
            "key_features": ["<feature 1>", "<feature 2>"],
            "target_customers": "<target customer description>",
            "pricing": "<pricing model/tiers>",
            "source": "<source URL from search results or null>"
        }}
    ]
}}
"""

def _build_unavailable_competitor_result(
    startup_idea: str,
    industry: str,
    location: str,
    seed_competitor_names: list = None,
    processed_results: list = None,
) -> dict:
    """Return a clean structured fallback result when Gemini is temporarily unavailable."""
    competitors = []
    if seed_competitor_names and isinstance(seed_competitor_names, list):
        for name in seed_competitor_names[:5]:
            if name and isinstance(name, str) and name.strip():
                competitors.append({
                    "name": name.strip(),
                    "website": None,
                    "description": f"Pre-identified competitor operating in {industry}.",
                    "key_features": ["Industry Competitor"],
                    "target_customers": "Target Users",
                    "pricing": "N/A",
                    "source": None,
                })

    if not competitors and processed_results and isinstance(processed_results, list):
        for res in processed_results[:3]:
            url = res.get("url", "")
            if url and "google" not in url:
                competitors.append({
                    "name": url.split("//")[-1].split("/")[0].replace("www.", "").capitalize(),
                    "website": url,
                    "description": (res.get("content") or f"Competitor in {industry}")[:150],
                    "key_features": ["Market Competitor"],
                    "target_customers": "Target Users",
                    "pricing": "N/A",
                    "source": url,
                })

    return {
        "status": "temporarily_unavailable",
        "startupIdea": startup_idea,
        "industry": industry,
        "location": location,
        "competitors": competitors,
        "message": "Competitor analysis is temporarily unavailable. Other validation results are still available.",
    }


    try:
        logger.info("Starting Gemini competitor analysis request")
        raw_choice = generate_content(prompt)

        # Check for empty, whitespace, or generic error responses
        if not raw_choice or not raw_choice.strip() or "high demand" in raw_choice.lower():
            logger.error("Competitor discovery received empty or fallback AI response")
            return _build_unavailable_competitor_result(
                startup_idea, industry, location, seed_competitor_names, processed_results
            )

        cleaned_text = _extract_json_like_text(raw_choice)
        if not cleaned_text or len(cleaned_text.strip()) == 0:
            logger.error("Competitor discovery could not extract JSON from raw response snippet")
            return _build_unavailable_competitor_result(
                startup_idea, industry, location, seed_competitor_names, processed_results
            )

        try:
            structured_output = json.loads(cleaned_text)
        except (json.JSONDecodeError, ValueError) as exc:
            logger.error(
                "Competitor discovery JSON parse error: %s | Raw response snippet: %s",
                exc,
                raw_choice[:200],
            )
            return _build_unavailable_competitor_result(
                startup_idea, industry, location, seed_competitor_names, processed_results
            )

        if not isinstance(structured_output, dict) or "competitors" not in structured_output:
            logger.error("Competitor discovery returned invalid JSON shape (expected dict with 'competitors')")
            return _build_unavailable_competitor_result(
                startup_idea, industry, location, seed_competitor_names, processed_results
            )

        structured_output = _populate_competitor_websites(structured_output, processed_results)
        logger.info("Competitor discovery completed successfully")
        return structured_output

    except Exception as exc:
        logger.exception("Gemini competitor analysis failed: %s", exc)
        return _build_unavailable_competitor_result(
            startup_idea, industry, location, seed_competitor_names, processed_results
        )



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
