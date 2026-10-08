from typing import List, Literal, Optional
from pydantic import BaseModel, Field, field_validator

class RescuePlanItem(BaseModel):
    horizon: Literal["today", "this_week", "next_2_weeks", "this_month"]
    tasks: List[str]

class AiAnalysisResult(BaseModel):
    recruiter_verdict: str = Field(description="30-second recruiter impression")
    roast: str = Field(description="Short, witty roast grounded in evidence")
    roast_explanation: str = Field(description="What the issue reveals and how to fix it")
    strengths: List[str] = Field(description="Exactly 3 strengths")
    weaknesses: List[str] = Field(description="Exactly 3 weaknesses")
    career_gaps: List[str] = Field(description="Role-specific gaps")
    quick_fixes: List[str] = Field(description="Exactly 5 actionable recommendations")
    rescue_plan: List[RescuePlanItem] = Field(description="Prioritized rescue plan across 4 horizons")
    role_fit_summary: str = Field(description="Summary of role alignment")

    @field_validator("strengths")
    @classmethod
    def validate_strengths_len(cls, v: List[str]) -> List[str]:
        if len(v) != 3:
            # Enforce exactly 3 or trim/pad safely
            if len(v) > 3:
                return v[:3]
            while len(v) < 3:
                v.append("Consistent code activity across public repositories.")
        return v

    @field_validator("weaknesses")
    @classmethod
    def validate_weaknesses_len(cls, v: List[str]) -> List[str]:
        if len(v) != 3:
            if len(v) > 3:
                return v[:3]
            while len(v) < 3:
                v.append("Room for improved documentation across active projects.")
        return v

    @field_validator("quick_fixes")
    @classmethod
    def validate_quick_fixes_len(cls, v: List[str]) -> List[str]:
        if len(v) != 5:
            if len(v) > 5:
                return v[:5]
            while len(v) < 5:
                v.append("Add clear architectural diagrams or usage examples to key repositories.")
        return v
