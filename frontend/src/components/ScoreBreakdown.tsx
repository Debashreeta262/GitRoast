import React from 'react';
import { Activity, BookOpen, Code, Eye, FileText, Layout } from 'lucide-react';
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
    desc: 'Language breadth, depth in primary stack, non-fork originality',
  },
  {
    key: 'project_quality',
    label: 'Project Quality',
    icon: Layout,
    desc: 'Star power, demo deployments, licenses, and freshness',
  },
  {
    key: 'activity_consistency',
    label: 'Activity & Consistency',
    icon: Activity,
    desc: 'Recent push cadence, event diversity over 90-day window',
  },
  {
    key: 'documentation',
    label: 'Documentation Discipline',
    icon: BookOpen,
    desc: 'README coverage, descriptive summaries, topics tagging',
  },
  {
    key: 'recruiter_appeal',
    label: 'Recruiter Appeal',
    icon: Eye,
    desc: 'Showcase projects, clean repository naming, demo availability',
  },
  {
    key: 'profile_presentation',
    label: 'Profile Presentation',
    icon: FileText,
    desc: 'Bio, contact info, profile README, clear developer brand',
  },
];

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({ categories, weights }) => {
  const getBarColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-indigo-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="bg-surface rounded-2xl p-6 border border-surface-border shadow-xl">
      <h3 className="text-base font-semibold text-white mb-4 flex items-center justify-between">
        <span>Deterministic Category Breakdown</span>
        <span className="text-xs font-mono text-gray-400 font-normal">Pure Code Analysis</span>
      </h3>

      <div className="space-y-5">
        {CATEGORY_META.map((meta) => {
          const score = categories[meta.key as keyof CategoryScores] ?? 0;
          const weight = weights[meta.key] ?? 0;
          const Icon = meta.icon;
          const weightPercent = Math.round(weight * 100);

          return (
            <div key={meta.key} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-200 flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-gray-400" />
                  {meta.label}
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-card border border-surface-border text-gray-400">
                    {weightPercent}% weight
                  </span>
                </span>
                <span className="font-mono font-bold text-white text-sm">{score}/100</span>
              </div>

              {/* Progress Bar Track */}
              <div className="w-full bg-surface-card h-2 rounded-full overflow-hidden border border-surface-border">
                <div
                  className={`h-full ${getBarColor(score)} rounded-full transition-all duration-1000 ease-out`}
                  style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                />
              </div>

              <p className="text-[11px] text-gray-400 line-clamp-1">{meta.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
