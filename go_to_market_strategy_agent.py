from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import json
import logging
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("go_to_market_strategy_agent")

app = FastAPI(title="Go-to-Market Strategy Agent")

client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1"
)


class GTMStrategyRequest(BaseModel):
    startupIdea: str
    targetCustomer: str = ""
    marketOpportunity: str = ""
    competitors: List[Dict[str, Any]] = []
    swot: Dict[str, Any] = {}
    recommendedFeatures: List[str] = []


def build_fallback_response(request: GTMStrategyRequest):
    return {
        "status": "success",
        "startupIdea": request.startupIdea,
        "goToMarketStrategy": {
            "targetCustomer": request.targetCustomer or "Early adopters and customers with the strongest need for the solution.",
            "positioning": "Position the startup as a focused solution to a clear customer problem.",
            "valueProposition": "Deliver a simple, useful solution that addresses the customer's most important pain point.",
            "marketingChannels": [
                "Social media",
                "Content marketing",
                "Direct outreach",
                "Partnerships"
            ],
            "customerAcquisitionStrategy": [
                "Identify early adopters",
                "Run a small pilot",
                "Collect customer feedback",
                "Improve the MVP",
                "Expand to similar customer segments"
            ],
            "pricingStrategy": "Start with a simple introductory pricing model and validate willingness to pay.",
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
    logger.info("Starting Go-to-Market Strategy generation")

    prompt = f"""
You are a startup Go-to-Market Strategy expert.

Analyze the following startup validation information and create a practical
Go-to-Market Strategy.

STARTUP IDEA:
{request.startupIdea}

TARGET CUSTOMER:
{request.targetCustomer}

MARKET OPPORTUNITY:
{request.marketOpportunity}

COMPETITORS:
{json.dumps(request.competitors)}

SWOT ANALYSIS:
{json.dumps(request.swot)}

RECOMMENDED MVP FEATURES:
{json.dumps(request.recommendedFeatures)}

Return ONLY valid JSON using exactly this structure:

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

Keep the recommendations practical, specific and suitable for an early-stage
startup. Do not invent statistics or unsupported market facts.
"""

    try:
        response = client.chat.completions.create(
            model=os.getenv(
                "OPENROUTER_MODEL",
                "openai/gpt-4o-mini"
            ),
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert startup Go-to-Market strategist."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.2
        )

        raw = response.choices[0].message.content.strip()

        if raw.startswith("```"):
            raw = raw.replace("```json", "").replace("```", "").strip()

        result = json.loads(raw)

        return {
            "status": "success",
            "startupIdea": request.startupIdea,
            "goToMarketStrategy": result
        }

    except Exception as e:
        logger.exception("Go-to-Market Strategy generation failed: %s", e)

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
        port=8904
    )
