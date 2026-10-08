import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
import httpx

from app.config import settings
from app.models.ai import AiAnalysisResult, RescuePlanItem
from app.models.api import BrutalityLevel, TargetRole
from app.models.github import GitHubUserData
from app.models.scoring import ScoringResult

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
    ) -> Tuple[str, str]:
        role_label = role.value.replace("_", " ").title()
        brutality_label = brutality.value.lower()

        system_prompt = self.system_prompt_template.replace("{{ROLE}}", role_label).replace(
            "{{BRUTALITY}}", brutality_label
        )

        candidate_json_str = json.dumps(candidate_summary, indent=2)
        user_prompt = (
            self.user_prompt_template.replace("{{ROLE}}", role_label)
            .replace("{{BRUTALITY}}", brutality_label)
            .replace("{{CANDIDATE_DATA_JSON}}", candidate_json_str)
        )

        return system_prompt, user_prompt

    async def _call_gemini(self, api_key: str, system_prompt: str, user_prompt: str) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        payload = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {
                "temperature": 0.7,
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
            "temperature": 0.7,
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
            "temperature": 0.7,
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

    def generate_grounded_fallback(
        self,
        user_data: GitHubUserData,
        scoring_result: ScoringResult,
        role: TargetRole,
        brutality: BrutalityLevel,
    ) -> AiAnalysisResult:
        """
        Synthesizes a realistic, evidence-grounded roast and recruiter evaluation
        without external LLM calls, citing actual repositories, metrics, and flags.
        """
        repos = scoring_result.repos
        top_repo = repos[0].name if repos else "main-project"
        top_lang = repos[0].language if (repos and repos[0].language) else "code"
        missing_readme = [r for r in repos if not r.has_readme]
        missing_demo = [r for r in repos if not r.homepage]
        missing_license = [r for r in repos if not r.license]
        stale_repos = [r for r in repos if any("Stale" in f for f in r.flags)]
        fork_repos = [r for r in repos if r.is_fork]
        total_stars = int(scoring_result.summary_metrics.get("total_stars", 0))

        # 1. Brutality-adapted roast
        if brutality == BrutalityLevel.BRUTAL:
            if missing_readme:
                roast = f"Your repository '{top_repo}' has zero README documentation. Visiting it feels like stepping into an abandoned warehouse where someone forgot to turn on the lights."
            elif stale_repos:
                roast = f"You started '{stale_repos[0].name}', pushed a couple of commits, and vanished. It's not a software project—it's a digital monument to short attention spans."
            elif len(fork_repos) > len(repos) // 2:
                roast = "Half your GitHub portfolio is forked repositories. It's less of an engineering portfolio and more of an organized browser bookmark folder."
            else:
                roast = f"'{top_repo}' is written in {top_lang}, but there's no live demo URL in sight. Did you build production software, or did you write an urban legend?"
        elif brutality == BrutalityLevel.HONEST:
            roast = f"You show solid coding intent with '{top_repo}', but absent documentation and missing demo links make it difficult for hiring managers to evaluate your real-world capability."
        else: # Professional
            roast = f"Candidate demonstrates foundational technical proficiency in {top_lang}. Enhancing documentation and providing interactive deployment previews for '{top_repo}' will significantly elevate market positioning."

        roast_explanation = (
            f"Hiring managers spend under 60 seconds reviewing portfolios. When showcase repositories like '{top_repo}' lack immediate live demonstrations or architectural diagrams, reviewers assume the codebase is either unfinished or untested."
        )

        # 2. 30-second impression
        score = scoring_result.scores.overall
        if score >= 75:
            recruiter_verdict = f"High-potential developer with demonstrated fluency in {top_lang}. Solid repository foundation with verifiable code volume across {len(repos)} repositories."
        elif score >= 50:
            recruiter_verdict = f"Active programmer with interesting project concepts in {top_lang}, but inconsistent repository hygiene and missing deployment previews create friction in technical screening."
        else:
            recruiter_verdict = f"Early-stage engineering portfolio. Repositories currently resemble scratchpads or coursework prototypes rather than production-grade software showcases."

        # 3. Strengths (exactly 3)
        strengths = [
            f"Consistent language specialization in {top_lang} across multiple repositories.",
            f"Established open-source presence with {total_stars} community stars earned.",
            (
                f"Well-structured profile presentation with a dedicated profile README on @{user_data.profile.username}."
                if user_data.profile.has_profile_readme
                else f"Active commit cadence with recent public contributions recorded in the 90-day activity window."
            ),
        ]

        # 4. Weaknesses (exactly 3)
        weaknesses = [
            (
                f"Key repository '{missing_readme[0].name}' lacks a comprehensive README explaining problem scope, architecture, or setup."
                if missing_readme
                else "Limited architectural diagrams or system design overviews in repository documentation."
            ),
            (
                f"Missing live production deployment links across key projects including '{top_repo}'."
                if missing_demo
                else "Lack of explicit automated CI/CD build status badges."
            ),
            (
                f"Multiple repositories lack an open-source license (e.g. '{missing_license[0].name}'), deterring enterprise recruiters."
                if missing_license
                else "Automated test suites (unit/integration) are not conspicuously highlighted."
            ),
        ]

        # 5. Role-specific career gaps
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

        # 6. Quick fixes (exactly 5)
        quick_fixes = [
            f"Add a structured README with an architecture diagram and quickstart guide to '{top_repo}'.",
            f"Deploy '{top_repo}' to a free cloud hosting provider and link the URL in the repo homepage.",
            "Add standard open-source licenses (MIT or Apache-2.0) to all public repositories.",
            "Configure a simple GitHub Actions CI workflow to run linters and unit tests automatically.",
            "Consolidate or archive inactive coursework and scratchpad repositories to highlight flagship projects.",
        ]

        # 7. Rescue plan (4 horizons)
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
                    "Record a 15-second demo GIF or screenshot walkthrough and embed it in your README",
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
                    "Write an engineering blog post or technical breakdown detailing project architecture",
                ]
            ),
        ]

        role_fit_summary = f"Candidate achieves a {scoring_result.scores.overall}/100 readiness index for {role.value.replace('_', ' ').title()}. Addressing the prioritized quick fixes will directly bridge the gap to top-tier consideration."

        return AiAnalysisResult(
            recruiter_verdict=recruiter_verdict,
            roast=roast,
            roast_explanation=roast_explanation,
            strengths=strengths,
            weaknesses=weaknesses,
            career_gaps=career_gaps,
            quick_fixes=quick_fixes,
            rescue_plan=rescue_plan,
            role_fit_summary=role_fit_summary,
        )

    async def generate_roast_and_analysis(
        self,
        user_data: GitHubUserData,
        scoring_result: ScoringResult,
        role: TargetRole,
        brutality: BrutalityLevel,
    ) -> Tuple[Optional[AiAnalysisResult], bool, Optional[str]]:
        """
        Executes AI analysis with retry and schema validation.
        If live LLM API is unavailable, falls back to evidence-grounded heuristic synthesis.
        """
        candidate_summary = self.build_candidate_summary(user_data, scoring_result)
        system_prompt, user_prompt = self.render_prompts(candidate_summary, role, brutality)

        try:
            # First attempt via live LLM
            raw_response = await self._dispatch_llm_call(system_prompt, user_prompt)
            cleaned_json = clean_llm_json(raw_response)

            try:
                parsed_data = json.loads(cleaned_json)
                result = AiAnalysisResult.model_validate(parsed_data)
                return result, True, None
            except Exception as parse_err:
                logger.warning(f"Initial LLM response failed validation ({parse_err}). Attempting repair retry...")

                # Repair attempt with explicit feedback
                repair_prompt = (
                    f"{user_prompt}\n\n"
                    f"CRITICAL FIX NEEDED: Your previous response was invalid JSON or failed schema validation: {parse_err}. "
                    "Return ONLY raw valid JSON adhering exactly to the specified JSON schema without any markdown or conversational filler."
                )
                retry_response = await self._dispatch_llm_call(system_prompt, repair_prompt)
                retry_cleaned = clean_llm_json(retry_response)
                parsed_retry = json.loads(retry_cleaned)
                result = AiAnalysisResult.model_validate(parsed_retry)
                return result, True, None

        except Exception as e:
            logger.warning(f"Live LLM call failed or not configured: {e}")
            if settings.ENABLE_OFFLINE_AI_FALLBACK:
                logger.info("Generating evidence-grounded heuristic AI analysis fallback...")
                fallback_result = self.generate_grounded_fallback(user_data, scoring_result, role, brutality)
                return fallback_result, True, None
            return None, False, str(e)


ai_service = AiService()
