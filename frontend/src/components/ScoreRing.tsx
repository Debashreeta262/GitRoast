import React, { useEffect, useState } from 'react';

interface ScoreRingProps {
  score: number;
  size?: number;
}

export const ScoreRing: React.FC<ScoreRingProps> = ({ score, size = 180 }) => {
  const [displayScore, setDisplayScore] = useState(0);

  // Animated count-up
  useEffect(() => {
    let start = 0;
    const end = Math.min(100, Math.max(0, score));
    if (end === 0) {
      setDisplayScore(0);
      return;
    }
    const duration = 1000;
    const increment = end / (duration / 20);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayScore(end);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.floor(start));
      }
    }, 20);

    return () => clearInterval(timer);
  }, [score]);

  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getColor = (val: number) => {
    if (val >= 80) return '#10b981'; // emerald
    if (val >= 60) return '#6366f1'; // indigo
    if (val >= 40) return '#f59e0b'; // amber
    return '#f43f5e'; // rose
  };

  const getVerdictLabel = (val: number) => {
    if (val >= 85) return 'Staff Ready';
    if (val >= 70) return 'Market Competitive';
    if (val >= 50) return 'Needs Work';
    return 'Critical Deficits';
  };

  const color = getColor(score);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#1c2331"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Inner Score Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-5xl font-extrabold font-mono tracking-tight text-white">
            {displayScore}
          </span>
          <span className="text-xs font-mono text-gray-400 mt-0.5">/ 100</span>
        </div>
      </div>

      <div
        className="mt-3 px-3 py-1 rounded-full text-xs font-mono font-semibold tracking-wide uppercase border"
        style={{
          color: color,
          borderColor: `${color}40`,
          backgroundColor: `${color}15`,
        }}
      >
        {getVerdictLabel(score)}
      </div>
    </div>
  );
};
