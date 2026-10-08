import datetime
import pytest
from app.models.api import TargetRole
from app.models.github import (
    GitHubEvent,
    GitHubRepoRaw,
    GitHubUserData,
    GitHubUserProfile,
)
from app.services.scoring_engine import scoring_engine, calculate_repo_quality

def make_profile(username="testuser", **kwargs):
    defaults = {
        "username": username,
        "name": "Test User",
        "avatar_url": "https://example.com/avatar.png",
        "bio": "Senior Engineer building distributed systems",
        "company": "Tech Corp",
        "location": "San Francisco, CA",
        "blog": "https://example.com",
        "public_repos": 10,
        "hireable": True,
        "has_profile_readme": True,
    }
    defaults.update(kwargs)
    return GitHubUserProfile(**defaults)

def test_empty_profile_scoring():
    profile = make_profile(public_repos=0, bio=None, blog=None, has_profile_readme=False)
    user_data = GitHubUserData(
        profile=profile,
        repos=[],
        events=[],
        total_repos_count=0,
        analyzed_repos_count=0,
    )
    result = scoring_engine.score_profile(user_data, TargetRole.SOFTWARE_ENGINEER)
    assert result.scores.overall == 0
    assert result.scores.categories.technical_strength == 0
    assert result.scores.categories.project_quality == 0
    assert len(result.repos) == 0

def test_fork_heavy_profile_scoring():
    # User with 5 repos, all 5 are forks
    profile = make_profile()
    repos = [
        GitHubRepoRaw(
            name=f"forked-repo-{i}",
            fork=True,
            stargazers_count=50,
            forks_count=10,
            language="JavaScript",
            has_readme=True,
            description="A popular open source library fork",
        )
        for i in range(5)
    ]
    user_data = GitHubUserData(
        profile=profile,
        repos=repos,
        events=[],
        total_repos_count=5,
        analyzed_repos_count=5,
    )
    result = scoring_engine.score_profile(user_data, TargetRole.SOFTWARE_ENGINEER)

    # Technical strength original work score is 0 because non_fork_count is 0
    assert result.scores.categories.technical_strength < 45
    # All repos should have the fork flag and penalized score
    for repo in result.repos:
        assert repo.is_fork is True
        assert any("Forked repo" in f for f in repo.flags)
        assert repo.quality_score <= 50

def test_high_activity_and_quality_profile():
    profile = make_profile(has_profile_readme=True)
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    repos = [
        GitHubRepoRaw(
            name="microservices-platform",
            fork=False,
            stargazers_count=350,
            forks_count=45,
            language="Python",
            has_readme=True,
            description="High throughput production microservices framework in FastAPI and Redis",
            homepage="https://microservices.demo.io",
            license="MIT",
            topics=["fastapi", "python", "docker", "microservices"],
            pushed_at=now_iso,
            languages={"Python": 120000, "Go": 30000},
        ),
        GitHubRepoRaw(
            name="distributed-cache",
            fork=False,
            stargazers_count=180,
            forks_count=20,
            language="Go",
            has_readme=True,
            description="Distributed in-memory caching server with raft consensus",
            homepage="https://cache.demo.io",
            license="Apache-2.0",
            topics=["go", "raft", "cache"],
            pushed_at=now_iso,
            languages={"Go": 95000},
        ),
    ]
    events = [
        GitHubEvent(id=str(i), type="PushEvent", created_at=now_iso) for i in range(15)
    ] + [
        GitHubEvent(id="100", type="PullRequestEvent", created_at=now_iso),
        GitHubEvent(id="101", type="IssuesEvent", created_at=now_iso),
    ]

    user_data = GitHubUserData(
        profile=profile,
        repos=repos,
        events=events,
        total_repos_count=2,
        analyzed_repos_count=2,
    )
    result = scoring_engine.score_profile(user_data, TargetRole.BACKEND_ENGINEER)

    assert result.scores.overall >= 80
    assert result.scores.categories.technical_strength >= 75
    assert result.scores.categories.project_quality >= 80
    assert result.scores.categories.documentation >= 80
    assert result.scores.categories.recruiter_appeal >= 75
    assert result.scores.categories.profile_presentation >= 80

def test_role_weight_differences():
    profile = make_profile()
    repos = [
        GitHubRepoRaw(
            name="frontend-app",
            fork=False,
            stargazers_count=50,
            language="TypeScript",
            has_readme=True,
            description="Interactive dashboard demo with Tailwind and React",
            homepage="https://dashboard-app.vercel.app",
            license="MIT",
            topics=["react", "typescript", "tailwind"],
            pushed_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        )
    ]
    user_data = GitHubUserData(profile=profile, repos=repos, events=[], total_repos_count=1, analyzed_repos_count=1)

    fe_result = scoring_engine.score_profile(user_data, TargetRole.FRONTEND_ENGINEER)
    be_result = scoring_engine.score_profile(user_data, TargetRole.BACKEND_ENGINEER)

    assert fe_result.scores.weights["project_quality"] == 0.30
    assert be_result.scores.weights["technical_strength"] == 0.30
    assert fe_result.scores.weights != be_result.scores.weights
