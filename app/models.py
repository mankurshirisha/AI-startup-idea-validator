from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class StartupRequest(BaseModel):
    startupIdea: str
    description: str = ""
    industry: Optional[str] = "General Tech"
    targetCustomer: Optional[str] = "General Consumers"
    targetCountry: Optional[str] = "Global"
    startupStage: Optional[str] = "Idea"
    businessModel: Optional[str] = "B2C"
    keyFeatures: Optional[List[str]] = []


class BetaBuddyChatRequest(BaseModel):
    sessionId: Optional[str] = "default_session"
    question: str
    validationResult: Optional[Dict[str, Any]] = None
