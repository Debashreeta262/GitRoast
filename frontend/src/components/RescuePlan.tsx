import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  ListTodo,
  Sparkles,
  Square,
  Trophy,
} from 'lucide-react';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { ProgressBar } from './ui/ProgressBar';
import { SectionHeader } from './ui/SectionHeader';
import type { RescueHorizon, RescuePlanItem } from '../types';

interface RescuePlanProps {
  plan: RescuePlanItem[];
}

interface HorizonConfig {
  label: string;
  sublabel: string;
  badge: string;
  priorityBadge: {
    label: string;
    variant: 'danger' | 'warning' | 'accent' | 'success';
  };
  icon: React.ReactNode;
  lineColor: string;
  markerColor: string;
}

const HORIZON_CONFIG: Record<RescueHorizon, HorizonConfig> = {
  today: {
    label: 'Today',
    sublabel: 'Immediate triage to eliminate critical red flags',
    badge: 'Immediate Impact',
    priorityBadge: { label: 'Critical Priority', variant: 'danger' },
    icon: <Flame className="w-4 h-4 text-score-danger" />,
    lineColor: 'border-score-danger/30',
    markerColor: 'bg-score-danger/10 text-score-danger border-score-danger/30',
  },
  this_week: {
    label: 'This Week',
    sublabel: 'Documentation overhaul, live demos, and hygiene fixes',
    badge: 'Short Term',
    priorityBadge: { label: 'High Priority', variant: 'warning' },
    icon: <Clock className="w-4 h-4 text-score-warning" />,
    lineColor: 'border-score-warning/30',
    markerColor: 'bg-score-warning/10 text-score-warning border-score-warning/30',
  },
  next_2_weeks: {
    label: 'Next 2 Weeks',
    sublabel: 'Test coverage, CI/CD automation, and architecture polish',
    badge: 'Medium Term',
    priorityBadge: { label: 'Medium Priority', variant: 'accent' },
    icon: <Calendar className="w-4 h-4 text-accent-light" />,
    lineColor: 'border-accent/30',
    markerColor: 'bg-accent/10 text-accent-light border-accent/30',
  },
  this_month: {
    label: 'This Month',
    sublabel: 'Flagship showcase repo and portfolio consolidation',
    badge: 'Strategic Growth',
    priorityBadge: { label: 'Strategic', variant: 'success' },
    icon: <Sparkles className="w-4 h-4 text-score-success" />,
    lineColor: 'border-score-success/30',
    markerColor: 'bg-score-success/10 text-score-success border-score-success/30',
  },
};

const ORDERED_HORIZONS: RescueHorizon[] = ['today', 'this_week', 'next_2_weeks', 'this_month'];

export const RescuePlan: React.FC<RescuePlanProps> = ({ plan }) => {
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});

  const toggleTask = (taskId: string) => {
    setCompletedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  // Compute total tasks and completed tasks
  const { totalTasks, completedCount, completionPercentage } = useMemo(() => {
    let total = 0;
    ORDERED_HORIZONS.forEach((h) => {
      const item = plan.find((p) => p.horizon === h);
      if (item) total += item.tasks.length;
    });

    let completed = 0;
    Object.values(completedTasks).forEach((isDone) => {
      if (isDone) completed += 1;
    });

    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      totalTasks: total,
      completedCount: completed,
      completionPercentage: pct,
    };
  }, [plan, completedTasks]);

  return (
    <Card variant="default" padding="lg" className="border-border">
      {/* Header and Progress Overview */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-border/70">
        <div>
          <SectionHeader
            icon={<ListTodo className="w-4 h-4 text-accent-light" />}
            title="Prioritized Career Rescue Plan"
            subtitle="Sequential milestones to eliminate recruiter friction and maximize interview callbacks."
            badge={
              <Badge variant="accent" size="sm" className="font-mono">
                {completedCount}/{totalTasks} Completed
              </Badge>
            }
          />
        </div>

        {/* Progress Tracker Card */}
        <div className="bg-bg/80 border border-border/80 rounded-xl p-3 sm:p-4 min-w-[260px] flex flex-col justify-center">
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <span className="text-text-muted">Rescue Progress</span>
            <span
              className={`font-bold ${
                completionPercentage === 100
                  ? 'text-score-success'
                  : 'text-text-primary'
              }`}
            >
              {completionPercentage}%
            </span>
          </div>

          <ProgressBar
            value={completionPercentage}
            height="md"
            useScoreScale={false}
            colorClass={
              completionPercentage === 100
                ? 'bg-score-success'
                : completionPercentage >= 50
                ? 'bg-accent'
                : 'bg-score-warning'
            }
          />

          {completionPercentage === 100 && (
            <div className="flex items-center gap-1.5 text-xs text-score-success font-mono font-medium mt-2 pt-1.5 border-t border-border/40">
              <Trophy className="w-3.5 h-3.5" />
              <span>All action items completed!</span>
            </div>
          )}
        </div>
      </div>

      {/* Vertical Milestone Timeline */}
      <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-2.5 sm:before:left-3.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-border/80">
        {ORDERED_HORIZONS.map((horizonKey, stepIdx) => {
          const item = plan.find((p) => p.horizon === horizonKey);
          const config = HORIZON_CONFIG[horizonKey];
          const tasks = item ? item.tasks : [];

          // Check if all tasks in this horizon are completed
          const allHorizonTasksDone =
            tasks.length > 0 &&
            tasks.every((_, tIdx) => !!completedTasks[`${horizonKey}-${tIdx}`]);

          return (
            <div key={horizonKey} className="relative group">
              {/* Timeline Marker Node */}
              <div
                className={`absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full border flex items-center justify-center font-mono text-xs font-bold transition-all ${
                  allHorizonTasksDone
                    ? 'bg-score-success text-bg border-score-success shadow-glow'
                    : config.markerColor
                }`}
              >
                {allHorizonTasksDone ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <span>{stepIdx + 1}</span>
                )}
              </div>

              {/* Milestone Content Container */}
              <div className="bg-surface-elevated/40 border border-border/70 rounded-xl p-4 sm:p-5 transition-colors hover:border-border">
                {/* Milestone Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-sm sm:text-base text-text-primary font-mono tracking-tight">
                      {config.label}
                    </span>
                    <Badge variant={config.priorityBadge.variant} size="sm">
                      {config.priorityBadge.label}
                    </Badge>
                  </div>

                  <span className="text-[11px] font-mono text-text-muted self-start sm:self-auto">
                    {config.badge}
                  </span>
                </div>

                <p className="text-xs text-text-secondary mb-4 leading-relaxed font-sans">
                  {config.sublabel}
                </p>

                {/* Milestone Tasks Checklist */}
                {tasks.length > 0 ? (
                  <div className="space-y-2">
                    {tasks.map((task, tIdx) => {
                      const taskId = `${horizonKey}-${tIdx}`;
                      const isChecked = !!completedTasks[taskId];

                      return (
                        <div
                          key={tIdx}
                          onClick={() => toggleTask(taskId)}
                          role="checkbox"
                          aria-checked={isChecked}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              toggleTask(taskId);
                            }
                          }}
                          className={`p-3 rounded-lg border cursor-pointer select-none transition-all flex items-start gap-3 text-xs sm:text-sm ${
                            isChecked
                              ? 'bg-bg/40 border-border/50 text-text-muted line-through opacity-75'
                              : 'bg-surface border-border hover:border-border-focus text-text-primary hover:shadow-subtle'
                          }`}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {isChecked ? (
                              <CheckCircle2 className="w-4 h-4 text-score-success" />
                            ) : (
                              <Square className="w-4 h-4 text-text-muted hover:text-text-primary transition-colors" />
                            )}
                          </div>
                          <span className="leading-relaxed font-sans flex-1">
                            {task}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-text-muted italic py-2 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>No priority flags detected for this time bucket.</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
