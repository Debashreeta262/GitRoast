import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import httpx

from app.banned_phrases import BANNED_PHRASES, format_banned_phrases
from app.config import settings
from app.models.ai import AiAnalysisResult, RescuePlanItem
from app.models.api import BrutalityLevel, TargetRole
from app.models.evidence import AngleSelection, RoastAngle
from app.models.github import GitHubUserData
from app.models.scoring import ScoringResult
from app.services.evidence_pack import evidence_pack_service
from app.services.roast_validator import roast_validator
from app.tone_personas import COMIC_DEVICE_GUIDELINES, TONE_PERSONAS

logger = logging.getLogger("gitroast.ai")

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"
SYSTEM_PROMPT_PATH = PROMPTS_DIR / "system.md"
USER_TEMPLATE_PATH = PROMPTS_DIR / "user_template.md"

CODE_FENCE_REGEX = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)


def clean_llm_json(raw_text: str) -> str:
    """Strips markdown code fences and extraneous leading/trailing whitespace."""
    text = raw_text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return text


class AiService:
    def __init__(self):
        self.system_prompt_template = ""
        self.user_prompt_template = ""
        self._load_prompts()

    def _load_prompts(self):
        try:
            self.system_prompt_template = SYSTEM_PROMPT_PATH.read_text(encoding="utf-8")
            self.user_prompt_template = USER_TEMPLATE_PATH.read_text(encoding="utf-8")
        except Exception as e:
            logger.error(f"Failed to load prompt files: {e}")

    def build_candidate_summary(
        self, user_data: GitHubUserData, scoring_result: ScoringResult
    ) -> Dict[str, Any]:
        """Creates a compact, structured summary of candidate data, avoiding raw API dumps."""
        p = user_data.profile
        top_repos_summary = []
        for r in scoring_result.repos[:10]:
            top_repos_summary.append({
                "name": r.name,
                "language": r.language or "Unknown",
                "stars": r.stars,
                "forks": r.forks,
                "is_fork": r.is_fork,
                "has_readme": r.has_readme,
                "description": (r.description[:120] + "...") if r.description and len(r.description) > 120 else r.description,
                "has_demo": bool(r.homepage),
                "has_license": bool(r.license),
                "topics": r.topics[:5],
                "quality_score": r.quality_score,
                "flags": r.flags,
            })

        return {
            "candidate": {
                "username": p.username,
                "name": p.name or "N/A",
                "bio": p.bio or "None provided",
                "company": p.company or "N/A",
                "location": p.location or "N/A",
                "has_profile_readme": p.has_profile_readme,
                "public_repos": p.public_repos,
                "followers": p.followers,
            },
            "scores": {
                "overall": scoring_result.scores.overall,
                "categories": scoring_result.scores.categories.model_dump(),
            },
            "metrics": scoring_result.summary_metrics,
            "top_repositories": top_repos_summary,
            "activity_window": {
                "recent_public_events_sample_size": len(user_data.events),
                "note": "Events API covers up to 90 days / 300 events only.",
            },
        }

    def render_prompts(
        self,
        candidate_summary: Dict[str, Any],
        role: TargetRole,
        brutality: BrutalityLevel,
        angle_selection: Optional[AngleSelection] = None,
    ) -> Tuple[str, str]:
        role_label = role.value.replace("_", " ").title()
        brutality_label = brutality.value.lower()

        tone_info = TONE_PERSONAS.get(brutality, TONE_PERSONAS[BrutalityLevel.HONEST])
        tone_persona_text = f"Persona: {tone_info['label']}\n{tone_info['voice']}\n{tone_info['roast_directive']}"

        comic_device = angle_selection.comic_device if angle_selection else "code-review comment"
        comic_guideline = COMIC_DEVICE_GUIDELINES.get(
            comic_device, f"Frame the roast using {comic_device}."
        )

        banned_phrases_text = format_banned_phrases()

        system_prompt = (
            self.system_prompt_template.replace("{{ROLE}}", role_label)
            .replace("{{BRUTALITY}}", brutality_label)
            .replace("{{TONE_PERSONA_GUIDELINES}}", tone_persona_text)
            .replace("{{COMIC_DEVICE_GUIDELINE}}", comic_guideline)
            .replace("{{BANNED_PHRASES}}", banned_phrases_text)
        )

        angles_data = [a.model_dump() for a in angle_selection.angles] if angle_selection else []
        angles_json_str = json.dumps(angles_data, indent=2)
        candidate_json_str = json.dumps(candidate_summary, indent=2)

        user_prompt = (
            self.user_prompt_template.replace("{{ROLE}}", role_label)
            .replace("{{BRUTALITY}}", brutality_label)
            .replace("{{COMIC_DEVICE}}", comic_device)
            .replace("{{SELECTED_ANGLES_JSON}}", angles_json_str)
            .replace("{{CANDIDATE_DATA_JSON}}", candidate_json_str)
        )

        return system_prompt, user_prompt

    async def _call_gemini(self, api_key: str, system_prompt: str, user_prompt: str) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        payload = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {
                "temperature": 0.95,
                "topP": 0.95,
                "maxOutputTokens": 2048,
                "responseMimeType": "application/json",
            },
        }
        async with httpx.AsyncClient(timeout=25.0) as client:
            res = await client.post(url, json=payload)
            if res.status_code != 200:
                raise RuntimeError(f"Gemini API returned status {res.status_code}: {res.text}")
            data = res.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]

    async def _call_openai(self, api_key: str, system_prompt: str, user_prompt: str) -> str:
        url = "https://api.openai.com/v1/chat/completions"
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.95,
            "top_p": 0.95,
            "max_tokens": 2048,
            "response_format": {"type": "json_object"},
        }
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=25.0) as client:
            res = await client.post(url, json=payload, headers=headers)
            if res.status_code != 200:
                raise RuntimeError(f"OpenAI API returned status {res.status_code}: {res.text}")
            data = res.json()
            return data["choices"][0]["message"]["content"]

    async def _call_anthropic(self, api_key: str, system_prompt: str, user_prompt: str) -> str:
        url = "https://api.anthropic.com/v1/messages"
        payload = {
            "model": "claude-3-5-haiku-20241022",
            "max_tokens": 2048,
            "temperature": 0.95,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
        }
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=25.0) as client:
            res = await client.post(url, json=payload, headers=headers)
            if res.status_code != 200:
                raise RuntimeError(f"Anthropic API returned status {res.status_code}: {res.text}")
            data = res.json()
            return data["content"][0]["text"]

    async def _dispatch_llm_call(self, system_prompt: str, user_prompt: str) -> str:
        provider = settings.LLM_PROVIDER.lower().strip()
        gemini_key = settings.GEMINI_API_KEY.strip()
        openai_key = settings.OPENAI_API_KEY.strip()
        anthropic_key = settings.ANTHROPIC_API_KEY.strip()

        if provider == "gemini" and gemini_key:
            return await self._call_gemini(gemini_key, system_prompt, user_prompt)
        elif provider == "openai" and openai_key:
            return await self._call_openai(openai_key, system_prompt, user_prompt)
        elif provider == "anthropic" and anthropic_key:
            return await self._call_anthropic(anthropic_key, system_prompt, user_prompt)

        # Auto-detect if provider didn't match configured keys
        if gemini_key:
            return await self._call_gemini(gemini_key, system_prompt, user_prompt)
        if openai_key:
            return await self._call_openai(openai_key, system_prompt, user_prompt)
        if anthropic_key:
            return await self._call_anthropic(anthropic_key, system_prompt, user_prompt)

        raise RuntimeError("No LLM API key configured (GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY)")

    def _synthesize_fact_roast(
        self,
        angle: RoastAngle,
        brutality: BrutalityLevel,
        comic_device: str,
        variant: int,
        top_repo: str,
        top_lang: str,
    ) -> str:
        """
        Synthesizes a distinct, non-repetitive roast sentence for a specific fact type.
        Uses 3-4 sentence variations per tone, picked via variant modulo.
        """
        fid = angle.id
        v_idx = variant % 3
        repos = angle.repo_names
        primary_repo = repos[0] if repos else top_repo
        secondary_repo = repos[1] if len(repos) > 1 else "secondary-project"
        nums = angle.supporting_numbers

        # 1. Star Monopoly
        if fid == "star_monopoly":
            stars = nums.get("top_repo_stars", 10)
            total = nums.get("total_stars", 10)
            pct = nums.get("star_percentage", 80)
            other = nums.get("other_repos_count", 2)
            if brutality == BrutalityLevel.BRUTAL:
                t = [
                    f"'{primary_repo}' carries {pct}% of your {total} community stars ({stars} stars), while your remaining {other} repositories survive on pure hope and zero web traffic.",
                    f"Your GitHub presence is essentially a one-hit wonder: '{primary_repo}' captured {stars} of your {total} stars, while your other {other} projects read like abandoned drafts.",
                    f"'{primary_repo}' hoards {pct}% of all your community stars ({stars} stars), leaving your other {other} projects in total obscurity.",
                ]
            elif brutality == BrutalityLevel.HONEST:
                t = [
                    f"While '{primary_repo}' achieved genuine traction with {stars} stars, your remaining {other} repositories show minimal community engagement.",
                    f"Recruiters see that '{primary_repo}' accounts for {pct}% of your {total} stars; expanding documentation across your other {other} projects will demonstrate consistent depth.",
                    f"Your portfolio relies heavily on '{primary_repo}' ({stars} of {total} stars); broadening the scope across your {other} other repositories will strengthen candidate standing.",
                ]
            else:
                t = [
                    f"Candidate exhibits proven capability in flagship repository '{primary_repo}' ({stars} stars), though portfolio impact remains heavily concentrated against {other} secondary repositories.",
                    f"Technical leadership will note solid adoption on '{primary_repo}' ({stars} stars); standardizing engineering rigor across the other {other} projects will accelerate staff-level consideration.",
                    f"Demonstrated execution on '{primary_repo}' ({pct}% of star footprint) would benefit from broader architectural distribution across the remaining {other} repositories.",
                ]
            return t[v_idx]

        # 2. Ancient Abandoned Repo
        if fid == "ancient_abandoned_repo":
            idle = nums.get("years_idle", 3.0)
            date_lbl = nums.get("last_active", "several years ago")
            if brutality == BrutalityLevel.BRUTAL:
                t = [
                    f"Repository '{primary_repo}' hasn't seen a git commit in {idle:.1f} years since {date_lbl}, serving as an archaeological dig site for obsolete dependencies.",
                    f"You last pushed to '{primary_repo}' {idle:.1f} years ago in {date_lbl}; at this point, that codebase belongs in a computer history museum.",
                    f"Opening '{primary_repo}' (untouched for {idle:.1f} years since {date_lbl}) feels like discovering a time capsule from an earlier era of computing.",
                ]
            elif brutality == BrutalityLevel.HONEST:
                t = [
                    f"Repository '{primary_repo}' has been completely inactive for {idle:.1f} years since {date_lbl}, which can signal unfinished initiatives during technical reviews.",
                    f"Leaving '{primary_repo}' untouched for {idle:.1f} years creates friction in technical evaluations; archiving inactive repos keeps candidate focus clear.",
                    f"Reviewers will notice that '{primary_repo}' hasn't been updated in {idle:.1f} years (last touched {date_lbl}); consider documenting its legacy status.",
                ]
            else:
                t = [
                    f"Candidate maintains legacy artifacts such as '{primary_repo}', which has remained inactive for {idle:.1f} years since {date_lbl}; formal archival would refine executive presentation.",
                    f"Portfolio governance would benefit from archiving inactive repositories like '{primary_repo}' ({idle:.1f} years idle since {date_lbl}) to spotlight current capabilities.",
                    f"Demonstrated technical tenure is evident, though unattended projects like '{primary_repo}' ({idle:.1f} years since {date_lbl}) dilute visibility of modern production work.",
                ]
            return t[v_idx]

        # 3. Scratchpad Naming Sprawl
        if fid == "scratchpad_naming_sprawl":
            count = nums.get("scratchpad_count", 3)
            r_str = ", ".join(repos[:2])
            if brutality == BrutalityLevel.BRUTAL:
                t = [
                    f"{count} repositories carry draft/scratchpad titles ({r_str}), giving reviewers the impression of unfinished weekend experiments rather than production systems.",
                    f"With {count} projects titled '{r_str}', recruiters have to guess which codebases were serious engineering efforts and which were 20-minute demos.",
                    f"Publishing {count} scratchpads including '{r_str}' publicly suggests a habit of starting ambitious ideas and leaving them in permanent prototype limbo.",
                ]
            elif brutality == BrutalityLevel.HONEST:
                t = [
                    f"You have {count} repositories with prototype naming ({r_str}); consolidating or renaming them into cohesive packages will elevate technical perception.",
                    f"Recruiters screening quickly will notice {count} scratchpad names like '{r_str}'; packaging them into clear portfolio modules will prevent confusion.",
                    f"Hosting {count} experimental repositories ({r_str}) demonstrates curiosity, but professional portfolios prioritize polished, well-scoped products.",
                ]
            else:
                t = [
                    f"Candidate demonstrates active prototyping initiative across {count} exploratory repositories ({r_str}); transitioning prototypes into formalized products will bolster candidacy.",
                    f"Portfolio presentation shows {count} experimental codebases ({r_str}); establishing clear release lifecycles will reinforce engineering maturity.",
                    f"Consolidating early-stage experiments ({count} projects including {r_str}) will focus reviewer attention on candidate's highest-leverage work.",
                ]
            return t[v_idx]

        # 4. Ghost Repositories
        if fid == "ghost_repositories":
            count = nums.get("ghost_count", 2)
            r_str = ", ".join(repos[:2])
            if brutality == BrutalityLevel.BRUTAL:
                t = [
                    f"Repositories like '{r_str}' have zero README and zero description, forcing hiring managers to read raw source files just to decipher what was built.",
                    f"Publishing {count} undocumented repositories including '{r_str}' without a README treats GitHub like an unorganized backup drive with public read access.",
                    f"Navigating '{r_str}' with no README or description feels like joining an on-call rotation with zero runbooks or documentation.",
                ]
            elif brutality == BrutalityLevel.HONEST:
                t = [
                    f"Repositories like '{r_str}' lack both README and description; adding a 1-minute overview will prevent recruiters from immediately skipping past them.",
                    f"Leaving {count} projects like '{r_str}' without documentation creates unnecessary friction for reviewers trying to evaluate your skills.",
                    f"Hiring managers need quick context; providing problem statements for undocumented projects like '{r_str}' will showcase strong professional communication.",
                ]
            else:
                t = [
                    f"Candidate documentation discipline requires alignment; projects such as '{r_str}' currently lack contextual READMEs or architectural summaries.",
                    f"Strengthening documentation across undocumented repositories like '{r_str}' will demonstrate the communication rigor expected of senior engineers.",
                    f"Reviewers will seek system context on '{r_str}'; authoring comprehensive overviews will ensure technical scope is accurately recognized.",
                ]
            return t[v_idx]

        # 5. Fork Heavy Portfolio
        if fid == "fork_heavy_portfolio":
            fork_count = nums.get("fork_count", 3)
            total = nums.get("total_repos", 5)
            pct = nums.get("fork_percentage", 60)
            r_str = ", ".join(repos[:2])
            if brutality == BrutalityLevel.BRUTAL:
                t = [
                    f"{fork_count} of your {total} repositories ({pct}%) are forks like '{r_str}', making your GitHub profile read more like an organized bookmark folder than an engineering portfolio.",
                    f"Forking repositories like '{r_str}' to make up {pct}% of your profile creates the impression of collecting code rather than authoring original systems.",
                    f"With {fork_count} forked projects ({pct}%) including '{r_str}', recruiters will struggle to separate your original work from upstream library code.",
                ]
            elif brutality == BrutalityLevel.HONEST:
                t = [
                    f"{fork_count} of your {total} repositories ({pct}%) are forks ({r_str}); highlighting original repositories with distinct pinned projects will clarify your contribution.",
                    f"A {pct}% fork ratio ({r_str}) can blur the line between personal contributions and upstream code during initial technical screening.",
                    f"Pinning original projects and distinguishing your {fork_count} forks like '{r_str}' will give reviewers immediate confidence in your hands-on code volume.",
                ]
            else:
                t = [
                    f"Candidate profile exhibits high dependency on upstream forks ({fork_count} of {total} repositories, {pct}%); spotlighting original codebases will reinforce independent delivery capability.",
                    f"Portfolio composition shows {pct}% forked assets ({r_str}); emphasizing original architectural design will strengthen senior leadership positioning.",
                    f"Clarifying individual contributions within forked ecosystems ({r_str}) will ensure technical evaluators properly assess authoring depth.",
                ]
            return t[v_idx]

        # 6. Quality Chasm
        if fid == "quality_chasm":
            best_score = nums.get("best_score", 85)
            worst_score = nums.get("worst_score", 30)
            spread = nums.get("score_spread", 55)
            if brutality == BrutalityLevel.BRUTAL:
                t = [
                    f"Quality whiplash: flagship '{primary_repo}' scored {best_score}/100, while '{secondary_repo}' bottomed out at {worst_score}/100.",
                    f"You demonstrated you can write solid code in '{primary_repo}' ({best_score}/100), making the {worst_score}/100 quality of '{secondary_repo}' an unsolved mystery.",
                    f"A {spread}-point chasm separates '{primary_repo}' ({best_score}/100) from '{secondary_repo}' ({worst_score}/100), showing unpredictable engineering consistency across projects.",
                ]
            elif brutality == BrutalityLevel.HONEST:
                t = [
                    f"A noticeable quality gap exists between '{primary_repo}' ({best_score}/100) and '{secondary_repo}' ({worst_score}/100); applying your flagship hygiene across the board will raise your profile.",
                    f"Recruiters will appreciate '{primary_repo}' ({best_score}/100) but may be deterred by '{secondary_repo}' ({worst_score}/100); consistency across codebases is key.",
                    f"Bringing repositories like '{secondary_repo}' ({worst_score}/100) closer to the bar set by '{primary_repo}' ({best_score}/100) will present a unified senior profile.",
                ]
            else:
                t = [
                    f"Candidate demonstrates high delivery potential on '{primary_repo}' ({best_score}/100); bridging the quality delta with '{secondary_repo}' ({worst_score}/100) will demonstrate organizational standard-setting.",
                    f"Quality audit reflects strong practices on '{primary_repo}' ({best_score}/100) alongside unrefined codebases like '{secondary_repo}' ({worst_score}/100); systemic hygiene across all repos will validate maturity.",
                    f"Elevating maintenance standards on secondary assets like '{secondary_repo}' ({worst_score}/100) to mirror '{primary_repo}' ({best_score}/100) will solidify technical authority.",
                ]
            return t[v_idx]

        # 7. Generic / Baseline fallback
        total_repos = nums.get("total_repos", len(repos))
        if brutality == BrutalityLevel.BRUTAL:
            t = [
                f"Repository '{primary_repo}' in {top_lang} has no live demo deployment or open-source license, leaving technical recruiters with zero interactive proof.",
                f"You built '{primary_repo}' with {top_lang}, but skipped deployment previews and documentation, treating code showcases like private experiments.",
                f"'{primary_repo}' stands as your primary codebase, yet missing test suites and deployment links make it read like an unfinished prototype.",
            ]
        elif brutality == BrutalityLevel.HONEST:
            t = [
                f"Your work on '{primary_repo}' in {top_lang} demonstrates genuine ability, but absent live demos and missing setup documentation create barriers for reviewers.",
                f"Recruiters reviewing '{primary_repo}' need immediate visual or operational evidence; adding interactive deployment previews will elevate your standing.",
                f"'{primary_repo}' shows solid foundations, but providing automated tests and clean deployment links will make your experience unmistakable.",
            ]
        else:
            t = [
                f"Candidate demonstrates competent execution in {top_lang} across '{primary_repo}'; incorporating automated deployment previews will reinforce production readiness.",
                f"Technical evaluation reveals sound coding in '{primary_repo}', though formalizing CI/CD verification and architectural documentation will support senior placement.",
                f"Focusing documentation and interactive demonstration on flagship repository '{primary_repo}' will strategically position candidate for leadership review.",
            ]
        return t[v_idx]

    def generate_grounded_fallback(
        self,
        user_data: GitHubUserData,
        scoring_result: ScoringResult,
        role: TargetRole,
        brutality: BrutalityLevel,
        angle_selection: Optional[AngleSelection] = None,
        variant: int = 0,
    ) -> AiAnalysisResult:
        """
        Synthesizes a realistic, evidence-grounded roast and recruiter evaluation
        without external LLM calls, strictly referencing chosen evidence angles,
        adopting the tone persona, and adhering to the chosen comic device.
        """
        repos = scoring_result.repos
        top_repo = repos[0].name if repos else "flagship-repo"
        top_lang = repos[0].language if (repos and repos[0].language) else "TypeScript"
        total_stars = int(scoring_result.summary_metrics.get("total_stars", 0))

        angles = angle_selection.angles if angle_selection else []
        device = angle_selection.comic_device if angle_selection else "code-review comment"

        primary_angle = angles[0] if angles else None
        secondary_angle = angles[1] if len(angles) > 1 else None

        # Build dynamic, fact-based roast
        if primary_angle:
            primary_text = self._synthesize_fact_roast(
                primary_angle, brutality, device, variant, top_repo, top_lang
            )
            if secondary_angle:
                secondary_text = secondary_angle.fact_description
                roast = f"{primary_text} In addition, {secondary_text.lower()}"
            else:
                roast = primary_text
        else:
            # Baseline fact
            roast = (
                f"Repository '{top_repo}' in {top_lang} has earned {total_stars} stars, "
                "yet lacks a public deployment preview or comprehensive architectural documentation."
            )

        roast_explanation = (
            f"Technical recruiters spend under 45 seconds per GitHub profile. When primary projects like '{top_repo}' show gaps in documentation or live deployments, reviewers default to assuming the codebase is experimental rather than production-ready."
        )

        score = scoring_result.scores.overall
        if score >= 75:
            recruiter_verdict = f"High-potential developer with demonstrated fluency in {top_lang}. Strong technical fundamentals across {len(repos)} repositories with verifiable code depth."
        elif score >= 50:
            recruiter_verdict = f"Active programmer with promising project concepts in {top_lang}, but repository hygiene and verification friction create barriers in technical screening."
        else:
            recruiter_verdict = f"Early-stage engineering portfolio. Repositories currently resemble scratchpads or coursework prototypes rather than production-grade software showcases."

        strengths = [
            f"Demonstrated language focus in {top_lang} across multiple repositories.",
            f"Established public repository footprint with {total_stars} community stars.",
            (
                f"Maintains a dedicated profile README on @{user_data.profile.username}."
                if user_data.profile.has_profile_readme
                else f"Active commit cadence with recent public contributions recorded in the activity window."
            ),
        ]

        missing_readme = [r for r in repos if not r.has_readme]
        missing_demo = [r for r in repos if not r.homepage]
        missing_license = [r for r in repos if not r.license]

        weaknesses = [
            (
                f"Repository '{missing_readme[0].name}' lacks a comprehensive README explaining problem scope, architecture, or setup."
                if missing_readme
                else f"Repository '{top_repo}' lacks architectural diagrams explaining system design."
            ),
            (
                f"Missing live production deployment links across key projects including '{top_repo}'."
                if missing_demo
                else "Lack of explicit automated CI/CD build status badges."
            ),
            (
                f"Multiple repositories lack an open-source license (e.g. '{missing_license[0].name}'), deterring enterprise recruiters."
                if missing_license
                else "Automated test suites (unit/integration) are not prominently highlighted."
            ),
        ]

        role_gap_map = {
            TargetRole.FRONTEND_ENGINEER: [
                "Lacks live interactive demo deployments on Vercel/Netlify for immediate UX evaluation.",
                "Missing automated end-to-end test coverage (Playwright/Cypress) in primary web repositories."
            ],
            TargetRole.BACKEND_ENGINEER: [
                "Lacks Docker containerization and CI/CD pipelines in primary backend repositories.",
                "Missing database schema migration scripts and formal API contract documentation."
            ],
            TargetRole.ML_ENGINEER: [
                "Lacks model evaluation benchmarks and experiment tracking artifacts (MLflow/W&B).",
                "Missing reproducibility instructions for datasets and training environments."
            ],
            TargetRole.DATA_SCIENTIST: [
                "Needs data storytelling notebooks with clear exploratory analysis and visualizations.",
                "Lacks statistical validation pipelines and modular data cleaning scripts."
            ],
            TargetRole.SOFTWARE_ENGINEER: [
                "Needs modular architectural patterns and separation of concerns over monolithic scripts.",
                "Absence of automated testing suites in root repository branches."
            ],
        }
        career_gaps = role_gap_map.get(role, [
            "Lack of production telemetry and automated testing pipelines.",
            "Needs explicit architectural documentation on system scalability."
        ])

        quick_fixes = [
            f"Add a structured README with an architecture diagram and quickstart guide to '{top_repo}'.",
            f"Deploy '{top_repo}' to a cloud hosting provider and link the URL in the repo homepage.",
            "Add standard open-source licenses (MIT or Apache-2.0) to all public repositories.",
            "Configure a simple GitHub Actions CI workflow to run linters and unit tests automatically.",
            "Consolidate or archive inactive scratchpad repositories to highlight flagship projects.",
        ]

        rescue_plan = [
            RescuePlanItem(
                horizon="today",
                tasks=[
                    f"Write a 1-page README for '{top_repo}' explaining what it solves and how to run it",
                    "Add an open-source MIT license file to all un-licensed repositories",
                ]
            ),
            RescuePlanItem(
                horizon="this_week",
                tasks=[
                    f"Deploy a live instance of '{top_repo}' and add the URL to the repository homepage",
                    "Record a 15-second demo walkthrough and embed it in your README",
                ]
            ),
            RescuePlanItem(
                horizon="next_2_weeks",
                tasks=[
                    "Configure GitHub Actions to automatically run tests and lint checks on pull requests",
                    "Refactor your top repository into clean modular directories with strict typing",
                ]
            ),
            RescuePlanItem(
                horizon="this_month",
                tasks=[
                    f"Build or polish one flagship showcase project targeted squarely at {role.value.replace('_', ' ').title()}",
                    "Write an engineering technical breakdown detailing project architecture",
                ]
            ),
        ]

        role_fit_summary = f"Candidate achieves a {scoring_result.scores.overall}/100 readiness index for {role.value.replace('_', ' ').title()}. Addressing the prioritized quick fixes will directly bridge the gap to top-tier consideration."

        grounding_repos = []
        if angle_selection:
            for a in angle_selection.angles:
                grounding_repos.extend(a.repo_names)
        if not grounding_repos and top_repo:
            grounding_repos.append(top_repo)

        fallback_result = AiAnalysisResult(
            recruiter_verdict=recruiter_verdict,
            roast=roast,
            roast_explanation=roast_explanation,
            strengths=strengths,
            weaknesses=weaknesses,
            career_gaps=career_gaps,
            quick_fixes=quick_fixes,
            rescue_plan=rescue_plan,
            role_fit_summary=role_fit_summary,
            grounding_repos=list(dict.fromkeys(grounding_repos)),
            comic_device=device,
        )

        roast_validator.register_roast(fallback_result.roast)
        return fallback_result

    async def generate_roast_and_analysis(
        self,
        user_data: GitHubUserData,
        scoring_result: ScoringResult,
        role: TargetRole,
        brutality: BrutalityLevel,
        variant: int = 0,
    ) -> Tuple[Optional[AiAnalysisResult], bool, Optional[str]]:
        """
        Executes AI analysis with strict retry, schema validation, evidence grounding validation,
        and anti-repetition check against ring buffer.
        """
        facts = evidence_pack_service.extract_facts(user_data, scoring_result)
        angle_selection = evidence_pack_service.select_angles_and_device(
            facts=facts,
            username=user_data.profile.username,
            tone=brutality.value,
            variant=variant,
        )

        candidate_summary = self.build_candidate_summary(user_data, scoring_result)
        system_prompt, user_prompt = self.render_prompts(
            candidate_summary=candidate_summary,
            role=role,
            brutality=brutality,
            angle_selection=angle_selection,
        )

        grounding_repos: List[str] = []
        for a in angle_selection.angles:
            grounding_repos.extend(a.repo_names)
        if not grounding_repos and scoring_result.repos:
            grounding_repos.append(scoring_result.repos[0].name)
        grounding_repos = list(dict.fromkeys(grounding_repos))

        try:
            # 1. First attempt via live LLM
            raw_response = await self._dispatch_llm_call(system_prompt, user_prompt)
            cleaned_json = clean_llm_json(raw_response)

            try:
                parsed_data = json.loads(cleaned_json)
                parsed_data.setdefault("grounding_repos", grounding_repos)
                parsed_data.setdefault("comic_device", angle_selection.comic_device)
                result = AiAnalysisResult.model_validate(parsed_data)

                # Programmatic validation: banned phrases, grounding citation, ring-buffer similarity
                is_valid, validation_err = roast_validator.validate_all(
                    result.roast,
                    angle_selection.angles,
                    extra_repo_names=[r.name for r in user_data.repos] + [r.name for r in scoring_result.repos],
                    check_similarity=True,
                )
                if is_valid:
                    roast_validator.register_roast(result.roast)
                    return result, True, None
                else:
                    logger.warning(f"Initial LLM roast failed programmatic check: {validation_err}")
                    raise ValueError(validation_err)

            except Exception as parse_or_valid_err:
                logger.warning(f"Attempting repair retry: {parse_or_valid_err}")

                repair_prompt = (
                    f"{user_prompt}\n\n"
                    f"CRITICAL FIX NEEDED: Your previous response failed validation: {parse_or_valid_err}. "
                    "You MUST reference at least TWO specific repository names or numbers from the selected evidence angles, "
                    "NEVER use stock openers or banned clichés, and return ONLY valid JSON matching the schema."
                )
                retry_response = await self._dispatch_llm_call(system_prompt, repair_prompt)
                retry_cleaned = clean_llm_json(retry_response)
                parsed_retry = json.loads(retry_cleaned)
                parsed_retry.setdefault("grounding_repos", grounding_repos)
                parsed_retry.setdefault("comic_device", angle_selection.comic_device)
                result = AiAnalysisResult.model_validate(parsed_retry)

                # Final validation pass
                is_retry_valid, retry_err = roast_validator.validate_all(
                    result.roast,
                    angle_selection.angles,
                    extra_repo_names=[r.name for r in user_data.repos] + [r.name for r in scoring_result.repos],
                    check_similarity=False,  # Allow slight similarity on repair retry
                )
                if is_retry_valid:
                    roast_validator.register_roast(result.roast)
                    return result, True, None

                logger.warning(f"Retry also failed validation ({retry_err}); engaging grounded fallback...")
                if settings.ENABLE_OFFLINE_AI_FALLBACK:
                    fallback_result = self.generate_grounded_fallback(
                        user_data=user_data,
                        scoring_result=scoring_result,
                        role=role,
                        brutality=brutality,
                        angle_selection=angle_selection,
                        variant=variant,
                    )
                    return fallback_result, True, None
                raise RuntimeError(retry_err)

        except Exception as e:
            logger.warning(f"Live LLM call failed or not configured: {e}")
            if settings.ENABLE_OFFLINE_AI_FALLBACK:
                logger.info("Generating evidence-grounded heuristic AI analysis fallback...")
                fallback_result = self.generate_grounded_fallback(
                    user_data=user_data,
                    scoring_result=scoring_result,
                    role=role,
                    brutality=brutality,
                    angle_selection=angle_selection,
                    variant=variant,
                )
                return fallback_result, True, None
            return None, False, str(e)


ai_service = AiService()
