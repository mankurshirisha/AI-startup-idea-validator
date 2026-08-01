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
    description: str


# ==========================================================
# WEB SEARCH AGENT
# ==========================================================


def run_web_search_agent(idea: str, description: str):
    """Run the web search analysis workflow.

    Args:
        idea: The startup idea to analyze.
        description: A description of the startup idea.

    Returns:
        dict: A structured market research payload.

    Raises:
        HTTPException: If the input is invalid or the external search or Gemini call fails.
    """
    logger.info("Web search agent request received")

    idea = idea.strip()
    description = description.strip()

    if len(idea) < 3:
        raise HTTPException(status_code=400, detail="Invalid startup idea.")

    if len(description) < 10:
        raise HTTPException(status_code=400, detail="Description is too short.")

    query = (
        f"{idea}. "
        f"{description}. "
        "Market size, industry, market trends, competitors, target users."
    )

    # ======================================================
    # TAVILY SEARCH
    # ======================================================

    try:
        logger.info("Starting Tavily search request")
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
You are an expert Startup Market Research Agent.

Current Year:
{datetime.now().year}

Startup Idea:
{idea}

Description:
{description}

Verified Sources:
{json.dumps(processed_sources, indent=2)}

Analyze the startup idea and return ONLY valid JSON.

{{
    "market_size":"",
    "industry":"",
    "market_trends":[
    ],
    "real_competitors":[
    ],
    "confidence_score":"",
    "verified_sources":[
    ]
}}
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
    """Return a basic health message for the web search agent.

    Returns:
        dict: A simple status message.
    """
    return {"message": "Web Search Agent Running"}


@app.post("/api/search-agent")
def search_agent(request: IdeaRequest):
    """Expose the web search agent through the FastAPI endpoint.

    Args:
        request: The incoming search request payload.

    Returns:
        dict: The market research payload generated by the agent.

    Raises:
        HTTPException: If the request is invalid or the analysis fails.
    """

    return run_web_search_agent(request.idea, request.description)


# ==========================================================
# MAIN
# ==========================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8900)
