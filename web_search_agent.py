import os
import requests
import json
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class IdeaRequest(BaseModel):
    idea: str
    description: str


@app.post("/api/search-agent")
def web_search_agent(payload: IdeaRequest):

    user_input = payload.idea.strip()
    description = payload.description.strip()

    # ==========================================
    # 1. INPUT VALIDATION & RE-CHECKS
    # ==========================================

    if not user_input or len(user_input) < 3:
        raise HTTPException(
            status_code=400,
            detail="Invalid input. Please enter a concrete startup concept or business category."
        )

    if not description or len(description) < 10:
        raise HTTPException(
            status_code=400,
            detail="Please enter a meaningful startup description."
        )

    # ==========================================
    # 2. INTENT & CONTEXT ANALYSIS
    # ==========================================

    optimized_query = (
        f"{user_input} {description} "
        "global revenue market size statistics top competitors brands"
    )

    # ==========================================
    # 3. TAVILY SEARCH API
    # ==========================================

    url = "https://api.tavily.com/search"

    tavily_payload = {
        "api_key": TAVILY_API_KEY,
        "query": optimized_query,
        "search_depth": "advanced",
        "include_domains": []
    }

    try:
        response = requests.post(url, json=tavily_payload)
        response.raise_for_status()
        search_data = response.json()

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Tavily live data fetch failed."
        )

    # ==========================================
    # 4. RESULT PROCESSING & DE-DUPLICATION
    # ==========================================

    seen_contents = set()
    processed_sources = []

    for result in search_data.get("results", []):

        content_snippet = result.get("content", "")
        source_url = result.get("url", "")

        if content_snippet and content_snippet not in seen_contents:

            seen_contents.add(content_snippet)

            processed_sources.append({
                "url": source_url,
                "content": content_snippet
            })

    if not processed_sources:
        raise HTTPException(
            status_code=404,
            detail="No relevant market research data found."
        )

    # ==========================================
    # 5. SOURCE VERIFICATION & LLM
    # ==========================================

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }

    current_year = datetime.now().year

    body = {
        "model": "openai/gpt-4o-mini",
        "response_format": {
            "type": "json_object"
        },
        "messages": [
            {
                "role": "user",
                "content": f"""
You are the structured response builder engine for a business intelligence system.

Startup Idea:
"{user_input}"

Startup Description:
"{description}"

Current Year Context: {current_year}

Verified Sources:
{json.dumps(processed_sources, indent=2)}

Execute the following architectural blocks:

1. Source Verification & Trust Evaluation
2. Information Freshness
3. Confidence Scoring
4. Structured Response Building

Return ONLY a JSON object matching exactly:

{{
    "market_size": "Explicit data-driven market size or revenue metric",
    "real_competitors": [
        "Competitor A",
        "Competitor B",
        "Competitor C"
    ],
    "confidence_score": "85%",
    "verified_sources": [
        "url1",
        "url2"
    ]
}}
"""
            }
        ]
    }

    try:

        openrouter_response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=body
        )

        openrouter_response.raise_for_status()

        raw_choice = openrouter_response.json()["choices"][0]["message"]["content"]

        structured_output = json.loads(raw_choice)

        return structured_output

    except Exception:

        raise HTTPException(
            status_code=500,
            detail="Structured data extraction pipeline failed."
        )


if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8900
    )