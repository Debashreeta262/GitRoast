import React from 'react';
import {
  Briefcase,
  CheckCircle2,
  Compass,
  XCircle,
  Zap,
} from 'lucide-react';

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
      {/* 30-Second Recruiter Impression */}
      <div className="bg-surface rounded-2xl p-6 sm:p-7 border border-surface-border shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
            <Briefcase className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-white">30-Second Recruiter Impression</h3>
        </div>
        <p className="text-base sm:text-lg text-gray-200 leading-relaxed font-sans">{verdict}</p>
        {roleFitSummary && (
          <p className="mt-3 text-xs sm:text-sm text-gray-400 border-t border-surface-border/60 pt-3 flex items-center gap-2">
            <span className="font-mono text-primary font-semibold text-xs uppercase tracking-wider">
              Role Match:
            </span>
            {roleFitSummary}
          </p>
        )}
      </div>

      {/* Strengths & Weaknesses Grid (Exactly 3 each) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="bg-surface rounded-2xl p-6 border border-emerald-950/40 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Key Strengths (3)
            </h4>
          </div>

          <ul className="space-y-3">
            {strengths.slice(0, 3).map((s, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-300 bg-surface-card/60 rounded-xl p-3 border border-surface-border/60"
              >
                <span className="text-emerald-400 font-mono font-bold text-xs mt-0.5">
                  #{idx + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Weaknesses */}
        <div className="bg-surface rounded-2xl p-6 border border-rose-950/40 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-md bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Identified Deficits (3)
            </h4>
          </div>

          <ul className="space-y-3">
            {weaknesses.slice(0, 3).map((w, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-300 bg-surface-card/60 rounded-xl p-3 border border-surface-border/60"
              >
                <span className="text-rose-400 font-mono font-bold text-xs mt-0.5">
                  #{idx + 1}
                </span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Role Gap Analysis & 5 Actionable Quick Fixes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Career Gaps */}
        <div className="bg-surface rounded-2xl p-6 border border-surface-border shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-md bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Target Role Gaps
            </h4>
          </div>

          <div className="space-y-2.5">
            {careerGaps.map((gap, idx) => (
              <div
                key={idx}
                className="text-xs sm:text-sm text-gray-300 bg-surface-card/40 rounded-xl p-3 border border-surface-border flex items-start gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                <span>{gap}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Exactly 5 Quick Fixes */}
        <div className="bg-surface rounded-2xl p-6 border border-surface-border shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              High-Impact Quick Fixes (5)
            </h4>
          </div>

          <div className="space-y-2">
            {quickFixes.slice(0, 5).map((fix, idx) => (
              <div
                key={idx}
                className="text-xs sm:text-sm text-gray-200 bg-surface-card/40 rounded-xl p-2.5 border border-surface-border flex items-start gap-2.5"
              >
                <span className="text-xs font-mono font-bold text-amber-400 w-4 flex-shrink-0">
                  {idx + 1}.
                </span>
                <span>{fix}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
