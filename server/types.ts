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

export interface GitHubRepoRaw {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  is_fork: boolean;
  updated_at: string | null;
  pushed_at: string | null;
  created_at: string | null;
  homepage: string | null;
  license: string | null;
  topics: string[];
  has_readme: boolean;
  languages: Record<string, number>;
  size_kb: number;
}

export interface GitHubEvent {
  id: string;
  type: string;
  created_at: string;
  repo_name?: string | null;
}

export interface GitHubUserData {
  profile: GitHubUserProfile;
  repos: GitHubRepoRaw[];
  events: GitHubEvent[];
  total_repos_count: number;
  analyzed_repos_count: number;
  cached: boolean;
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

export interface ScoringResult {
  scores: ScoreBreakdown;
  repos: RepoAnalysis[];
  summary_metrics: Record<string, number | string>;
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
  grounding_repos: string[];
  comic_device?: string | null;
}

export interface EvidenceFact {
  id: string;
  description: string;
  supporting_numbers: Record<string, any>;
  repo_names: string[];
  unusualness_score: number;
}

export interface RoastAngle {
  id: string;
  fact_description: string;
  supporting_numbers: Record<string, any>;
  repo_names: string[];
}

export interface AngleSelection {
  angles: RoastAngle[];
  comic_device: string;
  variant: number;
  all_facts: EvidenceFact[];
}

export interface RegenerateRoastResponse {
  roast: string;
  roast_explanation: string;
  grounding_repos: string[];
  comic_device: string | null;
  variant: number;
  ai_available: boolean;
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
