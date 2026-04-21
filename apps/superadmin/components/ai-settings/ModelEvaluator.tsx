'use client';

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, Loader2, FlaskConical, Upload, Cloud, MessageCircle, FileText, PenTool, Layout, Settings2, Plus, X, AlignLeft, Eye, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/Sheet';
import { AI_PROVIDERS, FEATURE_MODULES } from '@/lib/ai-providers';
import type { FeatureModule } from '@/lib/ai-providers';
import { hasVisionCapability } from '@/lib/utils/vision-capability';
import type { SavedKey, SavedModel, ModelEvaluation, KeyValidationResult, SavedModule, AssignedModel, DisplayStatusOverride } from '@/lib/hooks/useAISettings';
import { getAvailableModelsList } from '@/lib/utils/total-available-models';
import { readLocalStorage, writeLocalStorage, readSessionStorage, writeSessionStorage } from '@/lib/utils/storage-state';
import { useTablePreferences } from '@/lib/hooks/useTablePreferences';

// Canonical copies of types/utils extracted to ./model-evaluator/types.ts and
// ./model-evaluator/utils.ts for future modularization. ModelEvaluator still
// uses its own local definitions to avoid a massive single-file rewrite.

// These types/constants are used in the migration block above (before their
// local const declaration), so import them from the extracted module.
import {
  MODEL_EVAL_STORAGE_KEY as _ME_SK,
  MODEL_EVAL_DEFAULTS as _ME_DEFAULTS,
  FREEZE_ROW_STORAGE_KEY as _FR_SK,
} from './model-evaluator/types';

export interface KeyWithId {
  id: string;
  provider: string;
}

export interface BatchProgress {
  tested: number;
  total: number;
  succeeded: number;
  failed: number;
}

export interface BatchResultEntry {
  key: string;
  providerId: string;
  providerName: string;
  modelId: string;
  modelName: string;
  success: boolean;
  output: string;
  imageUrl?: string;
}

type RecentBatchReport = {
  savedAt: string;
  total: number;
  succeeded: number;
  failed: number;
  entries: BatchResultEntry[];
};

function readRecentBatchReport(): RecentBatchReport | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LS_RECENT_BATCH_REPORT);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RecentBatchReport>;
    if (!Array.isArray(parsed.entries)) return null;
    return {
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
      total: typeof parsed.total === 'number' ? parsed.total : parsed.entries.length,
      succeeded: typeof parsed.succeeded === 'number' ? parsed.succeeded : parsed.entries.filter((r) => !!r?.success).length,
      failed: typeof parsed.failed === 'number' ? parsed.failed : parsed.entries.filter((r) => !r?.success).length,
      entries: parsed.entries,
    };
  } catch {
    return null;
  }
}

function writeRecentBatchReport(report: RecentBatchReport): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(LS_RECENT_BATCH_REPORT, JSON.stringify(report));
    return true;
  } catch {
    return false;
  }
}

function inferStatusOverrideFromBatchEntry(entry: BatchResultEntry): DisplayStatusOverride {
  if (!entry.success) return 'not_working';
  const category = detectCategoryFromOutput(entry.output);
  if (category === 'VLM') return 'vlm_ok';
  if (category === 'LLM') return 'llm_ok';
  return hasVisionCapability(entry.key) ? 'vlm_ok' : 'llm_ok';
}

const SS_FILTER_STATUSES  = 'ai-eval-filter:statuses';
const SS_FILTER_PROVIDERS = 'ai-eval-filter:providerIds';
const LS_FILTER_CATEGORIES = 'ai-eval-filter:categories';
const LS_RECENT_BATCH_REPORT = 'ai-eval:last-batch-report';

const MODULE_ICON_MAP: Record<string, React.ElementType> = {
  cloud: Cloud, 'hard-drive': Settings2, 'message-circle': MessageCircle,
  'file-text': FileText, 'pen-tool': PenTool, layout: Layout,
};

// One-time migration: merge old v1 localStorage keys into the new unified v2 key
// Uses imported aliases (_ME_SK, _FR_SK, _ME_DEFAULTS) because local consts are declared later.
if (typeof window !== 'undefined' && !localStorage.getItem(_ME_SK)) {
  try {
    const partial: Partial<ModelEvalSettings> = {};
    const oldWidths = localStorage.getItem('superadmin-model-evaluator-column-widths');
    if (oldWidths) { try { partial.columnWidths = JSON.parse(oldWidths); } catch { /* ignore */ } }
    const oldLabel = localStorage.getItem('superadmin-model-evaluator-prompt-column-label');
    if (oldLabel) partial.promptColumnLabel = oldLabel;
    const oldFreezeRow = localStorage.getItem(_FR_SK);
    if (oldFreezeRow === '0') partial.freezeRowCount = 0;
    const oldFrozenCol = localStorage.getItem('superadmin-model-evaluator-frozen-col-v1');
    if (oldFrozenCol) { const n = parseInt(oldFrozenCol, 10); if (!Number.isNaN(n)) partial.frozenColCount = n; }
    if (Object.keys(partial).length > 0) {
      localStorage.setItem(_ME_SK, JSON.stringify({ ..._ME_DEFAULTS, ...partial }));
    }
  } catch { /* ignore */ }
}

export interface ModelEvaluatorProps {
  savedKeys: SavedKey[];
  savedModels?: SavedModel[];
  savedEvaluations: ModelEvaluation[];
  /** 與頁首「可選」同一來源：有值時表格顯示此清單（與 163/178 一致），否則 fallback 為 AI_PROVIDERS 精選 */
  validateAllResultsByKeyId?: Record<string, KeyValidationResult>;
  currentKeys?: KeyWithId[];
  onSave: (evaluations: ModelEvaluation[]) => Promise<void>;
  onTestModel: (
    provider: string,
    modelId: string,
    prompt?: string,
    file?: File | null
  ) => Promise<{ success: boolean; message?: string; output?: string; output_image_url?: string }>;
  /** 可選：在此分頁勾選/取消「已選」時寫回 ai_model_selections，與 API 金鑰管理同步 */
  onSaveModels?: (
    providerId: string,
    selections: { modelId: string; modelName: string; isPrimary: boolean }[]
  ) => Promise<void>;
  /** 功能模組配置（整合自 #modules）*/
  savedModules?: SavedModule[];
  onSaveModule?: (
    moduleKey: string,
    isEnabled: boolean,
    assignedModels: AssignedModel[],
    config?: Record<string, unknown>
  ) => Promise<void>;
  /** Optional: hide specific feature module columns in this page only */
  hiddenModuleKeys?: string[];
  /** 由頁首控制的全域評測 Prompt 與檔案（提升 state 以便顯示在固定標題區） */
  globalTestPrompt: string;
  onChangeGlobalTestPrompt: (value: string) => void;
  uploadedFile: File | null;
  onChangeUploadedFile: (file: File | null) => void;
  /** 頁首摘要：已選/可選模型數，顯示在表格工具列左側 */
  summarySelectedCount: number;
  summaryTotalCount: number;
  /** 由頁首雲端 Prompt 下拉選單決定的變數名稱，例如 {OCR Engineer-1}（僅顯示用） */
  promptVariableLabel?: string;
  /** 由頁首固定區塊觸發的動作（例如「全部測試」按鈕）
   * 支援傳入 React.Dispatch<SetStateAction<...>> 或 RefObject 兩種模式 */
  headerActionsRef?:
    | React.Dispatch<React.SetStateAction<{
        runBatchTest: () => void;
        abortBatchTest: () => void;
        batchTesting: boolean;
        canBatchTest: boolean;
        tooltip: string;
        batchProgress: BatchProgress | null;
        testableCount: number;
        selectedCount: number;
        totalCount: number;
        filteredTotal: number;
        filteredSelectedCount: number;
        hasRecentBatchReport?: boolean;
        openRecentBatchReport?: () => void;
        applyRecentBatchReport?: () => Promise<void>;
        applyingRecentBatchReport?: boolean;
      } | null>>
    | React.RefObject<{
        runBatchTest: () => void;
        abortBatchTest: () => void;
        batchTesting: boolean;
        canBatchTest: boolean;
        tooltip: string;
        batchProgress: BatchProgress | null;
        testableCount: number;
        selectedCount: number;
        totalCount: number;
        filteredTotal: number;
        filteredSelectedCount: number;
        hasRecentBatchReport?: boolean;
        openRecentBatchReport?: () => void;
        applyRecentBatchReport?: () => Promise<void>;
        applyingRecentBatchReport?: boolean;
      } | null>;
  /** 狀態標籤顯示模式：一般分頁顯示 VLM/LLM，OCR 分頁顯示 OCR 可用 */
  statusLabelMode?: 'vlm' | 'ocr';
}

type TableHAlign = 'left' | 'center' | 'right';
type TableVAlign = 'top' | 'middle' | 'bottom';

const TABLE_H_ALIGN_CLASSES: Record<TableHAlign, string> = {
  left: '[&_th]:text-left [&_td]:text-left',
  center: '[&_th]:text-center [&_td]:text-center',
  right: '[&_th]:text-right [&_td]:text-right',
};

const TABLE_V_ALIGN_CLASSES: Record<TableVAlign, string> = {
  top: '[&_th]:align-top [&_td]:align-top',
  middle: '[&_th]:align-middle [&_td]:align-middle',
  bottom: '[&_th]:align-bottom [&_td]:align-bottom',
};

/** 模組排序欄位顯示用：類型代碼（例 OCR-001） */
const MODULE_SORT_LABEL: Record<string, string> = {
  online_ocr: 'OCR',
  online_ocr_parse: 'OCP',
  online_ocr_judge: 'OCJ',
  web_assistant: 'WAS',
  contract_assistant: 'CAS',
  blog_generator: 'GEN',
  property_description: 'PDS',
  ad_generator: 'AD',
  software_dev_engineer: 'SDE',
  ttd_engineer: 'TTD',
};

const MODULE_CATEGORY_COLORS: Record<string, { text: string; bg: string }> = {
  ocr:       { text: 'text-blue-400',   bg: 'bg-blue-500/10'   },
  assistant: { text: 'text-green-400',  bg: 'bg-green-500/10'  },
  generator: { text: 'text-purple-400', bg: 'bg-purple-500/10' },
};

/**
 * 對每個功能模組，預先計算「理論上允許綁定」的 provider::model 清單，
 * 例如 online_ocr 只接受具備 vision 能力的模型。
 */
const MODULE_ELIGIBLE_KEYS: Record<string, Set<string>> = (() => {
  const result: Record<string, Set<string>> = {};
  for (const mod of FEATURE_MODULES) {
    const needed = (mod.requiredCapabilities ?? []) as string[];
    const keySet = new Set<string>();
    // 沒有特別需求時，不強制限制（保留舊資料）
    if (needed.length === 0) {
      result[mod.key] = keySet;
      continue;
    }
    for (const provider of AI_PROVIDERS) {
      for (const model of provider.models) {
        const caps = model.capabilities ?? [];
        if (needed.every((cap) => caps.includes(cap))) {
          keySet.add(`${provider.id}::${model.id}`);
        }
      }
    }
    result[mod.key] = keySet;
  }
  return result;
})();

/**
 * Normalize priorities for a module's assigned models so they are always 1..N.
 * Any missing/invalid priority is treated as lowest priority; ties are broken
 * deterministically by provider+model to keep ordering stable.
 */
function normalizeAssignments(assignments: AssignedModel[]): AssignedModel[] {
  if (assignments.length === 0) return [];
  const copied = [...assignments];
  copied.sort((a, b) => {
    const pa = typeof a.priority === 'number' && a.priority >= 1 ? a.priority : Number.MAX_SAFE_INTEGER;
    const pb = typeof b.priority === 'number' && b.priority >= 1 ? b.priority : Number.MAX_SAFE_INTEGER;
    if (pa !== pb) return pa - pb;
    const ak = `${a.provider}::${a.model}`;
    const bk = `${b.provider}::${b.model}`;
    return ak.localeCompare(bk);
  });
  return copied.map((a, index) => ({ ...a, priority: index + 1 }));
}

/**
 * Reorder a single assignment to the requested priority, shifting others and
 * keeping priorities normalized to 1..N.
 */
function reorderAssignment(
  assignments: AssignedModel[],
  providerId: string,
  modelId: string,
  requestedPriority: number,
): AssignedModel[] {
  if (assignments.length === 0) return assignments;

  // Always operate on a normalized copy so priorities are consecutive.
  const list = normalizeAssignments(assignments);

  const fromIndex = list.findIndex(
    (a) => a.provider === providerId && a.model === modelId,
  );
  if (fromIndex === -1) return list;

  const maxIndex = list.length - 1;
  const toIndex = Math.min(Math.max(requestedPriority - 1, 0), maxIndex);
  if (fromIndex === toIndex) return list;

  const [target] = list.splice(fromIndex, 1);
  list.splice(toIndex, 0, target);

  return normalizeAssignments(list);
}

/** Closes a dropdown when clicking outside its ref element or pressing Escape. */
function useClickOutsideClose(
  ref: React.RefObject<HTMLDivElement | null>,
  open: boolean,
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
) {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, setOpen, ref]);
}

function getModelDisplayName(providerId: string, modelId: string): string {
  const p = AI_PROVIDERS.find((x) => x.id === providerId);
  const m = p?.models.find((x) => x.id === modelId);
  return m?.name ?? modelId;
}

/** Extract the first image URL found in model output text (markdown ![]() or bare URL ending in image extension) */
function extractImageUrlFromOutput(output: string): string | undefined {
  if (!output) return undefined;
  // markdown image: ![alt](url)
  const mdMatch = output.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/i);
  if (mdMatch) return mdMatch[1];
  // bare URL ending in image extension
  const bareMatch = output.match(/https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp)(?:[?#]\S*)?/i);
  if (bareMatch) return bareMatch[0];
  return undefined;
}

/** 從 Prompt output text 自動推斷模型分類：成功解析檔案內容視為 VLM，有回應但未解析（如「看不到檔案」）視為 LLM */
function detectCategoryFromOutput(output: string | undefined): 'VLM' | 'LLM' | 'unknown' {
  const text = (output ?? '').trim();
  if (!text) return 'unknown';
  const lower = text.toLowerCase();
  const noFilePhrases = [
    '看不到', '無法看到', '無法讀取', '沒有收到', '沒有檔案', '沒有附件', '未提供', '未上傳',
    "can't see", 'cannot see', 'no file', 'no attachment', 'i don\'t have access', "i don't have",
    'not provided', 'without the file', '沒有提供', '無法取得', '無法辨識', '沒有圖', '沒有圖檔',
    '沒有圖片', '沒有文件', '沒有文件檔', '沒有pdf', '沒有上傳', '請提供檔案', '請上傳',
  ];
  const hasNoFile = noFilePhrases.some((p) => text.includes(p) || lower.includes(p.toLowerCase()));
  if (hasNoFile) return 'LLM';
  const docContentPhrases = [
    '所有權人', '所有權', '姓名', '地號', '建號', '權利範圍', '面積', '坐落', '謄本',
    '土地', '建物', '持分', '登記', '所有權人姓名', '所有權人為', '解析出', '根據檔案',
    '根據文件', '根據您提供的', '從檔案中', '從文件中', '文件中顯示', '檔案內容',
  ];
  const hasDocContent = docContentPhrases.some((p) => text.includes(p));
  if (hasDocContent) return 'VLM';
  return 'unknown';
}

/** 依測試輸出區分狀態顯示：僅成功解析檔案內容算 OCR 可用，「我看不到檔案」等僅算 LLM 可用 */
type StatusDisplay = { type: 'vlm_ok' | 'llm_ok' | 'working' | 'not_working' | 'untested'; label: string; title: string };

/** 四種狀態選項，供使用者手動修正 AI 判斷（移除模糊的「通用模型可用」，強制明確 VLM/LLM/OCR） */
function getStatusOverrideOptions(isOcrMode: boolean): { value: DisplayStatusOverride; label: string }[] {
  const vlmLabel = isOcrMode ? 'OCR可用' : 'OCR 可用';
  return [
    { value: 'vlm_ok', label: vlmLabel },
    { value: 'llm_ok', label: 'LLM 可用' },
    { value: 'not_working', label: '不可用' },
    { value: 'untested', label: '尚未測試' },
  ];
}

function getStatusDisplayByType(type: DisplayStatusOverride, isOcrMode: boolean): StatusDisplay {
  const vlmLabel = isOcrMode ? 'OCR可用' : 'OCR 可用';
  const map: Record<DisplayStatusOverride, StatusDisplay> = {
    vlm_ok: { type: 'vlm_ok', label: vlmLabel, title: `手動設定：${vlmLabel}` },
    llm_ok: { type: 'llm_ok', label: 'LLM 可用', title: '手動設定：LLM 可用' },
    working: { type: 'working', label: '通用模型可用', title: '手動設定：通用模型可用' },
    not_working: { type: 'not_working', label: '不可用', title: '手動設定：不可用' },
    untested: { type: 'untested', label: '尚未測試', title: '手動設定：尚未測試' },
  };
  return map[type];
}

function getStatusDisplay(
  key: string,
  ev: ModelEvaluation | undefined,
  testResultByKey: Record<string, boolean>,
  outputByKey: Record<string, string>,
  isOcrMode: boolean
): StatusDisplay {
  if (ev?.display_status_override) return getStatusDisplayByType(ev.display_status_override, isOcrMode);

  const outputText = (outputByKey[key] ?? ev?.notes ?? '').trim();
  const sessionSuccess = testResultByKey[key];
  const persistedWorking = ev?.is_working;
  const success = sessionSuccess === true || (sessionSuccess !== false && persistedWorking);

  const isVisionModel = hasVisionCapability(key);

  if (!outputText) {
    if (success) {
      if (isVisionModel)
        return {
          type: 'vlm_ok',
          label: isOcrMode ? 'OCR可用' : 'OCR 可用',
          title: isOcrMode
            ? 'API 連線成功，依模型靜態定義具 vision 能力，判定為 OCR 可用'
            : 'API 連線成功，依模型靜態定義具 vision 能力，判定為 OCR 可用',
        };
      return { type: 'llm_ok', label: 'LLM 可用', title: 'API 連線成功，依模型靜態定義無 vision 能力，判定為 LLM 可用' };
    }
    if (sessionSuccess === false || (ev && !ev.is_working))
      return { type: 'not_working', label: '不可用', title: '測試失敗或未通過' };
    return { type: 'untested', label: '未測試', title: '尚未執行檔案解析測試' };
  }

  const category = detectCategoryFromOutput(outputText);
  if (category === 'VLM' && success)
    return {
      type: 'vlm_ok',
      label: isOcrMode ? 'OCR可用' : 'OCR 可用',
      title: isOcrMode
        ? '依本測試輸出：已成功解析檔案內容，視為 OCR 可用'
        : '依本測試輸出：已成功解析檔案內容，視為 OCR 可用',
    };
  if (category === 'LLM' && success)
    return { type: 'llm_ok', label: 'LLM 可用', title: '依本測試輸出：有文字回應但未解析檔案（如「看不到檔案」），僅算 LLM 可用，不算 OCR 可用' };
  if (category === 'unknown' && success) {
    if (isVisionModel)
      return {
        type: 'vlm_ok',
        label: isOcrMode ? 'OCR可用' : 'OCR 可用',
        title: isOcrMode
          ? 'API 有回應，輸出無法明確推斷，依模型靜態定義具 vision 能力，暫判定為 OCR 可用'
          : 'API 有回應，輸出無法明確推斷，依模型靜態定義具 vision 能力，判定為 OCR 可用',
      };
    return { type: 'llm_ok', label: 'LLM 可用', title: 'API 有回應，輸出無法明確推斷，依模型靜態定義無 vision 能力，判定為 LLM 可用' };
  }
  return { type: 'not_working', label: '不可用', title: '測試失敗或無有效輸出' };
}

const MODEL_EVAL_PAGE_KEY = 'model_evaluator';
const MODEL_EVAL_STORAGE_KEY = 'model_evaluator_settings_v2';
const FREEZE_ROW_STORAGE_KEY = 'superadmin-model-evaluator-freeze-row-v1';
const MODEL_EVAL_DEFAULT_COLUMN_WIDTHS = [120, 80, 220, 48, 140, 72, 200, 140, 110, 88, 88, 88, 88, 88, 88, 88];

interface ModelEvalSettings extends Record<string, unknown> {
  columnWidths: number[];
  promptColumnLabel: string;
  freezeRowCount: 0 | 1;
  frozenColCount: number;
  tableAlignH: TableHAlign;
  tableAlignV: TableVAlign;
}

const MODEL_EVAL_DEFAULTS: ModelEvalSettings = {
  columnWidths: [...MODEL_EVAL_DEFAULT_COLUMN_WIDTHS],
  promptColumnLabel: 'Prompt input',
  freezeRowCount: 1,
  frozenColCount: 0,
  tableAlignH: 'left',
  tableAlignV: 'top',
};

export function ModelEvaluator({
  savedKeys,
  savedModels = [],
  savedEvaluations,
  validateAllResultsByKeyId = {},
  currentKeys = [],
  onSave,
  onSaveModels,
  onTestModel,
  savedModules = [],
  onSaveModule,
  hiddenModuleKeys = [],
  globalTestPrompt,
  onChangeGlobalTestPrompt,
  uploadedFile,
  onChangeUploadedFile,
  summarySelectedCount,
  summaryTotalCount,
  headerActionsRef,
  promptVariableLabel,
  statusLabelMode = 'vlm',
}: ModelEvaluatorProps) {
  /** 內部判斷是否使用全域 Prompt 的保留字（不隨顯示名稱變動） */
  const DEFAULT_PROMPT_PLACEHOLDER = '{預設prompt}';
  /** 在欄位與 placeholder 中顯示給使用者看的變數名稱，例如 {OCR Engineer-1} */
  const effectivePromptVariableLabel =
    (promptVariableLabel && promptVariableLabel.trim().length > 0
      ? promptVariableLabel.trim()
      : DEFAULT_PROMPT_PLACEHOLDER);
  // Persisted table preferences (localStorage cache + DB sync)
  const { settings: tablePrefs, patch: patchTablePrefs } = useTablePreferences<ModelEvalSettings>({
    pageKey: MODEL_EVAL_PAGE_KEY,
    storageKey: MODEL_EVAL_STORAGE_KEY,
    defaults: MODEL_EVAL_DEFAULTS,
  });

  const TABLE_COLUMN_COUNT = MODEL_EVAL_DEFAULT_COLUMN_WIDTHS.length;
  const isOcrMode = statusLabelMode === 'ocr';
  const columnWidths = tablePrefs.columnWidths;
  const promptColumnLabel = tablePrefs.promptColumnLabel;
  const freezeRowCount = tablePrefs.freezeRowCount;
  const frozenColCount = tablePrefs.frozenColCount;
  const tableAlignH = tablePrefs.tableAlignH;
  const tableAlignV = tablePrefs.tableAlignV;

  const startXRef = useRef(0);
  const resizingColRef = useRef<number | null>(null);
  const columnWidthsRef = useRef(columnWidths);
  columnWidthsRef.current = columnWidths;

  const handleResizeStart = useCallback((colIndex: number) => (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    resizingColRef.current = colIndex;
    startXRef.current = e.clientX;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMove = (ev: MouseEvent) => {
      if (resizingColRef.current === null) return;
      const delta = ev.clientX - startXRef.current;
      startXRef.current = ev.clientX;
      const next = [...columnWidthsRef.current];
      const idx = resizingColRef.current;
      next[idx] = Math.max(32, (next[idx] ?? MODEL_EVAL_DEFAULT_COLUMN_WIDTHS[idx]) + delta);
      columnWidthsRef.current = next;
      patchTablePrefs({ columnWidths: next });
    };
    const onUp = () => {
      resizingColRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [patchTablePrefs]);

  const setPromptColumnLabel = useCallback((value: string | ((prev: string) => string)) => {
    const next = typeof value === 'function' ? value(promptColumnLabel) : value;
    patchTablePrefs({ promptColumnLabel: next });
  }, [promptColumnLabel, patchTablePrefs]);
  /** Per-row custom prompts; empty string means "use global testPrompt" */
  const [rowPrompts, setRowPrompts] = useState<Record<string, string>>({});
  const [outputByKey, setOutputByKey] = useState<Record<string, string>>({});
  const [imageOutputByKey, setImageOutputByKey] = useState<Record<string, string>>({});
  /** 本頁測試結果（優先於 DB 的 savedEvaluations 顯示在「狀態」欄） */
  const [testResultByKey, setTestResultByKey] = useState<Record<string, boolean>>({});
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [batchTesting, setBatchTesting] = useState(false);
  const [applyingRecentBatchReport, setApplyingRecentBatchReport] = useState(false);
  const batchTestingRef = useRef(false);
  /** 使用者點擊「暫停測試」時設為 true，批次測試在每批之間檢查並提前結束 */
  const batchAbortRequestedRef = useRef(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [batchResults, setBatchResults] = useState<BatchResultEntry[] | null>(null);
  /** 上次全域評測完成後的摘要，供畫面顯示「測試前已選 N 筆 → 成功 X、失敗 Y」，不影響模型勾選 */
  const [lastBatchTestSummary, setLastBatchTestSummary] = useState<{
    selectedBeforeTest: number;
    total: number;
    succeeded: number;
    failed: number;
  } | null>(null);
  const [hasRecentBatchReport, setHasRecentBatchReport] = useState(false);
  const [rowTestPanel, setRowTestPanel] = useState<{
    key: string;
    providerId: string;
    modelId: string;
    modelName: string;
  } | null>(null);
  const [rowTestPrompt, setRowTestPrompt] = useState<string>('');
  /** True when the user has manually typed in the single-test prompt textarea; suppresses auto-sync. */
  const [rowTestPromptDirty, setRowTestPromptDirty] = useState(false);
  const [rowTestFile, setRowTestFile] = useState<File | null>(null);
  const [alignDropdownOpen, setAlignDropdownOpen] = useState(false);
  const alignDropdownRef = useRef<HTMLDivElement | null>(null);
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const viewDropdownRef = useRef<HTMLDivElement | null>(null);
  /** 哪一列的「模型分類與狀態」下拉已展開（row key = providerId::modelId） */
  const [openStatusDropdownKey, setOpenStatusDropdownKey] = useState<string | null>(null);
  const [statusDropdownPos, setStatusDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const statusDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const statusBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const frozenColLeftOffsets = useMemo(() => {
    const offsets: number[] = [];
    let acc = 0;
    for (let i = 0; i < columnWidths.length; i++) {
      offsets.push(acc);
      acc += columnWidths[i] ?? MODEL_EVAL_DEFAULT_COLUMN_WIDTHS[i] ?? 80;
    }
    return offsets;
  }, [columnWidths]);

  const getFrozenThClass = useCallback(
    (colIdx: number) => {
      const isFrozen = colIdx < frozenColCount;
      const isBoundary =
        frozenColCount > 0 && colIdx === frozenColCount - 1;
      return [
        isFrozen && 'sticky bg-bg-tertiary',
        isBoundary && 'border-r-4 border-gray-300 dark:border-gray-600',
      ]
        .filter(Boolean)
        .join(' ');
    },
    [frozenColCount]
  );
  const getFrozenThStyle = useCallback(
    (colIdx: number): React.CSSProperties =>
      colIdx < frozenColCount
        ? { left: frozenColLeftOffsets[colIdx], zIndex: 11 }
        : {},
    [frozenColCount, frozenColLeftOffsets]
  );
  const getFrozenTdClass = useCallback(
    (colIdx: number) => {
      const isFrozen = colIdx < frozenColCount;
      const isBoundary =
        frozenColCount > 0 && colIdx === frozenColCount - 1;
      return [
        isFrozen && 'sticky bg-bg-primary',
        isBoundary && 'border-r-4 border-gray-300 dark:border-gray-600',
      ]
        .filter(Boolean)
        .join(' ');
    },
    [frozenColCount]
  );
  const getFrozenTdStyle = useCallback(
    (colIdx: number): React.CSSProperties =>
      colIdx < frozenColCount
        ? { left: frozenColLeftOffsets[colIdx], zIndex: 1 }
        : {},
    [frozenColCount, frozenColLeftOffsets]
  );

  const hiddenModuleKeySet = useMemo(() => new Set(hiddenModuleKeys), [hiddenModuleKeys]);

  useEffect(() => {
    setHasRecentBatchReport(readRecentBatchReport() !== null);
  }, []);

  const saveRecentBatchReport = useCallback((entries: BatchResultEntry[]) => {
    const report: RecentBatchReport = {
      savedAt: new Date().toISOString(),
      total: entries.length,
      succeeded: entries.filter((r) => r.success).length,
      failed: entries.filter((r) => !r.success).length,
      entries,
    };
    const ok = writeRecentBatchReport(report);
    setHasRecentBatchReport(ok);
  }, []);

  const openRecentBatchReport = useCallback(() => {
    const report = readRecentBatchReport();
    if (!report) {
      setHasRecentBatchReport(false);
      if (typeof window !== 'undefined') {
        window.alert('目前沒有可檢視的最近報告。');
      }
      return;
    }
    setHasRecentBatchReport(true);
    setBatchResults(report.entries);
  }, []);

  const visibleFeatureModules = useMemo(
    () => FEATURE_MODULES.filter((mod) => !hiddenModuleKeySet.has(mod.key)),
    [hiddenModuleKeySet]
  );
  // 目前實際顯示的欄位數量：9 個固定欄 + 每個可見模組 1 欄，避免多餘 col 造成右側空白區
  const effectiveColumnCount = 9 + visibleFeatureModules.length;

  // ── Feature module state (integrated from #modules) ──────────────────────
  interface ModuleRowState { isEnabled: boolean; assignments: AssignedModel[] }
  /** 從 saved 建出 state，並將 priority 正規化為 1,2,3…（避免後端存成 100 或 173 等歷史值） */
  const buildModuleStatesFromSaved = useCallback(
    (modules: typeof savedModules): Record<string, ModuleRowState> => {
      const init: Record<string, ModuleRowState> = {};
      for (const mod of FEATURE_MODULES) {
        const saved = modules.find((s) => s.module_key === mod.key);
        // Trust what's persisted in DB; do not filter by static capability list here,
        // as that would silently strip user-assigned models after every save.
        const raw: AssignedModel[] = Array.isArray(saved?.assigned_models)
          ? saved.assigned_models
          : [];
        const assignments = normalizeAssignments(raw);
        init[mod.key] = {
          isEnabled: saved?.is_enabled ?? false,
          assignments,
        };
      }
      return init;
    },
    [],
  );
  const [moduleStates, setModuleStates] = useState<Record<string, ModuleRowState>>(() =>
    buildModuleStatesFromSaved(savedModules)
  );
  const [moduleSavingSet, setModuleSavingSet] = useState<Set<string>>(new Set());
  // savedModules 晚載入（API 回傳）時重新同步並正規化，否則會一直顯示 100；依內容變更才同步，避免父層 re-render 就覆寫
  const savedModulesSignature = useMemo(
    () =>
      JSON.stringify(
        (savedModules ?? []).map((m) => ({
          key: m.module_key,
          enabled: m.is_enabled,
          count: m.assigned_models?.length ?? 0,
          priorities: (m.assigned_models ?? []).map((a) => a.priority ?? 0),
        })),
      ),
    [savedModules],
  );
  useEffect(() => {
    setModuleStates(buildModuleStatesFromSaved(savedModules));
  }, [savedModulesSignature, savedModules, buildModuleStatesFromSaved]);

  const markModuleSaving = useCallback((key: string, on: boolean) => {
    setModuleSavingSet((prev) => { const s = new Set(prev); on ? s.add(key) : s.delete(key); return s; });
  }, []);

  const showModuleSaveError = useCallback((moduleKey: string, err: unknown) => {
    const moduleName = FEATURE_MODULES.find((mod) => mod.key === moduleKey)?.name ?? moduleKey;
    const rawMessage =
      err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: unknown }).message === 'string'
          ? (err as { message: string }).message
          : '';
    const message = rawMessage.includes('ai_modules_assigned_function_check')
      ? '目前資料庫尚未同步最新 OCR 模組設定，請先套用最新 migration。'
      : rawMessage || '儲存模組設定失敗';
    if (typeof window !== 'undefined') {
      window.alert(`「${moduleName}」模組設定儲存失敗：${message}`);
    }
  }, []);

  const handleToggleModuleEnabled = useCallback(async (moduleKey: string) => {
    if (!onSaveModule) return;
    const cur = moduleStates[moduleKey];
    const next = !cur.isEnabled;
    setModuleStates((p) => ({ ...p, [moduleKey]: { ...p[moduleKey], isEnabled: next } }));
    markModuleSaving(moduleKey, true);
    try {
      await onSaveModule(moduleKey, next, cur.assignments);
    } catch (err) {
      setModuleStates((p) => ({ ...p, [moduleKey]: cur }));
      showModuleSaveError(moduleKey, err);
    }
    finally { markModuleSaving(moduleKey, false); }
  }, [moduleStates, onSaveModule, markModuleSaving, showModuleSaveError]);

  const handleModuleAssignModel = useCallback(async (
    moduleKey: string, providerId: string, modelId: string
  ) => {
    if (!onSaveModule) return;
    const cur = moduleStates[moduleKey];
    const idx = cur.assignments.findIndex(
      (a) => a.provider === providerId && a.model === modelId,
    );
    let next: AssignedModel[];
    if (idx >= 0) {
      // Unassign: 移除後重新正規化 priority 為 1..N
      const remaining = cur.assignments.filter((_, i) => i !== idx);
      next = normalizeAssignments(remaining);
    } else {
      // Assign: 附加在列表尾端，再統一正規化
      const appended: AssignedModel[] = [
        ...cur.assignments,
        { provider: providerId, model: modelId, priority: cur.assignments.length + 1 },
      ];
      next = normalizeAssignments(appended);
    }
    setModuleStates((p) => ({ ...p, [moduleKey]: { ...p[moduleKey], assignments: next } }));
    markModuleSaving(moduleKey, true);
    try {
      await onSaveModule(moduleKey, cur.isEnabled, next);
    } catch (err) {
      setModuleStates((p) => ({ ...p, [moduleKey]: cur }));
      showModuleSaveError(moduleKey, err);
    }
    finally { markModuleSaving(moduleKey, false); }
  }, [moduleStates, onSaveModule, markModuleSaving, showModuleSaveError]);

  const handleModulePriorityChange = useCallback(async (
    moduleKey: string, providerId: string, modelId: string, newPriority: number
  ) => {
    if (!onSaveModule) return;
    const cur = moduleStates[moduleKey];
    const next = reorderAssignment(cur.assignments, providerId, modelId, newPriority);

    setModuleStates((p) => ({ ...p, [moduleKey]: { ...p[moduleKey], assignments: next } }));
    markModuleSaving(moduleKey, true);
    try {
      await onSaveModule(moduleKey, cur.isEnabled, next);
    } catch (err) {
      setModuleStates((p) => ({ ...p, [moduleKey]: cur }));
      showModuleSaveError(moduleKey, err);
    }
    finally { markModuleSaving(moduleKey, false); }
  }, [moduleStates, onSaveModule, markModuleSaving, showModuleSaveError]);

  // ─────────────────────────────────────────────────────────────────────────

  /** 依公司篩選：空陣列 = 全部，否則為勾選的 providerId 列表；預設全部公司以利「全選」可用。
   *  優先從 localStorage 還原，若尚未寫入則回退至舊版 sessionStorage 值。 */
  const [filterProviderIds, setFilterProviderIds] = useState<string[]>(
    () =>
      readLocalStorage<string[]>(
        SS_FILTER_PROVIDERS,
        readSessionStorage<string[]>(SS_FILTER_PROVIDERS, []),
      )
  );
  /** 依狀態篩選：空陣列 = 全部，否則為勾選的 vlm_ok / llm_ok / not_working / untested
   *  優先從 localStorage 還原，若尚未寫入則回退至舊版 sessionStorage 值。 */
  const VALID_STATUS_VALUES = new Set(['vlm_ok', 'llm_ok', 'not_working', 'untested']);
  const [filterStatuses, setFilterStatuses] = useState<string[]>(
    () =>
      readLocalStorage<string[]>(
        SS_FILTER_STATUSES,
        readSessionStorage<string[]>(SS_FILTER_STATUSES, []),
      ).filter((v) => VALID_STATUS_VALUES.has(v))
  );
  /** 依模型分類篩選：空陣列 = 全部，否則為勾選的 VLM / LLM / unknown；預設全部以利「全選」可用。
   *  使用 localStorage 永久記住最後一次使用者設定。 */
  const [filterCategories, setFilterCategories] = useState<string[]>(
    () => readLocalStorage<string[]>(LS_FILTER_CATEGORIES, []),
  );
  // ── Persist filter state to storage on change ─────────────────────
  useEffect(() => {
    writeLocalStorage(SS_FILTER_STATUSES, filterStatuses);
    writeSessionStorage(SS_FILTER_STATUSES, filterStatuses);
  }, [filterStatuses]);
  useEffect(() => {
    writeLocalStorage(SS_FILTER_PROVIDERS, filterProviderIds);
    writeSessionStorage(SS_FILTER_PROVIDERS, filterProviderIds);
  }, [filterProviderIds]);
  useEffect(() => {
    writeLocalStorage(LS_FILTER_CATEGORIES, filterCategories);
  }, [filterCategories]);
  // ─────────────────────────────────────────────────────────────────────────
  /** 哪一個篩選下拉已展開（點擊外側會關閉） */
  const [openFilterDropdown, setOpenFilterDropdown] = useState<'provider' | 'status' | 'category' | null>(null);
  const filterDropdownRef = useRef<HTMLTableRowElement | null>(null);
  useEffect(() => {
    if (openFilterDropdown === null) return;
    const onPointerDown = (e: PointerEvent) => {
      if (filterDropdownRef.current?.contains(e.target as Node)) return;
      setOpenFilterDropdown(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [openFilterDropdown]);
  const validProviders = useMemo(
    () => new Set<string>(savedKeys.filter((k) => k.is_valid).map((k) => k.provider)),
    [savedKeys],
  );

  /** 可選模型列：有驗證結果的 provider 用驗證資料，其餘 fallback 為 AI_PROVIDERS 靜態模型 */
  const allRows = useMemo(() => {
    const fromValidation = getAvailableModelsList(validateAllResultsByKeyId, currentKeys);
    const validatedProviderIds = new Set(fromValidation.map((r) => r.providerId));
    const providerOrder: string[] = AI_PROVIDERS.map((p) => p.id);

    type Row = { providerId: string; providerName: string; modelId: string; modelName: string };
    const rows: Row[] = [];

    // Validated providers: use their API-returned model list
    for (const { providerId, modelId } of fromValidation) {
      rows.push({
        providerId,
        providerName: AI_PROVIDERS.find((p) => p.id === providerId)?.name ?? providerId,
        modelId,
        modelName: getModelDisplayName(providerId, modelId),
      });
    }

    // Providers without validation data: fall back to static AI_PROVIDERS models
    for (const p of AI_PROVIDERS) {
      if (validatedProviderIds.has(p.id)) continue;
      for (const m of p.models) {
        rows.push({
          providerId: p.id,
          providerName: p.name,
          modelId: m.id,
          modelName: m.name ?? m.id,
        });
      }
    }

    return rows.sort((a, b) => {
      const orderA = providerOrder.indexOf(a.providerId);
      const orderB = providerOrder.indexOf(b.providerId);
      if (orderA !== orderB) return orderA - orderB;
      return (a.modelName || a.modelId).localeCompare(b.modelName || b.modelId);
    });
  }, [validateAllResultsByKeyId, currentKeys]);

  /** 篩選後的列（依公司，可複選） */
  const filteredRows = useMemo(() => {
    if (filterProviderIds.length === 0) return allRows;
    const set = new Set(filterProviderIds);
    return allRows.filter((r) => set.has(r.providerId));
  }, [allRows, filterProviderIds]);

  /** 單列狀態：與「狀態」欄顯示邏輯一致 */
  const getRowStatus = useCallback(
    (key: string, ev: ModelEvaluation | undefined): 'working' | 'not_working' | 'untested' => {
      const sessionResult = testResultByKey[key];
      if (sessionResult === true) return 'working';
      if (sessionResult === false) return 'not_working';
      if (ev?.is_working) return 'working';
      if (ev && !ev.is_working) return 'not_working';
      return 'untested';
    },
    [testResultByKey]
  );

  const evaluationMap = useMemo(() => {
    const map = new Map<string, ModelEvaluation>();
    for (const e of savedEvaluations) {
      map.set(`${e.provider}::${e.model_id}`, e);
    }
    return map;
  }, [savedEvaluations]);

  /** 正規化 localStorage 讀出的 entry（相容 camelCase / snake_case） */
  const normalizeBatchEntry = useCallback((raw: Record<string, unknown>): BatchResultEntry | null => {
    const providerId = (raw.providerId ?? raw.provider_id) as string | undefined;
    const modelId = (raw.modelId ?? raw.model_id) as string | undefined;
    if (!providerId || !modelId) return null;
    const key = (raw.key as string) ?? `${providerId}::${modelId}`;
    return {
      key,
      providerId,
      providerName: (raw.providerName ?? raw.provider_name ?? '') as string,
      modelId,
      modelName: (raw.modelName ?? raw.model_name ?? modelId) as string,
      success: Boolean(raw.success),
      output: typeof raw.output === 'string' ? raw.output : '',
      imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : (raw.image_url as string | undefined),
    };
  }, []);

  const applyRecentBatchReport = useCallback(async () => {
    const report = readRecentBatchReport();
    if (!report) {
      setHasRecentBatchReport(false);
      if (typeof window !== 'undefined') {
        window.alert('目前沒有可套用的最近報告。');
      }
      return;
    }
    if (!Array.isArray(report.entries) || report.entries.length === 0) {
      if (typeof window !== 'undefined') {
        window.alert('最近報告沒有任何模型結果，無法套用。');
      }
      return;
    }

    setApplyingRecentBatchReport(true);
    try {
      const mergedMap = new Map<string, ModelEvaluation>(evaluationMap);
      const nextTestResultByKey: Record<string, boolean> = {};
      const nextOutputByKey: Record<string, string> = {};
      const nextImageByKey: Record<string, string> = {};
      let appliedCount = 0;
      let changedCount = 0;

      for (const raw of report.entries) {
        const entry = normalizeBatchEntry(
          typeof raw === 'object' && raw !== null ? (raw as unknown as Record<string, unknown>) : {}
        );
        if (!entry) continue;
        appliedCount += 1;
        const rowKey = entry.key;
        const existing = mergedMap.get(rowKey);
        const statusOverride = inferStatusOverrideFromBatchEntry(entry);
        const inferredSpecialties = statusOverride === 'vlm_ok' ? ['vision'] : ['general'];
        const next: ModelEvaluation = {
          ...(existing ?? {
            provider: entry.providerId,
            model_id: entry.modelId,
            model_name: entry.modelName,
            is_working: entry.success,
            specialties: inferredSpecialties,
            is_candidate: false,
            notes: '',
            last_tested_at: null,
          }),
          provider: entry.providerId,
          model_id: entry.modelId,
          model_name: existing?.model_name ?? entry.modelName,
          is_working: entry.success,
          specialties:
            existing?.specialties && existing.specialties.length > 0
              ? existing.specialties
              : inferredSpecialties,
          notes: entry.output || existing?.notes || '',
          last_tested_at: report.savedAt ?? new Date().toISOString(),
          display_status_override: statusOverride,
        };
        const isChanged = !existing || existing.is_working !== entry.success || (existing.notes ?? '') !== (entry.output ?? '');
        if (isChanged) changedCount += 1;
        mergedMap.set(rowKey, next);
        nextTestResultByKey[rowKey] = entry.success;
        nextOutputByKey[rowKey] = entry.output;
        if (entry.imageUrl) {
          nextImageByKey[rowKey] = entry.imageUrl;
        }
      }

      const unchangedCount = appliedCount - changedCount;

      const toSave = Array.from(mergedMap.values());
      if (toSave.length === 0) {
        if (typeof window !== 'undefined') {
          window.alert('無法產生要儲存的評估資料，請重試。');
        }
        return;
      }
      await onSave(toSave);
      setTestResultByKey((prev) => ({ ...prev, ...nextTestResultByKey }));
      setOutputByKey((prev) => ({ ...prev, ...nextOutputByKey }));
      if (Object.keys(nextImageByKey).length > 0) {
        setImageOutputByKey((prev) => ({ ...prev, ...nextImageByKey }));
      }
      setHasRecentBatchReport(true);
      if (typeof window !== 'undefined') {
        window.alert(
          `已依最近報告更新：共更新 ${appliedCount} 筆，變更 ${changedCount} 筆，不變 ${unchangedCount} 筆。`
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '套用最近報告時發生錯誤';
      if (typeof window !== 'undefined') {
        window.alert(`套用失敗：${message}`);
      }
      console.error('[ModelEvaluator] applyRecentBatchReport failed', err);
    } finally {
      setApplyingRecentBatchReport(false);
    }
  }, [evaluationMap, onSave, normalizeBatchEntry]);

  /** 再依狀態篩選（可複選：OCR可用/LLM可用/不可用/尚未測試） */
  const rowsAfterStatusFilter = useMemo(() => {
    if (filterStatuses.length === 0) return filteredRows;
    const set = new Set(filterStatuses);
    return filteredRows.filter((r) => {
      const key = `${r.providerId}::${r.modelId}`;
      const ev = evaluationMap.get(key);
      const statusDisplay = getStatusDisplay(key, ev, testResultByKey, outputByKey, isOcrMode);
      return set.has(statusDisplay.type);
    });
  }, [filteredRows, filterStatuses, evaluationMap, testResultByKey, outputByKey, isOcrMode]);

  /** 再依模型分類篩選（可複選：VLM / LLM / unknown） */
  const rowsAfterCategoryFilter = useMemo(() => {
    if (filterCategories.length === 0) return rowsAfterStatusFilter;
    const set = new Set(filterCategories);
    return rowsAfterStatusFilter.filter((r) => {
      const key = `${r.providerId}::${r.modelId}`;
      const ev = evaluationMap.get(key);
      const outputText = (outputByKey[key] ?? ev?.notes ?? '').trim();
      const category = detectCategoryFromOutput(outputText);
      return set.has(category);
    });
  }, [rowsAfterStatusFilter, filterCategories, evaluationMap, outputByKey]);

  /** 表格內出現的公司清單（用於篩選下拉） */
  const providersInTable = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of AI_PROVIDERS) {
      seen.set(p.id, p.name);
    }
    for (const r of allRows) {
      if (!seen.has(r.providerId)) seen.set(r.providerId, r.providerName);
    }
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [allRows]);

  /**
   * 模組欄「全選」：將目前篩選列全部加入/移出該模組。
   * 勾選時：以「目前篩選列」為該模組的完整清單，編號一律從 001 開始。
   * `targetRowKeys` 會在呼叫端先依目前可見列與模組適用性過濾，
   * 若未提供則 fallback 為所有 rowsAfterCategoryFilter。
   */
  const handleModuleSelectAllFiltered = useCallback(
    async (moduleKey: string, checked: boolean, targetRowKeys?: string[]) => {
      if (!onSaveModule) return;
      const cur = moduleStates[moduleKey];
      if (!cur) return;

      const effectiveKeys =
        targetRowKeys && targetRowKeys.length > 0
          ? targetRowKeys
          : rowsAfterCategoryFilter.map((r) => `${r.providerId}::${r.modelId}`);

      if (effectiveKeys.length === 0) return;

      const filterSet = new Set(effectiveKeys);
      let next: AssignedModel[];

      if (checked) {
        // 全選時：直接以篩選列為該模組清單（依表格順序），編號從 001 開始，不與既有清單合併
        const newAssignments: AssignedModel[] = effectiveKeys
          .map((key, index) => {
            const [providerId, modelId] = key.split('::');
            if (!providerId || !modelId) return null;
            return {
              provider: providerId,
              model: modelId,
              priority: index + 1,
            } as AssignedModel;
          })
          .filter((v): v is AssignedModel => v !== null);

        next = normalizeAssignments(newAssignments);
      } else {
        const remaining = cur.assignments.filter(
          (a) => !filterSet.has(`${a.provider}::${a.model}`),
        );
        next = normalizeAssignments(remaining);
      }

      setModuleStates((p) => ({ ...p, [moduleKey]: { ...p[moduleKey], assignments: next } }));
      markModuleSaving(moduleKey, true);
      try {
        await onSaveModule(moduleKey, cur.isEnabled, next);
      } catch (err) {
        setModuleStates((p) => ({ ...p, [moduleKey]: cur }));
        showModuleSaveError(moduleKey, err);
      } finally {
        markModuleSaving(moduleKey, false);
      }
    },
    [moduleStates, onSaveModule, markModuleSaving, rowsAfterCategoryFilter, showModuleSaveError],
  );

  const selectedSet = useMemo(
    () => new Set(savedModels.map((m) => `${m.provider}::${m.model_id}`)),
    [savedModels],
  );

  const handleToggleSelected = async (
    providerId: string,
    modelId: string,
    modelName: string,
    checked: boolean
  ) => {
    if (!onSaveModels) return;
    const current = savedModels.filter((m) => m.provider === providerId);
    let newSelections: { modelId: string; modelName: string; isPrimary: boolean }[];
    if (checked) {
      const existingIds = new Set(current.map((m) => m.model_id));
      if (existingIds.has(modelId)) return;
      newSelections = [
        ...current.map((m, i) => ({
          modelId: m.model_id,
          modelName: m.model_name ?? m.model_id,
          isPrimary: i === 0,
        })),
        { modelId, modelName: modelName || modelId, isPrimary: current.length === 0 },
      ];
    } else {
      newSelections = current
        .filter((m) => m.model_id !== modelId)
        .map((m, i) => ({
          modelId: m.model_id,
          modelName: m.model_name ?? m.model_id,
          isPrimary: i === 0,
        }));
    }
    await onSaveModels(providerId, newSelections);
  };

  /** 全選/取消全選：僅作用於目前篩選後的列 */
  const filteredSelectedCount = useMemo(
    () => rowsAfterCategoryFilter.filter((r) => selectedSet.has(`${r.providerId}::${r.modelId}`)).length,
    [rowsAfterCategoryFilter, selectedSet]
  );
  /** 全部模型（不受篩選）中已選的數量，供右側面板「全部測試」按鈕使用 */
  const allSelectedCount = useMemo(
    () => allRows.filter((r) => selectedSet.has(`${r.providerId}::${r.modelId}`)).length,
    [allRows, selectedSet]
  );
  /** 已選 + 有效金鑰 → 實際可測試的模型數量（基於全部模型，不受篩選影響） */
  const testableCount = useMemo(
    () =>
      allRows.filter(
        (r) => selectedSet.has(`${r.providerId}::${r.modelId}`) && validProviders.has(r.providerId),
      ).length,
    [allRows, selectedSet, validProviders],
  );
  /** 篩選後列表中的已選且具金鑰數量，與工具列「已選被測模型數」對齊；有篩選時全域評測用此數量 */
  const testableCountFiltered = useMemo(
    () =>
      rowsAfterCategoryFilter.filter(
        (r) => selectedSet.has(`${r.providerId}::${r.modelId}`) && validProviders.has(r.providerId),
      ).length,
    [rowsAfterCategoryFilter, selectedSet, validProviders],
  );
  const hasCategoryFilter = rowsAfterCategoryFilter.length !== allRows.length;
  /** 全域評測按鈕顯示的數量：有篩選時用篩選後可測數，無篩選時用全部可測數，與實際執行一致 */
  const batchTestableCount = hasCategoryFilter ? testableCountFiltered : testableCount;
  const allFilteredSelected = rowsAfterCategoryFilter.length > 0 && filteredSelectedCount === rowsAfterCategoryFilter.length;
  const someFilteredSelected = filteredSelectedCount > 0;

  const handleSelectAllFiltered = useCallback(
    async (checked: boolean) => {
      if (!onSaveModels) return;
      const byProvider = new Map<string, { modelId: string; modelName: string }[]>();
      for (const r of rowsAfterCategoryFilter) {
        const list = byProvider.get(r.providerId) ?? [];
        list.push({ modelId: r.modelId, modelName: r.modelName });
        byProvider.set(r.providerId, list);
      }
      for (const [providerId, models] of byProvider) {
        const current = savedModels.filter((m) => m.provider === providerId);
        let newSelections: { modelId: string; modelName: string; isPrimary: boolean }[];
        if (checked) {
          const existingIds = new Set(current.map((m) => m.model_id));
          const toAdd = models.filter((m) => !existingIds.has(m.modelId));
          newSelections = [
            ...current.map((m, i) => ({
              modelId: m.model_id,
              modelName: m.model_name ?? m.model_id,
              isPrimary: i === 0,
            })),
            ...toAdd.map((m, i) => ({
              modelId: m.modelId,
              modelName: m.modelName,
              isPrimary: current.length === 0 && i === 0,
            })),
          ];
        } else {
          const toRemove = new Set(models.map((m) => m.modelId));
          newSelections = current
            .filter((m) => !toRemove.has(m.model_id))
            .map((m, i) => ({
              modelId: m.model_id,
              modelName: m.model_name ?? m.model_id,
              isPrimary: i === 0,
            }));
        }
        await onSaveModels(providerId, newSelections);
      }
    },
    [onSaveModels, rowsAfterCategoryFilter, savedModels]
  );

  /** 解析該列實際使用的 prompt：
   * - 留空或僅輸入 {預設prompt} / {雲端變數名稱} 時，直接使用全域 Prompt
   * - 其餘情況可在文字中夾帶 {預設prompt} 或 {雲端變數名稱}，會在送出前展開為全域 Prompt 內容
   */
  const getEffectivePromptForRow = useCallback(
    (rowKey: string): string => {
      const raw = rowPrompts[rowKey] ?? '';
      const trimmed = raw.trim();
      const basePrompt = globalTestPrompt.trim();

      // 若完全留空或僅輸入保留字，視為「直接使用全域 Prompt」
      if (
        !trimmed ||
        trimmed === DEFAULT_PROMPT_PLACEHOLDER ||
        trimmed === effectivePromptVariableLabel
      ) {
        return basePrompt;
      }

      // 其餘情況允許在內容中夾帶 {預設prompt} 或實際變數名稱，於送出前展開
      let expanded = raw;
      if (basePrompt) {
        const tokens = [DEFAULT_PROMPT_PLACEHOLDER, effectivePromptVariableLabel].filter(
          (t): t is string => !!t && t.length > 0
        );
        for (const token of tokens) {
          expanded = expanded.split(token).join(basePrompt);
        }
      }
      return expanded.trim();
    },
    [rowPrompts, globalTestPrompt, effectivePromptVariableLabel, DEFAULT_PROMPT_PLACEHOLDER]
  );

  const runTest = useCallback(
    async (
      providerId: string,
      modelId: string,
      modelName: string,
      options?: { overridePrompt?: string; overrideFile?: File | null },
    ) => {
      const key = `${providerId}::${modelId}`;
      const basePrompt =
        typeof options?.overridePrompt === 'string'
          ? options.overridePrompt
          : getEffectivePromptForRow(key);
      const effectivePrompt = basePrompt && basePrompt.trim().length > 0 ? basePrompt.trim() : undefined;
      const fileToUse =
        options && Object.prototype.hasOwnProperty.call(options, 'overrideFile')
          ? options.overrideFile
          : uploadedFile;
      setTestingKey(key);
      setOutputByKey((prev) => ({ ...prev, [key]: '' }));
      try {
        const result = await onTestModel(providerId, modelId, effectivePrompt, fileToUse ?? null);
        setTestResultByKey((prev) => ({ ...prev, [key]: result.success }));
        const output = result.output ?? (result.message && !result.success ? `錯誤：${result.message}` : '');
        setOutputByKey((prev) => ({ ...prev, [key]: output }));
        const imgUrl = result.output_image_url ?? (output ? extractImageUrlFromOutput(output) : undefined);
        if (imgUrl) {
          setImageOutputByKey((prev) => ({ ...prev, [key]: imgUrl }));
        }

        // Auto-save result to DB so next page load shows cached result without re-testing
        const existing = evaluationMap.get(key);
        try {
          await onSave([{
            ...(existing?.id ? { id: existing.id } : {}),
            provider: providerId,
            model_id: modelId,
            model_name: existing?.model_name ?? modelName,
            is_working: result.success,
            specialties: existing?.specialties ?? [],
            is_candidate: existing?.is_candidate ?? false,
            notes: output || existing?.notes || '',
            last_tested_at: new Date().toISOString(),
          }]);
        } catch (saveErr) {
          console.warn('[ModelEvaluator] 測試結果自動儲存失敗', saveErr);
        }
      } catch {
        setTestResultByKey((prev) => ({ ...prev, [key]: false }));
        setOutputByKey((prev) => ({ ...prev, [key]: '請求失敗' }));
      } finally {
        setTestingKey(null);
      }
    },
    [onTestModel, getEffectivePromptForRow, onSave, evaluationMap, uploadedFile]
  );

  useClickOutsideClose(alignDropdownRef, alignDropdownOpen, setAlignDropdownOpen);
  useClickOutsideClose(viewDropdownRef, viewDropdownOpen, setViewDropdownOpen);

  // Sync single-test panel prompt when globalTestPrompt changes, unless user has manually edited it.
  useEffect(() => {
    if (!rowTestPanel || rowTestPromptDirty) return;
    const currentEffective = getEffectivePromptForRow(rowTestPanel.key);
    const newPrompt = currentEffective || globalTestPrompt;
    setRowTestPrompt(newPrompt);
  }, [rowTestPanel, globalTestPrompt, rowTestPromptDirty, getEffectivePromptForRow]);

  const statusPortalRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const key = openStatusDropdownKey;
    if (!key) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = statusDropdownRefs.current[key];
      if (el?.contains(e.target as Node)) return;
      if (statusPortalRef.current?.contains(e.target as Node)) return;
      setOpenStatusDropdownKey(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [openStatusDropdownKey]);

  const toggleStatusDropdown = useCallback((key: string) => {
    setOpenStatusDropdownKey((prev) => {
      if (prev === key) {
        setStatusDropdownPos(null);
        return null;
      }
      const btn = statusBtnRefs.current[key];
      if (btn) {
        const rect = btn.getBoundingClientRect();
        setStatusDropdownPos({ top: rect.bottom + 2, left: rect.left });
      }
      return key;
    });
  }, []);

  const handleSaveStatusOverride = useCallback(
    async (rowKey: string, value: DisplayStatusOverride) => {
      const [providerId, modelId] = rowKey.split('::');
      if (!providerId || !modelId) return;
      const ev = evaluationMap.get(rowKey);
      const modelName = ev?.model_name ?? allRows.find((r) => r.providerId === providerId && r.modelId === modelId)?.modelName ?? modelId;
      const updated: ModelEvaluation = {
        ...(ev ?? {
          provider: providerId,
          model_id: modelId,
          model_name: modelName,
          is_working: false,
          specialties: [],
          is_candidate: false,
          notes: '',
          last_tested_at: null,
        }),
        display_status_override: value,
      };
      const merged = Array.from(evaluationMap.entries()).map(([k, e]) =>
        k === rowKey ? updated : e
      );
      if (!evaluationMap.has(rowKey)) merged.push(updated);
      await onSave(merged);
      setOpenStatusDropdownKey(null);
    },
    [evaluationMap, allRows, onSave]
  );

  /** 全部測試：有篩選時只測「目前畫面」篩選後的已選且具金鑰模型，無篩選時測全部已選且具金鑰，與按鈕數量一致 */
  const handleBatchTest = useCallback(async () => {
    if (batchTestingRef.current) return;

    const sourceRows = hasCategoryFilter ? rowsAfterCategoryFilter : allRows;
    const selectedInSource = sourceRows.filter((r) =>
      selectedSet.has(`${r.providerId}::${r.modelId}`)
    );
    if (selectedInSource.length === 0) {
      window.alert(
        hasCategoryFilter
          ? '目前篩選結果中沒有已選的模型，無法測試。請勾選要測試的模型或調整篩選。'
          : '目前選擇的 models 數為 0，無法測試。請先勾選要測試的模型。'
      );
      return;
    }
    const toTest = selectedInSource.filter((r) => validProviders.has(r.providerId));
    if (toTest.length === 0) {
      window.alert('所選模型皆無有效 API 金鑰，無法測試。請先至 API 金鑰設定該供應商金鑰。');
      return;
    }

    batchTestingRef.current = true;
    batchAbortRequestedRef.current = false;
    setBatchTesting(true);

    const total = toTest.length;
    setBatchProgress({ tested: 0, total, succeeded: 0, failed: 0 });

    const toSave: ModelEvaluation[] = [];
    const collectedResults: BatchResultEntry[] = [];

    try {
      // 並行執行所有模型測試（異步同時多個），不再分批輪流
      await Promise.all(
        toTest.map(async ({ providerId, providerName, modelId, modelName }) => {
          const key = `${providerId}::${modelId}`;
          const effectivePrompt = getEffectivePromptForRow(key) || undefined;
          setOutputByKey((prev) => ({ ...prev, [key]: '' }));
          const entry: BatchResultEntry = { key, providerId, providerName, modelId, modelName, success: false, output: '' };
          try {
            const result = await onTestModel(providerId, modelId, effectivePrompt, uploadedFile);
            if (batchAbortRequestedRef.current) return entry;
            setTestResultByKey((prev) => ({ ...prev, [key]: result.success }));
            const output =
              result.output ?? (result.message && !result.success ? `錯誤：${result.message}` : '');
            setOutputByKey((prev) => ({ ...prev, [key]: output }));
            const imgUrl = result.output_image_url ?? (output ? extractImageUrlFromOutput(output) : undefined);
            if (imgUrl) {
              setImageOutputByKey((prev) => ({ ...prev, [key]: imgUrl }));
            }

            entry.success = result.success;
            entry.output = output;
            entry.imageUrl = imgUrl;

            setBatchProgress((prev) =>
              prev
                ? {
                    ...prev,
                    tested: prev.tested + 1,
                    succeeded: prev.succeeded + (result.success ? 1 : 0),
                    failed: prev.failed + (result.success ? 0 : 1),
                  }
                : prev
            );

            const existing = evaluationMap.get(key);
            toSave.push({
              ...(existing?.id ? { id: existing.id } : {}),
              provider: providerId,
              model_id: modelId,
              model_name: existing?.model_name ?? modelName,
              is_working: result.success,
              specialties: existing?.specialties ?? [],
              is_candidate: existing?.is_candidate ?? false,
              notes: output || existing?.notes || '',
              last_tested_at: new Date().toISOString(),
            });
          } catch {
            if (batchAbortRequestedRef.current) return entry;
            entry.output = '請求失敗';
            setBatchProgress((prev) =>
              prev ? { ...prev, tested: prev.tested + 1, failed: prev.failed + 1 } : prev
            );
            setTestResultByKey((prev) => ({ ...prev, [key]: false }));
            setOutputByKey((prev) => ({ ...prev, [key]: '請求失敗' }));
          }
          collectedResults.push(entry);
          return entry;
        })
      );

      if (toSave.length > 0 && !batchAbortRequestedRef.current) {
        try {
          await onSave(toSave);
        } catch (saveErr) {
          console.warn('[ModelEvaluator] 批次測試結果儲存失敗', saveErr);
        }
      }

      // Reset status/category filters so tested models remain visible.
      setFilterStatuses([]);
      setFilterCategories([]);

      const sortedResults = collectedResults.sort((a, b) => {
        if (a.success !== b.success) return a.success ? -1 : 1;
        return `${a.providerName}${a.modelName}`.localeCompare(`${b.providerName}${b.modelName}`);
      });
      setBatchResults(sortedResults);
      if (collectedResults.length > 0) {
        saveRecentBatchReport(sortedResults);
      }
      // 記錄本次測試摘要，供畫面顯示「測試前已選 N 筆 → 成功 X、失敗 Y」；不觸動模型勾選
      const succeeded = collectedResults.filter((r) => r.success).length;
      const failed = collectedResults.filter((r) => !r.success).length;
      setLastBatchTestSummary({
        selectedBeforeTest: total,
        total,
        succeeded,
        failed,
      });
    } finally {
      batchTestingRef.current = false;
      setBatchTesting(false);
      setBatchProgress(null);
    }
  }, [hasCategoryFilter, rowsAfterCategoryFilter, allRows, selectedSet, validProviders, onTestModel, getEffectivePromptForRow, onSave, evaluationMap, uploadedFile, saveRecentBatchReport]);

  // Stable ref to the latest handleBatchTest — avoids including handleBatchTest in the
  // headerActionsRef useEffect deps, which would cause infinite re-renders when parent
  // passes currentKeys={keys.map(...)} (new array reference on each render).
  const handleBatchTestRef = useRef(handleBatchTest);
  handleBatchTestRef.current = handleBatchTest;
  const stableRunBatchTest = useCallback(() => handleBatchTestRef.current(), []);

  const stableAbortBatchTest = useCallback(() => {
    batchAbortRequestedRef.current = true;
  }, []);

  // 將「全部測試」狀態與觸發方法暴露給頁首固定區塊使用
  // 有篩選時與工具列「已選被測」對齊：按鈕與實際測試數量皆為 batchTestableCount（篩選後可測數）。
  useEffect(() => {
    if (!headerActionsRef) return;
    const canBatchTest = batchTestableCount > 0;
    const tooltip = canBatchTest
      ? hasCategoryFilter
        ? `對目前篩選結果中已選且具金鑰的 ${batchTestableCount} 個模型並行測試`
        : `對全部已選且具有效金鑰的 ${batchTestableCount} 個模型並行測試`
      : allSelectedCount === 0
        ? '目前無已選的模型，無法測試。請先勾選要測試的模型。'
        : '所選模型皆無有效 API 金鑰，無法測試。請先至 API 金鑰設定該供應商金鑰。';
    const payload = {
      runBatchTest: stableRunBatchTest,
      abortBatchTest: stableAbortBatchTest,
      batchTesting,
      canBatchTest,
      tooltip,
      batchProgress,
      testableCount,
      /** 與工具列對齊：有篩選時為篩選後可測數，無篩選時為全部可測數；按鈕應顯示此值 */
      batchTestableCount,
      selectedCount: allSelectedCount,
      totalCount: allRows.length,
      filteredTotal: rowsAfterCategoryFilter.length,
      filteredSelectedCount,
      /** 上次全域評測完成摘要：測試前已選 N 筆、成功 X、失敗 Y，供畫面顯示；不影響模型勾選 */
      lastBatchTestSummary,
      hasRecentBatchReport,
      openRecentBatchReport,
      applyRecentBatchReport,
      applyingRecentBatchReport,
    };
    if (typeof headerActionsRef === 'function') {
      headerActionsRef(payload);
    } else if (headerActionsRef && 'current' in headerActionsRef) {
       
      headerActionsRef.current = payload;
    }
  }, [headerActionsRef, stableRunBatchTest, stableAbortBatchTest, openRecentBatchReport, applyRecentBatchReport, hasRecentBatchReport, applyingRecentBatchReport, batchTesting, allSelectedCount, batchProgress, testableCount, batchTestableCount, hasCategoryFilter, lastBatchTestSummary, allRows.length, rowsAfterCategoryFilter.length, filteredSelectedCount]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border-subtle overflow-hidden bg-bg-primary">
        <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-3 py-2 border-b border-border-subtle bg-bg-tertiary">
          <div className="text-xs text-text-secondary">
            全部公司可選模型數：
            <span className="font-medium text-text-primary">{allRows.length}</span>
            {rowsAfterCategoryFilter.length !== allRows.length ? (
              <>
                ，篩選後可選模型數：
                <span className="font-medium text-text-primary">{rowsAfterCategoryFilter.length}</span>
                ，已選被測模型數：
                <span className="font-medium text-text-primary">{filteredSelectedCount}</span>
              </>
            ) : (
              <>
                ，已選被測模型數：
                <span className="font-medium text-text-primary">{allSelectedCount}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative" ref={alignDropdownRef}>
              <button
                type="button"
                onClick={() => setAlignDropdownOpen((v) => !v)}
                aria-expanded={alignDropdownOpen}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border whitespace-nowrap bg-bg-primary border-border-default text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
                title="col位文字排版"
              >
                <AlignLeft className="w-3.5 h-3.5" />
                排版
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${alignDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {alignDropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-1 z-30 min-w-[200px] bg-bg-primary border border-border-default rounded-lg shadow-lg p-3"
                  role="dialog"
                  aria-label="表格文字排版"
                >
                  <p className="text-[10px] text-text-muted mb-2">
                    套用至整個表格（所有 col）
                  </p>
                  <p className="text-xs font-medium text-text-secondary mb-1">水平</p>
                  <div className="flex gap-1 mb-3">
                    {(['left', 'center', 'right'] as TableHAlign[]).map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => patchTablePrefs({ tableAlignH: h })}
                        className={`flex-1 px-2 py-1.5 rounded text-xs border transition-colors ${
                          tableAlignH === h
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300'
                            : 'bg-bg-secondary border-border-default text-text-secondary hover:bg-bg-secondary/80'
                        }`}
                      >
                        {h === 'left' ? '靠左' : h === 'center' ? '左右置中' : '靠右'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs font-medium text-text-secondary mb-1">垂直</p>
                  <div className="flex gap-1">
                    {(['top', 'middle', 'bottom'] as TableVAlign[]).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => patchTablePrefs({ tableAlignV: v })}
                        className={`flex-1 px-2 py-1.5 rounded text-xs border transition-colors ${
                          tableAlignV === v
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300'
                            : 'bg-bg-secondary border-border-default text-text-secondary hover:bg-bg-secondary/80'
                        }`}
                      >
                        {v === 'top' ? '靠上' : v === 'middle' ? '上下置中' : '靠下'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="relative" ref={viewDropdownRef}>
              <button
                type="button"
                onClick={() => setViewDropdownOpen((v) => !v)}
                aria-expanded={viewDropdownOpen}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border whitespace-nowrap bg-bg-primary border-border-default text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
                title="檢視選項"
              >
                <Eye className="w-3.5 h-3.5" />
                View
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${viewDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {viewDropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-1 z-30 min-w-[200px] bg-bg-primary border border-border-default rounded-lg shadow-lg py-2"
                  role="menu"
                >
                  <div className="px-3 py-1.5 text-[10px] font-medium text-text-muted uppercase tracking-wide">
                    凍結窗格
                  </div>
                  <div className="border-t border-border-default mt-1 pt-1">
                    <div className="px-3 py-1 text-[10px] text-text-muted">列</div>
                    {([0, 1] as const).map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          patchTablePrefs({ freezeRowCount: n });
                          setViewDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                          freezeRowCount === n
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-medium'
                            : 'text-text-primary hover:bg-bg-secondary'
                        }`}
                      >
                        {n === 0 ? '不凍結列' : '凍結第 1 row'}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-border-default mt-1 pt-1">
                    <div className="px-3 py-1 text-[10px] text-text-muted">
                      col（亦可拖曳凍結線）
                    </div>
                    <div className="max-h-[240px] overflow-y-auto">
                      {[
                        { n: 0, label: '不凍結col' },
                        ...Array.from({ length: TABLE_COLUMN_COUNT }, (_, i) => ({
                          n: i + 1,
                          label:
                            i === 0 ? '凍結第 1 col' : `凍結第 1 ~ ${i + 1} col`,
                        })),
                      ].map(({ n, label }) => (
                        <button
                          key={n}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            patchTablePrefs({ frozenColCount: n });
                            setViewDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                            frozenColCount === n
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-medium'
                              : 'text-text-primary hover:bg-bg-secondary'
                          }`}
                        >
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
        <div
          className={`${TABLE_H_ALIGN_CLASSES[tableAlignH]} ${TABLE_V_ALIGN_CLASSES[tableAlignV]} [&_th]:whitespace-normal [&_td]:whitespace-normal [&_th]:break-words [&_td]:break-words`}
          style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 340px)', minHeight: '400px' }}
        >
          <table className="w-full text-xs border-collapse" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              {columnWidths.slice(0, effectiveColumnCount).map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <thead
              className={
                freezeRowCount > 0
                  ? 'sticky top-0 z-10 bg-bg-tertiary'
                  : undefined
              }
            >
              <tr className="bg-bg-tertiary">
                <th
                  className={`py-3 px-3 font-semibold text-text-secondary border-r border-border-subtle relative group align-top ${getFrozenThClass(0)}`}
                  style={getFrozenThStyle(0)}
                >
                  <span>公司名稱</span>
                  <div
                    role="separator"
                    aria-label="調整欄寬"
                    onMouseDown={handleResizeStart(0)}
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/30 transition-colors"
                  />
                </th>
                <th
                  className={`py-3 px-3 font-semibold text-text-secondary border-r border-border-subtle relative group align-top ${getFrozenThClass(1)}`}
                  style={getFrozenThStyle(1)}
                >
                  <span>模型分類與狀態</span>
                  <div
                    role="separator"
                    aria-label="調整欄寬"
                    onMouseDown={handleResizeStart(1)}
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/30 transition-colors"
                  />
                </th>
                <th
                  className={`py-3 px-3 font-semibold text-text-secondary border-r border-border-subtle relative group align-top ${getFrozenThClass(2)}`}
                  style={getFrozenThStyle(2)}
                >
                  <span>模型名稱與版本型號</span>
                  <div
                    role="separator"
                    aria-label="調整欄寬"
                    onMouseDown={handleResizeStart(2)}
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/30 transition-colors"
                  />
                </th>
                <th
                  className={`py-3 px-3 font-semibold text-text-secondary border-r border-border-subtle relative group align-top ${getFrozenThClass(3)}`}
                  style={getFrozenThStyle(3)}
                >
                  <span>勾選被測模型</span>
                  <div
                    role="separator"
                    aria-label="調整欄寬"
                    onMouseDown={handleResizeStart(3)}
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/30 transition-colors"
                  />
                </th>
                <th
                  className={`py-3 px-3 font-semibold text-text-secondary border-r border-border-subtle relative group align-top overflow-hidden ${getFrozenThClass(4)}`}
                  style={getFrozenThStyle(4)}
                >
                  <input
                    type="text"
                    value={promptColumnLabel}
                    onChange={(e) => setPromptColumnLabel(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    onKeyUp={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    autoComplete="off"
                    tabIndex={0}
                    style={{ userSelect: 'text' }}
                    className="w-full min-w-[100px] text-xs bg-transparent border-none border-b border-transparent hover:border-border-subtle focus:border-accent focus:outline-none focus:ring-0 py-0.5 px-0 text-left font-semibold text-text-secondary placeholder:text-text-muted"
                    placeholder="欄位名稱"
                    title="可編輯此欄位標題"
                  />
                  <div
                    role="separator"
                    aria-label="調整欄寬"
                    onMouseDown={handleResizeStart(4)}
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/30 transition-colors"
                  />
                </th>
                <th
                  className={`py-3 px-3 font-semibold text-text-secondary border-r border-border-subtle relative group align-top ${getFrozenThClass(5)}`}
                  style={getFrozenThStyle(5)}
                >
                  <span>單一prompt測試</span>
                  <div
                    role="separator"
                    aria-label="調整欄寬"
                    onMouseDown={handleResizeStart(5)}
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/30 transition-colors"
                  />
                </th>
                <th
                  className={`py-3 px-3 font-semibold text-text-secondary border-r border-border-subtle relative group align-top ${getFrozenThClass(6)}`}
                  style={getFrozenThStyle(6)}
                >
                  <span>Prompt output text</span>
                  <div
                    role="separator"
                    aria-label="調整欄寬"
                    onMouseDown={handleResizeStart(6)}
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/30 transition-colors"
                  />
                </th>
                <th
                  className={`py-3 px-3 font-semibold text-text-secondary border-r border-border-subtle relative group align-top ${getFrozenThClass(7)}`}
                  style={getFrozenThStyle(7)}
                >
                  <span>Prompt output jpg</span>
                  <div
                    role="separator"
                    aria-label="調整欄寬"
                    onMouseDown={handleResizeStart(7)}
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/30 transition-colors"
                  />
                </th>
                <th
                  className={`py-3 px-3 font-semibold text-text-secondary text-center relative group border-r border-border-subtle align-top ${getFrozenThClass(8)}`}
                  style={getFrozenThStyle(8)}
                >
                  <span>更新日期與時間</span>
                  <div
                    role="separator"
                    aria-label="調整欄寬"
                    onMouseDown={handleResizeStart(8)}
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/30 transition-colors"
                  />
                </th>
                {visibleFeatureModules.map((mod: FeatureModule, colIdx: number) => {
                  const Icon = MODULE_ICON_MAP[mod.icon] ?? Settings2;
                  const colors = MODULE_CATEGORY_COLORS[mod.category];
                  const thColIdx = 9 + colIdx;
                  return (
                    <th
                      key={mod.key}
                      className={`py-2 px-2 font-semibold text-text-secondary border-r border-border-subtle last:border-r-0 relative group align-top min-w-[88px] ${getFrozenThClass(thColIdx)}`}
                      style={getFrozenThStyle(thColIdx)}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-start gap-1">
                          <div className={`w-4 h-4 shrink-0 rounded flex items-center justify-center ${colors.bg}`}>
                            <Icon size={10} className={colors.text} />
                          </div>
                          <span className="text-[10px] leading-tight">
                            {['online_ocr', 'online_ocr_parse', 'online_ocr_judge'].includes(mod.key) ? `${mod.name} 模型排序` : mod.name}
                          </span>
                        </div>
                      </div>
                      <div
                        role="separator"
                        aria-label="調整欄寬"
                        onMouseDown={handleResizeStart(9 + colIdx)}
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/30 transition-colors"
                      />
                    </th>
                  );
                })}
              </tr>
              <tr className={`bg-bg-tertiary ${freezeRowCount > 0 ? 'shadow-[0_4px_0_0_#d1d5db] dark:shadow-[0_4px_0_0_#4b5563]' : 'border-b border-border-subtle'}`} ref={filterDropdownRef}>
                {/* 公司名稱欄：公司篩選 */}
                <th
                  className={`py-1.5 px-3 border-r border-border-subtle align-top ${getFrozenThClass(0)}`}
                  style={getFrozenThStyle(0)}
                >
                  <div className="flex flex-col gap-1">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenFilterDropdown((v) => (v === 'provider' ? null : 'provider'))}
                        className="w-full rounded border border-border-subtle bg-bg-primary px-2 py-1 text-xs text-left text-text-primary focus:outline-none focus:ring-1 focus:ring-accent min-w-0 flex items-center justify-between gap-1"
                        title="依公司篩選（可複選）"
                      >
                        <span className="truncate">
                          {filterProviderIds.length === 0
                            ? '全部公司'
                            : filterProviderIds.length === 1
                              ? providersInTable.find(([id]) => id === filterProviderIds[0])?.[1] ?? filterProviderIds[0]
                              : `已選 ${filterProviderIds.length} 項`}
                        </span>
                        <span className="shrink-0 text-text-muted">▾</span>
                      </button>
                      {openFilterDropdown === 'provider' && (
                        <div className="absolute left-0 top-full z-10 mt-0.5 min-w-[140px] rounded border border-border-subtle bg-bg-primary py-1 shadow-lg max-h-48 overflow-y-auto">
                          <label className="flex items-center gap-2 px-3 py-1 text-xs cursor-pointer hover:bg-bg-secondary font-medium text-text-secondary">
                            <input
                              type="checkbox"
                              checked={
                                providersInTable.length > 0 &&
                                providersInTable.every(([id]) => filterProviderIds.includes(id))
                              }
                              ref={(el) => {
                                if (!el) return;
                                const total = providersInTable.length;
                                const selectedCount = providersInTable.filter(([id]) =>
                                  filterProviderIds.includes(id),
                                ).length;
                                el.indeterminate = selectedCount > 0 && selectedCount < total;
                              }}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  // 顯式選取目前列表中的所有公司
                                  setFilterProviderIds(providersInTable.map(([id]) => id));
                                } else {
                                  // 取消勾選時回到「不套用公司篩選」= 顯示全部
                                  setFilterProviderIds([]);
                                }
                              }}
                              className="rounded border-border-subtle text-accent focus:ring-accent"
                            />
                            <span className="truncate">全選</span>
                          </label>
                          {providersInTable.map(([id, name]) => (
                            <label
                              key={id}
                              className="flex items-center gap-2 px-3 py-1 text-xs cursor-pointer hover:bg-bg-secondary"
                            >
                              <input
                                type="checkbox"
                                checked={filterProviderIds.includes(id)}
                                onChange={(e) => {
                                  setFilterProviderIds((prev) =>
                                    e.target.checked ? [...prev, id] : prev.filter((x) => x !== id)
                                  );
                                }}
                                className="rounded border-border-subtle text-accent focus:ring-accent"
                              />
                              <span className="truncate">{name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </th>
                {/* 模型分類與狀態欄：分類/狀態篩選 */}
                <th
                  className={`py-1.5 px-3 border-r border-border-subtle align-top ${getFrozenThClass(1)}`}
                  style={getFrozenThStyle(1)}
                >
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenFilterDropdown((v) => (v === 'status' ? null : 'status'))}
                      className="rounded border border-border-subtle bg-bg-primary px-2 py-1 text-xs text-left text-text-primary focus:outline-none focus:ring-1 focus:ring-accent min-w-0 flex items-center justify-between gap-1"
                      title="依分類與狀態篩選（可複選）"
                    >
                      <span className="truncate">
                        {filterStatuses.length === 0
                          ? '分類與狀態'
                          : filterStatuses.length === 1
                            ? filterStatuses[0] === 'vlm_ok'
                              ? 'OCR可用'
                              : filterStatuses[0] === 'llm_ok'
                                ? 'LLM可用'
                                : filterStatuses[0] === 'not_working'
                                  ? '不可用'
                                  : '尚未測試'
                            : `分類與狀態 ${filterStatuses.length}`}
                      </span>
                      <span className="shrink-0 text-text-muted">▾</span>
                    </button>
                    {openFilterDropdown === 'status' && (
                      <div className="absolute left-0 top-full z-10 mt-0.5 min-w-[120px] rounded border border-border-subtle bg-bg-primary py-1 shadow-lg">
                        <label className="flex items-center gap-2 px-3 py-1 text-xs cursor-pointer hover:bg-bg-secondary font-medium text-text-secondary">
                          <input
                            type="checkbox"
                            checked={
                              ['vlm_ok', 'llm_ok', 'not_working', 'untested'].every((v) =>
                                filterStatuses.includes(v),
                              )
                            }
                            ref={(el) => {
                              if (!el) return;
                              const allValues = ['vlm_ok', 'llm_ok', 'not_working', 'untested'] as const;
                              const total = allValues.length;
                              const selectedCount = allValues.filter((v) =>
                                filterStatuses.includes(v),
                              ).length;
                              el.indeterminate = selectedCount > 0 && selectedCount < total;
                            }}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilterStatuses(['vlm_ok', 'llm_ok', 'not_working', 'untested']);
                              } else {
                                // 取消勾選時回到「不套用分類/狀態篩選」= 顯示全部
                                setFilterStatuses([]);
                              }
                            }}
                            className="rounded border-border-subtle text-accent focus:ring-accent"
                          />
                          <span>全選</span>
                        </label>
                        {[
                          { value: 'vlm_ok', label: 'OCR可用' },
                          { value: 'llm_ok', label: 'LLM可用' },
                          { value: 'not_working', label: '不可用' },
                          { value: 'untested', label: '尚未測試' },
                        ].map(({ value, label }) => (
                          <label
                            key={value}
                            className="flex items-center gap-2 px-3 py-1 text-xs cursor-pointer hover:bg-bg-secondary"
                          >
                            <input
                              type="checkbox"
                              checked={filterStatuses.includes(value)}
                              onChange={(e) => {
                                setFilterStatuses((prev) =>
                                  e.target.checked ? [...prev, value] : prev.filter((x) => x !== value)
                                );
                              }}
                              className="rounded border-border-subtle text-accent focus:ring-accent"
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </th>
                {/* 模型名稱與版本型號欄：目前無篩選，保留空白佔位 */}
                <th
                  className={`py-1.5 px-3 border-r border-border-subtle align-top text-left ${getFrozenThClass(2)}`}
                  style={getFrozenThStyle(2)}
                />
                {/* 請選擇被測模型欄：全選/取消全選 */}
                <th
                  className={`py-1.5 px-3 border-r border-border-subtle align-top ${getFrozenThClass(3)}`}
                  style={getFrozenThStyle(3)}
                >
                  <div className="flex flex-col gap-1">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-text-secondary hover:text-text-primary">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someFilteredSelected && !allFilteredSelected;
                        }}
                        onChange={(e) => handleSelectAllFiltered(e.target.checked)}
                        disabled={!onSaveModels || rowsAfterCategoryFilter.length === 0}
                        className="sr-only peer"
                      />
                      <div className="w-5 h-5 rounded border border-border-subtle bg-bg-primary peer-checked:bg-accent peer-checked:border-accent flex items-center justify-center transition-colors">
                        {allFilteredSelected && (
                          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                            <path
                              d="M1 5L4 8L11 1"
                              stroke="white"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <span>全選</span>
                    </label>
                  </div>
                </th>
                <th
                  className={`py-1.5 px-3 border-r border-border-subtle align-top text-left ${getFrozenThClass(4)}`}
                  style={getFrozenThStyle(4)}
                />
                <th
                  className={`py-1.5 px-3 border-r border-border-subtle align-top text-left ${getFrozenThClass(5)}`}
                  style={getFrozenThStyle(5)}
                />
                <th
                  className={`py-1.5 px-3 border-r border-border-subtle align-top text-left ${getFrozenThClass(6)}`}
                  style={getFrozenThStyle(6)}
                />
                <th
                  className={`py-1.5 px-3 border-r border-border-subtle align-top text-left ${getFrozenThClass(7)}`}
                  style={getFrozenThStyle(7)}
                />
                <th
                  className={`py-1.5 px-3 border-r border-border-subtle align-top text-center ${getFrozenThClass(8)}`}
                  style={{ whiteSpace: 'nowrap', ...getFrozenThStyle(8) }}
                />
                {visibleFeatureModules.map((mod: FeatureModule, filterColIdx: number) => {
                  const state = moduleStates[mod.key];
                  const saving = moduleSavingSet.has(mod.key);

                  // Only include rows whose model is checked in the "已選" column.
                  // Unselected models must not be assignable to any feature module.
                  const filteredRowKeysForModule = rowsAfterCategoryFilter
                    .filter((r) => selectedSet.has(`${r.providerId}::${r.modelId}`))
                    .map((r) => `${r.providerId}::${r.modelId}`);

                  const assignedInFiltered = filteredRowKeysForModule.filter((key) =>
                    state.assignments.some(
                      (a) => `${a.provider}::${a.model}` === key,
                    ),
                  ).length;

                  const allFilteredAssigned =
                    filteredRowKeysForModule.length > 0 &&
                    assignedInFiltered === filteredRowKeysForModule.length;
                  const someFilteredAssigned = assignedInFiltered > 0;
                  const filterThColIdx = 9 + filterColIdx;

                  return (
                    <th
                      key={mod.key}
                      className={`py-1.5 px-2 border-r border-border-subtle last:border-r-0 align-top text-left ${getFrozenThClass(filterThColIdx)}`}
                      style={getFrozenThStyle(filterThColIdx)}
                    >
                      {onSaveModule && (
                        <label
                          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium border transition-all bg-bg-tertiary text-text-muted border-border-subtle hover:text-text-secondary cursor-pointer"
                          title={
                            allFilteredAssigned
                              ? '取消全選（移出目前篩選列）'
                              : '全選（將目前篩選列全部加入此模組）'
                          }
                        >
                          <input
                            type="checkbox"
                            checked={allFilteredAssigned}
                            ref={(el) => {
                              if (el) el.indeterminate = someFilteredAssigned && !allFilteredAssigned;
                            }}
                            onChange={(e) =>
                              handleModuleSelectAllFiltered(
                                mod.key,
                                e.target.checked,
                                filteredRowKeysForModule,
                              )
                            }
                            disabled={saving || filteredRowKeysForModule.length === 0}
                            className="rounded border-border-subtle bg-bg-primary text-accent focus:ring-accent"
                          />
                          <span>全選</span>
                        </label>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rowsAfterCategoryFilter.map(({ providerId, providerName, modelId, modelName }) => {
                const key = `${providerId}::${modelId}`;
                const isSelected = selectedSet.has(key);
                const ev = evaluationMap.get(key);
                const hasKey = validProviders.has(providerId);
                const isTesting = testingKey === key;
                const output = outputByKey[key];
                return (
                  <tr
                    key={key}
                    className={`border-b border-border-subtle transition-colors ${
                      isSelected ? 'bg-accent/5' : 'bg-bg-primary hover:bg-bg-secondary'
                    }`}
                  >
                    <td
                      className={`py-2.5 px-3 text-text-primary border-r border-border-subtle align-top break-words ${getFrozenTdClass(0)}`}
                      style={getFrozenTdStyle(0)}
                    >
                      {providerName}
                    </td>
                    <td
                      className={`py-2.5 px-3 border-r border-border-subtle align-top ${getFrozenTdClass(1)}`}
                      style={getFrozenTdStyle(1)}
                    >
                      {(() => {
                        if (!hasKey)
                          return <span className="text-text-muted">—</span>;
                        const status = getStatusDisplay(key, ev, testResultByKey, outputByKey, isOcrMode);
                        const statusLabel =
                          status.type === 'vlm_ok' || status.type === 'working'
                            ? 'OCR可用'
                            : status.type === 'llm_ok'
                              ? 'LLM可用'
                              : status.type === 'not_working'
                                ? '不可用'
                                : '尚未測試';
                        const statusTitle =
                          status.type === 'vlm_ok' || status.type === 'working'
                            ? 'OCR可用'
                            : status.type === 'llm_ok'
                              ? 'LLM可用'
                              : status.type === 'not_working'
                                ? '不可用'
                                : '尚未測試';
                        const statusColorClass =
                          status.type === 'vlm_ok' || status.type === 'working'
                            ? 'text-green-400'
                            : status.type === 'llm_ok'
                              ? 'text-blue-400'
                              : status.type === 'not_working'
                                ? 'text-amber-500'
                                : 'text-text-muted';
                        const StatusIcon = status.type === 'not_working' ? XCircle : CheckCircle2;
                        const isOpen = openStatusDropdownKey === key;
                        return (
                          <div
                            className="inline-block min-w-0"
                            ref={(el) => {
                              statusDropdownRefs.current[key] = el;
                            }}
                          >
                            <button
                              type="button"
                              ref={(el) => {
                                statusBtnRefs.current[key] = el;
                              }}
                              onClick={() => toggleStatusDropdown(key)}
                              className={`inline-flex items-center gap-1 rounded border border-transparent px-1 -mx-1 py-0.5 hover:border-border-subtle hover:bg-bg-secondary ${statusColorClass}`}
                              title={`${statusTitle} · 點擊可手動修正`}
                            >
                              {status.type !== 'untested' && status.type !== 'not_working' ? (
                                <StatusIcon size={12} aria-hidden />
                              ) : status.type === 'not_working' ? (
                                <XCircle size={12} aria-hidden />
                              ) : null}
                              <span className="truncate max-w-[140px]">
                                {statusLabel}
                              </span>
                              <ChevronDown
                                size={12}
                                className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                aria-hidden
                              />
                            </button>
                          </div>
                        );
                      })()}
                    </td>
                    <td
                      className={`py-2.5 px-3 border-r border-border-subtle overflow-hidden align-top ${getFrozenTdClass(2)}`}
                      style={getFrozenTdStyle(2)}
                    >
                      <div className="flex flex-col items-start min-w-0">
                        <span className="font-medium text-text-primary break-words">{modelName}</span>
                        <span className="mt-0.5 font-mono text-text-muted break-words">{modelId}</span>
                      </div>
                    </td>
                    <td
                      className={`py-2.5 px-3 align-top border-r border-border-subtle ${getFrozenTdClass(3)}`}
                      style={getFrozenTdStyle(3)}
                    >
                      <label className="flex items-center justify-center w-5 h-5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) =>
                            onSaveModels
                              ? handleToggleSelected(
                                  providerId,
                                  modelId,
                                  modelName,
                                  e.target.checked
                                )
                              : undefined
                          }
                          disabled={!onSaveModels}
                          className="sr-only peer"
                        />
                        <div className="w-5 h-5 rounded border border-border-subtle bg-bg-primary peer-checked:bg-accent peer-checked:border-accent flex items-center justify-center transition-colors">
                          {isSelected && (
                            <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                              <path
                                d="M1 5L4 8L11 1"
                                stroke="white"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                      </label>
                    </td>
                    <td
                      className={`py-1.5 px-3 align-top max-w=[200px] border-r border-border-subtle ${getFrozenTdClass(4)}`}
                      style={getFrozenTdStyle(4)}
                    >
                      <textarea
                        value={rowPrompts[key] ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const trimmed = raw.trim();
                          // 若使用者輸入的內容剛好等於顯示變數名稱，視為「使用全域 Prompt」，不另外儲存
                          if (
                            trimmed === '' ||
                            trimmed === DEFAULT_PROMPT_PLACEHOLDER ||
                            trimmed === effectivePromptVariableLabel
                          ) {
                            setRowPrompts((prev) => {
                              const next = { ...prev };
                              delete next[key];
                              return next;
                            });
                          } else {
                            setRowPrompts((prev) => ({ ...prev, [key]: raw }));
                          }
                        }}
                        placeholder={`留空或 ${effectivePromptVariableLabel} 使用全域 Prompt；可輸入自訂`}
                        rows={2}
                        className="w-full rounded border border-border-subtle bg-transparent px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent resize-y min-h-[44px]"
                        title="留空或 {預設prompt} 使用上方全域 Prompt；填入其他內容則此列使用專屬 Prompt"
                      />
                    </td>
                    <td
                      className={`py-2.5 px-3 border-r border-border-subtle align-top ${getFrozenTdClass(5)}`}
                      style={getFrozenTdStyle(5)}
                    >
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (!isSelected || !hasKey || isTesting) return;
                          const rowKey = `${providerId}::${modelId}`;
                          const initialPrompt = getEffectivePromptForRow(rowKey) || globalTestPrompt;
                          setRowTestPrompt(initialPrompt);
                          setRowTestPromptDirty(false);
                          setRowTestFile(uploadedFile);
                          setRowTestPanel({ key: rowKey, providerId, modelId, modelName });
                        }}
                        disabled={!isSelected || !hasKey || isTesting}
                        title={
                          !isSelected
                            ? '請先勾選此模型才能測試'
                            : !hasKey
                              ? '需先設定 API 金鑰'
                              : '開啟單一測試設定（可調整 Prompt 與檔案）'
                        }
                      >
                        {isTesting ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <FlaskConical size={14} />
                        )}
                      </Button>
                    </td>
                    <td
                      className={`py-2.5 px-3 align-top border-r border-border-subtle overflow-x-auto overflow-y-hidden min-w-0 ${getFrozenTdClass(6)}`}
                      style={getFrozenTdStyle(6)}
                    >
                      {isTesting ? (
                        <span className="inline-flex items-center gap-1 text-text-muted">
                          <Loader2 size={12} className="animate-spin" /> 測試中…
                        </span>
                      ) : (
                        <span
                          className="text-text-secondary whitespace-nowrap inline-block"
                          title={output || ev?.notes || '—'}
                        >
                          {output || ev?.notes || '—'}
                        </span>
                      )}
                    </td>
                    <td
                      className={`py-2.5 px-3 align-top border-r border-border-subtle min-w-0 ${getFrozenTdClass(7)}`}
                      style={getFrozenTdStyle(7)}
                    >
                      {isTesting ? (
                        <span className="inline-flex items-center gap-1 text-text-muted">
                          <Loader2 size={12} className="animate-spin" />
                        </span>
                      ) : imageOutputByKey[key] ? (
                        <a
                          href={imageOutputByKey[key]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={imageOutputByKey[key]}
                            alt="VLM output"
                            className="max-h-16 max-w-[120px] rounded border border-border-subtle object-contain hover:opacity-80 transition-opacity"
                          />
                        </a>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-text-muted border-r border-border-subtle align-top text-center ${getFrozenTdClass(8)}`}
                      style={{ whiteSpace: 'nowrap', ...getFrozenTdStyle(8) }}
                    >
                      {ev?.last_tested_at
                        ? new Date(ev.last_tested_at).toLocaleDateString('zh-TW', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    {visibleFeatureModules.map((mod: FeatureModule, tdColIdx: number) => {
                      const modState = moduleStates[mod.key];
                      // 渲染前再做一次正規化，避免舊資料殘留 173/178 等歷史 priority
                      const normalizedAssignments = normalizeAssignments(modState?.assignments ?? []);
                      const assign = normalizedAssignments.find(
                        (a) => a.provider === providerId && a.model === modelId
                      );
                      const saving = moduleSavingSet.has(mod.key);
                      const tdFrozenColIdx = 9 + tdColIdx;
                      return (
                        <td
                          key={mod.key}
                          className={`py-2 px-2 align-top text-left border-r border-border-subtle last:border-r-0 ${getFrozenTdClass(tdFrozenColIdx)}`}
                          style={getFrozenTdStyle(tdFrozenColIdx)}
                        >
                          {!isSelected ? (
                            // Model not in "已選" — module assignment is locked
                            assign ? (
                              <div
                                className="inline-flex items-center gap-1 rounded-full pl-2 pr-1 py-0.5 min-w-[5.5rem] text-[10px] opacity-30 bg-bg-tertiary text-text-muted border border-border-subtle cursor-not-allowed"
                                title="請先在「已選」欄勾選此模型，才能設定模組排序"
                              >
                                <span className="shrink-0 font-medium">
                                  {MODULE_SORT_LABEL[mod.key] ?? mod.key.slice(0, 3).toUpperCase()}-
                                </span>
                                <span className="w-7 text-center font-mono tabular-nums">
                                  {String(Math.min(Math.max(normalizedAssignments.length, 1), Math.max(1, assign.priority ?? 1))).padStart(3, '0')}
                                </span>
                              </div>
                            ) : null
                          ) : assign ? (() => {
                            const maxP = Math.max(normalizedAssignments.length, 1);
                            const displayPriority = Math.min(maxP, Math.max(1, assign.priority ?? 1));
                            return (
                            <div className="inline-flex items-center gap-1 rounded-full pl-2 pr-1 py-0.5 min-w-[5.5rem] text-[10px] bg-accent/10 text-accent border border-accent/20">
                              <span className="shrink-0 font-medium">
                                {MODULE_SORT_LABEL[mod.key] ?? mod.key.slice(0, 3).toUpperCase()}-
                              </span>
                              <input
                                type="text"
                                inputMode="numeric"
                                minLength={1}
                                maxLength={3}
                                value={String(displayPriority).padStart(3, '0')}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/\D/g, '');
                                  if (raw === '') return;
                                  const n = parseInt(raw, 10);
                                  if (!Number.isNaN(n) && n >= 1 && n <= maxP) {
                                    setModuleStates((p) => ({
                                      ...p,
                                      [mod.key]: {
                                        ...p[mod.key],
                                        assignments: normalizedAssignments.map((a) =>
                                          a.provider === providerId && a.model === modelId
                                            ? { ...a, priority: n }
                                            : a
                                        ),
                                      },
                                    }));
                                  }
                                }}
                                onBlur={(e) => {
                                  const n = parseInt(e.target.value.replace(/\D/g, '') || '1', 10);
                                  const clamped = Math.min(maxP, Math.max(1, Number.isNaN(n) ? 1 : n));
                                  if (clamped !== (assign.priority ?? 1)) {
                                    setModuleStates((p) => ({
                                      ...p,
                                      [mod.key]: {
                                        ...p[mod.key],
                                        assignments: normalizedAssignments.map((a) =>
                                          a.provider === providerId && a.model === modelId
                                            ? { ...a, priority: clamped }
                                            : a
                                        ),
                                      },
                                    }));
                                    handleModulePriorityChange(mod.key, providerId, modelId, clamped);
                                  }
                                }}
                                disabled={saving}
                                className="w-7 bg-transparent border-none text-center text-[10px] font-mono focus:outline-none p-0 tabular-nums"
                                title={`1=主模型，2~${maxP}=備選`}
                              />
                              <button
                                type="button"
                                onClick={() => handleModuleAssignModel(mod.key, providerId, modelId)}
                                disabled={saving}
                                className="opacity-60 hover:text-red-400 hover:opacity-100 transition-colors"
                                title="解除綁定"
                              >
                                <X size={9} />
                              </button>
                            </div>
                            );
                          })() : (
                            onSaveModule && (
                              <button
                                type="button"
                                onClick={() => handleModuleAssignModel(mod.key, providerId, modelId)}
                                disabled={saving}
                                title={`綁定 ${modelName} 到「${mod.name}」`}
                                className="inline-flex items-center justify-center w-5 h-5 rounded border border-border-subtle bg-bg-tertiary text-text-muted hover:text-accent hover:border-accent/40 transition-colors disabled:opacity-50"
                              >
                                <Plus size={10} />
                              </button>
                            )
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {rowTestPanel && (
        <Sheet
          open={!!rowTestPanel}
          onOpenChange={(open) => {
            if (!open) setRowTestPanel(null);
          }}
        >
          <SheetContent className="sm:max-w-xl">
            <SheetHeader>
              <div>
                <SheetTitle className="flex items-center gap-2">
                  <FlaskConical className="w-5 h-5" />
                  單一模型測試設定
                </SheetTitle>
                <SheetDescription>
                  {rowTestPanel.modelName}（{rowTestPanel.providerId} · {rowTestPanel.modelId}）
                </SheetDescription>
              </div>
            </SheetHeader>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-text-secondary">
                  測試 Prompt
                </label>
                <textarea
                  value={rowTestPrompt}
                  onChange={(e) => {
                    setRowTestPromptDirty(true);
                    setRowTestPrompt(e.target.value);
                  }}
                  placeholder="預設為此列有效 Prompt；可在此針對本次單一測試調整內容"
                  rows={8}
                  className="w-full rounded border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent resize-y min-h-[160px]"
                />
                <p className="text-[11px] text-text-muted">
                  若留空，實際執行時會自動 fallback 至此列設定的 Prompt 或全域評測 Prompt。
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-text-secondary">
                  測試檔案（選填）
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-sm text-text-secondary hover:text-text-primary rounded border border-border-subtle bg-bg-primary px-3 py-2 shrink-0">
                    <Upload size={16} className="shrink-0" />
                    <span>選擇檔案</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.txt,.md"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setRowTestFile(f);
                        if (e.target) (e.target as HTMLInputElement).value = '';
                      }}
                      title="上傳 PDF、圖片或文字檔作為本次單一測試附件"
                    />
                  </label>
                  {rowTestFile && (
                    <span
                      className="text-sm text-text-muted truncate max-w-[240px]"
                      title={rowTestFile.name}
                    >
                      {rowTestFile.name}
                    </span>
                  )}
                </div>
                {!rowTestFile && uploadedFile && (
                  <p className="text-[11px] text-text-muted">
                    若未另外選擇檔案，將會沿用目前全域測試面板中的檔案：{uploadedFile.name}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={() => setRowTestPanel(null)}
                >
                  取消
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  onClick={async () => {
                    if (!rowTestPanel) return;
                    const overridePrompt = rowTestPrompt.trim().length > 0 ? rowTestPrompt : undefined;
                    const fileToUse = rowTestFile ?? uploadedFile ?? null;
                    await runTest(
                      rowTestPanel.providerId,
                      rowTestPanel.modelId,
                      rowTestPanel.modelName,
                      { overridePrompt, overrideFile: fileToUse },
                    );
                  }}
                  isLoading={testingKey === rowTestPanel.key}
                  disabled={testingKey === rowTestPanel.key}
                >
                  {testingKey === rowTestPanel.key ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <FlaskConical size={14} />
                  )}
                  <span className="ml-1.5 whitespace-nowrap">執行單一測試</span>
                </Button>
              </div>

              {/* Test result output — shown after execution completes */}
              {rowTestPanel && (outputByKey[rowTestPanel.key] !== undefined || testResultByKey[rowTestPanel.key] !== undefined) && (
                <div className="space-y-2 border-t border-border-subtle pt-4">
                  <p className="text-xs font-medium text-text-secondary">測試結果</p>
                  <div
                    className={`rounded border px-3 py-2 text-xs whitespace-pre-wrap break-words max-h-[280px] overflow-y-auto ${
                      testResultByKey[rowTestPanel.key] === true
                        ? 'border-green-500/30 bg-green-500/5 text-green-300'
                        : testResultByKey[rowTestPanel.key] === false
                          ? 'border-red-500/30 bg-red-500/5 text-red-400'
                          : 'border-border-subtle bg-bg-secondary text-text-secondary'
                    }`}
                  >
                    {outputByKey[rowTestPanel.key] || '（無輸出）'}
                  </div>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Batch test results modal */}
      {batchResults && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setBatchResults(null); }}
        >
          <div className="relative flex flex-col bg-bg-primary border border-border-default rounded-lg shadow-2xl w-[min(900px,95vw)] max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border-subtle shrink-0">
              <div>
                <h2 className="text-base font-semibold text-text-primary">批次測試結果</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  共 {batchResults.length} 個模型 ·&nbsp;
                  <span className="text-green-400">{batchResults.filter(r => r.success).length} 成功</span>
                  &nbsp;·&nbsp;
                  <span className="text-amber-500">{batchResults.filter(r => !r.success).length} 失敗</span>
                  &nbsp;·&nbsp;點擊「模型分類與狀態」欄可手動覆寫系統判斷
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBatchResults(null)}
                className="shrink-0 p-1.5 rounded hover:bg-bg-secondary text-text-muted hover:text-text-primary transition-colors"
                aria-label="關閉"
              >
                <X size={18} />
              </button>
            </div>
            {/* Table */}
            <div className="overflow-auto flex-1 min-h-0">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-bg-secondary z-10">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-medium text-text-muted border-b border-border-subtle whitespace-nowrap">供應商</th>
                    <th className="text-left px-3 py-2.5 font-medium text-text-muted border-b border-border-subtle whitespace-nowrap">模型</th>
                    <th className="text-left px-3 py-2.5 font-medium text-text-muted border-b border-border-subtle w-[280px]">Output text</th>
                    <th className="text-left px-3 py-2.5 font-medium text-text-muted border-b border-border-subtle whitespace-nowrap">Output 圖片</th>
                    <th className="text-left px-3 py-2.5 font-medium text-text-muted border-b border-border-subtle whitespace-nowrap">模型分類與狀態</th>
                  </tr>
                </thead>
                <tbody>
                  {batchResults.map((entry) => {
                    const ev = evaluationMap.get(entry.key);
                    const status = getStatusDisplay(entry.key, ev, testResultByKey, outputByKey, isOcrMode);
                    const statusColorClass =
                      status.type === 'vlm_ok' || status.type === 'working'
                        ? 'text-green-400'
                        : status.type === 'llm_ok'
                          ? 'text-blue-400'
                          : status.type === 'not_working'
                            ? 'text-amber-500'
                            : 'text-text-muted';
                    const StatusIcon = status.type === 'not_working' ? XCircle : CheckCircle2;
                    return (
                      <tr
                        key={entry.key}
                        className={`border-b border-border-subtle ${entry.success ? 'hover:bg-green-500/5' : 'hover:bg-amber-500/5'}`}
                      >
                        <td className="px-3 py-2 align-top text-text-secondary whitespace-nowrap">{entry.providerName}</td>
                        <td className="px-3 py-2 align-top">
                          <div className="font-medium text-text-primary">{entry.modelName}</div>
                          <div className="text-text-muted font-mono mt-0.5">{entry.modelId}</div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          {entry.output ? (
                            <div
                              className={`max-h-[80px] overflow-y-auto whitespace-pre-wrap break-words rounded px-2 py-1 border ${
                                entry.success
                                  ? 'border-green-500/20 bg-green-500/5 text-green-300'
                                  : 'border-red-500/20 bg-red-500/5 text-red-400'
                              }`}
                            >
                              {entry.output}
                            </div>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 align-top">
                          {entry.imageUrl ? (
                            <a href={entry.imageUrl} target="_blank" rel="noopener noreferrer" className="block">
                              <img
                                src={entry.imageUrl}
                                alt="output"
                                className="max-h-16 max-w-[100px] rounded border border-border-subtle object-contain hover:opacity-80 transition-opacity"
                              />
                            </a>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div
                            className="inline-block"
                            ref={(el) => { statusDropdownRefs.current[`modal::${entry.key}`] = el; }}
                          >
                            <button
                              type="button"
                              ref={(el) => { statusBtnRefs.current[`modal::${entry.key}`] = el; }}
                              onClick={() => toggleStatusDropdown(`modal::${entry.key}`)}
                              className={`inline-flex items-center gap-1 rounded border border-transparent px-1 py-0.5 hover:border-border-subtle hover:bg-bg-secondary ${statusColorClass}`}
                              title={`${status.title} · 點擊可手動修正`}
                            >
                              {status.type !== 'untested' ? (
                                <StatusIcon size={12} aria-hidden />
                              ) : null}
                              <span>{status.label}</span>
                              <ChevronDown size={12} className={`shrink-0 transition-transform ${openStatusDropdownKey === `modal::${entry.key}` ? 'rotate-180' : ''}`} aria-hidden />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-border-subtle shrink-0">
              <Button variant="secondary" size="sm" onClick={() => setBatchResults(null)}>
                關閉
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Portal: status override dropdown rendered outside the table to bypass overflow/stacking context */}
      {openStatusDropdownKey && statusDropdownPos && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={statusPortalRef}
            role="listbox"
            aria-label="手動設定模型狀態"
            className="min-w-[160px] rounded border border-border-default bg-bg-primary py-1 shadow-lg"
            style={{
              position: 'fixed',
              top: statusDropdownPos.top,
              left: statusDropdownPos.left,
              zIndex: 9999,
            }}
          >
            {getStatusOverrideOptions(isOcrMode).map((opt) => {
              const actualKey = openStatusDropdownKey.startsWith('modal::')
                ? openStatusDropdownKey.slice('modal::'.length)
                : openStatusDropdownKey;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => handleSaveStatusOverride(actualKey, opt.value)}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-bg-secondary focus:bg-bg-secondary focus:outline-none"
                >
                  {opt.label}
                </button>
              );
            })}
          </div>,
          document.body
        )
      }
    </div>
  );
}
