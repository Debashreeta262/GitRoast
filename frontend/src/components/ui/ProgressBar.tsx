import React from 'react';
import { cn } from '../../utils/cn';
import { getScoreMeta } from '../../utils/score';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  useScoreScale?: boolean;
  colorClass?: string;
  height?: 'sm' | 'md' | 'lg';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  className,
  value,
  max = 100,
  useScoreScale = true,
  colorClass,
  height = 'md',
  ...props
}) => {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));

  let fillClass = colorClass || 'bg-accent';
  if (useScoreScale && !colorClass) {
    const meta = getScoreMeta(percentage);
    if (meta.tier === 'success') fillClass = 'bg-score-success';
    else if (meta.tier === 'warning') fillClass = 'bg-score-warning';
    else fillClass = 'bg-score-danger';
  }

  const heights = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn(
        'w-full bg-surface-elevated rounded-full overflow-hidden border border-border/80',
        heights[height],
        className
      )}
      {...props}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-700 ease-out', fillClass)}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};
