# GitRoast Architecture & Specifications

## 1. System Overview
GitRoast is a developer career analysis platform that inspects a public GitHub profile, applies a deterministic scoring algorithm tailored to chosen engineering roles, and leverages LLM synthesis for a witty, evidence-grounded roast and actionable rescue plan.

```
[User Browser: React + Vite + Tailwind]
           │
           │ POST /api/analyze {username, role, brutality}
           ▼
[FastAPI Backend]
    ├── 1. Validation & Rate Limiter (IP-based)
    ├── 2. Cache Check (In-memory TTL cache, 10 min)
    ├── 3. GitHub Service (httpx async + semaphore)
    │       ├── GET /users/{u}
    │       ├── GET /users/{u}/repos (page 1, up to 100)
    │       ├── GET /users/{u}/events/public (up to 300 / 90 days)
    │       └── Top 15 non-fork repos:
    │             ├── GET /repos/{u}/{r}/languages
    │             └── GET /repos/{u}/{r}/readme
    ├── 4. Deterministic Scoring Engine (pure Python, 0-100)
    │       ├── 6 category scores
    │       ├── Role-specific weight calculation
    │       └── Repo-level quality scores and diagnostic flags
    ├── 5. AI Service (Prompt builder + LLM API + JSON Schema validation)
    │       ├── Strips code fences, validates with Pydantic
    │       ├── Retries once on invalid JSON
    │       └── Graceful fallback to ai_available=False if upstream fails
    └── 6. Merged Response (Profile + Scores + Repos + AI + Meta)
```

## 2. Directory Layout
```
gitroast/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI entrypoint, CORS, rate limiting, exception handlers
│   │   ├── config.py                   # pydantic-settings config
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── api.py                  # API Request / Response models
│   │   │   ├── github.py               # GitHub normalized schemas
│   │   │   ├── scoring.py              # Score category and breakdown schemas
│   │   │   └── ai.py                   # LLM payload and structured output schemas
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── github_service.py       # Async GitHub API client, pagination, concurrency
│   │   │   ├── scoring_engine.py       # Deterministic math formulas and weights
│   │   │   ├── ai_service.py           # Provider-agnostic LLM caller with validation
│   │   │   └── cache.py                # In-memory TTL cache
│   │   ├── prompts/
│   │   │   ├── system.md               # System prompt with untrusted data safety & roast rules
│   │   │   └── user_template.md        # User prompt template receiving structured JSON
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── health.py               # GET /api/health
│   │       └── analyze.py              # POST /api/analyze
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_github_service.py
│   │   ├── test_scoring_engine.py
│   │   └── test_ai_service.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts               # Typed fetch client with error normalization
│   │   ├── components/
│   │   │   ├── UsernameForm.tsx        # Landing inputs (username, role, brutality)
│   │   │   ├── ScoreRing.tsx           # Circular overall score hero
│   │   │   ├── ScoreBreakdown.tsx      # Horizontal progress bars for categories
│   │   │   ├── RadarChartCard.tsx      # Recharts radar visual
│   │   │   ├── RoastCard.tsx           # Highlighted roast card + explanation
│   │   │   ├── RecruiterVerdictCard.tsx# 30-sec impression, strengths, weaknesses
│   │   │   ├── RescuePlan.tsx          # 4-horizon prioritized cards
│   │   │   ├── RepoTable.tsx           # Sortable repository table with quality scores
│   │   │   ├── LoadingScreen.tsx       # Multi-stage progressive loader
│   │   │   └── ErrorState.tsx          # Specific error screens with retry
│   │   ├── pages/
│   │   │   ├── Landing.tsx
│   │   │   └── Dashboard.tsx
│   │   ├── types/
│   │   │   └── index.ts                # TypeScript mirrored interfaces
│   │   ├── App.tsx                     # State orchestrator
│   │   ├── main.tsx
│   │   └── index.css                   # Tailwind dark developer theme
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── .env.example
└── README.md
```

## 3. Scoring Formulas and Weight Profiles

### Categories (0-100 each)
1. **Technical Strength**:
   - Language Diversity: min(1.0, count(languages) / 4) * 25
   - Primary Language Depth: (primary_lang_bytes / total_bytes) * 25
   - Original Work Proportion: (non_fork_repos / max(1, total_repos)) * 30
   - Tooling & Topics Presence: min(1.0, repos_with_topics / max(1, original_repos)) * 20
2. **Project Quality**:
   - Star Power (log-scaled): min(30, log10(total_stars + 1) * 15)
   - Fork / Reach Power: min(15, log10(total_forks + 1) * 10)
   - Description Coverage: (repos_with_desc / max(1, repos_analyzed)) * 15
   - License Coverage: (repos_with_license / max(1, repos_analyzed)) * 15
   - Demo / Homepage Coverage: (repos_with_demo / max(1, repos_analyzed)) * 15
   - Maintenance (pushed < 180 days): (fresh_repos / max(1, repos_analyzed)) * 10
3. **Activity & Consistency**:
   - Recent Pushes (90-day window): min(40, push_events_count * 2)
   - Event Variety (issues, PRs, comments): min(30, (unique_event_types / 4) * 30)
   - Active Cadence: min(30, active_weeks_in_window * 3.5)
4. **Documentation**:
   - README Coverage: (repos_with_readme / max(1, repos_analyzed)) * 50
   - Description Completeness (>25 chars): (detailed_desc_repos / max(1, repos_analyzed)) * 30
   - Topics Documentation: (repos_with_topics / max(1, repos_analyzed)) * 20
5. **Recruiter Appeal**:
   - High-Quality Showcases (repos with score >= 70): min(35, quality_repos_count * 12)
   - Clean Repo Names (no default "test", "my-app", "demo" without content): 25
   - Working Demos on Top Repos: min(20, top_repos_with_demo * 10)
   - Bio & Identity Clarity: (has_bio ? 10 : 0) + (has_hireable_or_links ? 10 : 0)
6. **Profile Presentation**:
   - Bio: +20
   - Name: +15
   - Avatar present: +10
   - Company or Location: +15
   - Blog / Website: +15
   - Profile README (`username/username` repository): +25

### Role Weight Matrix
| Target Role | Tech Strength | Project Quality | Activity | Docs | Recruiter Appeal | Profile Presentation |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **software_engineer** | 0.25 | 0.25 | 0.15 | 0.15 | 0.10 | 0.10 |
| **frontend_engineer** | 0.15 | 0.30 | 0.15 | 0.10 | 0.15 | 0.15 |
| **backend_engineer** | 0.30 | 0.20 | 0.15 | 0.20 | 0.10 | 0.05 |
| **ml_engineer** | 0.30 | 0.25 | 0.10 | 0.20 | 0.10 | 0.05 |
| **data_scientist** | 0.25 | 0.25 | 0.15 | 0.20 | 0.10 | 0.05 |

## 4. API Error Mappings
- `INVALID_USERNAME`: Regex validation failure (`^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$`)
- `USER_NOT_FOUND`: GitHub returned 404
- `RATE_LIMITED`: GitHub returned 403 or 429 with rate limit exhausted
- `EMPTY_PROFILE`: User has 0 public repositories
- `UPSTREAM_TIMEOUT`: GitHub API request exceeded timeout threshold
- `INTERNAL`: Unexpected server exception
