import React, { useState } from 'react';
import { Calendar, CheckSquare, Square } from 'lucide-react';
import type { RescueHorizon, RescuePlanItem } from '../types';

interface RescuePlanProps {
  plan: RescuePlanItem[];
}

const HORIZON_META: Record<
  RescueHorizon,
  { label: string; badge: string; color: string; desc: string }
> = {
  today: {
    label: 'Today',
    badge: 'Immediate Impact',
    color: 'border-rose-500/40 text-rose-400 bg-rose-500/10',
    desc: 'Emergency profile & repo hygiene fixes',
  },
  this_week: {
    label: 'This Week',
    badge: 'Short Term',
    color: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
    desc: 'Documentation overhaul & live demos',
  },
  next_2_weeks: {
    label: 'Next 2 Weeks',
    badge: 'Medium Term',
    color: 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10',
    desc: 'Code quality, test suites & CI/CD automation',
  },
  this_month: {
    label: 'This Month',
    badge: 'Strategic',
    color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
    desc: 'Flagship showcase repo & portfolio consolidation',
  },
};

export const RescuePlan: React.FC<RescuePlanProps> = ({ plan }) => {
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});

  const toggleTask = (taskId: string) => {
    setCompletedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const orderedHorizons: RescueHorizon[] = ['today', 'this_week', 'next_2_weeks', 'this_month'];

  return (
    <div className="bg-surface rounded-2xl p-6 sm:p-8 border border-surface-border shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" /> Prioritized Career Rescue Plan
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Time-bucketed checklist to elevate this profile into the top candidate tier.
          </p>
        </div>

        <span className="text-xs font-mono px-3 py-1 rounded-full bg-surface-card border border-surface-border text-gray-300 self-start sm:self-auto">
          Actionable Roadmap
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {orderedHorizons.map((horizonKey) => {
          const item = plan.find((p) => p.horizon === horizonKey);
          const meta = HORIZON_META[horizonKey];

          return (
            <div
              key={horizonKey}
              className="bg-surface-card/60 rounded-xl p-4 border border-surface-border flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-white font-mono">{meta.label}</span>
                  <span
                    className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${meta.color}`}
                  >
                    {meta.badge}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mb-4">{meta.desc}</p>

                <div className="space-y-2.5">
                  {item && item.tasks.length > 0 ? (
                    item.tasks.map((task, tIdx) => {
                      const taskId = `${horizonKey}-${tIdx}`;
                      const isChecked = !!completedTasks[taskId];

                      return (
                        <div
                          key={tIdx}
                          onClick={() => toggleTask(taskId)}
                          className={`text-xs p-2.5 rounded-lg border cursor-pointer select-none transition-all flex items-start gap-2 ${
                            isChecked
                              ? 'bg-surface/50 border-surface-border text-gray-500 line-through'
                              : 'bg-surface border-surface-border/80 text-gray-200 hover:border-gray-600'
                          }`}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                          )}
                          <span className="leading-snug">{task}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-gray-500 italic py-2">
                      No specific tasks designated for this window.
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
