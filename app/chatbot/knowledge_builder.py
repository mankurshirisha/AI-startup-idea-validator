"""Dashboard Knowledge Builder Module for BetaBuddy Chatbot.

Converts ONE startup validation result payload into an immutable, in-memory
DashboardKnowledge structure.

Performance & Design:
- Immutable (frozen=True)
- In-memory transformation (< 2 ms)
- Normalization (None -> "", missing arrays -> [], missing dicts -> {})
- Deduplication & Whitespace Trimming
- Zero external API calls, zero embeddings, zero vector DBs, zero Gemini calls
"""

import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.logging_config import get_logger

logger = get_logger("chatbot.knowledge_builder")


@dataclass(frozen=True)
class DashboardKnowledge:
    """Immutable in-memory structured knowledge base for a single startup validation dashboard."""

    metadata: Dict[str, Any] = field(default_factory=dict)
    executive_summary: str = ""
    validation_score: Dict[str, Any] = field(default_factory=dict)
    swot: Dict[str, Any] = field(default_factory=dict)
    competitors: List[Dict[str, Any]] = field(default_factory=list)
    market_opportunity: Dict[str, Any] = field(default_factory=dict)
    business_risks: List[Any] = field(default_factory=list)
    recommendations: Dict[str, Any] = field(default_factory=dict)
    business_model: Dict[str, Any] = field(default_factory=dict)


def _clean_str(val: Any) -> str:
    """Normalize string values: None -> "", trim whitespace."""
    if val is None:
        return ""
    if not isinstance(val, str):
        val = str(val)
    return val.strip()


def _clean_list(val: Any) -> List[Any]:
    """Normalize list values: None -> [], deduplicate preserving order."""
    if not isinstance(val, list):
        return []
    cleaned = []
    seen = set()
    for item in val:
        if isinstance(item, str):
            item_str = item.strip()
            if item_str and item_str not in seen:
                seen.add(item_str)
                cleaned.append(item_str)
        elif item is not None and item not in cleaned:
            cleaned.append(item)
    return cleaned


def _clean_dict(val: Any) -> Dict[str, Any]:
    """Normalize dict values: None -> {}."""
    if not isinstance(val, dict):
        return {}
    return {k: v for k, v in val.items() if v is not None}


class DashboardKnowledgeBuilder:
    """Builder class that parses and structures raw validation results into DashboardKnowledge."""

    @staticmethod
    def build(validation_result: Optional[dict] = None, dashboard_id: Optional[str] = None) -> DashboardKnowledge:
        """Build an immutable DashboardKnowledge object from a raw validation result dictionary.

        Args:
            validation_result: Raw validation output payload dictionary.
            dashboard_id: Optional dashboard identifier string.

        Returns:
            DashboardKnowledge: Immutable structured knowledge object.
        """
        start_time = time.perf_counter()
        logger.info("Knowledge Build Started (dashboard_id: '%s')", dashboard_id or "auto")

        if not isinstance(validation_result, dict):
            validation_result = {}

        dash_id = _clean_str(dashboard_id) or f"dash_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        web_search = _clean_dict(validation_result.get("web_search"))
        market_opp = _clean_dict(validation_result.get("market_opportunity"))
        competitor_analysis = _clean_dict(validation_result.get("competitor_analysis"))
        comparison = _clean_dict(validation_result.get("comparison"))

        # 1. Executive Summary
        executive_summary = (
            _clean_str(validation_result.get("executiveSummary"))
            or _clean_str(web_search.get("summary"))
            or _clean_str(comparison.get("final_value_proposition"))
        )

        # 2. Validation Score
        score_val = (
            validation_result.get("validationScore")
            or market_opp.get("marketOpportunityScore")
            or 75
        )
        status_val = _clean_str(validation_result.get("status")) or "Validated"
        verdict_val = (
            _clean_str(validation_result.get("verdict"))
            or _clean_str(market_opp.get("scoreExplanation"))
            or "Promising"
        )

        validation_score = {
            "score": score_val,
            "status": status_val,
            "verdict": verdict_val,
            "explanation": _clean_str(market_opp.get("scoreExplanation")),
        }

        # 3. SWOT
        raw_swot = _clean_dict(validation_result.get("swot"))
        biz_insights = _clean_dict(comparison.get("business_insights"))

        strengths = _clean_list(raw_swot.get("strengths") or biz_insights.get("strengths"))
        weaknesses = _clean_list(raw_swot.get("weaknesses") or biz_insights.get("weaknesses"))
        opportunities = _clean_list(raw_swot.get("opportunities") or biz_insights.get("opportunities"))
        threats = _clean_list(raw_swot.get("threats") or comparison.get("threats"))

        swot = {
            "strengths": strengths,
            "weaknesses": weaknesses,
            "opportunities": opportunities,
            "threats": threats,
        }

        # 4. Competitors
        raw_comps = (
            competitor_analysis.get("competitors")
            or validation_result.get("competitors")
            or []
        )
        competitors = []
        if isinstance(raw_comps, list):
            for c in raw_comps:
                if isinstance(c, dict):
                    competitors.append({
                        "name": _clean_str(c.get("name")),
                        "description": _clean_str(c.get("description")),
                        "key_features": _clean_list(c.get("key_features") or c.get("keyFeatures")),
                        "pricing": _clean_str(c.get("pricing")),
                        "website": _clean_str(c.get("website")),
                    })

        # 5. Market Opportunity
        raw_mkt_opp = _clean_dict(market_opp.get("marketOpportunity"))
        industry_insights = _clean_dict(market_opp.get("industryInsights"))
        customer_insights = _clean_dict(market_opp.get("customerInsights"))

        market_opportunity = {
            "tam": _clean_str(web_search.get("market_size") or raw_mkt_opp.get("TAM")),
            "sam": _clean_str(raw_mkt_opp.get("SAM")),
            "som": _clean_str(raw_mkt_opp.get("SOM")),
            "growth_rate": _clean_str(web_search.get("growth_rate") or industry_insights.get("growthRate")),
            "trends": _clean_list(web_search.get("market_trends") or industry_insights.get("trends")),
            "customer_segments": _clean_list(customer_insights.get("targetSegments")),
        }

        # 6. Business Risks
        business_risks = _clean_list(
            validation_result.get("risks")
            or comparison.get("threats")
            or swot.get("threats")
        )

        # 7. Recommendations
        strategic_recs = _clean_list(
            validation_result.get("recommendations")
            or comparison.get("strategic_recommendations")
            or market_opp.get("recommendations")
        )
        personalized_recs = _clean_dict(comparison.get("personalized_recommendations"))

        recommendations = {
            "strategic": strategic_recs,
            "personalized": personalized_recs,
        }

        # 8. Business Model
        business_model = {
            "idea": _clean_str(validation_result.get("idea") or web_search.get("startupIdea")),
            "description": _clean_str(validation_result.get("description") or web_search.get("description")),
            "industry": _clean_str(web_search.get("industry") or industry_insights.get("industry")),
            "country": _clean_str(web_search.get("target_country") or market_opp.get("location")),
            "target_customer": _clean_str(web_search.get("target_customer")),
            "business_model_type": _clean_str(web_search.get("business_model")),
            "key_features": _clean_list(comparison.get("startup_features")),
            "value_proposition": _clean_str(comparison.get("final_value_proposition")),
        }

        # Available Section Names list
        section_names = [
            "executive_summary",
            "validation_score",
            "swot",
            "competitors",
            "market_opportunity",
            "business_risks",
            "recommendations",
            "business_model",
        ]

        available_sections = [
            sec for sec in section_names
            if bool(locals().get(sec))
        ]

        metadata = {
            "dashboard_id": dash_id,
            "created_at": now_iso,
            "version": "1.0",
            "section_names": section_names,
            "available_sections": available_sections,
        }

        knowledge = DashboardKnowledge(
            metadata=metadata,
            executive_summary=executive_summary,
            validation_score=validation_score,
            swot=swot,
            competitors=competitors,
            market_opportunity=market_opportunity,
            business_risks=business_risks,
            recommendations=recommendations,
            business_model=business_model,
        )

        elapsed_ms = (time.perf_counter() - start_time) * 1000
        logger.info(
            "Knowledge Build Finished (sections: %d/%d, build_time: %.2f ms)",
            len(available_sections),
            len(section_names),
            elapsed_ms,
        )

        return knowledge
