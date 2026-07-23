from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------
# Models
# -----------------------------
class Competitor(BaseModel):
    name: str
    website: str
    description: str
    key_features: List[str]
    target_customers: str
    pricing: str
    source: str


class ComparisonRequest(BaseModel):
    startupIdea: str
    description: str
    industry: str
    competitors: List[Competitor]


# -----------------------------
# API Endpoint
# -----------------------------
@app.post("/api/comparison-agent")
def comparison_agent(payload: ComparisonRequest):

    # Clean Input
    startup = payload.startupIdea.strip()
    description = payload.description.strip()
    industry = payload.industry.strip()

    # -----------------------------
    # Input Validation
    # -----------------------------
    if not startup:
        raise HTTPException(
            status_code=400,
            detail="Startup idea cannot be empty."
        )

    if not description:
        raise HTTPException(
            status_code=400,
            detail="Startup description cannot be empty."
        )

    if not industry:
        raise HTTPException(
            status_code=400,
            detail="Industry cannot be empty."
        )

    if len(payload.competitors) == 0:
        raise HTTPException(
            status_code=400,
            detail="At least one competitor is required."
        )

    # -----------------------------
    # Temporary Response
    # -----------------------------
    return {
        "status": "success",
        "startup": startup,
        "description": description,
        "industry": industry,
        "competitor_count": len(payload.competitors),
        "message": "Input validation successful."
    }


# -----------------------------
# Run Server
# -----------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8901)