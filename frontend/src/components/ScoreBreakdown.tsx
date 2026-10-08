import React from 'react';
import {
  Activity,
  BookOpen,
  Code,
  Eye,
  FileText,
  HelpCircle,
  Layout,
  Sliders,
} from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { ProgressBar } from './ui/ProgressBar';
import { Tooltip } from './ui/Tooltip';
import { SectionHeader } from './ui/SectionHeader';
import { getScoreMeta } from '../utils/score';
import type { CategoryScores } from '../types';

interface ScoreBreakdownProps {
  categories: CategoryScores;
  weights: Record<string, number>;
}

const CATEGORY_META = [
  {
    key: 'technical_strength',
    label: 'Technical Strength',
    icon: Code,
    desc: 'Language diversity, primary stack depth, non-fork originality ratio',
    formula: 'Evaluates non-fork original code volume (30%), language breadth (25%), stack depth (25%), and topic maturity (20%).',
  },
  {
    key: 'project_quality',
    label: 'Project Quality',
    icon: Layout,
    desc: 'Community stars, fork reach, demo deployments, licenses, and maintenance',
    formula: 'Log-scaled star validation (30%), forks (15%), description coverage (15%), open-source licenses (15%), demo links (15%), and fresh commits (10%).',
  },
  {
    key: 'activity_consistency',
    label: 'Activity & Consistency',
    icon: Activity,
    desc: 'Recent push cadence, event type variety across 90-day activity window',
    formula: 'Push events count (40%), PR/issue event diversity (30%), and spread across repositories over 90 days (30%).',
  },
  {
    key: 'documentation',
    label: 'Documentation Discipline',
    icon: BookOpen,
    desc: 'README coverage, descriptive summaries, topics tagging',
    formula: 'README presence across repos (50%), descriptive summaries >25 chars (30%), and topic tagging coverage (20%).',
  },
  {
    key: 'recruiter_appeal',
    label: 'Recruiter Appeal',
    icon: Eye,
    desc: 'Showcase projects, clean naming conventions, demo availability',
    formula: 'Showcase repos scoring ≥65 (35%), clean repo names without scratchpads (25%), working top demo (20%), and bio identity signals (20%).',
  },
  {
    key: 'profile_presentation',
    label: 'Profile Presentation',
    icon: FileText,
    desc: 'Bio, contact info, profile README, developer brand identity',
    formula: 'Bio clarity (20%), name (15%), avatar (10%), location/company (15%), website/blog (15%), and profile README repo (25%).',
  },
];

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({ categories, weights }) => {
  return (
    <Card variant="default" padding="lg" className="h-full flex flex-col justify-between">
      <div>
        <SectionHeader
          icon={<Sliders className="w-4 h-4 text-accent-light" />}
          title="Deterministic Category Breakdown"
          subtitle="Computed algorithmically in code — strictly zero LLM estimation"
          badge={
            <Badge variant="outline" size="sm">
              6 Signals
            </Badge>
          }
        />

        <div className="space-y-4 sm:space-y-5 mt-4">
          {CATEGORY_META.map((meta) => {
            const score = categories[meta.key as keyof CategoryScores] ?? 0;
            const weight = weights[meta.key] ?? 0;
            const Icon = meta.icon;
            const weightPercent = Math.round(weight * 100);
            const scoreMeta = getScoreMeta(score);

            return (
              <div key={meta.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-text-primary">
                    <Icon className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                    <span>{meta.label}</span>
                    <Tooltip content={<div className="font-sans text-xs">{meta.formula}</div>}>
                      <button
                        type="button"
                        className="text-text-muted hover:text-text-secondary focus:outline-none"
                        aria-label={`Formula for ${meta.label}`}
                      >
                        <HelpCircle className="w-3 h-3" />
                      </button>
                    </Tooltip>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-elevated border border-border/80 text-text-muted">
                      {weightPercent}% weight
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono">
                    <span className={`font-bold text-sm tabular-nums ${scoreMeta.textColor}`}>
                      {score}
                    </span>
                    <span className="text-text-muted text-[11px]">/ 100</span>
                  </div>
                </div>

                {/* Unified Accessible Progress Bar */}
                <ProgressBar value={score} max={100} useScoreScale={true} height="md" />

                <p className="text-[11px] text-text-muted leading-tight line-clamp-1">
                  {meta.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
