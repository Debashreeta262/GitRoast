import React from 'react';
import { Flame, Lightbulb, RefreshCw } from 'lucide-react';
import type { BrutalityLevel } from '../types';

interface RoastCardProps {
  roast: string;
  explanation: string;
  brutality: BrutalityLevel;
  aiAvailable: boolean;
  onRetryAi?: () => void;
}

export const RoastCard: React.FC<RoastCardProps> = ({
  roast,
  explanation,
  brutality,
  aiAvailable,
  onRetryAi,
}) => {
  if (!aiAvailable) {
    return (
      <div className="bg-surface rounded-2xl p-6 border border-surface-border shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Flame className="w-4 h-4 text-roast" /> AI Roast & Evaluation
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-surface-card border border-surface-border text-gray-400 font-mono">
            Offline
          </span>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Deterministic scoring succeeded, but the AI roast generator was temporarily unavailable.
        </p>
        {onRetryAi && (
          <button
            onClick={onRetryAi}
            className="px-4 py-2 rounded-xl bg-surface-card hover:bg-surface-border border border-surface-border text-xs text-white font-medium flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry AI Analysis
          </button>
        )}
      </div>
    );
  }

  const isBrutal = brutality === 'brutal';

  return (
    <div
      className={`relative rounded-2xl p-6 sm:p-8 border shadow-2xl overflow-hidden ${
        isBrutal
          ? 'bg-gradient-to-br from-surface via-[#181216] to-[#200e14] border-rose-900/50'
          : 'bg-surface border-surface-border'
      }`}
    >
      {/* Background Accent Glow */}
      <div
        className={`absolute -right-16 -top-16 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
          isBrutal ? 'bg-rose-600/10' : 'bg-indigo-600/10'
        }`}
      />

      {/* Header bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              isBrutal ? 'bg-roast/20 text-roast' : 'bg-primary/20 text-primary'
            }`}
          >
            <Flame className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-white tracking-wide">
            {isBrutal ? 'The Brutal Roast' : 'Career Diagnostic Roast'}
          </h3>
        </div>

        <span
          className={`text-xs font-mono px-3 py-1 rounded-full uppercase tracking-wider font-semibold border ${
            isBrutal
              ? 'bg-roast/10 border-roast/30 text-rose-400'
              : 'bg-primary/10 border-primary/30 text-indigo-400'
          }`}
        >
          {brutality} mode
        </span>
      </div>

      {/* The Roast Quote */}
      <blockquote className="relative my-4 pl-4 border-l-2 border-roast/80 text-lg sm:text-xl font-medium text-white italic tracking-wide">
        "{roast}"
      </blockquote>

      {/* Roast Explanation / Strategic Fix */}
      {explanation && (
        <div className="mt-5 pt-4 border-t border-surface-border/60 bg-surface-card/40 rounded-xl p-4 flex items-start gap-3">
          <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Lightbulb className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 font-mono mb-1">
              What Hiring Managers See & The Fix:
            </h4>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">{explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
};
