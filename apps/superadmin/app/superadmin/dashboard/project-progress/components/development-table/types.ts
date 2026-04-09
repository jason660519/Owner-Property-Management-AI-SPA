// filepath: project-progress/components/development-table/types.ts
// Shared types, constants, and utilities for the DevelopmentTab table

import type { RoadmapFeature } from '@/app/data/roadmap';
import type { CustomProjectProgressRowPayload } from '../../types';

// --- Column alignment ---
export type HAlign = 'left' | 'center' | 'right';
export type VAlign = 'top' | 'middle' | 'bottom';
export interface ColumnAlignment {
  h: HAlign;
  v: VAlign;
}

// --- Width presets ---
export interface WidthPreset {
  id: string;
  name: string;
  widths: number[];
}

// --- Selection ---
export type SelectionType = 'cell' | 'column' | 'row' | 'all' | null;

// --- IDE & Status ---
export type IDEOption = '' | 'Cursor' | 'VSCode' | 'Antigravity' | 'Claude CLI' | 'TRAE';
export type RowStatus = '' | 'completed' | 'in_progress' | 'not_started' | 'on_hold';
export type RowSource = 'roadmap' | 'custom';

// --- Row type (RoadmapFeature + source tracking) ---
export type ProgressRow = RoadmapFeature & {
  __rowId: string;
  __source: RowSource;
};

// --- Persisted settings ---
export interface DevTabSettings extends Record<string, unknown> {
  colWidths: number[];
  headerHeight: number;
  columnAlignments: ColumnAlignment[];
  freezeRowCount: 0 | 1;
  frozenDataColCount: number;
  widthPresets: WidthPreset[];
  customRows: CustomProjectProgressRowPayload[];
  hiddenRowKeys: string[];
}

// --- Column header definition ---
export interface ColumnHeaderDef {
  en: string;
  zh: string;
}

export const COLUMN_HEADERS: ColumnHeaderDef[] = [
  { en: 'ID', zh: '編碼' },
  { en: 'Role/General', zh: '按Role或通用分類' },
  { en: 'Located Page', zh: '按所屬頁面分類' },
  { en: 'Feature', zh: '按功能需求分類' },
  { en: 'DEV-SPEC (.md)', zh: '功能規格 .md' },
  { en: 'TDD Spec (.md)', zh: 'TDD 規格說明書 .md' },
  { en: 'TDD Progress Report (.md)', zh: 'TDD 進度報告 .md' },
  { en: 'Unit and Integration Test Script Folder Name', zh: '單元與整合測試腳本資料夾名稱' },
  { en: 'E2E Acceptance Test Script Folder Name', zh: '端到端測試腳本目錄名稱' },
  { en: 'TDD Progress', zh: 'TDD進度' },
  { en: 'E2E Test Progress', zh: 'E2E測試進度' },
  { en: 'Prompt and IDE Setting', zh: 'Prompt 與 IDE 設定' },
  { en: 'Status', zh: '狀態' },
  { en: 'Notes', zh: '備註' },
];

export const COLUMN_LETTERS = COLUMN_HEADERS.map((_, i) => String.fromCharCode(65 + i));

export const IDE_OPTIONS: IDEOption[] = ['', 'Cursor', 'VSCode', 'Antigravity', 'Claude CLI', 'TRAE'];

// --- Layout constants ---
export const INITIAL_WIDTHS = [4, 4, 6, 6, 22, 19, 10, 8, 10, 8, 8, 13, 6, 8];
export const TABLE_SCROLL_MIN_WIDTH_PX = 1600;
export const DEFAULT_HEADER_HEIGHT = 56;
export const MIN_HEADER_HEIGHT = 40;
export const MAX_HEADER_HEIGHT = 120;
export const DEFAULT_COLUMN_ALIGNMENT: ColumnAlignment = { h: 'left', v: 'middle' };

export const DEV_TAB_PAGE_KEY = 'project_progress';
export const DEV_TAB_STORAGE_KEY = 'project_progress_settings_v2';

export const DEV_TAB_DEFAULTS: DevTabSettings = {
  colWidths: INITIAL_WIDTHS,
  headerHeight: DEFAULT_HEADER_HEIGHT,
  columnAlignments: COLUMN_HEADERS.map(() => ({ ...DEFAULT_COLUMN_ALIGNMENT })),
  freezeRowCount: 1,
  frozenDataColCount: 0,
  widthPresets: [],
  customRows: [],
  hiddenRowKeys: [],
};

// --- Frozen column styling ---
export const FREEZE_ROW_EDGE_CLASS = 'border-gray-300 dark:border-gray-600';
export const FREEZE_COL_LINE = [
  'relative',
  "after:content-['']",
  'after:absolute after:right-0 after:top-0 after:bottom-0',
  'after:w-1',
  'after:bg-gray-300 dark:after:bg-gray-600',
  'after:z-20',
  'after:pointer-events-none',
].join(' ');

// --- Utility functions ---

export function deriveRowStatus(feature: RoadmapFeature): RowStatus {
  const progressText = `${feature.developmentProgress ?? ''} ${feature.testProgress ?? ''}`.toLowerCase();
  if (progressText.match(/暫緩|暫停|on hold/)) return 'on_hold';

  const pct = typeof feature.percentage === 'number' ? feature.percentage : undefined;
  if (pct != null) {
    if (pct >= 100) return 'completed';
    if (pct > 0) return 'in_progress';
  }

  if (feature.phase === 'operations' || feature.phase === 'deployment') return 'completed';
  if (feature.phase === 'testing' || feature.testStatus === 'in_progress') return 'in_progress';

  return 'not_started';
}

export function normalizeRowIdInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^\d+$/.test(trimmed)) return trimmed.padStart(3, '0');
  return trimmed;
}

export function getRowKey(source: RowSource, rowId: string): string {
  return `${source}:${rowId}`;
}

export function normalizeWidths(widths: number[]): number[] {
  const sum = widths.reduce((a, b) => a + b, 0);
  if (sum <= 0) return [...INITIAL_WIDTHS];
  const scaled = widths.map(w => Math.round((w / sum) * 100));
  const total = scaled.reduce((a, b) => a + b, 0);
  if (total !== 100 && scaled.length > 0) scaled[0] += 100 - total;
  return scaled;
}

export function getAlignmentClasses(a: ColumnAlignment): { flex: string; text: string } {
  const justify = { top: 'justify-start', middle: 'justify-center', bottom: 'justify-end' } as const;
  const items = { left: 'items-start', center: 'items-center', right: 'items-end' } as const;
  const text = { left: 'text-left', center: 'text-center', right: 'text-right' } as const;
  return { flex: `${justify[a.v]} ${items[a.h]}`, text: text[a.h] };
}

// --- Prompt context ---
export interface PromptContext {
  rowId: string;
  ideLabel: string;
  featureSpec: string;
  tddSpec: string;
  unitFolder: string;
  e2eFolder: string;
}

export function buildPromptContext(
  feature: RoadmapFeature,
  rowId: string,
  ideLabel: string
): PromptContext {
  return {
    rowId,
    ideLabel: ideLabel || '（尚未選擇 IDE）',
    featureSpec: feature.featureSpecDocPath?.trim() || '（尚未設定 Feature Spec (.md)）',
    tddSpec: feature.tddSpecDocPath?.trim() || '（尚未設定 TDD Spec (.md)）',
    unitFolder: `apps/superadmin/unit_and_integration_test/${rowId}`,
    e2eFolder: `apps/superadmin/e2e/${rowId}`,
  };
}

// --- One-time migration (run at module load in browser) ---
if (typeof window !== 'undefined' && !localStorage.getItem(DEV_TAB_STORAGE_KEY)) {
  try {
    const partial: Partial<DevTabSettings> = {};
    const oldWidths = localStorage.getItem('project_progress_col_widths_v13');
    if (oldWidths) { try { partial.colWidths = JSON.parse(oldWidths) as number[]; } catch { /* ignore */ } }
    const oldHeight = localStorage.getItem('project_progress_header_height_v1');
    if (oldHeight) { const h = parseInt(oldHeight, 10); if (!Number.isNaN(h)) partial.headerHeight = h; }
    const oldAlign = localStorage.getItem('project_progress_col_alignments_v1');
    if (oldAlign) { try { partial.columnAlignments = JSON.parse(oldAlign) as ColumnAlignment[]; } catch { /* ignore */ } }
    const oldFreezeRow = localStorage.getItem('project_progress_freeze_row_v1');
    if (oldFreezeRow === '0') partial.freezeRowCount = 0;
    const oldFrozenCol = localStorage.getItem('project_progress_frozen_data_col_count_v2');
    if (oldFrozenCol) { const n = parseInt(oldFrozenCol, 10); if (!Number.isNaN(n)) partial.frozenDataColCount = n; }
    const oldPresets = localStorage.getItem('project_progress_col_widths_presets_v10');
    if (oldPresets) { try { partial.widthPresets = JSON.parse(oldPresets) as WidthPreset[]; } catch { /* ignore */ } }
    const oldCustom = localStorage.getItem('project_progress_custom_rows_v1');
    if (oldCustom) { try { partial.customRows = JSON.parse(oldCustom) as CustomProjectProgressRowPayload[]; } catch { /* ignore */ } }
    const oldHidden = localStorage.getItem('project_progress_hidden_row_keys_v1');
    if (oldHidden) { try { partial.hiddenRowKeys = JSON.parse(oldHidden) as string[]; } catch { /* ignore */ } }
    if (Object.keys(partial).length > 0) {
      localStorage.setItem(DEV_TAB_STORAGE_KEY, JSON.stringify({ ...DEV_TAB_DEFAULTS, ...partial }));
    }
  } catch { /* ignore */ }
}
