import type {
  GitHubEvent,
  GitHubRepoRaw,
  GitHubUserData,
  GitHubUserProfile,
} from './types';
import { githubCache } from './cache';
import { AppError } from './rateLimiter';

const USERNAME_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
const GITHUB_API_BASE = 'https://api.github.com';
const MAX_REPOS_TO_ANALYZE_DEEP = 15;
const REQUEST_TIMEOUT_MS = 12000;

export function validateUsername(username: string): void {
  if (!username || !USERNAME_REGEX.test(username)) {
    throw new AppError(
      'INVALID_USERNAME',
      `'${username}' is not a valid GitHub username. GitHub usernames must be 1-39 characters, contain only alphanumeric characters or single hyphens, and cannot start or end with a hyphen.`,
      400
    );
  }
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'GitRoast-Career-Coach/1.0',
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...getHeaders(),
        ...(options.headers as Record<string, string>),
      },
      signal: controller.signal,
    });
    return res;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new AppError('UPSTREAM_TIMEOUT', 'GitHub request timed out.', 504);
    }
    throw new AppError('INTERNAL', `Network error contacting GitHub: ${err.message}`, 502);
  } finally {
    clearTimeout(timeoutId);
  }
}

function handleGitHubError(res: Response, username: string): never {
  if (res.status === 404) {
    throw new AppError('USER_NOT_FOUND', `GitHub user '${username}' could not be found.`, 404);
  }
  if (res.status === 403 || res.status === 429) {
    const resetEpoch = res.headers.get('x-ratelimit-reset');
    let resetMsg = '';
    if (resetEpoch) {
      try {
        const dt = new Date(parseInt(resetEpoch, 10) * 1000);
        resetMsg = ` Rate limit resets at ${dt.toISOString().substring(11, 19)} UTC.`;
      } catch {
        // ignore
      }
    }
    throw new AppError(
      'RATE_LIMITED',
      `GitHub API rate limit exceeded.${resetMsg} Please try again later or configure GITHUB_TOKEN in settings.`,
      429,
      { reset_at: resetEpoch }
    );
  }
  if (res.status >= 500) {
    throw new AppError(
      'UPSTREAM_TIMEOUT',
      `GitHub service encountered an upstream error (${res.status}). Please retry.`,
      502
    );
  }
  throw new AppError('INTERNAL', `Unexpected GitHub response: ${res.status}`, 500);
}

export async function fetchUserData(username: string): Promise<GitHubUserData> {
  validateUsername(username);

  const cacheKey = `github_user_${username.toLowerCase()}`;
  const cachedData = githubCache.get(cacheKey) as GitHubUserData | null;
  if (cachedData) {
    return { ...cachedData, cached: true };
  }

  // 1. Fetch user profile
  const userRes = await fetchWithTimeout(`${GITHUB_API_BASE}/users/${username}`);
  if (!userRes.ok) {
    handleGitHubError(userRes, username);
  }

  const userJson = (await userRes.json()) as any;
  const publicRepos = userJson.public_repos ?? 0;

  if (publicRepos === 0) {
    throw new AppError(
      'EMPTY_PROFILE',
      `GitHub user '${username}' has 0 public repositories. GitRoast needs at least one public repository to evaluate.`,
      400
    );
  }

  // 2. Fetch events, repos, and profile readme concurrently
  const [events, reposList, hasProfileReadme] = await Promise.all([
    fetchEvents(username),
    fetchRepos(username),
    checkProfileReadme(username),
  ]);

  // 3. Deep analyze top ~15 repos (readme + languages)
  const analyzedRepos = await deepAnalyzeRepos(username, reposList);

  const profile: GitHubUserProfile = {
    username: userJson.login || username,
    name: userJson.name || null,
    avatar_url: userJson.avatar_url || '',
    bio: userJson.bio || null,
    company: userJson.company || null,
    location: userJson.location || null,
    blog: userJson.blog || null,
    twitter_username: userJson.twitter_username || null,
    public_repos: publicRepos,
    public_gists: userJson.public_gists ?? 0,
    followers: userJson.followers ?? 0,
    following: userJson.following ?? 0,
    created_at: userJson.created_at || null,
    hireable: userJson.hireable ?? null,
    has_profile_readme: hasProfileReadme,
  };

  const userData: GitHubUserData = {
    profile,
    repos: analyzedRepos,
    events,
    total_repos_count: reposList.length,
    analyzed_repos_count: Math.min(analyzedRepos.length, MAX_REPOS_TO_ANALYZE_DEEP),
    cached: false,
  };

  githubCache.set(cacheKey, userData);
  return userData;
}

async function fetchEvents(username: string): Promise<GitHubEvent[]> {
  try {
    const res = await fetchWithTimeout(
      `${GITHUB_API_BASE}/users/${username}/events/public?per_page=100`
    );
    if (!res.ok) return [];
    const eventsRaw = await res.json();
    if (!Array.isArray(eventsRaw)) return [];
    return eventsRaw.map((ev: any) => ({
      id: String(ev.id),
      type: ev.type || 'UnknownEvent',
      created_at: ev.created_at || '',
      repo_name: ev.repo && typeof ev.repo === 'object' ? ev.repo.name : null,
    }));
  } catch {
    return [];
  }
}

async function checkProfileReadme(username: string): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(
      `${GITHUB_API_BASE}/repos/${username}/${username}/readme`
    );
    return res.ok;
  } catch {
    return false;
  }
}

async function fetchRepos(username: string): Promise<any[]> {
  const repos: any[] = [];
  let page = 1;
  while (page <= 2) {
    try {
      const res = await fetchWithTimeout(
        `${GITHUB_API_BASE}/users/${username}/repos?per_page=100&page=${page}&sort=pushed`
      );
      if (!res.ok) break;
      const items = await res.json();
      if (!Array.isArray(items) || items.length === 0) break;
      repos.push(...items);
      if (items.length < 100) break;
      page += 1;
    } catch {
      break;
    }
  }
  return repos;
}

async function deepAnalyzeRepos(
  username: string,
  rawRepos: any[]
): Promise<GitHubRepoRaw[]> {
  // Sort raw repos: non-forks first, then by stars and pushed date
  const sorted = [...rawRepos].sort((a, b) => {
    const aFork = a.fork ? 1 : 0;
    const bFork = b.fork ? 1 : 0;
    if (aFork !== bFork) return aFork - bFork;
    const aStars = a.stargazers_count ?? 0;
    const bStars = b.stargazers_count ?? 0;
    if (aStars !== bStars) return bStars - aStars;
    const aPushed = a.pushed_at || '';
    const bPushed = b.pushed_at || '';
    return bPushed.localeCompare(aPushed);
  });

  const topCandidates = sorted.slice(0, MAX_REPOS_TO_ANALYZE_DEEP);
  const remaining = sorted.slice(MAX_REPOS_TO_ANALYZE_DEEP);

  const inspectSingle = async (r: any): Promise<GitHubRepoRaw> => {
    const repoName = r.name || '';
    let hasReadme = false;
    let languages: Record<string, number> = {};

    try {
      const [readmeRes, langRes] = await Promise.all([
        fetchWithTimeout(`${GITHUB_API_BASE}/repos/${username}/${repoName}/readme`),
        fetchWithTimeout(`${GITHUB_API_BASE}/repos/${username}/${repoName}/languages`),
      ]);
      if (readmeRes.ok) hasReadme = true;
      if (langRes.ok) {
        const langJson = (await langRes.json()) as any;
        if (langJson && typeof langJson === 'object') {
          languages = langJson as Record<string, number>;
        }
      }
    } catch {
      // ignore individual failures
    }

    const licenseName =
      r.license && typeof r.license === 'object'
        ? r.license.spdx_id || r.license.name
        : null;

    return {
      name: repoName,
      description: r.description || null,
      language: r.language || null,
      stars: r.stargazers_count ?? 0,
      forks: r.forks_count ?? 0,
      is_fork: Boolean(r.fork),
      updated_at: r.updated_at || null,
      pushed_at: r.pushed_at || null,
      created_at: r.created_at || null,
      homepage: r.homepage || null,
      license: licenseName,
      topics: Array.isArray(r.topics) ? r.topics : [],
      has_readme: hasReadme,
      languages,
      size_kb: r.size ?? 0,
    };
  };

  // Inspect concurrently in batches of 5
  const deepResults: GitHubRepoRaw[] = [];
  const chunkSize = 5;
  for (let i = 0; i < topCandidates.length; i += chunkSize) {
    const chunk = topCandidates.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(chunk.map(inspectSingle));
    deepResults.push(...chunkResults);
  }

  const remainingResults: GitHubRepoRaw[] = remaining.map((r: any) => ({
    name: r.name || '',
    description: r.description || null,
    language: r.language || null,
    stars: r.stargazers_count ?? 0,
    forks: r.forks_count ?? 0,
    is_fork: Boolean(r.fork),
    updated_at: r.updated_at || null,
    pushed_at: r.pushed_at || null,
    created_at: r.created_at || null,
    homepage: r.homepage || null,
    license:
      r.license && typeof r.license === 'object'
        ? r.license.spdx_id || r.license.name
        : null,
    topics: Array.isArray(r.topics) ? r.topics : [],
    has_readme: false,
    languages: {},
    size_kb: r.size ?? 0,
  }));

  return [...deepResults, ...remainingResults];
}
