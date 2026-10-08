import React from 'react';
import {
  ArrowLeft,
  Briefcase,
  ExternalLink,
  GitBranch,
  Globe,
  Info,
  Loader2,
  MapPin,
  Users,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { RadarChartCard } from '../components/RadarChartCard';
import { RecruiterVerdictCard } from '../components/RecruiterVerdictCard';
import { RepoTable } from '../components/RepoTable';
import { RescuePlan } from '../components/RescuePlan';
import { RoastCard } from '../components/RoastCard';
import { ScoreBreakdown } from '../components/ScoreBreakdown';
import { ScoreRing } from '../components/ui/ScoreRing';
import { ORDERED_ROLES, ROLE_CONFIGS } from '../components/RoleSelector';
import type { AnalyzeResponse, BrutalityLevel, TargetRole } from '../types';

interface DashboardProps {
  data: AnalyzeResponse;
  currentRole: TargetRole;
  currentBrutality: BrutalityLevel;
  onReset: () => void;
  onRetryAi: () => void;
  onBrutalityChange?: (newBrutality: BrutalityLevel) => void;
  isSwitchingBrutality?: boolean;
  onRoleChange?: (newRole: TargetRole) => void;
  isSwitchingRole?: boolean;
  onRegenerateRoast?: () => void;
  isRegeneratingRoast?: boolean;
  roastVariant?: number;
}

function formatRelativeTime(isoString: string): string {
  try {
    const diffSeconds = Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 1000));
    if (diffSeconds < 45) return 'just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return new Date(isoString).toLocaleDateString();
  } catch {
    return 'just now';
  }
}

export const Dashboard: React.FC<DashboardProps> = ({
  data,
  currentRole,
  currentBrutality,
  onReset,
  onRetryAi,
  onBrutalityChange,
  isSwitchingBrutality = false,
  onRoleChange,
  isSwitchingRole = false,
  onRegenerateRoast,
  isRegeneratingRoast = false,
  roastVariant = 0,
}) => {
  const { profile, scores, repos, ai, ai_available, meta } = data;
  const roleConfig = ROLE_CONFIGS[currentRole];
  const RoleIcon = roleConfig.icon;
  const analyzedTimeLabel = formatRelativeTime(meta.analyzed_at);

  return (
    <main className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header / Candidate Profile Bar */}
      <Card variant="default" padding="lg" className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <img
            src={profile.avatar_url || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'}
            alt={profile.name ? `${profile.name}'s avatar` : `${profile.username}'s avatar`}
            className="w-16 h-16 rounded-xl border border-border object-cover bg-surface-elevated flex-shrink-0 shadow-sm"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight font-sans">
                {profile.name || profile.username}
              </h1>
              <a
                href={`https://github.com/${profile.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-accent-light hover:underline inline-flex items-center gap-1"
              >
                @{profile.username} <ExternalLink className="w-3 h-3" />
              </a>
              {profile.has_profile_readme && (
                <Badge variant="success" size="sm">
                  Profile README
                </Badge>
              )}
            </div>

            {profile.bio && (
              <p className="text-xs sm:text-sm text-text-secondary mt-1 max-w-2xl line-clamp-2">
                {profile.bio}
              </p>
            )}

            {/* Quick Meta tags & verified stats */}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-text-muted font-mono">
              <span className="inline-flex items-center gap-1 text-text-secondary bg-surface-elevated px-2 py-0.5 rounded border border-border/80">
                <GitBranch className="w-3 h-3 text-accent-light" />
                <span className="tabular-nums font-semibold text-text-primary">{profile.public_repos}</span> repos
              </span>

              <span className="inline-flex items-center gap-1 text-text-secondary bg-surface-elevated px-2 py-0.5 rounded border border-border/80">
                <Users className="w-3 h-3 text-score-success" />
                <span className="tabular-nums font-semibold text-text-primary">{profile.followers}</span> followers
              </span>

              {profile.company && (
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="w-3 h-3" /> {profile.company}
                </span>
              )}
              {profile.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {profile.location}
                </span>
              )}
              {profile.blog && (
                <a
                  href={profile.blog.startsWith('http') ? profile.blog : `https://${profile.blog}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-accent-light hover:underline"
                >
                  <Globe className="w-3 h-3" /> {profile.blog}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls & Role Badge */}
        <div className="flex flex-wrap items-center gap-3 md:self-center">
          <div className="text-right">
            <span className="text-[10px] font-mono text-text-muted block uppercase tracking-wider">
              Target Role • Analyzed {analyzedTimeLabel}
            </span>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-mono font-semibold mt-0.5 ${roleConfig.badgeClass}`}>
              <RoleIcon className="w-3.5 h-3.5" /> {roleConfig.label}
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onReset}
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            New Analysis
          </Button>
        </div>
      </Card>

      {/* Target Role Switcher & Benchmark Bar */}
      <Card variant="default" padding="md" className="border-border bg-surface-elevated/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent-light flex items-center justify-center flex-shrink-0">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
                  Career Benchmark:
                </span>
                {isSwitchingRole && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-accent">
                    <Loader2 className="w-3 h-3 animate-spin" /> Recalculating scores...
                  </span>
                )}
              </div>
              <div className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <span>Evaluated as:</span>
                <span className="font-bold" style={{ color: roleConfig.accentColor }}>
                  {roleConfig.label}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Role Switcher Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-text-muted mr-1 font-mono hidden sm:inline">Evaluate as:</span>
            {ORDERED_ROLES.map((roleId) => {
              const rConfig = ROLE_CONFIGS[roleId];
              const RIcon = rConfig.icon;
              const isSelected = roleId === currentRole;
              return (
                <button
                  key={roleId}
                  type="button"
                  disabled={isSwitchingRole}
                  onClick={() => onRoleChange?.(roleId)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 select-none ${
                    isSelected
                      ? `${rConfig.badgeClass} font-semibold shadow-sm ring-1 ring-border`
                      : 'bg-surface border border-border text-text-secondary hover:text-text-primary hover:border-border-focus'
                  }`}
                  title={`Re-evaluate candidate profile for ${rConfig.label}`}
                >
                  <RIcon className="w-3.5 h-3.5" />
                  <span>{rConfig.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Hero Overview Grid: Overall Score Ring + Verdict + Roast Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overall Score Hero Card */}
        <Card variant="default" padding="lg" className="flex flex-col items-center justify-center text-center">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-text-muted mb-2">
            Overall Engineering Readiness
          </span>
          <ScoreRing score={scores.overall} size={180} />
          <p className="text-xs text-text-muted mt-3 max-w-xs font-mono">
            Weighted composite score based on {profile.public_repos} public repos and career signals.
          </p>
        </Card>

        {/* AI Roast Highlight Card (spans 2 columns) */}
        <div className="lg:col-span-2">
          {ai ? (
            <RoastCard
              username={profile.username}
              roast={ai.roast}
              explanation={ai.roast_explanation}
              brutality={currentBrutality}
              aiAvailable={ai_available}
              groundingRepos={ai.grounding_repos}
              comicDevice={ai.comic_device}
              onRetryAi={onRetryAi}
              onBrutalityChange={onBrutalityChange}
              isSwitchingBrutality={isSwitchingBrutality}
              onRegenerateRoast={onRegenerateRoast}
              isRegeneratingRoast={isRegeneratingRoast}
              roastVariant={roastVariant}
            />
          ) : (
            <RoastCard
              username={profile.username}
              roast="AI roast is currently unavailable."
              explanation=""
              brutality={currentBrutality}
              aiAvailable={ai_available}
              onRetryAi={onRetryAi}
              onBrutalityChange={onBrutalityChange}
              isSwitchingBrutality={isSwitchingBrutality}
              onRegenerateRoast={onRegenerateRoast}
              isRegeneratingRoast={isRegeneratingRoast}
              roastVariant={roastVariant}
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
      <div className="bg-surface/50 rounded-xl p-3.5 border border-border/70 text-xs text-text-muted flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 font-mono">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-accent flex-shrink-0" />
          <span>{meta.data_notes.join(' • ')}</span>
        </div>
        <span className="text-[11px] text-text-muted">
          Analyzed at: {new Date(meta.analyzed_at).toLocaleTimeString()}
        </span>
      </div>
    </main>
  );
};
