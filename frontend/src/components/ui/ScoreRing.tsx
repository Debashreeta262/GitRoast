import React, { useEffect, useState } from 'react';
import { cn } from '../../utils/cn';
import { getScoreMeta } from '../../utils/score';

export interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  className?: string;
}

export const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  size = 180,
  strokeWidth = 12,
  showLabel = true,
  className,
}) => {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let current = 0;
    const target = Math.min(100, Math.max(0, Math.round(score)));
    if (target === 0) {
      setDisplayScore(0);
      return;
    }

    const duration = 900;
    const stepTime = 18;
    const increment = target / (duration / stepTime);

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setDisplayScore(target);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.floor(current));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [score]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const meta = getScoreMeta(score);

  return (
    <div
      role="meter"
      aria-label="Overall Engineering Readiness Score"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('flex flex-col items-center justify-center', className)}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#1F2A3C"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={meta.hex}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Numbers */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-5xl font-black font-mono tracking-tight text-white tabular-nums">
            {displayScore}
          </span>
          <span className="text-[11px] font-mono text-text-muted uppercase tracking-wider mt-0.5">
            out of 100
          </span>
        </div>
      </div>

      {showLabel && (
        <div
          className={cn(
            'mt-3.5 px-3 py-1 rounded-full text-xs font-mono font-semibold tracking-wide border select-none',
            meta.badgeClass
          )}
        >
          {meta.label}
        </div>
      )}
    </div>
  );
};
