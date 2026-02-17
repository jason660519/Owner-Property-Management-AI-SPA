'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ROADMAP_DATA, RoadmapFeature } from '@/app/data/roadmap';
import { 
  PieChart, 
  Activity, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Layers, 
  ExternalLink,
  Search,
  Download,
  Filter,
  RotateCcw,
  ChevronDown,
  Save,
  AlignLeft,
  Play,
  Loader2,
  Pause,
  Square
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Types ---

interface ColumnWidths {
  [key: number]: string;
}

// --- Components ---

const ProgressBar = ({ percentage }: { percentage: number }) => {
  return (
    <div className="relative w-full h-5 bg-bg-tertiary rounded-full overflow-hidden shadow-inner">
      <div 
        className={clsx(
          "h-full rounded-full transition-all duration-500 absolute top-0 left-0 flex items-center justify-center",
          percentage === 100 ? "bg-emerald-500" : 
          percentage > 0 ? "bg-blue-500" : "bg-bg-secondary"
        )}
        style={{ width: `${percentage}%` }}
      >
        {percentage > 0 && percentage < 100 && (
          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-bar-stripes_1s_linear_infinite]" />
        )}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-white drop-shadow-md">
          {percentage}%
        </span>
      </div>
    </div>
  );
};

const StatCard = ({ 
  label, 
  value, 
  subValue, 
  icon: Icon, 
  colorClass,
  bgClass
}: { 
  label: string; 
  value: string | number; 
  subValue?: string;
  icon: React.ElementType; 
  colorClass: string;
  bgClass: string;
}) => (
  <div className="bg-bg-primary p-4 rounded-xl border border-border-default shadow-sm flex items-center gap-4 transition-colors">
    <div className={clsx("p-3 rounded-lg", bgClass, colorClass)}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-sm text-text-secondary font-medium">{label}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-bold text-text-primary">{value}</h3>
        {subValue && <span className="text-xs text-text-muted">{subValue}</span>}
      </div>
    </div>
  </div>
);

// Initial percentages (must sum to 100): 1.ID … 9.DEV PROMPT 10.Start Dev 11.Last Modified
const INITIAL_WIDTHS = [4, 9, 13, 17, 24, 8, 7, 7, 8, 6, 7];

const COLUMN_HEADERS = [
    { en: 'ID', zh: '編碼' },
    { en: 'Category', zh: '分類' },
    { en: 'Feature', zh: '功能需求名稱' },
    { en: 'Acceptance Criteria and Test standard', zh: '完成標準 與測試標準 URL' },
    { en: 'Dev Progress & Log Report', zh: '開發進度與日誌報告 URL' },
    { en: 'TEST STANDARD & LOG URL', zh: '測試標準與測試進度報告 URL' },
    { en: 'Dev Progress', zh: '開發進度' },
    { en: 'Test Coverage', zh: '測試進度' },
    { en: 'MODEL & PROMPT', zh: '選擇模型與設計提示詞' },
    { en: 'Start Dev', zh: '開始開發' },
    { en: 'Last Modified', zh: '最後修改者' }
];

/** Excel-style column letters A..K for 11 data columns */
const COLUMN_LETTERS = COLUMN_HEADERS.map((_, i) => String.fromCharCode(65 + i));

const ROW_NUMBER_COLUMN_WIDTH = 40;

const WIDTH_PRESETS_KEY = 'project_progress_col_widths_presets_v9';
const HEADER_HEIGHT_KEY = 'project_progress_header_height_v1';
const DEFAULT_HEADER_HEIGHT = 56;
const MIN_HEADER_HEIGHT = 40;
const MAX_HEADER_HEIGHT = 120;

interface WidthPreset {
  id: string;
  name: string;
  widths: number[];
}

type HAlign = 'left' | 'center' | 'right';
type VAlign = 'top' | 'middle' | 'bottom';
interface ColumnAlignment {
  h: HAlign;
  v: VAlign;
}

const ALIGNMENT_STORAGE_KEY = 'project_progress_col_alignments_v1';
const DEFAULT_COLUMN_ALIGNMENT: ColumnAlignment = { h: 'left', v: 'top' };

/** Normalize width percentages to sum to 100 to avoid overflow/blank space */
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

export default function ProjectProgressPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Column resizing state (11 columns)
  const [colWidths, setColWidths] = useState<number[]>(INITIAL_WIDTHS);
  const tableRef = useRef<HTMLDivElement>(null);
  const currentWidthsRef = useRef<number[]>(INITIAL_WIDTHS);

  // Start Dev: which features are in "developing" state (show spinner; pause/stop available)
  const [devInProgressIds, setDevInProgressIds] = useState<Set<string>>(new Set());

  // Header row height (user-resizable, persisted)
  const [headerHeight, setHeaderHeight] = useState(DEFAULT_HEADER_HEIGHT);
  const headerHeightRef = useRef(DEFAULT_HEADER_HEIGHT);
  headerHeightRef.current = headerHeight;

  // Width presets (multiple saved layouts for different OS/display)
  const [widthPresets, setWidthPresets] = useState<WidthPreset[]>([]);
  const [saveWidthsOpen, setSaveWidthsOpen] = useState(false);
  const [savePresetName, setSavePresetName] = useState('');
  const saveWidthsRef = useRef<HTMLDivElement>(null);

  // Column alignment (per-column horizontal + vertical), persisted
  const [columnAlignments, setColumnAlignments] = useState<ColumnAlignment[]>(
    () => COLUMN_HEADERS.map(() => ({ ...DEFAULT_COLUMN_ALIGNMENT }))
  );
  const [alignmentDropdownOpen, setAlignmentDropdownOpen] = useState(false);
  const [alignmentTargetCol, setAlignmentTargetCol] = useState(0);
  const alignmentDropdownRef = useRef<HTMLDivElement>(null);

  // Excel-style selection: cell, whole column, whole row, or all (corner = 全選)
  type SelectionType = 'cell' | 'column' | 'row' | 'all' | null;
  const [selectionType, setSelectionType] = useState<SelectionType>(null);
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [selectedCol, setSelectedCol] = useState<number>(0);
  const isAllSelected = selectionType === 'all';

  // Load saved widths and presets on mount
  useEffect(() => {
    const saved = localStorage.getItem('project_progress_col_widths_v11');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 11) {
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
              (p as WidthPreset).widths.length === 11
          );
          setWidthPresets(valid);
        }
      } catch (e) {
        console.error('Failed to parse width presets', e);
      }
    }
  }, []);

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
      const right = newWidths[index+1] - deltaPercent;
      
      // Min width check (approx 8px in %)
      // We use a small safety margin
      const minPct = (8 / containerWidth) * 100;
      
      if (left >= minPct && right >= minPct) {
        newWidths[index] = left;
        newWidths[index+1] = right;
        setColWidths(newWidths);
        currentWidthsRef.current = newWidths;
      }
    };
    
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      localStorage.setItem('project_progress_col_widths_v11', JSON.stringify(currentWidthsRef.current));
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
    localStorage.removeItem('project_progress_col_widths_v11');
    localStorage.removeItem(HEADER_HEIGHT_KEY);
  };

  const persistPresets = (presets: WidthPreset[]) => {
    localStorage.setItem(WIDTH_PRESETS_KEY, JSON.stringify(presets));
  };

  const saveCurrentAsPreset = () => {
    const name = savePresetName.trim();
    if (!name) return;
    const preset: WidthPreset = {
      id: crypto.randomUUID(),
      name,
      widths: [...currentWidthsRef.current],
    };
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
    localStorage.setItem('project_progress_col_widths_v11', JSON.stringify(preset.widths));
    setSaveWidthsOpen(false);
  };

  const deletePreset = (id: string) => {
    setWidthPresets(prev => {
      const next = prev.filter(p => p.id !== id);
      persistPresets(next);
      return next;
    });
  };

  // Close save-widths dropdown on click outside or Escape
  useEffect(() => {
    if (!saveWidthsOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (saveWidthsRef.current && !saveWidthsRef.current.contains(e.target as Node)) {
        setSaveWidthsOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSaveWidthsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [saveWidthsOpen]);

  // Stats Calculation
  const stats = useMemo(() => {
    const features = ROADMAP_DATA.features;
    const totalPoints = features.reduce((sum, f) => sum + (f.points || 1), 0);
    const completedWeighted = features.reduce((sum, f) => sum + ((f.points || 1) * f.percentage), 0);
    const overallProgress = totalPoints ? (completedWeighted / totalPoints) : 0;
    
    return {
      totalFeatures: features.length,
      overallProgress: Math.round(overallProgress),
      completedCount: features.filter(f => f.percentage === 100).length,
      inProgressCount: features.filter(f => f.percentage > 0 && f.percentage < 100).length,
      pendingCount: features.filter(f => f.percentage === 0).length,
      totalPoints
    };
  }, []);

  // Filtering: empty selectedCategories = show all; otherwise show only features in selected set
  const filteredFeatures = useMemo(() => {
    return ROADMAP_DATA.features.filter(f => {
      const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           f.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategories.size === 0 || selectedCategories.has(f.category);
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategories]);

  const categoryList = useMemo(
    () => Array.from(new Set(ROADMAP_DATA.features.map(f => f.category))).sort(),
    []
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

  // Close category dropdown on click outside or Escape
  useEffect(() => {
    if (!categoryDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCategoryDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [categoryDropdownOpen]);

  const setColumnAlignment = (colIndex: number, alignment: ColumnAlignment) => {
    setColumnAlignments(prev => {
      const next = [...prev];
      next[colIndex] = alignment;
      localStorage.setItem(ALIGNMENT_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  // Close alignment dropdown on click outside or Escape
  useEffect(() => {
    if (!alignmentDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (alignmentDropdownRef.current && !alignmentDropdownRef.current.contains(e.target as Node)) {
        setAlignmentDropdownOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAlignmentDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [alignmentDropdownOpen]);

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-1 flex-none">
        <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
          <Activity className="text-emerald-600 w-6 h-6" />
          Project Progress Dashboard (專案進度儀表板)
        </h1>
        <p className="text-text-secondary text-sm">
          Track development progress across all modules. Last updated: <span className="font-mono font-medium text-text-primary">{ROADMAP_DATA.lastUpdated}</span>
        </p>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-none">
        {/* Overall Progress Circular */}
        <div className="bg-bg-primary p-4 rounded-xl border border-border-default shadow-sm flex items-center gap-4 col-span-1 md:col-span-2 lg:col-span-1 transition-colors">
          <div className="relative w-16 h-16 flex-shrink-0">
             <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-bg-tertiary"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="text-blue-600 transition-all duration-1000 ease-out"
                  strokeDasharray={`${stats.overallProgress}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-text-primary">{stats.overallProgress}%</span>
              </div>
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary">總體開發進度</h2>
            <p className="text-xs text-text-secondary">Weighted by Story Points</p>
            <p className="text-xs text-text-muted mt-1">{stats.totalFeatures} Features</p>
          </div>
        </div>

        <StatCard 
          label="已完成 (Completed)" 
          value={stats.completedCount} 
          icon={CheckCircle2} 
          bgClass="bg-green-50" 
          colorClass="text-green-600" 
        />
        <StatCard 
          label="進行中 (In Progress)" 
          value={stats.inProgressCount} 
          icon={Clock} 
          bgClass="bg-blue-50" 
          colorClass="text-blue-600" 
        />
        <StatCard 
          label="未開始 (Pending)" 
          value={stats.pendingCount} 
          subValue={`/ ${stats.totalPoints} SP`}
          icon={Layers} 
          bgClass="bg-gray-100" 
          colorClass="text-gray-600" 
        />
      </div>

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
            <button
              type="button"
              onClick={() => setSelectedCategories(new Set())}
              className={clsx(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border whitespace-nowrap",
                selectedCategories.size === 0
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300"
                  : "bg-bg-primary border-border-default text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
              )}
            >
              All
            </button>
            <div className="relative" ref={categoryDropdownRef}>
              <button
                type="button"
                onClick={() => setCategoryDropdownOpen(open => !open)}
                aria-expanded={categoryDropdownOpen}
                aria-haspopup="listbox"
                className={clsx(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border whitespace-nowrap",
                  selectedCategories.size > 0
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300"
                    : "bg-bg-primary border-border-default text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
                )}
              >
                {selectedCategories.size === 0 ? '分類' : `分類 (${selectedCategories.size})`}
                <ChevronDown className={clsx("w-3.5 h-3.5 transition-transform", categoryDropdownOpen && "rotate-180")} />
              </button>
              {categoryDropdownOpen && (
                <div
                  className="absolute left-0 top-full mt-1 z-50 min-w-[220px] max-h-[280px] overflow-y-auto bg-bg-primary border border-border-default rounded-lg shadow-lg py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  role="listbox"
                >
                  {categoryList.map(cat => (
                    <label
                      key={cat}
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-bg-secondary text-sm text-text-primary"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.has(cat)}
                        onChange={() => toggleCategory(cat)}
                        className="rounded border-border-default text-emerald-600 focus:ring-emerald-500/20"
                      />
                      <span className="truncate">{cat}</span>
                    </label>
                  ))}
                  {selectedCategories.size > 0 && (
                    <div className="border-t border-border-light mt-2 pt-2 px-3">
                      <button
                        type="button"
                        onClick={clearCategories}
                        className="text-xs text-text-secondary hover:text-text-primary"
                      >
                        清除
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* 排版：選擇欄位後設定水平/垂直對齊 */}
            <div className="relative" ref={alignmentDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  if (selectionType === 'column' || selectionType === 'cell') setAlignmentTargetCol(selectedCol);
                  setAlignmentDropdownOpen(open => !open);
                }}
                aria-expanded={alignmentDropdownOpen}
                aria-haspopup="listbox"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border whitespace-nowrap bg-bg-primary border-border-default text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
                title="欄位文字排版（靠左/置中/靠右、靠上/置中/靠下）。可先點選欄位 A–K 或儲存格再設定。"
              >
                <AlignLeft className="w-3.5 h-3.5" />
                排版
                <ChevronDown className={clsx("w-3.5 h-3.5 transition-transform", alignmentDropdownOpen && "rotate-180")} />
              </button>
              {alignmentDropdownOpen && (
                <div
                  className="absolute left-0 top-full mt-1 z-50 min-w-[200px] bg-bg-primary border border-border-default rounded-lg shadow-lg p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  role="dialog"
                  aria-label="欄位排版"
                >
                  <p className="text-[10px] text-text-muted mb-2">套用至欄位 {COLUMN_LETTERS[alignmentTargetCol]} – {COLUMN_HEADERS[alignmentTargetCol]?.zh}</p>
                  <p className="text-xs font-medium text-text-secondary mb-1">水平</p>
                  <div className="flex gap-1 mb-3">
                    {(['left', 'center', 'right'] as const).map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setColumnAlignment(alignmentTargetCol, { ...columnAlignments[alignmentTargetCol], h })}
                        className={clsx(
                          "flex-1 px-2 py-1.5 rounded text-xs border transition-colors",
                          columnAlignments[alignmentTargetCol]?.h === h
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300"
                            : "bg-bg-secondary border-border-default text-text-secondary hover:bg-bg-secondary/80"
                        )}
                      >
                        {h === 'left' ? '靠左' : h === 'center' ? '左右置中' : '靠右'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs font-medium text-text-secondary mb-1">垂直</p>
                  <div className="flex gap-1">
                    {(['top', 'middle', 'bottom'] as const).map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setColumnAlignment(alignmentTargetCol, { ...columnAlignments[alignmentTargetCol], v })}
                        className={clsx(
                          "flex-1 px-2 py-1.5 rounded text-xs border transition-colors",
                          columnAlignments[alignmentTargetCol]?.v === v
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300"
                            : "bg-bg-secondary border-border-default text-text-secondary hover:bg-bg-secondary/80"
                        )}
                      >
                        {v === 'top' ? '靠上' : v === 'middle' ? '上下置中' : '靠下'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative" ref={saveWidthsRef}>
            <button
              type="button"
              onClick={() => setSaveWidthsOpen(open => !open)}
              aria-expanded={saveWidthsOpen}
              aria-haspopup="dialog"
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary bg-bg-primary border border-border-default rounded-md hover:bg-bg-secondary hover:text-text-primary transition-colors whitespace-nowrap"
              title="Save or load column width presets (e.g. per OS/display)"
            >
              <Save className="w-3.5 h-3.5" />
              Save Widths
            </button>
            {saveWidthsOpen && (
              <div
                className="absolute right-0 top-full mt-1 z-50 w-72 bg-bg-primary border border-border-default rounded-lg shadow-lg p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                role="dialog"
                aria-label="Save or load width presets"
              >
                <div className="space-y-3">
                  <div>
                    <label htmlFor="preset-name" className="block text-xs font-medium text-text-secondary mb-1">
                      Save current layout as
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="preset-name"
                        type="text"
                        value={savePresetName}
                        onChange={e => setSavePresetName(e.target.value)}
                        placeholder="e.g. macOS Chrome, Windows 1920"
                        className="flex-1 min-w-0 bg-bg-secondary border border-border-default rounded-md px-2 py-1.5 text-sm text-text-primary placeholder-text-muted focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        onKeyDown={e => e.key === 'Enter' && saveCurrentAsPreset()}
                      />
                      <button
                        type="button"
                        onClick={saveCurrentAsPreset}
                        disabled={!savePresetName.trim()}
                        className="px-2 py-1.5 text-xs font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                  {widthPresets.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-text-secondary mb-2">Saved presets</p>
                      <ul className="space-y-1 max-h-40 overflow-y-auto">
                        {widthPresets.map(p => (
                          <li
                            key={p.id}
                            className="flex items-center justify-between gap-2 py-1.5 px-2 rounded bg-bg-secondary/50 hover:bg-bg-secondary"
                          >
                            <span className="text-sm text-text-primary truncate">{p.name}</span>
                            <span className="flex gap-1 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => loadPreset(p)}
                                className="text-xs text-emerald-600 hover:text-emerald-500"
                              >
                                Load
                              </button>
                              <button
                                type="button"
                                onClick={() => deletePreset(p.id)}
                                className="text-xs text-text-muted hover:text-red-500"
                              >
                                Delete
                              </button>
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
          <button
            onClick={resetWidths}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary bg-bg-primary border border-border-default rounded-md hover:bg-bg-secondary hover:text-text-primary transition-colors whitespace-nowrap"
            title="Reset column widths and header row height to default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Widths
          </button>
        </div>
      </div>

      {/* Table: Excel-style row numbers (1,2,3…) + column letters (A–K); click cell/column/row to select for 排版 */}
      <div className="bg-bg-primary border border-border-default rounded-lg shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 transition-colors">
        <div className="overflow-y-auto flex-1 min-h-0" ref={tableRef}>
          {/* Sticky header: row1 = corner + A..K letters; row2 = corner + 11 column headers (resizable height) */}
          <div
            className="sticky top-0 z-10 border-b border-border-default bg-bg-secondary flex flex-col w-full min-w-0 shrink-0"
            style={{ minHeight: headerHeight, height: headerHeight }}
          >
            {/* Row 1: 欄位字母 A..K（與 Title 列以格子線分開） */}
            <div className="flex flex-1 min-h-0 w-full border-b border-border-default">
              {/* Corner (top-left)：點擊 = 全選所有格子 */}
              <button
                type="button"
                onClick={() => { setSelectionType('all'); setSelectedRow(0); setSelectedCol(0); }}
                className={clsx(
                  "flex-shrink-0 border-r border-b border-border-default sticky left-0 z-10 transition-colors min-h-[22px] cursor-pointer",
                  isAllSelected ? "bg-blue-500/30 ring-1 ring-inset ring-blue-500/50" : "bg-bg-secondary hover:bg-bg-tertiary"
                )}
                style={{ width: ROW_NUMBER_COLUMN_WIDTH, minWidth: ROW_NUMBER_COLUMN_WIDTH }}
                title="全選所有格子"
                aria-label="全選所有格子"
              />
              {/* Column letters A..K - 每格有右、下邊線 */}
              <div className="flex flex-1 min-w-0">
                {COLUMN_LETTERS.map((letter, idx) => (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => { setSelectionType('column'); setSelectedCol(idx); setSelectedRow(0); }}
                    className={clsx(
                      "flex-shrink-0 flex-grow-0 flex items-center justify-center px-1 py-0.5 text-[10px] font-semibold border-r border-b border-border-default hover:bg-blue-500/20 transition-colors min-h-[22px]",
                      (selectionType === 'column' && selectedCol === idx) || isAllSelected ? "bg-blue-500/30 text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-500/50" : ""
                    )}
                    style={{ width: `${colWidths[idx]}%`, minWidth: 0 }}
                    title={`欄 ${letter} – ${COLUMN_HEADERS[idx].zh}`}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            </div>
            {/* Row 2: Title 列（編碼、分類、功能需求名稱…） */}
            <div className="flex flex-1 min-h-0 w-full">
              {/* Corner (second row) - sticky when horizontal scroll；全選時一起反白 */}
              <div
                className={clsx(
                  "flex-shrink-0 border-r border-border-default sticky left-0 z-10",
                  isAllSelected ? "bg-blue-500/20" : "bg-bg-secondary"
                )}
                style={{ width: ROW_NUMBER_COLUMN_WIDTH, minWidth: ROW_NUMBER_COLUMN_WIDTH }}
              />
              {/* 11 column headers with resize handles - 上方格子線與 A..K 列分開 */}
              <div className="flex flex-1 min-w-0">
                {COLUMN_HEADERS.map((header, idx) => {
                  const { flex: alignFlex, text: alignText } = getAlignmentClasses(columnAlignments[idx] ?? DEFAULT_COLUMN_ALIGNMENT);
                  const isColSelected = (selectionType === 'column' && selectedCol === idx) || isAllSelected;
                  return (
                  <div
                    key={header.en}
                    role="button"
                    tabIndex={0}
                    onClick={() => { setSelectionType('column'); setSelectedCol(idx); setSelectedRow(0); }}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectionType('column'); setSelectedCol(idx); setSelectedRow(0); } }}
                    className={clsx(
                      "relative flex-shrink-0 flex-grow-0 px-4 py-3 text-xs font-semibold text-text-secondary tracking-wider flex flex-col border-r border-border-default last:border-r-0 overflow-hidden min-h-0 cursor-pointer",
                      alignFlex,
                      alignText,
                      isColSelected && "bg-blue-500/15 ring-inset ring-1 ring-blue-500/40"
                    )}
                    style={{ width: `${colWidths[idx]}%`, minWidth: 0 }}
                  >
                    <span className="uppercase break-words w-full leading-tight line-clamp-2">{header.en}</span>
                    <span className="text-[10px] text-text-muted break-words w-full leading-tight line-clamp-1">{header.zh}</span>
                    {idx < 10 && (
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-10 active:bg-blue-600"
                        onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(idx, e); }}
                      />
                    )}
                  </div>
                ); })}
              </div>
            </div>
            {/* Drag handle to resize header row height */}
            <div
              role="separator"
              aria-label="調整標題列高度"
              className="absolute left-0 right-0 bottom-0 h-2 cursor-row-resize hover:bg-blue-400/30 active:bg-blue-500/50 z-20 flex items-center justify-center group"
              onMouseDown={handleHeaderResizeStart}
            >
              <span className="opacity-0 group-hover:opacity-100 text-[10px] text-text-muted">拖曳調整高度</span>
            </div>
          </div>

          {/* Body rows: row number column (1,2,3…) + 11 data columns; click row# = select row, click cell = select cell */}
           <div className="divide-y divide-border-light">
              {filteredFeatures.map((feature, rowIdx) => {
                  const isRowSelected = selectionType === 'row' && selectedRow === rowIdx;
                  return (
                  <div 
                    key={feature.name}
                    className={clsx(
                      "flex items-stretch transition-colors group min-h-[80px] min-w-0 w-full",
                      isRowSelected ? "bg-blue-500/10" : isAllSelected ? "bg-blue-500/5" : "hover:bg-bg-secondary"
                    )}
                  >
                      {/* Row number (1, 2, 3…) - click to select whole row */}
                      <button
                        type="button"
                        onClick={() => { setSelectionType('row'); setSelectedRow(rowIdx); setSelectedCol(0); }}
                        className={clsx(
                          "flex-shrink-0 flex items-center justify-center border-r border-border-light bg-bg-primary group-hover:bg-bg-secondary/80 text-xs font-medium text-text-muted hover:text-text-primary transition-colors sticky left-0 z-[1]",
                          (isRowSelected || isAllSelected) && "bg-blue-500/20 text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-500/30"
                        )}
                        style={{ width: ROW_NUMBER_COLUMN_WIDTH, minWidth: ROW_NUMBER_COLUMN_WIDTH }}
                        title={`列 ${rowIdx + 1}`}
                        aria-label={`選取第 ${rowIdx + 1} 列`}
                      >
                        {rowIdx + 1}
                      </button>
                      {/* 11 data columns in a flex-1 wrapper so % widths align with header */}
                      <div className="flex flex-1 min-w-0">
                      {/* 1. ID */}
                      <div 
                        role="button"
                        tabIndex={0}
                        onClick={() => { setSelectionType('cell'); setSelectedRow(rowIdx); setSelectedCol(0); }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectionType('cell'); setSelectedRow(rowIdx); setSelectedCol(0); } }}
                        className={clsx(
                          "flex-shrink-0 flex-grow-0 px-2 py-4 flex flex-col border-r border-border-light overflow-hidden cursor-cell",
                          ((selectionType === 'cell' && selectedRow === rowIdx && selectedCol === 0) || isAllSelected) && "bg-blue-500/20 ring-1 ring-inset ring-blue-500/40",
                          (selectionType === 'column' && selectedCol === 0) && "bg-blue-500/10",
                          getAlignmentClasses(columnAlignments[0] ?? DEFAULT_COLUMN_ALIGNMENT).flex,
                          getAlignmentClasses(columnAlignments[0] ?? DEFAULT_COLUMN_ALIGNMENT).text
                        )}
                        style={{ width: `${colWidths[0]}%`, minWidth: 0 }}
                      >
                          <div className="font-mono text-xs text-text-secondary bg-bg-primary border border-border-default px-1.5 py-0.5 rounded h-fit">
                              {(rowIdx + 1).toString().padStart(3, '0')}
                          </div>
                      </div>

                      {/* 2. Category */}
                      <div 
                        role="button"
                        tabIndex={0}
                        onClick={() => { setSelectionType('cell'); setSelectedRow(rowIdx); setSelectedCol(1); }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectionType('cell'); setSelectedRow(rowIdx); setSelectedCol(1); } }}
                        className={clsx(
                          "flex-shrink-0 flex-grow-0 px-4 py-4 border-r border-border-light flex flex-col min-w-0 overflow-hidden cursor-cell",
                          ((selectionType === 'cell' && selectedRow === rowIdx && selectedCol === 1) || isAllSelected) && "bg-blue-500/20 ring-1 ring-inset ring-blue-500/40",
                          (selectionType === 'column' && selectedCol === 1) && "bg-blue-500/10",
                          getAlignmentClasses(columnAlignments[1] ?? DEFAULT_COLUMN_ALIGNMENT).flex,
                          getAlignmentClasses(columnAlignments[1] ?? DEFAULT_COLUMN_ALIGNMENT).text
                        )}
                        style={{ width: `${colWidths[1]}%` }}
                      >
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-bg-tertiary text-text-primary truncate max-w-full" title={feature.category}>
                              {feature.category}
                          </span>
                      </div>

                      {/* 3. Feature */}
                      <div 
                        role="button"
                        tabIndex={0}
                        onClick={() => { setSelectionType('cell'); setSelectedRow(rowIdx); setSelectedCol(2); }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectionType('cell'); setSelectedRow(rowIdx); setSelectedCol(2); } }}
                        className={clsx(
                          "flex-shrink-0 flex-grow-0 px-4 py-4 border-r border-border-light flex flex-col min-w-0 overflow-hidden cursor-cell",
                          ((selectionType === 'cell' && selectedRow === rowIdx && selectedCol === 2) || isAllSelected) && "bg-blue-500/20 ring-1 ring-inset ring-blue-500/40",
                          (selectionType === 'column' && selectedCol === 2) && "bg-blue-500/10",
                          getAlignmentClasses(columnAlignments[2] ?? DEFAULT_COLUMN_ALIGNMENT).flex,
                          getAlignmentClasses(columnAlignments[2] ?? DEFAULT_COLUMN_ALIGNMENT).text
                        )}
                        style={{ width: `${colWidths[2]}%` }}
                      >
                          <h3 className="text-sm font-medium text-text-primary break-words w-full line-clamp-3" title={feature.name}>{feature.name}</h3>
                      </div>

                      {/* 4. Acceptance Criteria and Test standard */}
                      <div 
                        role="button"
                        tabIndex={0}
                        onClick={() => { setSelectionType('cell'); setSelectedRow(rowIdx); setSelectedCol(3); }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectionType('cell'); setSelectedRow(rowIdx); setSelectedCol(3); } }}
                        className={clsx(
                          "flex-shrink-0 flex-grow-0 px-4 py-4 border-r border-border-light flex flex-col min-w-0 overflow-hidden cursor-cell",
                          ((selectionType === 'cell' && selectedRow === rowIdx && selectedCol === 3) || isAllSelected) && "bg-blue-500/20 ring-1 ring-inset ring-blue-500/40",
                          (selectionType === 'column' && selectedCol === 3) && "bg-blue-500/10",
                          getAlignmentClasses(columnAlignments[3] ?? DEFAULT_COLUMN_ALIGNMENT).flex,
                          getAlignmentClasses(columnAlignments[3] ?? DEFAULT_COLUMN_ALIGNMENT).text
                        )}
                        style={{ width: `${colWidths[3]}%` }}
                      >
                        <div className="text-xs text-text-secondary whitespace-pre-line break-words w-full line-clamp-3" title={feature.acceptanceCriteria}>
                            {feature.acceptanceCriteria}
                        </div>
                      </div>

                      {/* 5. 開發進度與日誌報告 URL（docPath） */}
                      <div 
                        role="button"
                        tabIndex={0}
                        onClick={() => { setSelectionType('cell'); setSelectedRow(rowIdx); setSelectedCol(4); }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectionType('cell'); setSelectedRow(rowIdx); setSelectedCol(4); } }}
                        className={clsx(
                          "flex-shrink-0 flex-grow-0 px-4 py-4 border-r border-border-light flex flex-col min-w-0 overflow-hidden cursor-cell",
                          ((selectionType === 'cell' && selectedRow === rowIdx && selectedCol === 4) || isAllSelected) && "bg-blue-500/20 ring-1 ring-inset ring-blue-500/40",
                          (selectionType === 'column' && selectedCol === 4) && "bg-blue-500/10",
                          getAlignmentClasses(columnAlignments[4] ?? DEFAULT_COLUMN_ALIGNMENT).flex,
                          getAlignmentClasses(columnAlignments[4] ?? DEFAULT_COLUMN_ALIGNMENT).text
                        )}
                        style={{ width: `${colWidths[4]}%` }}
                      >
                          {feature.docPath ? (() => {
                              const docPath = feature.docPath.trim();
                              const isDocsScope = docPath.startsWith('/docs/');
                              const scope = isDocsScope ? 'docs' : 'project';
                              const pathParam = isDocsScope ? docPath.slice(6) : docPath.replace(/^\//, '');
                              const docsHref = `/superadmin/docs?scope=${scope}&path=${encodeURIComponent(pathParam)}`;
                              return (
                                  <a href={docsHref} className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline truncate max-w-full" title={docPath}>
                                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                      <span className="truncate">{docPath}</span>
                                  </a>
                              );
                          })() : <span className="text-text-muted italic text-xs">—</span>}
                      </div>

                      {/* 6. TEST STANDARD & LOG URL（testProgress） */}
                      <div 
                        role="button"
                        tabIndex={0}
                        onClick={() => { setSelectionType('cell'); setSelectedRow(rowIdx); setSelectedCol(5); }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectionType('cell'); setSelectedRow(rowIdx); setSelectedCol(5); } }}
                        className={clsx(
                          "flex-shrink-0 flex-grow-0 px-4 py-4 border-r border-border-light flex flex-col min-w-0 overflow-hidden cursor-cell",
                          ((selectionType === 'cell' && selectedRow === rowIdx && selectedCol === 5) || isAllSelected) && "bg-blue-500/20 ring-1 ring-inset ring-blue-500/40",
                          (selectionType === 'column' && selectedCol === 5) && "bg-blue-500/10",
                          getAlignmentClasses(columnAlignments[5] ?? DEFAULT_COLUMN_ALIGNMENT).flex,
                          getAlignmentClasses(columnAlignments[5] ?? DEFAULT_COLUMN_ALIGNMENT).text
                        )}
                        style={{ width: `${colWidths[5]}%` }}
                      >
                          <div className="text-xs text-text-secondary whitespace-pre-line break-words w-full line-clamp-3" title={feature.testProgress ? String(feature.testProgress) : undefined}>
                              {feature.testProgress ? feature.testProgress : <span className="text-text-muted italic">No test info</span>}
                          </div>
                      </div>

                      {/* 7. Dev Progress */}
                      <div 
                        role="button"
                        tabIndex={0}
                        onClick={() => { setSelectionType('cell'); setSelectedRow(rowIdx); setSelectedCol(6); }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectionType('cell'); setSelectedRow(rowIdx); setSelectedCol(6); } }}
                        className={clsx(
                          "flex-shrink-0 flex-grow-0 px-4 py-4 border-r border-border-light flex flex-col min-w-0 overflow-hidden cursor-cell",
                          ((selectionType === 'cell' && selectedRow === rowIdx && selectedCol === 6) || isAllSelected) && "bg-blue-500/20 ring-1 ring-inset ring-blue-500/40",
                          (selectionType === 'column' && selectedCol === 6) && "bg-blue-500/10",
                          getAlignmentClasses(columnAlignments[6] ?? DEFAULT_COLUMN_ALIGNMENT).flex,
                          getAlignmentClasses(columnAlignments[6] ?? DEFAULT_COLUMN_ALIGNMENT).text
                        )}
                        style={{ width: `${colWidths[6]}%` }}
                      >
                          <div className="w-full min-w-0">
                              <ProgressBar percentage={feature.percentage} />
                          </div>
                      </div>

                      {/* 8. Test Coverage */}
                      <div 
                        role="button"
                        tabIndex={0}
                        onClick={() => { setSelectionType('cell'); setSelectedRow(rowIdx); setSelectedCol(7); }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectionType('cell'); setSelectedRow(rowIdx); setSelectedCol(7); } }}
                        className={clsx(
                          "flex-shrink-0 flex-grow-0 px-4 py-4 border-r border-border-light flex flex-col min-w-0 overflow-hidden cursor-cell",
                          ((selectionType === 'cell' && selectedRow === rowIdx && selectedCol === 7) || isAllSelected) && "bg-blue-500/20 ring-1 ring-inset ring-blue-500/40",
                          (selectionType === 'column' && selectedCol === 7) && "bg-blue-500/10",
                          getAlignmentClasses(columnAlignments[7] ?? DEFAULT_COLUMN_ALIGNMENT).flex,
                          getAlignmentClasses(columnAlignments[7] ?? DEFAULT_COLUMN_ALIGNMENT).text
                        )}
                        style={{ width: `${colWidths[7]}%` }}
                      >
                          <div className="w-full min-w-0">
                              <ProgressBar percentage={feature.testCoverage || 0} />
                          </div>
                      </div>

                      {/* 9. DEV PROMPT */}
                      <div 
                        role="button"
                        tabIndex={0}
                        onClick={() => { setSelectionType('cell'); setSelectedRow(rowIdx); setSelectedCol(8); }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectionType('cell'); setSelectedRow(rowIdx); setSelectedCol(8); } }}
                        className={clsx(
                          "flex-shrink-0 flex-grow-0 px-4 py-4 border-r border-border-light flex flex-col min-w-0 overflow-hidden cursor-cell",
                          ((selectionType === 'cell' && selectedRow === rowIdx && selectedCol === 8) || isAllSelected) && "bg-blue-500/20 ring-1 ring-inset ring-blue-500/40",
                          (selectionType === 'column' && selectedCol === 8) && "bg-blue-500/10",
                          getAlignmentClasses(columnAlignments[8] ?? DEFAULT_COLUMN_ALIGNMENT).flex,
                          getAlignmentClasses(columnAlignments[8] ?? DEFAULT_COLUMN_ALIGNMENT).text
                        )}
                        style={{ width: `${colWidths[8]}%` }}
                      >
                        <div className="text-xs text-text-secondary whitespace-pre-line break-words w-full line-clamp-3" title={feature.aiPrompt ? String(feature.aiPrompt) : undefined}>
                            {feature.aiPrompt ? feature.aiPrompt : <span className="text-text-muted italic">—</span>}
                        </div>
                      </div>

                      {/* 10. Start Dev 開始開發 */}
                      <div 
                        role="button"
                        tabIndex={0}
                        onClick={() => { setSelectionType('cell'); setSelectedRow(rowIdx); setSelectedCol(9); }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectionType('cell'); setSelectedRow(rowIdx); setSelectedCol(9); } }}
                        className={clsx(
                          "flex-shrink-0 flex-grow-0 px-4 py-4 border-r border-border-light flex flex-col min-w-0 overflow-hidden cursor-cell",
                          ((selectionType === 'cell' && selectedRow === rowIdx && selectedCol === 9) || isAllSelected) && "bg-blue-500/20 ring-1 ring-inset ring-blue-500/40",
                          (selectionType === 'column' && selectedCol === 9) && "bg-blue-500/10",
                          getAlignmentClasses(columnAlignments[9] ?? DEFAULT_COLUMN_ALIGNMENT).flex,
                          getAlignmentClasses(columnAlignments[9] ?? DEFAULT_COLUMN_ALIGNMENT).text
                        )}
                        style={{ width: `${colWidths[9]}%` }}
                      >
                        <div className="flex items-center justify-center gap-2 flex-wrap w-full min-w-0">
                          {devInProgressIds.has(feature.name) ? (
                            <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" aria-label="開發中" />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDevInProgressIds(prev => new Set(prev).add(feature.name))}
                              className="p-1 rounded hover:bg-bg-secondary transition-colors"
                              title="開始開發"
                            >
                              <Play className="w-5 h-5 text-emerald-600 fill-emerald-600" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDevInProgressIds(prev => { const n = new Set(prev); n.delete(feature.name); return n; })}
                            className="p-1 rounded hover:bg-bg-secondary transition-colors text-pink-500"
                            title="暫緩"
                          >
                            <Pause className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDevInProgressIds(prev => { const n = new Set(prev); n.delete(feature.name); return n; })}
                            className="p-1 rounded hover:bg-bg-secondary transition-colors text-black dark:text-gray-200"
                            title="停止"
                          >
                            <Square className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* 11. Last Modified */}
                      <div 
                        role="button"
                        tabIndex={0}
                        onClick={() => { setSelectionType('cell'); setSelectedRow(rowIdx); setSelectedCol(10); }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectionType('cell'); setSelectedRow(rowIdx); setSelectedCol(10); } }}
                        className={clsx(
                          "flex-shrink-0 flex-grow-0 px-4 py-4 flex flex-col border-border-light min-w-0 overflow-hidden cursor-cell",
                          ((selectionType === 'cell' && selectedRow === rowIdx && selectedCol === 10) || isAllSelected) && "bg-blue-500/20 ring-1 ring-inset ring-blue-500/40",
                          (selectionType === 'column' && selectedCol === 10) && "bg-blue-500/10",
                          getAlignmentClasses(columnAlignments[10] ?? DEFAULT_COLUMN_ALIGNMENT).flex,
                          getAlignmentClasses(columnAlignments[10] ?? DEFAULT_COLUMN_ALIGNMENT).text
                        )}
                        style={{ width: `${colWidths[10]}%` }}
                      >
                          <div className="text-xs text-text-muted">
                              <p className="truncate" title={feature.lastModifiedBy}>{feature.lastModifiedBy}</p>
                              <p className="font-mono mt-0.5 text-[10px] truncate">{feature.lastModifiedDate}</p>
                          </div>
                      </div>
                      </div>
                  </div>
                  );
              })}
           </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #e5e7eb;
          border-radius: 20px;
        }
        @keyframes progress-bar-stripes {
            0% { background-position: 1rem 0; }
            100% { background-position: 0 0; }
        }
      `}</style>
    </div>
  );
}
