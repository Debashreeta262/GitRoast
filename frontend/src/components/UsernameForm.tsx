import React, { useState } from 'react';
import { AlertCircle, Flame, Sparkles } from 'lucide-react';
import { Button } from './ui/Button';
import { ROLE_CONFIGS, RoleSelector } from './RoleSelector';
import type { BrutalityLevel, TargetRole } from '../types';

interface UsernameFormProps {
  onSubmit: (username: string, role: TargetRole, brutality: BrutalityLevel) => void;
  isLoading: boolean;
  initialUsername?: string;
  initialRole?: TargetRole;
  initialBrutality?: BrutalityLevel;
}

const GITHUB_USER_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

const BRUTALITIES: { id: BrutalityLevel; label: string; icon: string }[] = [
  { id: 'professional', label: 'Professional', icon: '👔' },
  { id: 'honest', label: 'Honest', icon: '🎯' },
  { id: 'brutal', label: 'Brutal', icon: '🔥' },
];

const QUICK_DEMO_USERS = ['octocat', 'torvalds', 'shadcn', 'antfu'];

export const UsernameForm: React.FC<UsernameFormProps> = ({
  onSubmit,
  isLoading,
  initialUsername = '',
  initialRole = 'software_engineer',
  initialBrutality = 'honest',
}) => {
  const [username, setUsername] = useState(initialUsername);
  const [role, setRole] = useState<TargetRole>(initialRole);
  const [brutality, setBrutality] = useState<BrutalityLevel>(initialBrutality);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleUsernameChange = (val: string) => {
    // Strip leading @ or github.com/ if pasted
    let cleanVal = val.trim();
    if (cleanVal.startsWith('@')) cleanVal = cleanVal.slice(1);
    if (cleanVal.includes('github.com/')) {
      const parts = cleanVal.split('github.com/');
      cleanVal = parts[parts.length - 1].replace(/\/.*$/, '');
    }

    setUsername(cleanVal);

    if (!cleanVal) {
      setValidationError(null);
    } else if (!GITHUB_USER_REGEX.test(cleanVal)) {
      setValidationError('1–39 chars, alphanumeric or single hyphens, no leading/trailing hyphen.');
    } else {
      setValidationError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      setValidationError('Please enter a GitHub username.');
      return;
    }
    if (!GITHUB_USER_REGEX.test(trimmed)) {
      setValidationError('Invalid GitHub username format.');
      return;
    }
    setValidationError(null);
    onSubmit(trimmed, role, brutality);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto space-y-6">
      {/* 1. Visual Role Card Selector */}
      <div className="space-y-2 text-left">
        <div className="flex items-center justify-between px-1">
          <label className="text-xs font-mono font-semibold uppercase tracking-wider text-text-muted">
            1. Target Engineering Role
          </label>
          <span className="text-[11px] font-mono text-text-muted hidden sm:inline">
            Each role calibrates scoring weights & recruiter criteria
          </span>
        </div>
        <RoleSelector selectedRole={role} onChange={setRole} disabled={isLoading} />
      </div>

      {/* 2. Command Bar Input Container */}
      <div className="space-y-2 text-left">
        <label
          htmlFor="github-username-input"
          className="text-xs font-mono font-semibold uppercase tracking-wider text-text-muted px-1 block"
        >
          2. Candidate GitHub Handle & Tone
        </label>
        <div className="bg-surface/90 border border-border focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 rounded-xl p-2 sm:p-2.5 shadow-card transition-all duration-200">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* GitHub Icon + Prefix + Input */}
            <div className="flex items-center flex-1 px-3 py-1.5 bg-bg/80 border border-border/60 rounded-lg">
              <svg
                className="w-4 h-4 text-text-muted flex-shrink-0 fill-current mr-2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>

              <span className="text-xs font-mono text-text-muted select-none hidden xs:inline">
                github.com/
              </span>

              <input
                id="github-username-input"
                type="text"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="username"
                disabled={isLoading}
                className="w-full bg-transparent border-0 py-1.5 px-1 text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-0"
                aria-label="GitHub username"
              />
            </div>

            {/* Submit Action Button */}
            <Button
              type="submit"
              variant={brutality === 'brutal' ? 'roast' : 'primary'}
              size="md"
              isLoading={isLoading}
              disabled={!username.trim()}
              className="flex-shrink-0 whitespace-nowrap h-10 px-5"
            >
              {brutality === 'brutal' ? (
                <>
                  <Flame className="w-4 h-4 mr-1 text-score-warning" /> Roast My GitHub
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-1" /> Analyze Profile
                </>
              )}
            </Button>
          </div>

          {/* Validation Warning */}
          {validationError && (
            <div className="flex items-center gap-1.5 text-xs text-score-danger mt-2 px-2 font-mono">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Bottom Strip: Role Status + Tone Selector */}
          <div className="mt-2.5 pt-2 border-t border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 px-1">
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-text-muted">Target:</span>
              <span className="font-semibold text-text-primary">
                {ROLE_CONFIGS[role].label}
              </span>
            </div>

            {/* Brutality Selector */}
            <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-auto">
              <span className="text-[11px] font-mono text-text-muted uppercase tracking-wider">
                Tone:
              </span>
              <div className="flex gap-1 bg-bg/80 p-0.5 rounded-md border border-border/60">
                {BRUTALITIES.map((b) => {
                  const isSelected = brutality === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      disabled={isLoading}
                      onClick={() => setBrutality(b.id)}
                      className={`text-[11px] font-mono px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
                        isSelected
                          ? b.id === 'brutal'
                            ? 'bg-roast/20 text-roast-light border border-roast/40 font-semibold'
                            : 'bg-accent/20 text-accent-light border border-accent/40 font-semibold'
                          : 'text-text-muted hover:text-text-secondary'
                      }`}
                    >
                      <span>{b.icon}</span>
                      <span>{b.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Demo Pickers */}
      <div className="flex items-center justify-center flex-wrap gap-2 text-xs text-text-muted font-mono pt-1">
        <span className="text-[11px]">Quick try:</span>
        {QUICK_DEMO_USERS.map((u) => (
          <button
            key={u}
            type="button"
            disabled={isLoading}
            onClick={() => handleUsernameChange(u)}
            className="text-[11px] text-text-secondary hover:text-text-primary px-2 py-0.5 rounded bg-surface border border-border/80 hover:border-border-focus transition-colors"
          >
            @{u}
          </button>
        ))}
      </div>
    </form>
  );
};
