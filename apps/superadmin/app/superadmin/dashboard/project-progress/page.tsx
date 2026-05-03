// filepath: apps/superadmin/app/superadmin/dashboard/project-progress/page.tsx
// Project Progress Dashboard — Excel-style sheet tabs at bottom

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Activity } from 'lucide-react';
import { ROADMAP_DATA, normalizeRoadmapFeatureId, type PhaseType } from '@/app/data/roadmap';
import { useTablePreferences } from '@/lib/hooks/useTablePreferences';
import { useAISettings } from '@/lib/hooks/useAISettings';
import { usePaperclipAgents } from '@/lib/hooks/usePaperclipAgents';
import { usePaperclipCron } from '@/lib/hooks/usePaperclipCron';
import EnhancedTable from '@/components/ui/EnhancedTable';
import { SharedStatsCards } from './components/SharedStatsCards';
import { SheetTabs } from './components/SheetTabs';
import { DevelopmentTab } from './components/DevelopmentTab';
import AgentOpsPanel from './components/AgentOpsPanel';
import CronControlPanel from './components/CronControlPanel';
import AddRowModal from './components/development-table/AddRowModal';
import { ExportToVISButton } from './components/ExportToVISButton';
import {
  type PhaseRow,
  createTestingColumns,
  createDeploymentColumns,
  createOperationsColumns,
  TESTING_WIDTHS,
  DEPLOYMENT_WIDTHS,
  OPERATIONS_WIDTHS,
} from './components/development-table/phase-columns';
import type { CustomProjectProgressRowPayload } from './types';

const PHASE_IDS: PhaseType[] = ['development', 'testing', 'deployment', 'operations'];

function getPhaseFromHash(): PhaseType | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.slice(1).toLowerCase();
  return (PHASE_IDS as string[]).includes(hash) ? (hash as PhaseType) : null;
}

// Persisted custom rows for non-development sheets
interface PhaseCustomRowsSettings extends Record<string, unknown> {
  customRows: CustomProjectProgressRowPayload[];
}

const PHASE_CUSTOM_DEFAULTS: PhaseCustomRowsSettings = { customRows: [] };

export default function ProjectProgressPage() {
  const { userId } = useAISettings();
  const agentOps = usePaperclipAgents(userId);
  const cronOps = usePaperclipCron(userId);

  const [activePhase, setActivePhase] = useState<PhaseType>(
    () => getPhaseFromHash() ?? 'development',
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

  // Custom rows for testing/deployment/operations (persisted per phase)
  const { settings: testingPrefs, patch: patchTesting } = useTablePreferences<PhaseCustomRowsSettings>({
    pageKey: 'project_progress_testing_rows',
    storageKey: 'project_progress_testing_rows_v1',
    defaults: PHASE_CUSTOM_DEFAULTS,
  });
  const { settings: deploymentPrefs, patch: patchDeployment } = useTablePreferences<PhaseCustomRowsSettings>({
    pageKey: 'project_progress_deployment_rows',
    storageKey: 'project_progress_deployment_rows_v1',
    defaults: PHASE_CUSTOM_DEFAULTS,
  });
  const { settings: operationsPrefs, patch: patchOperations } = useTablePreferences<PhaseCustomRowsSettings>({
    pageKey: 'project_progress_operations_rows',
    storageKey: 'project_progress_operations_rows_v1',
    defaults: PHASE_CUSTOM_DEFAULTS,
  });

  // All features
  const allFeatures = ROADMAP_DATA.features;

  // Build phase rows: roadmap features + custom rows for each phase
  const buildPhaseRows = useCallback((phase: PhaseType, customRows: CustomProjectProgressRowPayload[]): PhaseRow[] => {
    const roadmapRows = allFeatures
      .filter(f => (f.phase ?? 'development') === phase)
      .map((f, idx) => ({
        ...f,
        __featureId: normalizeRoadmapFeatureId(f.id) || String(idx + 1).padStart(3, '0'),
      }));

    const customPhaseRows: PhaseRow[] = customRows.map((r, idx) => ({
      name: r.name,
      category: r.category,
      percentage: r.percentage ?? 0,
      locatedPage: r.locatedPage,
      phase,
      __featureId: normalizeRoadmapFeatureId(r.rowId) || String(roadmapRows.length + idx + 1).padStart(3, '0'),
    }));

    return [...roadmapRows, ...customPhaseRows];
  }, [allFeatures]);

  const testingRows = useMemo(() => buildPhaseRows('testing', testingPrefs.customRows), [buildPhaseRows, testingPrefs.customRows]);
  const deploymentRows = useMemo(() => buildPhaseRows('deployment', deploymentPrefs.customRows), [buildPhaseRows, deploymentPrefs.customRows]);
  const operationsRows = useMemo(() => buildPhaseRows('operations', operationsPrefs.customRows), [buildPhaseRows, operationsPrefs.customRows]);

  // Phase counts for sheet tab badges (include custom rows)
  const phaseCounts = useMemo(() => {
    const counts: Record<PhaseType, number> = { development: 0, testing: 0, deployment: 0, operations: 0 };
    allFeatures.forEach(f => {
      const phase = (f.phase ?? 'development') as PhaseType;
      if (phase in counts) counts[phase]++;
    });
    counts.testing += testingPrefs.customRows.length;
    counts.deployment += deploymentPrefs.customRows.length;
    counts.operations += operationsPrefs.customRows.length;
    return counts;
  }, [allFeatures, testingPrefs.customRows.length, deploymentPrefs.customRows.length, operationsPrefs.customRows.length]);

  // Active phase rows and data for current sheet
  const activeRows = useMemo(() => {
    switch (activePhase) {
      case 'testing': return testingRows;
      case 'deployment': return deploymentRows;
      case 'operations': return operationsRows;
      default: return [];
    }
  }, [activePhase, testingRows, deploymentRows, operationsRows]);

  // Existing row IDs for duplicate detection in AddRowModal
  const existingRowIds = useMemo(() => {
    const ids = new Set<string>();
    activeRows.forEach((r) => ids.add(r.__featureId));
    const prefs = activePhase === 'testing' ? testingPrefs
      : activePhase === 'deployment' ? deploymentPrefs
        : operationsPrefs;
    prefs.customRows.forEach(r => ids.add(r.rowId));
    return ids;
  }, [activeRows, activePhase, testingPrefs, deploymentPrefs, operationsPrefs]);

  // Add row modal
  const [addRowOpen, setAddRowOpen] = useState(false);

  const handleAddRow = useCallback((row: CustomProjectProgressRowPayload) => {
    switch (activePhase) {
      case 'testing':
        patchTesting({ customRows: [...testingPrefs.customRows, row] });
        break;
      case 'deployment':
        patchDeployment({ customRows: [...deploymentPrefs.customRows, row] });
        break;
      case 'operations':
        patchOperations({ customRows: [...operationsPrefs.customRows, row] });
        break;
    }
    setAddRowOpen(false);
  }, [activePhase, testingPrefs.customRows, deploymentPrefs.customRows, operationsPrefs.customRows, patchTesting, patchDeployment, patchOperations]);

  // Column definitions (memoized)
  const testingCols = useMemo(() => createTestingColumns(), []);
  const deploymentCols = useMemo(() => createDeploymentColumns(), []);
  const operationsCols = useMemo(() => createOperationsColumns(), []);

  // Only show AddRow for non-development sheets (development has its own AddRowModal)
  const showAddRow = activePhase !== 'development';

  return (
    <div className="flex flex-col gap-4 min-h-[calc(100vh-8rem)]">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 flex-none">
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
            <Activity className="text-emerald-600 w-6 h-6 flex-shrink-0" />
            Project Progress Dashboard (專案進度儀表板)
          </h1>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <ExportToVISButton />
          <SharedStatsCards
            phase={activePhase}
            features={activePhase === 'development' ? allFeatures : activeRows}
            compact
          />
        </div>
      </div>

      {/* Paperclip Ops Panels (Agent health + Cron controls) */}
      {activePhase === 'development' && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 flex-none">
          <AgentOpsPanel
            agents={agentOps.agents}
            loading={agentOps.loading}
            error={agentOps.error}
            onRefresh={agentOps.refresh}
            onResume={agentOps.resumeAgent}
            onPause={agentOps.pauseAgent}
            onSwitchAdapter={agentOps.switchAdapter}
          />
          <CronControlPanel
            configs={cronOps.configs}
            loading={cronOps.loading}
            runningJob={cronOps.runningJob}
            onToggle={(jt, enabled) => cronOps.updateConfig(jt, { enabled })}
            onUpdateInterval={(jt, sec) => cronOps.updateConfig(jt, { interval_seconds: sec })}
            onRunJob={cronOps.runJob}
          />
        </div>
      )}

      {/* Sheet content area — min-h ensures table gets usable space even after ops panels */}
      <div className="flex-1 min-h-0 flex flex-col" style={{ minHeight: '24rem' }}>
        <div className="flex-1 min-h-0 flex flex-col">
          {activePhase === 'development' && <DevelopmentTab features={allFeatures} />}

          {activePhase === 'testing' && (
            <EnhancedTable<PhaseRow>
              tableId="project_progress_testing"
              columns={testingCols}
              data={testingRows}
              initialWidths={TESTING_WIDTHS}
              getCategoryValue={r => r.category}
              getSearchValue={r => `${r.name} ${r.category} ${r.locatedPage ?? ''}`}
              minWidth={1100}
              onAddRow={() => setAddRowOpen(true)}
            />
          )}

          {activePhase === 'deployment' && (
            <EnhancedTable<PhaseRow>
              tableId="project_progress_deployment"
              columns={deploymentCols}
              data={deploymentRows}
              initialWidths={DEPLOYMENT_WIDTHS}
              getCategoryValue={r => r.category}
              getSearchValue={r => `${r.name} ${r.category} ${r.deployStatus ?? ''} ${r.deployEnv ?? ''}`}
              minWidth={1200}
              onAddRow={() => setAddRowOpen(true)}
            />
          )}

          {activePhase === 'operations' && (
            <EnhancedTable<PhaseRow>
              tableId="project_progress_operations"
              columns={operationsCols}
              data={operationsRows}
              initialWidths={OPERATIONS_WIDTHS}
              getCategoryValue={r => r.category}
              getSearchValue={r => `${r.name} ${r.category} ${r.lastIncident ?? ''}`}
              minWidth={1200}
              onAddRow={() => setAddRowOpen(true)}
            />
          )}
        </div>

        {/* Bottom sheet tabs (Excel-style) */}
        <SheetTabs
          activePhase={activePhase}
          onPhaseChange={setActivePhase}
          phaseCounts={phaseCounts}
        />
      </div>

      {/* Add Row Modal for non-development sheets */}
      {showAddRow && (
        <AddRowModal
          open={addRowOpen}
          onClose={() => setAddRowOpen(false)}
          existingRowIds={existingRowIds}
          onAdd={handleAddRow}
        />
      )}

      <style jsx global>{`
        @keyframes progress-bar-stripes {
          0% { background-position: 1rem 0; }
          100% { background-position: 0 0; }
        }
      `}</style>
    </div>
  );
}
