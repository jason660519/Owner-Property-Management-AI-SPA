'use client';

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle2, XCircle, Loader2, FlaskConical, Upload, Cloud, MessageCircle, FileText, PenTool, Layout, Settings2, Plus, X, AlignLeft, Eye, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AI_PROVIDERS, FEATURE_MODULES } from '@/lib/ai-providers';
import type { FeatureModule } from '@/lib/ai-providers';
import type { SavedKey, SavedModel, ModelEvaluation, KeyValidationResult, SavedModule, AssignedModel, DisplayStatusOverride } from '@/lib/hooks/useAISettings';
import { getAvailableModelsList } from '@/lib/utils/total-available-models';
import { readSessionStorage, writeSessionStorage } from '@/lib/utils/storage-state';

const SS_FILTER_STATUSES  = 'ai-eval-filter:statuses';
const SS_FILTER_PROVIDERS = 'ai-eval-filter:providerIds';

const MODULE_ICON_MAP: Record<string, React.ElementType> = {
  cloud: Cloud, 'hard-drive': Settings2, 'message-circle': MessageCircle,
  'file-text': FileText, 'pen-tool': PenTool, layout: Layout,
};
const MODULE_CATEGORY_COLORS: Record<string, { text: string; bg: string }> = {
  ocr:       { text: 'text-blue-400',   bg: 'bg-blue-500/10'   },
  assistant: { text: 'text-green-400',  bg: 'bg-green-500/10'  },
  generator: { text: 'text-purple-400', bg: 'bg-purple-500/10' },
};

export interface KeyWithId {
  id: string;
  provider: string;
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
  ) => Promise<{ success: boolean; message?: string; output?: string }>;
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
  /** 由頁首控制的全域測試 Prompt 與檔案（提升 state 以便顯示在固定標題區） */
  globalTestPrompt: string;
  onChangeGlobalTestPrompt: (value: string) => void;
  uploadedFile: File | null;
  onChangeUploadedFile: (file: File | null) => void;
  /** 頁首摘要：已選/可選模型數，顯示在表格工具列左側 */
  summarySelectedCount: number;
  summaryTotalCount: number;
  /** 由頁首固定區塊觸發的動作（例如「全部測試」按鈕） */
  headerActionsRef?: React.Ref<{
    runBatchTest: () => void;
    batchTesting: boolean;
    canBatchTest: boolean;
    tooltip: string;
  }>;
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
  ad_generator: 'AD',
  software_dev_engineer: 'SDE',
  ttd_engineer: 'TTD',
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

/** 從 Prompt output 自動推斷模型分類：成功解析檔案內容視為 VLM，有回應但未解析（如「看不到檔案」）視為 LLM */
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

/** 依測試輸出區分狀態顯示：僅成功解析檔案內容算 VLM 可用，「我看不到檔案」等僅算 LLM 可用 */
type StatusDisplay = { type: 'vlm_ok' | 'llm_ok' | 'working' | 'not_working' | 'untested'; label: string; title: string };

/** 五種狀態選項，供使用者手動修正 AI 判斷 */
const STATUS_OVERRIDE_OPTIONS: { value: DisplayStatusOverride; label: string }[] = [
  { value: 'vlm_ok', label: 'VLM 可用' },
  { value: 'llm_ok', label: 'LLM 可用' },
  { value: 'working', label: '通用模型可用' },
  { value: 'not_working', label: '不可用' },
  { value: 'untested', label: '尚未測試' },
];

function getStatusDisplayByType(type: DisplayStatusOverride): StatusDisplay {
  const map: Record<DisplayStatusOverride, StatusDisplay> = {
    vlm_ok: { type: 'vlm_ok', label: 'VLM 可用', title: '手動設定：VLM 可用' },
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
  outputByKey: Record<string, string>
): StatusDisplay {
  if (ev?.display_status_override) return getStatusDisplayByType(ev.display_status_override);

  const outputText = (outputByKey[key] ?? ev?.notes ?? '').trim();
  const sessionSuccess = testResultByKey[key];
  const persistedWorking = ev?.is_working;
  const success = sessionSuccess === true || (sessionSuccess !== false && persistedWorking);

  if (!outputText) {
    if (success) return { type: 'working', label: '可用', title: 'API 連線成功（無輸出內容可推斷 VLM/LLM）' };
    if (sessionSuccess === false || (ev && !ev.is_working))
      return { type: 'not_working', label: '不可用', title: '測試失敗或未通過' };
    return { type: 'untested', label: '未測試', title: '尚未執行檔案解析測試' };
  }

  const category = detectCategoryFromOutput(outputText);
  if (category === 'VLM' && success)
    return { type: 'vlm_ok', label: 'VLM 可用', title: '依本測試輸出：已成功解析檔案內容，視為 VLM 可用' };
  if (category === 'LLM' && success)
    return { type: 'llm_ok', label: 'LLM 可用', title: '依本測試輸出：有文字回應但未解析檔案（如「看不到檔案」），僅算 LLM 可用，不算 VLM 可用' };
  if (category === 'unknown' && success)
    return { type: 'working', label: '可用', title: 'API 有回應，但無法從輸出推斷是否具 VLM 能力' };
  return { type: 'not_working', label: '不可用', title: '測試失敗或無有效輸出' };
}

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
}: ModelEvaluatorProps) {
  /** 表格內每列使用「全域 Prompt」時的變量，僅顯示此短字串不重複儲存/渲染長內容，省記憶體 */
  const DEFAULT_PROMPT_PLACEHOLDER = '{預設prompt}';
  /** 表頭「Prompt input」欄位名稱，使用者可自訂；從 localStorage 還原避免重繪後遺失 */
  const STORAGE_KEY_PROMPT_COLUMN_LABEL = 'superadmin-model-evaluator-prompt-column-label';
  const STORAGE_KEY_COLUMN_WIDTHS = 'superadmin-model-evaluator-column-widths';
  const FREEZE_ROW_STORAGE_KEY = 'superadmin-model-evaluator-freeze-row-v1';
  const FROZEN_COL_STORAGE_KEY = 'superadmin-model-evaluator-frozen-col-v1';
  // Cols 0-7: fixed table cols (已選,公司,模型,模型分類與狀態,Prompt,prompt測試,output,測試日期); cols 8-14: one per FEATURE_MODULE (7)
  const DEFAULT_COLUMN_WIDTHS = [48, 120, 220, 80, 140, 72, 200, 110, 88, 88, 88, 88, 88, 88, 88];
  const TABLE_COLUMN_COUNT = DEFAULT_COLUMN_WIDTHS.length;
  const [columnWidths, setColumnWidthsState] = useState<number[]>(() => {
    if (typeof window === 'undefined') return [...DEFAULT_COLUMN_WIDTHS];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY_COLUMN_WIDTHS);
      if (raw) {
        const parsed = JSON.parse(raw) as number[];
        if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'number')) {
          // Migrate from old 16-col layout (drop former 模型分類 col at index 3)
          const normalized =
            parsed.length === 16 ? [...parsed.slice(0, 3), ...parsed.slice(4)] : parsed;
          if (normalized.length < DEFAULT_COLUMN_WIDTHS.length) {
            return [...normalized, ...DEFAULT_COLUMN_WIDTHS.slice(normalized.length)];
          }
          return normalized.length > DEFAULT_COLUMN_WIDTHS.length ? normalized.slice(0, DEFAULT_COLUMN_WIDTHS.length) : normalized;
        }
      }
    } catch {
      // ignore
    }
    return [...DEFAULT_COLUMN_WIDTHS];
  });
  const startXRef = useRef(0);
  const resizingColRef = useRef<number | null>(null);
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
      setColumnWidthsState((prev) => {
        const next = [...prev];
        const idx = resizingColRef.current!;
        next[idx] = Math.max(32, (next[idx] ?? DEFAULT_COLUMN_WIDTHS[idx]) + delta);
        return next;
      });
    };
    const onUp = () => {
      resizingColRef.current = null;
      setColumnWidthsState((current) => {
        try {
          window.localStorage.setItem(STORAGE_KEY_COLUMN_WIDTHS, JSON.stringify(current));
        } catch {
          // ignore
        }
        return current;
      });
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);
  const [promptColumnLabel, setPromptColumnLabelState] = useState(() => {
    if (typeof window === 'undefined') return 'Prompt input';
    return window.localStorage.getItem(STORAGE_KEY_PROMPT_COLUMN_LABEL) ?? 'Prompt input';
  });
  const setPromptColumnLabel = useCallback((value: string | ((prev: string) => string)) => {
    setPromptColumnLabelState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      try {
        window.localStorage.setItem(STORAGE_KEY_PROMPT_COLUMN_LABEL, next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);
  /** Per-row custom prompts; empty string means "use global testPrompt" */
  const [rowPrompts, setRowPrompts] = useState<Record<string, string>>({});
  const [outputByKey, setOutputByKey] = useState<Record<string, string>>({});
  /** 本頁測試結果（優先於 DB 的 savedEvaluations 顯示在「狀態」欄） */
  const [testResultByKey, setTestResultByKey] = useState<Record<string, boolean>>({});
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [batchTesting, setBatchTesting] = useState(false);
  const [tableAlignH, setTableAlignH] = useState<TableHAlign>('left');
  const [tableAlignV, setTableAlignV] = useState<TableVAlign>('top');
  const [alignDropdownOpen, setAlignDropdownOpen] = useState(false);
  const alignDropdownRef = useRef<HTMLDivElement | null>(null);
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const viewDropdownRef = useRef<HTMLDivElement | null>(null);
  const [freezeRowCount, setFreezeRowCount] = useState<0 | 1>(() => {
    if (typeof window === 'undefined') return 1;
    try {
      const v = window.localStorage.getItem(FREEZE_ROW_STORAGE_KEY);
      if (v === '0' || v === '1') return Number(v) as 0 | 1;
    } catch {
      // ignore
    }
    return 1;
  });
  const [frozenColCount, setFrozenColCount] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const v = window.localStorage.getItem(FROZEN_COL_STORAGE_KEY);
      if (v !== null) {
        const n = parseInt(v, 10);
        if (Number.isInteger(n) && n >= 0 && n <= TABLE_COLUMN_COUNT) return n;
      }
    } catch {
      // ignore
    }
    return 0;
  });
  /** 哪一列的「模型分類與狀態」下拉已展開（row key = providerId::modelId） */
  const [openStatusDropdownKey, setOpenStatusDropdownKey] = useState<string | null>(null);
  const statusDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const frozenColLeftOffsets = useMemo(() => {
    const offsets: number[] = [];
    let acc = 0;
    for (let i = 0; i < columnWidths.length; i++) {
      offsets.push(acc);
      acc += columnWidths[i] ?? DEFAULT_COLUMN_WIDTHS[i] ?? 80;
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
  const visibleFeatureModules = useMemo(
    () => FEATURE_MODULES.filter((mod) => !hiddenModuleKeySet.has(mod.key)),
    [hiddenModuleKeySet]
  );

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

  const handleToggleModuleEnabled = useCallback(async (moduleKey: string) => {
    if (!onSaveModule) return;
    const cur = moduleStates[moduleKey];
    const next = !cur.isEnabled;
    setModuleStates((p) => ({ ...p, [moduleKey]: { ...p[moduleKey], isEnabled: next } }));
    markModuleSaving(moduleKey, true);
    try { await onSaveModule(moduleKey, next, cur.assignments); }
    finally { markModuleSaving(moduleKey, false); }
  }, [moduleStates, onSaveModule, markModuleSaving]);

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
    try { await onSaveModule(moduleKey, cur.isEnabled, next); }
    finally { markModuleSaving(moduleKey, false); }
  }, [moduleStates, onSaveModule, markModuleSaving]);

  const handleModulePriorityChange = useCallback(async (
    moduleKey: string, providerId: string, modelId: string, newPriority: number
  ) => {
    if (!onSaveModule) return;
    const cur = moduleStates[moduleKey];
    const next = reorderAssignment(cur.assignments, providerId, modelId, newPriority);

    setModuleStates((p) => ({ ...p, [moduleKey]: { ...p[moduleKey], assignments: next } }));
    markModuleSaving(moduleKey, true);
    try { await onSaveModule(moduleKey, cur.isEnabled, next); }
    finally { markModuleSaving(moduleKey, false); }
  }, [moduleStates, onSaveModule, markModuleSaving]);

  // ─────────────────────────────────────────────────────────────────────────

  /** 依公司篩選：空陣列 = 全部，否則為勾選的 providerId 列表；預設全部公司以利「全選」可用 */
  const [filterProviderIds, setFilterProviderIds] = useState<string[]>(
    () => readSessionStorage<string[]>(SS_FILTER_PROVIDERS, [])
  );
  /** 依狀態篩選：空陣列 = 全部，否則為勾選的 working / not_working / untested；預設全部以利「全選」可用 */
  const [filterStatuses, setFilterStatuses] = useState<string[]>(
    () => readSessionStorage<string[]>(SS_FILTER_STATUSES, [])
  );
  /** 依模型分類篩選：空陣列 = 全部，否則為勾選的 VLM / LLM / unknown；預設全部以利「全選」可用 */
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  // ── Persist filter state to sessionStorage on change ─────────────────────
  useEffect(() => {
    writeSessionStorage(SS_FILTER_STATUSES, filterStatuses);
  }, [filterStatuses]);
  useEffect(() => {
    writeSessionStorage(SS_FILTER_PROVIDERS, filterProviderIds);
  }, [filterProviderIds]);
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

  /** 可選模型列：與頁首「可選」同一來源（驗證結果）；無驗證時 fallback 為 AI_PROVIDERS */
  const allRows = useMemo(() => {
    const fromValidation = getAvailableModelsList(validateAllResultsByKeyId, currentKeys);
    if (fromValidation.length > 0) {
      const providerOrder: string[] = AI_PROVIDERS.map((p) => p.id);
      return fromValidation
        .map(({ providerId, modelId }) => ({
          providerId,
          providerName: AI_PROVIDERS.find((p) => p.id === providerId)?.name ?? providerId,
          modelId,
          modelName: getModelDisplayName(providerId, modelId),
        }))
        .sort((a, b) => {
          const orderA = providerOrder.indexOf(a.providerId);
          const orderB = providerOrder.indexOf(b.providerId);
          if (orderA !== orderB) return orderA - orderB;
          return (a.modelName || a.modelId).localeCompare(b.modelName || b.modelId);
        });
    }
    const fallback: { providerId: string; providerName: string; modelId: string; modelName: string }[] = [];
    for (const p of AI_PROVIDERS) {
      for (const m of p.models) {
        fallback.push({
          providerId: p.id,
          providerName: p.name,
          modelId: m.id,
          modelName: m.name ?? m.id,
        });
      }
    }
    return fallback.sort((a, b) => {
      const orderA = AI_PROVIDERS.findIndex((x) => x.id === a.providerId);
      const orderB = AI_PROVIDERS.findIndex((x) => x.id === b.providerId);
      if (orderA !== orderB) return orderA - orderB;
      return a.modelName.localeCompare(b.modelName);
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

  /** 再依狀態篩選（可複選：VLM可用/LLM可用/不可用/尚未測試） */
  const rowsAfterStatusFilter = useMemo(() => {
    if (filterStatuses.length === 0) return filteredRows;
    const set = new Set(filterStatuses);
    return filteredRows.filter((r) => {
      const key = `${r.providerId}::${r.modelId}`;
      const ev = evaluationMap.get(key);
      const statusDisplay = getStatusDisplay(key, ev, testResultByKey, outputByKey);
      return set.has(statusDisplay.type);
    });
  }, [filteredRows, filterStatuses, evaluationMap, testResultByKey, outputByKey]);

  /** 再依模型分類篩選（可複選：VLM / LLM / 未知） */
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
    for (const r of allRows) {
      if (!seen.has(r.providerId)) seen.set(r.providerId, r.providerName);
    }
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [allRows]);

  /**
   * 模組欄「全選」：將目前篩選列全部加入/移出該模組。
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
        const existingSet = new Set(cur.assignments.map((a) => `${a.provider}::${a.model}`));
        const toAddKeys = effectiveKeys.filter((key) => !existingSet.has(key));
        const toAdd: AssignedModel[] = toAddKeys
          .map((key) => {
            const [providerId, modelId] = key.split('::');
            if (!providerId || !modelId) return null;
            return {
              provider: providerId,
              model: modelId,
              // 具體數值會在 normalizeAssignments 中重新編號
              priority: cur.assignments.length + 1,
            } as AssignedModel;
          })
          .filter((v): v is AssignedModel => v !== null);

        if (toAdd.length === 0) return;

        next = normalizeAssignments([...cur.assignments, ...toAdd]);
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
      } finally {
        markModuleSaving(moduleKey, false);
      }
    },
    [moduleStates, onSaveModule, markModuleSaving, rowsAfterCategoryFilter],
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

  /** 解析該列實際使用的 prompt：留空或 {預設prompt} 時使用全域，否則使用該列自訂內容 */
  const getEffectivePromptForRow = useCallback(
    (rowKey: string): string => {
      const row = (rowPrompts[rowKey] ?? '').trim();
      if (!row || row === DEFAULT_PROMPT_PLACEHOLDER) return globalTestPrompt.trim();
      return row;
    },
    [rowPrompts, globalTestPrompt]
  );

  const runTest = useCallback(
    async (providerId: string, modelId: string, modelName: string) => {
      const key = `${providerId}::${modelId}`;
      const effectivePrompt = getEffectivePromptForRow(key) || undefined;
      setTestingKey(key);
      setOutputByKey((prev) => ({ ...prev, [key]: '' }));
      try {
        const result = await onTestModel(providerId, modelId, effectivePrompt, uploadedFile);
        setTestResultByKey((prev) => ({ ...prev, [key]: result.success }));
        const output = result.output ?? (result.message && !result.success ? `錯誤：${result.message}` : '');
        setOutputByKey((prev) => ({ ...prev, [key]: output }));

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

  useEffect(() => {
    const key = openStatusDropdownKey;
    if (!key) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = statusDropdownRefs.current[key];
      if (el?.contains(e.target as Node)) return;
      setOpenStatusDropdownKey(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [openStatusDropdownKey]);

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

  /** 全部測試：僅對「已選」且「有金鑰」的模型並行測試，完成後一次批量寫入 DB */
  const handleBatchTest = useCallback(async () => {
    const selectedInFiltered = rowsAfterCategoryFilter.filter((r) =>
      selectedSet.has(`${r.providerId}::${r.modelId}`)
    );
    if (selectedInFiltered.length === 0) {
      window.alert('目前選擇的 models 數為 0，無法測試。請先勾選要測試的模型。');
      return;
    }
    const toTest = selectedInFiltered.filter((r) => validProviders.has(r.providerId));
    if (toTest.length === 0) {
      window.alert('所選模型皆無有效 API 金鑰，無法測試。請先至 API 金鑰設定該供應商金鑰。');
      return;
    }
    setBatchTesting(true);
    const toSave: ModelEvaluation[] = [];
    await Promise.all(
      toTest.map(async ({ providerId, modelId, modelName }) => {
        const key = `${providerId}::${modelId}`;
        const effectivePrompt = getEffectivePromptForRow(key) || undefined;
        setOutputByKey((prev) => ({ ...prev, [key]: '' }));
        try {
          const result = await onTestModel(providerId, modelId, effectivePrompt, uploadedFile);
          setTestResultByKey((prev) => ({ ...prev, [key]: result.success }));
          const output =
            result.output ?? (result.message && !result.success ? `錯誤：${result.message}` : '');
          setOutputByKey((prev) => ({ ...prev, [key]: output }));

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
          setTestResultByKey((prev) => ({ ...prev, [key]: false }));
          setOutputByKey((prev) => ({ ...prev, [key]: '請求失敗' }));
        }
      }),
    );
    // Batch save all results at once
    if (toSave.length > 0) {
      try {
        await onSave(toSave);
      } catch (saveErr) {
        console.warn('[ModelEvaluator] 批次測試結果儲存失敗', saveErr);
      }
    }
    setBatchTesting(false);
  }, [rowsAfterCategoryFilter, selectedSet, validProviders, onTestModel, getEffectivePromptForRow, onSave, evaluationMap, uploadedFile]);

  // 將「全部測試」狀態與觸發方法暴露給頁首固定區塊使用
  useEffect(() => {
    if (!headerActionsRef) return;
    const canBatchTest = filteredSelectedCount > 0;
    const tooltip = canBatchTest
      ? '對目前已選且具金鑰的模型並行測試'
      : '目前選擇的 models 數為 0，無法測試。請先勾選要測試的模型。';
    if (typeof headerActionsRef === 'function') {
      headerActionsRef({
        runBatchTest: handleBatchTest,
        batchTesting,
        canBatchTest,
        tooltip,
      });
    } else if (headerActionsRef && 'current' in headerActionsRef) {
      // eslint-disable-next-line no-param-reassign
      headerActionsRef.current = {
        runBatchTest: handleBatchTest,
        batchTesting,
        canBatchTest,
        tooltip,
      };
    }
  }, [headerActionsRef, handleBatchTest, batchTesting, filteredSelectedCount]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border-subtle overflow-hidden bg-bg-primary">
        <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-3 py-2 border-b border-border-subtle bg-bg-tertiary">
          <div className="text-xs text-text-secondary">
            已選/可選 models 數量{' '}
            <span className="font-medium text-text-primary">
              {filteredSelectedCount}/{rowsAfterCategoryFilter.length}
            </span>
            {rowsAfterCategoryFilter.length !== allRows.length && (
              <span className="ml-1.5 text-text-muted" title="目前為篩選後數量；未篩選時與總數一致">
                （篩選中）
              </span>
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
                        onClick={() => setTableAlignH(h)}
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
                        onClick={() => setTableAlignV(v)}
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
                          setFreezeRowCount(n);
                          try {
                            window.localStorage.setItem(FREEZE_ROW_STORAGE_KEY, String(n));
                          } catch {
                            // ignore
                          }
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
                            setFrozenColCount(n);
                            try {
                              window.localStorage.setItem(
                                FROZEN_COL_STORAGE_KEY,
                                String(n)
                              );
                            } catch {
                              // ignore
                            }
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
              {columnWidths.map((w, i) => (
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
                  <span>已選模型</span>
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
                  <span>公司名稱</span>
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
                  <span>模型分類與狀態</span>
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
                  <span>prompt測試</span>
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
                  <span>Prompt output</span>
                  <div
                    role="separator"
                    aria-label="調整欄寬"
                    onMouseDown={handleResizeStart(6)}
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/30 transition-colors"
                  />
                </th>
                <th
                  className={`py-3 px-3 font-semibold text-text-secondary relative group border-r border-border-subtle align-top ${getFrozenThClass(7)}`}
                  style={getFrozenThStyle(7)}
                >
                  <span>測試日期</span>
                  <div
                    role="separator"
                    aria-label="調整欄寬"
                    onMouseDown={handleResizeStart(7)}
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/30 transition-colors"
                  />
                </th>
                {visibleFeatureModules.map((mod: FeatureModule, colIdx: number) => {
                  const Icon = MODULE_ICON_MAP[mod.icon] ?? Settings2;
                  const colors = MODULE_CATEGORY_COLORS[mod.category];
                  const thColIdx = 8 + colIdx;
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
                            {mod.key === 'online_ocr' ? `${mod.name} 模型排序` : mod.name}
                          </span>
                        </div>
                      </div>
                      <div
                        role="separator"
                        aria-label="調整欄寬"
                        onMouseDown={handleResizeStart(8 + colIdx)}
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/30 transition-colors"
                      />
                    </th>
                  );
                })}
              </tr>
              <tr className={`bg-bg-tertiary ${freezeRowCount > 0 ? 'shadow-[0_4px_0_0_#d1d5db] dark:shadow-[0_4px_0_0_#4b5563]' : 'border-b border-border-subtle'}`} ref={filterDropdownRef}>
                <th
                  className={`py-1.5 px-3 border-r border-border-subtle align-top ${getFrozenThClass(0)}`}
                  style={getFrozenThStyle(0)}
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
                  className={`py-1.5 px-3 border-r border-border-subtle align-top ${getFrozenThClass(1)}`}
                  style={getFrozenThStyle(1)}
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
                <th
                  className={`py-1.5 px-3 border-r border-border-subtle align-top text-left ${getFrozenThClass(2)}`}
                  style={getFrozenThStyle(2)}
                />
                <th
                  className={`py-1.5 px-3 border-r border-border-subtle align-top ${getFrozenThClass(3)}`}
                  style={getFrozenThStyle(3)}
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
                              ? 'VLM可用'
                              : filterStatuses[0] === 'llm_ok'
                                ? 'LLM可用'
                                : filterStatuses[0] === 'working'
                                  ? '通用模型可用'
                                  : filterStatuses[0] === 'not_working'
                                    ? '不可用'
                                    : '尚未測試'
                            : `分類與狀態 ${filterStatuses.length}`}
                      </span>
                      <span className="shrink-0 text-text-muted">▾</span>
                    </button>
                    {openFilterDropdown === 'status' && (
                      <div className="absolute left-0 top-full z-10 mt-0.5 min-w-[120px] rounded border border-border-subtle bg-bg-primary py-1 shadow-lg">
                          {[
                            { value: 'vlm_ok', label: 'VLM可用' },
                            { value: 'llm_ok', label: 'LLM可用' },
                            { value: 'working', label: '通用模型可用' },
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
                  style={{ whiteSpace: 'nowrap', ...getFrozenThStyle(7) }}
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
                  const filterThColIdx = 8 + filterColIdx;

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
                      className={`py-2.5 px-3 align-top border-r border-border-subtle ${getFrozenTdClass(0)}`}
                      style={getFrozenTdStyle(0)}
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
                      className={`py-2.5 px-3 text-text-primary border-r border-border-subtle align-top break-words ${getFrozenTdClass(1)}`}
                      style={getFrozenTdStyle(1)}
                    >
                      {providerName}
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
                      className={`py-2.5 px-3 border-r border-border-subtle align-top ${getFrozenTdClass(3)}`}
                      style={getFrozenTdStyle(3)}
                    >
                      {(() => {
                        const outputText = (outputByKey[key] ?? ev?.notes ?? '').trim();
                        const category = detectCategoryFromOutput(outputText);
                        const categoryLabel = category === 'unknown' ? '未知' : category;
                        if (!hasKey)
                          return <span className="text-text-muted">—</span>;
                        const status = getStatusDisplay(key, ev, testResultByKey, outputByKey);
                        const shouldShowCategoryPrefix =
                          categoryLabel.length > 0 && !status.label.startsWith(categoryLabel);
                        const displayText = shouldShowCategoryPrefix
                          ? `${categoryLabel} · ${status.label}`
                          : status.label;
                        const title = `${categoryLabel} · ${status.title}`;
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
                            className="relative inline-block min-w-0"
                            ref={(el) => {
                              statusDropdownRefs.current[key] = el;
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => setOpenStatusDropdownKey((k) => (k === key ? null : key))}
                              className={`inline-flex items-center gap-1 rounded border border-transparent px-1 -mx-1 py-0.5 hover:border-border-subtle hover:bg-bg-secondary ${statusColorClass}`}
                              title={`${title} · 點擊可手動修正`}
                            >
                              {status.type !== 'untested' && status.type !== 'not_working' ? (
                                <StatusIcon size={12} aria-hidden />
                              ) : status.type === 'not_working' ? (
                                <XCircle size={12} aria-hidden />
                              ) : null}
                              <span className="truncate max-w-[140px]">
                                {displayText}
                              </span>
                              <ChevronDown
                                size={12}
                                className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                aria-hidden
                              />
                            </button>
                            {isOpen && (
                              <div
                                className="absolute left-0 top-full z-20 mt-0.5 min-w-[160px] rounded border border-border-default bg-bg-primary py-1 shadow-lg"
                                role="listbox"
                                aria-label="手動設定模型狀態"
                              >
                                {STATUS_OVERRIDE_OPTIONS.map((opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    role="option"
                                    aria-selected={status.type === opt.value}
                                    onClick={() => handleSaveStatusOverride(key, opt.value)}
                                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-bg-secondary focus:bg-bg-secondary focus:outline-none"
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td
                      className={`py-1.5 px-3 align-top max-w-[200px] border-r border-border-subtle ${getFrozenTdClass(4)}`}
                      style={getFrozenTdStyle(4)}
                    >
                      <textarea
                        value={(rowPrompts[key]?.trim() ?? '') ? (rowPrompts[key] ?? '') : DEFAULT_PROMPT_PLACEHOLDER}
                        onChange={(e) =>
                          setRowPrompts((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        placeholder={`留空或 ${DEFAULT_PROMPT_PLACEHOLDER} 使用全域 Prompt；可輸入自訂`}
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
                        onClick={() => runTest(providerId, modelId, modelName)}
                        disabled={!hasKey || isTesting}
                        title={hasKey ? '用上方 Prompt 測試此模型' : '需先設定 API 金鑰'}
                      >
                        {isTesting ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <FlaskConical size={14} />
                        )}
                      </Button>
                    </td>
                    <td
                      className={`py-2.5 px-3 align-top border-r border-border-subtle overflow-hidden min-w-0 ${getFrozenTdClass(6)}`}
                      style={getFrozenTdStyle(6)}
                    >
                      {isTesting ? (
                        <span className="inline-flex items-center gap-1 text-text-muted">
                          <Loader2 size={12} className="animate-spin" /> 測試中…
                        </span>
                      ) : (
                        <span
                          className="text-text-secondary break-words block"
                          title={output || ev?.notes || '—'}
                        >
                          {output || ev?.notes || '—'}
                        </span>
                      )}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-text-muted border-r border-border-subtle align-top text-left ${getFrozenTdClass(7)}`}
                      style={{ whiteSpace: 'nowrap', ...getFrozenTdStyle(7) }}
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
                      const tdFrozenColIdx = 8 + tdColIdx;
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
    </div>
  );
}
