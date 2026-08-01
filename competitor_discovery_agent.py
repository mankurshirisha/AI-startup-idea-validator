import json
import os

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
    industryAnalysis: dict
    customerSegments: list
    marketOpportunity: dict
    marketOpportunityScore: int
    recommendations: list


def run_competitor_discovery_agent(
    startup_idea: str,
    industry_analysis: dict,
    customer_segments: list,
    market_opportunity: dict,
    market_opportunity_score: int,
    recommendations: list,
):
    """Run the competitor discovery workflow.

    Args:
        startup_idea: The startup idea being analyzed.
        industry_analysis: A dictionary containing the industry context.
        customer_segments: A list of customer segments.
        market_opportunity: A dictionary with market opportunity information.
        market_opportunity_score: The numeric market opportunity score.
        recommendations: A list of recommendations from prior analysis.

    Returns:
        dict: A structured competitor analysis payload.

    Raises:
        HTTPException: If the input is invalid or external search or Gemini analysis fails.
    """

    logger.info("Competitor discovery request received")

    industry = industry_analysis.get("industry", "")

    # ==========================================================
    # INPUT VALIDATION
    # ==========================================================

    if not startup_idea:
        raise HTTPException(status_code=400, detail="Startup idea is required.")

    if not industry:
        raise HTTPException(status_code=400, detail="Industry information is required.")

    # ==========================================================
    # BUILD SEARCH QUERY
    # ==========================================================

    search_queries = [
        f"Top competitors of {startup_idea}",
        f"Leading companies in {industry}",
        f"Best startups in {industry}",
        f"{startup_idea} alternatives",
        f"Popular {industry} platforms",
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
        logger.info("Starting Tavily competitor search request")
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

    # ==========================================================
    # PROCESS RESULTS
    # ==========================================================

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

        raise HTTPException(status_code=404, detail="No competitor information found.")

    # ==========================================================
    # GEMINI
    # ==========================================================

    prompt = f"""
You are a Competitor Discovery Agent.

Startup Idea:
{startup_idea}

Industry:
{industry}

Search Results:
{json.dumps(processed_results, indent=2)}

Identify the major competitors.

Return ONLY valid JSON.

{{
    "startupIdea":"{startup_idea}",
    "industry":"{industry}",
    "competitors":[
        {{
            "name":"",
            "website":"",
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
    """Return a basic health message for the competitor discovery agent.

    Returns:
        dict: A simple status message.
    """

    return {"message": "Competitor Discovery Agent Running"}


@app.post("/api/competitor-agent")
def competitor_discovery_agent(payload: CompetitorRequest):
    """Expose the competitor discovery agent through the FastAPI endpoint.

    Args:
        payload: The incoming competitor discovery request payload.

    Returns:
        dict: The competitor analysis payload generated by the agent.

    Raises:
        HTTPException: If the input is invalid or the analysis fails.
    """

    return run_competitor_discovery_agent(
        payload.startupIdea,
        payload.industryAnalysis,
        payload.customerSegments,
        payload.marketOpportunity,
        payload.marketOpportunityScore,
        payload.recommendations,
    )


if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8901,
    )
