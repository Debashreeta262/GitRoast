import datetime
import hashlib
import random
import re
from typing import Any, Dict, List, Optional

from app.models.evidence import AngleSelection, EvidenceFact, RoastAngle
from app.models.github import GitHubUserData
from app.models.scoring import ScoringResult

COMIC_DEVICES: List[str] = [
    "dry understatement",
    "mock awards ceremony",
    "fake changelog/release notes",
    "sports-commentator play-by-play",
    "nature-documentary narration",
    "code-review comment",
    "weather forecast",
    "courtroom cross-examination",
    "restaurant review",
    "terms and conditions style",
    "support-ticket reply",
    "short comparison/analogy",
]

SCRATCH_PATTERN = re.compile(
    r"^(test|demo|temp|untitled|copy|clone|sample|tutorial|sandbox|playground|final|v\d|draft|foo|bar|baz)[\w-]*|.*[-_](test|demo|temp|copy|v2|final)$",
    re.IGNORECASE,
)


class EvidencePackService:
    def extract_facts(
        self, user_data: GitHubUserData, scoring_result: ScoringResult
    ) -> List[EvidenceFact]:
        """
        Computes a compact list of distinctive, verifiable facts ranked by
        how unusual they are for this profile.
        """
        facts: List[EvidenceFact] = []

        extractors = [
            self._extract_star_skew,
            self._extract_abandoned_repo,
            self._extract_naming_patterns,
            self._extract_ghost_repos,
            self._extract_fork_ratio,
            self._extract_language_distribution,
            self._extract_quality_chasm,
            self._extract_heavy_undocumented_repo,
            self._extract_zero_demos_or_licenses,
            self._extract_profile_presentation,
            self._extract_account_tenure_vs_repos,
            self._extract_flagged_repos,
        ]

        for extractor in extractors:
            try:
                fact = extractor(user_data, scoring_result)
                if fact:
                    facts.append(fact)
            except Exception:
                continue

        # If zero or few facts extracted, guarantee a baseline factual anchor
        if len(facts) < 2:
            facts.append(self._extract_baseline_repo_fact(user_data, scoring_result))

        # Deduplicate facts by ID
        seen_ids = set()
        unique_facts = []
        for f in facts:
            if f.id not in seen_ids:
                seen_ids.add(f.id)
                unique_facts.append(f)

        # Sort descending by unusualness score
        unique_facts.sort(key=lambda x: x.unusualness_score, reverse=True)
        return unique_facts

    def select_angles_and_device(
        self,
        facts: List[EvidenceFact],
        username: str,
        tone: str,
        variant: int = 0,
    ) -> AngleSelection:
        """
        Deterministically selects 2-3 angles and 1 comic device seeded by
        hash(username + tone + variant).
        """
        seed_key = f"{username.lower().strip()}:{tone.lower().strip()}:{variant}"
        seed_int = int(hashlib.sha256(seed_key.encode("utf-8")).hexdigest()[:16], 16)
        rng = random.Random(seed_int)

        comic_device = rng.choice(COMIC_DEVICES)

        if not facts:
            return AngleSelection(
                angles=[],
                comic_device=comic_device,
                variant=variant,
                all_facts=[],
            )

        if len(facts) <= 3:
            selected_facts = list(facts)
        else:
            # Prefer top unusual facts from the top 6 candidates
            candidate_pool = list(facts[: min(len(facts), 6)])
            target_count = min(3, len(candidate_pool))
            selected_facts = []

            while len(selected_facts) < target_count and candidate_pool:
                total_weight = sum(max(1.0, f.unusualness_score) for f in candidate_pool)
                roll = rng.uniform(0, total_weight)
                accum = 0.0
                picked_idx = 0
                for i, fact in enumerate(candidate_pool):
                    accum += max(1.0, fact.unusualness_score)
                    if accum >= roll:
                        picked_idx = i
                        break
                selected_facts.append(candidate_pool.pop(picked_idx))

        angles = [
            RoastAngle(
                id=f.id,
                fact_description=f.description,
                supporting_numbers=f.supporting_numbers,
                repo_names=f.repo_names,
            )
            for f in selected_facts
        ]

        return AngleSelection(
            angles=angles,
            comic_device=comic_device,
            variant=variant,
            all_facts=facts,
        )

    # -------------------------------------------------------------------------
    # Deterministic Fact Extractors
    # -------------------------------------------------------------------------

    def _extract_star_skew(
        self, user_data: GitHubUserData, scoring_result: ScoringResult
    ) -> Optional[EvidenceFact]:
        repos = scoring_result.repos
        if not repos:
            return None

        total_stars = sum(r.stars for r in repos)
        if total_stars > 0 and len(repos) >= 2:
            sorted_by_stars = sorted(repos, key=lambda r: r.stars, reverse=True)
            top_repo = sorted_by_stars[0]
            top_stars = top_repo.stars
            pct = round((top_stars / total_stars) * 100, 1)

            if pct >= 65.0:
                other_count = len(repos) - 1
                other_stars = total_stars - top_stars
                return EvidenceFact(
                    id="star_monopoly",
                    description=(
                        f"Repository '{top_repo.name}' holds {pct}% of your {total_stars} total stars "
                        f"({top_stars} stars), while your remaining {other_count} repositories have "
                        f"{other_stars} stars combined."
                    ),
                    supporting_numbers={
                        "top_repo_stars": top_stars,
                        "total_stars": total_stars,
                        "star_percentage": pct,
                        "other_repos_count": other_count,
                    },
                    repo_names=[top_repo.name],
                    unusualness_score=9.3 if pct >= 85.0 else 7.9,
                )
        elif total_stars == 0 and len(repos) >= 4:
            return EvidenceFact(
                id="zero_star_desert",
                description=(
                    f"Across {len(repos)} public repositories, you have accumulated exactly 0 stars "
                    "from the GitHub community."
                ),
                supporting_numbers={"total_repos": len(repos), "total_stars": 0},
                repo_names=[r.name for r in repos[:3]],
                unusualness_score=7.2,
            )
        return None

    def _extract_abandoned_repo(
        self, user_data: GitHubUserData, scoring_result: ScoringResult
    ) -> Optional[EvidenceFact]:
        stale_candidates = []
        now = datetime.datetime.now(datetime.timezone.utc)

        for r in scoring_result.repos:
            pushed_str = r.pushed_at or r.updated_at
            if not pushed_str:
                continue
            try:
                dt = datetime.datetime.fromisoformat(pushed_str.replace("Z", "+00:00"))
                idle_years = (now - dt).days / 365.25
                if idle_years >= 2.0:
                    stale_candidates.append((r, dt, idle_years))
            except Exception:
                continue

        if not stale_candidates:
            return None

        stale_candidates.sort(key=lambda x: x[2], reverse=True)
        oldest_repo, dt, idle_years = stale_candidates[0]
        date_label = dt.strftime("%B %Y")

        return EvidenceFact(
            id="ancient_abandoned_repo",
            description=(
                f"Repository '{oldest_repo.name}' hasn't seen a single commit in {idle_years:.1f} years "
                f"(last active in {date_label})."
            ),
            supporting_numbers={"years_idle": round(idle_years, 1), "last_active": date_label},
            repo_names=[oldest_repo.name],
            unusualness_score=min(9.5, 6.2 + idle_years * 0.7),
        )

    def _extract_naming_patterns(
        self, user_data: GitHubUserData, scoring_result: ScoringResult
    ) -> Optional[EvidenceFact]:
        scratchpads = [r.name for r in scoring_result.repos if SCRATCH_PATTERN.search(r.name)]
        if len(scratchpads) >= 2:
            return EvidenceFact(
                id="scratchpad_naming_sprawl",
                description=(
                    f"{len(scratchpads)} repositories bear scratchpad/prototype names "
                    f"({', '.join(scratchpads[:3])}{'...' if len(scratchpads) > 3 else ''}), "
                    "resembling abandoned experiments rather than finished products."
                ),
                supporting_numbers={"scratchpad_count": len(scratchpads)},
                repo_names=scratchpads[:4],
                unusualness_score=min(9.1, 6.5 + len(scratchpads) * 0.6),
            )
        return None

    def _extract_ghost_repos(
        self, user_data: GitHubUserData, scoring_result: ScoringResult
    ) -> Optional[EvidenceFact]:
        ghosts = [r for r in scoring_result.repos if not r.has_readme and not r.description]
        if len(ghosts) >= 2:
            ghost_names = [g.name for g in ghosts]
            return EvidenceFact(
                id="ghost_repositories",
                description=(
                    f"{len(ghosts)} repositories have neither a description nor a README "
                    f"({', '.join(ghost_names[:3])}), giving reviewers zero context on what they do."
                ),
                supporting_numbers={"ghost_count": len(ghosts)},
                repo_names=ghost_names[:4],
                unusualness_score=min(8.9, 6.0 + len(ghosts) * 0.5),
            )
        elif len(ghosts) == 1 and len(scoring_result.repos) <= 3:
            return EvidenceFact(
                id="ghost_repositories",
                description=f"Repository '{ghosts[0].name}' contains neither a description nor a README.",
                supporting_numbers={"ghost_count": 1},
                repo_names=[ghosts[0].name],
                unusualness_score=6.0,
            )
        return None

    def _extract_fork_ratio(
        self, user_data: GitHubUserData, scoring_result: ScoringResult
    ) -> Optional[EvidenceFact]:
        total = len(scoring_result.repos)
        if total < 3:
            return None

        forks = [r for r in scoring_result.repos if r.is_fork]
        fork_pct = round((len(forks) / total) * 100)

        if fork_pct >= 40:
            fork_names = [f.name for f in forks]
            return EvidenceFact(
                id="fork_heavy_portfolio",
                description=(
                    f"{len(forks)} of your {total} repositories ({fork_pct}%) are forks of other projects "
                    f"({', '.join(fork_names[:3])}), making your profile look more like bookmarks than code."
                ),
                supporting_numbers={"fork_count": len(forks), "total_repos": total, "fork_percentage": fork_pct},
                repo_names=fork_names[:3],
                unusualness_score=min(9.0, 6.2 + (fork_pct / 100) * 3.2),
            )
        elif total >= 6 and len(forks) == 0:
            return EvidenceFact(
                id="pure_original_codebase",
                description=f"All {total} repositories represent 100% original repositories with zero forks.",
                supporting_numbers={"total_repos": total, "fork_count": 0},
                repo_names=[r.name for r in scoring_result.repos[:2]],
                unusualness_score=6.3,
            )
        return None

    def _extract_language_distribution(
        self, user_data: GitHubUserData, scoring_result: ScoringResult
    ) -> Optional[EvidenceFact]:
        langs = [
            r.language
            for r in scoring_result.repos
            if r.language and r.language not in ("Unknown", "None", "")
        ]
        distinct_langs = list(dict.fromkeys(langs))

        if len(distinct_langs) >= 5:
            return EvidenceFact(
                id="language_sprawl",
                description=(
                    f"Your work is fragmented across {len(distinct_langs)} distinct programming languages "
                    f"({', '.join(distinct_langs[:4])}), exhibiting wide curiosity without clear stack specialization."
                ),
                supporting_numbers={"language_count": len(distinct_langs)},
                repo_names=[r.name for r in scoring_result.repos[:3]],
                unusualness_score=7.6,
            )
        elif len(distinct_langs) == 1 and len(scoring_result.repos) >= 4:
            single_lang = distinct_langs[0]
            return EvidenceFact(
                id="language_monoculture",
                description=(
                    f"100% of your projects are written strictly in {single_lang} ({len(scoring_result.repos)} repos) "
                    "with zero experimentation in neighboring ecosystems."
                ),
                supporting_numbers={"language_count": 1, "primary_language": single_lang},
                repo_names=[r.name for r in scoring_result.repos[:3]],
                unusualness_score=6.7,
            )
        return None

    def _extract_quality_chasm(
        self, user_data: GitHubUserData, scoring_result: ScoringResult
    ) -> Optional[EvidenceFact]:
        non_forks = [r for r in scoring_result.repos if not r.is_fork]
        if len(non_forks) < 2:
            return None

        best = max(non_forks, key=lambda r: r.quality_score)
        worst = min(non_forks, key=lambda r: r.quality_score)
        delta = best.quality_score - worst.quality_score

        if delta >= 35:
            return EvidenceFact(
                id="quality_chasm",
                description=(
                    f"Wide quality gap: flagship '{best.name}' earned {best.quality_score}/100, while "
                    f"'{worst.name}' sank to {worst.quality_score}/100."
                ),
                supporting_numbers={
                    "best_score": best.quality_score,
                    "worst_score": worst.quality_score,
                    "score_spread": delta,
                },
                repo_names=[best.name, worst.name],
                unusualness_score=min(8.9, 6.0 + (delta / 100) * 3.5),
            )
        return None

    def _extract_heavy_undocumented_repo(
        self, user_data: GitHubUserData, scoring_result: ScoringResult
    ) -> Optional[EvidenceFact]:
        undocumented_large = [
            r for r in user_data.repos if (r.size_kb >= 4000 and not r.has_readme)
        ]
        if undocumented_large:
            heaviest = max(undocumented_large, key=lambda r: r.size_kb)
            size_mb = round(heaviest.size_kb / 1024, 1)
            return EvidenceFact(
                id="heavy_undocumented_repo",
                description=(
                    f"Repository '{heaviest.name}' weighs {size_mb} MB of raw assets and code, yet contains "
                    "no README documentation."
                ),
                supporting_numbers={"size_mb": size_mb, "size_kb": heaviest.size_kb},
                repo_names=[heaviest.name],
                unusualness_score=8.6,
            )
        return None

    def _extract_zero_demos_or_licenses(
        self, user_data: GitHubUserData, scoring_result: ScoringResult
    ) -> Optional[EvidenceFact]:
        total = len(scoring_result.repos)
        if total < 3:
            return None

        has_demo = [r for r in scoring_result.repos if r.homepage]
        has_lic = [r for r in scoring_result.repos if r.license]

        if len(has_demo) == 0 and len(has_lic) == 0:
            return EvidenceFact(
                id="zero_demos_zero_licenses",
                description=(
                    f"Across all {total} repositories, zero have a live deployment URL and zero have an "
                    "open-source license."
                ),
                supporting_numbers={"total_repos": total, "demo_count": 0, "license_count": 0},
                repo_names=[r.name for r in scoring_result.repos[:2]],
                unusualness_score=8.2,
            )
        elif len(has_demo) == 0:
            return EvidenceFact(
                id="zero_live_demos",
                description=f"None of your {total} repositories include an interactive demo preview or live deployment URL.",
                supporting_numbers={"total_repos": total, "demo_count": 0},
                repo_names=[r.name for r in scoring_result.repos[:2]],
                unusualness_score=7.3,
            )
        elif len(has_lic) == 0:
            return EvidenceFact(
                id="zero_licenses",
                description=f"Not a single repository among your {total} projects carries an open-source license.",
                supporting_numbers={"total_repos": total, "license_count": 0},
                repo_names=[r.name for r in scoring_result.repos[:2]],
                unusualness_score=7.0,
            )
        return None

    def _extract_profile_presentation(
        self, user_data: GitHubUserData, scoring_result: ScoringResult
    ) -> Optional[EvidenceFact]:
        p = user_data.profile
        if not p.has_profile_readme and (not p.bio or len(p.bio.strip()) < 5):
            return EvidenceFact(
                id="blank_profile_canvas",
                description=(
                    f"Profile @{p.username} has no profile README and an empty bio, missing the easiest "
                    "recruiter conversion touchpoint."
                ),
                supporting_numbers={"has_profile_readme": False, "has_bio": False},
                repo_names=[],
                unusualness_score=6.6,
            )
        elif p.has_profile_readme and p.followers >= 10:
            return EvidenceFact(
                id="active_personal_branding",
                description=(
                    f"Profile @{p.username} maintains a dedicated profile README and has earned "
                    f"{p.followers} followers."
                ),
                supporting_numbers={"followers": p.followers, "has_profile_readme": True},
                repo_names=[],
                unusualness_score=6.2,
            )
        return None

    def _extract_account_tenure_vs_repos(
        self, user_data: GitHubUserData, scoring_result: ScoringResult
    ) -> Optional[EvidenceFact]:
        p = user_data.profile
        if not p.created_at:
            return None

        try:
            created_dt = datetime.datetime.fromisoformat(p.created_at.replace("Z", "+00:00"))
            now = datetime.datetime.now(datetime.timezone.utc)
            tenure_years = (now - created_dt).days / 365.25

            if tenure_years >= 4.0 and p.public_repos <= 2:
                return EvidenceFact(
                    id="dormant_veteran_account",
                    description=(
                        f"Account is {tenure_years:.1f} years old (created {created_dt.year}), yet hosts only "
                        f"{p.public_repos} public repositories."
                    ),
                    supporting_numbers={"tenure_years": round(tenure_years, 1), "public_repos": p.public_repos},
                    repo_names=[],
                    unusualness_score=7.8,
                )
            elif tenure_years <= 0.5 and p.public_repos >= 15:
                return EvidenceFact(
                    id="hyperactive_newcomer",
                    description=(
                        f"Account is under 6 months old, yet has already amassed {p.public_repos} repositories."
                    ),
                    supporting_numbers={"tenure_years": round(tenure_years, 1), "public_repos": p.public_repos},
                    repo_names=[],
                    unusualness_score=8.0,
                )
        except Exception:
            pass
        return None

    def _extract_flagged_repos(
        self, user_data: GitHubUserData, scoring_result: ScoringResult
    ) -> Optional[EvidenceFact]:
        flagged = [r for r in scoring_result.repos if r.flags]
        if flagged:
            worst = max(flagged, key=lambda r: len(r.flags))
            flags_str = ", ".join(worst.flags[:2])
            return EvidenceFact(
                id="repository_red_flags",
                description=f"Repository '{worst.name}' was flagged for: {flags_str}.",
                supporting_numbers={"flag_count": len(worst.flags)},
                repo_names=[worst.name],
                unusualness_score=6.5,
            )
        return None

    def _extract_baseline_repo_fact(
        self, user_data: GitHubUserData, scoring_result: ScoringResult
    ) -> EvidenceFact:
        if scoring_result.repos:
            top_repo = scoring_result.repos[0]
            return EvidenceFact(
                id="flagship_repository",
                description=(
                    f"Top repository '{top_repo.name}' is written in {top_repo.language or 'Code'} "
                    f"with {top_repo.stars} stars and quality score {top_repo.quality_score}/100."
                ),
                supporting_numbers={"stars": top_repo.stars, "quality_score": top_repo.quality_score},
                repo_names=[top_repo.name],
                unusualness_score=5.0,
            )
        return EvidenceFact(
            id="empty_repository_shelf",
            description=f"User @{user_data.profile.username} has 0 public repositories available for evaluation.",
            supporting_numbers={"public_repos": 0},
            repo_names=[],
            unusualness_score=8.0,
        )


evidence_pack_service = EvidencePackService()
