import asyncio
import datetime
import logging
import re
from typing import Any, Dict, List, Optional, Tuple
import httpx

from app.config import settings
from app.models.api import AppError
from app.models.github import (
    GitHubEvent,
    GitHubRepoRaw,
    GitHubUserData,
    GitHubUserProfile,
)
from app.services.cache import github_cache

logger = logging.getLogger("gitroast.github")

USERNAME_REGEX = re.compile(r"^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$")
GITHUB_API_BASE = "https://api.github.com"
MAX_REPOS_TO_ANALYZE_DEEP = 15
REQUEST_TIMEOUT = 10.0


def validate_username(username: str) -> None:
    """Validates username according to GitHub rules:
    - 1 to 39 characters
    - Alphanumeric or single hyphens
    - Cannot start or end with a hyphen
    - No consecutive hyphens
    """
    if not username or not USERNAME_REGEX.match(username):
        raise AppError(
            code="INVALID_USERNAME",
            message=f"'{username}' is not a valid GitHub username. GitHub usernames must be 1-39 characters, contain only alphanumeric characters or single hyphens, and cannot start or end with a hyphen.",
            status_code=400,
        )


class GitHubService:
    def __init__(self):
        self.semaphore = asyncio.Semaphore(5)

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "GitRoast-Career-Coach/1.0",
        }
        if settings.GITHUB_TOKEN and settings.GITHUB_TOKEN.strip():
            headers["Authorization"] = f"Bearer {settings.GITHUB_TOKEN.strip()}"
        return headers

    def _handle_error_response(self, response: httpx.Response, username: str, context: str = "") -> None:
        if response.status_code == 404:
            raise AppError(
                code="USER_NOT_FOUND",
                message=f"GitHub user '{username}' could not be found.",
                status_code=404,
            )

        if response.status_code in (403, 429):
            rate_limit_remaining = response.headers.get("x-ratelimit-remaining")
            reset_epoch = response.headers.get("x-ratelimit-reset")
            reset_msg = ""
            if reset_epoch:
                try:
                    reset_dt = datetime.datetime.fromtimestamp(int(reset_epoch), tz=datetime.timezone.utc)
                    reset_msg = f" Rate limit resets at {reset_dt.strftime('%H:%M:%S UTC')}."
                except Exception:
                    pass

            if rate_limit_remaining == "0" or "rate limit" in response.text.lower():
                raise AppError(
                    code="RATE_LIMITED",
                    message=f"GitHub API rate limit exceeded.{reset_msg} Please try again later or configure GITHUB_TOKEN.",
                    status_code=429,
                    details={"reset_at": reset_epoch},
                )

        if response.status_code >= 500:
            raise AppError(
                code="UPSTREAM_TIMEOUT",
                message=f"GitHub service encountered an upstream error ({response.status_code}). Please retry.",
                status_code=502,
            )

    async def fetch_user_data(self, username: str) -> GitHubUserData:
        validate_username(username)
        cache_key = f"github_user_{username.lower()}"
        cached_data = github_cache.get(cache_key)
        if cached_data:
            logger.info(f"Returning cached GitHub data for {username}")
            cached_data.cached = True
            return cached_data

        headers = self._get_headers()
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, headers=headers) as client:
            # 1. Fetch user profile
            try:
                user_res = await client.get(f"{GITHUB_API_BASE}/users/{username}")
            except httpx.TimeoutException:
                raise AppError(code="UPSTREAM_TIMEOUT", message="GitHub timed out while fetching profile.", status_code=504)
            except httpx.RequestError as e:
                raise AppError(code="INTERNAL", message=f"Network error contacting GitHub: {str(e)}", status_code=502)

            if user_res.status_code != 200:
                self._handle_error_response(user_res, username, "profile")
                raise AppError(code="INTERNAL", message=f"Unexpected GitHub response: {user_res.status_code}", status_code=500)

            user_json = user_res.json()
            public_repos = user_json.get("public_repos", 0)

            if public_repos == 0:
                raise AppError(
                    code="EMPTY_PROFILE",
                    message=f"GitHub user '{username}' has 0 public repositories. GitRoast needs at least one public repository to evaluate.",
                    status_code=400,
                )

            # 2. Fetch public events and repos concurrently
            events_task = self._fetch_events(client, username)
            repos_task = self._fetch_repos(client, username)
            profile_readme_task = self._check_profile_readme(client, username)

            events, repos_list, has_profile_readme = await asyncio.gather(
                events_task, repos_task, profile_readme_task
            )

            # 3. Deep analyze top ~15 repos (languages, readme)
            analyzed_repos = await self._deep_analyze_repos(client, username, repos_list)

            profile = GitHubUserProfile(
                username=user_json.get("login", username),
                name=user_json.get("name"),
                avatar_url=user_json.get("avatar_url", ""),
                bio=user_json.get("bio"),
                company=user_json.get("company"),
                location=user_json.get("location"),
                blog=user_json.get("blog"),
                twitter_username=user_json.get("twitter_username"),
                public_repos=public_repos,
                public_gists=user_json.get("public_gists", 0),
                followers=user_json.get("followers", 0),
                following=user_json.get("following", 0),
                created_at=user_json.get("created_at"),
                hireable=user_json.get("hireable"),
                has_profile_readme=has_profile_readme,
            )

            user_data = GitHubUserData(
                profile=profile,
                repos=analyzed_repos,
                events=events,
                total_repos_count=len(repos_list),
                analyzed_repos_count=min(len(analyzed_repos), MAX_REPOS_TO_ANALYZE_DEEP),
                cached=False,
            )

            github_cache.set(cache_key, user_data, ttl=settings.CACHE_TTL_SECONDS)
            return user_data

    async def _fetch_events(self, client: httpx.AsyncClient, username: str) -> List[GitHubEvent]:
        try:
            res = await client.get(f"{GITHUB_API_BASE}/users/{username}/events/public?per_page=100")
            if res.status_code == 200:
                events_raw = res.json()
                events = []
                for ev in events_raw:
                    events.append(
                        GitHubEvent(
                            id=str(ev.get("id")),
                            type=ev.get("type", "UnknownEvent"),
                            created_at=ev.get("created_at", ""),
                            repo_name=ev.get("repo", {}).get("name") if isinstance(ev.get("repo"), dict) else None,
                        )
                    )
                return events
            return []
        except Exception as e:
            logger.warning(f"Failed to fetch public events for {username}: {e}")
            return []

    async def _check_profile_readme(self, client: httpx.AsyncClient, username: str) -> bool:
        try:
            res = await client.get(f"{GITHUB_API_BASE}/repos/{username}/{username}/readme")
            return res.status_code == 200
        except Exception:
            return False

    async def _fetch_repos(self, client: httpx.AsyncClient, username: str) -> List[Dict[str, Any]]:
        repos: List[Dict[str, Any]] = []
        page = 1
        while page <= 2:  # Up to 2 pages (100 repos max cap)
            try:
                res = await client.get(f"{GITHUB_API_BASE}/users/{username}/repos?per_page=100&page={page}&sort=pushed")
                if res.status_code != 200:
                    break
                items = res.json()
                if not items or not isinstance(items, list):
                    break
                repos.extend(items)
                if len(items) < 100:
                    break
                page += 1
            except Exception as e:
                logger.warning(f"Error fetching repos page {page}: {e}")
                break
        return repos

    async def _deep_analyze_repos(
        self, client: httpx.AsyncClient, username: str, raw_repos: List[Dict[str, Any]]
    ) -> List[GitHubRepoRaw]:
        # Sort raw repos: non-forks first, then by stars and pushed date
        def sort_key(repo: Dict[str, Any]):
            is_fork = 1 if repo.get("fork", False) else 0
            stars = repo.get("stargazers_count", 0)
            pushed_at = repo.get("pushed_at") or ""
            return (is_fork, -stars, "" if not pushed_at else pushed_at)

        sorted_repos = sorted(raw_repos, key=sort_key)
        top_candidates = sorted_repos[:MAX_REPOS_TO_ANALYZE_DEEP]
        remaining = sorted_repos[MAX_REPOS_TO_ANALYZE_DEEP:]

        async def inspect_single_repo(r: Dict[str, Any]) -> GitHubRepoRaw:
            async with self.semaphore:
                repo_name = r.get("name", "")
                has_readme = False
                languages: Dict[str, int] = {}

                # Check readme & languages concurrently
                try:
                    readme_res, lang_res = await asyncio.gather(
                        client.get(f"{GITHUB_API_BASE}/repos/{username}/{repo_name}/readme"),
                        client.get(f"{GITHUB_API_BASE}/repos/{username}/{repo_name}/languages"),
                        return_exceptions=True,
                    )
                    if not isinstance(readme_res, Exception) and readme_res.status_code == 200:
                        has_readme = True
                    if not isinstance(lang_res, Exception) and lang_res.status_code == 200:
                        languages = lang_res.json() if isinstance(lang_res.json(), dict) else {}
                except Exception as ex:
                    logger.debug(f"Repo deep check failed for {repo_name}: {ex}")

                license_name = None
                if r.get("license") and isinstance(r["license"], dict):
                    license_name = r["license"].get("spdx_id") or r["license"].get("name")

                return GitHubRepoRaw(
                    name=repo_name,
                    description=r.get("description"),
                    language=r.get("language"),
                    stargazers_count=r.get("stargazers_count", 0),
                    forks_count=r.get("forks_count", 0),
                    fork=r.get("fork", False),
                    updated_at=r.get("updated_at"),
                    pushed_at=r.get("pushed_at"),
                    created_at=r.get("created_at"),
                    homepage=r.get("homepage"),
                    license=license_name,
                    topics=r.get("topics", []) if isinstance(r.get("topics"), list) else [],
                    has_readme=has_readme,
                    languages=languages,
                    size_kb=r.get("size", 0),
                )

        deep_tasks = [inspect_single_repo(r) for r in top_candidates]
        deep_results = await asyncio.gather(*deep_tasks)

        # Build basic models for remaining repos without extra API calls
        remaining_results: List[GitHubRepoRaw] = []
        for r in remaining:
            license_name = None
            if r.get("license") and isinstance(r["license"], dict):
                license_name = r["license"].get("spdx_id") or r["license"].get("name")

            remaining_results.append(
                GitHubRepoRaw(
                    name=r.get("name", ""),
                    description=r.get("description"),
                    language=r.get("language"),
                    stargazers_count=r.get("stargazers_count", 0),
                    forks_count=r.get("forks_count", 0),
                    fork=r.get("fork", False),
                    updated_at=r.get("updated_at"),
                    pushed_at=r.get("pushed_at"),
                    created_at=r.get("created_at"),
                    homepage=r.get("homepage"),
                    license=license_name,
                    topics=r.get("topics", []) if isinstance(r.get("topics"), list) else [],
                    has_readme=False,
                    languages={},
                    size_kb=r.get("size", 0),
                )
            )

        return list(deep_results) + remaining_results

github_service = GitHubService()
