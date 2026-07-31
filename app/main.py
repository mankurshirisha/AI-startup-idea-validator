from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models import StartupRequest
from app.crew import StartupIdeaValidatorCrew

app = FastAPI(
    title="AI Startup Idea Validator",
    version="1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

crew = StartupIdeaValidatorCrew()


@app.get("/")
def home():
    return {
        "message": "AI Startup Idea Validator using CrewAI is Running!"
    }


@app.post("/api/startup-validator")
def validate(request: StartupRequest):

    result = crew.run(request.startupIdea)

    return {
        "status": "success",
        "result": str(result)
    }