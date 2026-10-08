import type {
  CategoryScores,
  GitHubRepoRaw,
  GitHubUserData,
  RepoAnalysis,
  ScoringResult,
  TargetRole,
} from './types';

export const ROLE_WEIGHTS: Record<TargetRole, Record<keyof CategoryScores, number>> = {
  software_engineer: {
    technical_strength: 0.25,
    project_quality: 0.25,
    activity_consistency: 0.15,
    documentation: 0.15,
    recruiter_appeal: 0.10,
    profile_presentation: 0.10,
  },
  frontend_engineer: {
    technical_strength: 0.15,
    project_quality: 0.30,
    activity_consistency: 0.15,
    documentation: 0.10,
    recruiter_appeal: 0.15,
    profile_presentation: 0.15,
  },
  backend_engineer: {
    technical_strength: 0.30,
    project_quality: 0.20,
    activity_consistency: 0.15,
    documentation: 0.20,
    recruiter_appeal: 0.10,
    profile_presentation: 0.05,
  },
  ml_engineer: {
    technical_strength: 0.30,
    project_quality: 0.25,
    activity_consistency: 0.10,
    documentation: 0.20,
    recruiter_appeal: 0.10,
    profile_presentation: 0.05,
  },
  data_scientist: {
    technical_strength: 0.25,
    project_quality: 0.25,
    activity_consistency: 0.15,
    documentation: 0.20,
    recruiter_appeal: 0.10,
    profile_presentation: 0.05,
  },
};

export const ROLE_KEYWORDS: Record<TargetRole, Set<string>> = {
  frontend_engineer: new Set([
    'react', 'vue', 'angular', 'svelte', 'nextjs', 'tailwind', 'css', 'html', 'javascript', 'typescript', 'frontend', 'ui', 'ux', 'web'
  ]),
  backend_engineer: new Set([
    'python', 'go', 'golang', 'rust', 'java', 'c#', 'fastapi', 'django', 'node', 'express', 'sql', 'postgres', 'redis', 'docker', 'k8s', 'backend', 'api', 'microservices'
  ]),
  ml_engineer: new Set([
    'python', 'pytorch', 'tensorflow', 'keras', 'scikit-learn', 'huggingface', 'llm', 'deep-learning', 'machine-learning', 'cuda', 'onnx', 'transformers'
  ]),
  data_scientist: new Set([
    'python', 'r', 'jupyter', 'pandas', 'numpy', 'matplotlib', 'seaborn', 'data-analysis', 'analytics', 'statistics', 'sql', 'spark'
  ]),
  software_engineer: new Set([]),
};

const SUSPICIOUS_REPO_NAMES = new Set([
  'test', 'demo', 'asdf', 'hello-world', 'my-app', 'temp', 'tmp', 'first-repo'
]);

function parseIso(isoStr: string | null): Date | null {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  return isNaN(d.getTime()) ? null : d;
}

export function calculateRepoQuality(repo: GitHubRepoRaw): { score: number; flags: string[] } {
  let score = 0;
  const flags: string[] = [];

  // 1. README
  if (repo.has_readme) {
    score += 25;
  } else {
    flags.push('Missing README');
  }

  // 2. Description
  if (repo.description && repo.description.trim().length > 10) {
    score += 15;
  } else {
    flags.push('No/short description');
  }

  // 3. License
  if (repo.license) {
    score += 15;
  } else {
    flags.push('No open-source license');
  }

  // 4. Live Demo / Homepage
  if (repo.homepage && repo.homepage.trim().length > 5) {
    score += 15;
  } else {
    flags.push('No live demo link');
  }

  // 5. Topics
  if (repo.topics && repo.topics.length > 0) {
    score += 10;
  } else {
    flags.push('No topic tags');
  }

  // 6. Recency / Maintenance (Pushed within 180 days)
  const pushedDt = parseIso(repo.pushed_at);
  const now = new Date();
  if (pushedDt) {
    const daysAgo = Math.floor((now.getTime() - pushedDt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysAgo <= 180) {
      score += 10;
    } else if (daysAgo > 365) {
      flags.push(`Stale (${daysAgo} days since last push)`);
    }
  } else {
    flags.push('No push history');
  }

  // 7. Stars & Community validation (up to 10 log-scaled)
  if (repo.stars > 0) {
    const starPoints = Math.min(10, Math.floor(Math.log10(repo.stars + 1) * 7));
    score += starPoints;
  }

  // 8. Fork handling
  if (repo.is_fork) {
    flags.push('Forked repo (not original code)');
    score = Math.floor(score * 0.5);
  }

  const finalScore = Math.max(0, Math.min(100, score));
  return { score: finalScore, flags };
}

export function scoreProfile(userData: GitHubUserData, role: TargetRole): ScoringResult {
  const repos = userData.repos;
  const profile = userData.profile;
  const events = userData.events;
  const totalReposCount = Math.max(repos.length, 1);

  // 1. Compute individual repo scores
  const repoAnalyses: RepoAnalysis[] = repos.map((r) => {
    const { score: qScore, flags } = calculateRepoQuality(r);
    return {
      name: r.name,
      language: r.language,
      stars: r.stars,
      forks: r.forks,
      updated_at: r.updated_at,
      pushed_at: r.pushed_at,
      has_readme: r.has_readme,
      description: r.description,
      homepage: r.homepage,
      license: r.license,
      topics: r.topics,
      is_fork: r.is_fork,
      quality_score: qScore,
      flags,
    };
  });

  if (repos.length === 0) {
    const zeroCategories: CategoryScores = {
      technical_strength: 0,
      project_quality: 0,
      activity_consistency: 0,
      documentation: 0,
      recruiter_appeal: 0,
      profile_presentation: 0,
    };
    const weights = ROLE_WEIGHTS[role] as unknown as Record<string, number>;
    return {
      scores: { overall: 0, categories: zeroCategories, weights },
      repos: [],
      summary_metrics: { total_repos: 0, total_stars: 0 },
    };
  }

  // 2. Aggregate signals
  const nonForkRepos = repos.filter((r) => !r.is_fork);
  const nonForkCount = nonForkRepos.length;
  const totalStars = repos.reduce((acc, r) => acc + r.stars, 0);
  const totalForks = repos.reduce((acc, r) => acc + r.forks, 0);

  const uniqueLanguages = new Set(repos.map((r) => r.language).filter(Boolean) as string[]);
  const allTopics = new Set<string>();
  repos.forEach((r) => r.topics.forEach((t) => allTopics.add(t.toLowerCase())));

  // Language bytes
  const langBytes: Record<string, number> = {};
  repos.forEach((r) => {
    Object.entries(r.languages).forEach(([lName, lB]) => {
      langBytes[lName] = (langBytes[lName] || 0) + lB;
    });
  });
  const totalLangBytes = Object.values(langBytes).reduce((a, b) => a + b, 0);
  const maxLangBytes = Object.values(langBytes).length ? Math.max(...Object.values(langBytes)) : 0;

  const now = new Date();
  let recentPushedRepos = 0;
  repos.forEach((r) => {
    const pDt = parseIso(r.pushed_at);
    if (pDt && (now.getTime() - pDt.getTime()) / (1000 * 60 * 60 * 24) <= 180) {
      recentPushedRepos++;
    }
  });

  const reposWithReadme = repos.filter((r) => r.has_readme).length;
  const reposWithDesc = repos.filter((r) => r.description && r.description.trim().length > 5).length;
  const reposWithLongDesc = repos.filter((r) => r.description && r.description.trim().length > 25).length;
  const reposWithLicense = repos.filter((r) => Boolean(r.license)).length;
  const reposWithDemo = repos.filter((r) => r.homepage && r.homepage.trim().length > 5).length;
  const reposWithTopics = repos.filter((r) => r.topics && r.topics.length > 0).length;

  // --- A. Technical Strength (0 - 100) ---
  const techOriginal = (nonForkCount / totalReposCount) * 30.0;
  const techLangDiversity = Math.min(1.0, uniqueLanguages.size / 4.0) * 25.0;
  const techDepth =
    totalLangBytes > 0
      ? (maxLangBytes / totalLangBytes) * 25.0
      : uniqueLanguages.size > 0
      ? 15.0
      : 0.0;
  const techTopics = (reposWithTopics / totalReposCount) * 20.0;

  let rawTech = techOriginal + techLangDiversity + techDepth + techTopics;

  // Role alignment adjustment
  const roleKw = ROLE_KEYWORDS[role] || new Set();
  if (roleKw.size > 0) {
    let matchedKw = 0;
    allTopics.forEach((t) => {
      if (roleKw.has(t)) matchedKw++;
    });
    let matchedLangs = 0;
    uniqueLanguages.forEach((l) => {
      if (roleKw.has(l.toLowerCase())) matchedLangs++;
    });
    if (matchedKw + matchedLangs >= 3) {
      rawTech += 8.0;
    } else if (matchedKw + matchedLangs === 0) {
      rawTech -= 8.0;
    }
  }
  const technicalStrength = Math.max(0, Math.min(100, Math.round(rawTech)));

  // --- B. Project Quality (0 - 100) ---
  const qualityStars = Math.min(30.0, Math.log10(totalStars + 1) * 12.0);
  const qualityForks = Math.min(15.0, Math.log10(totalForks + 1) * 8.0);
  const qualityDesc = (reposWithDesc / totalReposCount) * 15.0;
  const qualityLic = (reposWithLicense / totalReposCount) * 15.0;
  const qualityDemo = (reposWithDemo / totalReposCount) * 15.0;
  const qualityMaint = (recentPushedRepos / totalReposCount) * 10.0;

  const projectQuality = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        qualityStars + qualityForks + qualityDesc + qualityLic + qualityDemo + qualityMaint
      )
    )
  );

  // --- C. Activity & Consistency (0 - 100) ---
  const pushEvents = events.filter((e) => e.type === 'PushEvent');
  const pushEventsCount = pushEvents.length;
  const uniqueEventTypes = new Set(events.map((e) => e.type)).size;

  const activityPushes = Math.min(40.0, pushEventsCount * 2.0);
  const activityDiversity = Math.min(30.0, (uniqueEventTypes / 4.0) * 30.0);

  let reposPushed90d = 0;
  repos.forEach((r) => {
    const pDt = parseIso(r.pushed_at);
    if (pDt && (now.getTime() - pDt.getTime()) / (1000 * 60 * 60 * 24) <= 90) {
      reposPushed90d++;
    }
  });
  const activitySpread = Math.min(30.0, reposPushed90d * 10.0);

  const activityConsistency = Math.max(
    0,
    Math.min(100, Math.round(activityPushes + activityDiversity + activitySpread))
  );

  // --- D. Documentation (0 - 100) ---
  const docReadme = (reposWithReadme / totalReposCount) * 50.0;
  const docDesc = (reposWithLongDesc / totalReposCount) * 30.0;
  const docTopics = (reposWithTopics / totalReposCount) * 20.0;

  const documentation = Math.max(0, Math.min(100, Math.round(docReadme + docDesc + docTopics)));

  // --- E. Recruiter Appeal (0 - 100) ---
  const qualityReposCount = repoAnalyses.filter(
    (ra) => ra.quality_score >= 65 && !ra.is_fork
  ).length;
  const recruiterShowcase = Math.min(35.0, qualityReposCount * 12.0);

  const suspiciousCount = repos.filter((r) =>
    SUSPICIOUS_REPO_NAMES.has(r.name.toLowerCase())
  ).length;
  const recruiterNaming = Math.max(5.0, 25.0 - suspiciousCount * 7.0);

  const topNonForks = repos.filter((r) => !r.is_fork).slice(0, 5);
  const hasTopDemo = topNonForks.some(
    (r) => r.homepage && r.homepage.trim().length > 5
  );
  const recruiterDemo = hasTopDemo ? 20.0 : 0.0;

  let recruiterIdentity = 0.0;
  if (profile.bio && profile.bio.trim().length > 5) recruiterIdentity += 10.0;
  if (profile.hireable || profile.blog || profile.location) recruiterIdentity += 10.0;

  const recruiterAppeal = Math.max(
    0,
    Math.min(100, Math.round(recruiterShowcase + recruiterNaming + recruiterDemo + recruiterIdentity))
  );

  // --- F. Profile Presentation (0 - 100) ---
  let presScore = 0;
  if (profile.bio && profile.bio.trim().length > 5) presScore += 20;
  if (profile.name && profile.name.trim().length > 0) presScore += 15;
  if (profile.avatar_url) presScore += 10;
  if (profile.company || profile.location) presScore += 15;
  if (profile.blog) presScore += 15;
  if (profile.has_profile_readme) presScore += 25;

  const profilePresentation = Math.max(0, Math.min(100, presScore));

  const categoryScores: CategoryScores = {
    technical_strength: technicalStrength,
    project_quality: projectQuality,
    activity_consistency: activityConsistency,
    documentation,
    recruiter_appeal: recruiterAppeal,
    profile_presentation: profilePresentation,
  };

  const weights = ROLE_WEIGHTS[role];
  const weightedSum =
    categoryScores.technical_strength * weights.technical_strength +
    categoryScores.project_quality * weights.project_quality +
    categoryScores.activity_consistency * weights.activity_consistency +
    categoryScores.documentation * weights.documentation +
    categoryScores.recruiter_appeal * weights.recruiter_appeal +
    categoryScores.profile_presentation * weights.profile_presentation;

  const overallScore = Math.max(0, Math.min(100, Math.round(weightedSum)));

  // Sort repos: quality descending, then stars descending
  repoAnalyses.sort((a, b) => {
    if (b.quality_score !== a.quality_score) return b.quality_score - a.quality_score;
    return b.stars - a.stars;
  });

  return {
    scores: {
      overall: overallScore,
      categories: categoryScores,
      weights: weights as unknown as Record<string, number>,
    },
    repos: repoAnalyses,
    summary_metrics: {
      total_repos: repos.length,
      non_fork_repos: nonForkCount,
      total_stars: totalStars,
      total_forks: totalForks,
      active_languages: uniqueLanguages.size,
      recent_pushes_in_90d: pushEventsCount,
    },
  };
}
