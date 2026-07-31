import os
import requests
import json
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
class CompetitorRequest(BaseModel):
    startupIdea: str
    industryAnalysis: dict
    customerSegments: list
    marketOpportunity: dict
    marketOpportunityScore: int
    recommendations: list

@app.post("/api/competitor-agent")
def competitor_discovery_agent(payload: CompetitorRequest):
    startup_idea = payload.startupIdea
    industry = payload.industryAnalysis.get("industry", "")
    customer_segments = payload.customerSegments

    # ==========================================
    # 1. INPUT VALIDATION
    # ==========================================

    if not startup_idea:
        raise HTTPException(
            status_code=400,
            detail="Startup idea is required."
        )

    if not industry:
        raise HTTPException(
            status_code=400,
            detail="Industry information is required."
        )
    # ==========================================
    # 2. GENERATE COMPETITOR SEARCH QUERY
    # ==========================================

    search_queries = [
        f"Top competitors of {startup_idea}",
        f"Leading companies in {industry}",
        f"Best startups in {industry}",
        f"{startup_idea} alternatives",
        f"Popular {industry} platforms"
    ]

    optimized_query = " OR ".join(search_queries)
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
            detail="Failed to retrieve competitor information."
        )
    # ==========================================
    # 4. PROCESS SEARCH RESULTS
    # ==========================================

    seen_urls = set()
    processed_results = []

    for result in search_data.get("results", []):
        url = result.get("url", "")
        content = result.get("content", "")

        if url and url not in seen_urls:
            seen_urls.add(url)
            processed_results.append({
                "url": url,
                "content": content
            })

    if not processed_results:
        raise HTTPException(
            status_code=404,
            detail="No competitor information found."
        )
    # ==========================================
    # 5. OPENROUTER LLM PROCESSING
    # ==========================================

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }

    body = {
        "model": "openai/gpt-4o-mini",
        "response_format": {
            "type": "json_object"
        },
        "messages": [
            {
                "role": "user",
                "content": f"""
                You are a Competitor Discovery Agent.

                Startup Idea:
                {startup_idea}

                Industry:
                {industry}

                Search Results:
                {json.dumps(processed_results, indent=2)}

                Identify the major competitors and return ONLY JSON.

                Return this format:

               {{
                    "startupIdea": "{startup_idea}",
                    "industry": "{industry}",

                    "competitors":[
                        {{
                            "name":"",
                            "website":"",
                            "description":"",
                            "key_features":[],
                            "target_customers":"",
                            "pricing":"",
                            "source":""
                  }}
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
            detail="Competitor discovery failed."
        )
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8901
    )