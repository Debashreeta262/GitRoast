import React from 'react';
import {
  ArrowLeft,
  Briefcase,
  ExternalLink,
  Globe,
  Info,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { RadarChartCard } from '../components/RadarChartCard';
import { RecruiterVerdictCard } from '../components/RecruiterVerdictCard';
import { RepoTable } from '../components/RepoTable';
import { RescuePlan } from '../components/RescuePlan';
import { RoastCard } from '../components/RoastCard';
import { ScoreBreakdown } from '../components/ScoreBreakdown';
import { ScoreRing } from '../components/ScoreRing';
import type { AnalyzeResponse, BrutalityLevel, TargetRole } from '../types';

interface DashboardProps {
  data: AnalyzeResponse;
  currentRole: TargetRole;
  currentBrutality: BrutalityLevel;
  onReset: () => void;
  onRetryAi: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  data,
  currentRole,
  currentBrutality,
  onReset,
  onRetryAi,
}) => {
  const { profile, scores, repos, ai, ai_available, meta } = data;

  const roleTitle = currentRole.replace('_', ' ').toUpperCase();

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header / Candidate Profile Bar */}
      <header className="bg-surface rounded-2xl p-6 border border-surface-border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={profile.avatar_url || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'}
            alt={profile.username}
            className="w-16 h-16 rounded-2xl border-2 border-surface-border object-cover bg-surface-card"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-white">{profile.name || profile.username}</h2>
              <a
                href={`https://github.com/${profile.username}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1"
              >
                @{profile.username} <ExternalLink className="w-3 h-3" />
              </a>
              {profile.has_profile_readme && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Profile README
                </span>
              )}
            </div>

            {profile.bio && (
              <p className="text-xs text-gray-300 mt-1 max-w-xl line-clamp-2">{profile.bio}</p>
            )}

            {/* Quick Meta tags */}
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400 font-mono">
              {profile.company && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3" /> {profile.company}
                </span>
              )}
              {profile.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {profile.location}
                </span>
              )}
              {profile.blog && (
                <a
                  href={profile.blog.startsWith('http') ? profile.blog : `https://${profile.blog}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <Globe className="w-3 h-3" /> {profile.blog}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls & Role Badge */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] font-mono text-gray-400 block uppercase">Evaluation Target</span>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-card border border-surface-border text-xs font-mono font-semibold text-white">
              <Sparkles className="w-3 h-3 text-primary" /> {roleTitle}
            </div>
          </div>

          <button
            onClick={onReset}
            className="px-4 py-2.5 rounded-xl bg-surface-card hover:bg-surface-border border border-surface-border text-xs font-medium text-gray-200 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> New Analysis
          </button>
        </div>
      </header>

      {/* Hero Overview Grid: Overall Score Ring + Verdict + Roast Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overall Score Hero Card */}
        <div className="bg-surface rounded-2xl p-6 border border-surface-border shadow-xl flex flex-col items-center justify-center text-center">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Overall Engineering Readiness
          </span>
          <ScoreRing score={scores.overall} size={180} />
          <p className="text-xs text-gray-400 mt-4 max-w-xs">
            Weighted composite score based on {profile.public_repos} public repos and career signals.
          </p>
        </div>

        {/* AI Roast Highlight Card (spans 2 columns) */}
        <div className="lg:col-span-2">
          {ai ? (
            <RoastCard
              roast={ai.roast}
              explanation={ai.roast_explanation}
              brutality={currentBrutality}
              aiAvailable={ai_available}
              onRetryAi={onRetryAi}
            />
          ) : (
            <RoastCard
              roast="AI roast is currently unavailable."
              explanation=""
              brutality={currentBrutality}
              aiAvailable={ai_available}
              onRetryAi={onRetryAi}
            />
          )}
        </div>
      </div>

      {/* Recruiter Impression & Verdict */}
      {ai && (
        <RecruiterVerdictCard
          verdict={ai.recruiter_verdict}
          roleFitSummary={ai.role_fit_summary}
          strengths={ai.strengths}
          weaknesses={ai.weaknesses}
          careerGaps={ai.career_gaps}
          quickFixes={ai.quick_fixes}
        />
      )}

      {/* Score Analytics: Progress Bars & Radar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ScoreBreakdown categories={scores.categories} weights={scores.weights} />
        </div>
        <div>
          <RadarChartCard categories={scores.categories} />
        </div>
      </div>

      {/* Career Rescue Plan */}
      {ai && <RescuePlan plan={ai.rescue_plan} />}

      {/* Repository Quality Audit Table */}
      <RepoTable repos={repos} username={profile.username} />

      {/* Audit Meta & Footnote */}
      <div className="bg-surface/50 rounded-xl p-4 border border-surface-border/60 text-xs text-gray-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-primary flex-shrink-0" />
          <span>{meta.data_notes.join(' • ')}</span>
        </div>
        <span className="text-[11px] text-gray-500">
          Analyzed at: {new Date(meta.analyzed_at).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};
