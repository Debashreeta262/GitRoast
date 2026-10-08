import asyncio
import json
from app.models.api import BrutalityLevel, TargetRole
from app.models.github import GitHubRepoRaw, GitHubUserData, GitHubUserProfile
from app.models.scoring import CategoryScores, RepoAnalysis, ScoreBreakdown, ScoringResult
from app.services.ai_service import ai_service
from app.services.evidence_pack import evidence_pack_service
from app.services.roast_validator import compute_bigram_jaccard, roast_validator


def make_profile_data(username, role, repos, profile_extra=None):
    p_extra = profile_extra or {}
    profile = GitHubUserProfile(
        username=username,
        name=p_extra.get("name", username.title()),
        bio=p_extra.get("bio", f"Developer working on {role.value}"),
        public_repos=len(repos),
        followers=p_extra.get("followers", 10),
        created_at=p_extra.get("created_at", "2020-01-01T00:00:00Z"),
        has_profile_readme=p_extra.get("has_profile_readme", True),
    )
    user_data = GitHubUserData(
        profile=profile,
        repos=repos,
        events=[],
        total_repos_count=len(repos),
        analyzed_repos_count=len(repos),
    )
    repo_analyses = [
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
            quality_score=75 if r.has_readme else 35,
            flags=[] if r.has_readme else ["Missing README"],
        )
        for r in repos
    ]
    cats = CategoryScores(
        technical_strength=70,
        project_quality=65,
        activity_consistency=70,
        documentation=60,
        recruiter_appeal=65,
        profile_presentation=70,
    )
    scoring_result = ScoringResult(
        scores=ScoreBreakdown(overall=68, categories=cats, weights={}),
        repos=repo_analyses,
        summary_metrics={"total_stars": sum(r.stars for r in repos)},
    )
    return user_data, scoring_result


async def run_verification():
    # 5 Diverse Profiles
    profiles = [
        (
            "frontend_craftsman",
            TargetRole.FRONTEND_ENGINEER,
            [
                GitHubRepoRaw(name="design-system-core", stargazers_count=420, language="TypeScript", has_readme=True, homepage="https://ds.dev", description="Accessible component primitives"),
                GitHubRepoRaw(name="react-canvas-viz", stargazers_count=85, language="TypeScript", has_readme=True, homepage="https://viz.dev", description="WebGL dashboard graphs"),
                GitHubRepoRaw(name="temp-css-test", stargazers_count=0, language="CSS", has_readme=False, description=None),
            ],
            {"bio": "Frontend architect specializing in design systems", "followers": 250},
        ),
        (
            "backend_architect",
            TargetRole.BACKEND_ENGINEER,
            [
                GitHubRepoRaw(name="raft-consensus-go", stargazers_count=850, language="Go", has_readme=True, license="Apache-2.0", description="Distributed consensus engine"),
                GitHubRepoRaw(name="ancient-kv-store", stargazers_count=35, language="Go", has_readme=True, pushed_at="2019-03-01T00:00:00Z", description="Simple key value store"),
                GitHubRepoRaw(name="demo-grpc-service", stargazers_count=2, language="Go", has_readme=False, description=None),
            ],
            {"bio": "Distributed systems engineer", "followers": 180},
        ),
        (
            "ml_researcher",
            TargetRole.ML_ENGINEER,
            [
                GitHubRepoRaw(name="nanotransformer-py", stargazers_count=1200, language="Python", has_readme=True, description="Miniature GPT training code"),
                GitHubRepoRaw(name="weights-experiments", stargazers_count=5, language="Jupyter Notebook", has_readme=False, size_kb=15000, description=None),
                GitHubRepoRaw(name="dataset-cleaner", stargazers_count=1, language="Python", has_readme=False, description=None),
            ],
            {"bio": "Deep learning research and model efficiency", "followers": 410},
        ),
        (
            "fork_collector",
            TargetRole.SOFTWARE_ENGINEER,
            [
                GitHubRepoRaw(name="upstream-kubernetes", fork=True, stargazers_count=0, has_readme=True, description="Kubernetes fork"),
                GitHubRepoRaw(name="upstream-react", fork=True, stargazers_count=0, has_readme=True, description="React fork"),
                GitHubRepoRaw(name="upstream-django", fork=True, stargazers_count=0, has_readme=True, description="Django fork"),
                GitHubRepoRaw(name="my-personal-script", fork=False, stargazers_count=1, has_readme=False, description="Quick script"),
            ],
            {"bio": None, "has_profile_readme": False, "followers": 2},
        ),
        (
            "junior_experimenter",
            TargetRole.SOFTWARE_ENGINEER,
            [
                GitHubRepoRaw(name="test-calculator", stargazers_count=0, language="JavaScript", has_readme=False, description=None),
                GitHubRepoRaw(name="demo-todo-v2", stargazers_count=0, language="JavaScript", has_readme=False, description=None),
                GitHubRepoRaw(name="sandbox-chat", stargazers_count=0, language="Python", has_readme=False, description=None),
                GitHubRepoRaw(name="final-portfolio", stargazers_count=0, language="HTML", has_readme=True, description="My personal site"),
            ],
            {"bio": "Learning to code", "has_profile_readme": False, "followers": 1},
        ),
    ]

    tones = [BrutalityLevel.PROFESSIONAL, BrutalityLevel.HONEST, BrutalityLevel.BRUTAL]
    results = []
    all_roasts = []

    for username, role, repos, profile_extra in profiles:
        user_data, scoring_result = make_profile_data(username, role, repos, profile_extra)
        facts = evidence_pack_service.extract_facts(user_data, scoring_result)

        for tone in tones:
            sel = evidence_pack_service.select_angles_and_device(facts, username, tone.value, variant=0)
            ai_res = ai_service.generate_grounded_fallback(
                user_data=user_data,
                scoring_result=scoring_result,
                role=role,
                brutality=tone,
                angle_selection=sel,
                variant=0,
            )

            # Programmatic checks
            has_banned, banned_msg = roast_validator.validate_banned_phrases(ai_res.roast)
            is_grounded, cite_count, citations = roast_validator.validate_evidence_grounding(
                ai_res.roast, sel.angles, [r.name for r in repos]
            )

            all_roasts.append(ai_res.roast)
            results.append({
                "username": username,
                "role": role.value,
                "tone": tone.value,
                "device": sel.comic_device,
                "cited": citations,
                "banned_free": has_banned,
                "grounded": is_grounded,
                "roast": ai_res.roast,
            })

    # Compute pairwise similarities to verify non-repetition
    max_similarity = 0.0
    for i in range(len(all_roasts)):
        for j in range(i + 1, len(all_roasts)):
            sim = compute_bigram_jaccard(all_roasts[i], all_roasts[j])
            if sim > max_similarity:
                max_similarity = sim

    print("=" * 100)
    print("GITROAST MULTI-USER VERIFICATION TABLE (5 PROFILES x 3 TONES)")
    print("=" * 100)
    for r in results:
        status = "PASS" if (r["banned_free"] and r["grounded"]) else "FAIL"
        print(f"[{status}] @{r['username']:<22} | Tone: {r['tone']:<12} | Device: {r['device']:<25}")
        print(f"      Grounded in : {', '.join(r['cited'])}")
        print(f"      Roast       : \"{r['roast'][:110]}...\"")
        print("-" * 100)

    print(f"\nTotal test runs          : {len(results)}")
    print(f"All Banned-Phrases Free  : {all(r['banned_free'] for r in results)}")
    print(f"All Evidence Grounded    : {all(r['grounded'] for r in results)}")
    print(f"Max Pairwise Jaccard Sim : {max_similarity:.2f} (Threshold < 0.60)")
    print("=" * 100)

if __name__ == "__main__":
    asyncio.run(run_verification())
