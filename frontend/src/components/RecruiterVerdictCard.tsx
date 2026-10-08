import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Compass,
  Sparkles,
} from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { SectionHeader } from './ui/SectionHeader';

interface RecruiterVerdictCardProps {
  verdict: string;
  roleFitSummary: string;
  strengths: string[];
  weaknesses: string[];
  careerGaps: string[];
  quickFixes: string[];
}

export const RecruiterVerdictCard: React.FC<RecruiterVerdictCardProps> = ({
  verdict,
  roleFitSummary,
  strengths,
  weaknesses,
  careerGaps,
  quickFixes,
}) => {
  return (
    <div className="space-y-6">
      {/* 30-Second Recruiter Impression Hero */}
      <Card variant="default" padding="lg">
        <SectionHeader
          icon={<Briefcase className="w-4 h-4 text-accent-light" />}
          title="Recruiter in 30 Seconds"
          subtitle="Simulated first-impression from a senior engineering hiring manager"
          badge={
            <Badge variant="accent" size="sm">
              Executive Evaluation
            </Badge>
          }
        />

        <p className="text-base sm:text-lg text-text-primary leading-relaxed font-sans mt-2">
          {verdict}
        </p>

        {roleFitSummary && (
          <div className="mt-4 pt-3.5 border-t border-border/60 flex flex-wrap items-center gap-2 text-xs text-text-secondary font-mono">
            <span className="font-bold text-accent-light uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Role Match:
            </span>
            <span className="text-text-primary">{roleFitSummary}</span>
          </div>
        )}
      </Card>

      {/* Strengths & Weaknesses (Exactly 3 each) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths (✓) */}
        <Card variant="default" padding="lg" className="border-score-success/30 bg-surface">
          <SectionHeader
            icon={<CheckCircle2 className="w-4 h-4 text-score-success" />}
            title="Key Strengths"
            subtitle="Observable signals that build hiring confidence"
            badge={
              <Badge variant="success" size="sm">
                3 Verified
              </Badge>
            }
          />

          <ul className="space-y-3 mt-3">
            {strengths.slice(0, 3).map((s, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 text-xs sm:text-sm text-text-secondary bg-surface-elevated/70 rounded-lg p-3 border border-border/80"
              >
                <span className="text-score-success font-bold font-mono text-sm leading-none mt-0.5">
                  ✓
                </span>
                <span className="leading-snug text-text-primary">{s}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Weaknesses (⚠) */}
        <Card variant="default" padding="lg" className="border-score-danger/30 bg-surface">
          <SectionHeader
            icon={<AlertTriangle className="w-4 h-4 text-score-danger" />}
            title="Identified Deficits"
            subtitle="Patterns that introduce friction or hesitation"
            badge={
              <Badge variant="danger" size="sm">
                3 Flags
              </Badge>
            }
          />

          <ul className="space-y-3 mt-3">
            {weaknesses.slice(0, 3).map((w, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 text-xs sm:text-sm text-text-secondary bg-surface-elevated/70 rounded-lg p-3 border border-border/80"
              >
                <span className="text-score-danger font-bold font-mono text-sm leading-none mt-0.5">
                  ⚠
                </span>
                <span className="leading-snug text-text-primary">{w}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Role Gap Analysis & Exactly 5 Actionable Quick Fixes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Target Role Gaps */}
        <Card variant="default" padding="lg">
          <SectionHeader
            icon={<Compass className="w-4 h-4 text-accent-light" />}
            title="Target Role Gaps"
            subtitle="Discrepancies against industry market expectations"
            badge={
              <Badge variant="outline" size="sm">
                Skill Mapping
              </Badge>
            }
          />

          <div className="space-y-2.5 mt-3">
            {careerGaps.map((gap, idx) => (
              <div
                key={idx}
                className="text-xs sm:text-sm text-text-secondary bg-surface-elevated/50 rounded-lg p-3 border border-border/70 flex items-start gap-2.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-accent-light mt-2 flex-shrink-0" />
                <span className="leading-relaxed">{gap}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Exactly 5 Quick Recommendations (→) */}
        <Card variant="default" padding="lg">
          <SectionHeader
            icon={<ArrowRight className="w-4 h-4 text-score-warning" />}
            title="Recommendations"
            subtitle="Immediate tactical improvements"
            badge={
              <Badge variant="warning" size="sm">
                5 Fixes
              </Badge>
            }
          />

          <div className="space-y-2 mt-3">
            {quickFixes.slice(0, 5).map((fix, idx) => (
              <div
                key={idx}
                className="text-xs sm:text-sm text-text-primary bg-surface-elevated/50 rounded-lg p-2.5 border border-border/70 flex items-start gap-2.5"
              >
                <span className="text-xs font-mono font-bold text-score-warning w-4 flex-shrink-0">
                  {idx + 1}.
                </span>
                <span className="leading-snug">{fix}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
