from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class TargetRole(str, Enum):
    SOFTWARE_ENGINEER = "software_engineer"
    FRONTEND_ENGINEER = "frontend_engineer"
    BACKEND_ENGINEER = "backend_engineer"
    ML_ENGINEER = "ml_engineer"
    DATA_SCIENTIST = "data_scientist"

class BrutalityLevel(str, Enum):
    PROFESSIONAL = "professional"
    HONEST = "honest"
    BRUTAL = "brutal"

class AnalyzeRequest(BaseModel):
    username: str
    role: TargetRole = TargetRole.SOFTWARE_ENGINEER
    brutality: BrutalityLevel = BrutalityLevel.HONEST
    variant: int = 0

class RegenerateRoastRequest(BaseModel):
    username: str
    role: TargetRole = TargetRole.SOFTWARE_ENGINEER
    brutality: BrutalityLevel = BrutalityLevel.HONEST
    variant: int = 1

class RegenerateRoastResponse(BaseModel):
    roast: str
    roast_explanation: str
    grounding_repos: List[str] = Field(default_factory=list)
    comic_device: Optional[str] = None
    variant: int = 1
    ai_available: bool = True

class ApiErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None

class ApiErrorResponse(BaseModel):
    error: ApiErrorDetail

class AppError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400, details: Optional[Dict[str, Any]] = None):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)
