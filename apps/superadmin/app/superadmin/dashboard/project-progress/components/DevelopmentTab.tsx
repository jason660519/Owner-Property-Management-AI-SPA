// filepath: apps/superadmin/app/superadmin/dashboard/project-progress/components/DevelopmentTab.tsx
// Orchestrator: wires up sub-components for the Development phase table

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  DEV_TAB_PAGE_KEY,
  DEV_TAB_STORAGE_KEY,
  DEV_TAB_DEFAULTS,
  INITIAL_WIDTHS,
  DEFAULT_HEADER_HEIGHT,
  deriveRowStatus,
  getRowKey,
  summarizeRowStatuses,
} from './development-table/types';
import { useDevTableData } from './development-table/useDevTableData';
import { createDevColumns } from './development-table/columns';
import TableCore from './development-table/TableCore';
import TableToolbar from './development-table/TableToolbar';
import PromptEngineerModal from './development-table/PromptEngineerModal';
import AddRowModal from './development-table/AddRowModal';
import type { CustomProjectProgressRowPayload } from '../types';

// --- Component ---

interface DevelopmentTabProps {
  features: RoadmapFeature[];
}

export const DevelopmentTab = ({ features }: DevelopmentTabProps) => {
  const { userId } = useAISettings();

  // --- Persisted preferences ---
  const { settings: tablePrefs, patch: patchTablePrefs } = useTablePreferences<DevTabSettings>({
    pageKey: DEV_TAB_PAGE_KEY,
    storageKey: DEV_TAB_STORAGE_KEY,
    defaults: DEV_TAB_DEFAULTS,
  });

  const hiddenRowKeysSet = useMemo(() => new Set(tablePrefs.hiddenRowKeys), [tablePrefs.hiddenRowKeys]);

  // --- Filters ---
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilterSingle, setCategoryFilterSingle] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [showHiddenRows, setShowHiddenRows] = useState(false);

  // Mutual exclusion: column-header single filter vs sidebar multi-select
  useEffect(() => {
    if (categoryFilterSingle) setSelectedCategories(new Set());
  }, [categoryFilterSingle]);

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

  // --- Per-row IDE & status ---
  const [ideSelections, setIdeSelections] = useState<Record<string, IDEOption>>({});
  const [statusSelections, setStatusSelections] = useState<Record<string, RowStatus>>({});

  // Auto-derive default row status from feature data
  useEffect(() => {
    setStatusSelections(prev => {
      let changed = false;
      const next: Record<string, RowStatus> = { ...prev };
      for (const row of filteredRows) {
        const key = getRowKey(row.__source, row.__rowId);
        if (next[key]) continue;
        next[key] = deriveRowStatus(row);
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [filteredRows]);

  // --- Prompt modal ---
  const [promptTarget, setPromptTarget] = useState<{ row: ProgressRow; rowKey: string } | null>(null);

  const openPromptConfig = useCallback((row: ProgressRow) => {
    const rowKey = getRowKey(row.__source, row.__rowId);
    setPromptTarget({ row, rowKey });
  }, []);

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
    setStatusSelections(prev => ({ ...prev, [rowKey]: status }));
  }, []);

  // --- Column definitions (memoized) ---
  const columns = useMemo(() => createDevColumns({
    onOpenPromptConfig: openPromptConfig,
    statusSelections,
    onStatusChange: handleStatusChange,
    ideSelections,
    hiddenRowKeysSet,
    onToggleHideRow: handleToggleHideRow,
    onDeleteCustomRow: handleDeleteCustomRow,
  }), [openPromptConfig, statusSelections, handleStatusChange, ideSelections, hiddenRowKeysSet, handleToggleHideRow, handleDeleteCustomRow]);

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
        onCategoryFilterSingleChange={setCategoryFilterSingle}
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
        <PromptEngineerModal
          row={promptTarget.row}
          rowKey={promptTarget.rowKey}
          userId={userId}
          currentIDE={ideSelections[promptTarget.rowKey] ?? ''}
          onIdeChange={(rowKey: string, ide: IDEOption) => {
            setIdeSelections(prev => ({ ...prev, [rowKey]: ide }));
          }}
          onStatusHint={(rowKey: string, status: RowStatus) => {
            setStatusSelections(prev => ({ ...prev, [rowKey]: status }));
          }}
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
