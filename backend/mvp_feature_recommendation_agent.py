import json
from typing import List, Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.gemini_client import generate_content
from app.logging_config import get_logger

logger = get_logger(__name__)

app = FastAPI(
    title="MVP Feature Recommendation Agent",
    version="1.1"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MVPFeatureRequest(BaseModel):
    startupIdea: str
    description: str = ""
    industry: str = ""
    location: str = "Global"
    startupStage: str = "Idea"
    businessModel: str = "B2B"
    targetCustomer: List[str] = Field(default_factory=list)
    keyFeatures: List[str] = Field(default_factory=list)
    marketOpportunity: Dict[str, Any] = Field(default_factory=dict)
    marketOpportunityScore: int = 0
    customerInsights: Dict[str, Any] = Field(default_factory=dict)
    recommendations: List[str] = Field(default_factory=list)
    competitors: List[Dict[str, Any]] = Field(default_factory=list)


@app.get("/")
def home():
    return {
        "message": "MVP Feature Recommendation Agent is Running Successfully!"
    }


_MVP_PROMPT_TEMPLATE = """\
You are an MVP Feature Recommendation Agent.

Your task is to identify and prioritize the most important features
that should be included in the Minimum Viable Product (MVP) of a startup.

Startup:
Idea: {startup_idea}
Description: {description}
Industry: {industry}
Location: {location}
Target Customers: {target_customer}
Business Model: {business_model}
Startup Stage: {startup_stage}

Existing Key Features:
{key_features}

Market Opportunity:
{market_opportunity}

Market Opportunity Score:
{market_score}

Customer Insights:
{customer_insights}

Market Recommendations:
{recommendations}

Competitor Information:
{competitors}

Prioritize features using these factors:

1. Market fit
2. Customer value
3. Resource constraints
4. Competitive importance
5. MVP necessity

IMPORTANT RULES:

- Select only the most important 3-6 features for the Initial MVP.
- Every feature listed under "Existing Key Features" MUST be accounted for.
- Every existing feature MUST appear exactly once:
  either inside "features" OR inside "deferredFeatures".
- NEVER silently omit an existing key feature.
- Use the original feature name whenever possible.
- If a feature is not important enough for the Initial MVP,
  place it in "deferredFeatures".
- Do not invent additional features unless absolutely necessary.
- Features selected for the MVP must have mvpPhase = "Initial MVP".
- Features that are postponed must be listed in "deferredFeatures".
- A deferred feature must NOT also appear in the "features" array.

Priority rules:

- High: Essential for validating the startup idea.
- Medium: Valuable but can be added after initial validation.
- Low: Useful later but not necessary for the first MVP.

Return ONLY valid JSON.
Do not use markdown or code fences.

Use exactly this schema:

{{
    "mvpRecommendation": {{
        "summary": "<short explanation of the recommended MVP>",
        "overallStrategy": "<short explanation of what the MVP should focus on>"
    }},
    "features": [
        {{
            "feature": "<feature name>",
            "priority": "High | Medium | Low",
            "marketFit": "High | Medium | Low",
            "customerValue": "High | Medium | Low",
            "resourceEffort": "Low | Medium | High",
            "reason": "<short explanation>",
            "mvpPhase": "Initial MVP | Post-MVP"
        }}
    ],
    "deferredFeatures": [
        "<feature that should be postponed>"
    ]
}}
"""


def normalize_feature_name(value: str) -> str:
    return " ".join(
        str(value).lower().strip().split()
    )


def build_fallback_features(key_features: List[str]) -> List[Dict[str, Any]]:
    fallback_features = []

    for feature in key_features[:3]:
        if not feature or not feature.strip():
            continue

        fallback_features.append({
            "feature": feature.strip(),
            "priority": "High",
            "marketFit": "Medium",
            "customerValue": "High",
            "resourceEffort": "Medium",
            "reason": "Feature supports the core startup value proposition.",
            "mvpPhase": "Initial MVP"
        })

    if not fallback_features:
        fallback_features = [
            {
                "feature": "Core product functionality",
                "priority": "High",
                "marketFit": "High",
                "customerValue": "High",
                "resourceEffort": "Medium",
                "reason": "Essential functionality required to validate the startup idea.",
                "mvpPhase": "Initial MVP"
            }
        ]

    return fallback_features


def run_mvp_feature_recommendation_agent(
    request: MVPFeatureRequest
) -> dict:

    logger.info(
        "MVP feature recommendation request received for startup: %s",
        request.startupIdea
    )

    if not request.startupIdea.strip():
        raise HTTPException(
            status_code=400,
            detail="Startup idea is required."
        )

    prompt = _MVP_PROMPT_TEMPLATE.format(
        startup_idea=request.startupIdea,
        description=request.description or request.startupIdea,
        industry=request.industry or "Technology",
        location=request.location or "Global",
        target_customer=(
            ", ".join(request.targetCustomer)
            if request.targetCustomer
            else "General customers"
        ),
        business_model=request.businessModel or "B2B",
        startup_stage=request.startupStage or "Idea",
        key_features=(
            ", ".join(request.keyFeatures)
            if request.keyFeatures
            else "No predefined features"
        ),
        market_opportunity=json.dumps(
            request.marketOpportunity,
            ensure_ascii=False
        ),
        market_score=request.marketOpportunityScore,
        customer_insights=json.dumps(
            request.customerInsights,
            ensure_ascii=False
        ),
        recommendations=json.dumps(
            request.recommendations,
            ensure_ascii=False
        ),
        competitors=json.dumps(
            request.competitors,
            ensure_ascii=False
        ),
    )

    fallback_features = build_fallback_features(
        request.keyFeatures
    )

    fallback_deferred = []

    for feature in request.keyFeatures[3:]:
        if feature and feature.strip():
            fallback_deferred.append(feature.strip())

    fallback = {
        "mvpRecommendation": {
            "summary": "Focus the MVP on a small number of high-value features.",
            "overallStrategy": (
                "Prioritize features that strongly address customer needs "
                "while keeping development effort manageable."
            )
        },
        "features": fallback_features,
        "deferredFeatures": fallback_deferred
    }

    try:

        logger.info(
            "Starting Gemini MVP feature recommendation request"
        )

        raw = generate_content(prompt)

        logger.info(
            "Gemini response received"
        )

        raw = raw.strip()

        if raw.startswith("```json"):
            raw = raw[7:]
        elif raw.startswith("```"):
            raw = raw[3:]

        if raw.endswith("```"):
            raw = raw[:-3]

        raw = raw.strip()

        parsed = json.loads(raw)

        if not isinstance(parsed, dict):
            raise ValueError(
                "Gemini response is not a JSON object"
            )

        features = parsed.get("features", [])

        if not isinstance(features, list):
            features = []

        valid_features = []

        for feature in features:

            if not isinstance(feature, dict):
                continue

            feature_name = feature.get("feature", "")

            if not isinstance(feature_name, str):
                continue

            feature_name = feature_name.strip()

            if not feature_name:
                continue

            if "mvpPhase" not in feature:
                feature["mvpPhase"] = "Initial MVP"

            valid_features.append(feature)

        features = valid_features

        deferred_features = parsed.get(
            "deferredFeatures",
            []
        )

        if not isinstance(deferred_features, list):
            deferred_features = []

        deferred_features = [
            str(feature).strip()
            for feature in deferred_features
            if str(feature).strip()
        ]

        input_features = [
            feature.strip()
            for feature in request.keyFeatures
            if feature and feature.strip()
        ]

        returned_feature_names = {
            normalize_feature_name(
                feature.get("feature", "")
            )
            for feature in features
        }

        returned_deferred_names = {
            normalize_feature_name(feature)
            for feature in deferred_features
        }

        missing_features = []

        for original_feature in input_features:

            normalized = normalize_feature_name(
                original_feature
            )

            if (
                normalized not in returned_feature_names
                and normalized not in returned_deferred_names
            ):
                missing_features.append(
                    original_feature
                )

        for feature in missing_features:

            if (
                normalize_feature_name(feature)
                not in returned_deferred_names
            ):
                deferred_features.append(feature)

                returned_deferred_names.add(
                    normalize_feature_name(feature)
                )

        unique_deferred = []
        seen_deferred = set()

        for feature in deferred_features:

            normalized = normalize_feature_name(
                feature
            )

            if normalized not in seen_deferred:
                seen_deferred.add(normalized)
                unique_deferred.append(feature)

        deferred_features = unique_deferred

        unique_features = []
        seen_features = set()

        for feature in features:

            normalized = normalize_feature_name(
                feature.get("feature", "")
            )

            if normalized in seen_features:
                continue

            seen_features.add(normalized)

            if feature.get("mvpPhase") not in [
                "Initial MVP",
                "Post-MVP"
            ]:
                feature["mvpPhase"] = "Initial MVP"

            unique_features.append(feature)

        features = unique_features

        mvp_feature_names = {
            normalize_feature_name(
                feature.get("feature", "")
            )
            for feature in features
        }

        deferred_features = [
            feature
            for feature in deferred_features
            if normalize_feature_name(feature)
            not in mvp_feature_names
        ]

        logger.info(
            "MVP feature recommendation completed successfully"
        )

        logger.info(
            "MVP features returned: %s",
            len(features)
        )

        logger.info(
            "Deferred features returned: %s",
            len(deferred_features)
        )

        return {
            "status": "success",
            "startupIdea": request.startupIdea,
            "industry": request.industry,
            "location": request.location,
            "mvpRecommendation": parsed.get(
                "mvpRecommendation",
                fallback["mvpRecommendation"]
            ),
            "features": features,
            "deferredFeatures": deferred_features
        }

    except Exception:

        logger.exception(
            "AI MVP recommendation failed; using fallback response"
        )

        return {
            "status": "success",
            "startupIdea": request.startupIdea,
            "industry": request.industry,
            "location": request.location,
            **fallback
        }


@app.post("/api/mvp-feature-agent")
def recommend_mvp_features(
    request: MVPFeatureRequest
):
    return run_mvp_feature_recommendation_agent(
        request
    )


if __name__ == "__main__":

    import uvicorn

    logger.info(
        "Starting MVP Feature Recommendation Agent on http://127.0.0.1:8904"
    )

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8904
    )