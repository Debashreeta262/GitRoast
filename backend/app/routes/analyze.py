import datetime
import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Request
from pydantic import BaseModel

from app.models.ai import AiAnalysisResult
from app.models.api import (
    AnalyzeRequest,
    AppError,
    RegenerateRoastRequest,
    RegenerateRoastResponse,
)
from app.models.github import GitHubUserProfile
from app.models.scoring import RepoAnalysis, ScoreBreakdown
from app.services.ai_service import ai_service
from app.services.cache import ai_cache
from app.services.github_service import github_service
from app.services.rate_limiter import ip_rate_limiter
from app.services.scoring_engine import scoring_engine

logger = logging.getLogger("gitroast.analyze")

router = APIRouter(prefix="/api", tags=["analyze"])


class AnalyzeMeta(BaseModel):
    analyzed_at: str
    repos_analyzed: int
    repos_total: int
    cached: bool
    data_notes: List[str]


class AnalyzeResponse(BaseModel):
    profile: GitHubUserProfile
    scores: ScoreBreakdown
    repos: List[RepoAnalysis]
    ai: Optional[AiAnalysisResult] = None
    ai_available: bool = True
    meta: AnalyzeMeta


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_profile(request: Request, body: AnalyzeRequest):
    # 1. Enforce IP rate limiting
    ip_rate_limiter.check(request)

    username = body.username.strip()
    role = body.role
    brutality = body.brutality
    variant = max(0, getattr(body, "variant", 0))

    # 2. Fetch raw GitHub data (uses 10-min in-memory cache)
    user_data = await github_service.fetch_user_data(username)

    # 3. Deterministic scoring
    scoring_result = scoring_engine.score_profile(user_data, role)

    # 4. Check AI roast cache (composite key: username + role + brutality + variant)
    cache_key = f"ai_roast:{username.lower()}:{role.value}:{brutality.value}:{variant}"
    cached_ai = ai_cache.get(cache_key)

    if cached_ai:
        ai_result = cached_ai
        ai_available = True
    else:
        # AI analysis with evidence pack, tone personas, and fallback
        ai_result, ai_available, ai_error = await ai_service.generate_roast_and_analysis(
            user_data=user_data,
            scoring_result=scoring_result,
            role=role,
            brutality=brutality,
            variant=variant,
        )
        if ai_result:
            ai_cache.set(cache_key, ai_result)

    data_notes = [
        f"Deep analyzed top {user_data.analyzed_repos_count} repositories out of {user_data.total_repos_count} total repos.",
        "Events API is limited by GitHub to ~90 days and 300 public events.",
    ]
    if user_data.cached:
        data_notes.append("Serving cached GitHub profile data (10-min cache).")
    if not ai_available:
        data_notes.append("AI generation was unavailable; deterministic scores are fully intact.")

    meta = AnalyzeMeta(
        analyzed_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        repos_analyzed=user_data.analyzed_repos_count,
        repos_total=user_data.total_repos_count,
        cached=user_data.cached,
        data_notes=data_notes,
    )

    return AnalyzeResponse(
        profile=user_data.profile,
        scores=scoring_result.scores,
        repos=scoring_result.repos,
        ai=ai_result,
        ai_available=ai_available,
        meta=meta,
    )


@router.post("/regenerate-roast", response_model=RegenerateRoastResponse)
async def regenerate_roast(request: Request, body: RegenerateRoastRequest):
    """
    Regenerates a fresh roast and explanation with a different seed/angle
    without refetching raw GitHub data.
    """
    ip_rate_limiter.check(request)

    username = body.username.strip()
    role = body.role
    brutality = body.brutality
    variant = max(0, body.variant)

    cache_key = f"ai_roast:{username.lower()}:{role.value}:{brutality.value}:{variant}"
    cached_ai = ai_cache.get(cache_key)
    if cached_ai:
        return RegenerateRoastResponse(
            roast=cached_ai.roast,
            roast_explanation=cached_ai.roast_explanation,
            grounding_repos=cached_ai.grounding_repos,
            comic_device=cached_ai.comic_device,
            variant=variant,
            ai_available=True,
        )

    # Re-use cached GitHub profile data
    user_data = await github_service.fetch_user_data(username)
    scoring_result = scoring_engine.score_profile(user_data, role)

    ai_result, ai_available, _ = await ai_service.generate_roast_and_analysis(
        user_data=user_data,
        scoring_result=scoring_result,
        role=role,
        brutality=brutality,
        variant=variant,
    )

    if ai_result:
        ai_cache.set(cache_key, ai_result)
        return RegenerateRoastResponse(
            roast=ai_result.roast,
            roast_explanation=ai_result.roast_explanation,
            grounding_repos=ai_result.grounding_repos,
            comic_device=ai_result.comic_device,
            variant=variant,
            ai_available=ai_available,
        )

    raise AppError(
        code="AI_UNAVAILABLE",
        message="Unable to regenerate AI roast at this time.",
        status_code=503,
    )
