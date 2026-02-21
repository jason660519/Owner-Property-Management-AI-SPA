// filepath: apps/superadmin/app/superadmin/dashboard/project-progress/components/DevelopmentTab.tsx
// created: 2026-02-19 | creator: Claude Opus 4.6

'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import type { RoadmapFeature } from '@/app/data/roadmap';
import {
  Search,
  Filter,
  RotateCcw,
  ChevronDown,
  Save,
  AlignLeft,
  Eye,
  Play,
  Loader2,
  Square,
  ExternalLink,
  Settings,
} from 'lucide-react';
import { clsx } from 'clsx';
import { getProjectProgressSettings, setProjectProgressSettings } from '../actions';
import type { ProjectProgressSettingsPayload } from '../types';

// --- Types ---

interface ColumnWidths {
  [key: number]: string;
}

type HAlign = 'left' | 'center' | 'right';
type VAlign = 'top' | 'middle' | 'bottom';
interface ColumnAlignment {
  h: HAlign;
  v: VAlign;
}

interface WidthPreset {
  id: string;
  name: string;
  widths: number[];
}

type SelectionType = 'cell' | 'column' | 'row' | 'all' | null;

// --- Constants ---

const INITIAL_WIDTHS = [4, 9, 25, 24, 7, 8, 6, 8];

const DEFAULT_TEST_SCRIPT_PATH = 'apps/superadmin/e2e';

const COLUMN_HEADERS = [
  { en: 'ID', zh: '編碼' },
  { en: 'Category', zh: '分類' },
  { en: 'Feature', zh: '功能需求名稱' },
  { en: 'Dev Progress & Report', zh: '開發進度與報告' },
  { en: 'Dev Progress Rate', zh: '開發進度完成率（Completed數/TODO數）' },
  { en: 'TTD Spec URL', zh: 'TTD 測試驅動開發規格說明書 URL' },
  { en: 'Test Script Count', zh: '測試腳本數量' },
  { en: 'Test Script Pass Rate', zh: '測試腳本通過率' },
];

const COLUMN_LETTERS = COLUMN_HEADERS.map((_, i) => String.fromCharCode(65 + i));

const FREEZE_ROW_STORAGE_KEY = 'project_progress_freeze_row_v1';
const FROZEN_DATA_COL_COUNT_KEY = 'project_progress_frozen_data_col_count_v2';
const WIDTH_PRESETS_KEY = 'project_progress_col_widths_presets_v9';
const HEADER_HEIGHT_KEY = 'project_progress_header_height_v1';
const DEFAULT_HEADER_HEIGHT = 56;
const MIN_HEADER_HEIGHT = 40;
const MAX_HEADER_HEIGHT = 120;
const ALIGNMENT_STORAGE_KEY = 'project_progress_col_alignments_v1';
const DEFAULT_COLUMN_ALIGNMENT: ColumnAlignment = { h: 'left', v: 'top' };

// --- Utilities ---

function normalizeWidths(widths: number[]): number[] {
  const sum = widths.reduce((a, b) => a + b, 0);
  if (sum <= 0) return [...INITIAL_WIDTHS];
  const scaled = widths.map(w => Math.round((w / sum) * 100));
  const total = scaled.reduce((a, b) => a + b, 0);
  if (total !== 100 && scaled.length > 0) scaled[0] += 100 - total;
  return scaled;
}

function getAlignmentClasses(a: ColumnAlignment): { flex: string; text: string } {
  const justify = { top: 'justify-start', middle: 'justify-center', bottom: 'justify-end' } as const;
  const items = { left: 'items-start', center: 'items-center', right: 'items-end' } as const;
  const text = { left: 'text-left', center: 'text-center', right: 'text-right' } as const;
  return { flex: `${justify[a.v]} ${items[a.h]}`, text: text[a.h] };
}

// --- Component ---

interface DevelopmentTabProps {
  features: RoadmapFeature[];
}

export const DevelopmentTab = ({ features }: DevelopmentTabProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const [colWidths, setColWidths] = useState<number[]>(INITIAL_WIDTHS);
  const tableRef = useRef<HTMLDivElement>(null);
  const currentWidthsRef = useRef<number[]>(INITIAL_WIDTHS);

  const [devInProgressIds, setDevInProgressIds] = useState<Set<string>>(new Set());
  const [testInProgressIds, setTestInProgressIds] = useState<Set<string>>(new Set());

  const [headerHeight, setHeaderHeight] = useState(DEFAULT_HEADER_HEIGHT);
  const headerHeightRef = useRef(DEFAULT_HEADER_HEIGHT);
  headerHeightRef.current = headerHeight;

  const [widthPresets, setWidthPresets] = useState<WidthPreset[]>([]);
  const [saveWidthsOpen, setSaveWidthsOpen] = useState(false);
  const [savePresetName, setSavePresetName] = useState('');
  const saveWidthsRef = useRef<HTMLDivElement>(null);

  const [columnAlignments, setColumnAlignments] = useState<ColumnAlignment[]>(
    () => COLUMN_HEADERS.map(() => ({ ...DEFAULT_COLUMN_ALIGNMENT }))
  );
  const [alignmentDropdownOpen, setAlignmentDropdownOpen] = useState(false);
  const [alignmentTargetCol, setAlignmentTargetCol] = useState(0);
  const alignmentDropdownRef = useRef<HTMLDivElement>(null);

  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const viewDropdownRef = useRef<HTMLDivElement>(null);

  const [freezeRowCount, setFreezeRowCount] = useState<0 | 1>(1);
  const [frozenDataColCount, setFrozenDataColCount] = useState(0);

  const initialLoadDoneRef = useRef(false);

  const [colPxWidths, setColPxWidths] = useState<number[]>(() => COLUMN_HEADERS.map(() => 80));
  const frozenColLeftOffsets = useMemo(() => {
    const offsets: number[] = [];
    let acc = 0;
    for (let i = 0; i < COLUMN_HEADERS.length; i++) {
      offsets.push(acc);
      acc += colPxWidths[i] ?? 80;
    }
    return offsets;
  }, [colPxWidths]);

  const [selectionType, setSelectionType] = useState<SelectionType>(null);
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [selectedCol, setSelectedCol] = useState<number>(0);
  const isAllSelected = selectionType === 'all';

  // Load settings
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let data: ProjectProgressSettingsPayload | null = null;
      try {
        const result = await getProjectProgressSettings();
        if (cancelled) return;
        data = result.data;
      } catch {
        if (cancelled) return;
      }
      if (data && Array.isArray(data.colWidths) && data.colWidths.length === COLUMN_HEADERS.length) {
        const normalized = normalizeWidths(data.colWidths.map((n: number) => Number(n) || 0));
        setColWidths(normalized);
        currentWidthsRef.current = normalized;
        localStorage.setItem('project_progress_col_widths_v12', JSON.stringify(normalized));
      }
      if (data?.headerHeight != null) {
        const h = Number(data.headerHeight);
        if (!Number.isNaN(h) && h >= MIN_HEADER_HEIGHT && h <= MAX_HEADER_HEIGHT) {
          setHeaderHeight(h);
          localStorage.setItem(HEADER_HEIGHT_KEY, String(h));
        }
      }
      if (data?.columnAlignments && Array.isArray(data.columnAlignments) && data.columnAlignments.length === COLUMN_HEADERS.length) {
        const valid = data.columnAlignments.every(
          (p: { h: string; v: string }) =>
            ['left', 'center', 'right'].includes(p.h) && ['top', 'middle', 'bottom'].includes(p.v)
        );
        if (valid) {
          setColumnAlignments(data.columnAlignments as ColumnAlignment[]);
          localStorage.setItem(ALIGNMENT_STORAGE_KEY, JSON.stringify(data.columnAlignments));
        }
      }
      if (data?.freezeRowCount === 0 || data?.freezeRowCount === 1) {
        setFreezeRowCount(data.freezeRowCount);
        localStorage.setItem(FREEZE_ROW_STORAGE_KEY, String(data.freezeRowCount));
      }
      if (data?.frozenDataColCount != null) {
        const c = Number(data.frozenDataColCount);
        if (!Number.isNaN(c) && c >= 0 && c <= COLUMN_HEADERS.length) {
          setFrozenDataColCount(c);
          localStorage.setItem(FROZEN_DATA_COL_COUNT_KEY, String(c));
        }
      }
      if (data?.widthPresets && Array.isArray(data.widthPresets)) {
        const valid = data.widthPresets.filter(
          (p: { id: string; name: string; widths: number[] }) =>
            p && typeof p.id === 'string' && typeof p.name === 'string' && Array.isArray(p.widths) && p.widths.length === COLUMN_HEADERS.length
        );
        setWidthPresets(valid as WidthPreset[]);
        localStorage.setItem(WIDTH_PRESETS_KEY, JSON.stringify(valid));
      }
      if (data) {
        initialLoadDoneRef.current = true;
        return;
      }
      // Fallback: localStorage
      const saved = localStorage.getItem('project_progress_col_widths_v12');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === COLUMN_HEADERS.length) {
            const normalized = normalizeWidths(parsed.map((n: unknown) => Number(n) || 0));
            setColWidths(normalized);
            currentWidthsRef.current = normalized;
          }
        } catch (e) {
          console.error('Failed to parse saved widths', e);
        }
      }
      const savedHeight = localStorage.getItem(HEADER_HEIGHT_KEY);
      if (savedHeight) {
        const h = parseInt(savedHeight, 10);
        if (!Number.isNaN(h) && h >= MIN_HEADER_HEIGHT && h <= MAX_HEADER_HEIGHT) {
          setHeaderHeight(h);
        }
      }
      const savedAlign = localStorage.getItem(ALIGNMENT_STORAGE_KEY);
      if (savedAlign) {
        try {
          const parsed = JSON.parse(savedAlign) as unknown;
          if (Array.isArray(parsed) && parsed.length === COLUMN_HEADERS.length) {
            const valid = parsed.every(
              (p: unknown) =>
                typeof p === 'object' &&
                p !== null &&
                'h' in p &&
                'v' in p &&
                ['left', 'center', 'right'].includes((p as ColumnAlignment).h) &&
                ['top', 'middle', 'bottom'].includes((p as ColumnAlignment).v)
            );
            if (valid) setColumnAlignments(parsed as ColumnAlignment[]);
          }
        } catch (e) {
          console.error('Failed to parse saved alignments', e);
        }
      }
      const savedFreezeRow = localStorage.getItem(FREEZE_ROW_STORAGE_KEY);
      if (savedFreezeRow) {
        const r = parseInt(savedFreezeRow, 10);
        if (r === 0 || r === 1) setFreezeRowCount(r);
        else if (r === 2) setFreezeRowCount(1);
      }
      const savedFrozenCol = localStorage.getItem(FROZEN_DATA_COL_COUNT_KEY);
      if (savedFrozenCol) {
        const c = parseInt(savedFrozenCol, 10);
        if (!Number.isNaN(c) && c >= 0 && c <= COLUMN_HEADERS.length) setFrozenDataColCount(c);
      }
      const presetsRaw = localStorage.getItem(WIDTH_PRESETS_KEY);
      if (presetsRaw) {
        try {
          const parsed = JSON.parse(presetsRaw);
          if (Array.isArray(parsed)) {
            const valid = parsed.filter(
              (p: unknown): p is WidthPreset =>
                typeof p === 'object' &&
                p !== null &&
                'id' in p &&
                'name' in p &&
                'widths' in p &&
                Array.isArray((p as WidthPreset).widths) &&
                (p as WidthPreset).widths.length === COLUMN_HEADERS.length
            );
            setWidthPresets(valid);
          }
        } catch (e) {
          console.error('Failed to parse width presets', e);
        }
      }
      initialLoadDoneRef.current = true;
    })();
    return () => { cancelled = true; };
  }, []);

  // Persist settings to server
  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    const payload: ProjectProgressSettingsPayload = {
      colWidths,
      headerHeight,
      columnAlignments,
      freezeRowCount,
      frozenDataColCount,
      widthPresets,
    };
    const t = setTimeout(() => {
      void setProjectProgressSettings(payload);
    }, 500);
    return () => clearTimeout(t);
  }, [colWidths, headerHeight, columnAlignments, freezeRowCount, frozenDataColCount, widthPresets]);

  // Compute column pixel widths
  useEffect(() => {
    const container = tableRef.current;
    if (!container) return;
    const update = () => {
      const w = container.clientWidth;
      if (w <= 0) return;
      setColPxWidths(colWidths.map(pct => Math.max(40, (pct / 100) * w)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    return () => ro.disconnect();
  }, [colWidths]);

  const handleResizeStart = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.pageX;
    const startWidths = [...currentWidthsRef.current];
    const containerWidth = tableRef.current?.offsetWidth || 1000;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.pageX - startX;
      const deltaPercent = (deltaPx / containerWidth) * 100;
      const newWidths = [...startWidths];
      const left = newWidths[index] + deltaPercent;
      const right = newWidths[index + 1] - deltaPercent;
      const minPct = (8 / containerWidth) * 100;
      if (left >= minPct && right >= minPct) {
        newWidths[index] = left;
        newWidths[index + 1] = right;
        setColWidths(newWidths);
        currentWidthsRef.current = newWidths;
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      localStorage.setItem('project_progress_col_widths_v12', JSON.stringify(currentWidthsRef.current));
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleHeaderResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.pageY;
    const startHeight = headerHeightRef.current;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.pageY - startY;
      const next = Math.min(MAX_HEADER_HEIGHT, Math.max(MIN_HEADER_HEIGHT, startHeight + deltaY));
      setHeaderHeight(next);
      headerHeightRef.current = next;
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.userSelect = prevUserSelect;
      localStorage.setItem(HEADER_HEIGHT_KEY, String(headerHeightRef.current));
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const resetWidths = () => {
    setColWidths(INITIAL_WIDTHS);
    currentWidthsRef.current = INITIAL_WIDTHS;
    setHeaderHeight(DEFAULT_HEADER_HEIGHT);
    localStorage.removeItem('project_progress_col_widths_v12');
    localStorage.removeItem(HEADER_HEIGHT_KEY);
  };

  const persistPresets = (presets: WidthPreset[]) => {
    localStorage.setItem(WIDTH_PRESETS_KEY, JSON.stringify(presets));
  };

  const saveCurrentAsPreset = () => {
    const name = savePresetName.trim();
    if (!name) return;
    const preset: WidthPreset = { id: crypto.randomUUID(), name, widths: [...currentWidthsRef.current] };
    setWidthPresets(prev => {
      const next = [...prev, preset];
      persistPresets(next);
      return next;
    });
    setSavePresetName('');
  };

  const loadPreset = (preset: WidthPreset) => {
    setColWidths(preset.widths);
    currentWidthsRef.current = preset.widths;
    localStorage.setItem('project_progress_col_widths_v12', JSON.stringify(preset.widths));
    setSaveWidthsOpen(false);
  };

  const deletePreset = (id: string) => {
    setWidthPresets(prev => {
      const next = prev.filter(p => p.id !== id);
      persistPresets(next);
      return next;
    });
  };

  // Close save-widths dropdown
  useEffect(() => {
    if (!saveWidthsOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (saveWidthsRef.current && !saveWidthsRef.current.contains(e.target as Node)) setSaveWidthsOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSaveWidthsOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey); };
  }, [saveWidthsOpen]);

  // Filtering
  const filteredFeatures = useMemo(() => {
    return features.filter(f => {
      const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategories.size === 0 || selectedCategories.has(f.category);
      return matchesSearch && matchesCategory;
    });
  }, [features, searchQuery, selectedCategories]);

  const categoryList = useMemo(
    () => Array.from(new Set(features.map(f => f.category))).sort(),
    [features]
  );

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const clearCategories = () => {
    setSelectedCategories(new Set());
    setCategoryDropdownOpen(false);
  };

  // Close category dropdown
  useEffect(() => {
    if (!categoryDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) setCategoryDropdownOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setCategoryDropdownOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey); };
  }, [categoryDropdownOpen]);

  const setColumnAlignment = (colIndex: number, alignment: ColumnAlignment) => {
    setColumnAlignments(prev => {
      const next = [...prev];
      next[colIndex] = alignment;
      localStorage.setItem(ALIGNMENT_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  // Close alignment dropdown
  useEffect(() => {
    if (!alignmentDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (alignmentDropdownRef.current && !alignmentDropdownRef.current.contains(e.target as Node)) setAlignmentDropdownOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAlignmentDropdownOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey); };
  }, [alignmentDropdownOpen]);

  // Close view dropdown
  useEffect(() => {
    if (!viewDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(e.target as Node)) setViewDropdownOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setViewDropdownOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey); };
  }, [viewDropdownOpen]);

  // Helper to render a cell wrapper
  const CellWrapper = useCallback(({
    colIdx,
    rowIdx,
    children,
    extraClass,
  }: {
    colIdx: number;
    rowIdx: number;
    children: React.ReactNode;
    extraClass?: string;
  }) => {
    const isFrozen = colIdx < frozenDataColCount;
    const isFreezeBoundary = frozenDataColCount > 0 && colIdx === frozenDataColCount - 1;
    const isCellSelected = selectionType === 'cell' && selectedRow === rowIdx && selectedCol === colIdx;
    const isColSelected = selectionType === 'column' && selectedCol === colIdx;
    const alignClasses = getAlignmentClasses(columnAlignments[colIdx] ?? DEFAULT_COLUMN_ALIGNMENT);

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => { setSelectionType('cell'); setSelectedRow(rowIdx); setSelectedCol(colIdx); }}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectionType('cell'); setSelectedRow(rowIdx); setSelectedCol(colIdx); } }}
        className={clsx(
          'flex-shrink-0 flex-grow-0 px-4 py-4 flex flex-col min-w-0 overflow-hidden cursor-cell',
          isFreezeBoundary ? 'border-r-4 border-gray-300 dark:border-gray-600' : 'border-r border-border-light',
          (isCellSelected || isAllSelected) && 'bg-blue-500/20 ring-1 ring-inset ring-blue-500/40',
          isColSelected && 'bg-blue-500/10',
          alignClasses.flex,
          alignClasses.text,
          isFrozen && 'sticky bg-bg-primary',
          extraClass,
        )}
        style={{
          width: `${colWidths[colIdx]}%`,
          minWidth: 0,
          ...(isFrozen ? { left: frozenColLeftOffsets[colIdx], zIndex: 1 } : {}),
        }}
      >
        {children}
      </div>
    );
  }, [colWidths, frozenDataColCount, frozenColLeftOffsets, selectionType, selectedRow, selectedCol, isAllSelected, columnAlignments]);

  return (
    <>
      {/* Controls */}
      <div className="bg-bg-primary p-4 rounded-lg border border-border-default shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 flex-none transition-colors">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
            <input
              type="text"
              placeholder="Search features..."
              className="w-full bg-bg-secondary border border-border-default rounded-md pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-text-primary placeholder-text-muted transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/superadmin/settings/api_key_and_model_setting"
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border whitespace-nowrap',
                'bg-bg-primary border-border-default text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
              )}
            >
              API KEY
            </Link>
            <button
              type="button"
              onClick={() => setSelectedCategories(new Set())}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border whitespace-nowrap',
                selectedCategories.size === 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300'
                  : 'bg-bg-primary border-border-default text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
              )}
            >
              All
            </button>
            {/* Category filter dropdown */}
            <div className="relative" ref={categoryDropdownRef}>
              <button
                type="button"
                onClick={() => setCategoryDropdownOpen(open => !open)}
                aria-expanded={categoryDropdownOpen}
                aria-haspopup="listbox"
                className={clsx(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border whitespace-nowrap',
                  selectedCategories.size > 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300'
                    : 'bg-bg-primary border-border-default text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                )}
              >
                {selectedCategories.size === 0 ? '分類' : `分類 (${selectedCategories.size})`}
                <ChevronDown className={clsx('w-3.5 h-3.5 transition-transform', categoryDropdownOpen && 'rotate-180')} />
              </button>
              {categoryDropdownOpen && (
                <div className="absolute left-0 top-full mt-1 z-50 min-w-[220px] max-h-[280px] overflow-y-auto bg-bg-primary border border-border-default rounded-lg shadow-lg py-2" role="listbox">
                  {categoryList.map(cat => (
                    <label key={cat} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-bg-secondary text-sm text-text-primary">
                      <input type="checkbox" checked={selectedCategories.has(cat)} onChange={() => toggleCategory(cat)} className="rounded border-border-default text-emerald-600 focus:ring-emerald-500/20" />
                      <span className="truncate">{cat}</span>
                    </label>
                  ))}
                  {selectedCategories.size > 0 && (
                    <div className="border-t border-border-light mt-2 pt-2 px-3">
                      <button type="button" onClick={clearCategories} className="text-xs text-text-secondary hover:text-text-primary">清除</button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Alignment dropdown */}
            <div className="relative" ref={alignmentDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  if (selectionType === 'column' || selectionType === 'cell') setAlignmentTargetCol(selectedCol);
                  setAlignmentDropdownOpen(open => !open);
                }}
                aria-expanded={alignmentDropdownOpen}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border whitespace-nowrap bg-bg-primary border-border-default text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
                title="col位文字排版"
              >
                <AlignLeft className="w-3.5 h-3.5" />
                排版
                <ChevronDown className={clsx('w-3.5 h-3.5 transition-transform', alignmentDropdownOpen && 'rotate-180')} />
              </button>
              {alignmentDropdownOpen && (
                <div className="absolute left-0 top-full mt-1 z-50 min-w-[200px] bg-bg-primary border border-border-default rounded-lg shadow-lg p-3" role="dialog" aria-label="col位排版">
                  <p className="text-[10px] text-text-muted mb-2">套用至col位 {COLUMN_LETTERS[alignmentTargetCol]} – {COLUMN_HEADERS[alignmentTargetCol]?.zh}</p>
                  <p className="text-xs font-medium text-text-secondary mb-1">水平</p>
                  <div className="flex gap-1 mb-3">
                    {(['left', 'center', 'right'] as const).map(h => (
                      <button key={h} type="button" onClick={() => setColumnAlignment(alignmentTargetCol, { ...columnAlignments[alignmentTargetCol], h })}
                        className={clsx('flex-1 px-2 py-1.5 rounded text-xs border transition-colors',
                          columnAlignments[alignmentTargetCol]?.h === h
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300'
                            : 'bg-bg-secondary border-border-default text-text-secondary hover:bg-bg-secondary/80'
                        )}>
                        {h === 'left' ? '靠左' : h === 'center' ? '左右置中' : '靠右'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs font-medium text-text-secondary mb-1">垂直</p>
                  <div className="flex gap-1">
                    {(['top', 'middle', 'bottom'] as const).map(v => (
                      <button key={v} type="button" onClick={() => setColumnAlignment(alignmentTargetCol, { ...columnAlignments[alignmentTargetCol], v })}
                        className={clsx('flex-1 px-2 py-1.5 rounded text-xs border transition-colors',
                          columnAlignments[alignmentTargetCol]?.v === v
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300'
                            : 'bg-bg-secondary border-border-default text-text-secondary hover:bg-bg-secondary/80'
                        )}>
                        {v === 'top' ? '靠上' : v === 'middle' ? '上下置中' : '靠下'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* View dropdown */}
            <div className="relative" ref={viewDropdownRef}>
              <button type="button" onClick={() => setViewDropdownOpen(open => !open)} aria-expanded={viewDropdownOpen}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border whitespace-nowrap bg-bg-primary border-border-default text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
                title="檢視選項">
                <Eye className="w-3.5 h-3.5" />
                View
                <ChevronDown className={clsx('w-3.5 h-3.5 transition-transform', viewDropdownOpen && 'rotate-180')} />
              </button>
              {viewDropdownOpen && (
                <div className="absolute left-0 top-full mt-1 z-50 min-w-[200px] bg-bg-primary border border-border-default rounded-lg shadow-lg py-2" role="menu">
                  <div className="px-3 py-1.5 text-[10px] font-medium text-text-muted uppercase tracking-wide">凍結窗格</div>
                  <div className="border-t border-border-light mt-1 pt-1">
                    <div className="px-3 py-1 text-[10px] text-text-muted">列</div>
                    {([0, 1] as const).map((n) => (
                      <button key={n} type="button" role="menuitem"
                        onClick={() => { setFreezeRowCount(n); localStorage.setItem(FREEZE_ROW_STORAGE_KEY, String(n)); setViewDropdownOpen(false); }}
                        className={clsx('w-full text-left px-3 py-2 text-sm transition-colors',
                          freezeRowCount === n ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-medium' : 'text-text-primary hover:bg-bg-secondary'
                        )}>
                        {n === 0 ? '不凍結列' : '凍結第 1 row'}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-border-light mt-1 pt-1">
                    <div className="px-3 py-1 text-[10px] text-text-muted">col（亦可拖曳凍結線）</div>
                    <div className="max-h-[240px] overflow-y-auto">
                      {[
                        { n: 0, label: '不凍結col' },
                        ...Array.from({ length: COLUMN_HEADERS.length }, (_, i) => ({
                          n: i + 1,
                          label: i === 0 ? '凍結第 1 col' : `凍結第 1 ~ ${i + 1} col`,
                        })),
                      ].map(({ n, label }) => (
                        <button key={n} type="button" role="menuitem"
                          onClick={() => { setFrozenDataColCount(n); localStorage.setItem(FROZEN_DATA_COL_COUNT_KEY, String(n)); setViewDropdownOpen(false); }}
                          className={clsx('w-full text-left px-3 py-2 text-sm transition-colors',
                            frozenDataColCount === n ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-medium' : 'text-text-primary hover:bg-bg-secondary'
                          )}>
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
          <div className="relative" ref={saveWidthsRef}>
            <button type="button" onClick={() => setSaveWidthsOpen(open => !open)} aria-expanded={saveWidthsOpen}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary bg-bg-primary border border-border-default rounded-md hover:bg-bg-secondary hover:text-text-primary transition-colors whitespace-nowrap"
              title="Save or load column width presets">
              <Save className="w-3.5 h-3.5" />
              Save Widths
            </button>
            {saveWidthsOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-72 bg-bg-primary border border-border-default rounded-lg shadow-lg p-3" role="dialog">
                <div className="space-y-3">
                  <div>
                    <label htmlFor="preset-name" className="block text-xs font-medium text-text-secondary mb-1">Save current layout as</label>
                    <div className="flex gap-2">
                      <input id="preset-name" type="text" value={savePresetName} onChange={e => setSavePresetName(e.target.value)}
                        placeholder="e.g. macOS Chrome, Windows 1920"
                        className="flex-1 min-w-0 bg-bg-secondary border border-border-default rounded-md px-2 py-1.5 text-sm text-text-primary placeholder-text-muted focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        onKeyDown={e => e.key === 'Enter' && saveCurrentAsPreset()} />
                      <button type="button" onClick={saveCurrentAsPreset} disabled={!savePresetName.trim()}
                        className="px-2 py-1.5 text-xs font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none">
                        Save
                      </button>
                    </div>
                  </div>
                  {widthPresets.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-text-secondary mb-2">Saved presets</p>
                      <ul className="space-y-1 max-h-40 overflow-y-auto">
                        {widthPresets.map(p => (
                          <li key={p.id} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded bg-bg-secondary/50 hover:bg-bg-secondary">
                            <span className="text-sm text-text-primary truncate">{p.name}</span>
                            <span className="flex gap-1 flex-shrink-0">
                              <button type="button" onClick={() => loadPreset(p)} className="text-xs text-emerald-600 hover:text-emerald-500">Load</button>
                              <button type="button" onClick={() => deletePreset(p.id)} className="text-xs text-text-muted hover:text-red-500">Delete</button>
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
          <button onClick={resetWidths}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary bg-bg-primary border border-border-default rounded-md hover:bg-bg-secondary hover:text-text-primary transition-colors whitespace-nowrap"
            title="Reset column widths and header row height to default">
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Widths
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-bg-primary border border-border-default rounded-lg shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 transition-colors">
        <div className="overflow-y-auto flex-1 min-h-0" ref={tableRef}>
          {/* Header */}
          <div
            className={clsx(
              'z-10 bg-bg-secondary flex flex-col w-full min-w-0 shrink-0',
              freezeRowCount > 0 ? 'sticky top-0 border-b-4 border-gray-300 dark:border-gray-600' : 'border-b border-border-default'
            )}
            style={{ minHeight: headerHeight, height: headerHeight }}
          >
            <div className="flex flex-1 min-h-0 w-full">
              <div className="flex flex-1 min-w-0">
                {COLUMN_HEADERS.map((header, idx) => {
                  const { flex: alignFlex, text: alignText } = getAlignmentClasses(columnAlignments[idx] ?? DEFAULT_COLUMN_ALIGNMENT);
                  const isColSelected = (selectionType === 'column' && selectedCol === idx) || isAllSelected;
                  const isFrozen = idx < frozenDataColCount;
                  const isFreezeBoundary = frozenDataColCount > 0 && idx === frozenDataColCount - 1;
                  return (
                    <div
                      key={header.en}
                      role="button"
                      tabIndex={0}
                      onClick={() => { setSelectionType('column'); setSelectedCol(idx); setSelectedRow(0); }}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectionType('column'); setSelectedCol(idx); setSelectedRow(0); } }}
                      className={clsx(
                        'relative flex-shrink-0 flex-grow-0 px-4 py-3 text-xs font-semibold text-text-secondary tracking-wider flex flex-col overflow-hidden min-h-0 cursor-pointer',
                        isFreezeBoundary ? 'border-r-4 border-gray-300 dark:border-gray-600' : 'border-r border-border-default last:border-r-0',
                        alignFlex, alignText,
                        isColSelected && 'bg-blue-500/15 ring-inset ring-1 ring-blue-500/40',
                        isFrozen && 'sticky bg-bg-secondary'
                      )}
                      style={{ width: `${colWidths[idx]}%`, minWidth: 0, ...(isFrozen ? { left: frozenColLeftOffsets[idx], zIndex: 2 } : {}) }}
                    >
                      <span className="uppercase break-words w-full leading-tight line-clamp-2">{header.en}</span>
                      <span className="text-[10px] text-text-muted break-words w-full leading-tight line-clamp-1">{header.zh}</span>
                      {idx < COLUMN_HEADERS.length - 1 && (
                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-10 active:bg-blue-600"
                          onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(idx, e); }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {freezeRowCount > 0 && (
              <div role="separator" aria-label="調整標題列高度"
                className="absolute left-0 right-0 bottom-0 h-2 cursor-row-resize hover:bg-blue-400/30 active:bg-blue-500/50 z-20 flex items-center justify-center group"
                onMouseDown={handleHeaderResizeStart}>
                <span className="opacity-0 group-hover:opacity-100 text-[10px] text-text-muted">拖曳調整高度</span>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="divide-y divide-border-light">
            {filteredFeatures.map((feature, rowIdx) => {
              const isRowSelected = selectionType === 'row' && selectedRow === rowIdx;
              return (
                <div key={feature.name}
                  className={clsx(
                    'flex items-stretch transition-colors group min-h-[80px] min-w-0 w-full',
                    isRowSelected ? 'bg-blue-500/10' : isAllSelected ? 'bg-blue-500/5' : 'hover:bg-bg-secondary'
                  )}>
                  <div className="flex flex-1 min-w-0">
                    {/* 1. ID */}
                    <CellWrapper colIdx={0} rowIdx={rowIdx} extraClass="px-2">
                      <div className="font-mono text-xs text-text-secondary bg-bg-primary border border-border-default px-1.5 py-0.5 rounded h-fit">
                        {(rowIdx + 1).toString().padStart(3, '0')}
                      </div>
                    </CellWrapper>
                    {/* 2. Category */}
                    <CellWrapper colIdx={1} rowIdx={rowIdx}>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-bg-tertiary text-text-primary truncate max-w-full" title={feature.category}>
                        {feature.category}
                      </span>
                    </CellWrapper>
                    {/* 3. Feature（功能需求名稱 ＋ 功能需求說明書URL） */}
                    <CellWrapper colIdx={2} rowIdx={rowIdx}>
                      <div className="text-sm text-text-primary break-words w-full line-clamp-3" title={feature.name}>
                        <span className="font-medium">{feature.name}</span>
                        {feature.featureSpecDocPath ? (
                          (() => {
                            const sp = feature.featureSpecDocPath.trim();
                            const isDocsScope = sp.startsWith('/docs/');
                            const scope = isDocsScope ? 'docs' : 'project';
                            const pathParam = isDocsScope ? sp.slice(6) : sp.replace(/^\//, '');
                            const href = `/superadmin/docs?scope=${scope}&path=${encodeURIComponent(pathParam)}`;
                            return (
                              <>
                                <span className="text-text-secondary"> - </span>
                                <a href={href} className="text-blue-500 hover:underline" title={sp}>
                                  {(rowIdx + 1).toString().padStart(3, '0')}-Dev-Spec-URL
                                </a>
                              </>
                            );
                          })()
                        ) : null}
                      </div>
                    </CellWrapper>
                    {/* 4. 開發進度與報告 */}
                    <CellWrapper colIdx={3} rowIdx={rowIdx}>
                      {feature.docPath ? (() => {
                        const docPath = feature.docPath.trim();
                        const isDocsScope = docPath.startsWith('/docs/');
                        const scope = isDocsScope ? 'docs' : 'project';
                        const pathParam = isDocsScope ? docPath.slice(6) : docPath.replace(/^\//, '');
                        const docsHref = `/superadmin/docs?scope=${scope}&path=${encodeURIComponent(pathParam)}`;
                        const label = `${(rowIdx + 1).toString().padStart(3, '0')}-Dev-Process-and-Summary-URL`;
                        return (
                          <a href={docsHref} className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline truncate max-w-full" title={docPath}>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{label}</span>
                          </a>
                        );
                      })() : <span className="text-text-muted italic text-xs">—</span>}
                    </CellWrapper>
                    {/* 5. Dev Progress (開發進度)：完成數/TODO數 + 齒輪(設定) + 綠色箭頭(開始執行) */}
                    <CellWrapper colIdx={4} rowIdx={rowIdx}>
                      <div className="flex flex-row flex-wrap items-center gap-1.5 w-full min-w-0">
                        <span className="text-xs text-text-primary font-mono flex-shrink-0">
                          {`${feature.devCompletedCount ?? 0}/${feature.devTodoCount ?? 0}`}
                        </span>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); /* TODO: open dev prompt settings */ }}
                          className="p-0.5 rounded hover:bg-bg-secondary transition-colors text-text-secondary hover:text-text-primary"
                          title="Dev prompt settings"
                          aria-label="Dev prompt settings"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setDevInProgressIds(prev => new Set(prev).add(feature.name)); }}
                          className="p-0.5 rounded hover:bg-bg-secondary transition-colors"
                          title="開始執行"
                          aria-label="開始執行"
                        >
                          <Play className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                        </button>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setDevInProgressIds(prev => { const n = new Set(prev); n.delete(feature.name); return n; }); }}
                          className="p-0.5 rounded hover:bg-bg-secondary transition-colors text-black dark:text-gray-200"
                          title="停止"
                          aria-label="停止"
                        >
                          <Square className="w-4 h-4" />
                        </button>
                      </div>
                    </CellWrapper>
                    {/* 6. TTD Spec URL */}
                    <CellWrapper colIdx={5} rowIdx={rowIdx}>
                      {feature.tddSpecDocPath ? (() => {
                        const tp = feature.tddSpecDocPath.trim();
                        const isDocsScope = tp.startsWith('/docs/');
                        const scope = isDocsScope ? 'docs' : 'project';
                        const pathParam = isDocsScope ? tp.slice(6) : tp.replace(/^\//, '');
                        const href = `/superadmin/docs?scope=${scope}&path=${encodeURIComponent(pathParam)}`;
                        const label = `${(rowIdx + 1).toString().padStart(3, '0')}-TTD-Spec-URL`;
                        return (
                          <a href={href} className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline truncate max-w-full" title={tp}>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{label}</span>
                          </a>
                        );
                      })() : <span className="text-text-muted italic text-xs">—</span>}
                    </CellWrapper>
                    {/* 7. 測試腳本數量 */}
                    <CellWrapper colIdx={6} rowIdx={rowIdx}>
                      {(() => {
                        const count = feature.testScriptCount ?? 0;
                        const path = feature.testScriptPath ?? DEFAULT_TEST_SCRIPT_PATH;
                        const href = `/superadmin/docs?scope=project&path=${encodeURIComponent(path)}`;
                        return (
                          <a href={href} className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline" title={`測試腳本目錄: ${path}`}>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            <span>{count}</span>
                          </a>
                        );
                      })()}
                    </CellWrapper>
                    {/* 8. Test Script Pass Rate (測試腳本通過率)：通過數/總數 + 齒輪(設定) + 綠色箭頭(開始) + 方格(停止) */}
                    <CellWrapper colIdx={7} rowIdx={rowIdx}>
                      <div className="flex flex-row flex-wrap items-center gap-1.5 w-full min-w-0" title={feature.testProgress ? String(feature.testProgress) : undefined}>
                        <span className="text-xs text-text-primary font-mono flex-shrink-0">
                          {`${feature.testScriptPassedCount ?? 0}/${feature.testScriptCount ?? 0}`}
                        </span>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); /* TODO: open test prompt settings */ }}
                          className="p-0.5 rounded hover:bg-bg-secondary transition-colors text-text-secondary hover:text-text-primary"
                          title="Test prompt settings"
                          aria-label="Test prompt settings"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        {testInProgressIds.has(feature.name) ? (
                          <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" aria-label="測試執行中" />
                        ) : (
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); setTestInProgressIds(prev => new Set(prev).add(feature.name)); }}
                            className="p-0.5 rounded hover:bg-bg-secondary transition-colors"
                            title="開始執行測試"
                            aria-label="開始執行測試"
                          >
                            <Play className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setTestInProgressIds(prev => { const n = new Set(prev); n.delete(feature.name); return n; }); }}
                          className="p-0.5 rounded hover:bg-bg-secondary transition-colors text-black dark:text-gray-200"
                          title="停止"
                          aria-label="停止"
                        >
                          <Square className="w-4 h-4" />
                        </button>
                      </div>
                    </CellWrapper>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};
