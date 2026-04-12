// filepath: components/ui/EnhancedTable.tsx
// Reusable TanStack Table wrapper with standard toolbar (search, category filter,
// alignment, view options, column width presets, reset, optional add-row button).
// Mirrors the project-progress dashboard table UX.

'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState,
} from '@tanstack/react-table';
import { clsx } from 'clsx';
import {
  Search,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Save,
  AlignLeft,
  Eye,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useTablePreferences } from '@/lib/hooks/useTablePreferences';
import { numericStringSortingFn, parseNumericCell } from '@/lib/utils/table-sorting';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HAlign = 'left' | 'center' | 'right';
type VAlign = 'top' | 'middle' | 'bottom';

interface ColAlignment {
  h: HAlign;
  v: VAlign;
}

interface WidthPreset {
  id: string;
  name: string;
  widths: number[];
}

interface TableSettings extends Record<string, unknown> {
  colWidths: number[];
  columnAlignments: ColAlignment[];
  freezeRowCount: 0 | 1;
  frozenDataColCount: number;
  widthPresets: WidthPreset[];
}

// ColumnMeta is declared in development-table/columns.tsx (headerEn, headerZh).
// EnhancedTable reads those fields from column.columnDef.meta if present.

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface EnhancedTableProps<T> {
  /** Unique key for persisting preferences (localStorage + DB) */
  tableId: string;
  /** TanStack column definitions */
  columns: ColumnDef<T, unknown>[];
  /** Table data array */
  data: T[];
  /** Initial column widths as percentages (must sum roughly to 100) */
  initialWidths: number[];
  /** Enable row selection checkboxes */
  enableRowSelection?: boolean;
  /** Called when selection changes (receives selected row IDs) */
  onSelectionChange?: (selectedRows: T[]) => void;
  /** Category accessor for category filter chips. If provided, enables category filtering. */
  getCategoryValue?: (row: T) => string;
  /** Global search accessor. Returns combined searchable string for a row. */
  getSearchValue?: (row: T) => string;
  /** Render content above the table (batch actions bar, etc.) */
  renderBatchActions?: (selectedRows: T[], clearSelection: () => void) => React.ReactNode;
  /** Show "新增 Row" button; called on click */
  onAddRow?: () => void;
  /** Page sizes for pagination. Omit for no pagination. */
  pageSizes?: number[];
  /** Min width of table content in px (enables horizontal scroll) */
  minWidth?: number;
  /** Extra toolbar content (rendered after standard buttons) */
  extraToolbar?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_ALIGNMENT: ColAlignment = { h: 'left', v: 'middle' };

function getAlignClasses(a: ColAlignment) {
  const justify = { top: 'justify-start', middle: 'justify-center', bottom: 'justify-end' } as const;
  const items = { left: 'items-start', center: 'items-center', right: 'items-end' } as const;
  const text = { left: 'text-left', center: 'text-center', right: 'text-right' } as const;
  return { flex: `${justify[a.v]} ${items[a.h]}`, text: text[a.h] };
}

const FREEZE_COL_LINE = [
  'relative',
  "after:content-['']",
  'after:absolute after:right-0 after:top-0 after:bottom-0',
  'after:w-1',
  'after:bg-gray-300 dark:after:bg-gray-600',
  'after:z-20',
  'after:pointer-events-none',
].join(' ');

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EnhancedTable<T>({
  tableId,
  columns,
  data,
  initialWidths,
  enableRowSelection = false,
  onSelectionChange,
  getCategoryValue,
  getSearchValue,
  renderBatchActions,
  onAddRow,
  pageSizes,
  minWidth = 1200,
  extraToolbar,
}: EnhancedTableProps<T>) {
  // --- Persisted preferences ---
  const defaultSettings: TableSettings = {
    colWidths: initialWidths,
    columnAlignments: columns.map(() => ({ ...DEFAULT_ALIGNMENT })),
    freezeRowCount: 1,
    frozenDataColCount: 0,
    widthPresets: [],
  };

  const { settings: prefs, patch } = useTablePreferences<TableSettings>({
    pageKey: tableId,
    storageKey: `enhanced_table_${tableId}_v1`,
    defaults: defaultSettings,
  });

  // Ensure columnAlignments array matches column count
  const columnAlignments = useMemo(() => {
    const arr = prefs.columnAlignments ?? [];
    if (arr.length >= columns.length) return arr;
    return [...arr, ...Array.from({ length: columns.length - arr.length }, () => ({ ...DEFAULT_ALIGNMENT }))];
  }, [prefs.columnAlignments, columns.length]);

  const colWidths = prefs.colWidths.length === columns.length ? prefs.colWidths : initialWidths;

  // --- Auto-patch sortingFn for numeric-looking string columns ---
  // TanStack's default `alphanumeric` sorter does LEXICOGRAPHIC comparison on
  // string values, which gives wrong results for:
  //   • Currency:       "$10.00" < "$4.50"   (wrong: 10 > 4)
  //   • SI suffixes:    "128k"   < "1M"      (wrong)
  //   • Plain numbers:  "120.3"  < "8.2"     (wrong: '1' < '8')
  // Since every column on the AA leaderboard (and most "metric" columns app-
  // wide) is a display STRING, we opt every such column into numeric sort
  // automatically. The detection:
  //   1. Column has no explicit `sortingFn` (user override wins).
  //   2. Column has not disabled sorting.
  //   3. The first non-null sample from `data` is a string whose parsed
  //      numeric form is a finite number (via `parseNumericCell`).
  // Columns whose values are already real numbers, or are non-numeric strings
  // (names, categories, dates), fall through to TanStack's default sort.
  const columnsForTable = useMemo<ColumnDef<T, unknown>[]>(() => {
    if (!data || data.length === 0) return columns;

    const sampleLimit = Math.min(data.length, 5);

    return columns.map((col) => {
      // Rule 1: respect explicit sortingFn if caller provided one.
      if ('sortingFn' in col && col.sortingFn) return col;
      // Rule 2: skip columns that disabled sorting.
      if (col.enableSorting === false) return col;

      // Extract accessor — either accessorKey (string path) or accessorFn.
      const accessorKey = (col as { accessorKey?: string }).accessorKey;
      const accessorFn = (col as { accessorFn?: (row: T, index: number) => unknown })
        .accessorFn;
      if (!accessorKey && !accessorFn) return col;

      // Sample first non-null value from the leading rows.
      let sample: unknown = null;
      for (let i = 0; i < sampleLimit; i++) {
        const row = data[i];
        const v = accessorKey
          ? (row as unknown as Record<string, unknown>)[accessorKey]
          : accessorFn!(row, i);
        if (v != null && v !== '') {
          sample = v;
          break;
        }
      }

      // Real numbers → TanStack's basic/numeric sorter already handles it.
      if (typeof sample !== 'string') return col;
      // Non-numeric strings (names, statuses) → keep default alphanumeric.
      if (!Number.isFinite(parseNumericCell(sample))) return col;

      // Numeric-looking string → inject numericStringSortingFn.
      return { ...col, sortingFn: numericStringSortingFn } as ColumnDef<T, unknown>;
    });
  }, [columns, data]);

  // --- TanStack Table state ---
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns: columnsForTable,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(pageSizes ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    enableRowSelection,
    globalFilterFn: getSearchValue
      ? (row, _columnId, filterValue: string) => {
          if (!filterValue) return true;
          const q = filterValue.toLowerCase();
          const searchStr = getSearchValue(row.original);
          return searchStr.toLowerCase().includes(q);
        }
      : undefined,
  });

  // Notify parent of selection changes
  useEffect(() => {
    if (onSelectionChange) {
      const selected = table.getSelectedRowModel().rows.map(r => r.original);
      onSelectionChange(selected);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSelection]);

  // --- Category filter ---
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);

  const categoryList = useMemo(() => {
    if (!getCategoryValue) return [];
    return Array.from(new Set(data.map(getCategoryValue))).sort();
  }, [data, getCategoryValue]);

  const filteredData = useMemo(() => {
    if (!getCategoryValue || selectedCategories.size === 0) return data;
    return data.filter(row => selectedCategories.has(getCategoryValue(row)));
  }, [data, getCategoryValue, selectedCategories]);

  // Update table data when category filter changes
  useEffect(() => {
    // TanStack handles filtering via globalFilter; category is pre-filtered at data level
  }, [filteredData]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!catDropdownOpen) return;
    const onClick = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatDropdownOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setCatDropdownOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [catDropdownOpen]);

  // --- Alignment dropdown ---
  const [alignOpen, setAlignOpen] = useState(false);
  const [alignCol, setAlignCol] = useState(0);
  const alignRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!alignOpen) return;
    const onClick = (e: MouseEvent) => {
      if (alignRef.current && !alignRef.current.contains(e.target as Node)) setAlignOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [alignOpen]);

  // --- View dropdown ---
  const [viewOpen, setViewOpen] = useState(false);
  const viewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!viewOpen) return;
    const onClick = (e: MouseEvent) => {
      if (viewRef.current && !viewRef.current.contains(e.target as Node)) setViewOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [viewOpen]);

  // --- Save widths dropdown ---
  const [saveOpen, setSaveOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const saveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!saveOpen) return;
    const onClick = (e: MouseEvent) => {
      if (saveRef.current && !saveRef.current.contains(e.target as Node)) setSaveOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [saveOpen]);

  // --- Column resize ---
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const tableInnerRef = useRef<HTMLDivElement>(null);
  const currentWidthsRef = useRef(colWidths);
  currentWidthsRef.current = colWidths;

  const [colPxWidths, setColPxWidths] = useState<number[]>(() => columns.map(() => 80));
  const gridTemplate = useMemo(() => colWidths.map(w => `${w}%`).join(' '), [colWidths]);

  const frozenColLeftOffsets = useMemo(() => {
    const offsets: number[] = [];
    let acc = 0;
    for (let i = 0; i < columns.length; i++) {
      offsets.push(acc);
      acc += colPxWidths[i] ?? 80;
    }
    return offsets;
  }, [colPxWidths, columns.length]);

  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;
    const update = () => {
      const inner = tableInnerRef.current;
      const w = inner?.offsetWidth || Math.max(container.clientWidth, minWidth);
      if (w > 0) setColPxWidths(colWidths.map(pct => Math.max(40, (pct / 100) * w)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    if (tableInnerRef.current) ro.observe(tableInnerRef.current);
    return () => ro.disconnect();
  }, [colWidths, minWidth]);

  const handleResizeStart = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.pageX;
    const startWidths = [...currentWidthsRef.current];
    const containerW = tableInnerRef.current?.offsetWidth || minWidth;
    const onMove = (ev: MouseEvent) => {
      const delta = ((ev.pageX - startX) / containerW) * 100;
      const nw = [...startWidths];
      const l = nw[index] + delta;
      const r = nw[index + 1] - delta;
      const mp = (40 / containerW) * 100;
      if (l >= mp && r >= mp) { nw[index] = l; nw[index + 1] = r; patch({ colWidths: nw }); currentWidthsRef.current = nw; }
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [patch, minWidth]);

  // --- Pagination ---
  const hasPagination = !!pageSizes;
  const rows = hasPagination ? table.getRowModel().rows : table.getRowModel().rows;

  // --- Pill button helper ---
  const pillBtn = (active: boolean) =>
    clsx('px-3 py-1.5 rounded-full text-xs font-medium transition-colors border whitespace-nowrap',
      active
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300'
        : 'bg-bg-primary border-border-default text-text-secondary hover:bg-bg-secondary hover:text-text-primary');

  const colCount = columns.length;
  const { frozenDataColCount, freezeRowCount } = prefs;

  return (
    <div className="space-y-3">
      {/* Batch actions */}
      {renderBatchActions && Object.keys(rowSelection).length > 0 && (
        <div className="bg-bg-primary p-3 rounded-lg border border-border-default">
          {renderBatchActions(
            table.getSelectedRowModel().rows.map(r => r.original),
            () => setRowSelection({}),
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-bg-primary p-4 rounded-lg border border-border-default shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
            <input type="text" placeholder="Search..." value={globalFilter} onChange={e => setGlobalFilter(e.target.value)}
              className="w-full bg-bg-secondary border border-border-default rounded-md pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-text-primary placeholder-text-muted" />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Category filter — show buttons whenever getCategoryValue is provided */}
            {getCategoryValue && (
              <>
                <button type="button" onClick={() => setSelectedCategories(new Set())} className={pillBtn(selectedCategories.size === 0)}>All</button>
                <div className="relative" ref={catRef}>
                  <button type="button" onClick={() => setCatDropdownOpen(o => !o)} className={pillBtn(selectedCategories.size > 0)}>
                    {selectedCategories.size === 0 ? '分類' : `分類 (${selectedCategories.size})`}
                    <ChevronDown className={clsx('inline w-3.5 h-3.5 ml-1 transition-transform', catDropdownOpen && 'rotate-180')} />
                  </button>
                  {catDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1 z-50 min-w-[220px] max-h-[280px] overflow-y-auto bg-bg-primary border border-border-default rounded-lg shadow-lg py-2">
                      {/* Select All / Deselect All */}
                      <label className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-bg-secondary text-sm font-medium text-text-primary border-b border-border-default mb-1">
                        <input type="checkbox"
                          checked={selectedCategories.size === categoryList.length && categoryList.length > 0}
                          ref={(el) => { if (el) el.indeterminate = selectedCategories.size > 0 && selectedCategories.size < categoryList.length; }}
                          onChange={() => setSelectedCategories(prev =>
                            prev.size === categoryList.length ? new Set() : new Set(categoryList)
                          )}
                          className="rounded border-border-default text-emerald-600 focus:ring-emerald-500/20" />
                        <span>全選</span>
                      </label>
                      {categoryList.map(cat => (
                        <label key={cat} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-bg-secondary text-sm text-text-primary">
                          <input type="checkbox" checked={selectedCategories.has(cat)}
                            onChange={() => setSelectedCategories(prev => { const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n; })}
                            className="rounded border-border-default text-emerald-600 focus:ring-emerald-500/20" />
                          <span className="truncate">{cat}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Alignment */}
            <div className="relative" ref={alignRef}>
              <button type="button" onClick={() => setAlignOpen(o => !o)} className={pillBtn(false)}>
                <AlignLeft className="inline w-3.5 h-3.5 mr-1" />排版
              </button>
              {alignOpen && (
                <div className="absolute left-0 top-full mt-1 z-50 min-w-[200px] bg-bg-primary border border-border-default rounded-lg shadow-lg p-3">
                  <div className="mb-2">
                    <label className="text-[10px] text-text-muted">套用至欄位</label>
                    <select value={alignCol} onChange={e => setAlignCol(Number(e.target.value))}
                      className="w-full mt-1 rounded-md border border-border-default bg-bg-secondary px-2 py-1 text-xs text-text-primary">
                      {columns.map((c, i) => <option key={i} value={i}>{(c as { header?: string }).header ?? `Col ${i + 1}`}</option>)}
                    </select>
                  </div>
                  <p className="text-xs font-medium text-text-secondary mb-1">水平</p>
                  <div className="flex gap-1 mb-3">
                    {(['left', 'center', 'right'] as const).map(h => (
                      <button key={h} type="button" onClick={() => { const n = [...columnAlignments]; n[alignCol] = { ...n[alignCol], h }; patch({ columnAlignments: n }); }}
                        className={clsx('flex-1 px-2 py-1.5 rounded text-xs border transition-colors', columnAlignments[alignCol]?.h === h ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300' : 'bg-bg-secondary border-border-default text-text-secondary')}>
                        {h === 'left' ? '靠左' : h === 'center' ? '置中' : '靠右'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs font-medium text-text-secondary mb-1">垂直</p>
                  <div className="flex gap-1">
                    {(['top', 'middle', 'bottom'] as const).map(v => (
                      <button key={v} type="button" onClick={() => { const n = [...columnAlignments]; n[alignCol] = { ...n[alignCol], v }; patch({ columnAlignments: n }); }}
                        className={clsx('flex-1 px-2 py-1.5 rounded text-xs border transition-colors', columnAlignments[alignCol]?.v === v ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300' : 'bg-bg-secondary border-border-default text-text-secondary')}>
                        {v === 'top' ? '靠上' : v === 'middle' ? '置中' : '靠下'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* View */}
            <div className="relative" ref={viewRef}>
              <button type="button" onClick={() => setViewOpen(o => !o)} className={pillBtn(false)}>
                <Eye className="inline w-3.5 h-3.5 mr-1" />View
              </button>
              {viewOpen && (
                <div className="absolute left-0 top-full mt-1 z-50 min-w-[200px] bg-bg-primary border border-border-default rounded-lg shadow-lg py-2">
                  <div className="px-3 py-1 text-[10px] font-medium text-text-muted uppercase">凍結窗格</div>
                  <div className="border-t border-border-light mt-1 pt-1">
                    <div className="px-3 py-1 text-[10px] text-text-muted">列 (Row)</div>
                    {([0, 1] as const).map(n => (
                      <button key={n} type="button" onClick={() => { patch({ freezeRowCount: n }); setViewOpen(false); }}
                        className={clsx('w-full text-left px-3 py-2 text-sm', freezeRowCount === n ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-medium' : 'text-text-primary hover:bg-bg-secondary')}>
                        {n === 0 ? '不凍結列' : '凍結表頭'}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-border-light mt-1 pt-1">
                    <div className="px-3 py-1 text-[10px] text-text-muted">欄 (Column)</div>
                    <div className="max-h-[200px] overflow-y-auto">
                      {[{ n: 0, label: '不凍結欄' }, ...Array.from({ length: colCount }, (_, i) => ({ n: i + 1, label: i === 0 ? '凍結第 1 欄' : `凍結第 1~${i + 1} 欄` }))].map(({ n, label }) => (
                        <button key={n} type="button" onClick={() => { patch({ frozenDataColCount: n }); setViewOpen(false); }}
                          className={clsx('w-full text-left px-3 py-2 text-sm', frozenDataColCount === n ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-medium' : 'text-text-primary hover:bg-bg-secondary')}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Save Widths */}
          <div className="relative" ref={saveRef}>
            <button type="button" onClick={() => setSaveOpen(o => !o)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary bg-bg-primary border border-border-default rounded-md hover:bg-bg-secondary hover:text-text-primary whitespace-nowrap">
              <Save className="w-3.5 h-3.5" />Save Widths
            </button>
            {saveOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-72 bg-bg-primary border border-border-default rounded-lg shadow-lg p-3">
                <div className="space-y-3">
                  <div>
                    <label htmlFor={`preset-${tableId}`} className="block text-xs font-medium text-text-secondary mb-1">Save current layout as</label>
                    <div className="flex gap-2">
                      <input id={`preset-${tableId}`} type="text" value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="e.g. macOS Chrome"
                        className="flex-1 min-w-0 bg-bg-secondary border border-border-default rounded-md px-2 py-1.5 text-sm text-text-primary placeholder-text-muted focus:ring-2 focus:ring-emerald-500/20 outline-none"
                        onKeyDown={e => { if (e.key === 'Enter' && presetName.trim()) { patch({ widthPresets: [...prefs.widthPresets, { id: crypto.randomUUID(), name: presetName.trim(), widths: [...colWidths] }] }); setPresetName(''); } }} />
                      <button type="button" disabled={!presetName.trim()}
                        onClick={() => { patch({ widthPresets: [...prefs.widthPresets, { id: crypto.randomUUID(), name: presetName.trim(), widths: [...colWidths] }] }); setPresetName(''); }}
                        className="px-2 py-1.5 text-xs font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">Save</button>
                    </div>
                  </div>
                  {prefs.widthPresets.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-text-secondary mb-2">Saved presets</p>
                      <ul className="space-y-1 max-h-40 overflow-y-auto">
                        {prefs.widthPresets.map(p => (
                          <li key={p.id} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded bg-bg-secondary/50 hover:bg-bg-secondary">
                            <span className="text-sm text-text-primary truncate">{p.name}</span>
                            <span className="flex gap-1 flex-shrink-0">
                              <button type="button" onClick={() => { patch({ colWidths: p.widths }); setSaveOpen(false); }} className="text-xs text-emerald-600 hover:text-emerald-500">Load</button>
                              <button type="button" onClick={() => patch({ widthPresets: prefs.widthPresets.filter(x => x.id !== p.id) })} className="text-xs text-text-muted hover:text-red-500">Delete</button>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Reset */}
          <button type="button" onClick={() => patch({ colWidths: initialWidths })}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary bg-bg-primary border border-border-default rounded-md hover:bg-bg-secondary hover:text-text-primary whitespace-nowrap">
            <RotateCcw className="w-3.5 h-3.5" />Reset Widths
          </button>

          {/* Add row */}
          {onAddRow && (
            <button type="button" onClick={onAddRow}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary bg-bg-primary border border-border-default rounded-md hover:bg-bg-secondary hover:text-text-primary whitespace-nowrap">
              <Plus className="w-3.5 h-3.5" />新增 Row
            </button>
          )}

          {extraToolbar}
        </div>
      </div>

      {/* Table */}
      <div className="bg-bg-primary border border-border-default rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-auto" ref={tableContainerRef} style={{ maxHeight: 'calc(100vh - 320px)' }}>
          <div ref={tableInnerRef} style={{ minWidth: `max(100%, ${minWidth}px)` }}>
            {/* Header */}
            <div className={clsx('relative z-10 bg-bg-secondary w-full',
              freezeRowCount > 0 ? 'sticky top-0 border-b-4 border-solid border-gray-300 dark:border-gray-600' : 'border-b border-border-default')}>
              <div className="grid divide-x divide-border-default" style={{ gridTemplateColumns: gridTemplate }}>
                {table.getHeaderGroups()[0]?.headers.map((header, idx) => {
                  const meta = header.column.columnDef.meta as { headerEn?: string; headerZh?: string } | undefined;
                  const align = getAlignClasses(columnAlignments[idx] ?? DEFAULT_ALIGNMENT);
                  const isFrozen = idx < frozenDataColCount;
                  const isBoundary = frozenDataColCount > 0 && idx === frozenDataColCount - 1;
                  const sorted = header.column.getIsSorted();
                  const canSort = header.column.getCanSort();

                  return (
                    <div key={header.id} role="button" tabIndex={0}
                      onClick={() => canSort && header.column.toggleSorting()}
                      // NOTE: `relative` is REQUIRED so the absolute-positioned resize handle
                      // anchors to this cell. Without it, the handle escapes to the nearest
                      // positioned ancestor (the header wrapper) and all handles collapse
                      // to the right edge of the whole header — breaking column resize.
                      className={clsx('relative min-w-0 px-4 py-3 text-xs font-semibold text-text-secondary tracking-wider flex flex-col overflow-hidden cursor-pointer',
                        isFrozen && 'sticky bg-bg-secondary', isBoundary ? clsx(FREEZE_COL_LINE, 'z-[12]') : isFrozen ? 'z-[5]' : '',
                        align.flex, align.text)}
                      style={{ ...(isFrozen ? { left: frozenColLeftOffsets[idx] } : {}) }}>
                      <div className="flex items-center gap-1 w-full">
                        <span className="uppercase break-words leading-tight line-clamp-2 flex-1">
                          {meta?.headerEn ?? (typeof header.column.columnDef.header === 'string' ? header.column.columnDef.header : header.column.id)}
                        </span>
                        {sorted === 'asc' && <ChevronUp className="w-3 h-3 flex-shrink-0 text-blue-500" />}
                        {sorted === 'desc' && <ChevronDown className="w-3 h-3 flex-shrink-0 text-blue-500" />}
                      </div>
                      {meta?.headerZh && <span className="text-[10px] text-text-muted break-words w-full leading-tight line-clamp-1">{meta.headerZh}</span>}
                      {/* Resize handle */}
                      {idx < colCount - 1 && (
                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-10 active:bg-blue-600"
                          onMouseDown={e => { e.stopPropagation(); handleResizeStart(idx, e); }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Body */}
            <div className="divide-y divide-border-default">
              {rows.map(row => (
                <div key={row.id} className="grid min-h-[52px] w-full items-stretch divide-x divide-border-light hover:bg-bg-secondary transition-colors"
                  style={{ gridTemplateColumns: gridTemplate }}>
                  {row.getVisibleCells().map((cell, colIdx) => {
                    const isFrozen = colIdx < frozenDataColCount;
                    const isBoundary = frozenDataColCount > 0 && colIdx === frozenDataColCount - 1;
                    const align = getAlignClasses(columnAlignments[colIdx] ?? DEFAULT_ALIGNMENT);
                    return (
                      <div key={cell.id}
                        className={clsx('min-w-0 px-4 py-3 flex flex-col overflow-hidden',
                          isFrozen && 'sticky bg-bg-primary', isBoundary ? clsx(FREEZE_COL_LINE, 'z-[3]') : isFrozen ? 'z-[1]' : '',
                          align.flex, align.text)}
                        style={{ ...(isFrozen ? { left: frozenColLeftOffsets[colIdx] } : {}) }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pagination */}
        {hasPagination && (
          <div className="flex items-center justify-between border-t border-border-default px-4 py-3 bg-bg-secondary/30">
            <div className="text-xs text-text-muted">
              共 {table.getFilteredRowModel().rows.length} 筆，第 {table.getState().pagination.pageIndex + 1} / {table.getPageCount()} 頁
            </div>
            <div className="flex items-center gap-2">
              <select value={table.getState().pagination.pageSize} onChange={e => table.setPageSize(Number(e.target.value))}
                className="rounded-md border border-border-default bg-bg-secondary px-2 py-1 text-xs text-text-primary">
                {(pageSizes ?? [20]).map(s => <option key={s} value={s}>{s} / 頁</option>)}
              </select>
              <button type="button" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
                className="p-1.5 rounded border border-border-default text-text-secondary hover:bg-bg-secondary disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
                className="p-1.5 rounded border border-border-default text-text-secondary hover:bg-bg-secondary disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
