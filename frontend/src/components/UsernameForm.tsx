import React, { useState } from 'react';
import { Flame, ShieldAlert, Sparkles, Terminal, User } from 'lucide-react';
import type { BrutalityLevel, TargetRole } from '../types';

interface UsernameFormProps {
  onSubmit: (username: string, role: TargetRole, brutality: BrutalityLevel) => void;
  isLoading: boolean;
  initialUsername?: string;
  initialRole?: TargetRole;
  initialBrutality?: BrutalityLevel;
}

const GITHUB_USER_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

const ROLES: { id: TargetRole; label: string; desc: string }[] = [
  { id: 'software_engineer', label: 'Software Engineer', desc: 'Balanced generalist profile' },
  { id: 'frontend_engineer', label: 'Frontend Engineer', desc: 'UI, demos & visual polish' },
  { id: 'backend_engineer', label: 'Backend Engineer', desc: 'Architecture, APIs & docs' },
  { id: 'ml_engineer', label: 'ML Engineer', desc: 'Models, Python & reproducibility' },
  { id: 'data_scientist', label: 'Data Scientist', desc: 'Notebooks, data & analytics' },
];

const BRUTALITIES: { id: BrutalityLevel; label: string; desc: string; icon: string }[] = [
  { id: 'professional', label: 'Professional', desc: 'Polished & diplomatic', icon: '👔' },
  { id: 'honest', label: 'Honest', desc: 'Direct & plain-spoken', icon: '🎯' },
  { id: 'brutal', label: 'Brutal', desc: 'Sharply witty & roasted', icon: '🔥' },
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
    setUsername(val);
    if (!val.trim()) {
      setValidationError(null);
    } else if (!GITHUB_USER_REGEX.test(val.trim())) {
      setValidationError('1–39 chars, alphanumeric or single hyphens, cannot start/end with hyphen.');
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
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto space-y-8">
      {/* Username Input Card */}
      <div className="bg-surface rounded-2xl p-6 border border-surface-border shadow-xl backdrop-blur-sm">
        <label htmlFor="username-input" className="block text-sm font-medium text-gray-300 mb-2">
          GitHub Username
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
            <User className="w-5 h-5" />
          </div>
          <input
            id="username-input"
            type="text"
            value={username}
            onChange={(e) => handleUsernameChange(e.target.value)}
            placeholder="e.g. torvalds, octocat..."
            disabled={isLoading}
            className={`w-full pl-12 pr-4 py-3.5 bg-background border ${
              validationError ? 'border-roast' : 'border-surface-border focus:border-primary'
            } rounded-xl text-white placeholder-gray-500 font-mono text-base focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all`}
          />
        </div>

        {validationError && (
          <p className="mt-2 text-xs text-roast flex items-center gap-1.5 font-medium">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            {validationError}
          </p>
        )}

        {/* Quick Demo Pickers */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Terminal className="w-3.5 h-3.5" /> Quick test:
          </span>
          {QUICK_DEMO_USERS.map((u) => (
            <button
              key={u}
              type="button"
              disabled={isLoading}
              onClick={() => handleUsernameChange(u)}
              className="text-xs font-mono px-2.5 py-1 rounded-md bg-surface-card hover:bg-surface-border border border-surface-border text-gray-300 transition-colors"
            >
              @{u}
            </button>
          ))}
        </div>
      </div>

      {/* Target Role Selector */}
      <div className="bg-surface rounded-2xl p-6 border border-surface-border shadow-xl">
        <label className="block text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> Target Engineering Role
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ROLES.map((r) => {
            const isSelected = role === r.id;
            return (
              <button
                key={r.id}
                type="button"
                disabled={isLoading}
                onClick={() => setRole(r.id)}
                className={`p-3.5 rounded-xl text-left border transition-all ${
                  isSelected
                    ? 'bg-primary/10 border-primary shadow-sm text-white'
                    : 'bg-surface-card border-surface-border text-gray-400 hover:text-gray-200 hover:border-gray-700'
                }`}
              >
                <div className="font-semibold text-sm mb-1">{r.label}</div>
                <div className="text-xs text-gray-400 line-clamp-1">{r.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Brutality Selector */}
      <div className="bg-surface rounded-2xl p-6 border border-surface-border shadow-xl">
        <label className="block text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
          <Flame className="w-4 h-4 text-roast" /> Brutality Tone
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {BRUTALITIES.map((b) => {
            const isSelected = brutality === b.id;
            return (
              <button
                key={b.id}
                type="button"
                disabled={isLoading}
                onClick={() => setBrutality(b.id)}
                className={`p-4 rounded-xl text-left border transition-all ${
                  isSelected
                    ? b.id === 'brutal'
                      ? 'bg-roast/10 border-roast text-white shadow-sm'
                      : 'bg-primary/10 border-primary text-white shadow-sm'
                    : 'bg-surface-card border-surface-border text-gray-400 hover:text-gray-200 hover:border-gray-700'
                }`}
              >
                <div className="text-xl mb-1.5">{b.icon}</div>
                <div className="font-semibold text-sm mb-0.5">{b.label}</div>
                <div className="text-xs text-gray-400">{b.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit Action */}
      <button
        type="submit"
        disabled={isLoading || !username.trim()}
        className={`w-full py-4 px-6 rounded-xl font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2.5 shadow-lg ${
          isLoading || !username.trim()
            ? 'bg-surface-border text-gray-500 cursor-not-allowed'
            : brutality === 'brutal'
            ? 'bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white shadow-roast/25 hover:shadow-roast/40'
            : 'bg-primary hover:bg-primary-hover text-white shadow-primary/25 hover:shadow-primary/40'
        }`}
      >
        <Flame className="w-5 h-5" />
        {isLoading ? 'Analyzing Profile...' : brutality === 'brutal' ? 'Roast My GitHub' : 'Analyze Career Profile'}
      </button>
    </form>
  );
};
