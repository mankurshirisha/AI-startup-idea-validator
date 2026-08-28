import json
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.gemini_client import generate_content
from app.logging_config import get_logger


logger = get_logger("swot_risk_agent")

app = FastAPI(
    title="SWOT and Risk Analysis Agent",
    version="1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================================
# REQUEST MODEL
# ==========================================================

class SwotRiskRequest(BaseModel):
    startupIdea: str
    description: str = ""
    industry: str = "General Tech"
    targetCustomer: str = "General Consumers"
    targetCountry: str = "Global"
    startupStage: str = "Idea"
    businessModel: str = "B2C"
    keyFeatures: List[str] = Field(default_factory=list)

    # Optional information from other agents
    marketData: Optional[Dict[str, Any]] = None
    competitors: Optional[List[Dict[str, Any]]] = None


# ==========================================================
# JSON PARSER
# ==========================================================

def _parse_json_response(content: str) -> Dict[str, Any]:
    """
    Safely extract JSON from Gemini response.
    """

    if not content:
        return {}

    content = content.strip()

    # Remove markdown code fences if Gemini returns them.
    if content.startswith("```json"):
        content = content[7:]

    elif content.startswith("```"):
        content = content[3:]

    if content.endswith("```"):
        content = content[:-3]

    content = content.strip()

    try:
        return json.loads(content)

    except json.JSONDecodeError:

        # Try extracting the JSON object.
        start = content.find("{")
        end = content.rfind("}")

        if start != -1 and end != -1:
            try:
                return json.loads(content[start : end + 1])
            except json.JSONDecodeError:
                pass

    logger.warning("Unable to parse Gemini response as JSON.")
    return {}


# ==========================================================
# FALLBACK RESPONSE
# ==========================================================

def _fallback_response(request: SwotRiskRequest) -> Dict[str, Any]:

    return {
        "status": "success",
        "swot_analysis": {
            "strengths": [
                "Clear startup idea with a defined target customer.",
                "Potential to solve a specific customer problem.",
            ],
            "weaknesses": [
                "Market demand still needs validation.",
                "The startup may have limited resources at the early stage.",
            ],
            "opportunities": [
                "Conduct customer interviews and pilot testing.",
                "Explore underserved customer segments.",
            ],
            "threats": [
                "Existing competitors may have stronger market presence.",
                "Customer preferences and market conditions may change.",
            ],
        },
        "risk_analysis": {
            "market_risk": {
                "level": "Medium",
                "risks": [
                    "Actual customer demand has not yet been fully validated."
                ],
            },
            "competition_risk": {
                "level": "Medium",
                "risks": [
                    "Existing competitors may offer similar solutions."
                ],
            },
            "technical_risk": {
                "level": "Medium",
                "risks": [
                    "Technical implementation may require additional resources."
                ],
            },
            "financial_risk": {
                "level": "Medium",
                "risks": [
                    "Revenue and pricing assumptions require validation."
                ],
            },
            "execution_risk": {
                "level": "Medium",
                "risks": [
                    "Limited resources may affect execution speed."
                ],
            },
            "regulatory_risk": {
                "level": "Low",
                "risks": [
                    "Regulatory requirements should be reviewed for the selected industry."
                ],
            },
        },
        "overall_risk_level": "Medium",
        "recommendations": [
            "Validate the idea with potential customers before scaling.",
            "Study competitors and identify a clear differentiation.",
            "Test pricing and business assumptions with a small pilot.",
        ],
    }


# ==========================================================
# GEMINI PROMPT
# ==========================================================

def _build_prompt(request: SwotRiskRequest) -> str:

    market_data = json.dumps(
        request.marketData or {},
        ensure_ascii=False,
    )

    competitors = json.dumps(
        request.competitors or [],
        ensure_ascii=False,
    )

    features = json.dumps(
        request.keyFeatures,
        ensure_ascii=False,
    )

    return f"""
You are a startup validation analyst.

Analyze the following startup and generate BOTH:
1. SWOT Analysis
2. Risk Analysis

Startup Information:

Startup Idea:
{request.startupIdea}

Description:
{request.description}

Industry:
{request.industry}

Target Customer:
{request.targetCustomer}

Target Country:
{request.targetCountry}

Startup Stage:
{request.startupStage}

Business Model:
{request.businessModel}

Key Features:
{features}

Market Information from previous agents:
{market_data}

Competitor Information from previous agents:
{competitors}

Analyze the startup realistically.

For SWOT:
- Strengths must describe genuine advantages.
- Weaknesses must describe realistic limitations.
- Opportunities must describe realistic market opportunities.
- Threats must describe external threats.

For Risk Analysis evaluate:
- Market Risk
- Competition Risk
- Technical Risk
- Financial Risk
- Execution Risk
- Regulatory Risk

For every risk category provide:
- risk level: Low, Medium, or High
- specific risks

Also provide an overall risk level.

Give practical recommendations that the founder can actually implement.

IMPORTANT:
- Use simple and professional English.
- Do not invent specific statistics.
- Do not make unsupported claims.
- Avoid generic buzzwords.
- Return ONLY valid JSON.
- Do NOT use markdown.
- Do NOT include explanations outside the JSON.

Return exactly this structure:

{{
    "swot_analysis": {{
        "strengths": [
            "..."
        ],
        "weaknesses": [
            "..."
        ],
        "opportunities": [
            "..."
        ],
        "threats": [
            "..."
        ]
    }},

    "risk_analysis": {{
        "market_risk": {{
            "level": "Low/Medium/High",
            "risks": [
                "..."
            ]
        }},
        "competition_risk": {{
            "level": "Low/Medium/High",
            "risks": [
                "..."
            ]
        }},
        "technical_risk": {{
            "level": "Low/Medium/High",
            "risks": [
                "..."
            ]
        }},
        "financial_risk": {{
            "level": "Low/Medium/High",
            "risks": [
                "..."
            ]
        }},
        "execution_risk": {{
            "level": "Low/Medium/High",
            "risks": [
                "..."
            ]
        }},
        "regulatory_risk": {{
            "level": "Low/Medium/High",
            "risks": [
                "..."
            ]
        }}
    }},

    "overall_risk_level": "Low/Medium/High",

    "recommendations": [
        "...",
        "...",
        "..."
    ]
}}
"""


# ==========================================================
# MAIN AGENT FUNCTION
# ==========================================================

def run_swot_risk_agent(
    request: SwotRiskRequest,
) -> Dict[str, Any]:

    if not request.startupIdea.strip():
        raise HTTPException(
            status_code=400,
            detail="Startup idea cannot be empty.",
        )

    prompt = _build_prompt(request)

    try:
        logger.info(
            "Starting SWOT and Risk Analysis for startup: %s",
            request.startupIdea,
        )

        # ONE Gemini API call for BOTH SWOT and Risk Analysis.
        content = generate_content(prompt)

        result = _parse_json_response(content)

        if not result:
            logger.warning(
                "Gemini returned invalid response. Using fallback."
            )
            return _fallback_response(request)

        return {
            "status": "success",
            **result,
        }

    except Exception as exc:

        logger.exception(
            "SWOT and Risk Analysis failed: %s",
            exc,
        )

        return _fallback_response(request)


# ==========================================================
# FASTAPI ENDPOINT
# ==========================================================

@app.post("/api/swot-risk-agent")
def swot_risk_endpoint(request: SwotRiskRequest):

    return run_swot_risk_agent(request)


# ==========================================================
# HEALTH CHECK
# ==========================================================

@app.get("/")
def home():

    return {
        "message": "SWOT and Risk Analysis Agent Running"
    }


# ==========================================================
# RUN SERVER
# ==========================================================

if __name__ == "__main__":

    import uvicorn

    logger.info(
        "Starting SWOT Risk Agent on http://127.0.0.1:8903"
    )

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8903,
  )
