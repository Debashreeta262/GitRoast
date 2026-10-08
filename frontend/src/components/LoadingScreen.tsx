import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Code2,
  Database,
  Flame,
  LayoutGrid,
  Loader2,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Skeleton } from './ui/Skeleton';

interface LoadingScreenProps {
  username: string;
  onCancel?: () => void;
}

const STAGES = [
  { icon: Database, label: 'Fetching profile metadata & activity window', delay: 0 },
  { icon: Code2, label: 'Scanning public repositories & README presence', delay: 2000 },
  { icon: BrainCircuit, label: 'Calculating deterministic engineering scores', delay: 4200 },
  { icon: LayoutGrid, label: 'Evaluating recruiter appeal & code hygiene', delay: 6500 },
  { icon: Flame, label: 'Generating evidence-grounded AI roast & diagnosis', delay: 9000 },
  { icon: Bot, label: 'Constructing prioritized 4-horizon rescue plan', delay: 11500 },
];

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ username, onCancel }) => {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  useEffect(() => {
    const timers = STAGES.map((stage, idx) => {
      if (idx === 0) return null;
      return setTimeout(() => {
        setCurrentStageIndex((prev) => Math.max(prev, idx));
      }, stage.delay);
    });

    return () => {
      timers.forEach((t) => t && clearTimeout(t));
    };
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4 sm:px-6 relative min-h-[85vh] flex flex-col justify-between">
      {/* Top Banner / Progress Modal */}
      <div className="relative z-20 w-full max-w-xl mx-auto mb-10">
        <Card variant="elevated" padding="lg" className="border-border shadow-2xl backdrop-blur-md bg-surface/95 text-center">
          {/* Pulsing indicator orb */}
          <div className="relative w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-accent/20 blur-xl animate-pulse" />
            <div className="relative w-14 h-14 rounded-full bg-surface-elevated border border-border flex items-center justify-center shadow-subtle">
              <Loader2 className="w-6 h-6 text-accent animate-spin" />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-1">
            <h2 className="text-xl sm:text-2xl font-black text-text-primary">
              Analyzing <span className="font-mono text-accent-light">@{username}</span>
            </h2>
          </div>
          <p className="text-xs text-text-secondary mb-6 font-mono">
            Deterministic code audits run in code; AI synthesis is grounded in your public repos.
          </p>

          {/* Progressive Stage Checklist */}
          <div
            role="status"
            aria-live="polite"
            className="space-y-2.5 text-left bg-bg/80 rounded-xl p-4 border border-border/70 mb-5"
          >
            {STAGES.map((stage, idx) => {
              const isDone = currentStageIndex > idx;
              const isCurrent = currentStageIndex === idx;
              const Icon = stage.icon;

              return (
                <div
                  key={stage.label}
                  className={`flex items-center gap-3 transition-all duration-300 ${
                    isDone
                      ? 'text-score-success opacity-90'
                      : isCurrent
                      ? 'text-text-primary font-medium'
                      : 'text-text-muted opacity-40'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-xs transition-colors ${
                      isDone
                        ? 'bg-score-success/10 text-score-success border border-score-success/30'
                        : isCurrent
                        ? 'bg-accent/20 text-accent-light border border-accent/40 shadow-sm'
                        : 'bg-surface-elevated text-text-muted border border-border/40'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : isCurrent ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-light" />
                    ) : (
                      <Icon className="w-3 h-3" />
                    )}
                  </div>
                  <span className="text-xs font-sans tracking-normal">{stage.label}</span>
                </div>
              );
            })}
          </div>

          {/* Indeterminate bottom progress line */}
          <div className="w-full bg-surface-elevated h-1 rounded-full overflow-hidden border border-border/60 mb-4">
            <div className="h-full bg-gradient-to-r from-accent via-indigo-400 to-roast rounded-full animate-pulse w-4/5 mx-auto" />
          </div>

          {/* Cancel button */}
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              className="text-xs text-text-muted hover:text-text-primary"
            >
              Cancel & Back to Search
            </Button>
          )}
        </Card>
      </div>

      {/* Realistic Dashboard Skeleton in the background to prevent layout shift */}
      <div className="w-full space-y-6 opacity-35 pointer-events-none select-none filter blur-[0.5px]">
        {/* Header Skeleton */}
        <Card variant="default" padding="md" className="flex items-center gap-4">
          <Skeleton width={56} height={56} rounded="md" />
          <div className="space-y-2 flex-1">
            <Skeleton width="30%" height={20} />
            <Skeleton width="50%" height={14} />
          </div>
          <Skeleton width={120} height={36} rounded="md" />
        </Card>

        {/* Hero Score + Roast Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card variant="default" padding="lg" className="flex flex-col items-center justify-center">
            <Skeleton width={150} height={150} rounded="full" className="mb-4" />
            <Skeleton width={100} height={20} />
          </Card>
          <Card variant="default" padding="lg" className="lg:col-span-2 space-y-4">
            <Skeleton width="40%" height={24} />
            <Skeleton width="90%" height={20} />
            <Skeleton width="75%" height={20} />
            <Skeleton width="60%" height={40} rounded="md" />
          </Card>
        </div>

        {/* Score Breakdown + Radar Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card variant="default" padding="md" className="lg:col-span-2 space-y-4">
            <Skeleton width="35%" height={18} />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton width="100%" height={12} />
                <Skeleton width="100%" height={8} rounded="full" />
              </div>
            ))}
          </Card>
          <Card variant="default" padding="md" className="flex items-center justify-center">
            <Skeleton width={200} height={200} rounded="full" />
          </Card>
        </div>
      </div>
    </div>
  );
};
