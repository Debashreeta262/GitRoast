import React from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'roast' | 'accent' | 'outline';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'sm',
  icon,
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-mono font-medium rounded-full select-none';

  const variants = {
    default: 'bg-surface-elevated text-text-secondary border border-border',
    success: 'bg-score-success/10 text-score-success border border-score-success/30',
    warning: 'bg-score-warning/10 text-score-warning border border-score-warning/30',
    danger: 'bg-score-danger/10 text-score-danger border border-score-danger/30',
    roast: 'bg-roast/10 text-roast border border-roast/30',
    accent: 'bg-accent/10 text-accent-light border border-accent/30',
    outline: 'bg-transparent text-text-muted border border-border',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  return (
    <span className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
