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
import type { CategoryScores } from '../types';

interface RadarChartCardProps {
  categories: CategoryScores;
}

export const RadarChartCard: React.FC<RadarChartCardProps> = ({ categories }) => {
  const chartData = [
    { subject: 'Technical', value: categories.technical_strength, fullMark: 100 },
    { subject: 'Quality', value: categories.project_quality, fullMark: 100 },
    { subject: 'Activity', value: categories.activity_consistency, fullMark: 100 },
    { subject: 'Documentation', value: categories.documentation, fullMark: 100 },
    { subject: 'Recruiter', value: categories.recruiter_appeal, fullMark: 100 },
    { subject: 'Presentation', value: categories.profile_presentation, fullMark: 100 },
  ];

  return (
    <div className="bg-surface rounded-2xl p-6 border border-surface-border shadow-xl flex flex-col items-center justify-between">
      <div className="w-full flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold text-white">Skill Radar</h3>
        <span className="text-xs font-mono text-primary font-medium">Multi-Dimensional</span>
      </div>

      <div className="w-full h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
            <PolarGrid stroke="#262f40" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: '#9ca3af', fontSize: 11, fontFamily: 'monospace' }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fill: '#4b5563', fontSize: 9 }}
              stroke="#262f40"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#161b24',
                borderColor: '#212836',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px',
                fontFamily: 'monospace',
              }}
            />
            <Radar
              name="Score"
              dataKey="value"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.4}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-gray-400 text-center mt-2">
        A balanced hexagon represents well-rounded, production-ready engineering habits.
      </p>
    </div>
  );
};
