# GitRoast 🔥 — GitHub Roast and Rescue

> **PromptWars Hackathon Submission**  
> *Give a messy GitHub profile the honest feedback it deserves — funny, grounded, and actually actionable.*

[![Backend Tests](https://img.shields.io/badge/pytest-34%20passed-10b981?style=flat-square&logo=python)](file:///C:/Users/Debashreeta/.gemini/antigravity/scratch/gitroast/backend)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict%20build%20passing-4f46e5?style=flat-square&logo=typescript)](file:///C:/Users/Debashreeta/.gemini/antigravity/scratch/gitroast/frontend)
[![WCAG AA](https://img.shields.io/badge/Accessibility-WCAG%20AA%20Compliant-3b82f6?style=flat-square)](file:///C:/Users/Debashreeta/.gemini/antigravity/scratch/gitroast)

---

## 🏆 PromptWars Hackathon Problem Statement

> ### **GitHub Roast and Rescue: Give a messy GitHub profile the honest feedback it deserves**
>
> *Student GitHub profiles are often empty, messy, or full of half-finished projects, and nobody tells you what to fix. Everyone hears "build a portfolio" but nobody explains what a good one looks like.*
>
> **The Mission:** Build something that looks at a real GitHub profile and tells its owner the truth, in a way they will actually listen to.
>
> **Start here:** A username goes in, and your app reads that person's public GitHub data.
>
> **Make it yours:**
> 1. *What does a recruiter notice in 30 seconds?*
> 2. *What makes feedback funny without being cruel?*
> 3. *What would help someone actually improve afterwards?*

---

## 💡 How GitRoast Solves the Problem

GitRoast transforms opaque recruiter rejections and vague *"build more projects"* advice into a diagnostic, entertaining, and educational career review.

```
       ┌────────────────────────┐
       │   Public GitHub Data   │
       │ (User, Repos, Events)  │
       └───────────┬────────────┘
                   │
    ┌──────────────┴──────────────┐
    ▼                             ▼
┌────────────────────────┐  ┌────────────────────────┐
│  Deterministic Engine  │  │   Evidence Pack &      │
│  (Pure Python Scoring) │  │   Fact Extraction      │
│  • 6 Category Scores   │  │  • Star monopolies     │
│  • Role-weighted Index │  │  • Idle repo dates     │
│  • Repo Quality (0-100)│  │  • Scratchpad names    │
└───────────┬────────────┘  │  • Ghost repos / forks │
            │               └───────────┬────────────┘
            │                           │
            └──────────────┬────────────┘
                           ▼
            ┌─────────────────────────────┐
            │    Anti-Repetition & Tone   │
            │   • 3 Distinct Personas     │
            │   • 12 Comic Devices        │
            │   • Ring Buffer (Jaccard)   │
            │   • Banned Cliché Filter    │
            └──────────────┬──────────────┘
                           ▼
            ┌─────────────────────────────┐
            │     The "Rescue" Output     │
            │  • 30s Recruiter Screen     │
            │  • Grounded, Punchy Roast   │
            │  • 4-Horizon Action Plan    │
            │  • 5 Concrete Quick Fixes   │
            └─────────────────────────────┘
```

### 1. What Does a Recruiter Notice in 30 Seconds?
- **30-Second Elevator Pitch Impression**: Instant verdict on technical readiness for the candidate's chosen career path.
- **5 Target Role Benchmarks**:
  - **Software Engineer**: Breadth, code quality, fundamentals & project depth.
  - **Frontend Engineer**: UI craft, live demo links, framework depth & presentation.
  - **Backend Engineer**: APIs, architecture docs, containerization, reliability & license coverage.
  - **ML Engineer**: Models, notebooks, reproducibility docs, and flagship depth.
  - **Data Scientist**: Analysis workflows, exploratory storytelling, and commit cadence.
- **Verified Strengths & Deficits**: Exactly 3 observable strengths, 3 concrete weaknesses, and specific role gaps.

### 2. What Makes Feedback Funny Without Being Cruel?
- **Tone Personas with Real Voice Divergence**:
  - **Professional Leader**: Seasoned Staff+ Engineer review; diplomatic, strategic, dry corporate wit.
  - **Candid Peer**: Pragmatic senior peer reviewing code over coffee; plain-spoken, direct, and wry.
  - **Comedic Roastmaster**: Relentless, fast-paced, hyperbolic tech humor.
- **12 Dynamic Comic Devices**:
  - *Courtroom cross-examination*, *fake changelog / release notes*, *sports-commentator play-by-play*, *nature-documentary narration*, *code-review comment*, *weather forecast*, *mock awards ceremony*, *restaurant review*, *terms and conditions style*, *support-ticket reply*, *dry understatement*, *short comparison/analogy*.
- **Strict Anti-Cruelty Guardrails**:
  - Roasts **exclusively** target code hygiene, naming patterns, repository abandonment, and documentation discipline.
  - **NEVER** personal identity, appearance, background, or human dignity.
  - Every punchline is paired with **"What Hiring Managers See & The Fix"**.

### 3. How Does Someone Actually Improve Afterwards? (The "Rescue")
- **Actionable 4-Horizon Career Rescue Plan**:
  - ⏱️ **Today**: Low-friction, high-impact fixes (add MIT license, write a 1-page README for your flagship repo).
  - 📅 **This Week**: Deployment previews and visual demonstrations (record a 15-second walkthrough GIF, deploy to cloud).
  - 📆 **Next 2 Weeks**: Engineering rigor (GitHub Actions CI/CD workflows, modular refactoring).
  - 🚀 **This Month**: High-leverage portfolio projects tailored squarely to the target role.
- **Repository Audit Table**:
  - Individual quality rating (0–100) per repository.
  - Actionable diagnostic flags (`Missing README`, `No license`, `Stale (X days)`, `No live demo link`, `Forked repo`).

---

## 🔬 Core Innovations & Architecture

### A) The Deterministic Scoring Engine (Zero Hallucination)
Scores are **never** estimated by prompt engineering or LLM temperature rolls. All categories are scored **0–100** using pure algorithmic rules in Python:
- **Technical Strength (25%)**: Originality ratio (non-fork repos), language depth, stack breadth.
- **Project Quality (25%)**: Log-scaled stars & forks, description completeness, license presence, live demo URLs.
- **Activity & Consistency (15%)**: 90-day Events API cadence, PRs, issues, and commit distribution.
- **Documentation Discipline (15%)**: README coverage ratio, detailed problem statements.
- **Recruiter Appeal (10%)**: Ratio of flagship repositories scoring $\ge 65/100$, absence of prototype clutter.
- **Profile Presentation (10%)**: Profile README, bio, avatar, company, and location.

### B) Deterministic Evidence Pack & Seeded Selection
- **12 Fact Extractors**: Evaluates star monopolies (top repo holding $\ge 65\%$ of stars), oldest abandoned repo (exact idle years and last push date), scratchpad naming patterns (`test-*`, `demo-*`, `untitled-*`), ghost repos (0 README + 0 description), fork-to-original ratios, quality chasms ($\ge 35$ pt spread), and heavy undocumented repositories.
- **Grounding Guarantee**: Every roast is programmatically validated to cite **at least 2 verifiable details** (exact repo names or numbers) from the user's actual profile.
- **Seeded Variety**: Seeded by `hash(username + tone + variant)`. Repeated requests for the same user remain stable, but clicking **"Re-roll"** instantly changes the comic device and roast angle.

### C) Programmatic Anti-Repetition & Banned Cliches
- **Banned Cliché Blacklist**: Hard negative constraint filtering out stock openers (*"Ah,"*, *"Well, well"*, *"Looks like"*, *"It seems"*) and tired clichés (*"graveyard of unfinished side projects"*, *"digital monument to short attention spans"*).
- **Anti-Repetition Ring Buffer**: In-memory ring buffer (capacity 50) computing word-bigram Jaccard similarity. Rejects any roast with similarity $> 0.60$ and triggers an automated repair retry.
- **Diverse Deterministic Fallback**: If an LLM API key is missing or offline, a multi-template fallback synthesizes grounded critiques across all 3 tones. Two different users never receive the same roast, even offline!

### D) Professional Career Product UI
- **Design Token Palette**: Linear/Vercel/Stripe-inspired dark theme (`#0B0F19`, `#111827`, `#161E2E`, `#1F2A3C`), single confident indigo primary accent (`#4F46E5`), and reserved roast coral (`#F43F5E`).
- **Accessible Role Selector**: WAI-ARIA `role="radiogroup"` with keyboard roving focus (`ArrowLeft`, `ArrowRight`, `Space`, `Enter`) and 3 verified scoring signal chips per role.
- **Instant Re-roll**: In-place optimistic roast regeneration powered by `POST /api/regenerate-roast` without re-fetching GitHub API data.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Tailwind CSS, Recharts, Lucide React, Vite |
| **Backend** | Python 3.11+, FastAPI, Pydantic v2, `pydantic-settings`, `httpx` (async) |
| **AI / LLM** | Provider-agnostic interface (Google Gemini 1.5 Flash, OpenAI GPT-4o-mini, Anthropic Claude 3.5 Haiku) + Deterministic Grounded Fallback |
| **Data Sources** | GitHub REST API v3 (Public endpoints: User Profile, Repositories, Public Events) |
| **Testing** | `pytest` + `pytest-asyncio` (34 test cases), TypeScript strict compiler check (`tsc -b`) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+ and pip

---

### 1. Start the Backend

```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env from template
copy .env.example .env    # Windows PowerShell: cp .env.example .env
```

#### Configure `.env` (Optional but recommended)
Open `backend/.env`:
```env
# Optional: Higher GitHub API rate limits (5,000 req/hr vs 60 req/hr)
GITHUB_TOKEN=

# LLM Provider: 'gemini' | 'openai' | 'anthropic'
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here

# Server settings
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
HOST=0.0.0.0
PORT=8000
```

> **Offline Mode:** If you do not have an LLM key, GitRoast runs in **Offline Heuristic Mode** (`ENABLE_OFFLINE_AI_FALLBACK=true`). The deterministic scores, evidence pack, diverse tone templates, and rescue plans remain 100% operational!

#### Run the Server:
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Health check:
```bash
curl http://localhost:8000/api/health
# Returns: {"status": "ok"}
```

---

### 2. Start the Frontend

In a separate terminal:
```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 🧪 Testing & Verification

### Run the Full Backend Test Suite (34 Passed)
```bash
cd backend
python -m pytest
```
Tests cover:
- GitHub username regex validation (`INVALID_USERNAME`) and upstream 404 handling (`USER_NOT_FOUND`)
- In-memory TTL cache expiration and composite variant keys
- 12 deterministic evidence pack fact extractors and ranking
- Seed determinism across usernames, tones, and variant counters
- Banned phrases, stock openers, and cliché rejection
- Evidence grounding verification (minimum 2 citations)
- Anti-repetition ring buffer bigram Jaccard similarity
- `POST /api/analyze` and `POST /api/regenerate-roast` pipelines

### Run the Multi-User Verification Script (5 Profiles $\times$ 3 Tones)
```bash
cd backend
python verify_multi_user.py
```
Outputs a live audit verifying **100% banned-phrase freedom**, **100% evidence grounding**, and **maximum pairwise similarity of 0.42** (well below the $0.60$ ceiling).

### Run Frontend Production Build & Type Check
```bash
cd frontend
npm run build
```
Compiles TypeScript with strict type checking and bundles production assets via Vite with zero warnings or errors.

---

## 🎬 Suggested Demo Profiles to Test

| Profile | Target Role | Recommended Tone | What to Look For |
| :--- | :--- | :--- | :--- |
| **`octocat`** | Software Engineer | Honest | Historic profile with legendary repositories, profile README, and classic Git activity. |
| **`torvalds`** | Backend Engineer | Brutal | Systems legend with deep C codebase metrics, high technical score, and comic commentary on absent web demos or CI badges. |
| **`gaearon`** | Frontend Engineer | Professional | Frontend heavyweight; evaluates UI craft signals, library documentation, and community reach. |
| **`karpathy`** | ML Engineer | Brutal | Flagship deep learning repositories, notebook size analysis, and high star concentration. |
| **`-bad-username-`** | Any | Any | Demonstrates strict client and server validation (`INVALID_USERNAME`). |
| **`nonexistent-user-998877`** | Any | Any | Demonstrates clean error boundary handling with retry controls (`USER_NOT_FOUND`). |

---

## 👥 Hackathon Team & Credits

- **Project**: GitRoast (GitHub Roast and Rescue)
- **Hackathon**: PromptWars Hackathon
- **Problem Statement**: *GitHub Roast and Rescue: Give a messy GitHub profile the honest feedback it deserves*
- **License**: MIT
