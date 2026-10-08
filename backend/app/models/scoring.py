from typing import Dict, List, Optional
from pydantic import BaseModel, Field

class CategoryScores(BaseModel):
    technical_strength: int
    project_quality: int
    activity_consistency: int
    documentation: int
    recruiter_appeal: int
    profile_presentation: int

class ScoreBreakdown(BaseModel):
    overall: int
    categories: CategoryScores
    weights: Dict[str, float]

class RepoAnalysis(BaseModel):
    name: str
    language: Optional[str] = None
    stars: int = 0
    forks: int = 0
    updated_at: Optional[str] = None
    pushed_at: Optional[str] = None
    has_readme: bool = False
    description: Optional[str] = None
    homepage: Optional[str] = None
    license: Optional[str] = None
    topics: List[str] = Field(default_factory=list)
    is_fork: bool = False
    quality_score: int = 0
    flags: List[str] = Field(default_factory=list)

class ScoringResult(BaseModel):
    scores: ScoreBreakdown
    repos: List[RepoAnalysis]
    summary_metrics: Dict[str, int | float | str] = Field(default_factory=dict)
