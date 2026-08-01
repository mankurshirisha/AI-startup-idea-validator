import json
import os
import re
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from app.config import GEMINI_API_KEY
except ImportError:
    from .app.config import GEMINI_API_KEY

from app.gemini_client import generate_content
from app.logging_config import get_logger

load_dotenv()
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
    description: str
    industry: str
    competitors: List[Optional[Competitor]]


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


def _build_single_analysis_prompt(
    startup: str, description: str, industry: str, competitors: List[dict]
) -> str:
    return f"""
You are an expert startup strategist and product analyst.

Startup Idea:
{startup}

Startup Description:
{description}

Industry:
{industry}

Competitors:
{json.dumps(competitors, indent=2)}

Analyze the startup against the competitors and return ONLY valid JSON with this schema:

{{
  "startup_features": ["feature 1", "feature 2"],
  "feature_comparison": [
    {{
      "competitor": "Competitor Name",
      "common_features": ["feature 1"],
      "startup_unique_features": ["feature 2"],
      "competitor_unique_features": ["feature 3"]
    }}
  ],
  "similarity_scores": [
    {{"competitor": "Competitor Name", "similarity_score": 80.0}}
  ],
  "market_gaps": [
    {{
      "competitor": "Competitor Name",
      "startup_advantages": ["feature 1"],
      "competitor_advantages": ["feature 2"],
      "gap_summary": "..."
    }}
  ],
  "strategic_recommendations": ["..."],
  "threats": ["..."],
  "business_insights": {{
    "strengths": ["..."],
    "weaknesses": ["..."],
    "opportunities": ["..."],
    "recommendations": ["..."]
  }},
  "final_value_proposition": "..."
}}

Do not include explanations.
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
    }


def _normalize_single_analysis_payload(
    payload: dict, startup: str, description: str, competitors: List[dict]
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
    }


def _generate_single_analysis_payload(
    startup: str, description: str, industry: str, competitors: List[dict]
) -> dict:
    logger.info("Starting comparison analysis request")
    prompt = _build_single_analysis_prompt(startup, description, industry, competitors)

    try:
        logger.info("Starting Gemini comparison analysis request")
        content = _call_gemini(prompt)
        parsed_content = _parse_json_payload(content, {})
        payload = _normalize_single_analysis_payload(
            parsed_content, startup, description, competitors
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
    """Normalize feature names for reliable comparison."""

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
            seen_features.add(cleaned_feature)

    return normalized_features


def compare_features(startup_features: List[str], competitors: List[Competitor]):
    """Compare startup features against each competitor's features.

    Args:
        startup_features: The startup's feature list.
        competitors: A list of competitor objects to compare against.

    Returns:
        list: A list of comparison results for each competitor.
    """
    """Compare startup features against each competitor's features."""

    comparison_results = []
    normalized_startup_features = normalize_feature_list(startup_features)

    for competitor in competitors:
        normalized_competitor = _normalize_competitor(competitor)
        normalized_competitor_features = normalized_competitor["key_features"]

        try:
            if not GEMINI_API_KEY:
                raise ValueError("GEMINI_API_KEY is not configured.")

            prompt = f"""
You are an expert product analyst.

Startup features:
{json.dumps(normalized_startup_features)}

Competitor features:
{json.dumps(normalized_competitor_features)}

Identify semantic matches between the two lists.
Treat features with similar meaning as matches, for example:
"AI Resume Writing" and "AI-powered Resume Creation" should be considered the same.

Return ONLY valid JSON in this exact format:
{{
  "common_features": ["feature 1", "feature 2"],
  "startup_unique_features": ["feature 3"],
  "competitor_unique_features": ["feature 4"]
}}

Do not include explanations.
"""

            content = _call_gemini(prompt)
            parsed_result = _parse_json_payload(content, {})

            if not isinstance(parsed_result, dict):
                raise ValueError("Gemini returned an invalid comparison payload.")

            common_features = normalize_feature_list(
                parsed_result.get("common_features", [])
            )
            unique_startup_features = normalize_feature_list(
                parsed_result.get("startup_unique_features", [])
            )
            unique_competitor_features = normalize_feature_list(
                parsed_result.get("competitor_unique_features", [])
            )

        except (ValueError, TypeError, AttributeError, KeyError):
            startup_set = set(normalized_startup_features)
            competitor_set = set(normalized_competitor_features)

            common_features = list(startup_set & competitor_set)
            unique_startup_features = list(startup_set - competitor_set)
            unique_competitor_features = list(competitor_set - startup_set)

        comparison_results.append(
            {
                "competitor": normalized_competitor["name"],
                "common_features": common_features,
                "startup_unique_features": unique_startup_features,
                "competitor_unique_features": unique_competitor_features,
            }
        )

    return comparison_results


def run_comparison_agent(
    startup_idea: str, description: str, industry: str, competitors: list
):
    """Run the comparison analysis workflow.

    Args:
        startup_idea: The startup idea to evaluate.
        description: A description of the startup idea.
        industry: The industry associated with the startup.
        competitors: A list of competitor payloads to compare against.

    Returns:
        dict: A structured comparison response with business insights.

    Raises:
        HTTPException: If the input is invalid or the comparison workflow fails.
    """
    logger.info("Comparison agent request received")
    try:
        startup = startup_idea.strip()
        description = description.strip()
        industry = industry.strip()

        logger.info("Received startup idea: %s", startup)
        logger.info("Competitors received: %s", len(competitors))
        logger.info("Starting comparison processing")

        normalized_competitors = [
            _normalize_competitor(competitor) for competitor in competitors
        ]

        if not startup:
            logger.warning("Validation failed: startup idea is empty")
            raise HTTPException(
                status_code=400,
                detail="Startup idea cannot be empty.",
            )

        if not description:
            logger.warning("Validation failed: startup description is empty")
            raise HTTPException(
                status_code=400,
                detail="Startup description cannot be empty.",
            )

        if not industry:
            logger.warning("Validation failed: industry is empty")
            raise HTTPException(
                status_code=400,
                detail="Industry cannot be empty.",
            )

        if len(competitors) == 0:
            logger.warning("Validation failed: no competitors provided")
            raise HTTPException(
                status_code=400,
                detail="At least one competitor is required.",
            )

        analysis_payload = _generate_single_analysis_payload(
            startup,
            description,
            industry,
            [
                _normalize_competitor(competitor)
                for competitor in normalized_competitors
            ],
        )

        startup_features = analysis_payload.get("startup_features", [])
        comparison = analysis_payload.get("feature_comparison", [])
        similarity = analysis_payload.get("similarity_scores", [])
        gaps = analysis_payload.get("market_gaps", [])
        insights = analysis_payload.get("business_insights", _default_insights())

        response_payload = {
            "status": "success",
            "startup": startup,
            "description": description,
            "industry": industry,
            "startup_features": startup_features,
            "comparison": comparison,
            "similarity_scores": similarity,
            "market_gaps": gaps,
            "business_insights": insights,
        }
        logger.info(
            "Comparison agent completed successfully for startup idea: %s", startup
        )
        return response_payload
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unexpected error while processing comparison request")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while processing the comparison request.",
        ) from None


@app.post("/api/comparison-agent")
def comparison_agent(payload: ComparisonRequest):
    """Expose the comparison agent through the FastAPI endpoint.

    Args:
        payload: The incoming comparison request payload.

    Returns:
        dict: The comparison response generated by the agent.

    Raises:
        HTTPException: If the request is invalid or the comparison fails.
    """
    return run_comparison_agent(
        payload.startupIdea, payload.description, payload.industry, payload.competitors
    )


if __name__ == "__main__":
    import uvicorn

    logger.info("Starting comparison agent server on http://127.0.0.1:8902")
    uvicorn.run(app, host="127.0.0.1", port=8902)
