'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import {
  Search,
  ChevronDown,
  RotateCcw,
  Save,
  AlignLeft,
  Eye,
  Plus,
} from 'lucide-react';

import type {
  ColumnAlignment,
  SelectionType,
  DevTabSettings,
  ProgressRow,
  WidthPreset,
} from './types';
import { COLUMN_HEADERS, COLUMN_LETTERS } from './types';
export interface TableToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categoryList: string[];
  selectedCategories: Set<string>;
  onToggleCategory: (cat: string) => void;
  onClearCategories: () => void;
  categoryFilterSingle: string;
  onCategoryFilterSingleChange: (cat: string) => void;
  // Alignment
  columnAlignments: ColumnAlignment[];
  onSetColumnAlignment: (colIndex: number, alignment: ColumnAlignment) => void;
  selectedCol: number;
  selectionType: SelectionType;
  // View settings
  freezeRowCount: 0 | 1;
  frozenDataColCount: number;
  showHiddenRows: boolean;
  hiddenRowKeysSet: Set<string>;
  hiddenRowsList: { key: string; row: ProgressRow | undefined }[];
  onPatchPrefs: (patch: Partial<DevTabSettings>) => void;
  onShowHiddenRowsChange: (show: boolean) => void;
  // Width presets
  widthPresets: WidthPreset[];
  onResetWidths: () => void;
  onSavePreset: (name: string) => void;
  onLoadPreset: (preset: WidthPreset) => void;
  onDeletePreset: (id: string) => void;
  // Add row
  onAddRowOpen: () => void;
}
export default function TableToolbar({
  searchQuery,
  onSearchChange,
  categoryList,
  selectedCategories,
  onToggleCategory,
  onClearCategories,
  categoryFilterSingle,
  onCategoryFilterSingleChange,
  columnAlignments,
  onSetColumnAlignment,
  selectedCol,
  selectionType,
  freezeRowCount,
  frozenDataColCount,
  showHiddenRows,
  hiddenRowKeysSet,
  hiddenRowsList,
  onPatchPrefs,
  onShowHiddenRowsChange,
  widthPresets,
  onResetWidths,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  onAddRowOpen,
}: TableToolbarProps) {
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [alignmentDropdownOpen, setAlignmentDropdownOpen] = useState(false);
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const [saveWidthsOpen, setSaveWidthsOpen] = useState(false);
  const [alignmentTargetCol, setAlignmentTargetCol] = useState(0);
  const [savePresetName, setSavePresetName] = useState('');
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const alignmentDropdownRef = useRef<HTMLDivElement>(null);
  const viewDropdownRef = useRef<HTMLDivElement>(null);
  const saveWidthsRef = useRef<HTMLDivElement>(null);
  const closeAll = useCallback(() => {
    setCategoryDropdownOpen(false);
    setAlignmentDropdownOpen(false);
    setViewDropdownOpen(false);
    setSaveWidthsOpen(false);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (categoryDropdownOpen && categoryDropdownRef.current && !categoryDropdownRef.current.contains(target)) {
        setCategoryDropdownOpen(false);
      }
      if (alignmentDropdownOpen && alignmentDropdownRef.current && !alignmentDropdownRef.current.contains(target)) {
        setAlignmentDropdownOpen(false);
      }
      if (viewDropdownOpen && viewDropdownRef.current && !viewDropdownRef.current.contains(target)) {
        setViewDropdownOpen(false);
      }
      if (saveWidthsOpen && saveWidthsRef.current && !saveWidthsRef.current.contains(target)) {
        setSaveWidthsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAll();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [categoryDropdownOpen, alignmentDropdownOpen, viewDropdownOpen, saveWidthsOpen, closeAll]);
  const handleSavePreset = () => {
    if (!savePresetName.trim()) return;
    onSavePreset(savePresetName.trim());
    setSavePresetName('');
  };
  return (
    <div className="bg-bg-primary p-4 rounded-lg border border-border-default shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 flex-none transition-colors">
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
          <input
            type="text"
            placeholder="Search features..."
            className="w-full bg-bg-secondary border border-border-default rounded-md pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-text-primary placeholder-text-muted transition-all"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onClearCategories}
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
                    <input type="checkbox" checked={selectedCategories.has(cat)} onChange={() => onToggleCategory(cat)} className="rounded border-border-default text-emerald-600 focus:ring-emerald-500/20" />
                    <span className="truncate">{cat}</span>
                  </label>
                ))}
                {selectedCategories.size > 0 && (
                  <div className="border-t border-border-light mt-2 pt-2 px-3">
                    <button type="button" onClick={onClearCategories} className="text-xs text-text-secondary hover:text-text-primary">清除</button>
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
                    <button key={h} type="button" onClick={() => onSetColumnAlignment(alignmentTargetCol, { ...columnAlignments[alignmentTargetCol], h })}
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
                    <button key={v} type="button" onClick={() => onSetColumnAlignment(alignmentTargetCol, { ...columnAlignments[alignmentTargetCol], v })}
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
                {/* Freeze rows */}
                <div className="border-t border-border-light mt-1 pt-1">
                  <div className="px-3 py-1 text-[10px] text-text-muted">列</div>
                  {([0, 1] as const).map((n) => (
                    <button key={n} type="button" role="menuitem"
                      onClick={() => { onPatchPrefs({ freezeRowCount: n }); setViewDropdownOpen(false); }}
                      className={clsx('w-full text-left px-3 py-2 text-sm transition-colors',
                        freezeRowCount === n ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-medium' : 'text-text-primary hover:bg-bg-secondary'
                      )}>
                      {n === 0 ? '不凍結列' : '凍結第 1 row'}
                    </button>
                  ))}
                </div>
                {/* Freeze columns */}
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
                        onClick={() => { onPatchPrefs({ frozenDataColCount: n }); setViewDropdownOpen(false); }}
                        className={clsx('w-full text-left px-3 py-2 text-sm transition-colors',
                          frozenDataColCount === n ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-medium' : 'text-text-primary hover:bg-bg-secondary'
                        )}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Hidden rows */}
                <div className="border-t border-border-light mt-1 pt-1">
                  <div className="px-3 py-1 text-[10px] text-text-muted">Row</div>
                  <label className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-bg-secondary text-sm text-text-primary">
                    <input
                      type="checkbox"
                      checked={showHiddenRows}
                      onChange={(e) => onShowHiddenRowsChange(e.target.checked)}
                      className="rounded border-border-default text-emerald-600 focus:ring-emerald-500/20"
                    />
                    <span className="truncate">顯示隱藏列 {hiddenRowKeysSet.size > 0 ? `(${hiddenRowKeysSet.size})` : ''}</span>
                  </label>
                  {hiddenRowKeysSet.size > 0 && (
                    <>
                      <div className="px-3 pb-1">
                        <button
                          type="button"
                          onClick={() => onPatchPrefs({ hiddenRowKeys: [] })}
                          className="text-xs text-text-secondary hover:text-text-primary"
                        >
                          取消所有隱藏
                        </button>
                      </div>
                      <div className="max-h-[240px] overflow-y-auto border-t border-border-light mt-1 pt-1">
                        {hiddenRowsList.map(({ key, row }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              onPatchPrefs({ hiddenRowKeys: [...hiddenRowKeysSet].filter(k => k !== key) });
                            }}
                            className="w-full text-left px-3 py-2 text-sm transition-colors text-text-primary hover:bg-bg-secondary"
                            title="取消隱藏"
                          >
                            <span className="block truncate text-xs text-text-muted">{key}</span>
                            <span className="block truncate">{row ? `${row.__rowId} — ${row.name}` : '（Row 已不存在）'}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
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
                      onKeyDown={e => e.key === 'Enter' && handleSavePreset()} />
                    <button type="button" onClick={handleSavePreset} disabled={!savePresetName.trim()}
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
                            <button type="button" onClick={() => onLoadPreset(p)} className="text-xs text-emerald-600 hover:text-emerald-500">Load</button>
                            <button type="button" onClick={() => onDeletePreset(p.id)} className="text-xs text-text-muted hover:text-red-500">Delete</button>
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
        <button onClick={onResetWidths}
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary bg-bg-primary border border-border-default rounded-md hover:bg-bg-secondary hover:text-text-primary transition-colors whitespace-nowrap"
          title="Reset column widths and header row height to default">
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Widths
        </button>
        <button
          type="button"
          onClick={onAddRowOpen}
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary bg-bg-primary border border-border-default rounded-md hover:bg-bg-secondary hover:text-text-primary transition-colors whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          新增 Row
        </button>
      </div>
    </div>
  );
}
