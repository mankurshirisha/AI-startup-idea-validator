# AI Startup Idea Validator

## Overview

AI Startup Idea Validator is a FastAPI-based backend that evaluates a startup idea through a multi-step analysis pipeline. It combines web search, market opportunity analysis, competitor discovery, and comparison analysis to produce a structured validation report.

The current implementation uses direct Python orchestration in the FastAPI application rather than a separate CrewAI runtime execution path.

## Features

- Accepts a startup idea and description through a single API endpoint
- Runs a four-step validation pipeline:
  - Web search analysis
  - Market opportunity analysis
  - Competitor discovery
  - Final comparison and insights
- Uses Tavily for search-based enrichment
- Uses Google Gemini through the shared Gemini client helper
- Preserves the existing FastAPI request and response contracts
- Includes centralized logging and error handling

## Architecture

The backend is organized around a single FastAPI entrypoint in app/main.py.

Flow:

1. The request arrives at /api/startup-validator
2. The app calls the web search agent
3. The web search result is converted into a market opportunity request
4. The market opportunity agent returns a structured market summary
5. The competitor discovery agent uses that context to find relevant competitors
6. The comparison agent produces a final analysis payload
7. The orchestrator returns a combined response

## Folder Structure

```text
AI-startup-idea-validator/
│
├── app/
│   ├── config.py
│   ├── gemini_client.py
│   ├── logging_config.py
│   ├── main.py
│   ├── models.py
│   └── ...
├── comparison_agent.py
├── competitor_discovery_agent.py
├── market_opportunity_agent.py
├── web_search_agent.py
├── start.py
├── requirements.txt
├── tests/
└── index.html
```

## Technologies Used

- Python 3
- FastAPI
- Pydantic
- Uvicorn
- Python-dotenv
- Tavily API
- Google GenAI SDK
- Requests

## Installation

1. Create and activate a virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

## Environment Variables

Create a .env file in the project root with the following variables:

```env
TAVILY_API_KEY=your_tavily_api_key
GEMINI_API_KEY=your_gemini_api_key
LOG_LEVEL=INFO
```

Notes:
- TAVILY_API_KEY is required for search-based agents.
- GEMINI_API_KEY is required for Gemini-based analysis.
- LOG_LEVEL is optional and defaults to INFO.

## Running the Project

Run the main API server:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

You can also start the helper launcher:

```bash
python start.py
```

## API Endpoints

### Root

- GET /
  - Returns a basic health/status message

### Full pipeline

- POST /api/startup-validator
  - Accepts a startup idea and description
  - Returns the combined web search, market opportunity, competitor, and comparison results

### Individual agents

- POST /api/search-agent
- POST /api/market-opportunity-agent
- POST /api/competitor-agent
- POST /api/comparison-agent

## Sample Request

### POST /api/startup-validator

```json
{
  "startupIdea": "AI Resume Builder",
  "description": "An AI platform that helps job seekers create tailored resumes and prepare for interviews."
}
```

## Sample Response

```json
{
  "status": "success",
  "web_search": {
    "market_size": "",
    "industry": "",
    "market_trends": [],
    "real_competitors": [],
    "confidence_score": "",
    "verified_sources": []
  },
  "market_opportunity": {
    "startupIdea": "AI Resume Builder",
    "industryInsights": {
      "industry": "",
      "marketSize": "",
      "growthRate": "",
      "trends": []
    },
    "marketOpportunity": {
      "TAM": "$50 Billion",
      "SAM": "$8 Billion",
      "SOM": "$500 Million"
    },
    "marketOpportunityScore": 91,
    "customerInsights": {
      "targetSegments": [],
      "keyPainPoints": [],
      "marketDemand": "High"
    },
    "recommendations": [],
    "sources": []
  },
  "competitor_analysis": {},
  "comparison": {
    "status": "success",
    "startup": "AI Resume Builder",
    "description": "An AI platform that helps job seekers create tailored resumes and prepare for interviews.",
    "industry": "",
    "startup_features": [],
    "comparison": [],
    "similarity_scores": [],
    "market_gaps": [],
    "business_insights": {
      "strengths": [],
      "weaknesses": [],
      "opportunities": [],
      "recommendations": []
    }
  }
}
```

The exact values depend on the live search and Gemini responses returned at runtime.

## Future Improvements

Potential improvements that could be made next:

- Add more robust validation and schema enforcement for agent outputs
- Add automated tests for each endpoint and agent function
- Add request/response caching for repeated startup ideas
- Add deployment configuration for production environments
- Add richer observability and metrics collection
