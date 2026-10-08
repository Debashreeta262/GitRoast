import datetime
import pytest
from app.models.api import BrutalityLevel, TargetRole
from app.models.github import (
    GitHubRepoRaw,
    GitHubUserData,
    GitHubUserProfile,
)
from app.models.scoring import RepoAnalysis, ScoreBreakdown, ScoringResult, CategoryScores
from app.services.evidence_pack import (
    COMIC_DEVICES,
    evidence_pack_service,
)


def make_test_user_data(username="testdev", repos=None, profile_kwargs=None):
    p_kwargs = {
        "username": username,
        "name": "Test Dev",
        "bio": "Full-stack engineer",
        "public_repos": len(repos or []),
        "followers": 5,
        "created_at": "2020-01-01T00:00:00Z",
        "has_profile_readme": True,
    }
    if profile_kwargs:
        p_kwargs.update(profile_kwargs)
    profile = GitHubUserProfile(**p_kwargs)

    raw_repos = repos or []
    return GitHubUserData(
        profile=profile,
        repos=raw_repos,
        events=[],
        total_repos_count=len(raw_repos),
        analyzed_repos_count=len(raw_repos),
    )


def make_test_scoring_result(user_data: GitHubUserData, repo_scores=None):
    repo_analyses = []
    for r in user_data.repos:
        q_score = (repo_scores or {}).get(r.name, 60)
        flags = []
        if not r.has_readme:
            flags.append("Missing README")
        if r.is_fork:
            flags.append("Fork")
        repo_analyses.append(
            RepoAnalysis(
                name=r.name,
                language=r.language,
                stars=r.stars,
                forks=r.forks,
                updated_at=r.updated_at,
                pushed_at=r.pushed_at,
                has_readme=r.has_readme,
                description=r.description,
                homepage=r.homepage,
                license=r.license,
                topics=r.topics,
                is_fork=r.is_fork,
                quality_score=q_score,
                flags=flags,
            )
        )

    categories = CategoryScores(
        technical_strength=60,
        project_quality=60,
        activity_consistency=60,
        documentation=60,
        recruiter_appeal=60,
        profile_presentation=60,
    )
    scores = ScoreBreakdown(overall=60, categories=categories, weights={})
    return ScoringResult(scores=scores, repos=repo_analyses, summary_metrics={})


def test_star_skew_detection():
    repos = [
        GitHubRepoRaw(name="breakout-app", stargazers_count=100, language="TypeScript", has_readme=True, description="Big app"),
        GitHubRepoRaw(name="helper-lib", stargazers_count=5, language="TypeScript", has_readme=True, description="Small lib"),
        GitHubRepoRaw(name="scratchpad", stargazers_count=0, language="TypeScript", has_readme=True, description="Notes"),
    ]
    user_data = make_test_user_data(repos=repos)
    scoring_result = make_test_scoring_result(user_data)

    facts = evidence_pack_service.extract_facts(user_data, scoring_result)
    fact_ids = [f.id for f in facts]

    assert "star_monopoly" in fact_ids
    skew_fact = next(f for f in facts if f.id == "star_monopoly")
    assert "breakout-app" in skew_fact.repo_names
    assert skew_fact.supporting_numbers["star_percentage"] > 90.0


def test_zero_stars_detection():
    repos = [
        GitHubRepoRaw(name=f"repo-{i}", stargazers_count=0, language="Python", has_readme=True, description=f"Repo {i}")
        for i in range(5)
    ]
    user_data = make_test_user_data(repos=repos)
    scoring_result = make_test_scoring_result(user_data)

    facts = evidence_pack_service.extract_facts(user_data, scoring_result)
    assert any(f.id == "zero_star_desert" for f in facts)


def test_abandoned_repo_detection():
    four_years_ago = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=4 * 365)).isoformat()
    recent = datetime.datetime.now(datetime.timezone.utc).isoformat()

    repos = [
        GitHubRepoRaw(name="active-project", pushed_at=recent, stargazers_count=1, has_readme=True, description="Active"),
        GitHubRepoRaw(name="ancient-dinosaur", pushed_at=four_years_ago, stargazers_count=0, has_readme=True, description="Old"),
    ]
    user_data = make_test_user_data(repos=repos)
    scoring_result = make_test_scoring_result(user_data)

    facts = evidence_pack_service.extract_facts(user_data, scoring_result)
    abandoned_facts = [f for f in facts if f.id == "ancient_abandoned_repo"]
    assert len(abandoned_facts) == 1
    assert "ancient-dinosaur" in abandoned_facts[0].repo_names
    assert abandoned_facts[0].supporting_numbers["years_idle"] >= 3.8


def test_naming_patterns_detection():
    repos = [
        GitHubRepoRaw(name="test-runner", stargazers_count=0, has_readme=True, description="Testing"),
        GitHubRepoRaw(name="demo-frontend", stargazers_count=0, has_readme=True, description="Demo"),
        GitHubRepoRaw(name="temp-parser", stargazers_count=0, has_readme=True, description="Temp"),
        GitHubRepoRaw(name="production-app", stargazers_count=2, has_readme=True, description="Real app"),
    ]
    user_data = make_test_user_data(repos=repos)
    scoring_result = make_test_scoring_result(user_data)

    facts = evidence_pack_service.extract_facts(user_data, scoring_result)
    naming_facts = [f for f in facts if f.id == "scratchpad_naming_sprawl"]
    assert len(naming_facts) == 1
    assert naming_facts[0].supporting_numbers["scratchpad_count"] == 3


def test_ghost_repos_detection():
    repos = [
        GitHubRepoRaw(name="ghost-one", has_readme=False, description=None),
        GitHubRepoRaw(name="ghost-two", has_readme=False, description=""),
        GitHubRepoRaw(name="legit-repo", has_readme=True, description="Legitimate repo"),
    ]
    user_data = make_test_user_data(repos=repos)
    scoring_result = make_test_scoring_result(user_data)

    facts = evidence_pack_service.extract_facts(user_data, scoring_result)
    ghost_facts = [f for f in facts if f.id == "ghost_repositories"]
    assert len(ghost_facts) == 1
    assert "ghost-one" in ghost_facts[0].repo_names
    assert "ghost-two" in ghost_facts[0].repo_names


def test_fork_heavy_detection():
    repos = [
        GitHubRepoRaw(name=f"fork-{i}", fork=True, stargazers_count=0, has_readme=True, description=f"Fork {i}")
        for i in range(3)
    ] + [
        GitHubRepoRaw(name="own-repo", fork=False, stargazers_count=0, has_readme=True, description="Own repo")
    ]
    user_data = make_test_user_data(repos=repos)
    scoring_result = make_test_scoring_result(user_data)

    facts = evidence_pack_service.extract_facts(user_data, scoring_result)
    fork_facts = [f for f in facts if f.id == "fork_heavy_portfolio"]
    assert len(fork_facts) == 1
    assert fork_facts[0].supporting_numbers["fork_percentage"] == 75


def test_quality_chasm_detection():
    repos = [
        GitHubRepoRaw(name="shining-star", stargazers_count=5, has_readme=True, description="Great project"),
        GitHubRepoRaw(name="train-wreck", stargazers_count=0, has_readme=False, description=None),
    ]
    user_data = make_test_user_data(repos=repos)
    scoring_result = make_test_scoring_result(user_data, repo_scores={"shining-star": 90, "train-wreck": 25})

    facts = evidence_pack_service.extract_facts(user_data, scoring_result)
    chasm_facts = [f for f in facts if f.id == "quality_chasm"]
    assert len(chasm_facts) == 1
    assert "shining-star" in chasm_facts[0].repo_names
    assert "train-wreck" in chasm_facts[0].repo_names


def test_angle_selection_determinism():
    repos = [
        GitHubRepoRaw(name="breakout", stargazers_count=50, has_readme=True, description="App"),
        GitHubRepoRaw(name="test-playground", stargazers_count=0, has_readme=False, description=None),
        GitHubRepoRaw(name="sample-code", stargazers_count=0, has_readme=False, description=None),
    ]
    user_data = make_test_user_data(username="alice", repos=repos)
    scoring_result = make_test_scoring_result(user_data)
    facts = evidence_pack_service.extract_facts(user_data, scoring_result)

    selection1 = evidence_pack_service.select_angles_and_device(facts, "alice", "brutal", variant=0)
    selection2 = evidence_pack_service.select_angles_and_device(facts, "alice", "brutal", variant=0)

    assert selection1.comic_device == selection2.comic_device
    assert [a.id for a in selection1.angles] == [a.id for a in selection2.angles]
    assert selection1.comic_device in COMIC_DEVICES


def test_angle_selection_variant_variation():
    repos = [
        GitHubRepoRaw(name="breakout", stargazers_count=50, has_readme=True, description="App"),
        GitHubRepoRaw(name="test-playground", stargazers_count=0, has_readme=False, description=None),
        GitHubRepoRaw(name="sample-code", stargazers_count=0, has_readme=False, description=None),
        GitHubRepoRaw(name="demo-runner", stargazers_count=0, has_readme=True, description="Runner"),
    ]
    user_data = make_test_user_data(username="alice", repos=repos)
    scoring_result = make_test_scoring_result(user_data)
    facts = evidence_pack_service.extract_facts(user_data, scoring_result)

    # Variant 0, 1, 2 should yield diversity across comic devices or angles
    results = [
        evidence_pack_service.select_angles_and_device(facts, "alice", "brutal", variant=v)
        for v in range(5)
    ]
    comic_devices = set(r.comic_device for r in results)
    # Out of 5 variants, at least 2 distinct devices should be chosen
    assert len(comic_devices) >= 2


def test_angle_selection_user_differentiation():
    repos = [
        GitHubRepoRaw(name="repo-a", stargazers_count=10, has_readme=True, description="A"),
        GitHubRepoRaw(name="repo-b", stargazers_count=0, has_readme=False, description=None),
    ]
    u1 = make_test_user_data(username="user_one", repos=repos)
    u2 = make_test_user_data(username="user_two", repos=repos)
    sr1 = make_test_scoring_result(u1)
    sr2 = make_test_scoring_result(u2)

    facts1 = evidence_pack_service.extract_facts(u1, sr1)
    facts2 = evidence_pack_service.extract_facts(u2, sr2)

    sel1 = evidence_pack_service.select_angles_and_device(facts1, "user_one", "honest", variant=0)
    sel2 = evidence_pack_service.select_angles_and_device(facts2, "user_two", "honest", variant=0)

    # Seeds differ because usernames differ
    assert (sel1.comic_device != sel2.comic_device) or ([a.id for a in sel1.angles] != [a.id for a in sel2.angles])
