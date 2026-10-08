import React from 'react';
import {
  AlertTriangle,
  Clock,
  FolderX,
  RefreshCw,
  SearchX,
  ShieldAlert,
  WifiOff,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
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
  details,
  onRetry,
  onBack,
}) => {
  const getErrorMeta = (errCode: string) => {
    switch (errCode as ApiErrorCode) {
      case 'USER_NOT_FOUND':
        return {
          icon: SearchX,
          title: "Looks like this GitHub profile doesn't exist.",
          badgeVariant: 'danger' as const,
          badgeLabel: '404 USER NOT FOUND',
          advice: 'Double check the spelling or search for the user directly on github.com.',
          primaryActionText: 'Try Another Username',
          primaryAction: onBack,
          secondaryActionText: 'Retry Search',
          secondaryAction: onRetry,
        };
      case 'INVALID_USERNAME':
        return {
          icon: ShieldAlert,
          title: 'Invalid GitHub Username Format',
          badgeVariant: 'warning' as const,
          badgeLabel: '400 INVALID HANDLE',
          advice: 'GitHub usernames must be 1–39 characters, alphanumeric with single hyphens, without leading or trailing hyphens.',
          primaryActionText: 'Fix Username',
          primaryAction: onBack,
          secondaryActionText: null,
          secondaryAction: null,
        };
      case 'EMPTY_PROFILE':
        return {
          icon: FolderX,
          title: 'No Public Repositories Found',
          badgeVariant: 'accent' as const,
          badgeLabel: 'EMPTY PORTFOLIO',
          advice: 'GitRoast evaluates code quality, commit consistency, and documentation across public repositories. This account has 0 public repos to analyze.',
          primaryActionText: 'Try Another Profile',
          primaryAction: onBack,
          secondaryActionText: null,
          secondaryAction: null,
        };
      case 'RATE_LIMITED':
        return {
          icon: Clock,
          title: "We've hit GitHub's request limit. Please try again shortly.",
          badgeVariant: 'warning' as const,
          badgeLabel: '429 RATE LIMIT',
          advice: details?.reset_at
            ? `GitHub's public rate limit for this IP resets at ${new Date(
                Number(details.reset_at) * 1000
              ).toLocaleTimeString()}. Provide a GITHUB_TOKEN in backend .env to unlock 5,000 req/hr.`
            : 'Public unauthenticated requests are limited by GitHub. You can wait a moment or configure a free GITHUB_TOKEN.',
          primaryActionText: 'Try Again',
          primaryAction: onRetry,
          secondaryActionText: 'Back to Search',
          secondaryAction: onBack,
        };
      case 'UPSTREAM_TIMEOUT':
        return {
          icon: WifiOff,
          title: 'We couldn’t reach GitHub.',
          badgeVariant: 'danger' as const,
          badgeLabel: '504 TIMEOUT',
          advice: 'The connection to GitHub or upstream services timed out. Please check your internet connection and retry.',
          primaryActionText: 'Try Again',
          primaryAction: onRetry,
          secondaryActionText: 'Back to Search',
          secondaryAction: onBack,
        };
      default:
        return {
          icon: AlertTriangle,
          title: 'Analysis Service Encountered an Issue',
          badgeVariant: 'danger' as const,
          badgeLabel: 'SERVICE ERROR',
          advice: 'An unexpected issue occurred while analyzing this account. Please try again or test with another username.',
          primaryActionText: 'Try Again',
          primaryAction: onRetry,
          secondaryActionText: 'Back to Search',
          secondaryAction: onBack,
        };
    }
  };

  const meta = getErrorMeta(code);
  const Icon = meta.icon;

  return (
    <div className="w-full max-w-xl mx-auto py-16 px-4 sm:px-6 text-center" role="alert">
      <Card variant="elevated" padding="lg" className="border-border shadow-2xl bg-surface/95">
        {/* Icon Frame */}
        <div className="w-14 h-14 rounded-xl bg-surface border border-border flex items-center justify-center mx-auto mb-5 text-roast shadow-subtle">
          <Icon className="w-7 h-7" />
        </div>

        {/* Status Badge */}
        <div className="mb-3">
          <Badge variant={meta.badgeVariant} size="sm">
            {meta.badgeLabel}
          </Badge>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-3 font-sans">
          {meta.title}
        </h2>

        {/* Friendly Clean Message */}
        <div className="bg-bg/90 border border-border/80 rounded-lg p-3.5 mb-4 text-xs font-mono text-text-secondary leading-relaxed">
          {message}
        </div>

        {/* Helpful Guidance */}
        <p className="text-xs text-text-muted mb-8 leading-relaxed max-w-md mx-auto">
          {meta.advice}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={meta.primaryAction}
            leftIcon={<RefreshCw className="w-4 h-4" />}
            className="w-full sm:w-auto px-6"
          >
            {meta.primaryActionText}
          </Button>

          {meta.secondaryAction && meta.secondaryActionText && (
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={meta.secondaryAction}
              className="w-full sm:w-auto px-5"
            >
              {meta.secondaryActionText}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};
