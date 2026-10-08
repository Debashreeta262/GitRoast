export type ScoreTier = 'danger' | 'warning' | 'success';

export interface ScoreMeta {
  tier: ScoreTier;
  hex: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  label: string;
  badgeClass: string;
}

export function getScoreMeta(score: number): ScoreMeta {
  const normalized = Math.max(0, Math.min(100, Math.round(score)));

  if (normalized >= 70) {
    return {
      tier: 'success',
      hex: '#10B981',
      textColor: 'text-score-success',
      bgColor: 'bg-score-success/10',
      borderColor: 'border-score-success/30',
      label: 'Staff Ready',
      badgeClass: 'text-score-success bg-score-success/10 border-score-success/30',
    };
  }

  if (normalized >= 40) {
    return {
      tier: 'warning',
      hex: '#F59E0B',
      textColor: 'text-score-warning',
      bgColor: 'bg-score-warning/10',
      borderColor: 'border-score-warning/30',
      label: 'Market Competitive',
      badgeClass: 'text-score-warning bg-score-warning/10 border-score-warning/30',
    };
  }

  return {
    tier: 'danger',
    hex: '#EF4444',
    textColor: 'text-score-danger',
    bgColor: 'bg-score-danger/10',
    borderColor: 'border-score-danger/30',
    label: 'Critical Deficits',
    badgeClass: 'text-score-danger bg-score-danger/10 border-score-danger/30',
  };
}
