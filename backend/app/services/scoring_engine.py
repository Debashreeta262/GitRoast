import datetime
import math
from typing import Dict, List, Set, Tuple
from app.models.api import TargetRole
from app.models.github import GitHubUserData, GitHubRepoRaw
from app.models.scoring import (
    CategoryScores,
    RepoAnalysis,
    ScoreBreakdown,
    ScoringResult,
)

ROLE_WEIGHTS: Dict[TargetRole, Dict[str, float]] = {
    TargetRole.SOFTWARE_ENGINEER: {
        "technical_strength": 0.25,
        "project_quality": 0.25,
        "activity_consistency": 0.15,
        "documentation": 0.15,
        "recruiter_appeal": 0.10,
        "profile_presentation": 0.10,
    },
    TargetRole.FRONTEND_ENGINEER: {
        "technical_strength": 0.15,
        "project_quality": 0.30,
        "activity_consistency": 0.15,
        "documentation": 0.10,
        "recruiter_appeal": 0.15,
        "profile_presentation": 0.15,
    },
    TargetRole.BACKEND_ENGINEER: {
        "technical_strength": 0.30,
        "project_quality": 0.20,
        "activity_consistency": 0.15,
        "documentation": 0.20,
        "recruiter_appeal": 0.10,
        "profile_presentation": 0.05,
    },
    TargetRole.ML_ENGINEER: {
        "technical_strength": 0.30,
        "project_quality": 0.25,
        "activity_consistency": 0.10,
        "documentation": 0.20,
        "recruiter_appeal": 0.10,
        "profile_presentation": 0.05,
    },
    TargetRole.DATA_SCIENTIST: {
        "technical_strength": 0.25,
        "project_quality": 0.25,
        "activity_consistency": 0.15,
        "documentation": 0.20,
        "recruiter_appeal": 0.10,
        "profile_presentation": 0.05,
    },
}

ROLE_KEYWORDS: Dict[TargetRole, Set[str]] = {
    TargetRole.FRONTEND_ENGINEER: {
        "react", "vue", "angular", "svelte", "nextjs", "tailwind", "css", "html", "javascript", "typescript", "frontend", "ui", "ux", "web"
    },
    TargetRole.BACKEND_ENGINEER: {
        "python", "go", "golang", "rust", "java", "c#", "fastapi", "django", "node", "express", "sql", "postgres", "redis", "docker", "k8s", "backend", "api", "microservices"
    },
    TargetRole.ML_ENGINEER: {
        "python", "pytorch", "tensorflow", "keras", "scikit-learn", "huggingface", "llm", "deep-learning", "machine-learning", "cuda", "onnx", "transformers"
    },
    TargetRole.DATA_SCIENTIST: {
        "python", "r", "jupyter", "pandas", "numpy", "matplotlib", "seaborn", "data-analysis", "analytics", "statistics", "sql", "spark"
    },
    TargetRole.SOFTWARE_ENGINEER: set(),
}

SUSPICIOUS_REPO_NAMES = {"test", "demo", "asdf", "hello-world", "my-app", "temp", "tmp", "first-repo"}


def _parse_iso(iso_str: str | None) -> datetime.datetime | None:
    if not iso_str:
        return None
    try:
        clean_str = iso_str.replace("Z", "+00:00")
        return datetime.datetime.fromisoformat(clean_str)
    except Exception:
        return None


def calculate_repo_quality(repo: GitHubRepoRaw) -> Tuple[int, List[str]]:
    score = 0
    flags = []

    # 1. README
    if repo.has_readme:
        score += 25
    else:
        flags.append("Missing README")

    # 2. Description
    if repo.description and len(repo.description.strip()) > 10:
        score += 15
    else:
        flags.append("No/short description")

    # 3. License
    if repo.license:
        score += 15
    else:
        flags.append("No open-source license")

    # 4. Live Demo / Homepage
    if repo.homepage and len(repo.homepage.strip()) > 5:
        score += 15
    else:
        flags.append("No live demo link")

    # 5. Topics
    if repo.topics and len(repo.topics) > 0:
        score += 10
    else:
        flags.append("No topic tags")

    # 6. Recency / Maintenance (Pushed within 180 days)
    pushed_dt = _parse_iso(repo.pushed_at)
    now = datetime.datetime.now(datetime.timezone.utc)
    if pushed_dt:
        days_ago = (now - pushed_dt).days
        if days_ago <= 180:
            score += 10
        elif days_ago > 365:
            flags.append(f"Stale ({days_ago} days since last push)")
    else:
        flags.append("No push history")

    # 7. Stars & Community validation (up to 10 log-scaled)
    if repo.stars > 0:
        star_points = min(10, int(math.log10(repo.stars + 1) * 7))
        score += star_points

    # 8. Fork handling
    if repo.is_fork:
        flags.append("Forked repo (not original code)")
        score = int(score * 0.5)

    final_score = max(0, min(100, score))
    return final_score, flags


class ScoringEngine:
    def score_profile(self, user_data: GitHubUserData, role: TargetRole) -> ScoringResult:
        repos = user_data.repos
        profile = user_data.profile
        events = user_data.events
        total_repos_count = max(len(repos), 1)

        # 1. Compute individual repo scores
        repo_analyses: List[RepoAnalysis] = []
        for r in repos:
            q_score, flags = calculate_repo_quality(r)
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

        if not repos:
            # Empty repos edge case
            zero_categories = CategoryScores(
                technical_strength=0,
                project_quality=0,
                activity_consistency=0,
                documentation=0,
                recruiter_appeal=0,
                profile_presentation=0,
            )
            weights = ROLE_WEIGHTS[role]
            return ScoringResult(
                scores=ScoreBreakdown(overall=0, categories=zero_categories, weights=weights),
                repos=[],
                summary_metrics={"total_repos": 0, "total_stars": 0},
            )

        # 2. Gather aggregate signals
        non_fork_repos = [r for r in repos if not r.is_fork]
        non_fork_count = len(non_fork_repos)
        total_stars = sum(r.stars for r in repos)
        total_forks = sum(r.forks for r in repos)

        unique_languages = {r.language for r in repos if r.language}
        all_topics: Set[str] = set()
        for r in repos:
            all_topics.update(t.lower() for t in r.topics)

        # Language byte totals from deep analyzed repos
        lang_bytes: Dict[str, int] = {}
        for r in repos:
            for l_name, l_b in r.languages.items():
                lang_bytes[l_name] = lang_bytes.get(l_name, 0) + l_b
        total_lang_bytes = sum(lang_bytes.values())
        max_lang_bytes = max(lang_bytes.values()) if lang_bytes else 0

        # Now timestamp
        now = datetime.datetime.now(datetime.timezone.utc)
        recent_pushed_repos = 0
        for r in repos:
            p_dt = _parse_iso(r.pushed_at)
            if p_dt and (now - p_dt).days <= 180:
                recent_pushed_repos += 1

        repos_with_readme = sum(1 for r in repos if r.has_readme)
        repos_with_desc = sum(1 for r in repos if r.description and len(r.description.strip()) > 5)
        repos_with_long_desc = sum(1 for r in repos if r.description and len(r.description.strip()) > 25)
        repos_with_license = sum(1 for r in repos if r.license)
        repos_with_demo = sum(1 for r in repos if r.homepage and len(r.homepage.strip()) > 5)
        repos_with_topics = sum(1 for r in repos if r.topics and len(r.topics) > 0)

        # --- A. Technical Strength (0 - 100) ---
        # 1. Original work proportion: up to 30 pts
        tech_original = (non_fork_count / total_repos_count) * 30.0

        # 2. Language diversity: up to 25 pts (optimal is 3-5 distinct languages)
        tech_lang_diversity = min(1.0, len(unique_languages) / 4.0) * 25.0

        # 3. Depth in top language: up to 25 pts
        if total_lang_bytes > 0:
            tech_depth = (max_lang_bytes / total_lang_bytes) * 25.0
        else:
            tech_depth = 15.0 if unique_languages else 0.0

        # 4. Tooling & Topic maturity: up to 20 pts
        tech_topics = (repos_with_topics / total_repos_count) * 20.0

        raw_tech = tech_original + tech_lang_diversity + tech_depth + tech_topics

        # Role alignment adjustment (±10 pts)
        role_kw = ROLE_KEYWORDS.get(role, set())
        if role_kw:
            matched_kw = sum(1 for t in all_topics if t in role_kw)
            matched_langs = sum(1 for l in unique_languages if l and l.lower() in role_kw)
            if matched_kw + matched_langs >= 3:
                raw_tech += 8.0
            elif matched_kw + matched_langs == 0:
                raw_tech -= 8.0

        technical_strength = max(0, min(100, int(round(raw_tech))))

        # --- B. Project Quality (0 - 100) ---
        # 1. Star power (log-scaled): up to 30 pts
        quality_stars = min(30.0, math.log10(total_stars + 1) * 12.0)

        # 2. Fork power (log-scaled): up to 15 pts
        quality_forks = min(15.0, math.log10(total_forks + 1) * 8.0)

        # 3. Description coverage: up to 15 pts
        quality_desc = (repos_with_desc / total_repos_count) * 15.0

        # 4. License coverage: up to 15 pts
        quality_lic = (repos_with_license / total_repos_count) * 15.0

        # 5. Demo / Deployment link coverage: up to 15 pts
        quality_demo = (repos_with_demo / total_repos_count) * 15.0

        # 6. Active maintenance (pushed < 180 days): up to 10 pts
        quality_maint = (recent_pushed_repos / total_repos_count) * 10.0

        project_quality = max(0, min(100, int(round(
            quality_stars + quality_forks + quality_desc + quality_lic + quality_demo + quality_maint
        ))))

        # --- C. Activity & Consistency (0 - 100) ---
        # Evaluated from the 90-day Events API and push timestamps
        push_events = [e for e in events if e.type == "PushEvent"]
        push_events_count = len(push_events)
        unique_event_types = len({e.type for e in events})

        # Recent pushes: up to 40 pts
        activity_pushes = min(40.0, push_events_count * 2.0)

        # Event type diversity (PRs, Issues, Reviews): up to 30 pts
        activity_diversity = min(30.0, (unique_event_types / 4.0) * 30.0)

        # Repos pushed within 90 days: up to 30 pts
        repos_pushed_90d = 0
        for r in repos:
            p_dt = _parse_iso(r.pushed_at)
            if p_dt and (now - p_dt).days <= 90:
                repos_pushed_90d += 1
        activity_spread = min(30.0, repos_pushed_90d * 10.0)

        activity_consistency = max(0, min(100, int(round(
            activity_pushes + activity_diversity + activity_spread
        ))))

        # --- D. Documentation (0 - 100) ---
        # 1. README coverage: up to 50 pts
        doc_readme = (repos_with_readme / total_repos_count) * 50.0

        # 2. Detailed descriptions: up to 30 pts
        doc_desc = (repos_with_long_desc / total_repos_count) * 30.0

        # 3. Topic coverage: up to 20 pts
        doc_topics = (repos_with_topics / total_repos_count) * 20.0

        documentation = max(0, min(100, int(round(doc_readme + doc_desc + doc_topics))))

        # --- E. Recruiter Appeal (0 - 100) ---
        # 1. High quality repos (score >= 65): up to 35 pts
        quality_repos_count = sum(1 for ra in repo_analyses if ra.quality_score >= 65 and not ra.is_fork)
        recruiter_showcase = min(35.0, quality_repos_count * 12.0)

        # 2. Clean repo names (no abandoned scratchpad names): up to 25 pts
        suspicious_count = sum(1 for r in repos if r.name.lower() in SUSPICIOUS_REPO_NAMES)
        recruiter_naming = max(5.0, 25.0 - (suspicious_count * 7.0))

        # 3. Live demo on top non-fork repos: up to 20 pts
        top_non_forks = [r for r in repos if not r.is_fork][:5]
        has_top_demo = any(r.homepage and len(r.homepage.strip()) > 5 for r in top_non_forks)
        recruiter_demo = 20.0 if has_top_demo else 0.0

        # 4. Identity & clarity: up to 20 pts
        recruiter_identity = 0.0
        if profile.bio and len(profile.bio.strip()) > 5:
            recruiter_identity += 10.0
        if profile.hireable or profile.blog or profile.location:
            recruiter_identity += 10.0

        recruiter_appeal = max(0, min(100, int(round(
            recruiter_showcase + recruiter_naming + recruiter_demo + recruiter_identity
        ))))

        # --- F. Profile Presentation (0 - 100) ---
        pres_score = 0
        if profile.bio and len(profile.bio.strip()) > 5:
            pres_score += 20
        if profile.name and len(profile.name.strip()) > 0:
            pres_score += 15
        if profile.avatar_url:
            pres_score += 10
        if profile.company or profile.location:
            pres_score += 15
        if profile.blog:
            pres_score += 15
        if profile.has_profile_readme:
            pres_score += 25

        profile_presentation = max(0, min(100, pres_score))

        category_scores = CategoryScores(
            technical_strength=technical_strength,
            project_quality=project_quality,
            activity_consistency=activity_consistency,
            documentation=documentation,
            recruiter_appeal=recruiter_appeal,
            profile_presentation=profile_presentation,
        )

        # Overall Score calculation via role weights
        weights = ROLE_WEIGHTS[role]
        weighted_sum = (
            category_scores.technical_strength * weights["technical_strength"]
            + category_scores.project_quality * weights["project_quality"]
            + category_scores.activity_consistency * weights["activity_consistency"]
            + category_scores.documentation * weights["documentation"]
            + category_scores.recruiter_appeal * weights["recruiter_appeal"]
            + category_scores.profile_presentation * weights["profile_presentation"]
        )
        overall_score = max(0, min(100, int(round(weighted_sum))))

        # Sort repos: quality score descending, then stars descending
        repo_analyses.sort(key=lambda r: (r.quality_score, r.stars), reverse=True)

        return ScoringResult(
            scores=ScoreBreakdown(
                overall=overall_score,
                categories=category_scores,
                weights=weights,
            ),
            repos=repo_analyses,
            summary_metrics={
                "total_repos": len(repos),
                "non_fork_repos": non_fork_count,
                "total_stars": total_stars,
                "total_forks": total_forks,
                "active_languages": len(unique_languages),
                "recent_pushes_in_90d": push_events_count,
            },
        )

scoring_engine = ScoringEngine()
