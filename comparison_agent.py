import json
import logging
import os
import re
from typing import List, Optional

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()
os.environ.setdefault("UVICORN_PORT", "8902")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("comparison_agent")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
MODEL_NAME = "google/gemini-2.5-flash"

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
        "key_features": normalize_feature_list(competitor_data.get("key_features") or []),
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


def _call_openrouter(prompt: str, timeout: int = 15) -> str:
    """Send a request to OpenRouter and return the response content."""

    if not OPENROUTER_API_KEY:
        raise ValueError("OpenRouter API key is missing.")

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    body = {
        "model": MODEL_NAME,
        "messages": [
            {
                "role": "user",
                "content": prompt,
            }
        ],
    }

    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=body,
            timeout=timeout,
        )
    except requests.Timeout as exc:
        raise ValueError(f"OpenRouter request timed out: {exc}") from exc
    except requests.RequestException as exc:
        raise ValueError(f"OpenRouter request failed: {exc}") from exc

    try:
        response.raise_for_status()
    except requests.HTTPError as exc:
        status_code = exc.response.status_code if exc.response is not None else "unknown"
        detail = exc.response.text if exc.response is not None else str(exc)
        raise ValueError(f"OpenRouter returned HTTP {status_code}: {detail}") from exc

    try:
        payload = response.json()
    except ValueError as exc:
        raise ValueError("OpenRouter returned invalid JSON.") from exc

    try:
        content = payload["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError) as exc:
        raise ValueError("OpenRouter returned an unexpected response format.") from exc

    if content.startswith("```"):
        content = content.replace("```json", "")
        content = content.replace("```", "")
        content = content.strip()

    return content


def extract_startup_features(startup: str, description: str):
    """Extract startup features from the provided description."""

    prompt = f"""
You are an expert startup analyst.

Startup Idea:
{startup}

Description:
{description}

Extract the core product features of this startup.

Return ONLY valid JSON in the following format:

{{
  "startup_features": [
    "feature 1",
    "feature 2",
    "feature 3"
  ]
}}

Do not include explanations.
"""

    try:
        content = _call_openrouter(prompt)
    except ValueError:
        logger.warning("Falling back to local startup feature extraction")
        return _fallback_startup_features(startup, description)

    parsed_content = _parse_json_payload(content)
    if not isinstance(parsed_content, dict):
        logger.warning("Startup feature payload was invalid; using fallback extraction")
        return _fallback_startup_features(startup, description)
    if not isinstance(parsed_content.get("startup_features"), (list, tuple, set)):
        logger.warning("Startup feature payload structure was invalid; using fallback extraction")
        return _fallback_startup_features(startup, description)

    return parsed_content


def normalize_feature_list(features: List[str]) -> List[str]:
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
    """Compare startup features against each competitor's features."""

    comparison_results = []
    normalized_startup_features = normalize_feature_list(startup_features)

    for competitor in competitors:
        normalized_competitor = _normalize_competitor(competitor)
        normalized_competitor_features = normalized_competitor["key_features"]

        try:
            if not OPENROUTER_API_KEY:
                raise ValueError("OpenRouter API key is not configured.")

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

            content = _call_openrouter(prompt)
            parsed_result = _parse_json_payload(content, {})

            if not isinstance(parsed_result, dict):
                raise ValueError("OpenRouter returned an invalid comparison payload.")

            common_features = normalize_feature_list(parsed_result.get("common_features", []))
            unique_startup_features = normalize_feature_list(parsed_result.get("startup_unique_features", []))
            unique_competitor_features = normalize_feature_list(parsed_result.get("competitor_unique_features", []))

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


def calculate_similarity(comparison_results: List[dict]) -> List[dict]:
    """Calculate similarity percentage for each competitor."""

    similarity_results = []

    for result in comparison_results:
        total_startup_features = len(result.get("startup_unique_features", [])) + len(result.get("common_features", []))

        if total_startup_features == 0:
            similarity_score = 0.0
        else:
            similarity_score = round((len(result.get("common_features", [])) / total_startup_features) * 100, 1)

        similarity_results.append(
            {
                "competitor": result["competitor"],
                "similarity_score": similarity_score,
            }
        )

    return similarity_results


def identify_gaps(comparison_results: List[dict]) -> List[dict]:
    """Summarize startup and competitor advantages."""

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

    return gap_results


def generate_business_insights(
    startup: str,
    description: str,
    comparison_results: List[dict],
    similarity_results: List[dict],
    gap_results: List[dict],
) -> dict:
    """Generate business insights from startup and comparison data."""

    prompt = f"""
You are an expert startup strategist.

Startup Idea:
{startup}

Startup Description:
{description}

Comparison Results:
{json.dumps(comparison_results, indent=2)}

Similarity Scores:
{json.dumps(similarity_results, indent=2)}

Market Gaps:
{json.dumps(gap_results, indent=2)}

Return ONLY valid JSON in the following format:
{{
  "strengths": ["..."],
  "weaknesses": ["..."],
  "opportunities": ["..."],
  "recommendations": ["..."]
}}

Do not include explanations.
"""

    try:
        content = _call_openrouter(prompt)
        parsed_content = _parse_json_payload(content, {})

        if not isinstance(parsed_content, dict):
            logger.warning("Business insight payload was invalid; using defaults")
            return _default_insights()

        return {
            "strengths": parsed_content.get("strengths", []),
            "weaknesses": parsed_content.get("weaknesses", []),
            "opportunities": parsed_content.get("opportunities", []),
            "recommendations": parsed_content.get("recommendations", []),
        }
    except (ValueError, KeyError, TypeError):
        logger.warning("Business insights generation failed; using defaults")
        return _default_insights()


@app.post("/api/comparison-agent")
def comparison_agent(payload: ComparisonRequest):
    logger.info("Incoming API request: /api/comparison-agent")
    try:
        startup = payload.startupIdea.strip()
        description = payload.description.strip()
        industry = payload.industry.strip()

        logger.info("Received startup idea: %s", startup)
        logger.info("Competitors received: %s", len(payload.competitors))

        normalized_competitors = [_normalize_competitor(competitor) for competitor in payload.competitors]

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

        if len(payload.competitors) == 0:
            logger.warning("Validation failed: no competitors provided")
            raise HTTPException(
                status_code=400,
                detail="At least one competitor is required.",
            )

        startup_features = extract_startup_features(startup, description)
        comparison = compare_features(startup_features["startup_features"], normalized_competitors)
        similarity = calculate_similarity(comparison)
        gaps = identify_gaps(comparison)
        insights = generate_business_insights(startup, description, comparison, similarity, gaps)

        response_payload = {
            "status": "success",
            "startup": startup,
            "description": description,
            "industry": industry,
            "startup_features": startup_features["startup_features"],
            "comparison": comparison,
            "similarity_scores": similarity,
            "market_gaps": gaps,
            "business_insights": insights,
        }
        logger.info("API success response prepared for startup idea: %s", startup)
        return response_payload
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unexpected error while processing comparison request")
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}",
        )


if __name__ == "__main__":
    import uvicorn

    logger.info("Starting comparison agent server on http://127.0.0.1:8902")
    uvicorn.run(app, host="127.0.0.1", port=8902)
