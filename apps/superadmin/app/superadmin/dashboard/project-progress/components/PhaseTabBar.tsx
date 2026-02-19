// filepath: apps/superadmin/app/superadmin/dashboard/project-progress/components/PhaseTabBar.tsx
// created: 2026-02-19 | creator: Claude Opus 4.6

'use client';

import { Code2, TestTube2, Rocket, Radio } from 'lucide-react';
import type { PhaseType } from '@/app/data/roadmap';

const PHASE_TABS: {
  id: PhaseType;
  label: string;
  icon: React.ElementType;
}[] = [
  { id: 'development', label: '開發 Development', icon: Code2 },
  { id: 'testing', label: '測試 Testing', icon: TestTube2 },
  { id: 'deployment', label: '部署 Deployment', icon: Rocket },
  { id: 'operations', label: '運維 Operations', icon: Radio },
];

interface PhaseTabBarProps {
  activePhase: PhaseType;
  onPhaseChange: (phase: PhaseType) => void;
}

export const PhaseTabBar = ({ activePhase, onPhaseChange }: PhaseTabBarProps) => {
  const handleClick = (tabId: PhaseType) => {
    onPhaseChange(tabId);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${tabId}`);
    }
  };

  return (
    <div className="flex gap-2 overflow-x-auto shrink-0 pb-1">
      {PHASE_TABS.map(tab => {
        const Icon = tab.icon;
        const isActive = activePhase === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleClick(tab.id)}
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              isActive
                ? 'bg-accent text-white shadow-sm'
                : 'bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary border border-border-subtle'
            }`}
          >
            <Icon size={14} className={isActive ? 'text-white' : 'text-text-muted'} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
