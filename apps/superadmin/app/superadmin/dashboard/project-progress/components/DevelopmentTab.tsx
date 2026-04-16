// filepath: apps/superadmin/app/superadmin/dashboard/project-progress/components/DevelopmentTab.tsx
// Orchestrator: wires up sub-components for the Development phase table

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { RoadmapFeature } from '@/app/data/roadmap';
import { useAISettings } from '@/lib/hooks/useAISettings';
import { useTablePreferences } from '@/lib/hooks/useTablePreferences';
import {
  type ColumnAlignment,
  type DevTabSettings,
  type IDEOption,
  type ProgressRow,
  type RowStatus,
  type SelectionType,
  COLUMN_HEADERS,
  DEFAULT_COLUMN_ALIGNMENT,
  DEV_TAB_PAGE_KEY,
  DEV_TAB_STORAGE_KEY,
  DEV_TAB_DEFAULTS,
  INITIAL_WIDTHS,
  DEFAULT_HEADER_HEIGHT,
  deriveRowStatus,
  localTaskStatusToRowStatus,
  getRowKey,
  summarizeRowStatuses,
} from './development-table/types';
import { useDevTableData } from './development-table/useDevTableData';
import { createDevColumns } from './development-table/columns';
import TableCore from './development-table/TableCore';
import TableToolbar from './development-table/TableToolbar';
import { TaskDispatchModal } from './development-table/task-dispatch';
import { usePaperclipTasks } from '@/lib/hooks/usePaperclipTasks';
import { useEngineerProfiles } from '@/lib/hooks/useEngineerProfiles';
import AddRowModal from './development-table/AddRowModal';
import type { CustomProjectProgressRowPayload } from '../types';

// --- Component ---

interface DevelopmentTabProps {
  features: RoadmapFeature[];
}

export const DevelopmentTab = ({ features }: DevelopmentTabProps) => {
  const { userId } = useAISettings();
  const { tasksByRowId, refresh: refreshTasks } = usePaperclipTasks();
  const { profiles: engineerProfiles, profilesByUserId } = useEngineerProfiles();

  // --- Persisted preferences ---
  const { settings: tablePrefs, patch: patchTablePrefs } = useTablePreferences<DevTabSettings>({
    pageKey: DEV_TAB_PAGE_KEY,
    storageKey: DEV_TAB_STORAGE_KEY,
    defaults: DEV_TAB_DEFAULTS,
  });

  const hiddenRowKeysSet = useMemo(() => new Set(tablePrefs.hiddenRowKeys), [tablePrefs.hiddenRowKeys]);

  useEffect(() => {
    const expectedColCount = COLUMN_HEADERS.length;
    const next: Partial<DevTabSettings> = {};
    if (tablePrefs.colWidths.length !== expectedColCount) {
      next.colWidths = [...INITIAL_WIDTHS];
    }
    if (tablePrefs.columnAlignments.length !== expectedColCount) {
      next.columnAlignments = Array.from({ length: expectedColCount }, (_, i) => (
        tablePrefs.columnAlignments[i] ?? { ...DEFAULT_COLUMN_ALIGNMENT }
      ));
    }
    if (Object.keys(next).length > 0) patchTablePrefs(next);
  }, [tablePrefs.colWidths.length, tablePrefs.columnAlignments, patchTablePrefs]);

  // --- Filters ---
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilterSingle, setCategoryFilterSingle] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [showHiddenRows, setShowHiddenRows] = useState(false);

  const handleCategoryFilterSingleChange = useCallback((value: string) => {
    setCategoryFilterSingle(value);
    if (value) setSelectedCategories(new Set());
  }, []);

  // --- Data ---
  const { filteredRows, categoryList, hiddenRowsList, existingRowIds } = useDevTableData(
    features,
    tablePrefs.customRows,
    tablePrefs.hiddenRowKeys,
    { searchQuery, categoryFilterSingle, selectedCategories, hiddenRowKeysSet, showHiddenRows },
  );

  // --- Selection ---
  const [selectionType, setSelectionType] = useState<SelectionType>(null);
  const [selectedRow, setSelectedRow] = useState(0);
  const [selectedCol, setSelectedCol] = useState(0);

  // --- Per-row status ---
  const [manualStatusSelections, setManualStatusSelections] = useState<Record<string, RowStatus>>({});

  const derivedStatusSelections = useMemo(() => {
    const derived: Record<string, RowStatus> = {};
    for (const row of filteredRows) {
      const key = getRowKey(row.__source, row.__rowId);
      const task = tasksByRowId[row.__rowId];
      if (task) derived[key] = localTaskStatusToRowStatus(task.status);
      else derived[key] = deriveRowStatus(row);
    }
    return derived;
  }, [filteredRows, tasksByRowId]);

  const statusSelections = useMemo(
    () => ({ ...derivedStatusSelections, ...manualStatusSelections }),
    [derivedStatusSelections, manualStatusSelections],
  );

  const [ideSelections, setIdeSelections] = useState<Record<string, IDEOption>>({});
  const [promptTarget, setPromptTarget] = useState<{ row: ProgressRow; rowKey: string } | null>(null);

  const openPromptPage = useCallback((row: ProgressRow) => {
    const url = `/superadmin/dashboard/project-progress/task/${encodeURIComponent(row.__rowId)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const openPromptModal = useCallback((row: ProgressRow) => {
    const rowKey = getRowKey(row.__source, row.__rowId);
    setPromptTarget({ row, rowKey });
  }, []);

  const handleTaskCreated = useCallback(() => {
    refreshTasks();
  }, [refreshTasks]);

  // --- Add row modal ---
  const [addRowOpen, setAddRowOpen] = useState(false);

  const handleAddRow = useCallback((newRow: CustomProjectProgressRowPayload) => {
    patchTablePrefs({ customRows: [...tablePrefs.customRows, newRow] });
  }, [patchTablePrefs, tablePrefs.customRows]);

  const handleToggleHideRow = useCallback((rowKey: string) => {
    const current = tablePrefs.hiddenRowKeys;
    const next = current.includes(rowKey)
      ? current.filter(k => k !== rowKey)
      : [...current, rowKey];
    patchTablePrefs({ hiddenRowKeys: next });
  }, [patchTablePrefs, tablePrefs.hiddenRowKeys]);

  const handleDeleteCustomRow = useCallback((rowId: string) => {
    patchTablePrefs({ customRows: tablePrefs.customRows.filter(r => r.rowId !== rowId) });
  }, [patchTablePrefs, tablePrefs.customRows]);

  const handleStatusChange = useCallback((rowKey: string, status: RowStatus) => {
    setManualStatusSelections(prev => ({ ...prev, [rowKey]: status }));
  }, []);

  // --- Column definitions (memoized) ---
  const columns = useMemo(() => createDevColumns({
    onOpenPromptModal: openPromptModal,
    onOpenPromptPage: openPromptPage,
    statusSelections,
    onStatusChange: handleStatusChange,
    hiddenRowKeysSet,
    onToggleHideRow: handleToggleHideRow,
    onDeleteCustomRow: handleDeleteCustomRow,
    userId,
    tasksByRowId,
    engineerProfiles,
    profilesByUserId,
    onRefreshTasks: refreshTasks,
  }), [openPromptModal, openPromptPage, statusSelections, handleStatusChange, hiddenRowKeysSet, handleToggleHideRow, handleDeleteCustomRow, userId, tasksByRowId, engineerProfiles, profilesByUserId, refreshTasks]);

  const statusSummary = useMemo(
    () => summarizeRowStatuses(filteredRows, statusSelections),
    [filteredRows, statusSelections],
  );

  // --- Category filter helpers ---
  const toggleCategory = useCallback((cat: string) => {
    setCategoryFilterSingle('');
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const clearCategories = useCallback(() => {
    setSelectedCategories(new Set());
  }, []);

  // --- Width preset helpers ---
  const handleSavePreset = useCallback((name: string) => {
    const preset = { id: crypto.randomUUID(), name, widths: [...tablePrefs.colWidths] };
    patchTablePrefs({ widthPresets: [...tablePrefs.widthPresets, preset] });
  }, [patchTablePrefs, tablePrefs.colWidths, tablePrefs.widthPresets]);

  const handleLoadPreset = useCallback((preset: { widths: number[] }) => {
    patchTablePrefs({ colWidths: preset.widths });
  }, [patchTablePrefs]);

  const handleDeletePreset = useCallback((id: string) => {
    patchTablePrefs({ widthPresets: tablePrefs.widthPresets.filter(p => p.id !== id) });
  }, [patchTablePrefs, tablePrefs.widthPresets]);

  const handleResetWidths = useCallback(() => {
    patchTablePrefs({ colWidths: INITIAL_WIDTHS, headerHeight: DEFAULT_HEADER_HEIGHT });
  }, [patchTablePrefs]);

  // --- Render ---
  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-md border border-border-default bg-bg-secondary px-2 py-1">
          <p className="text-[10px] text-text-muted">Completed</p>
          <p className="text-sm font-semibold text-text-primary">{statusSummary.completed}</p>
        </div>
        <div className="rounded-md border border-border-default bg-bg-secondary px-2 py-1">
          <p className="text-[10px] text-text-muted">In Progress</p>
          <p className="text-sm font-semibold text-text-primary">{statusSummary.in_progress}</p>
        </div>
        <div className="rounded-md border border-border-default bg-bg-secondary px-2 py-1">
          <p className="text-[10px] text-text-muted">Not Started</p>
          <p className="text-sm font-semibold text-text-secondary">{statusSummary.not_started}</p>
        </div>
        <div className="rounded-md border border-border-default bg-bg-secondary px-2 py-1">
          <p className="text-[10px] text-text-muted">On Hold</p>
          <p className="text-sm font-semibold text-text-primary">{statusSummary.on_hold}</p>
        </div>
      </div>

      <TableToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categoryList={categoryList}
        selectedCategories={selectedCategories}
        onToggleCategory={toggleCategory}
        onClearCategories={clearCategories}
        categoryFilterSingle={categoryFilterSingle}
        onCategoryFilterSingleChange={handleCategoryFilterSingleChange}
        columnAlignments={tablePrefs.columnAlignments}
        onSetColumnAlignment={(colIndex: number, alignment: ColumnAlignment) => {
          const next = [...tablePrefs.columnAlignments];
          next[colIndex] = alignment;
          patchTablePrefs({ columnAlignments: next });
        }}
        selectedCol={selectedCol}
        selectionType={selectionType}
        freezeRowCount={tablePrefs.freezeRowCount}
        frozenDataColCount={tablePrefs.frozenDataColCount}
        showHiddenRows={showHiddenRows}
        hiddenRowKeysSet={hiddenRowKeysSet}
        hiddenRowsList={hiddenRowsList}
        onPatchPrefs={patchTablePrefs}
        onShowHiddenRowsChange={setShowHiddenRows}
        widthPresets={tablePrefs.widthPresets}
        onResetWidths={handleResetWidths}
        onSavePreset={handleSavePreset}
        onLoadPreset={handleLoadPreset}
        onDeletePreset={handleDeletePreset}
        onAddRowOpen={() => setAddRowOpen(true)}
      />

      <TableCore
        data={filteredRows}
        columns={columns}
        colWidths={tablePrefs.colWidths}
        headerHeight={tablePrefs.headerHeight}
        columnAlignments={tablePrefs.columnAlignments}
        freezeRowCount={tablePrefs.freezeRowCount}
        frozenDataColCount={tablePrefs.frozenDataColCount}
        onPatchPrefs={patchTablePrefs}
        selectionType={selectionType}
        selectedRow={selectedRow}
        selectedCol={selectedCol}
        onSelectCell={(rowIdx: number, colIdx: number) => {
          setSelectionType('cell');
          setSelectedRow(rowIdx);
          setSelectedCol(colIdx);
        }}
        onSelectColumn={(colIdx: number) => {
          setSelectionType('column');
          setSelectedCol(colIdx);
        }}
        onSelectAll={() => setSelectionType('all')}
      />

      {promptTarget && (
        <TaskDispatchModal
          row={promptTarget.row}
          rowKey={promptTarget.rowKey}
          userId={userId}
          currentIDE={ideSelections[promptTarget.rowKey] ?? ''}
          onIdeChange={(rowKey: string, ide: IDEOption) => {
            setIdeSelections(prev => ({ ...prev, [rowKey]: ide }));
          }}
          onTaskCreated={handleTaskCreated}
          onClose={() => setPromptTarget(null)}
        />
      )}

      <AddRowModal
        open={addRowOpen}
        onClose={() => setAddRowOpen(false)}
        existingRowIds={existingRowIds}
        onAdd={handleAddRow}
      />

      <style jsx global>{`
        @keyframes progress-bar-stripes {
          0% { background-position: 1rem 0; }
          100% { background-position: 0 0; }
        }
      `}</style>
    </>
  );
};
