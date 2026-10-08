from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class EvidenceFact(BaseModel):
    id: str
    description: str
    supporting_numbers: Dict[str, Any] = Field(default_factory=dict)
    repo_names: List[str] = Field(default_factory=list)
    unusualness_score: float = 0.0


class RoastAngle(BaseModel):
    id: str
    fact_description: str
    supporting_numbers: Dict[str, Any] = Field(default_factory=dict)
    repo_names: List[str] = Field(default_factory=list)


class AngleSelection(BaseModel):
    angles: List[RoastAngle]
    comic_device: str
    variant: int = 0
    all_facts: List[EvidenceFact] = Field(default_factory=list)
