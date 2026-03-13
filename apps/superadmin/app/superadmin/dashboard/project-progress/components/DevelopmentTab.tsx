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
  EyeOff,
  Plus,
  Play,
  Loader2,
  Square,
  ExternalLink,
  Settings,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { getProjectProgressSettings, setProjectProgressSettings } from '../actions';
import { useAISettings } from '@/lib/hooks/useAISettings';
import type { CustomProjectProgressRowPayload, ProjectProgressSettingsPayload } from '../types';

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

type IDEOption = '' | 'Cursor' | 'VSCode' | 'Antigravity' | 'Claude CLI' | 'TRAE';

type RowStatus = '' | 'completed' | 'in_progress' | 'not_started' | 'on_hold';

type RowSource = 'roadmap' | 'custom';

type ProgressRow = RoadmapFeature & {
  __rowId: string;
  __source: RowSource;
};

// --- Constants ---

function deriveRowStatus(feature: RoadmapFeature): RowStatus {
  const progressText = `${feature.developmentProgress ?? ''} ${feature.testProgress ?? ''}`.toLowerCase();
  if (progressText.match(/暫緩|暫停|on hold/)) return 'on_hold';

  const pct = typeof feature.percentage === 'number' ? feature.percentage : undefined;
  if (pct != null) {
    if (pct >= 100) return 'completed';
    if (pct > 0) return 'in_progress';
  }

  // 若沒有百分比資訊，根據 phase / testStatus 做粗略推斷
  if (feature.phase === 'operations' || feature.phase === 'deployment') return 'completed';
  if (feature.phase === 'testing' || feature.testStatus === 'in_progress') return 'in_progress';

  return 'not_started';
}

const INITIAL_WIDTHS = [4, 4, 6, 6, 22, 19, 10, 8, 10, 8, 8, 13, 6, 8]; // sum = 136 → normalized to 100（含 狀態 + 備註）

const COLUMN_HEADERS = [
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

const IDE_OPTIONS: IDEOption[] = ['', 'Cursor', 'VSCode', 'Antigravity', 'Claude CLI', 'TRAE'];

/** 今日工作類別：選取後會預填對應的 Prompt 範本（本專案：Owner Real Estate Agent SaaS, apps/web + apps/superadmin, Supabase, TypeScript strict） */
interface PromptContext {
  rowId: string;
  ideLabel: string;
  featureSpec: string;
  tddSpec: string;
  unitFolder: string;
  e2eFolder: string;
}

const WORK_CATEGORY_OPTIONS: { id: string; label: string; getPrompt: (ctx: PromptContext) => string }[] = [
  {
    id: 'fullstack',
    label: '全棧工程師',
    getPrompt: (ctx) =>
      [
        `請針對這一筆工作（Row ID「${ctx.rowId}」）以及選定的 IDE「${ctx.ideLabel}」開始進行全棧開發與測試。`,
        '在開始撰寫程式碼之前，請先完整閱讀並理解以下說明文件：',
        `1) Feature Spec (.md)：${ctx.featureSpec}`,
        `2) TDD Spec (.md)：${ctx.tddSpec}`,
        '',
        '角色重點：前後端功能一併考量（Next.js / React、Server Actions、Supabase 整合）。請嚴格遵守 TDD：先撰寫測試再實作，並依專案規範（TypeScript strict、docs/ 與 .claude/rules/）進行。',
        `單元與整合測試：${ctx.unitFolder}`,
        `E2E / 驗收測試：${ctx.e2eFolder}`,
        '',
        '完成後請新增或更新 TDD Progress Report (.md)：主要變更檔案、測試範圍與案例、執行結果（含失敗重試與修正）。',
        '確認完成今日的 TDD Progress Report (.md)、測試腳本全部通過後，請自行 git commit and push to github repo。',
      ].join('\n'),
  },
  {
    id: 'database',
    label: '資料庫工程師',
    getPrompt: (ctx) =>
      [
        `請針對這一筆工作（Row ID「${ctx.rowId}」）以及選定的 IDE「${ctx.ideLabel}」開始進行資料庫相關開發與測試。`,
        '請先閱讀：',
        `1) Feature Spec (.md)：${ctx.featureSpec}`,
        `2) TDD Spec (.md)：${ctx.tddSpec}`,
        '',
        '角色重點：Migration 設計（supabase/migrations/，檔名 YYYYMMDDHHMMSS_描述.sql）、RLS 政策、索引與觸發器、storage_quotas / behavior_logs 等表結構。請遵循 .claude/rules/backend/supabase.md，並撰寫對應單元與整合測試。',
        `單元與整合測試：${ctx.unitFolder}`,
        `E2E 測試：${ctx.e2eFolder}`,
        '',
        '完成後請更新 TDD Progress Report (.md)：migration 清單、RLS 與測試結果。',
        '確認完成今日的 TDD Progress Report (.md)、測試腳本全部通過後，請自行 git commit and push to github repo。',
      ].join('\n'),
  },
  {
    id: 'qa',
    label: 'TDD 測試工程師 / QA 工程師',
    getPrompt: (ctx) =>
      [
        `請針對這一筆工作（Row ID「${ctx.rowId}」）以及選定的 IDE「${ctx.ideLabel}」以測試為先進行開發與驗證。`,
        '請先閱讀：',
        `1) Feature Spec (.md)：${ctx.featureSpec}`,
        `2) TDD Spec (.md)：${ctx.tddSpec}`,
        '',
        '角色重點：先撰寫單元與整合測試（Vitest）與 E2E（Playwright），覆蓋 Happy Path、邊界條件與錯誤路徑，再撰寫實作以通過測試。目標覆蓋率 80%+，並確保 TDD 報告中列出所有測試案例與執行結果。',
        `單元與整合測試目錄：${ctx.unitFolder}`,
        `E2E 測試目錄：${ctx.e2eFolder}`,
        '',
        '完成後請新增或更新 TDD Progress Report (.md)：測試案例清單、通過/失敗、重試與修正說明。',
        '確認完成今日的 TDD Progress Report (.md)、測試腳本全部通過後，請自行 git commit and push to github repo。',
      ].join('\n'),
  },
  {
    id: 'devops',
    label: 'DevOps / 站台可靠性工程師',
    getPrompt: (ctx) =>
      [
        `請針對這一筆工作（Row ID「${ctx.rowId}」）以及選定的 IDE「${ctx.ideLabel}」開始進行 DevOps / 可靠性相關工作。`,
        '請先閱讀：',
        `1) Feature Spec (.md)：${ctx.featureSpec}`,
        `2) TDD Spec (.md)：${ctx.tddSpec}`,
        '',
        '角色重點：部署流程（Vercel / Supabase）、環境變數與密鑰、監控與日誌、健康檢查與 runbook。本專案為 monorepo，apps/web (Port 3000)、apps/superadmin (Port 3001)，請依 docs/deployment-guides 與三階段部署策略執行，並撰寫或更新相關測試與文件。',
        `單元與整合測試：${ctx.unitFolder}`,
        `E2E 測試：${ctx.e2eFolder}`,
        '',
        '完成後請更新 TDD Progress Report (.md)：變更摘要、部署/驗證步驟、測試結果。',
        '確認完成今日的 TDD Progress Report (.md)、測試腳本全部通過後，請自行 git commit and push to github repo。',
      ].join('\n'),
  },
  {
    id: 'architect',
    label: '技術總監 / 架構師',
    getPrompt: (ctx) =>
      [
        `請針對這一筆工作（Row ID「${ctx.rowId}」）以及選定的 IDE「${ctx.ideLabel}」從架構與技術決策角度進行檢視與實作。`,
        '請先閱讀：',
        `1) Feature Spec (.md)：${ctx.featureSpec}`,
        `2) TDD Spec (.md)：${ctx.tddSpec}`,
        '',
        '角色重點：架構一致性、擴展性、安全性與技術選型；與既有 docs/、.claude/rules/ 及 docs/technical-selection 對齊。必要時產出或更新架構說明、決策記錄與風險評估。仍須依 TDD 撰寫測試並更新 TDD Progress Report (.md)。',
        `單元與整合測試：${ctx.unitFolder}`,
        `E2E 測試：${ctx.e2eFolder}`,
        '',
        '完成後請更新 TDD Progress Report (.md)：架構/決策摘要、變更清單、測試結果。',
        '確認完成今日的 TDD Progress Report (.md)、測試腳本全部通過後，請自行 git commit and push to github repo。',
      ].join('\n'),
  },
  {
    id: 'uiux',
    label: 'UI/UX 設計師',
    getPrompt: (ctx) =>
      [
        `請針對這一筆工作（Row ID「${ctx.rowId}」）以及選定的 IDE「${ctx.ideLabel}」開始進行 UI/UX 與前端實作。`,
        '請先閱讀：',
        `1) Feature Spec (.md)：${ctx.featureSpec}`,
        `2) TDD Spec (.md)：${ctx.tddSpec}`,
        '',
        '角色重點：依 docs/design-guidelines/UNIFIED_DESIGN_STANDARD.md 與既有設計系統實作元件與頁面；注意 RWD、無障礙與一致性。本專案為 Next.js + React，主要為 apps/web 與 apps/superadmin。請依 TDD 撰寫元件與單元/整合及 E2E 測試，完成後更新 TDD Progress Report (.md)。',
        `單元與整合測試：${ctx.unitFolder}`,
        `E2E 測試：${ctx.e2eFolder}`,
        '',
        '完成後請更新 TDD Progress Report (.md)：UI 變更摘要、測試範圍與執行結果。',
        '確認完成今日的 TDD Progress Report (.md)、測試腳本全部通過後，請自行 git commit and push to github repo。',
      ].join('\n'),
  },
];

/** 依目前 context 產生預設 Prompt（未選工作類別時使用）；IDE 變更時可重用此函式更新文案 */
function getDefaultPrompt(ctx: PromptContext): string {
  return [
    `請根據專案進度儀表板（Development Tab）中工作編號 Row ID「${ctx.rowId}」與選定的 IDE「${ctx.ideLabel}」，開始或繼續進行開發與測試。`,
    '',
    '【必讀文件】',
    '在撰寫程式碼前，請先完整閱讀並理解：',
    `• Feature Spec (.md)：${ctx.featureSpec}`,
    `• TDD Spec (.md)：${ctx.tddSpec}`,
    '',
    '【TDD 流程】',
    '• 若已有測試腳本：先執行並更新既有測試，待全部通過後，再視需要撰寫新測試。',
    '• 嚴格依循「紅 → 綠 → 重構」循環。',
    '',
    '【測試路徑】',
    `• 單元與整合測試：${ctx.unitFolder}`,
    `• E2E / 驗收測試：${ctx.e2eFolder}`,
    '',
    '【報告流程】',
    'TDD 測試完成後，請新增或更新對應的 TDD Progress Report (.md)，內容至少包含：',
    '• 主要實作變更檔案清單與變更摘要',
    '• 測試範圍與各測試案例說明',
    '• 測試執行結果（含失敗重試與修正狀況）',
    '',
    '【完成條件】',
    '確認 TDD Progress Report (.md) 已完成、所有測試通過後，請 git commit 並 push 至 GitHub repo。',
  ].join('\n');
}

/** 從當前 Modal 狀態組出 PromptContext，供更新 Prompt 文案使用 */
function buildPromptContext(
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

const COLUMN_LETTERS = COLUMN_HEADERS.map((_, i) => String.fromCharCode(65 + i));

const FREEZE_ROW_STORAGE_KEY = 'project_progress_freeze_row_v1';
const FROZEN_DATA_COL_COUNT_KEY = 'project_progress_frozen_data_col_count_v2';
const WIDTH_PRESETS_KEY = 'project_progress_col_widths_presets_v10';
const HEADER_HEIGHT_KEY = 'project_progress_header_height_v1';
const DEFAULT_HEADER_HEIGHT = 56;
const MIN_HEADER_HEIGHT = 40;
const MAX_HEADER_HEIGHT = 120;
const ALIGNMENT_STORAGE_KEY = 'project_progress_col_alignments_v1';
const CUSTOM_ROWS_STORAGE_KEY = 'project_progress_custom_rows_v1';
const HIDDEN_ROW_KEYS_STORAGE_KEY = 'project_progress_hidden_row_keys_v1';
const DEFAULT_COLUMN_ALIGNMENT: ColumnAlignment = { h: 'left', v: 'middle' };

// --- Utilities ---

function normalizeRowIdInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^\d+$/.test(trimmed)) return trimmed.padStart(3, '0');
  return trimmed;
}

function getRowKey(source: RowSource, rowId: string): string {
  return `${source}:${rowId}`;
}

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
  const { userId } = useAISettings();
  const [searchQuery, setSearchQuery] = useState('');
  /** 分類篩選（表頭下方下拉）：空字串 = 所有，否則只顯示該分類 */
  const [categoryFilterSingle, setCategoryFilterSingle] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const [colWidths, setColWidths] = useState<number[]>(INITIAL_WIDTHS);
  const tableRef = useRef<HTMLDivElement>(null);
  const currentWidthsRef = useRef<number[]>(INITIAL_WIDTHS);

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

  const [ideSelections, setIdeSelections] = useState<Record<string, IDEOption>>({});
  const [statusSelections, setStatusSelections] = useState<Record<string, RowStatus>>({});

  const [hiddenRowKeys, setHiddenRowKeys] = useState<Set<string>>(new Set());
  const [showHiddenRows, setShowHiddenRows] = useState(false);

  const [customRows, setCustomRows] = useState<CustomProjectProgressRowPayload[]>([]);
  const [addRowOpen, setAddRowOpen] = useState(false);
  const [draftRowId, setDraftRowId] = useState('');
  const [draftCategory, setDraftCategory] = useState('自訂 (Custom)');
  const [draftLocatedPage, setDraftLocatedPage] = useState('');
  const [draftFeatureName, setDraftFeatureName] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);

  const rows = useMemo<ProgressRow[]>(() => {
    const base: ProgressRow[] = features.map((f, idx) => ({
      ...f,
      __rowId: (idx + 1).toString().padStart(3, '0'),
      __source: 'roadmap',
    }));

    const custom = customRows.reduce<ProgressRow[]>((acc, r) => {
      const id = normalizeRowIdInput(r.rowId);
      if (!id) return acc;
      const name = r.name.trim();
      const category = r.category.trim();
      if (!name || !category) return acc;
      acc.push({
        name,
        category,
        locatedPage: r.locatedPage?.trim() || undefined,
        percentage: typeof r.percentage === 'number' ? r.percentage : 0,
        featureSpecDocPath: r.featureSpecDocPath?.trim() || undefined,
        tddSpecDocPath: r.tddSpecDocPath?.trim() || undefined,
        docPath: r.docPath?.trim() || undefined,
        testCoverage: typeof r.testCoverage === 'number' ? r.testCoverage : undefined,
        e2eTestCoverage: typeof r.e2eTestCoverage === 'number' ? r.e2eTestCoverage : undefined,
        __rowId: id,
        __source: 'custom',
      });
      return acc;
    }, []);

    return [...base, ...custom];
  }, [features, customRows]);

  const [promptConfigFeature, setPromptConfigFeature] = useState<{
    row: ProgressRow;
    rowKey: string;
  } | null>(null);
  const [promptConfigIDE, setPromptConfigIDE] = useState<IDEOption>('');
  const [promptConfigWorkCategory, setPromptConfigWorkCategory] = useState<string>('');
  const [promptText, setPromptText] = useState('');
  const [isExecutingPrompt, setIsExecutingPrompt] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [currentTaskStatus, setCurrentTaskStatus] = useState<'queued' | 'running' | 'succeeded' | 'failed' | null>(null);
  const [currentTaskLogs, setCurrentTaskLogs] = useState<string[]>([]);
  const [promptError, setPromptError] = useState<string | null>(null);

  // Auto-derive default row status from feature data
  useEffect(() => {
    setStatusSelections(prev => {
      const next: Record<string, RowStatus> = { ...prev };
      for (const row of rows) {
        const key = getRowKey(row.__source, row.__rowId);
        if (next[key]) continue;
        next[key] = deriveRowStatus(row);
      }
      return next;
    });
  }, [rows]);

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
        localStorage.setItem('project_progress_col_widths_v13', JSON.stringify(normalized));
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
      if (data?.customRows && Array.isArray(data.customRows)) {
        const valid = data.customRows
          .map((r: CustomProjectProgressRowPayload) => ({
            ...r,
            rowId: normalizeRowIdInput(r.rowId),
            name: r.name?.trim?.() ?? '',
            category: r.category?.trim?.() ?? '',
            locatedPage: r.locatedPage?.trim?.() || undefined,
          }))
          .filter(r => Boolean(r.rowId) && Boolean(r.name) && Boolean(r.category));
        setCustomRows(valid);
        localStorage.setItem(CUSTOM_ROWS_STORAGE_KEY, JSON.stringify(valid));
      }
      if (data?.hiddenRowKeys && Array.isArray(data.hiddenRowKeys)) {
        const valid = data.hiddenRowKeys.filter((k: unknown): k is string => typeof k === 'string' && k.trim().length > 0);
        setHiddenRowKeys(new Set(valid));
        localStorage.setItem(HIDDEN_ROW_KEYS_STORAGE_KEY, JSON.stringify(valid));
      }
      if (data) {
        initialLoadDoneRef.current = true;
        return;
      }
      // Fallback: localStorage
      const saved = localStorage.getItem('project_progress_col_widths_v13');
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
      const customRaw = localStorage.getItem(CUSTOM_ROWS_STORAGE_KEY);
      if (customRaw) {
        try {
          const parsed = JSON.parse(customRaw) as unknown;
          if (Array.isArray(parsed)) {
            const valid = parsed
              .filter((r: unknown): r is CustomProjectProgressRowPayload =>
                typeof r === 'object' &&
                r !== null &&
                'rowId' in r &&
                'name' in r &&
                'category' in r &&
                typeof (r as CustomProjectProgressRowPayload).rowId === 'string' &&
                typeof (r as CustomProjectProgressRowPayload).name === 'string' &&
                typeof (r as CustomProjectProgressRowPayload).category === 'string'
              )
              .map(r => ({
                ...r,
                rowId: normalizeRowIdInput(r.rowId),
                name: r.name.trim(),
                category: r.category.trim(),
                locatedPage: r.locatedPage?.trim() || undefined,
              }))
              .filter(r => Boolean(r.rowId) && Boolean(r.name) && Boolean(r.category));
            setCustomRows(valid);
          }
        } catch (e) {
          console.error('Failed to parse custom rows', e);
        }
      }
      const hiddenRaw = localStorage.getItem(HIDDEN_ROW_KEYS_STORAGE_KEY);
      if (hiddenRaw) {
        try {
          const parsed = JSON.parse(hiddenRaw) as unknown;
          if (Array.isArray(parsed)) {
            const valid = parsed.filter((k: unknown): k is string => typeof k === 'string' && k.trim().length > 0);
            setHiddenRowKeys(new Set(valid));
          }
        } catch (e) {
          console.error('Failed to parse hidden rows', e);
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
      customRows,
      hiddenRowKeys: Array.from(hiddenRowKeys),
    };
    const t = setTimeout(() => {
      localStorage.setItem(CUSTOM_ROWS_STORAGE_KEY, JSON.stringify(customRows));
      localStorage.setItem(HIDDEN_ROW_KEYS_STORAGE_KEY, JSON.stringify(Array.from(hiddenRowKeys)));
      void setProjectProgressSettings(payload);
    }, 500);
    return () => clearTimeout(t);
  }, [colWidths, headerHeight, columnAlignments, freezeRowCount, frozenDataColCount, widthPresets, customRows, hiddenRowKeys]);

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
      localStorage.setItem('project_progress_col_widths_v13', JSON.stringify(currentWidthsRef.current));
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleResizeStartBetween = (leftIndex: number, rightIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.pageX;
    const startWidths = [...currentWidthsRef.current];
    const containerWidth = tableRef.current?.offsetWidth || 1000;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.pageX - startX;
      const deltaPercent = (deltaPx / containerWidth) * 100;
      const newWidths = [...startWidths];
      const left = newWidths[leftIndex] + deltaPercent;
      const right = newWidths[rightIndex] - deltaPercent;
      const minPct = (8 / containerWidth) * 100;
      if (left >= minPct && right >= minPct) {
        newWidths[leftIndex] = left;
        newWidths[rightIndex] = right;
        setColWidths(newWidths);
        currentWidthsRef.current = newWidths;
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      localStorage.setItem('project_progress_col_widths_v13', JSON.stringify(currentWidthsRef.current));
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
    localStorage.removeItem('project_progress_col_widths_v13');
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
    localStorage.setItem('project_progress_col_widths_v13', JSON.stringify(preset.widths));
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
    const q = searchQuery.toLowerCase();
    return rows.filter(r => {
      const rowKey = getRowKey(r.__source, r.__rowId);
      const isHidden = hiddenRowKeys.has(rowKey);
      if (isHidden && !showHiddenRows) return false;
      const matchesSearch = r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (r.locatedPage ?? '').toLowerCase().includes(q);
      const matchesCategoryDropdown = !categoryFilterSingle || r.category === categoryFilterSingle;
      const matchesCategory = selectedCategories.size === 0 || selectedCategories.has(r.category);
      return matchesSearch && matchesCategoryDropdown && matchesCategory;
    });
  }, [rows, searchQuery, categoryFilterSingle, selectedCategories, hiddenRowKeys, showHiddenRows]);

  const hiddenRowsList = useMemo(() => {
    const map = new Map<string, ProgressRow>();
    rows.forEach(r => map.set(getRowKey(r.__source, r.__rowId), r));
    return Array.from(hiddenRowKeys).map(key => ({ key, row: map.get(key) }));
  }, [rows, hiddenRowKeys]);

  const categoryList = useMemo(
    () => Array.from(new Set(rows.map(r => r.category))).sort(),
    [rows]
  );

  const toggleCategory = (cat: string) => {
    // Mutual exclusion: column-header single filter vs sidebar multi-select filter
    setCategoryFilterSingle('');
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

  // When the column-header single filter is set, clear the multi-select filter to prevent silent AND
  useEffect(() => {
    if (categoryFilterSingle) setSelectedCategories(new Set());
  }, [categoryFilterSingle]);

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

  const openPromptConfig = (row: ProgressRow) => {
    const rowKey = getRowKey(row.__source, row.__rowId);
    const currentIDE = ideSelections[rowKey] ?? '';
    const ctx = buildPromptContext(row, row.__rowId, currentIDE);

    setPromptConfigFeature({ row, rowKey });
    setPromptConfigIDE(currentIDE);
    setPromptConfigWorkCategory('');
    setPromptText(getDefaultPrompt(ctx));
    setCurrentTaskId(null);
    setCurrentTaskStatus(null);
    setCurrentTaskLogs([]);
    setPromptError(null);
  };

  const closePromptConfig = () => {
    setPromptConfigFeature(null);
    setIsExecutingPrompt(false);
    setPromptError(null);
  };

  // Close Prompt Modal on Escape key
  useEffect(() => {
    if (!promptConfigFeature) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePromptConfig();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  // closePromptConfig is stable (no deps change between renders)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptConfigFeature]);

  const handleExecutePrompt = async () => {
    if (!promptConfigFeature || !promptText.trim()) return;
    if (!promptConfigIDE) {
      setPromptError('請先選擇 IDE 開發工具（例如 Cursor）再送出。');
      return;
    }
    if (!userId) {
      setPromptError('尚未取得使用者資訊，請確認已登入 superadmin。');
      return;
    }
    setPromptError(null);
    setIsExecutingPrompt(true);
    try {
      const { row, rowKey } = promptConfigFeature;
      const rowId = row.__rowId;

      setIdeSelections(prev => ({
        ...prev,
        [rowKey]: promptConfigIDE,
      }));
      const featureSpec = row.featureSpecDocPath?.trim() || null;
      const tddSpec = row.tddSpecDocPath?.trim() || null;
      const unitFolder = `apps/superadmin/unit_and_integration_test/${rowId}`;
      const e2eFolder = `apps/superadmin/e2e/${rowId}`;

      const res = await fetch('/api/dev-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          rowId,
          featureName: row.name,
          ide: promptConfigIDE,
          prompt: promptText,
          metadata: {
            featureSpecDocPath: featureSpec,
            tddSpecDocPath: tddSpec,
            unitTestFolder: unitFolder,
            e2eFolder,
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        // eslint-disable-next-line no-console
        console.error('Failed to create dev task', text);
        setPromptError(`建立開發任務失敗：${res.status} ${res.statusText}`);
        return;
      }

      const data = (await res.json()) as { taskId: string; status: 'queued' | 'running' | 'succeeded' | 'failed' };
      setCurrentTaskId(data.taskId);
      setCurrentTaskStatus(data.status);
      setPromptError(null);

      // 複製 Prompt 到剪貼簿，方便使用者到 IDE 貼上
      try {
        await navigator.clipboard.writeText(promptText);
      } catch {
        // 無剪貼簿權限或非 HTTPS 時靜默略過
      }

      // 嘗試喚醒本地 Agent（若在 tools/local-agent 執行 npm run cursor），讓其立即領取任務並開啟 IDE
      const wakePort = 3847;
      const wakeUrl = `http://127.0.0.1:${wakePort}/wake?ide=${encodeURIComponent(promptConfigIDE)}`;
      try {
        const wakeRes = await fetch(wakeUrl, { method: 'GET', signal: AbortSignal.timeout(2000) });
        if (wakeRes.ok) {
          // 已通知本地 Agent，稍後會自動開啟 Cursor 並注入
        }
      } catch {
        // 本地 Agent 未啟動或未開啟 wake 服務時忽略
      }
    } finally {
      setIsExecutingPrompt(false);
    }
  };

  useEffect(() => {
    if (!currentTaskId) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/dev-tasks/${currentTaskId}`, {
          headers: { 'x-user-id': userId },
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          task?: {
            status: 'queued' | 'running' | 'succeeded' | 'failed';
            logs?: string[];
          } | null;
        };
        if (!json.task || cancelled) return;
        setCurrentTaskStatus(json.task.status);
        if (Array.isArray(json.task.logs)) {
          setCurrentTaskLogs(json.task.logs);
        }
      } catch {
        // ignore polling errors
      }
    };

    void poll();
    const id = window.setInterval(() => {
      void poll();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [currentTaskId, userId]);

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
                  <div className="border-t border-border-light mt-1 pt-1">
                    <div className="px-3 py-1 text-[10px] text-text-muted">Row</div>
                    <label className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-bg-secondary text-sm text-text-primary">
                      <input
                        type="checkbox"
                        checked={showHiddenRows}
                        onChange={(e) => setShowHiddenRows(e.target.checked)}
                        className="rounded border-border-default text-emerald-600 focus:ring-emerald-500/20"
                      />
                      <span className="truncate">顯示隱藏列 {hiddenRowKeys.size > 0 ? `(${hiddenRowKeys.size})` : ''}</span>
                    </label>
                    {hiddenRowKeys.size > 0 && (
                      <>
                        <div className="px-3 pb-1">
                          <button
                            type="button"
                            onClick={() => setHiddenRowKeys(new Set())}
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
                                setHiddenRowKeys(prev => {
                                  const next = new Set(prev);
                                  next.delete(key);
                                  return next;
                                });
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
          <button
            type="button"
            onClick={() => {
              const used = new Set(rows.map(r => r.__rowId));
              const nums = Array.from(used)
                .filter(v => /^\d+$/.test(v))
                .map(v => parseInt(v, 10))
                .filter(n => !Number.isNaN(n));
              const next = String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0');
              setDraftRowId(next);
              setDraftCategory('自訂 (Custom)');
              setDraftLocatedPage('');
              setDraftFeatureName('');
              setDraftError(null);
              setAddRowOpen(true);
            }}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary bg-bg-primary border border-border-default rounded-md hover:bg-bg-secondary hover:text-text-primary transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            新增 Row
          </button>
        </div>
      </div>

      {addRowOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          onClick={() => setAddRowOpen(false)}
        >
          <div
            className="relative w-full max-w-lg mx-4 rounded-lg border border-border-default bg-bg-primary shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-light px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  新增自訂 Row
                </p>
                <p className="mt-0.5 text-xs text-text-muted truncate">
                  這些 Row 只會儲存在你的設定（不會改到 roadmap.ts）
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddRowOpen(false)}
                className="ml-3 rounded-md border border-border-default px-2 py-1 text-[11px] text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
              >
                關閉
              </button>
            </div>
            <div className="space-y-3 px-4 py-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-text-secondary" htmlFor="add-row-id">
                    ID
                  </label>
                  <input
                    id="add-row-id"
                    type="text"
                    value={draftRowId}
                    onChange={(e) => setDraftRowId(e.target.value)}
                    className="w-full rounded-md border border-border-default bg-bg-secondary px-2 py-1.5 text-xs text-text-primary focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    placeholder="例如：085 或 CUSTOM-1"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-text-secondary" htmlFor="add-row-category">
                    Category
                  </label>
                  <input
                    id="add-row-category"
                    type="text"
                    value={draftCategory}
                    onChange={(e) => setDraftCategory(e.target.value)}
                    className="w-full rounded-md border border-border-default bg-bg-secondary px-2 py-1.5 text-xs text-text-primary focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    placeholder="例如：專案管理與工具 (Project Management)"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-text-secondary" htmlFor="add-row-feature">
                  Feature
                </label>
                <input
                  id="add-row-feature"
                  type="text"
                  value={draftFeatureName}
                  onChange={(e) => setDraftFeatureName(e.target.value)}
                  className="w-full rounded-md border border-border-default bg-bg-secondary px-2 py-1.5 text-xs text-text-primary focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  placeholder="例如：Project Progress Dashboard — XXX"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-text-secondary" htmlFor="add-row-located-page">
                  Located Page（可選）
                </label>
                <input
                  id="add-row-located-page"
                  type="text"
                  value={draftLocatedPage}
                  onChange={(e) => setDraftLocatedPage(e.target.value)}
                  className="w-full rounded-md border border-border-default bg-bg-secondary px-2 py-1.5 text-xs text-text-primary focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  placeholder="例如：superadmin/dashboard/project-progress"
                />
              </div>
              {draftError && (
                <p className="text-xs text-red-500">
                  {draftError}
                </p>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border-light px-4 py-3 bg-bg-secondary/60">
              <button
                type="button"
                onClick={() => setAddRowOpen(false)}
                className="rounded-md border border-border-default px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-primary hover:text-text-primary"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = normalizeRowIdInput(draftRowId);
                  if (!id) {
                    setDraftError('請輸入 ID');
                    return;
                  }
                  if (rows.some(r => r.__rowId === id)) {
                    setDraftError(`ID 已存在：${id}`);
                    return;
                  }
                  const name = draftFeatureName.trim();
                  if (!name) {
                    setDraftError('請輸入 Feature');
                    return;
                  }
                  const category = draftCategory.trim();
                  if (!category) {
                    setDraftError('請輸入 Category');
                    return;
                  }
                  setCustomRows(prev => [
                    ...prev,
                    {
                      rowId: id,
                      name,
                      category,
                      locatedPage: draftLocatedPage.trim() || undefined,
                      percentage: 0,
                    },
                  ]);
                  setAddRowOpen(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="h-3.5 w-3.5" />
                新增
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-bg-primary border border-border-default rounded-lg shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 transition-colors">
        <div className="overflow-y-auto flex-1 min-h-0" ref={tableRef}>
          {/* Header */}
          <div
            className={clsx(
              'z-10 bg-bg-secondary flex flex-col w-full min-w-0 shrink-0',
              freezeRowCount > 0 ? 'sticky top-0 border-b-4 border-gray-300 dark:border-gray-600' : 'border-b border-border-default'
            )}
            style={{ minHeight: headerHeight }}
          >
            <div className="flex flex-1 min-h-0 w-full" style={{ minHeight: headerHeight }}>
              <div className="flex flex-1 min-w-0">
                {COLUMN_HEADERS.map((header, idx) => {
                  const { flex: alignFlex, text: alignText } = getAlignmentClasses(columnAlignments[idx] ?? DEFAULT_COLUMN_ALIGNMENT);
                  const isColSelected = (selectionType === 'column' && selectedCol === idx) || isAllSelected;
                  const isFrozen = idx < frozenDataColCount;
                  const isFreezeBoundary = frozenDataColCount > 0 && idx === frozenDataColCount - 1;
                  const isLastCol = idx === COLUMN_HEADERS.length - 1;
                  return (
                    <div
                      key={header.en}
                      role="button"
                      tabIndex={0}
                      onClick={() => { setSelectionType('column'); setSelectedCol(idx); setSelectedRow(0); }}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectionType('column'); setSelectedCol(idx); setSelectedRow(0); } }}
                      className={clsx(
                        'relative flex-shrink-0 flex-grow-0 px-4 py-3 text-xs font-semibold text-text-secondary tracking-wider flex flex-col overflow-hidden min-h-0 cursor-pointer',
                        isFreezeBoundary ? 'border-r-4 border-gray-300 dark:border-gray-600' : 'border-r border-border-default',
                        alignFlex, alignText,
                        isColSelected && 'bg-blue-500/15 ring-inset ring-1 ring-blue-500/40',
                        isFrozen && 'sticky bg-bg-secondary'
                      )}
                      style={{ width: `${colWidths[idx]}%`, minWidth: 0, ...(isFrozen ? { left: frozenColLeftOffsets[idx], zIndex: 2 } : {}) }}
                    >
                      <span className="uppercase break-words w-full leading-tight line-clamp-2">{header.en}</span>
                      <span className="text-[10px] text-text-muted break-words w-full leading-tight line-clamp-1">{header.zh}</span>
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-10 active:bg-blue-600"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          if (!isLastCol) {
                            handleResizeStart(idx, e);
                          } else if (idx > 0) {
                            handleResizeStartBetween(idx - 1, idx, e);
                          }
                        }}
                      />
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
          <div className="divide-y divide-border-default border-b border-border-default">
            {filteredFeatures.map((row, rowIdx) => {
              const isRowSelected = selectionType === 'row' && selectedRow === rowIdx;
              const rowKey = getRowKey(row.__source, row.__rowId);
              const isHidden = hiddenRowKeys.has(rowKey);
              return (
                <div key={rowKey}
                  className={clsx(
                    'flex items-stretch transition-colors group min-h-[80px] min-w-0 w-full',
                    isRowSelected ? 'bg-blue-500/10' : isAllSelected ? 'bg-blue-500/5' : 'hover:bg-bg-secondary',
                    isHidden && 'opacity-60'
                  )}>
                  <div className="flex flex-1 min-w-0">
                    {/* 1. ID */}
                    <CellWrapper colIdx={0} rowIdx={rowIdx} extraClass="px-2">
                      <div className="flex items-center gap-2">
                        <div className="font-mono text-xs text-text-secondary bg-bg-primary border border-border-default px-1.5 py-0.5 rounded h-fit">
                          {row.__rowId}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setHiddenRowKeys(prev => {
                              const next = new Set(prev);
                              if (next.has(rowKey)) next.delete(rowKey);
                              else next.add(rowKey);
                              return next;
                            });
                          }}
                          className="inline-flex items-center justify-center rounded border border-border-default bg-bg-secondary/60 p-1 text-text-muted hover:text-text-primary hover:bg-bg-secondary"
                          title={isHidden ? '顯示 Row' : '隱藏 Row'}
                          aria-label={isHidden ? '顯示 Row' : '隱藏 Row'}
                        >
                          {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        {row.__source === 'custom' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCustomRows(prev => prev.filter(r => normalizeRowIdInput(r.rowId) !== row.__rowId));
                            }}
                            className="inline-flex items-center justify-center rounded border border-border-default bg-bg-secondary/60 p-1 text-text-muted hover:text-text-primary hover:bg-bg-secondary"
                            title="刪除自訂 Row"
                            aria-label="刪除自訂 Row"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </CellWrapper>
                    {/* 2. Role/General */}
                    <CellWrapper colIdx={1} rowIdx={rowIdx}>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-bg-tertiary text-text-primary truncate max-w-full" title={row.category}>
                        {row.category}
                      </span>
                    </CellWrapper>
                    {/* 3. Located Page（按所屬頁面分類） */}
                    <CellWrapper colIdx={2} rowIdx={rowIdx}>
                      <span className="text-sm text-text-primary truncate max-w-full block" title={row.locatedPage ?? ''}>
                        {row.locatedPage?.trim() ?? '—'}
                      </span>
                    </CellWrapper>
                    {/* 4. Feature（顯示功能需求名稱） */}
                    <CellWrapper colIdx={3} rowIdx={rowIdx}>
                      <span className="text-sm text-text-primary truncate max-w-full block" title={row.name}>
                        {row.name}
                      </span>
                    </CellWrapper>
                    {/* 5. Feature Spec (.md) */}
                    <CellWrapper colIdx={4} rowIdx={rowIdx}>
                      {row.featureSpecDocPath ? (
                        (() => {
                          const sp = row.featureSpecDocPath.trim();
                          const isDocsScope = sp.startsWith('/docs/');
                          const scope = isDocsScope ? 'docs' : 'project';
                          const pathParam = isDocsScope ? sp.slice(6) : sp.replace(/^\//, '');
                          const href = `/superadmin/docs?scope=${scope}&path=${encodeURIComponent(pathParam)}`;
                          const label = `${row.__rowId}-Dev-Spec.md`;
                          return (
                            <a href={href} className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline truncate max-w-full" title={sp}>
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{label}</span>
                            </a>
                          );
                        })()
                      ) : (
                        <span className="text-text-muted italic text-xs">—</span>
                      )}
                    </CellWrapper>
                    {/* 6. TDD Spec (.md) */}
                    <CellWrapper colIdx={5} rowIdx={rowIdx}>
                      {row.tddSpecDocPath ? (() => {
                        const tp = row.tddSpecDocPath.trim();
                        const isDocsScope = tp.startsWith('/docs/');
                        const scope = isDocsScope ? 'docs' : 'project';
                        const pathParam = isDocsScope ? tp.slice(6) : tp.replace(/^\//, '');
                        const href = `/superadmin/docs?scope=${scope}&path=${encodeURIComponent(pathParam)}`;
                        const label = `${row.__rowId}-TDD-Spec.md`;
                        return (
                          <a href={href} className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline truncate max-w-full" title={tp}>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{label}</span>
                          </a>
                        );
                      })() : <span className="text-text-muted italic text-xs">—</span>}
                    </CellWrapper>
                    {/* 7. TDD Progress Report (.md) */}
                    <CellWrapper colIdx={6} rowIdx={rowIdx}>
                      {row.docPath ? (() => {
                        const docPath = row.docPath.trim();
                        const isDocsScope = docPath.startsWith('/docs/');
                        const scope = isDocsScope ? 'docs' : 'project';
                        const pathParam = isDocsScope ? docPath.slice(6) : docPath.replace(/^\//, '');
                        const docsHref = `/superadmin/docs?scope=${scope}&path=${encodeURIComponent(pathParam)}`;
                        const label = `${row.__rowId}-TDD-Report.md`;
                        return (
                          <a href={docsHref} className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline truncate max-w-full" title={docPath}>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{label}</span>
                          </a>
                        );
                      })() : <span className="text-text-muted italic text-xs">—</span>}
                    </CellWrapper>
                    {/* 8. Unit and Integration Test Script Folder Name */}
                    <CellWrapper colIdx={7} rowIdx={rowIdx}>
                      {(() => {
                        const path = `apps/superadmin/unit_and_integration_test/${row.__rowId}`;
                        const href = `/superadmin/docs?scope=project&path=${encodeURIComponent(path)}`;
                        return (
                          <a href={href} className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline truncate max-w-full" title={path}>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{path}</span>
                          </a>
                        );
                      })()}
                    </CellWrapper>
                    {/* 9. E2E Acceptance Test Folder Name */}
                    <CellWrapper colIdx={8} rowIdx={rowIdx}>
                      {(() => {
                        const path = `apps/superadmin/e2e/${row.__rowId}`;
                        const href = `/superadmin/docs?scope=project&path=${encodeURIComponent(path)}`;
                        return (
                          <a href={href} className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline truncate max-w-full" title={path}>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{path}</span>
                          </a>
                        );
                      })()}
                    </CellWrapper>
                    {/* 10. TDD 進度（進度條） */}
                    <CellWrapper colIdx={9} rowIdx={rowIdx}>
                      <div className="w-full min-w-0 flex flex-col gap-0.5">
                        <div className="h-2 w-full rounded-full bg-bg-tertiary overflow-hidden" title={`TDD ${row.percentage}%`}>
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out min-w-0"
                            style={{ width: `${Math.min(100, Math.max(0, row.percentage))}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-text-muted">{row.percentage}%</span>
                      </div>
                    </CellWrapper>
                    {/* 11. E2E 測試進度（進度條） */}
                    <CellWrapper colIdx={10} rowIdx={rowIdx}>
                      <div className="w-full min-w-0 flex flex-col gap-0.5">
                        {(() => {
                          const pct = row.e2eTestCoverage ?? row.testCoverage ?? 0;
                          return (
                            <>
                              <div className="h-2 w-full rounded-full bg-bg-tertiary overflow-hidden" title={`E2E ${pct}%`}>
                                <div
                                  className="h-full rounded-full bg-blue-500 transition-all duration-500 ease-out min-w-0"
                                  style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-text-muted">{pct}%</span>
                            </>
                          );
                        })()}
                      </div>
                    </CellWrapper>
                    {/* 12. Prompt Engineer（IDE 在 Modal 內選擇） */}
                    <CellWrapper colIdx={11} rowIdx={rowIdx}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPromptConfig(row);
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-border-default bg-bg-secondary/60 px-2 py-1 text-[11px] text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span className="truncate">設定 Prompt / 執行</span>
                      </button>
                    </CellWrapper>
                    {/* 13. 狀態 */}
                    <CellWrapper colIdx={12} rowIdx={rowIdx}>
                      <select
                        className="w-full rounded-md border border-border-default bg-bg-secondary px-2 py-1 text-xs text-text-primary focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                        value={statusSelections[rowKey] ?? ''}
                        onChange={e => {
                          const value = e.target.value as RowStatus;
                          setStatusSelections(prev => ({
                            ...prev,
                            [rowKey]: value,
                          }));
                        }}
                      >
                        <option value="">—</option>
                        <option value="completed">已完成</option>
                        <option value="in_progress">進行中</option>
                        <option value="not_started">未開始</option>
                        <option value="on_hold">暫緩</option>
                      </select>
                    </CellWrapper>
                    {/* 14. 備註 */}
                    <CellWrapper colIdx={13} rowIdx={rowIdx}>
                      <span className="text-sm text-text-muted truncate max-w-full block">—</span>
                    </CellWrapper>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {promptConfigFeature && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-2xl mx-4 rounded-lg border border-border-default bg-bg-primary shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-light px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Prompt Engineer 設定
                </p>
                <p className="mt-0.5 text-xs text-text-muted truncate">
                  Row ID {promptConfigFeature.row.__rowId} – {promptConfigFeature.row.name}
                </p>
              </div>
              <button
                type="button"
                onClick={closePromptConfig}
                className="ml-3 rounded-md border border-border-default px-2 py-1 text-[11px] text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
              >
                關閉
              </button>
            </div>
            <div className="space-y-4 px-4 py-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-text-secondary">Row ID</p>
                  <p className="rounded-md border border-border-default bg-bg-secondary px-2 py-1 text-xs font-mono text-text-primary">
                    {promptConfigFeature.row.__rowId}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-text-secondary" htmlFor="prompt-config-ide">
                    IDE 開發工具
                  </label>
                  <select
                    id="prompt-config-ide"
                    className="w-full rounded-md border border-border-default bg-bg-secondary px-2 py-1 text-xs text-text-primary focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    value={promptConfigIDE}
                    onChange={e => {
                      const newIDE = e.target.value as IDEOption;
                      setPromptConfigIDE(newIDE);
                      const ctx = buildPromptContext(
                        promptConfigFeature.row,
                        promptConfigFeature.row.__rowId,
                        newIDE
                      );
                      if (promptConfigWorkCategory) {
                        const opt = WORK_CATEGORY_OPTIONS.find(o => o.id === promptConfigWorkCategory);
                        if (opt) setPromptText(opt.getPrompt(ctx));
                      } else {
                        setPromptText(getDefaultPrompt(ctx));
                      }
                    }}
                  >
                    <option value="">請選擇 IDE</option>
                    {IDE_OPTIONS.filter(opt => opt !== '').map(opt => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-text-secondary" htmlFor="prompt-config-work-category">
                    今日工作類別
                  </label>
                  <select
                    id="prompt-config-work-category"
                    className="w-full rounded-md border border-border-default bg-bg-secondary px-2 py-1 text-xs text-text-primary focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    value={promptConfigWorkCategory}
                    onChange={e => {
                      const id = e.target.value;
                      setPromptConfigWorkCategory(id);
                      if (id) {
                        const opt = WORK_CATEGORY_OPTIONS.find(o => o.id === id);
                        if (opt) {
                          const ctx = buildPromptContext(
                            promptConfigFeature.row,
                            promptConfigFeature.row.__rowId,
                            promptConfigIDE
                          );
                          setPromptText(opt.getPrompt(ctx));
                        }
                      }
                    }}
                  >
                    <option value="">請選擇工作類別（可選，預填 Prompt）</option>
                    {WORK_CATEGORY_OPTIONS.map(opt => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-text-secondary" htmlFor="prompt-config-text">
                  要送往 IDE / Agent 的 Prompt
                </label>
                <textarea
                  id="prompt-config-text"
                  className="min-h-[160px] w-full resize-y rounded-md border border-border-default bg-bg-secondary px-2 py-2 text-xs text-text-primary placeholder-text-muted focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  value={promptText}
                  onChange={e => setPromptText(e.target.value)}
                  placeholder="請輸入要送給 IDE / Agent 的完整指令 Prompt..."
                />
                <p className="mt-1 text-[10px] text-text-muted">
                  建議內容：針對目前這筆 Row 的工作 ID 與選定的 IDE，說明要開發與測試的 feature，要求先閱讀 Feature Spec (.md) / TDD Spec (.md)，依 TDD 流程撰寫 unit test 與 e2e test，並在完成後更新對應的 TDD Progress Report (.md)（變更摘要、測試範圍、執行結果）。
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-border-light px-4 py-3 bg-bg-secondary/60">
              <div className="flex flex-col gap-1 text-[10px] text-text-muted">
                {promptError && (
                  <p className="text-[10px] text-red-500">
                    {promptError}
                  </p>
                )}
                {currentTaskId ? (
                  <>
                    <p>
                      任務 ID：<span className="font-mono text-[10px]">{currentTaskId}</span>
                    </p>
                    <p>
                      狀態：{currentTaskStatus ?? 'queued'}
                    </p>
                    {currentTaskStatus === 'running' && (
                      <p className="text-emerald-600 dark:text-emerald-400 mt-1">
                        完成 TDD Report、測試通過並 git commit & push 後，在專案根目錄執行：<br />
                        <code className="text-[10px] bg-bg-secondary px-1 rounded">./scripts/complete-dev-task.sh {currentTaskId} succeeded</code>
                      </p>
                    )}
                    {currentTaskLogs.length > 0 && (
                      <p className="max-w-xs truncate" title={currentTaskLogs.join('\n')}>
                        最近 log：{currentTaskLogs[currentTaskLogs.length - 1]}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p>按下「送出 Prompt」後會建立任務、<strong>自動複製 Prompt 到剪貼簿</strong>，並嘗試喚醒本地 Agent。</p>
                    <p className="mt-1 text-text-muted">若已執行 <code className="text-[10px] bg-bg-secondary px-1 rounded">cd tools/local-agent &amp;&amp; npm run cursor</code>，Agent 會自動開啟 Cursor 並注入 Composer（Cmd+I → Cmd+V）；否則請手動切換到 Cursor 貼上 (Cmd+V) 開始執行。</p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closePromptConfig}
                  className="rounded-md border border-border-default px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-primary hover:text-text-primary"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleExecutePrompt}
                  disabled={isExecutingPrompt || !promptText.trim()}
                  className={clsx(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors',
                    isExecutingPrompt || !promptText.trim()
                      ? 'bg-emerald-600/50 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  )}
                >
                  {isExecutingPrompt ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>執行中...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      <span>送出 Prompt</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
