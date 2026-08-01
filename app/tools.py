from crewai.tools import tool

from comparison_agent import run_comparison_agent
from competitor_discovery_agent import run_competitor_discovery_agent
from market_opportunity_agent import (MarketOpportunityRequest,
                                      run_market_opportunity_agent)
from web_search_agent import run_web_search_agent

# ==========================================================
# WEB SEARCH TOOL
# ==========================================================


@tool("Web Search Tool")
def web_search_tool(startup_info: str):
    """
    Performs market research using the Web Search Agent.
    """

    idea = ""
    description = ""

    for line in startup_info.splitlines():

        line = line.strip()

        if line.lower().startswith("startup idea:"):
            idea = line.split(":", 1)[1].strip()

        elif line.lower().startswith("startup description:"):
            description = line.split(":", 1)[1].strip()

    return run_web_search_agent(
        idea,
        description,
    )


# ==========================================================
# MARKET OPPORTUNITY TOOL
# ==========================================================


@tool("Market Opportunity Tool")
def market_opportunity_tool(payload: dict):
    """
    Runs the Market Opportunity Agent directly.
    """

    request = MarketOpportunityRequest(**payload)

    return run_market_opportunity_agent(request)


# ==========================================================
# COMPETITOR DISCOVERY TOOL
# ==========================================================


@tool("Competitor Discovery Tool")
def competitor_discovery_tool(payload: dict):
    """
    Runs the Competitor Discovery Agent directly.
    Supports both camelCase and snake_case payloads.
    """

    startup_idea = (
        payload.get("startupIdea")
        or payload.get("startup_idea")
        or payload.get("idea")
        or ""
    )

    industry_analysis = (
        payload.get("industryAnalysis") or payload.get("industry_analysis") or {}
    )

    customer_segments = (
        payload.get("customerSegments") or payload.get("customer_segments") or []
    )

    market_opportunity = (
        payload.get("marketOpportunity") or payload.get("market_opportunity") or {}
    )

    market_opportunity_score = (
        payload.get("marketOpportunityScore")
        or payload.get("market_opportunity_score")
        or 0
    )

    recommendations = payload.get("recommendations", [])

    return run_competitor_discovery_agent(
        startup_idea,
        industry_analysis,
        customer_segments,
        market_opportunity,
        market_opportunity_score,
        recommendations,
    )


# ==========================================================
# COMPARISON TOOL
# ==========================================================


@tool("Comparison Tool")
def comparison_tool(payload: dict):
    """
    Runs the Comparison Agent directly.
    Supports both camelCase and snake_case payloads.
    """

    startup_idea = (
        payload.get("startupIdea")
        or payload.get("startup_idea")
        or payload.get("idea")
        or ""
    )

    description = (
        payload.get("description")
        or payload.get("startupDescription")
        or payload.get("startup_description")
        or ""
    )

    industry = (
        payload.get("industry")
        or payload.get("industryAnalysis", {}).get("industry", "")
        or payload.get("industry_analysis", {}).get("industry", "")
    )

    competitors = payload.get("competitors", [])

    return run_comparison_agent(
        startup_idea,
        description,
        industry,
        competitors,
    )
