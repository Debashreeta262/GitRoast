import React, { useEffect, useState } from 'react';
import { Bot, CheckCircle2, Code2, Database, Loader2, Sparkles } from 'lucide-react';

interface LoadingScreenProps {
  username: string;
}

const STAGES = [
  { icon: Database, label: 'Connecting to GitHub API & querying user handle', delay: 0 },
  { icon: Code2, label: 'Scanning public repositories, languages & READMEs', delay: 2500 },
  { icon: CheckCircle2, label: 'Executing deterministic multi-signal scoring formulas', delay: 5500 },
  { icon: Bot, label: 'Synthesizing recruiter verdict & crafting evidence-backed roast', delay: 8500 },
];

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ username }) => {
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
    <div className="w-full max-w-xl mx-auto py-16 px-6 text-center">
      {/* Central animated orb */}
      <div className="relative w-24 h-24 mx-auto mb-8 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary to-roast blur-xl opacity-40 animate-pulse" />
        <div className="relative w-20 h-20 rounded-full bg-surface-card border border-surface-border flex items-center justify-center shadow-2xl">
          <Loader2 className="w-9 h-9 text-primary animate-spin" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
        Analyzing <span className="font-mono text-primary">@{username}</span>
      </h2>
      <p className="text-sm text-gray-400 mb-8">
        Inspecting code patterns, repository health, and career readiness...
      </p>

      {/* Progressive Stage Checklist */}
      <div className="bg-surface rounded-2xl p-6 border border-surface-border text-left space-y-4 shadow-xl">
        {STAGES.map((stage, idx) => {
          const isDone = currentStageIndex > idx;
          const isCurrent = currentStageIndex === idx;
          const Icon = stage.icon;

          return (
            <div
              key={stage.label}
              className={`flex items-center gap-3.5 transition-all duration-300 ${
                isDone
                  ? 'text-success'
                  : isCurrent
                  ? 'text-white font-medium scale-[1.01]'
                  : 'text-gray-500 opacity-50'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                  isDone
                    ? 'bg-success/10 text-success'
                    : isCurrent
                    ? 'bg-primary/20 text-primary border border-primary/40'
                    : 'bg-surface-card text-gray-600'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
              </div>
              <span className="text-xs sm:text-sm">{stage.label}</span>
            </div>
          );
        })}
      </div>

      {/* Indeterminate bottom progress bar */}
      <div className="mt-8 w-full bg-surface-card h-1.5 rounded-full overflow-hidden border border-surface-border">
        <div className="h-full bg-gradient-to-r from-primary via-indigo-400 to-roast rounded-full animate-pulse w-3/4 mx-auto" />
      </div>
      <p className="text-xs text-gray-400 mt-3 flex items-center justify-center gap-1">
        <Sparkles className="w-3 h-3 text-indigo-400" />
        Deterministic scoring runs instantly; AI synthesis takes a few seconds.
      </p>
    </div>
  );
};
