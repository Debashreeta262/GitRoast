import React from 'react';
import { cn } from '../../utils/cn';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  badge,
  action,
  className,
}) => {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4', className)}>
      <div className="flex items-center gap-2.5">
        {icon && (
          <div className="w-8 h-8 rounded-md bg-surface-elevated border border-border flex items-center justify-center text-text-primary flex-shrink-0 shadow-sm">
            {icon}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-text-primary tracking-tight font-sans">
              {title}
            </h3>
            {badge && (
              <span className="flex-shrink-0">{badge}</span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-text-secondary mt-0.5 leading-normal">{subtitle}</p>
          )}
        </div>
      </div>

      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
};
