export type TargetRole =
  | 'software_engineer'
  | 'frontend_engineer'
  | 'backend_engineer'
  | 'ml_engineer'
  | 'data_scientist';

export type BrutalityLevel = 'professional' | 'honest' | 'brutal';

export interface GitHubUserProfile {
  username: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string | null;
  hireable: boolean | null;
  has_profile_readme: boolean;
}

export interface CategoryScores {
  technical_strength: number;
  project_quality: number;
  activity_consistency: number;
  documentation: number;
  recruiter_appeal: number;
  profile_presentation: number;
}

export interface ScoreBreakdown {
  overall: number;
  categories: CategoryScores;
  weights: Record<string, number>;
}

export interface RepoAnalysis {
  name: string;
  language: string | null;
  stars: number;
  forks: number;
  updated_at: string | null;
  pushed_at: string | null;
  has_readme: boolean;
  description: string | null;
  homepage: string | null;
  license: string | null;
  topics: string[];
  is_fork: boolean;
  quality_score: number;
  flags: string[];
}

export type RescueHorizon = 'today' | 'this_week' | 'next_2_weeks' | 'this_month';

export interface RescuePlanItem {
  horizon: RescueHorizon;
  tasks: string[];
}

export interface AiAnalysisResult {
  recruiter_verdict: string;
  roast: string;
  roast_explanation: string;
  strengths: string[];
  weaknesses: string[];
  career_gaps: string[];
  quick_fixes: string[];
  rescue_plan: RescuePlanItem[];
  role_fit_summary: string;
}

export interface AnalyzeMeta {
  analyzed_at: string;
  repos_analyzed: number;
  repos_total: number;
  cached: boolean;
  data_notes: string[];
}

export interface AnalyzeResponse {
  profile: GitHubUserProfile;
  scores: ScoreBreakdown;
  repos: RepoAnalysis[];
  ai: AiAnalysisResult | null;
  ai_available: boolean;
  meta: AnalyzeMeta;
}

export type ApiErrorCode =
  | 'INVALID_USERNAME'
  | 'USER_NOT_FOUND'
  | 'RATE_LIMITED'
  | 'EMPTY_PROFILE'
  | 'UPSTREAM_TIMEOUT'
  | 'INTERNAL';

export interface ApiErrorDetail {
  code: ApiErrorCode | string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  error: ApiErrorDetail;
}
