from pydantic import BaseModel


class StartupRequest(BaseModel):
    startupIdea: str
    description: str
