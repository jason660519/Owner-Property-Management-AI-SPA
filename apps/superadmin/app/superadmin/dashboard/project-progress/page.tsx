// filepath: apps/superadmin/app/superadmin/dashboard/project-progress/page.tsx
// created: 2026-02-19 | creator: Claude Opus 4.6

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Activity } from 'lucide-react';
import { ROADMAP_DATA, type PhaseType } from '@/app/data/roadmap';
import { PhaseTabBar } from './components/PhaseTabBar';
import { SharedStatsCards } from './components/SharedStatsCards';
import { DevelopmentTab } from './components/DevelopmentTab';
import { TestingTab } from './components/TestingTab';
import { DeploymentTab } from './components/DeploymentTab';
import { OperationsTab } from './components/OperationsTab';

const PHASE_IDS: PhaseType[] = ['development', 'testing', 'deployment', 'operations'];

function getPhaseFromHash(): PhaseType | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.slice(1).toLowerCase();
  return (PHASE_IDS as string[]).includes(hash) ? (hash as PhaseType) : null;
}

export default function ProjectProgressPage() {
  const [activePhase, setActivePhase] = useState<PhaseType>(
    () => getPhaseFromHash() ?? 'development'
  );

  // Sync with URL hash
  useEffect(() => {
    const onHashChange = () => {
      const phase = getPhaseFromHash();
      if (phase) setActivePhase(phase);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Filter features by phase
  const phaseFeatures = useMemo(
    () => ROADMAP_DATA.features.filter(f => (f.phase ?? 'development') === activePhase),
    [activePhase]
  );

  // All features (for development tab which shows everything)
  const allFeatures = ROADMAP_DATA.features;

  return (
    <div className="space-y-4 h-[calc(100vh-100px)] flex flex-col">
      {/* Header row: title left, stats compact top-right */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 flex-none">
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
            <Activity className="text-emerald-600 w-6 h-6 flex-shrink-0" />
            Project Progress Dashboard (專案進度儀表板)
          </h1>
          <p className="text-text-secondary text-sm">
            Track development progress across all modules. Last updated:{' '}
            <span className="font-mono font-medium text-text-primary">
              {ROADMAP_DATA.lastUpdated}
            </span>
          </p>
        </div>
        <SharedStatsCards
          phase={activePhase}
          features={activePhase === 'development' ? allFeatures : phaseFeatures}
          compact
        />
      </div>

      {/* Phase Tab Bar */}
      <PhaseTabBar activePhase={activePhase} onPhaseChange={setActivePhase} />

      {/* Tab Content */}
      {activePhase === 'development' && <DevelopmentTab features={allFeatures} />}
      {activePhase === 'testing' && <TestingTab features={phaseFeatures} />}
      {activePhase === 'deployment' && <DeploymentTab features={phaseFeatures} />}
      {activePhase === 'operations' && <OperationsTab features={phaseFeatures} />}

      <style jsx global>{`
        @keyframes progress-bar-stripes {
          0% { background-position: 1rem 0; }
          100% { background-position: 0 0; }
        }
      `}</style>
    </div>
  );
}
