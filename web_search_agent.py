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

@app.post("/api/search-agent")
def web_search_agent(payload: IdeaRequest):
    user_input = payload.idea.strip()

    # ==========================================
    # 1. INPUT VALIDATION & RE-CHECKS
    # ==========================================
    # Checks empty, invalid, or highly ambiguous input[span_1](start_span)[span_1](end_span)
    if not user_input or len(user_input) < 3:
        raise HTTPException(
            status_code=400, 
            detail="Invalid input. Please enter a concrete startup concept or business category."
        )

    # ==========================================
    # 2. INTENT & CONTEXT ANALYSIS (Internal Optimization)
    # ==========================================
    # Optimizing the raw idea into distinct intent targets: market size and competitors[span_2](start_span)[span_2](end_span)
    optimized_query = f"{user_input} global revenue market size statistics top competitors brands"

    # ==========================================
    # 3. TAVILY SEARCH API (Live Information Retrieval)
    # ==========================================
    # Collects raw results alongside metadata and sources[span_3](start_span)[span_3](end_span)
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
        raise HTTPException(status_code=500, detail="Tavily live data fetch failed.")

    # ==========================================
    # 4. RESULT PROCESSING & DE-DUPLICATION
    # ==========================================
    # Iterates, groups, filters out duplicate snippets, and compiles useful contents[span_4](start_span)[span_4](end_span)
    seen_contents = set()
    processed_sources = []
    
    for result in search_data.get("results", []):
        content_snippet = result.get("content", "")
        source_url = result.get("url", "")
        
        # Simple duplicate content checker[span_5](start_span)[span_5](end_span)
        if content_snippet and content_snippet not in seen_contents:
            seen_contents.add(content_snippet)
            processed_sources.append({
                "url": source_url,
                "content": content_snippet
            })

    if not processed_sources:
        raise HTTPException(status_code=404, detail="No relevant market research data found.")

    # ==========================================
    # 5. SOURCE VERIFICATION, TRUST, & COMPILING
    # ==========================================
    # Pass processed information to LLM to extract metrics, check freshness, and score confidence[span_6](start_span)[span_6](end_span)
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }

    current_year = datetime.now().year
    
    body = {
        "model": "openai/gpt-4o-mini",
        "response_format": { "type": "json_object" },
        "messages": [
            {
                "role": "user",
                "content": f"""
                You are the structured response builder engine for a business intelligence system.
                Analyze the following verified sources for the startup idea: "{user_input}".
                
                Current Year Context: {current_year}

                Sources:
                {json.dumps(processed_sources, indent=2)}
                
                Execute the following architectural blocks:
                1. Source Verification & Trust Evaluation: Cross-reference findings across sources[span_7](start_span)[span_7](end_span).
                2. Information Freshness: Prioritize data closest to {current_year}[span_8](start_span)[span_8](end_span).
                3. Confidence Scoring: Assign a confidence score from 0% to 100% based on data clarity and source alignment[span_9](start_span)[span_9](end_span).
                4. Structured Response Building: Map into categories with original source links attached[span_10](start_span)[span_10](end_span).

                You MUST return a single JSON object matching this schema exactly:
                {{
                    "market_size": "Explicit data-driven metric, valuation, or revenue growth statistics found",
                    "real_competitors": ["Competitor A", "Competitor B", "Competitor C"],
                    "confidence_score": "e.g., 85%",
                    "verified_sources": ["url1", "url2"]
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
        
        # ==========================================
        # 6. STRUCTURED OUTPUT
        # ==========================================
        # Clean structured JSON object sent seamlessly back to your frontend[span_11](start_span)[span_11](end_span)
        structured_output = json.loads(raw_choice)
        return structured_output
        
    except Exception:
        raise HTTPException(status_code=500, detail="Structured data extraction pipeline failed.")

if __name__ == "__main__":
    import uvicorn
    # Clear your background processes before running this on port 8900
    uvicorn.run(app, host="127.0.0.1", port=8900)