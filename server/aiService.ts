import { GoogleGenAI } from '@google/genai';
import type {
  AiAnalysisResult,
  AngleSelection,
  BrutalityLevel,
  GitHubUserData,
  RescuePlanItem,
  RoastAngle,
  ScoringResult,
  TargetRole,
} from './types';
import { extractFacts, selectAnglesAndDevice } from './evidencePack';

// Banned phrases & stock openers
export const BANNED_PHRASES: string[] = [
  'ah,',
  'well, well',
  'well, well, well',
  'looks like',
  'it looks like',
  'congratulations on',
  'you have',
  'it seems',
  'here we have',
  'so, you want to be',
  'stepping into',
  'welcome to',
  'meet ',
  "let's talk about",
  'as an engineer,',
  'graveyard of unfinished',
  'graveyard of side projects',
  'digital monument',
  'monument to short attention spans',
  'calling a hello-world a framework',
  'abandoned warehouse',
  'urban legend',
  'jack of all trades',
  'master of none',
  'dusty attic',
  'code cemetery',
  'swiss army knife',
  'in conclusion',
  'at the end of the day',
  'keep coding',
  'happy coding',
  'good luck out there',
];

const STOCK_OPENER_PATTERN =
  /^\s*(ah[,.]|well[,.]?\s+well|looks like|it looks like|congratulations on|it seems|here we have|so[,]? you want|stepping into|welcome to|let's talk about|as an engineer|meet\b)/i;

export const TONE_PERSONAS: Record<
  BrutalityLevel,
  { label: string; voice: string; roast_directive: string }
> = {
  professional: {
    label: 'Professional Leader',
    voice:
      'Voice: A seasoned Staff+ Principal Engineer and executive hiring leader conducting an internal architecture review. Tone: Polished, diplomatic, highly perceptive, and understated. Humor style: Dry wit and subtle, razor-sharp corporate irony. Never loud or slapstick. Vocabulary: Architectural, strategic, measured, impact-driven.',
    roast_directive:
      'Deliver an understated, intellectually sharp critique focusing on architectural governance, code maturity, and maintenance overhead. Avoid exclamation marks, sarcasm, or shouting.',
  },
  honest: {
    label: 'Candid Peer',
    voice:
      'Voice: A frank, pragmatic Senior Engineer reviewing code over coffee with a peer. Tone: Plain-spoken, direct, grounded, and wry. Humor style: Realistic peer observations that call out awkward realities without melodrama. Vocabulary: Direct, pragmatic, software-grounded, zero corporate jargon.',
    roast_directive:
      'Speak candidly as a trusted colleague who refuses to sugarcoat. Highlight the exact gap between what the candidate claims and what their repositories actually prove.',
  },
  brutal: {
    label: 'Comedic Roastmaster',
    voice:
      'Voice: A ruthless, hilarious tech roastmaster who is also a deeply knowledgeable systems architect. Tone: Fast-paced, punchy, hyperbolic, and brilliantly creative. Humor style: Vivid technical metaphors, satirical analogies, and biting observations about git habits and commit patterns. SAFETY GUARDRAIL: Target ONLY the code, repository hygiene, naming conventions, and project abandonment. NEVER mock personal identity or appearance.',
    roast_directive:
      'Deliver a high-energy, memorable roast utilizing the assigned Comic Device. Hit hard on repository hygiene, naming, and commit behavior using vivid imagery.',
  },
};

export const COMIC_DEVICE_GUIDELINES: Record<string, string> = {
  'dry understatement':
    'Frame the candidate\'s git anomalies with deadpan understatement and polite British corporate euphemisms.',
  'mock awards ceremony':
    'Present an ironic trophy or lifetime achievement award for the candidate\'s most unusual repository habit.',
  'fake changelog/release notes':
    'Structure the roast like software semver release notes (e.g. \'BREAKING CHANGES: Deprecated documentation in favor of raw vibes...\').',
  'sports-commentator play-by-play':
    'Narrate the repository decisions like an urgent, fast-paced color commentator breaking down an erratic sports play.',
  'nature-documentary narration':
    'Observe the candidate\'s repos in the wild like David Attenborough studying bizarre nocturnal creature migration habits.',
  'code-review comment':
    'Frame the critique as an exasperated senior PR code review comment demanding changes before merge.',
  'weather forecast':
    'Deliver a technical meteorologist forecast tracking severe storms of missing documentation and cold fronts of inactive commits.',
  'courtroom cross-examination':
    'Interrogate the repository evidence like an aggressive prosecutor presenting Exhibit A and Exhibit B to the jury.',
  'restaurant review':
    'Critique the GitHub profile like a Michelin-star food critic reviewing an uninspired, undercooked tasting menu.',
  'terms and conditions style':
    'Draft the critique like legalese Terms of Service clauses, disclaimers, and warranty exclusions.',
  'support-ticket reply':
    'Write as a tier-3 technical support agent resolving an escalation about missing repository features and broken promises.',
  'short comparison/analogy':
    'Anchor the entire roast around an unexpected, vivid, and memorable real-world analogy.',
};

// Anti-repetition ring buffer
class AntiRepetitionBuffer {
  private buffer: string[] = [];

  constructor(private maxlen: number = 50) {}

  checkSimilarity(candidate: string, threshold: number = 0.6): { isUnique: boolean; maxSim: number } {
    if (this.buffer.length === 0) return { isUnique: true, maxSim: 0.0 };
    let maxSim = 0.0;
    for (const past of this.buffer) {
      const sim = this.computeBigramJaccard(candidate, past);
      if (sim > maxSim) maxSim = sim;
    }
    return { isUnique: maxSim < threshold, maxSim };
  }

  add(roast: string) {
    if (roast && roast.trim()) {
      this.buffer.push(roast.trim());
      if (this.buffer.length > this.maxlen) {
        this.buffer.shift();
      }
    }
  }

  private computeBigramJaccard(t1: string, t2: string): number {
    const w1 = t1.toLowerCase().match(/\w+/g) || [];
    const w2 = t2.toLowerCase().match(/\w+/g) || [];
    if (w1.length < 2 || w2.length < 2) return 0.0;
    const bg1 = new Set<string>();
    for (let i = 0; i < w1.length - 1; i++) bg1.add(`${w1[i]}_${w1[i + 1]}`);
    const bg2 = new Set<string>();
    for (let i = 0; i < w2.length - 1; i++) bg2.add(`${w2[i]}_${w2[i + 1]}`);
    let intersection = 0;
    bg1.forEach((val) => {
      if (bg2.has(val)) intersection++;
    });
    const union = bg1.size + bg2.size - intersection;
    return union > 0 ? intersection / union : 0.0;
  }
}

const repetitionBuffer = new AntiRepetitionBuffer(50);

export function validateRoast(
  roastText: string,
  angles: RoastAngle[],
  extraRepos: string[] = []
): { isValid: boolean; error?: string } {
  if (STOCK_OPENER_PATTERN.test(roastText)) {
    return { isValid: false, error: 'Stock opener detected' };
  }
  const textLower = roastText.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (textLower.includes(phrase.toLowerCase().replace(/,$/, ''))) {
      return { isValid: false, error: `Banned phrase detected: '${phrase}'` };
    }
  }

  // Evidence grounding check: must cite >= 2 identifiers
  const candidateTokens = new Set<string>();
  angles.forEach((a) => {
    a.repo_names.forEach((r) => candidateTokens.add(r.toLowerCase()));
    Object.values(a.supporting_numbers).forEach((v) => {
      if (typeof v === 'number' && v > 1) {
        candidateTokens.add(String(v));
      }
    });
  });
  extraRepos.forEach((r) => candidateTokens.add(r.toLowerCase()));

  let citedCount = 0;
  candidateTokens.forEach((tok) => {
    const regex = new RegExp(`\\b${tok}\\b`, 'i');
    if (regex.test(roastText)) {
      citedCount++;
    }
  });

  if (citedCount < 2) {
    return {
      isValid: false,
      error: `Insufficient evidence grounding (cited ${citedCount} details, requires >= 2)`,
    };
  }

  return { isValid: true };
}

export function synthesizeFactRoast(
  angle: RoastAngle,
  brutality: BrutalityLevel,
  comicDevice: string,
  variant: number,
  topRepo: string,
  topLang: string
): string {
  const fid = angle.id;
  const vIdx = Math.abs(variant) % 3;
  const repos = angle.repo_names;
  const primaryRepo = repos[0] || topRepo;
  const secondaryRepo = repos[1] || 'secondary-project';
  const nums = angle.supporting_numbers;

  if (fid === 'star_monopoly') {
    const stars = nums.top_repo_stars ?? 10;
    const total = nums.total_stars ?? 10;
    const pct = nums.star_percentage ?? 80;
    const other = nums.other_repos_count ?? 2;
    if (brutality === 'brutal') {
      const t = [
        `'${primaryRepo}' carries ${pct}% of your ${total} community stars (${stars} stars), while your remaining ${other} repositories survive on pure hope and zero web traffic.`,
        `Your GitHub presence is essentially a one-hit wonder: '${primaryRepo}' captured ${stars} of your ${total} stars, while your other ${other} projects read like abandoned drafts.`,
        `'${primaryRepo}' hoards ${pct}% of all your community stars (${stars} stars), leaving your other ${other} projects in total obscurity.`,
      ];
      return t[vIdx];
    } else if (brutality === 'honest') {
      const t = [
        `While '${primaryRepo}' achieved genuine traction with ${stars} stars, your remaining ${other} repositories show minimal community engagement.`,
        `Recruiters see that '${primaryRepo}' accounts for ${pct}% of your ${total} stars; expanding documentation across your other ${other} projects will demonstrate consistent depth.`,
        `Your portfolio relies heavily on '${primaryRepo}' (${stars} of ${total} stars); broadening the scope across your ${other} other repositories will strengthen candidate standing.`,
      ];
      return t[vIdx];
    } else {
      const t = [
        `Candidate exhibits proven capability in flagship repository '${primaryRepo}' (${stars} stars), though portfolio impact remains heavily concentrated against ${other} secondary repositories.`,
        `Technical leadership will note solid adoption on '${primaryRepo}' (${stars} stars); standardizing engineering rigor across the other ${other} projects will accelerate staff-level consideration.`,
        `Demonstrated execution on '${primaryRepo}' (${pct}% of star footprint) would benefit from broader architectural distribution across the remaining ${other} repositories.`,
      ];
      return t[vIdx];
    }
  }

  if (fid === 'ancient_abandoned_repo') {
    const idle = nums.years_idle ?? 3.0;
    const dateLbl = nums.last_active ?? 'several years ago';
    if (brutality === 'brutal') {
      const t = [
        `Repository '${primaryRepo}' hasn't seen a git commit in ${Number(idle).toFixed(1)} years since ${dateLbl}, serving as an archaeological dig site for obsolete dependencies.`,
        `You last pushed to '${primaryRepo}' ${Number(idle).toFixed(1)} years ago in ${dateLbl}; at this point, that codebase belongs in a computer history museum.`,
        `Opening '${primaryRepo}' (untouched for ${Number(idle).toFixed(1)} years since ${dateLbl}) feels like discovering a time capsule from an earlier era of computing.`,
      ];
      return t[vIdx];
    } else if (brutality === 'honest') {
      const t = [
        `Repository '${primaryRepo}' has been completely inactive for ${Number(idle).toFixed(1)} years since ${dateLbl}, which can signal unfinished initiatives during technical reviews.`,
        `Leaving '${primaryRepo}' untouched for ${Number(idle).toFixed(1)} years creates friction in technical evaluations; archiving inactive repos keeps candidate focus clear.`,
        `Reviewers will notice that '${primaryRepo}' hasn't been updated in ${Number(idle).toFixed(1)} years (last touched ${dateLbl}); consider documenting its legacy status.`,
      ];
      return t[vIdx];
    } else {
      const t = [
        `Candidate maintains legacy artifacts such as '${primaryRepo}', which has remained inactive for ${Number(idle).toFixed(1)} years since ${dateLbl}; formal archival would refine executive presentation.`,
        `Portfolio governance would benefit from archiving inactive repositories like '${primaryRepo}' (${Number(idle).toFixed(1)} years idle since ${dateLbl}) to spotlight current capabilities.`,
        `Demonstrated technical tenure is evident, though unattended projects like '${primaryRepo}' (${Number(idle).toFixed(1)} years since ${dateLbl}) dilute visibility of modern production work.`,
      ];
      return t[vIdx];
    }
  }

  if (fid === 'scratchpad_naming_sprawl') {
    const count = nums.scratchpad_count ?? 3;
    const rStr = repos.slice(0, 2).join(', ');
    if (brutality === 'brutal') {
      const t = [
        `${count} repositories carry draft/scratchpad titles (${rStr}), giving reviewers the impression of unfinished weekend experiments rather than production systems.`,
        `With ${count} projects titled '${rStr}', recruiters have to guess which codebases were serious engineering efforts and which were 20-minute demos.`,
        `Publishing ${count} scratchpads including '${rStr}' publicly suggests a habit of starting ambitious ideas and leaving them in permanent prototype limbo.`,
      ];
      return t[vIdx];
    } else if (brutality === 'honest') {
      const t = [
        `You have ${count} repositories with prototype naming (${rStr}); consolidating or renaming them into cohesive packages will elevate technical perception.`,
        `Recruiters screening quickly will notice ${count} scratchpad names like '${rStr}'; packaging them into clear portfolio modules will prevent confusion.`,
        `Hosting ${count} experimental repositories (${rStr}) demonstrates curiosity, but professional portfolios prioritize polished, well-scoped products.`,
      ];
      return t[vIdx];
    } else {
      const t = [
        `Candidate demonstrates active prototyping initiative across ${count} exploratory repositories (${rStr}); transitioning prototypes into formalized products will bolster candidacy.`,
        `Portfolio presentation shows ${count} experimental codebases (${rStr}); establishing clear release lifecycles will reinforce engineering maturity.`,
        `Consolidating early-stage experiments (${count} projects including ${rStr}) will focus reviewer attention on candidate's highest-leverage work.`,
      ];
      return t[vIdx];
    }
  }

  if (fid === 'ghost_repositories') {
    const count = nums.ghost_count ?? 2;
    const rStr = repos.slice(0, 2).join(', ');
    if (brutality === 'brutal') {
      const t = [
        `Repositories like '${rStr}' have zero README and zero description, forcing hiring managers to read raw source files just to decipher what was built.`,
        `Publishing ${count} undocumented repositories including '${rStr}' without a README treats GitHub like an unorganized backup drive with public read access.`,
        `Navigating '${rStr}' with no README or description feels like joining an on-call rotation with zero runbooks or documentation.`,
      ];
      return t[vIdx];
    } else if (brutality === 'honest') {
      const t = [
        `Repositories like '${rStr}' lack both README and description; adding a 1-minute overview will prevent recruiters from immediately skipping past them.`,
        `Leaving ${count} projects like '${rStr}' without documentation creates unnecessary friction for reviewers trying to evaluate your skills.`,
        `Hiring managers need quick context; providing problem statements for undocumented projects like '${rStr}' will showcase strong professional communication.`,
      ];
      return t[vIdx];
    } else {
      const t = [
        `Candidate documentation discipline requires alignment; projects such as '${rStr}' currently lack contextual READMEs or architectural summaries.`,
        `Strengthening documentation across undocumented repositories like '${rStr}' will demonstrate the communication rigor expected of senior engineers.`,
        `Reviewers will seek system context on '${rStr}'; authoring comprehensive overviews will ensure technical scope is accurately recognized.`,
      ];
      return t[vIdx];
    }
  }

  if (fid === 'fork_heavy_portfolio') {
    const forkCount = nums.fork_count ?? 3;
    const total = nums.total_repos ?? 5;
    const pct = nums.fork_percentage ?? 60;
    const rStr = repos.slice(0, 2).join(', ');
    if (brutality === 'brutal') {
      const t = [
        `${forkCount} of your ${total} repositories (${pct}%) are forks like '${rStr}', making your GitHub profile read more like an organized bookmark folder than an engineering portfolio.`,
        `Forking repositories like '${rStr}' to make up ${pct}% of your profile creates the impression of collecting code rather than authoring original systems.`,
        `With ${forkCount} forked projects (${pct}%) including '${rStr}', recruiters will struggle to separate your original work from upstream library code.`,
      ];
      return t[vIdx];
    } else if (brutality === 'honest') {
      const t = [
        `${forkCount} of your ${total} repositories (${pct}%) are forks (${rStr}); highlighting original repositories with distinct pinned projects will clarify your contribution.`,
        `A ${pct}% fork ratio (${rStr}) can blur the line between personal contributions and upstream code during initial technical screening.`,
        `Pinning original projects and distinguishing your ${forkCount} forks like '${rStr}' will give reviewers immediate confidence in your hands-on code volume.`,
      ];
      return t[vIdx];
    } else {
      const t = [
        `Candidate profile exhibits high dependency on upstream forks (${forkCount} of ${total} repositories, ${pct}%); spotlighting original codebases will reinforce independent delivery capability.`,
        `Portfolio composition shows ${pct}% forked assets (${rStr}); emphasizing original architectural design will strengthen senior leadership positioning.`,
        `Clarifying individual contributions within forked ecosystems (${rStr}) will ensure technical evaluators properly assess authoring depth.`,
      ];
      return t[vIdx];
    }
  }

  if (fid === 'quality_chasm') {
    const bestScore = nums.best_score ?? 85;
    const worstScore = nums.worst_score ?? 30;
    const spread = nums.score_spread ?? 55;
    if (brutality === 'brutal') {
      const t = [
        `Quality whiplash: flagship '${primaryRepo}' scored ${bestScore}/100, while '${secondaryRepo}' bottomed out at ${worstScore}/100.`,
        `You demonstrated you can write solid code in '${primaryRepo}' (${bestScore}/100), making the ${worstScore}/100 quality of '${secondaryRepo}' an unsolved mystery.`,
        `A ${spread}-point chasm separates '${primaryRepo}' (${bestScore}/100) from '${secondaryRepo}' (${worstScore}/100), showing unpredictable engineering consistency across projects.`,
      ];
      return t[vIdx];
    } else if (brutality === 'honest') {
      const t = [
        `A noticeable quality gap exists between '${primaryRepo}' (${bestScore}/100) and '${secondaryRepo}' (${worstScore}/100); applying your flagship hygiene across the board will raise your profile.`,
        `Recruiters will appreciate '${primaryRepo}' (${bestScore}/100) but may be deterred by '${secondaryRepo}' (${worstScore}/100); consistency across codebases is key.`,
        `Bringing repositories like '${secondaryRepo}' (${worstScore}/100) closer to the bar set by '${primaryRepo}' (${bestScore}/100) will present a unified senior profile.`,
      ];
      return t[vIdx];
    } else {
      const t = [
        `Candidate demonstrates high delivery potential on '${primaryRepo}' (${bestScore}/100); bridging the quality delta with '${secondaryRepo}' (${worstScore}/100) will demonstrate organizational standard-setting.`,
        `Quality audit reflects strong practices on '${primaryRepo}' (${bestScore}/100) alongside unrefined codebases like '${secondaryRepo}' (${worstScore}/100); systemic hygiene across all repos will validate maturity.`,
        `Elevating maintenance standards on secondary assets like '${secondaryRepo}' (${worstScore}/100) to mirror '${primaryRepo}' (${bestScore}/100) will solidify technical authority.`,
      ];
      return t[vIdx];
    }
  }

  // Default fallback
  if (brutality === 'brutal') {
    const t = [
      `Repository '${primaryRepo}' in ${topLang} has no live demo deployment or open-source license, leaving technical recruiters with zero interactive proof.`,
      `You built '${primaryRepo}' with ${topLang}, but skipped deployment previews and documentation, treating code showcases like private experiments.`,
      `'${primaryRepo}' stands as your primary codebase, yet missing test suites and deployment links make it read like an unfinished prototype.`,
    ];
    return t[vIdx];
  } else if (brutality === 'honest') {
    const t = [
      `Your work on '${primaryRepo}' in ${topLang} demonstrates genuine ability, but absent live demos and missing setup documentation create barriers for reviewers.`,
      `Recruiters reviewing '${primaryRepo}' need immediate visual or operational evidence; adding interactive deployment previews will elevate your standing.`,
      `'${primaryRepo}' shows solid foundations, but providing automated tests and clean deployment links will make your experience unmistakable.`,
    ];
    return t[vIdx];
  } else {
    const t = [
      `Candidate demonstrates competent execution in ${topLang} across '${primaryRepo}'; incorporating automated deployment previews will reinforce production readiness.`,
      `Technical evaluation reveals sound coding in '${primaryRepo}', though formalizing CI/CD verification and architectural documentation will support senior placement.`,
      `Focusing documentation and interactive demonstration on flagship repository '${primaryRepo}' will strategically position candidate for leadership review.`,
    ];
    return t[vIdx];
  }
}

export function generateGroundedFallback(
  userData: GitHubUserData,
  scoringResult: ScoringResult,
  role: TargetRole,
  brutality: BrutalityLevel,
  angleSelection?: AngleSelection,
  variant: number = 0
): AiAnalysisResult {
  const repos = scoringResult.repos;
  const topRepo = repos.length > 0 ? repos[0].name : 'flagship-repo';
  const topLang = repos.length > 0 && repos[0].language ? repos[0].language : 'TypeScript';
  const totalStars = Number(scoringResult.summary_metrics.total_stars ?? 0);

  const angles = angleSelection?.angles || [];
  const device = angleSelection?.comic_device || 'code-review comment';

  const primaryAngle = angles[0];
  const secondaryAngle = angles[1];

  let roast = '';
  if (primaryAngle) {
    const primaryText = synthesizeFactRoast(
      primaryAngle,
      brutality,
      device,
      variant,
      topRepo,
      topLang
    );
    if (secondaryAngle) {
      roast = `${primaryText} In addition, ${secondaryAngle.fact_description.toLowerCase()}`;
    } else {
      roast = primaryText;
    }
  } else {
    roast = `Repository '${topRepo}' in ${topLang} has earned ${totalStars} stars, yet lacks a public deployment preview or comprehensive architectural documentation.`;
  }

  const roastExplanation = `Technical recruiters spend under 45 seconds per GitHub profile. When primary projects like '${topRepo}' show gaps in documentation or live deployments, reviewers default to assuming the codebase is experimental rather than production-ready.`;

  const score = scoringResult.scores.overall;
  let recruiterVerdict = '';
  if (score >= 75) {
    recruiterVerdict = `High-potential developer with demonstrated fluency in ${topLang}. Strong technical fundamentals across ${repos.length} repositories with verifiable code depth.`;
  } else if (score >= 50) {
    recruiterVerdict = `Active programmer with promising project concepts in ${topLang}, but repository hygiene and verification friction create barriers in technical screening.`;
  } else {
    recruiterVerdict = `Early-stage engineering portfolio. Repositories currently resemble scratchpads or coursework prototypes rather than production-grade software showcases.`;
  }

  const strengths = [
    `Demonstrated language focus in ${topLang} across multiple repositories.`,
    `Established public repository footprint with ${totalStars} community stars.`,
    userData.profile.has_profile_readme
      ? `Maintains a dedicated profile README on @${userData.profile.username}.`
      : 'Active commit cadence with recent public contributions recorded in the activity window.',
  ];

  const missingReadme = repos.find((r) => !r.has_readme);
  const missingDemo = repos.find((r) => !r.homepage);
  const missingLicense = repos.find((r) => !r.license);

  const weaknesses = [
    missingReadme
      ? `Repository '${missingReadme.name}' lacks a comprehensive README explaining problem scope, architecture, or setup.`
      : `Repository '${topRepo}' lacks architectural diagrams explaining system design.`,
    missingDemo
      ? `Missing live production deployment links across key projects including '${topRepo}'.`
      : 'Lack of explicit automated CI/CD build status badges.',
    missingLicense
      ? `Multiple repositories lack an open-source license (e.g. '${missingLicense.name}'), deterring enterprise recruiters.`
      : 'Automated test suites (unit/integration) are not prominently highlighted.',
  ];

  const roleGapMap: Record<TargetRole, string[]> = {
    frontend_engineer: [
      'Lacks live interactive demo deployments on Vercel/Netlify for immediate UX evaluation.',
      'Missing automated end-to-end test coverage (Playwright/Cypress) in primary web repositories.',
    ],
    backend_engineer: [
      'Lacks Docker containerization and CI/CD pipelines in primary backend repositories.',
      'Missing database schema migration scripts and formal API contract documentation.',
    ],
    ml_engineer: [
      'Lacks model evaluation benchmarks and experiment tracking artifacts (MLflow/W&B).',
      'Missing reproducibility instructions for datasets and training environments.',
    ],
    data_scientist: [
      'Needs data storytelling notebooks with clear exploratory analysis and visualizations.',
      'Lacks statistical validation pipelines and modular data cleaning scripts.',
    ],
    software_engineer: [
      'Needs modular architectural patterns and separation of concerns over monolithic scripts.',
      'Absence of automated testing suites in root repository branches.',
    ],
  };

  const careerGaps = roleGapMap[role] || [
    'Lack of production telemetry and automated testing pipelines.',
    'Needs explicit architectural documentation on system scalability.',
  ];

  const quickFixes = [
    `Add a structured README with an architecture diagram and quickstart guide to '${topRepo}'.`,
    `Deploy '${topRepo}' to a cloud hosting provider and link the URL in the repo homepage.`,
    'Add standard open-source licenses (MIT or Apache-2.0) to all public repositories.',
    'Configure a simple GitHub Actions CI workflow to run linters and unit tests automatically.',
    'Consolidate or archive inactive scratchpad repositories to highlight flagship projects.',
  ];

  const rescuePlan: RescuePlanItem[] = [
    {
      horizon: 'today',
      tasks: [
        `Write a 1-page README for '${topRepo}' explaining what it solves and how to run it`,
        'Add an open-source MIT license file to all un-licensed repositories',
      ],
    },
    {
      horizon: 'this_week',
      tasks: [
        `Deploy a live instance of '${topRepo}' and add the URL to the repository homepage`,
        'Record a 15-second demo walkthrough and embed it in your README',
      ],
    },
    {
      horizon: 'next_2_weeks',
      tasks: [
        'Configure GitHub Actions to automatically run tests and lint checks on pull requests',
        'Refactor your top repository into clean modular directories with strict typing',
      ],
    },
    {
      horizon: 'this_month',
      tasks: [
        `Build or polish one flagship showcase project targeted squarely at ${role.replace(/_/g, ' ')}`,
        'Write an engineering technical breakdown detailing project architecture',
      ],
    },
  ];

  const roleFitSummary = `Candidate achieves a ${scoringResult.scores.overall}/100 readiness index for ${role.replace(/_/g, ' ')}. Addressing the prioritized quick fixes will directly bridge the gap to top-tier consideration.`;

  const groundingRepos: string[] = [];
  if (angleSelection) {
    angleSelection.angles.forEach((a) => groundingRepos.push(...a.repo_names));
  }
  if (groundingRepos.length === 0 && topRepo) {
    groundingRepos.push(topRepo);
  }

  const result: AiAnalysisResult = {
    recruiter_verdict: recruiterVerdict,
    roast,
    roast_explanation: roastExplanation,
    strengths,
    weaknesses,
    career_gaps: careerGaps,
    quick_fixes: quickFixes,
    rescue_plan: rescuePlan,
    role_fit_summary: roleFitSummary,
    grounding_repos: Array.from(new Set(groundingRepos)),
    comic_device: device,
  };

  repetitionBuffer.add(result.roast);
  return result;
}

export async function generateRoastAndAnalysis(
  userData: GitHubUserData,
  scoringResult: ScoringResult,
  role: TargetRole,
  brutality: BrutalityLevel,
  variant: number = 0
): Promise<{ result: AiAnalysisResult; aiAvailable: boolean; error?: string }> {
  const facts = extractFacts(userData, scoringResult);
  const angleSelection = selectAnglesAndDevice(
    facts,
    userData.profile.username,
    brutality,
    variant
  );

  const groundingRepos: string[] = [];
  angleSelection.angles.forEach((a) => groundingRepos.push(...a.repo_names));
  if (groundingRepos.length === 0 && scoringResult.repos.length > 0) {
    groundingRepos.push(scoringResult.repos[0].name);
  }
  const uniqueGroundingRepos = Array.from(new Set(groundingRepos));

  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  if (geminiKey) {
    try {
      const ai = new GoogleGenAI();
      const roleLabel = role.replace(/_/g, ' ').toUpperCase();
      const toneInfo = TONE_PERSONAS[brutality] || TONE_PERSONAS.honest;
      const comicGuideline =
        COMIC_DEVICE_GUIDELINES[angleSelection.comic_device] ||
        `Frame the roast using ${angleSelection.comic_device}.`;

      const systemPrompt = `You are GitRoast, an elite, highly perceptive technical recruiter and career diagnostic coach.
TARGET ROLE: ${roleLabel}
PERSONA: ${toneInfo.label}
${toneInfo.voice}
${toneInfo.roast_directive}

COMIC DEVICE GUIDELINE: ${comicGuideline}

CRITICAL RULES:
1. The roast MUST reference at least TWO specific details (exact repository names or numbers) from the supplied evidence angles.
2. Never invent repositories or stats.
3. No stock openers like "Ah", "Well, well", "Looks like", "It seems". No clichés like "digital graveyard".
4. Respond with valid JSON matching:
{
  "recruiter_verdict": "string",
  "roast": "2-4 sentence witty roast grounded in evidence",
  "roast_explanation": "string",
  "strengths": ["string", "string", "string"],
  "weaknesses": ["string", "string", "string"],
  "career_gaps": ["string", "string"],
  "quick_fixes": ["string", "string", "string", "string", "string"],
  "rescue_plan": [
    {"horizon": "today", "tasks": ["string", "string"]},
    {"horizon": "this_week", "tasks": ["string", "string"]},
    {"horizon": "next_2_weeks", "tasks": ["string", "string"]},
    {"horizon": "this_month", "tasks": ["string", "string"]}
  ],
  "role_fit_summary": "string"
}`;

      const userPrompt = `Candidate: ${userData.profile.username}
Evidence angles:
${JSON.stringify(angleSelection.angles, null, 2)}
Candidate metrics:
${JSON.stringify({
  overall_score: scoringResult.scores.overall,
  categories: scoringResult.scores.categories,
  top_repos: scoringResult.repos.slice(0, 5),
}, null, 2)}
Return ONLY valid JSON.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${systemPrompt}\n\nUser:\n${userPrompt}`,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.95,
        },
      });

      const text = response.text || '';
      const parsed = JSON.parse(text);
      parsed.grounding_repos = uniqueGroundingRepos;
      parsed.comic_device = angleSelection.comic_device;

      const validation = validateRoast(
        parsed.roast || '',
        angleSelection.angles,
        scoringResult.repos.map((r) => r.name)
      );

      if (validation.isValid) {
        repetitionBuffer.add(parsed.roast);
        return { result: parsed as AiAnalysisResult, aiAvailable: true };
      }
    } catch (err: any) {
      console.warn('Gemini API call failed, using high-fidelity grounded heuristic fallback:', err.message);
    }
  }

  // High-fidelity grounded fallback
  const fallback = generateGroundedFallback(
    userData,
    scoringResult,
    role,
    brutality,
    angleSelection,
    variant
  );

  return { result: fallback, aiAvailable: true };
}
