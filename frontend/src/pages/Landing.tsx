import React from 'react';
import {
  Briefcase,
  CheckCircle2,
  Compass,
  Database,
  Flame,
  Rocket,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { UsernameForm } from '../components/UsernameForm';
import type { BrutalityLevel, TargetRole } from '../types';

interface LandingProps {
  onAnalyze: (username: string, role: TargetRole, brutality: BrutalityLevel) => void;
  isLoading: boolean;
}

export const Landing: React.FC<LandingProps> = ({ onAnalyze, isLoading }) => {
  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-hidden bg-bg">
      {/* Ambient background glow & developer dot grid */}
      <div className="absolute inset-0 bg-dot-grid opacity-35 pointer-events-none" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-accent/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-elevated border border-border flex items-center justify-center shadow-subtle text-roast">
            <Flame className="w-5 h-5 fill-roast/20" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-extrabold text-lg tracking-tight text-white font-mono">
              Git<span className="text-roast">Roast</span>
            </span>
            <span className="hidden sm:inline text-xs font-mono text-text-muted">
              v1.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" size="sm" className="hidden sm:inline-flex" icon={<Database className="w-3 h-3 text-score-success" />}>
            Public GitHub Data Only
          </Badge>

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-surface border border-border text-text-secondary hover:text-white hover:border-border-focus/70 transition-colors"
            title="GitHub"
            aria-label="GitHub"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 py-8 sm:py-12 max-w-5xl mx-auto w-full">
        {/* Tagline Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-elevated border border-border text-xs font-mono text-text-secondary mb-6 shadow-subtle">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span>Your GitHub. No mercy. Better career.</span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-6xl font-black text-text-primary tracking-tight max-w-3xl leading-[1.1] mb-5">
          Your GitHub has{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-indigo-300 to-roast">
            something to say.
          </span>
        </h1>

        {/* Hero Subtext */}
        <p className="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed font-sans">
          Get the recruiter perspective, the honest roast, and a personalized roadmap to level up
          your developer profile.
        </p>

        {/* Central Input Component */}
        <UsernameForm onSubmit={onAnalyze} isLoading={isLoading} />

        {/* 3 Value Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16 w-full text-left">
          {/* Card 1: Recruiter View */}
          <Card variant="interactive" padding="md" className="group">
            <div className="w-8 h-8 rounded-md bg-accent/10 border border-accent/20 text-accent-light flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Briefcase className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-text-primary mb-1 font-sans flex items-center gap-1.5">
              <span>Recruiter View</span>
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              See what a recruiter notices in 30 seconds. Exactly 3 strengths, 3 weaknesses, and role-fit gaps.
            </p>
          </Card>

          {/* Card 2: AI Roast */}
          <Card variant="interactive" padding="md" className="group">
            <div className="w-8 h-8 rounded-md bg-roast/10 border border-roast/20 text-roast flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Flame className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-text-primary mb-1 font-sans flex items-center gap-1.5">
              <span>AI Roast</span>
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Honest feedback without the cruelty. Every roast is grounded in observable code evidence and reveals the fix.
            </p>
          </Card>

          {/* Card 3: Rescue Plan */}
          <Card variant="interactive" padding="md" className="group">
            <div className="w-8 h-8 rounded-md bg-score-success/10 border border-score-success/20 text-score-success flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Rocket className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-text-primary mb-1 font-sans flex items-center gap-1.5">
              <span>Rescue Plan</span>
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Know exactly what to fix next across 4 clear horizons: today, this week, next 2 weeks, and this month.
            </p>
          </Card>
        </div>

        {/* "How it differs from generic AI feedback" strip */}
        <div className="mt-12 w-full p-4 rounded-xl bg-surface/50 border border-border/70 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-center justify-around gap-3 text-xs text-text-secondary font-mono">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-score-success flex-shrink-0" />
              <span>Scored by deterministic metrics, not vibes</span>
            </div>
            <div className="hidden sm:block text-border">•</div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-accent-light flex-shrink-0" />
              <span>Grounded only in your public GitHub data</span>
            </div>
            <div className="hidden sm:block text-border">•</div>
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-score-warning flex-shrink-0" />
              <span>Prioritized, actionable fixes for your role</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-6 text-center border-t border-border/40 text-xs text-text-muted font-mono">
        <p>Powered by public GitHub data + AI • No secrets stored • WCAG AA compliant</p>
      </footer>
    </div>
  );
};
