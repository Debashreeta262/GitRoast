import React from 'react';
import {
  Binary,
  Flame,
  Lock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { UsernameForm } from '../components/UsernameForm';
import type { BrutalityLevel, TargetRole } from '../types';

interface LandingProps {
  onAnalyze: (username: string, role: TargetRole, brutality: BrutalityLevel) => void;
  isLoading: boolean;
}

export const Landing: React.FC<LandingProps> = ({ onAnalyze, isLoading }) => {
  return (
    <div className="min-h-screen flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Top Navbar / Brand */}
      <header className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-roast flex items-center justify-center shadow-lg shadow-primary/20">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5">
              Git<span className="text-roast">Roast</span>
            </h1>
            <span className="text-[10px] font-mono text-gray-400 block -mt-1 tracking-wider uppercase">
              AI Career Coach
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono text-gray-400 bg-surface px-3 py-1.5 rounded-full border border-surface-border">
            <Lock className="w-3.5 h-3.5 text-emerald-400" /> Public Data Only
          </span>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl bg-surface hover:bg-surface-border border border-surface-border text-gray-300 hover:text-white transition-colors"
            title="GitHub"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-indigo-300 text-xs font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Deterministic Scoring + Evidence-Grounded AI Roast</span>
        </div>

        <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-4 max-w-3xl">
          Find out what tech recruiters{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-400 to-roast">
            actually think
          </span>{' '}
          of your GitHub.
        </h2>

        <p className="text-base sm:text-lg text-gray-400 max-w-2xl mb-10 leading-relaxed font-sans">
          Enter any public GitHub profile. Get a mathematical 6-category score breakdown, a witty
          roast backed strictly by evidence, and a prioritized rescue plan for your target role.
        </p>

        {/* Input Form */}
        <UsernameForm onSubmit={onAnalyze} isLoading={isLoading} />

        {/* Value Prop Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 w-full max-w-3xl text-left">
          <div className="bg-surface/60 rounded-xl p-4 border border-surface-border">
            <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold mb-1.5">
              <Binary className="w-4 h-4" /> DETERMINISTIC SCORES
            </div>
            <p className="text-xs text-gray-400 leading-normal">
              Scores are calculated via pure Python formulas. The LLM never hallucinates numbers.
            </p>
          </div>

          <div className="bg-surface/60 rounded-xl p-4 border border-surface-border">
            <div className="flex items-center gap-2 text-roast font-mono text-xs font-bold mb-1.5">
              <Flame className="w-4 h-4" /> EVIDENCE-BASED ROASTS
            </div>
            <p className="text-xs text-gray-400 leading-normal">
              Roasts cite real repository names, missing licenses, stale commits, and repo hygiene.
            </p>
          </div>

          <div className="bg-surface/60 rounded-xl p-4 border border-surface-border">
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold mb-1.5">
              <ShieldCheck className="w-4 h-4" /> RESCUE ROADMAP
            </div>
            <p className="text-xs text-gray-400 leading-normal">
              4-horizon action plan (today, this week, 2 weeks, this month) to get interview-ready.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="pt-8 border-t border-surface-border/50 text-center text-xs text-gray-500 font-mono">
        Built for developers • Public GitHub API • Strictly grounded evidence • No personal attacks
      </footer>
    </div>
  );
};
