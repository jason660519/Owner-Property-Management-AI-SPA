// filepath: project-progress/components/development-table/types.ts
// Shared types, constants, and utilities for the DevelopmentTab table

import type { RoadmapFeature } from '@/app/data/roadmap';
import type { PaperclipIssueStatus } from '@/lib/paperclip/types';
import type { CustomProjectProgressRowPayload } from '../../types';
import { canUseProjectFilePath } from './path-utils';

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
/** Execution environment — human IDEs + AI coding agents.
 *  Values with a matching Paperclip adapter can be auto-dispatched. */
export type IDEOption =
  | ''
  // Human IDEs
  | 'Cursor'
  | 'VSCode'
  | 'Antigravity'
  | 'TRAE'
  // AI Coding Agents
  | 'Claude Code'
  | 'Codex'
  | 'OpenCode'
  | 'Pi';

/** Metadata for each execution environment option. */
export interface RuntimeOptionMeta {
  id: IDEOption;
  label: string;
  group: 'agent' | 'ide';
  /** Paperclip adapter type, if this option maps to one. */
  adapterType?: string;
}

export const RUNTIME_OPTIONS: RuntimeOptionMeta[] = [
  // AI Coding Agents (ordered by fallback chain priority)
  { id: 'Claude Code',   label: 'Claude Code (Agent)',   group: 'agent', adapterType: 'claude_local' },
  { id: 'Codex',         label: 'Codex (Agent)',         group: 'agent', adapterType: 'codex_local' },
  { id: 'Cursor',        label: 'Cursor (IDE + Agent)',  group: 'agent', adapterType: 'cursor' },
  { id: 'OpenCode',      label: 'OpenCode (Agent)',      group: 'agent', adapterType: 'opencode_local' },
  { id: 'Pi',            label: 'Pi (Agent)',            group: 'agent', adapterType: 'pi_local' },
  // Human IDEs (manual mode only)
  { id: 'VSCode',        label: 'VSCode',                group: 'ide' },
  { id: 'Antigravity',   label: 'Antigravity',           group: 'ide' },
  { id: 'TRAE',          label: 'TRAE',                  group: 'ide' },
];
export type RowStatus = '' | 'completed' | 'in_progress' | 'not_started' | 'on_hold';
export type RowSource = 'roadmap' | 'custom';

// --- Row type (RoadmapFeature + source tracking) ---
export type ProgressRow = RoadmapFeature & {
  __rowId: string;
  __source: RowSource;
};

// --- Persisted settings ---
export interface TaskDispatchConfig {
  ide: IDEOption;
  workCategory: string;
  promptText: string;
  adapterType: string;
  model: string;
}

export interface DevTabSettings extends Record<string, unknown> {
  colWidths: number[];
  headerHeight: number;
  columnAlignments: ColumnAlignment[];
  freezeRowCount: 0 | 1;
  frozenDataColCount: number;
  widthPresets: WidthPreset[];
  customRows: CustomProjectProgressRowPayload[];
  hiddenRowKeys: string[];
  taskDispatchConfigs: Record<string, TaskDispatchConfig>;
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
  { en: 'Development Log Summary', zh: '開發日誌匯總' },
  { en: 'Notes', zh: '備註' },
];

export const COLUMN_LETTERS = COLUMN_HEADERS.map((_, i) => String.fromCharCode(65 + i));

/** @deprecated Use RUNTIME_OPTIONS instead. Kept for backward compatibility. */
export const IDE_OPTIONS: IDEOption[] = ['', ...RUNTIME_OPTIONS.map(o => o.id)];

// --- Layout constants ---
// 14 columns: Status + Notes after removing Assignee column
export const INITIAL_WIDTHS = [3, 3, 4, 4, 16, 13, 7, 6, 7, 6, 5, 9, 8, 5];
export const TABLE_SCROLL_MIN_WIDTH_PX = 2600;
export const DEFAULT_HEADER_HEIGHT = 56;
export const MIN_HEADER_HEIGHT = 40;
export const MAX_HEADER_HEIGHT = 120;
export const DEFAULT_COLUMN_ALIGNMENT: ColumnAlignment = { h: 'left', v: 'middle' };

export const DEV_TAB_PAGE_KEY = 'project_progress';
export const DEV_TAB_STORAGE_KEY = 'project_progress_settings_v3';

export const DEV_TAB_DEFAULTS: DevTabSettings = {
  colWidths: INITIAL_WIDTHS,
  headerHeight: DEFAULT_HEADER_HEIGHT,
  columnAlignments: COLUMN_HEADERS.map(() => ({ ...DEFAULT_COLUMN_ALIGNMENT })),
  freezeRowCount: 1,
  frozenDataColCount: 0,
  widthPresets: [],
  customRows: [],
  hiddenRowKeys: [],
  taskDispatchConfigs: {},
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

/** Map Paperclip issue status → local RowStatus for auto-sync. */
const PAPERCLIP_TO_ROW_STATUS: Record<PaperclipIssueStatus, RowStatus> = {
  backlog: 'not_started',
  todo: 'not_started',
  in_progress: 'in_progress',
  in_review: 'in_progress',
  blocked: 'on_hold',
  done: 'completed',
  cancelled: 'on_hold',
};

export function paperclipStatusToRowStatus(status: PaperclipIssueStatus): RowStatus {
  return PAPERCLIP_TO_ROW_STATUS[status] ?? 'not_started';
}

/** Map local DB task status (from paperclip_tasks table) → RowStatus. */
const LOCAL_TASK_STATUS_MAP: Record<string, RowStatus> = {
  submitted: 'not_started',
  running: 'in_progress',
  succeeded: 'completed',
  failed: 'on_hold',
  tripped: 'on_hold',
  cancelled: 'on_hold',
};

export function localTaskStatusToRowStatus(dbStatus: string): RowStatus {
  return LOCAL_TASK_STATUS_MAP[dbStatus] ?? 'not_started';
}

export function getEffectiveRowStatus(
  row: ProgressRow,
  statusSelections: Record<string, RowStatus>,
): RowStatus {
  const key = getRowKey(row.__source, row.__rowId);
  const selected = statusSelections[key];
  return selected || deriveRowStatus(row);
}

export interface RowStatusSummary {
  completed: number;
  in_progress: number;
  not_started: number;
  on_hold: number;
}

export function summarizeRowStatuses(
  rows: ProgressRow[],
  statusSelections: Record<string, RowStatus>,
): RowStatusSummary {
  const summary: RowStatusSummary = {
    completed: 0,
    in_progress: 0,
    not_started: 0,
    on_hold: 0,
  };
  rows.forEach((row) => {
    const status = getEffectiveRowStatus(row, statusSelections);
    if (status && status in summary) {
      summary[status as keyof RowStatusSummary] += 1;
    }
  });
  return summary;
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

const UNIT_TEST_FALLBACK_ROOT = 'apps/superadmin/unit_test';
const ALLOWED_TEST_SCRIPT_PREFIX = 'apps/superadmin/';
const DEV_LOG_ALLOWED_PREFIXES = ['project-process/', 'docs/'] as const;

function normalizeProjectDocPath(path: string): string {
  return path.trim().replace(/^\/+/, '');
}

function sanitizeRowIdForFileSegment(rowId: string): string {
  const sanitized = rowId.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return sanitized || 'task';
}

export function resolveUnitTestFolder(feature: RoadmapFeature, rowId: string): string {
  const fallback = `${UNIT_TEST_FALLBACK_ROOT}/${rowId}`;
  const configured = feature.testScriptPath?.trim();
  if (!configured) return fallback;
  if (!canUseProjectFilePath(configured, [ALLOWED_TEST_SCRIPT_PREFIX])) return fallback;
  return configured;
}

export function resolveE2EFolder(rowId: string): string {
  return `apps/superadmin/e2e/${rowId}`;
}

export function resolveConfiguredDevLogDocPath(feature: RoadmapFeature): string | null {
  const configured = feature.devLogDocPath?.trim();
  if (!configured) return null;

  const normalized = normalizeProjectDocPath(configured);
  if (!normalized.toLowerCase().endsWith('.md')) return null;
  if (!canUseProjectFilePath(normalized, DEV_LOG_ALLOWED_PREFIXES)) return null;

  return normalized;
}

export function buildFallbackDevLogDocPath(rowId: string): string {
  return `project-process/dev-logs/${sanitizeRowIdForFileSegment(rowId)}-development-log-summary.md`;
}

export function resolveDevLogDocPath(feature: RoadmapFeature, rowId: string): string {
  return resolveConfiguredDevLogDocPath(feature) ?? buildFallbackDevLogDocPath(rowId);
}

export function buildDevLogSummaryRoute(rowId: string): string {
  return `/superadmin/dashboard/project-progress/task/${encodeURIComponent(rowId)}/dev-log`;
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
    unitFolder: resolveUnitTestFolder(feature, rowId),
    e2eFolder: resolveE2EFolder(rowId),
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
