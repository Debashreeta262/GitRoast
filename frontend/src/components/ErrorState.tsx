import React from 'react';
import { AlertCircle, Clock, FolderGit2, RefreshCw, SearchX, ShieldAlert } from 'lucide-react';
import type { ApiErrorCode } from '../types';

interface ErrorStateProps {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  onRetry: () => void;
  onBack: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  code,
  message,
  onRetry,
  onBack,
}) => {
  const getErrorMeta = (errCode: string) => {
    switch (errCode as ApiErrorCode) {
      case 'USER_NOT_FOUND':
        return {
          icon: SearchX,
          title: 'GitHub User Not Found',
          badge: '404 NOT FOUND',
          badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          recommendation: 'Check the spelling of the handle or try searching on github.com directly.',
        };
      case 'INVALID_USERNAME':
        return {
          icon: ShieldAlert,
          title: 'Invalid GitHub Username',
          badge: '400 BAD REQUEST',
          badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          recommendation: 'GitHub usernames must be 1–39 characters, alphanumeric with single hyphens, not starting or ending with a hyphen.',
        };
      case 'EMPTY_PROFILE':
        return {
          icon: FolderGit2,
          title: 'No Public Repositories Found',
          badge: 'EMPTY PROFILE',
          badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          recommendation: 'This account has 0 public repositories. GitRoast requires at least one public repository to evaluate code quality.',
        };
      case 'RATE_LIMITED':
        return {
          icon: Clock,
          title: 'GitHub API Rate Limit Reached',
          badge: '429 RATE LIMITED',
          badgeColor: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
          recommendation: 'Public unauthenticated GitHub requests are capped at 60/hr. Provide a GITHUB_TOKEN in backend .env for 5,000 req/hr.',
        };
      case 'UPSTREAM_TIMEOUT':
        return {
          icon: Clock,
          title: 'Upstream Network Timeout',
          badge: '504 TIMEOUT',
          badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
          recommendation: 'GitHub API or the LLM service took too long to respond. Please check your internet connection and retry.',
        };
      default:
        return {
          icon: AlertCircle,
          title: 'Analysis Error',
          badge: 'SERVER ERROR',
          badgeColor: 'bg-red-500/10 text-red-400 border-red-500/30',
          recommendation: 'An unexpected issue occurred while analyzing this account. Please try again or inspect server logs.',
        };
    }
  };

  const meta = getErrorMeta(code);
  const Icon = meta.icon;

  return (
    <div className="w-full max-w-xl mx-auto py-16 px-6 text-center">
      <div className="bg-surface rounded-2xl p-8 border border-surface-border shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-center mx-auto mb-6 text-roast shadow-inner">
          <Icon className="w-8 h-8" />
        </div>

        <div className={`inline-block px-3 py-1 rounded-full text-xs font-mono font-semibold border mb-3 tracking-wider ${meta.badgeColor}`}>
          {meta.badge}
        </div>

        <h2 className="text-xl font-bold text-white mb-2">{meta.title}</h2>
        <p className="text-sm text-gray-300 mb-4 bg-surface-card/60 rounded-xl p-3 border border-surface-border font-mono text-xs">
          {message}
        </p>
        <p className="text-xs text-gray-400 mb-8">{meta.recommendation}</p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onRetry}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
          <button
            onClick={onBack}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-surface-card hover:bg-surface-border border border-surface-border text-gray-300 text-sm font-medium transition-all"
          >
            Back to Search
          </button>
        </div>
      </div>
    </div>
  );
};
