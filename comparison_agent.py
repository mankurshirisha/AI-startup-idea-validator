import json
import os
import re
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from app.config import GEMINI_API_KEY
except ImportError:
    from .app.config import GEMINI_API_KEY

from app.gemini_client import generate_content
from app.logging_config import get_logger

os.environ.setdefault("UVICORN_PORT", "8902")

logger = get_logger("comparison_agent")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Competitor(BaseModel):
    name: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    key_features: Optional[List[str]] = None
    target_customers: Optional[str] = None
    pricing: Optional[str] = None
    source: Optional[str] = None


class ComparisonRequest(BaseModel):
    startupIdea: str
    description: str = ""
    industry: str = ""
    competitors: List[Optional[Competitor]] = []
    location: str = "Global"
    businessModel: str = "B2B"
    targetCustomer: str = ""
    keyFeatures: List[str] = []
    startupStage: str = "Idea"


def _parse_json_payload(content: str, default=None):
    """Safely parse a JSON payload returned by the model."""

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        logger.info("Falling back to the provided default payload")
        return default


def _empty_competitor_payload() -> dict:
    return {
        "name": "Unknown Competitor",
        "website": "",
        "description": "",
        "key_features": [],
        "target_customers": "",
        "pricing": "",
        "source": "",
    }


def _normalize_competitor(competitor: Competitor | dict | None) -> dict:
    """Normalize competitor payloads from different agent outputs."""

    if competitor is None:
        return _empty_competitor_payload()

    if isinstance(competitor, Competitor):
        competitor_data = competitor.model_dump()
    elif isinstance(competitor, dict):
        competitor_data = competitor
    else:
        return _empty_competitor_payload()

    return {
        "name": str(competitor_data.get("name") or "Unknown Competitor").strip(),
        "website": str(competitor_data.get("website") or "").strip(),
        "description": str(competitor_data.get("description") or "").strip(),
        "key_features": normalize_feature_list(
            competitor_data.get("key_features") or []
        ),
        "target_customers": str(competitor_data.get("target_customers") or "").strip(),
        "pricing": str(competitor_data.get("pricing") or "").strip(),
        "source": str(competitor_data.get("source") or "").strip(),
    }


def _default_insights() -> dict:
    """Return the fallback business insight payload."""

    return {
        "strengths": [],
        "weaknesses": [],
        "opportunities": [],
        "recommendations": [],
    }


def _fallback_startup_features(startup: str, description: str) -> dict:
    """Provide deterministic startup features when external AI calls are unavailable."""

    combined_text = f"{startup} {description}".lower()
    tokens = re.findall(r"[a-z0-9]+", combined_text)
    stop_words = {
        "the",
        "and",
        "for",
        "with",
        "that",
        "this",
        "platform",
        "startup",
        "app",
        "help",
        "helps",
        "ideas",
        "idea",
        "users",
        "user",
        "business",
        "service",
        "system",
        "online",
    }

    keywords = [token for token in tokens if token not in stop_words and len(token) > 2]
    features = []

    if "ai" in combined_text or "artificial" in combined_text:
        features.append("ai-powered assistance")
    if "resume" in combined_text:
        features.append("resume optimization")
    if "interview" in combined_text:
        features.append("interview preparation")
    if "job" in combined_text:
        features.append("career guidance")
    if not features and keywords:
        features.append(keywords[0])
    if not features:
        features.append("core workflow automation")

    return {"startup_features": features}


def _call_gemini(prompt: str, timeout: int = 15) -> str:
    """Send a request to Google AI Studio Gemini and return the response content."""

    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured.")

    try:
        return generate_content(prompt)
    except Exception:
        logger.exception("Gemini comparison request failed")
        raise ValueError(
            "Unable to generate comparison analysis at the moment."
        ) from None


def _fallback_personalized_recommendations(
    startup: str,
    industry: str,
    target_customer: str,
    business_model: str,
    location: str,
) -> dict:
    """Return safe, context-aware fallback recommendations when Gemini fails."""
    cust = target_customer or "target customers"
    ind = industry or "your industry"
    loc = location or "your target market"
    bm = business_model or "your business model"
    return {
        "innovation": f"Differentiate {startup} by adding unique features that directly solve the biggest pain points of {cust} in {ind}.",
        "market_demand": f"Run a focused pilot with a small group of {cust} in {loc} to validate demand before scaling your {bm} model.",
        "competition": f"Identify the single feature gap most competitors in {ind} leave unaddressed and build your positioning around it.",
        "scalability": f"Design your core workflows to serve additional customer segments beyond {cust} as the business grows into {loc}.",
        "technical_feasibility": f"Prioritize product reliability, user data security, and a simple onboarding experience for {cust} from day one.",
        "business_viability": f"Test at least two pricing tiers with {cust} early to find the model that balances acquisition and sustainable revenue.",
    }


def _compact_competitors(competitors: List[dict]) -> str:
    """Serialize competitor list compactly (top 5 max, truncated descriptions)."""
    lines = []
    for c in (competitors or [])[:5]:
        compacted = {
            "name": c.get("name") or "Unknown",
            "description": (c.get("description") or "")[:150],
            "key_features": (c.get("key_features") or [])[:3],
            "pricing": c.get("pricing") or "N/A",
        }
        lines.append(json.dumps(compacted, ensure_ascii=False))
    return "[\n" + ",\n".join(lines) + "\n]"


def _build_single_analysis_prompt(
    startup: str,
    description: str,
    industry: str,
    competitors: List[dict],
    location: str = "Global",
    business_model: str = "B2B",
    target_customer: str = "",
    startup_stage: str = "Idea",
) -> str:
    cust = target_customer or "General consumers"
    return f"""\
Compare startup "{startup}" against competitors.
Startup: {startup} | {description}
Industry: {industry} | Target: {cust} | Model: {business_model} | Stage: {startup_stage} | Region: {location}

Competitors:
{_compact_competitors(competitors)}

Rules: Plain English, direct, realistic. No buzzwords (leverage, cutting-edge, game-changing). Personalized recommendations must be exactly ONE sentence (15-25 words) specific to this startup in {location}.

Return ONLY valid JSON (no markdown/fences) matching this exact schema:
{{
  "startup_features": ["<core feature 1>", "<core feature 2>"],
  "feature_comparison": [
    {{
      "competitor": "<competitor name>",
      "common_features": ["<shared feature>"],
      "startup_unique_features": ["<startup unique feature>"],
      "competitor_unique_features": ["<competitor unique feature>"]
    }}
  ],
  "similarity_scores": [
    {{"competitor": "<competitor name>", "similarity_score": 85.0}}  // 0.0=different, 100.0=identical
  ],
  "market_gaps": [
    {{
      "competitor": "<competitor name>",
      "startup_advantages": ["<advantage>"],
      "competitor_advantages": ["<advantage>"],
      "gap_summary": "<unmet customer need>"
    }}
  ],
  "strategic_recommendations": ["<6-month action 1>", "<6-month action 2>"],
  "threats": ["<honest competitive/market risk 1>", "<risk 2>"],
  "business_insights": {{
    "strengths": ["<genuine strength>"],
    "weaknesses": ["<honest gap vs competitors>"],
    "opportunities": ["<unserved door in {location}>"],
    "recommendations": ["<concrete step for founder>"]
  }},
  "final_value_proposition": "<1 clear sentence why choose this startup over competitors>",
  "personalized_recommendations": {{
    "innovation": "<15-25 word sentence on unique product tweak for {cust} in {industry}>",
    "market_demand": "<15-25 word sentence on reaching {cust} in {location}>",
    "competition": "<15-25 word sentence on core positioning vs competitors>",
    "scalability": "<15-25 word sentence on realistic scaling for {business_model}>",
    "technical_feasibility": "<15-25 word sentence on reliability & UX>",
    "business_viability": "<15-25 word sentence on pricing/revenue model in {location}>"
  }}
}}
"""


def _fallback_analysis_payload(
    startup: str, description: str, competitors: List[dict]
) -> dict:
    fallback_startup_features = _fallback_startup_features(startup, description)
    startup_features = fallback_startup_features.get("startup_features", [])

    comparison_results = []
    normalized_startup_features = normalize_feature_list(startup_features)

    for competitor in competitors:
        normalized_competitor_features = normalize_feature_list(
            competitor.get("key_features") or []
        )
        startup_set = set(normalized_startup_features)
        competitor_set = set(normalized_competitor_features)

        comparison_results.append(
            {
                "competitor": competitor.get("name", "Unknown Competitor"),
                "common_features": list(startup_set & competitor_set),
                "startup_unique_features": list(startup_set - competitor_set),
                "competitor_unique_features": list(competitor_set - startup_set),
            }
        )

    similarity_results = []
    for result in comparison_results:
        total_startup_features = len(result.get("startup_unique_features", [])) + len(
            result.get("common_features", [])
        )
        similarity_score = (
            round(
                (len(result.get("common_features", [])) / total_startup_features) * 100,
                1,
            )
            if total_startup_features
            else 0.0
        )
        similarity_results.append(
            {
                "competitor": result["competitor"],
                "similarity_score": similarity_score,
            }
        )

    gap_results = []
    for result in comparison_results:
        startup_advantages = result.get("startup_unique_features", [])
        competitor_advantages = result.get("competitor_unique_features", [])

        if startup_advantages:
            gap_summary = f"Startup has advantages in: {', '.join(startup_advantages)}"
        elif competitor_advantages:
            gap_summary = f"Competitor leads in: {', '.join(competitor_advantages)}"
        else:
            gap_summary = "No clear feature gap identified."

        gap_results.append(
            {
                "competitor": result["competitor"],
                "startup_advantages": startup_advantages,
                "competitor_advantages": competitor_advantages,
                "gap_summary": gap_summary,
            }
        )

    return {
        "startup_features": startup_features,
        "feature_comparison": comparison_results,
        "similarity_scores": similarity_results,
        "market_gaps": gap_results,
        "strategic_recommendations": [],
        "threats": [],
        "business_insights": _default_insights(),
        "final_value_proposition": f"{startup} addresses core market needs with a focused product experience.",
        "personalized_recommendations": _fallback_personalized_recommendations(
            startup, "", "", "B2B", "Global"
        ),
    }


def _normalize_single_analysis_payload(
    payload: dict,
    startup: str,
    description: str,
    competitors: List[dict],
    location: str = "Global",
    business_model: str = "B2B",
    target_customer: str = "",
    startup_stage: str = "Idea",
) -> dict:
    if not isinstance(payload, dict):
        return _fallback_analysis_payload(startup, description, competitors)

    startup_features = payload.get("startup_features")
    if not isinstance(startup_features, (list, tuple, set)):
        startup_features = _fallback_startup_features(startup, description).get(
            "startup_features", []
        )

    feature_comparison = payload.get("feature_comparison", [])
    if not isinstance(feature_comparison, list):
        feature_comparison = []

    similarity_scores = payload.get("similarity_scores", [])
    if not isinstance(similarity_scores, list):
        similarity_scores = []

    market_gaps = payload.get("market_gaps", [])
    if not isinstance(market_gaps, list):
        market_gaps = []

    business_insights = payload.get("business_insights", {})
    if not isinstance(business_insights, dict):
        business_insights = _default_insights()

    # Validate personalized_recommendations — must be a dict with all 6 string keys.
    raw_pr = payload.get("personalized_recommendations", {})
    required_keys = {
        "innovation", "market_demand", "competition",
        "scalability", "technical_feasibility", "business_viability",
    }
    if (
        isinstance(raw_pr, dict)
        and required_keys.issubset(raw_pr.keys())
        and all(isinstance(raw_pr.get(k), str) and raw_pr.get(k).strip() for k in required_keys)
    ):
        personalized_recommendations = {k: raw_pr[k].strip() for k in required_keys}
    else:
        personalized_recommendations = _fallback_personalized_recommendations(
            startup, startup_stage, target_customer, business_model, location
        )

    return {
        "startup_features": normalize_feature_list(list(startup_features)),
        "feature_comparison": feature_comparison,
        "similarity_scores": similarity_scores,
        "market_gaps": market_gaps,
        "strategic_recommendations": payload.get("strategic_recommendations", []),
        "threats": payload.get("threats", []),
        "business_insights": {
            "strengths": business_insights.get("strengths", []),
            "weaknesses": business_insights.get("weaknesses", []),
            "opportunities": business_insights.get("opportunities", []),
            "recommendations": business_insights.get("recommendations", []),
        },
        "final_value_proposition": payload.get("final_value_proposition", ""),
        "personalized_recommendations": personalized_recommendations,
    }


def _generate_single_analysis_payload(
    startup: str,
    description: str,
    industry: str,
    competitors: List[dict],
    location: str = "Global",
    business_model: str = "B2B",
    target_customer: str = "",
    startup_stage: str = "Idea",
) -> dict:
    logger.info("Starting comparison analysis request")
    prompt = _build_single_analysis_prompt(
        startup, description, industry, competitors,
        location=location,
        business_model=business_model,
        target_customer=target_customer,
        startup_stage=startup_stage,
    )

    try:
        logger.info("Starting Gemini comparison analysis request")
        content = _call_gemini(prompt)
        parsed_content = _parse_json_payload(content, {})
        payload = _normalize_single_analysis_payload(
            parsed_content, startup, description, competitors,
            location=location,
            business_model=business_model,
            target_customer=target_customer,
            startup_stage=startup_stage,
        )
        logger.info("Comparison analysis completed successfully")
        return payload
    except (ValueError, KeyError, TypeError):
        logger.exception("Single Gemini analysis failed; using fallback analysis")
        return _fallback_analysis_payload(startup, description, competitors)


def normalize_feature_list(features: List[str]) -> List[str]:
    """Normalize a list of feature names for comparison.

    Args:
        features: The feature names to normalize.

    Returns:
        List[str]: A normalized list of lowercase feature names with duplicates removed.
    """
    if features is None:
        return []
    if isinstance(features, str):
        features = [features]
    elif not isinstance(features, (list, tuple, set)):
        return []

    normalized_features = []
    seen_features = set()

    for feature in features:
        if not isinstance(feature, str):
            continue

        cleaned_feature = feature.strip().lower()
        if cleaned_feature and cleaned_feature not in seen_features:
            normalized_features.append(cleaned_feature)

    return normalized_features


def run_comparison_agent(
    startup_idea: str,
    description: str = "",
    industry: str = "",
    competitors: List[dict] = None,
    location: str = "Global",
    business_model: str = "B2B",
    target_customer: str = "",
    key_features: List[str] = None,
    startup_stage: str = "Idea",
) -> dict:
    """Run the comparison and insight generation workflow.

    Args:
        startup_idea: The startup idea being analyzed.
        description: A description of the startup idea.
        industry: Industry sector.
        competitors: List of competitor dicts or Competitor objects.
        location: Target country or region.
        business_model: Business model.
        target_customer: Target customer segment.
        key_features: List of key features.
        startup_stage: Stage of the startup (Idea, MVP, Pre-Revenue, etc.).

    Returns:
        dict: A structured comparison response with business insights.
    """
    try:
        startup = startup_idea.strip() if startup_idea else ""
        description = description.strip() if description else startup
        industry = industry.strip() if industry else "Technology"
        competitors = competitors or []

        normalized_competitors = [
            _normalize_competitor(competitor) for competitor in competitors
        ]

        if not startup:
            raise HTTPException(status_code=400, detail="Startup idea cannot be empty.")

        analysis_payload = _generate_single_analysis_payload(
            startup,
            description,
            industry,
            normalized_competitors,
            location=location,
            business_model=business_model,
            target_customer=target_customer,
            startup_stage=startup_stage,
        )

        return {
            "status": "success",
            "startup": startup,
            "description": description,
            "industry": industry,
            "location": location,
            "businessModel": business_model,
            "targetCustomer": target_customer,
            "keyFeatures": key_features or [],
            "startup_features": analysis_payload.get("startup_features", []),
            # FIX: key was incorrectly "comparison"; _generate_single_analysis_payload
            # produces "feature_comparison" — this caused the frontend to always
            # receive an empty comparison array.
            "feature_comparison": analysis_payload.get("feature_comparison", []),
            "similarity_scores": analysis_payload.get("similarity_scores", []),
            "market_gaps": analysis_payload.get("market_gaps", []),
            "strategic_recommendations": analysis_payload.get("strategic_recommendations", []),
            "threats": analysis_payload.get("threats", []),
            "business_insights": analysis_payload.get("business_insights", {}),
            "final_value_proposition": analysis_payload.get("final_value_proposition", ""),
            "personalized_recommendations": analysis_payload.get(
                "personalized_recommendations",
                _fallback_personalized_recommendations(
                    startup, industry, target_customer, business_model, location
                ),
            ),
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unexpected error in comparison agent")
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(exc)}",
        ) from None


@app.get("/")
def home():
    return {"message": "Comparison Agent Running"}


@app.post("/api/comparison-agent")
def analyze_comparison(request: ComparisonRequest):
    return run_comparison_agent(
        startup_idea=request.startupIdea,
        description=request.description,
        industry=request.industry,
        competitors=request.competitors,
        location=request.location,
        business_model=request.businessModel,
        target_customer=request.targetCustomer,
        key_features=request.keyFeatures,
        startup_stage=request.startupStage,
    )


if __name__ == "__main__":
    import uvicorn

    logger.info("Starting comparison agent server on http://127.0.0.1:8902")
    uvicorn.run(app, host="127.0.0.1", port=8902)
