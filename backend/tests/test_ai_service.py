import json
import pytest
from unittest.mock import patch
from app.models.ai import AiAnalysisResult
from app.models.api import BrutalityLevel, TargetRole
from app.models.github import GitHubUserData, GitHubUserProfile, GitHubRepoRaw
from app.models.scoring import ScoringResult, ScoreBreakdown, CategoryScores
from app.services.ai_service import clean_llm_json, ai_service

def test_clean_llm_json():
    # Plain JSON
    plain = '{"key": "value"}'
    assert clean_llm_json(plain) == '{"key": "value"}'

    # Fenced JSON with json tag
    fenced_1 = '```json\n{"key": "value"}\n```'
    assert clean_llm_json(fenced_1) == '{"key": "value"}'

    # Fenced JSON without tag and with whitespace
    fenced_2 = '  ```\n{"key": "value"}\n```  '
    assert clean_llm_json(fenced_2) == '{"key": "value"}'

def test_ai_schema_validation():
    valid_data = {
        "recruiter_verdict": "Solid backend profile with clear systems focus.",
        "roast": "Your repos have more Dockerfiles than actual users.",
        "roast_explanation": "Shows good DevOps awareness but lacks proof of production adoption.",
        "strengths": ["Clean commit history", "Good test coverage proxy", "Clear API naming"],
        "weaknesses": ["Missing live demos", "Low documentation on auth", "Few open issues"],
        "career_gaps": ["Lacks distributed tracing examples"],
        "quick_fixes": ["Add swagger screenshots", "Tag versions", "Add license", "Pin dependencies", "Deploy a demo instance"],
        "rescue_plan": [
            {"horizon": "today", "tasks": ["Add MIT license"]},
            {"horizon": "this_week", "tasks": ["Deploy live demo"]},
            {"horizon": "next_2_weeks", "tasks": ["Write comprehensive README"]},
            {"horizon": "this_month", "tasks": ["Publish npm/pip package"]}
        ],
        "role_fit_summary": "Strong alignment with Junior-to-Mid Backend roles."
    }
    model = AiAnalysisResult.model_validate(valid_data)
    assert len(model.strengths) == 3
    assert len(model.weaknesses) == 3
    assert len(model.quick_fixes) == 5
    assert len(model.rescue_plan) == 4

@pytest.mark.asyncio
async def test_simulated_malformed_then_repaired_response():
    profile = GitHubUserProfile(username="coder1", public_repos=1)
    user_data = GitHubUserData(profile=profile, repos=[], events=[], total_repos_count=1, analyzed_repos_count=1)
    cats = CategoryScores(
        technical_strength=50, project_quality=50, activity_consistency=50,
        documentation=50, recruiter_appeal=50, profile_presentation=50
    )
    scoring_res = ScoringResult(
        scores=ScoreBreakdown(overall=50, categories=cats, weights={}),
        repos=[],
    )

    valid_json_response = json.dumps({
        "recruiter_verdict": "Promising developer.",
        "roast": "You push code like it's a scratchpad.",
        "roast_explanation": "Lack of versioning makes it hard to gauge stability.",
        "strengths": ["Consistent pushes", "Python proficiency", "Clean repos"],
        "weaknesses": ["No documentation", "No tests", "No licenses"],
        "career_gaps": ["Production experience"],
        "quick_fixes": ["Add readme", "Add license", "Write unit tests", "Add CI workflow", "Deploy demo"],
        "rescue_plan": [
            {"horizon": "today", "tasks": ["Add README"]},
            {"horizon": "this_week", "tasks": ["Write tests"]},
            {"horizon": "next_2_weeks", "tasks": ["Set up CI"]},
            {"horizon": "this_month", "tasks": ["Deploy project"]}
        ],
        "role_fit_summary": "Decent fundamentals."
    })

    with patch.object(ai_service, "_dispatch_llm_call", side_effect=["INVALID JSON {{{", valid_json_response]):
        result, ai_available, err = await ai_service.generate_roast_and_analysis(
            user_data, scoring_res, TargetRole.SOFTWARE_ENGINEER, BrutalityLevel.HONEST
        )
        assert ai_available is True
        assert result is not None
        assert result.roast == "You push code like it's a scratchpad."

@pytest.mark.asyncio
async def test_ai_fallback_grounded_generation():
    profile = GitHubUserProfile(username="coder1", public_repos=1)
    user_data = GitHubUserData(profile=profile, repos=[], events=[], total_repos_count=1, analyzed_repos_count=1)
    cats = CategoryScores(
        technical_strength=50, project_quality=50, activity_consistency=50,
        documentation=50, recruiter_appeal=50, profile_presentation=50
    )
    scoring_res = ScoringResult(
        scores=ScoreBreakdown(overall=50, categories=cats, weights={}),
        repos=[],
    )

    # When live LLM fails or is not configured, grounded heuristic fallback generates realistic analysis
    with patch.object(ai_service, "_dispatch_llm_call", side_effect=Exception("No API Key")):
        result, ai_available, err = await ai_service.generate_roast_and_analysis(
            user_data, scoring_res, TargetRole.SOFTWARE_ENGINEER, BrutalityLevel.BRUTAL
        )
        assert ai_available is True
        assert result is not None
        assert len(result.strengths) == 3
        assert len(result.weaknesses) == 3
        assert len(result.quick_fixes) == 5
        assert len(result.rescue_plan) == 4
