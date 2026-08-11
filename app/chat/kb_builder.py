"""Knowledge Base Builder Module for BetaBuddy.

Constructs an in-memory structured knowledge base ONLY from the current session's
startup validation result.

No vector databases. No chunking. No external storage. No disk writes.
Session isolated & transient in RAM.
"""

from typing import Any, Dict
from app.logging_config import get_logger

logger = get_logger("chat.kb_builder")


def build_knowledge_base(result: dict) -> Dict[str, Any]:
    """Extract and format structured knowledge base sections from validation result.

    Args:
        result: The validation result payload dictionary.

    Returns:
        dict: In-memory structured knowledge base section dictionary.
    """
    if not isinstance(result, dict):
        result = {}

    web_search = result.get("web_search", {}) or {}
    market_opp = result.get("market_opportunity", {}) or {}
    competitor_analysis = result.get("competitor_analysis", {}) or {}
    comparison = result.get("comparison", {}) or {}

    # Extract Meta Info
    idea = (
        result.get("idea")
        or web_search.get("startupIdea")
        or market_opp.get("startupIdea")
        or "Your Startup Idea"
    )
    description = (
        result.get("description")
        or web_search.get("description")
        or "Startup Description"
    )
    industry = (
        web_search.get("industry")
        or market_opp.get("industryInsights", {}).get("industry")
        or "Technology"
    )
    country = web_search.get("target_country") or market_opp.get("location") or "Global"
    score = (
        result.get("validationScore")
        or market_opp.get("marketOpportunityScore")
        or 75
    )
    status = result.get("status") or "Validated"
    verdict = result.get("verdict") or market_opp.get("scoreExplanation") or "Promising"

    # Extract Competitors
    comps = competitor_analysis.get("competitors", []) or result.get("competitors", []) or []

    # Extract SWOT
    swot = result.get("swot") or {
        "strengths": comparison.get("business_insights", {}).get("strengths", []),
        "weaknesses": comparison.get("business_insights", {}).get("weaknesses", []),
        "opportunities": comparison.get("business_insights", {}).get("opportunities", []),
        "threats": comparison.get("threats", []),
    }

    # Build In-Memory KB Dictionary
    kb = {
        "meta": {
            "idea": idea,
            "description": description,
            "industry": industry,
            "country": country,
            "score": score,
            "status": status,
            "verdict": verdict,
        },
        "executive_summary": result.get("executiveSummary") or web_search.get("summary") or "Comprehensive startup validation analysis.",
        "swot": swot,
        "competitors": comps,
        "market": {
            "market_size": web_search.get("market_size") or market_opp.get("marketOpportunity", {}).get("TAM") or "N/A",
            "growth_rate": web_search.get("growth_rate") or "High",
            "trends": web_search.get("market_trends") or market_opp.get("industryInsights", {}).get("trends") or [],
            "tam_sam_som": market_opp.get("marketOpportunity") or {},
            "customer_insights": market_opp.get("customerInsights") or {},
        },
        "comparison": {
            "startup_features": comparison.get("startup_features", []),
            "feature_comparison": comparison.get("feature_comparison", []),
            "similarity_scores": comparison.get("similarity_scores", []),
            "market_gaps": comparison.get("market_gaps", []),
            "final_value_proposition": comparison.get("final_value_proposition", ""),
        },
        "recommendations": {
            "strategic": comparison.get("strategic_recommendations") or market_opp.get("recommendations") or [],
            "personalized": comparison.get("personalized_recommendations") or {},
        },
        "risk_analysis": result.get("risks") or comparison.get("threats") or [],
        "score_breakdown": {
            "score": score,
            "explanation": market_opp.get("scoreExplanation") or verdict,
        },
        "sources": result.get("sources") or web_search.get("verified_sources") or web_search.get("raw_sources") or [],
    }

    logger.info("In-memory Knowledge Base built for idea: '%s' (%d competitors)", idea, len(comps))
    return kb
