import React from 'react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Compass } from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { SectionHeader } from './ui/SectionHeader';
import type { CategoryScores } from '../types';

interface RadarChartCardProps {
  categories: CategoryScores;
}

export const RadarChartCard: React.FC<RadarChartCardProps> = ({ categories }) => {
  const chartData = [
    { subject: 'Technical', value: categories.technical_strength, fullMark: 100 },
    { subject: 'Quality', value: categories.project_quality, fullMark: 100 },
    { subject: 'Activity', value: categories.activity_consistency, fullMark: 100 },
    { subject: 'Docs', value: categories.documentation, fullMark: 100 },
    { subject: 'Recruiter', value: categories.recruiter_appeal, fullMark: 100 },
    { subject: 'Profile', value: categories.profile_presentation, fullMark: 100 },
  ];

  return (
    <Card variant="default" padding="lg" className="h-full flex flex-col justify-between">
      <div>
        <SectionHeader
          icon={<Compass className="w-4 h-4 text-accent-light" />}
          title="Skill Balance Radar"
          subtitle="Hexagon balance highlights production readiness"
          badge={
            <Badge variant="outline" size="sm">
              6 Axes
            </Badge>
          }
        />

        <div className="w-full h-64 sm:h-72 my-2">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
              <PolarGrid stroke="#1F2A3C" strokeDasharray="3 3" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'monospace' }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fill: '#64748B', fontSize: 9 }}
                stroke="#1F2A3C"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0];
                    return (
                      <div className="bg-surface-elevated border border-border px-3 py-1.5 rounded-md shadow-card font-mono text-xs">
                        <span className="text-text-muted">{data.payload?.subject}: </span>
                        <span className="font-bold text-accent-light">{data.value} / 100</span>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Radar
                name="Score"
                dataKey="value"
                stroke="#4F46E5"
                fill="#4F46E5"
                fillOpacity={0.25}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="text-[11px] font-mono text-text-muted text-center border-t border-border/50 pt-3">
        Balanced symmetry reflects strong cross-discipline execution.
      </p>
    </Card>
  );
};
