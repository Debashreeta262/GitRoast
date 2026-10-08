import type {
  AngleSelection,
  EvidenceFact,
  GitHubUserData,
  RoastAngle,
  ScoringResult,
} from './types';

export const COMIC_DEVICES: string[] = [
  'dry understatement',
  'mock awards ceremony',
  'fake changelog/release notes',
  'sports-commentator play-by-play',
  'nature-documentary narration',
  'code-review comment',
  'weather forecast',
  'courtroom cross-examination',
  'restaurant review',
  'terms and conditions style',
  'support-ticket reply',
  'short comparison/analogy',
];

const SCRATCH_PATTERN =
  /^(test|demo|temp|untitled|copy|clone|sample|tutorial|sandbox|playground|final|v\d|draft|foo|bar|baz)[\w-]*|.*[-_](test|demo|temp|copy|v2|final)$/i;

function stringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Pseudo-random generator with seed
function pseudoRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function extractFacts(
  userData: GitHubUserData,
  scoringResult: ScoringResult
): EvidenceFact[] {
  const facts: EvidenceFact[] = [];

  const extractors = [
    extractStarSkew,
    extractAbandonedRepo,
    extractNamingPatterns,
    extractGhostRepos,
    extractForkRatio,
    extractLanguageDistribution,
    extractQualityChasm,
    extractHeavyUndocumentedRepo,
    extractZeroDemosOrLicenses,
    extractProfilePresentation,
    extractAccountTenureVsRepos,
    extractFlaggedRepos,
  ];

  for (const extractor of extractors) {
    try {
      const fact = extractor(userData, scoringResult);
      if (fact) facts.push(fact);
    } catch {
      // ignore
    }
  }

  if (facts.length < 2) {
    facts.push(extractBaselineRepoFact(userData, scoringResult));
  }

  // Deduplicate
  const seenIds = new Set<string>();
  const uniqueFacts: EvidenceFact[] = [];
  for (const f of facts) {
    if (!seenIds.has(f.id)) {
      seenIds.add(f.id);
      uniqueFacts.push(f);
    }
  }

  uniqueFacts.sort((a, b) => b.unusualness_score - a.unusualness_score);
  return uniqueFacts;
}

export function selectAnglesAndDevice(
  facts: EvidenceFact[],
  username: string,
  tone: string,
  variant: number = 0
): AngleSelection {
  const seedKey = `${username.toLowerCase().trim()}:${tone.toLowerCase().trim()}:${variant}`;
  const seedNum = stringHash(seedKey);
  const rng = pseudoRandom(seedNum);

  const comicDevice = COMIC_DEVICES[Math.floor(rng() * COMIC_DEVICES.length)];

  if (facts.length === 0) {
    return {
      angles: [],
      comic_device: comicDevice,
      variant,
      all_facts: [],
    };
  }

  let selectedFacts: EvidenceFact[] = [];
  if (facts.length <= 3) {
    selectedFacts = [...facts];
  } else {
    const candidatePool = facts.slice(0, Math.min(facts.length, 6));
    const targetCount = Math.min(3, candidatePool.length);

    while (selectedFacts.length < targetCount && candidatePool.length > 0) {
      const totalWeight = candidatePool.reduce((acc, f) => acc + Math.max(1.0, f.unusualness_score), 0);
      const roll = rng() * totalWeight;
      let accum = 0.0;
      let pickedIdx = 0;
      for (let i = 0; i < candidatePool.length; i++) {
        accum += Math.max(1.0, candidatePool[i].unusualness_score);
        if (accum >= roll) {
          pickedIdx = i;
          break;
        }
      }
      selectedFacts.push(candidatePool.splice(pickedIdx, 1)[0]);
    }
  }

  const angles: RoastAngle[] = selectedFacts.map((f) => ({
    id: f.id,
    fact_description: f.description,
    supporting_numbers: f.supporting_numbers,
    repo_names: f.repo_names,
  }));

  return {
    angles,
    comic_device: comicDevice,
    variant,
    all_facts: facts,
  };
}

// -------------------------------------------------------------------------
// Extractors
// -------------------------------------------------------------------------

function extractStarSkew(
  userData: GitHubUserData,
  scoringResult: ScoringResult
): EvidenceFact | null {
  const repos = scoringResult.repos;
  if (!repos.length) return null;

  const totalStars = repos.reduce((acc, r) => acc + r.stars, 0);
  if (totalStars > 0 && repos.length >= 2) {
    const sorted = [...repos].sort((a, b) => b.stars - a.stars);
    const topRepo = sorted[0];
    const topStars = topRepo.stars;
    const pct = Math.round((topStars / totalStars) * 1000) / 10;

    if (pct >= 65.0) {
      const otherCount = repos.length - 1;
      const otherStars = totalStars - topStars;
      return {
        id: 'star_monopoly',
        description: `Repository '${topRepo.name}' holds ${pct}% of your ${totalStars} total stars (${topStars} stars), while your remaining ${otherCount} repositories have ${otherStars} stars combined.`,
        supporting_numbers: {
          top_repo_stars: topStars,
          total_stars: totalStars,
          star_percentage: pct,
          other_repos_count: otherCount,
        },
        repo_names: [topRepo.name],
        unusualness_score: pct >= 85.0 ? 9.3 : 7.9,
      };
    }
  } else if (totalStars === 0 && repos.length >= 4) {
    return {
      id: 'zero_star_desert',
      description: `Across ${repos.length} public repositories, you have accumulated exactly 0 stars from the GitHub community.`,
      supporting_numbers: { total_repos: repos.length, total_stars: 0 },
      repo_names: repos.slice(0, 3).map((r) => r.name),
      unusualness_score: 7.2,
    };
  }
  return null;
}

function extractAbandonedRepo(
  userData: GitHubUserData,
  scoringResult: ScoringResult
): EvidenceFact | null {
  const now = new Date();
  const staleCandidates: { repo: any; dt: Date; idleYears: number }[] = [];

  for (const r of scoringResult.repos) {
    const pushedStr = r.pushed_at || r.updated_at;
    if (!pushedStr) continue;
    const dt = new Date(pushedStr);
    if (isNaN(dt.getTime())) continue;
    const idleYears = (now.getTime() - dt.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (idleYears >= 2.0) {
      staleCandidates.push({ repo: r, dt, idleYears });
    }
  }

  if (!staleCandidates.length) return null;
  staleCandidates.sort((a, b) => b.idleYears - a.idleYears);
  const { repo: oldestRepo, dt, idleYears } = staleCandidates[0];
  const dateLabel = dt.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return {
    id: 'ancient_abandoned_repo',
    description: `Repository '${oldestRepo.name}' hasn't seen a single commit in ${idleYears.toFixed(1)} years (last active in ${dateLabel}).`,
    supporting_numbers: {
      years_idle: Math.round(idleYears * 10) / 10,
      last_active: dateLabel,
    },
    repo_names: [oldestRepo.name],
    unusualness_score: Math.min(9.5, 6.2 + idleYears * 0.7),
  };
}

function extractNamingPatterns(
  userData: GitHubUserData,
  scoringResult: ScoringResult
): EvidenceFact | null {
  const scratchpads = scoringResult.repos
    .map((r) => r.name)
    .filter((n) => SCRATCH_PATTERN.test(n));

  if (scratchpads.length >= 2) {
    const listStr = scratchpads.slice(0, 3).join(', ') + (scratchpads.length > 3 ? '...' : '');
    return {
      id: 'scratchpad_naming_sprawl',
      description: `${scratchpads.length} repositories bear scratchpad/prototype names (${listStr}), resembling abandoned experiments rather than finished products.`,
      supporting_numbers: { scratchpad_count: scratchpads.length },
      repo_names: scratchpads.slice(0, 4),
      unusualness_score: Math.min(9.1, 6.5 + scratchpads.length * 0.6),
    };
  }
  return null;
}

function extractGhostRepos(
  userData: GitHubUserData,
  scoringResult: ScoringResult
): EvidenceFact | null {
  const ghosts = scoringResult.repos.filter((r) => !r.has_readme && !r.description);
  if (ghosts.length >= 2) {
    const ghostNames = ghosts.map((g) => g.name);
    return {
      id: 'ghost_repositories',
      description: `${ghosts.length} repositories have neither a description nor a README (${ghostNames.slice(0, 3).join(', ')}), giving reviewers zero context on what they do.`,
      supporting_numbers: { ghost_count: ghosts.length },
      repo_names: ghostNames.slice(0, 4),
      unusualness_score: Math.min(8.9, 6.0 + ghosts.length * 0.5),
    };
  } else if (ghosts.length === 1 && scoringResult.repos.length <= 3) {
    return {
      id: 'ghost_repositories',
      description: `Repository '${ghosts[0].name}' contains neither a description nor a README.`,
      supporting_numbers: { ghost_count: 1 },
      repo_names: [ghosts[0].name],
      unusualness_score: 6.0,
    };
  }
  return null;
}

function extractForkRatio(
  userData: GitHubUserData,
  scoringResult: ScoringResult
): EvidenceFact | null {
  const total = scoringResult.repos.length;
  if (total < 3) return null;

  const forks = scoringResult.repos.filter((r) => r.is_fork);
  const forkPct = Math.round((forks.length / total) * 100);

  if (forkPct >= 40) {
    const forkNames = forks.map((f) => f.name);
    return {
      id: 'fork_heavy_portfolio',
      description: `${forks.length} of your ${total} repositories (${forkPct}%) are forks of other projects (${forkNames.slice(0, 3).join(', ')}), making your profile look more like bookmarks than code.`,
      supporting_numbers: {
        fork_count: forks.length,
        total_repos: total,
        fork_percentage: forkPct,
      },
      repo_names: forkNames.slice(0, 3),
      unusualness_score: Math.min(9.0, 6.2 + (forkPct / 100) * 3.2),
    };
  } else if (total >= 6 && forks.length === 0) {
    return {
      id: 'pure_original_codebase',
      description: `All ${total} repositories represent 100% original repositories with zero forks.`,
      supporting_numbers: { total_repos: total, fork_count: 0 },
      repo_names: scoringResult.repos.slice(0, 2).map((r) => r.name),
      unusualness_score: 6.3,
    };
  }
  return null;
}

function extractLanguageDistribution(
  userData: GitHubUserData,
  scoringResult: ScoringResult
): EvidenceFact | null {
  const langs = scoringResult.repos
    .map((r) => r.language)
    .filter((l): l is string => Boolean(l && l !== 'Unknown' && l !== 'None'));
  const distinctLangs = Array.from(new Set(langs));

  if (distinctLangs.length >= 5) {
    return {
      id: 'language_sprawl',
      description: `Your work is fragmented across ${distinctLangs.length} distinct programming languages (${distinctLangs.slice(0, 4).join(', ')}), exhibiting wide curiosity without clear stack specialization.`,
      supporting_numbers: { language_count: distinctLangs.length },
      repo_names: scoringResult.repos.slice(0, 3).map((r) => r.name),
      unusualness_score: 7.6,
    };
  } else if (distinctLangs.length === 1 && scoringResult.repos.length >= 4) {
    const singleLang = distinctLangs[0];
    return {
      id: 'language_monoculture',
      description: `100% of your projects are written strictly in ${singleLang} (${scoringResult.repos.length} repos) with zero experimentation in neighboring ecosystems.`,
      supporting_numbers: { language_count: 1, primary_language: singleLang },
      repo_names: scoringResult.repos.slice(0, 3).map((r) => r.name),
      unusualness_score: 6.7,
    };
  }
  return null;
}

function extractQualityChasm(
  userData: GitHubUserData,
  scoringResult: ScoringResult
): EvidenceFact | null {
  const nonForks = scoringResult.repos.filter((r) => !r.is_fork);
  if (nonForks.length < 2) return null;

  const sorted = [...nonForks].sort((a, b) => b.quality_score - a.quality_score);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const delta = best.quality_score - worst.quality_score;

  if (delta >= 35) {
    return {
      id: 'quality_chasm',
      description: `Wide quality gap: flagship '${best.name}' earned ${best.quality_score}/100, while '${worst.name}' sank to ${worst.quality_score}/100.`,
      supporting_numbers: {
        best_score: best.quality_score,
        worst_score: worst.quality_score,
        score_spread: delta,
      },
      repo_names: [best.name, worst.name],
      unusualness_score: Math.min(8.9, 6.0 + (delta / 100) * 3.5),
    };
  }
  return null;
}

function extractHeavyUndocumentedRepo(
  userData: GitHubUserData,
  _scoringResult: ScoringResult
): EvidenceFact | null {
  const undocumentedLarge = userData.repos.filter(
    (r) => r.size_kb >= 4000 && !r.has_readme
  );
  if (undocumentedLarge.length > 0) {
    const heaviest = [...undocumentedLarge].sort((a, b) => b.size_kb - a.size_kb)[0];
    const sizeMb = Math.round((heaviest.size_kb / 1024) * 10) / 10;
    return {
      id: 'heavy_undocumented_repo',
      description: `Repository '${heaviest.name}' weighs ${sizeMb} MB of raw assets and code, yet contains no README documentation.`,
      supporting_numbers: { size_mb: sizeMb, size_kb: heaviest.size_kb },
      repo_names: [heaviest.name],
      unusualness_score: 8.6,
    };
  }
  return null;
}

function extractZeroDemosOrLicenses(
  userData: GitHubUserData,
  scoringResult: ScoringResult
): EvidenceFact | null {
  const total = scoringResult.repos.length;
  if (total < 3) return null;

  const hasDemo = scoringResult.repos.filter((r) => r.homepage);
  const hasLic = scoringResult.repos.filter((r) => r.license);

  if (hasDemo.length === 0 && hasLic.length === 0) {
    return {
      id: 'zero_demos_zero_licenses',
      description: `Across all ${total} repositories, zero have a live deployment URL and zero have an open-source license.`,
      supporting_numbers: { total_repos: total, demo_count: 0, license_count: 0 },
      repo_names: scoringResult.repos.slice(0, 2).map((r) => r.name),
      unusualness_score: 8.2,
    };
  } else if (hasDemo.length === 0) {
    return {
      id: 'zero_live_demos',
      description: `None of your ${total} repositories include an interactive demo preview or live deployment URL.`,
      supporting_numbers: { total_repos: total, demo_count: 0 },
      repo_names: scoringResult.repos.slice(0, 2).map((r) => r.name),
      unusualness_score: 7.3,
    };
  } else if (hasLic.length === 0) {
    return {
      id: 'zero_licenses',
      description: `Not a single repository among your ${total} projects carries an open-source license.`,
      supporting_numbers: { total_repos: total, license_count: 0 },
      repo_names: scoringResult.repos.slice(0, 2).map((r) => r.name),
      unusualness_score: 7.0,
    };
  }
  return null;
}

function extractProfilePresentation(
  userData: GitHubUserData,
  _scoringResult: ScoringResult
): EvidenceFact | null {
  const p = userData.profile;
  if (!p.has_profile_readme && (!p.bio || p.bio.trim().length < 5)) {
    return {
      id: 'blank_profile_canvas',
      description: `Profile @${p.username} has no profile README and an empty bio, missing the easiest recruiter conversion touchpoint.`,
      supporting_numbers: { has_profile_readme: false, has_bio: false },
      repo_names: [],
      unusualness_score: 6.6,
    };
  } else if (p.has_profile_readme && p.followers >= 10) {
    return {
      id: 'active_personal_branding',
      description: `Profile @${p.username} maintains a dedicated profile README and has earned ${p.followers} followers.`,
      supporting_numbers: { followers: p.followers, has_profile_readme: true },
      repo_names: [],
      unusualness_score: 6.2,
    };
  }
  return null;
}

function extractAccountTenureVsRepos(
  userData: GitHubUserData,
  _scoringResult: ScoringResult
): EvidenceFact | null {
  const p = userData.profile;
  if (!p.created_at) return null;

  try {
    const createdDt = new Date(p.created_at);
    if (isNaN(createdDt.getTime())) return null;
    const now = new Date();
    const tenureYears = (now.getTime() - createdDt.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    if (tenureYears >= 4.0 && p.public_repos <= 2) {
      return {
        id: 'dormant_veteran_account',
        description: `Account is ${tenureYears.toFixed(1)} years old (created ${createdDt.getFullYear()}), yet hosts only ${p.public_repos} public repositories.`,
        supporting_numbers: {
          tenure_years: Math.round(tenureYears * 10) / 10,
          public_repos: p.public_repos,
        },
        repo_names: [],
        unusualness_score: 7.8,
      };
    } else if (tenureYears <= 0.5 && p.public_repos >= 15) {
      return {
        id: 'hyperactive_newcomer',
        description: `Account is under 6 months old, yet has already amassed ${p.public_repos} repositories.`,
        supporting_numbers: {
          tenure_years: Math.round(tenureYears * 10) / 10,
          public_repos: p.public_repos,
        },
        repo_names: [],
        unusualness_score: 8.0,
      };
    }
  } catch {
    // ignore
  }
  return null;
}

function extractFlaggedRepos(
  userData: GitHubUserData,
  scoringResult: ScoringResult
): EvidenceFact | null {
  const flagged = scoringResult.repos.filter((r) => r.flags.length > 0);
  if (flagged.length > 0) {
    const worst = [...flagged].sort((a, b) => b.flags.length - a.flags.length)[0];
    const flagsStr = worst.flags.slice(0, 2).join(', ');
    return {
      id: 'repository_red_flags',
      description: `Repository '${worst.name}' was flagged for: ${flagsStr}.`,
      supporting_numbers: { flag_count: worst.flags.length },
      repo_names: [worst.name],
      unusualness_score: 6.5,
    };
  }
  return null;
}

function extractBaselineRepoFact(
  userData: GitHubUserData,
  scoringResult: ScoringResult
): EvidenceFact {
  if (scoringResult.repos.length > 0) {
    const topRepo = scoringResult.repos[0];
    return {
      id: 'flagship_repository',
      description: `Top repository '${topRepo.name}' is written in ${topRepo.language || 'Code'} with ${topRepo.stars} stars and quality score ${topRepo.quality_score}/100.`,
      supporting_numbers: {
        stars: topRepo.stars,
        quality_score: topRepo.quality_score,
      },
      repo_names: [topRepo.name],
      unusualness_score: 5.0,
    };
  }
  return {
    id: 'empty_repository_shelf',
    description: `User @${userData.profile.username} has 0 public repositories available for evaluation.`,
    supporting_numbers: { public_repos: 0 },
    repo_names: [],
    unusualness_score: 8.0,
  };
}
