import React, { useRef } from 'react';
import {
  BarChart3,
  BrainCircuit,
  Check,
  Code2,
  Layout,
  Server,
} from 'lucide-react';
import type { TargetRole } from '../types';

export interface RoleConfig {
  id: TargetRole;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  borderSelected: string;
  bgIconTile: string;
  textIconTile: string;
  glowClass: string;
  topAccentClass: string;
  badgeClass: string;
  description: string;
  signals: [string, string, string];
}

export const ROLE_CONFIGS: Record<TargetRole, RoleConfig> = {
  software_engineer: {
    id: 'software_engineer',
    label: 'Software Engineer',
    icon: Code2,
    accentColor: '#3B82F6',
    borderSelected: 'border-blue-500/70 ring-1 ring-blue-500/50',
    bgIconTile: 'bg-blue-500/10 border-blue-500/25',
    textIconTile: 'text-blue-400',
    glowClass: 'shadow-[0_0_24px_-4px_rgba(59,130,246,0.18)]',
    topAccentClass: 'bg-blue-500',
    badgeClass: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    description: 'Breadth, original code volume, and multi-language balance.',
    signals: ['Original code ratio', 'Language breadth', 'README depth'],
  },
  frontend_engineer: {
    id: 'frontend_engineer',
    label: 'Frontend Engineer',
    icon: Layout,
    accentColor: '#8B5CF6',
    borderSelected: 'border-purple-500/70 ring-1 ring-purple-500/50',
    bgIconTile: 'bg-purple-500/10 border-purple-500/25',
    textIconTile: 'text-purple-400',
    glowClass: 'shadow-[0_0_24px_-4px_rgba(139,92,246,0.18)]',
    topAccentClass: 'bg-purple-500',
    badgeClass: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    description: 'UI craft, live demo links, component quality, and presentation.',
    signals: ['Live demo links', 'UI framework topics', 'Clean presentation'],
  },
  backend_engineer: {
    id: 'backend_engineer',
    label: 'Backend Engineer',
    icon: Server,
    accentColor: '#10B981',
    borderSelected: 'border-emerald-500/70 ring-1 ring-emerald-500/50',
    bgIconTile: 'bg-emerald-500/10 border-emerald-500/25',
    textIconTile: 'text-emerald-400',
    glowClass: 'shadow-[0_0_24px_-4px_rgba(16,185,129,0.18)]',
    topAccentClass: 'bg-emerald-500',
    badgeClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    description: 'API stack depth, architecture docs, licensing, and stability.',
    signals: ['API stack depth', 'Architecture docs', 'License coverage'],
  },
  ml_engineer: {
    id: 'ml_engineer',
    label: 'ML Engineer',
    icon: BrainCircuit,
    accentColor: '#F59E0B',
    borderSelected: 'border-amber-500/70 ring-1 ring-amber-500/50',
    bgIconTile: 'bg-amber-500/10 border-amber-500/25',
    textIconTile: 'text-amber-400',
    glowClass: 'shadow-[0_0_24px_-4px_rgba(245,158,11,0.18)]',
    topAccentClass: 'bg-amber-500',
    badgeClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    description: 'Machine learning tooling, reproducibility, and repository depth.',
    signals: ['ML library topics', 'Reproducibility docs', 'Flagship repo depth'],
  },
  data_scientist: {
    id: 'data_scientist',
    label: 'Data Scientist',
    icon: BarChart3,
    accentColor: '#06B6D4',
    borderSelected: 'border-cyan-500/70 ring-1 ring-cyan-500/50',
    bgIconTile: 'bg-cyan-500/10 border-cyan-500/25',
    textIconTile: 'text-cyan-400',
    glowClass: 'shadow-[0_0_24px_-4px_rgba(6,182,212,0.18)]',
    topAccentClass: 'bg-cyan-500',
    badgeClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    description: 'Analysis workflows, data storytelling, and commit cadence.',
    signals: ['Analysis workflows', 'Walkthrough docs', 'Commit cadence'],
  },
};

export const ORDERED_ROLES: TargetRole[] = [
  'software_engineer',
  'frontend_engineer',
  'backend_engineer',
  'ml_engineer',
  'data_scientist',
];

interface RoleSelectorProps {
  selectedRole: TargetRole;
  onChange: (role: TargetRole) => void;
  disabled?: boolean;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  selectedRole,
  onChange,
  disabled = false,
}) => {
  const buttonRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (disabled) return;
    let nextIndex = -1;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (index + 1) % ORDERED_ROLES.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (index - 1 + ORDERED_ROLES.length) % ORDERED_ROLES.length;
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(ORDERED_ROLES[index]);
      return;
    }

    if (nextIndex >= 0) {
      onChange(ORDERED_ROLES[nextIndex]);
      buttonRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Target Job Role Selection"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full text-left"
    >
      {ORDERED_ROLES.map((roleId, idx) => {
        const config = ROLE_CONFIGS[roleId];
        const Icon = config.icon;
        const isSelected = selectedRole === roleId;

        return (
          <div
            key={roleId}
            ref={(el) => {
              buttonRefs.current[idx] = el;
            }}
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => !disabled && onChange(roleId)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`group relative rounded-xl p-3.5 sm:p-4 border transition-all duration-200 cursor-pointer select-none flex flex-col justify-between overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:ring-accent ${
              disabled ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5 active:translate-y-0'
            } ${
              isSelected
                ? `bg-surface-elevated/95 ${config.borderSelected} ${config.glowClass}`
                : 'bg-surface/85 border-border hover:border-border-focus/50 hover:bg-surface-elevated/50'
            }`}
          >
            {/* Top Hue Accent Line */}
            <div
              className={`absolute top-0 left-0 right-0 h-1 transition-opacity duration-200 ${
                config.topAccentClass
              } ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}
            />

            <div>
              {/* Header: Icon Tile + Check Badge */}
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                    config.bgIconTile
                  } ${config.textIconTile} ${
                    isSelected ? 'scale-105 shadow-sm' : 'group-hover:scale-102'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {isSelected ? (
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center bg-surface border text-xs shadow-sm"
                    style={{ borderColor: config.accentColor, color: config.accentColor }}
                    aria-label="Selected role"
                  >
                    <Check className="w-3 h-3 stroke-[2.5]" />
                  </span>
                ) : (
                  <span className="w-5 h-5 rounded-full border border-border/60 group-hover:border-border transition-colors" />
                )}
              </div>

              {/* Title & Description */}
              <h3 className="font-bold text-xs sm:text-sm text-text-primary tracking-tight font-sans mb-1">
                {config.label}
              </h3>
              <p className="text-[11px] text-text-secondary leading-snug line-clamp-2">
                {config.description}
              </p>
            </div>

            {/* Verified Signals Chips */}
            <div className="mt-3 pt-2.5 border-t border-border/50">
              <span className="text-[9px] font-mono uppercase tracking-wider text-text-muted block mb-1">
                Scoring Signals:
              </span>
              <div className="flex flex-wrap gap-1">
                {config.signals.map((sig) => (
                  <span
                    key={sig}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg/80 border border-border/70 text-text-muted"
                  >
                    {sig}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
