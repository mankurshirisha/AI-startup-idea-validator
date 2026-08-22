from typing import List, Dict, Any
from fastapi import FastAPI
from pydantic import BaseModel, Field
import json
from app.gemini_client import generate_content
from app.logging_config import get_logger

logger = get_logger("go_to_market_strategy_agent")

app = FastAPI(title="Go-to-Market Strategy Agent")


class GTMStrategyRequest(BaseModel):
    startupIdea: str
    targetCustomer: str = ""
    marketOpportunity: str = ""
    competitors: List[Dict[str, Any]] = Field(default_factory=list)
    swot: Dict[str, Any] = Field(default_factory=dict)
    recommendedFeatures: List[str] = Field(default_factory=list)


def build_fallback_response(request: GTMStrategyRequest):
    return {
        "status": "success",
        "startupIdea": request.startupIdea,
        "goToMarketStrategy": {
            "targetCustomer": (
                request.targetCustomer
                or "Early adopters and customers with the strongest need for the solution."
            ),
            "positioning": (
                "Position the startup as a focused solution to a clearly defined "
                "customer problem."
            ),
            "valueProposition": (
                "Deliver a simple and useful solution that solves the customer's "
                "most important pain point."
            ),
            "marketingChannels": [
                "Social media",
                "Content marketing",
                "Direct outreach",
                "Partnerships"
            ],
            "customerAcquisitionStrategy": [
                "Identify the highest-priority early adopters",
                "Run a small pilot",
                "Collect customer feedback",
                "Improve the MVP based on feedback",
                "Expand to similar customer segments"
            ],
            "pricingStrategy": (
                "Start with a simple introductory pricing model and validate "
                "willingness to pay."
            ),
            "launchPlan": [
                "Validate the target customer",
                "Launch the MVP",
                "Acquire the first users",
                "Measure feedback and usage",
                "Improve and scale"
            ],
            "nextSteps": [
                "Select the primary customer segment",
                "Define the core value proposition",
                "Choose the first marketing channels",
                "Launch a small pilot",
                "Measure customer response"
            ]
        }
    }


@app.post("/go-to-market-strategy")
def run_go_to_market_strategy(request: GTMStrategyRequest):
    logger.info(
        "Starting GTM Strategy generation for: %s",
        request.startupIdea
    )

    prompt = f"""
You are an expert startup Go-to-Market strategist.

Analyze the startup validation information below and create a practical,
specific and actionable Go-to-Market Strategy for an early-stage startup.

STARTUP IDEA:
{request.startupIdea}

TARGET CUSTOMER:
{request.targetCustomer}

MARKET OPPORTUNITY:
{request.marketOpportunity}

COMPETITORS:
{json.dumps(request.competitors, ensure_ascii=False)}

SWOT ANALYSIS:
{json.dumps(request.swot, ensure_ascii=False)}

RECOMMENDED MVP FEATURES:
{json.dumps(request.recommendedFeatures, ensure_ascii=False)}

Your strategy must be based ONLY on the information provided above.

Focus on:
- Who should be targeted first
- How the startup should position itself
- Why customers should choose it
- Which acquisition channels should be tested first
- How to acquire early customers
- A realistic early-stage pricing approach
- A practical launch sequence
- The most important immediate next steps

Do not invent statistics, market sizes, customer numbers, competitor facts,
or unsupported claims.

Return ONLY valid JSON.

Use EXACTLY this structure:

{{
  "targetCustomer": "",
  "positioning": "",
  "valueProposition": "",
  "marketingChannels": [],
  "customerAcquisitionStrategy": [],
  "pricingStrategy": "",
  "launchPlan": [],
  "nextSteps": []
}}

Keep the recommendations concise, practical and specific.
"""

    try:
        raw = generate_content(prompt)
        raw = (raw or "").strip()

        # Remove markdown code fences if the model adds them
        if raw.startswith("```"):
            raw = raw.replace("```json", "", 1)
            raw = raw.replace("```", "")
            raw = raw.strip()

        result = json.loads(raw)

        # Basic structure validation
        required_keys = [
            "targetCustomer",
            "positioning",
            "valueProposition",
            "marketingChannels",
            "customerAcquisitionStrategy",
            "pricingStrategy",
            "launchPlan",
            "nextSteps"
        ]

        if not all(key in result for key in required_keys):
            raise ValueError("GTM response is missing required fields")

        logger.info("GTM Strategy generation successful")

        return {
            "status": "success",
            "startupIdea": request.startupIdea,
            "goToMarketStrategy": result
        }

    except Exception as e:
        logger.exception(
            "GTM Strategy generation failed: %s",
            e
        )

        logger.info("Returning GTM fallback response")

        return build_fallback_response(request)


@app.get("/")
def root():
    return {
        "status": "success",
        "agent": "Go-to-Market Strategy Agent"
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8905
    )