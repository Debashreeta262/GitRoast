import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from app.main import app
from app.models.ai import AiAnalysisResult
from app.models.github import GitHubUserData, GitHubUserProfile, GitHubRepoRaw

client = TestClient(app)

def test_analyze_invalid_username():
    payload = {
        "username": "-invalid--user-",
        "role": "software_engineer",
        "brutality": "honest",
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 400
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "INVALID_USERNAME"

def test_analyze_valid_mocked_flow():
    mock_ai = AiAnalysisResult(
        recruiter_verdict="Skilled developer with clean repo structure.",
        roast="You have more markdown badges than tests.",
        roast_explanation="Focus on test suites instead of flair.",
        strengths=["Active commits", "Open source license present", "Clear project scope"],
        weaknesses=["Missing tests", "No production demo", "Small repo count"],
        career_gaps=["Testing and CI/CD pipelines"],
        quick_fixes=["Add tests", "Add CI workflow", "Deploy demo", "Update README", "Tag releases"],
        rescue_plan=[
            {"horizon": "today", "tasks": ["Add GitHub Actions"]},
            {"horizon": "this_week", "tasks": ["Write pytest suite"]},
            {"horizon": "next_2_weeks", "tasks": ["Deploy to Cloud"]},
            {"horizon": "this_month", "tasks": ["Write blog post"]}
        ],
        role_fit_summary="Good candidate."
    )

    mock_profile = GitHubUserProfile(
        username="octocat",
        name="The Octocat",
        public_repos=8,
        bio="GitHub mascot",
        has_profile_readme=True,
    )
    mock_repo = GitHubRepoRaw(
        name="Hello-World",
        description="My first repo",
        language="JavaScript",
        stargazers_count=2000,
        forks_count=500,
        has_readme=True,
        license="MIT",
    )
    mock_user_data = GitHubUserData(
        profile=mock_profile,
        repos=[mock_repo],
        events=[],
        total_repos_count=1,
        analyzed_repos_count=1,
    )

    with patch("app.routes.analyze.github_service.fetch_user_data", new_callable=AsyncMock, return_value=mock_user_data), \
         patch("app.routes.analyze.ai_service.generate_roast_and_analysis", return_value=(mock_ai, True, None)):
        payload = {
            "username": "octocat",
            "role": "frontend_engineer",
            "brutality": "professional",
        }
        response = client.post("/api/analyze", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "profile" in data
        assert data["profile"]["username"].lower() == "octocat"
        assert "scores" in data
        assert 0 <= data["scores"]["overall"] <= 100
        assert "repos" in data
        assert len(data["repos"]) == 1
        assert data["ai_available"] is True
        assert data["ai"]["roast"] == "You have more markdown badges than tests."
        assert "meta" in data
        assert data["meta"]["repos_total"] >= 1


def test_regenerate_roast_flow():
    mock_ai = AiAnalysisResult(
        recruiter_verdict="Skilled developer.",
        roast="Testing regenerate roast output.",
        roast_explanation="Fresh diagnostic insight.",
        strengths=["A", "B", "C"],
        weaknesses=["D", "E", "F"],
        career_gaps=["G"],
        quick_fixes=["1", "2", "3", "4", "5"],
        rescue_plan=[],
        role_fit_summary="Alignment confirmed.",
        grounding_repos=["Hello-World"],
        comic_device="mock awards ceremony",
    )
    mock_profile = GitHubUserProfile(username="octocat", public_repos=1)
    mock_user_data = GitHubUserData(
        profile=mock_profile, repos=[GitHubRepoRaw(name="Hello-World", stargazers_count=10, has_readme=True)],
        events=[], total_repos_count=1, analyzed_repos_count=1
    )

    with patch("app.routes.analyze.github_service.fetch_user_data", new_callable=AsyncMock, return_value=mock_user_data), \
         patch("app.routes.analyze.ai_service.generate_roast_and_analysis", return_value=(mock_ai, True, None)):
        payload = {
            "username": "octocat",
            "role": "software_engineer",
            "brutality": "brutal",
            "variant": 2,
        }
        response = client.post("/api/regenerate-roast", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["roast"] == "Testing regenerate roast output."
        assert data["variant"] == 2
        assert data["comic_device"] == "mock awards ceremony"
        assert "Hello-World" in data["grounding_repos"]

