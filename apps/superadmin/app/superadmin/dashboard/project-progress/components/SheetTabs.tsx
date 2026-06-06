// filepath: project-progress/components/SheetTabs.tsx
// Excel-style bottom sheet tabs for switching between phases

'use client';

import { clsx } from 'clsx';
import { Code2, FlaskConical, Rocket, Activity } from 'lucide-react';
import type { PhaseType } from '@/app/data/roadmap';

interface SheetTab {
  id: PhaseType;
  label: string;
  zhLabel: string;
  icon: React.ElementType;
  color: string;
  activeColor: string;
}

const SHEETS: SheetTab[] = [
  {
    id: 'development',
    label: 'Development',
    zhLabel: '開發',
    icon: Code2,
    color: 'text-emerald-600',
    activeColor: 'bg-emerald-600 text-white',
  },
  {
    id: 'testing',
    label: 'Testing',
    zhLabel: '測試',
    icon: FlaskConical,
    color: 'text-blue-600',
    activeColor: 'bg-blue-600 text-white',
  },
  {
    id: 'deployment',
    label: 'Deployment',
    zhLabel: '部署',
    icon: Rocket,
    color: 'text-purple-600',
    activeColor: 'bg-purple-600 text-white',
  },
  {
    id: 'operations',
    label: 'Operations',
    zhLabel: '運維',
    icon: Activity,
    color: 'text-orange-600',
    activeColor: 'bg-orange-600 text-white',
  },
];

interface SheetTabsProps {
  activePhase: PhaseType;
  onPhaseChange: (phase: PhaseType) => void;
  /** Feature counts per phase for the badge */
  phaseCounts?: Record<PhaseType, number>;
}

export function SheetTabs({ activePhase, onPhaseChange, phaseCounts }: SheetTabsProps) {
  return (
    <div className="flex items-end gap-0 border-t border-border-default bg-bg-secondary/50 rounded-b-lg overflow-x-auto flex-none">
      {SHEETS.map(sheet => {
        const isActive = activePhase === sheet.id;
        const Icon = sheet.icon;
        const count = phaseCounts?.[sheet.id];

        return (
          <button
            key={sheet.id}
            type="button"
            onClick={() => {
              onPhaseChange(sheet.id);
              window.location.hash = sheet.id;
            }}
            className={clsx(
              'relative flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all border-r border-border-default last:border-r-0 whitespace-nowrap',
              isActive
                ? clsx(sheet.activeColor, 'shadow-sm')
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary',
            )}
          >
            <Icon className={clsx('w-4 h-4', isActive ? 'text-current' : sheet.color)} />
            <span>{sheet.zhLabel} {sheet.label}</span>
            {count != null && count > 0 && (
              <span className={clsx(
                'ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-none',
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-bg-tertiary text-text-muted',
              )}>
                {count}
              </span>
            )}
            {/* Active indicator line at top */}
            {isActive && (
              <span className="absolute top-0 left-0 right-0 h-0.5 bg-white/50" />
            )}
          </button>
        );
      })}
      {/* Fill remaining space */}
      <div className="flex-1 min-w-[20px]" />
    </div>
  );
}
