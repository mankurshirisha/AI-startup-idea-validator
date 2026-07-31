import requests
from crewai.tools import tool

WSA_URL = "http://127.0.0.1:8900/api/search-agent"
MARKET_URL = "http://127.0.0.1:8002/api/market-opportunity-agent"
COMPETITOR_URL = "http://127.0.0.1:8901/api/competitor-agent"
COMPARISON_URL = "http://127.0.0.1:8902/api/comparison-agent"


@tool("Web Search Tool")
def web_search_tool(startup_idea: str):
    """Calls Web Search Agent."""
    response = requests.post(
        WSA_URL,
        json={"idea": startup_idea},
        timeout=120
    )
    response.raise_for_status()
    return response.json()


@tool("Market Opportunity Tool")
def market_opportunity_tool(payload: dict):
    """Calls Market Opportunity Agent."""
    response = requests.post(
        MARKET_URL,
        json=payload,
        timeout=120
    )
    response.raise_for_status()
    return response.json()


@tool("Competitor Discovery Tool")
def competitor_discovery_tool(payload: dict):
    """Calls Competitor Discovery Agent."""
    response = requests.post(
        COMPETITOR_URL,
        json=payload,
        timeout=120
    )
    response.raise_for_status()
    return response.json()


@tool("Comparison Tool")
def comparison_tool(payload: dict):
    """Calls Comparison Agent."""
    response = requests.post(
        COMPARISON_URL,
        json=payload,
        timeout=120
    )
    response.raise_for_status()
    return response.json()