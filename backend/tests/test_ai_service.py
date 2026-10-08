import json
import pytest
from unittest.mock import patch
from app.models.ai import AiAnalysisResult
from app.models.api import BrutalityLevel, TargetRole
from app.models.github import GitHubUserData, GitHubUserProfile, GitHubRepoRaw
from app.models.scoring import ScoringResult, ScoreBreakdown, CategoryScores, RepoAnalysis
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
    raw_repo = GitHubRepoRaw(name="scratchpad-app", stargazers_count=15, has_readme=True)
    user_data = GitHubUserData(profile=profile, repos=[raw_repo], events=[], total_repos_count=1, analyzed_repos_count=1)
    cats = CategoryScores(
        technical_strength=50, project_quality=50, activity_consistency=50,
        documentation=50, recruiter_appeal=50, profile_presentation=50
    )
    scoring_res = ScoringResult(
        scores=ScoreBreakdown(overall=50, categories=cats, weights={}),
        repos=[RepoAnalysis(name="scratchpad-app", stars=15, quality_score=60, has_readme=True)],
    )

    valid_json_response = json.dumps({
        "recruiter_verdict": "Promising developer.",
        "roast": "Repository scratchpad-app has 15 stars but lacks documentation.",
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
        assert result.roast == "Repository scratchpad-app has 15 stars but lacks documentation."

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


def test_render_prompts_injects_tone_and_device_and_banned():
    user_data = GitHubUserData(
        profile=GitHubUserProfile(username="alice", public_repos=2),
        repos=[GitHubRepoRaw(name="demo-app", stargazers_count=10, has_readme=True)],
        events=[],
        total_repos_count=1,
        analyzed_repos_count=1,
    )
    cats = CategoryScores(
        technical_strength=60, project_quality=60, activity_consistency=60,
        documentation=60, recruiter_appeal=60, profile_presentation=60,
    )
    scoring_res = ScoringResult(
        scores=ScoreBreakdown(overall=60, categories=cats, weights={}),
        repos=[],
    )
    candidate_summary = ai_service.build_candidate_summary(user_data, scoring_res)
    from app.services.evidence_pack import evidence_pack_service
    facts = evidence_pack_service.extract_facts(user_data, scoring_res)
    selection = evidence_pack_service.select_angles_and_device(facts, "alice", "brutal", variant=0)

    sys_prompt, usr_prompt = ai_service.render_prompts(
        candidate_summary, TargetRole.SOFTWARE_ENGINEER, BrutalityLevel.BRUTAL, selection
    )

    assert "Software Engineer" in sys_prompt
    assert "Comedic Roastmaster" in sys_prompt
    assert selection.comic_device in usr_prompt
    assert "BANNED PHRASES" in sys_prompt
    assert "well, well" in sys_prompt.lower()
    assert "SELECTED EVIDENCE ANGLES" in usr_prompt


def test_tone_personas_produce_different_fallback_voices():
    user_data = GitHubUserData(
        profile=GitHubUserProfile(username="bob", public_repos=2),
        repos=[GitHubRepoRaw(name="alpha-project", stargazers_count=50, language="Go", has_readme=True)],
        events=[],
        total_repos_count=1,
        analyzed_repos_count=1,
    )
    cats = CategoryScores(
        technical_strength=70, project_quality=70, activity_consistency=70,
        documentation=70, recruiter_appeal=70, profile_presentation=70,
    )
    scoring_res = ScoringResult(
        scores=ScoreBreakdown(overall=70, categories=cats, weights={}),
        repos=[],
    )
    from app.services.evidence_pack import evidence_pack_service
    facts = evidence_pack_service.extract_facts(user_data, scoring_res)
    sel = evidence_pack_service.select_angles_and_device(facts, "bob", "professional", variant=0)

    res_prof = ai_service.generate_grounded_fallback(
        user_data, scoring_res, TargetRole.SOFTWARE_ENGINEER, BrutalityLevel.PROFESSIONAL, sel
    )
    res_honest = ai_service.generate_grounded_fallback(
        user_data, scoring_res, TargetRole.SOFTWARE_ENGINEER, BrutalityLevel.HONEST, sel
    )
    res_brutal = ai_service.generate_grounded_fallback(
        user_data, scoring_res, TargetRole.SOFTWARE_ENGINEER, BrutalityLevel.BRUTAL, sel
    )

    assert res_prof.roast != res_honest.roast
    assert res_honest.roast != res_brutal.roast
    # Professional voice is diplomatic
    assert "candidate" in res_prof.roast.lower() or "competent" in res_prof.roast.lower() or "portfolio" in res_prof.roast.lower()
    # Honest voice is direct peer
    assert "genuine" in res_honest.roast.lower() or "recruiters" in res_honest.roast.lower() or "direct" in res_honest.roast.lower()
