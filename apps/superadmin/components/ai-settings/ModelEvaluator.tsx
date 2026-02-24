'use client';

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle2, XCircle, Loader2, FlaskConical, Upload, Cloud, MessageCircle, FileText, PenTool, Layout, Settings2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AI_PROVIDERS, FEATURE_MODULES } from '@/lib/ai-providers';
import type { FeatureModule } from '@/lib/ai-providers';
import type { SavedKey, SavedModel, ModelEvaluation, KeyValidationResult, SavedModule, AssignedModel } from '@/lib/hooks/useAISettings';
import { getAvailableModelsList } from '@/lib/utils/total-available-models';

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
}

function getModelDisplayName(providerId: string, modelId: string): string {
  const p = AI_PROVIDERS.find((x) => x.id === providerId);
  const m = p?.models.find((x) => x.id === modelId);
  return m?.name ?? modelId;
}

/** 從 Prompt output 自動推斷模型分類：成功解析檔案內容視為 VLM，有回應但未解析視為 LLM */
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
}: ModelEvaluatorProps) {
  /** 與表格內每列 Prompt 欄位同步的預設文字（未編輯時顯示同一內容） */
  const DEFAULT_TEST_PROMPT = '請根據我上傳的檔案，解析出所有權人是誰，如果你看不到檔案，就回答：我看不到檔案';
  const [testPrompt, setTestPrompt] = useState(DEFAULT_TEST_PROMPT);
  /** 表頭「Prompt input」欄位名稱，使用者可自訂；從 localStorage 還原避免重繪後遺失 */
  const STORAGE_KEY_PROMPT_COLUMN_LABEL = 'superadmin-model-evaluator-prompt-column-label';
  const STORAGE_KEY_COLUMN_WIDTHS = 'superadmin-model-evaluator-column-widths';
  // Cols 0-8: fixed table cols; cols 9-15: one per FEATURE_MODULE (7 total)
  const DEFAULT_COLUMN_WIDTHS = [48, 120, 220, 100, 80, 140, 72, 200, 110, 88, 88, 88, 88, 88, 88, 88];
  const [columnWidths, setColumnWidthsState] = useState<number[]>(() => {
    if (typeof window === 'undefined') return [...DEFAULT_COLUMN_WIDTHS];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY_COLUMN_WIDTHS);
      if (raw) {
        const parsed = JSON.parse(raw) as number[];
        if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'number')) {
          // Extend with defaults if new module columns were added
          if (parsed.length < DEFAULT_COLUMN_WIDTHS.length) {
            return [...parsed, ...DEFAULT_COLUMN_WIDTHS.slice(parsed.length)];
          }
          return parsed;
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
  /** Single uploaded file for prompt test (shared across all rows) */
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [outputByKey, setOutputByKey] = useState<Record<string, string>>({});
  /** 本頁測試結果（優先於 DB 的 savedEvaluations 顯示在「狀態」欄） */
  const [testResultByKey, setTestResultByKey] = useState<Record<string, boolean>>({});
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [batchTesting, setBatchTesting] = useState(false);

  // ── Feature module state (integrated from #modules) ──────────────────────
  interface ModuleRowState { isEnabled: boolean; assignments: AssignedModel[] }
  const [moduleStates, setModuleStates] = useState<Record<string, ModuleRowState>>(() => {
    const init: Record<string, ModuleRowState> = {};
    for (const mod of FEATURE_MODULES) {
      const saved = savedModules.find((s) => s.module_key === mod.key);
      init[mod.key] = {
        isEnabled: saved?.is_enabled ?? false,
        assignments: Array.isArray(saved?.assigned_models) ? [...saved.assigned_models] : [],
      };
    }
    return init;
  });
  const [moduleSavingSet, setModuleSavingSet] = useState<Set<string>>(new Set());

  const markModuleSaving = useCallback((key: string, on: boolean) => {
    setModuleSavingSet((prev) => { const s = new Set(prev); on ? s.add(key) : s.delete(key); return s; });
  }, []);

  const getModuleNextPriority = useCallback((assignments: AssignedModel[]) => {
    if (assignments.length === 0) return 1;
    return Math.min(Math.max(...assignments.map((a) => a.priority ?? 0)) + 1, 100);
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
    const exists = cur.assignments.some((a) => a.provider === providerId && a.model === modelId);
    const next = exists
      ? cur.assignments.filter((a) => !(a.provider === providerId && a.model === modelId))
      : [...cur.assignments, { provider: providerId, model: modelId, priority: getModuleNextPriority(cur.assignments) }];
    setModuleStates((p) => ({ ...p, [moduleKey]: { ...p[moduleKey], assignments: next } }));
    markModuleSaving(moduleKey, true);
    try { await onSaveModule(moduleKey, cur.isEnabled, next); }
    finally { markModuleSaving(moduleKey, false); }
  }, [moduleStates, onSaveModule, markModuleSaving, getModuleNextPriority]);

  const handleModulePriorityChange = useCallback(async (
    moduleKey: string, providerId: string, modelId: string, newPriority: number
  ) => {
    if (!onSaveModule) return;
    const cur = moduleStates[moduleKey];
    const num = Math.max(1, Math.min(100, Math.round(newPriority)));
    const next = cur.assignments.map((a) =>
      a.provider === providerId && a.model === modelId ? { ...a, priority: num } : a
    );
    setModuleStates((p) => ({ ...p, [moduleKey]: { ...p[moduleKey], assignments: next } }));
    markModuleSaving(moduleKey, true);
    try { await onSaveModule(moduleKey, cur.isEnabled, next); }
    finally { markModuleSaving(moduleKey, false); }
  }, [moduleStates, onSaveModule, markModuleSaving]);

  // ─────────────────────────────────────────────────────────────────────────

  /** 依公司篩選：空陣列 = 全部，否則為勾選的 providerId 列表；預設 Anthropic + Google */
  const [filterProviderIds, setFilterProviderIds] = useState<string[]>(['anthropic', 'gemini']);
  /** 依狀態篩選：空陣列 = 全部，否則為勾選的 working / not_working / untested；預設可用 */
  const [filterStatuses, setFilterStatuses] = useState<string[]>(['working']);
  /** 依模型分類篩選：空陣列 = 全部，否則為勾選的 VLM / LLM / unknown；預設 VLM */
  const [filterCategories, setFilterCategories] = useState<string[]>(['VLM']);
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

  /** 再依狀態篩選（可複選：可用/不可用/尚未測試） */
  const rowsAfterStatusFilter = useMemo(() => {
    if (filterStatuses.length === 0) return filteredRows;
    const set = new Set(filterStatuses);
    return filteredRows.filter((r) => {
      const key = `${r.providerId}::${r.modelId}`;
      const ev = evaluationMap.get(key);
      return set.has(getRowStatus(key, ev));
    });
  }, [filteredRows, filterStatuses, evaluationMap, getRowStatus]);

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

  /** 模組欄「全選」：將目前篩選列全部加入/移出該模組 */
  const handleModuleSelectAllFiltered = useCallback(async (moduleKey: string, checked: boolean) => {
    if (!onSaveModule) return;
    const cur = moduleStates[moduleKey];
    const filterSet = new Set(rowsAfterCategoryFilter.map((r) => `${r.providerId}::${r.modelId}`));
    let next: AssignedModel[];
    if (checked) {
      const existingSet = new Set(cur.assignments.map((a) => `${a.provider}::${a.model}`));
      const toAdd = rowsAfterCategoryFilter.filter((r) => !existingSet.has(`${r.providerId}::${r.modelId}`));
      next = [...cur.assignments];
      for (const r of toAdd) {
        next.push({
          provider: r.providerId,
          model: r.modelId,
          priority: getModuleNextPriority(next),
        });
      }
    } else {
      next = cur.assignments.filter((a) => !filterSet.has(`${a.provider}::${a.model}`));
    }
    setModuleStates((p) => ({ ...p, [moduleKey]: { ...p[moduleKey], assignments: next } }));
    markModuleSaving(moduleKey, true);
    try {
      await onSaveModule(moduleKey, cur.isEnabled, next);
    } finally {
      markModuleSaving(moduleKey, false);
    }
  }, [moduleStates, onSaveModule, markModuleSaving, getModuleNextPriority, rowsAfterCategoryFilter]);

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

  const runTest = useCallback(
    async (providerId: string, modelId: string, modelName: string) => {
      const key = `${providerId}::${modelId}`;
      const effectivePrompt = (rowPrompts[key] ?? '').trim() || testPrompt.trim() || undefined;
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
    [onTestModel, testPrompt, rowPrompts, onSave, evaluationMap, uploadedFile]
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
        const effectivePrompt = (rowPrompts[key] ?? '').trim() || testPrompt.trim() || undefined;
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
  }, [rowsAfterCategoryFilter, selectedSet, validProviders, onTestModel, testPrompt, rowPrompts, onSave, evaluationMap, uploadedFile]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border-subtle bg-bg-tertiary p-3">
        <div className="mb-3">
          <label className="block text-xs font-semibold text-text-secondary mb-1.5">檔案上傳</label>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-sm text-text-secondary hover:text-text-primary rounded border border-border-subtle bg-bg-primary px-3 py-2">
              <Upload size={16} className="shrink-0" />
              <span>選擇檔案</span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.txt,.md"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setUploadedFile(f ?? null);
                  e.target.value = '';
                }}
                title="上傳 PDF、圖片或文字檔"
              />
            </label>
            {uploadedFile && (
              <span className="text-sm text-text-muted" title={uploadedFile.name}>
                {uploadedFile.name}
              </span>
            )}
          </div>
        </div>
        <label className="block text-xs font-semibold text-text-secondary mb-1.5">
          測試用 Prompt（可自訂內容，輸入後點該列「測試」可取得該模型回覆）
        </label>
        <textarea
          value={testPrompt}
          onChange={(e) => setTestPrompt(e.target.value)}
          placeholder={`例如：${DEFAULT_TEST_PROMPT}`}
          rows={2}
          className="w-full rounded border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent resize-y min-h-[60px]"
          title="輸入任意 prompt，每列測試時會使用此內容"
        />
      </div>
      <div className="rounded-lg border border-border-subtle overflow-hidden bg-bg-primary">
        <div className="flex flex-wrap items-center gap-3 px-3 py-2 border-b border-border-subtle bg-bg-tertiary">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-text-secondary hover:text-text-primary">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someFilteredSelected && !allFilteredSelected;
                }}
                onChange={(e) => handleSelectAllFiltered(e.target.checked)}
                disabled={!onSaveModels || rowsAfterCategoryFilter.length === 0}
                className="rounded border-border-subtle bg-bg-primary text-accent focus:ring-accent"
              />
              <span>全選</span>
            </label>
            <span className="text-text-muted text-xs">
              （目前可選模型 {rowsAfterCategoryFilter.length} 筆，已選 {filteredSelectedCount} 筆）
            </span>
          </div>
          <div className="ml-auto">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleBatchTest}
              isLoading={batchTesting}
              disabled={batchTesting || filteredSelectedCount === 0}
              title={
                filteredSelectedCount === 0
                  ? '目前選擇的 models 數為 0，無法測試。請先勾選要測試的模型。'
                  : '對目前已選且具金鑰的模型並行測試'
              }
            >
              {batchTesting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <FlaskConical size={14} />
              )}
              <span className="ml-1.5">全部測試</span>
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-xs border-collapse" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              {columnWidths.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-border-subtle bg-bg-tertiary">
                <th className="text-left py-3 px-3 font-semibold text-text-secondary border-r border-border-subtle relative group">
                  <span>已選</span>
                  <div
                    role="separator"
                    aria-label="調整欄寬"
                    onMouseDown={handleResizeStart(0)}
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/30 transition-colors"
                  />
                </th>
                <th className="text-left py-3 px-3 font-semibold text-text-secondary border-r border-border-subtle relative group">
                  <span>公司名稱</span>
                  <div
                    role="separator"
                    aria-label="調整欄寬"
                    onMouseDown={handleResizeStart(1)}
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/30 transition-colors"
                  />
                </th>
                <th className="text-left py-3 px-3 font-semibold text-text-secondary border-r border-border-subtle relative group">
                  <span>模型名稱與版本型號</span>
                  <div
                    role="separator"
                    aria-label="調整欄寬"
                    onMouseDown={handleResizeStart(2)}
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/30 transition-colors"
                  />
                </th>
                <th className="text-left py-3 px-3 font-semibold text-text-secondary border-r border-border-subtle relative group">
                  <span>模型分類</span>
                  <div
                    role="separator"
                    aria-label="調整欄寬"
                    onMouseDown={handleResizeStart(3)}
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/30 transition-colors"
                  />
                </th>
                <th className="text-left py-3 px-3 font-semibold text-text-secondary border-r border-border-subtle relative group">
                  <span>狀態</span>
                  <div
                    role="separator"
                    aria-label="調整欄寬"
                    onMouseDown={handleResizeStart(4)}
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/30 transition-colors"
                  />
                </th>
                <th className="text-left py-3 px-3 font-semibold text-text-secondary border-r border-border-subtle relative group align-top">
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
                    onMouseDown={handleResizeStart(5)}
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/30 transition-colors"
                  />
                </th>
                <th className="text-right py-3 px-3 font-semibold text-text-secondary border-r border-border-subtle relative group">
                  <span>prompt測試</span>
                  <div
                    role="separator"
                    aria-label="調整欄寬"
                    onMouseDown={handleResizeStart(6)}
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/30 transition-colors"
                  />
                </th>
                <th className="text-left py-3 px-3 font-semibold text-text-secondary border-r border-border-subtle relative group whitespace-nowrap">
                  <span>Prompt output</span>
                  <div
                    role="separator"
                    aria-label="調整欄寬"
                    onMouseDown={handleResizeStart(7)}
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/30 transition-colors"
                  />
                </th>
                <th className="text-left py-3 px-3 font-semibold text-text-secondary relative group border-r border-border-subtle">
                  <span>測試日期</span>
                  <div
                    role="separator"
                    aria-label="調整欄寬"
                    onMouseDown={handleResizeStart(8)}
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/30 transition-colors"
                  />
                </th>
                {FEATURE_MODULES.map((mod: FeatureModule, colIdx: number) => {
                  const Icon = MODULE_ICON_MAP[mod.icon] ?? Settings2;
                  const colors = MODULE_CATEGORY_COLORS[mod.category];
                  const state = moduleStates[mod.key];
                  const saving = moduleSavingSet.has(mod.key);
                  const assignedInFiltered = rowsAfterCategoryFilter.filter((r) =>
                    state.assignments.some((a) => a.provider === r.providerId && a.model === r.modelId)
                  ).length;
                  const allFilteredAssigned = rowsAfterCategoryFilter.length > 0 && assignedInFiltered === rowsAfterCategoryFilter.length;
                  const someFilteredAssigned = assignedInFiltered > 0;
                  return (
                    <th
                      key={mod.key}
                      className="py-2 px-2 font-semibold text-text-secondary border-r border-border-subtle last:border-r-0 relative group align-top min-w-[88px]"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-start gap-1">
                          <div className={`w-4 h-4 shrink-0 rounded flex items-center justify-center ${colors.bg}`}>
                            <Icon size={10} className={colors.text} />
                          </div>
                          <span className="text-[10px] leading-tight">{mod.name}</span>
                        </div>
                        {onSaveModule && (
                          <label
                            className="self-start inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium border transition-all bg-bg-tertiary text-text-muted border-border-subtle hover:text-text-secondary cursor-pointer"
                            title={allFilteredAssigned ? '取消全選（移出目前篩選列）' : '全選（將目前篩選列全部加入此模組）'}
                          >
                            <input
                              type="checkbox"
                              checked={allFilteredAssigned}
                              ref={(el) => {
                                if (el) el.indeterminate = someFilteredAssigned && !allFilteredAssigned;
                              }}
                              onChange={(e) => handleModuleSelectAllFiltered(mod.key, e.target.checked)}
                              disabled={saving || rowsAfterCategoryFilter.length === 0}
                              className="rounded border-border-subtle bg-bg-primary text-accent focus:ring-accent"
                            />
                            <span>全選</span>
                          </label>
                        )}
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
              <tr className="border-b border-border-subtle bg-bg-tertiary" ref={filterDropdownRef}>
                <th className="py-1.5 px-3 border-r border-border-subtle" />
                <th className="py-1.5 px-3 border-r border-border-subtle align-top">
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
                </th>
                <th className="py-1.5 px-3 border-r border-border-subtle" />
                <th className="py-1.5 px-3 border-r border-border-subtle align-top">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenFilterDropdown((v) => (v === 'category' ? null : 'category'))}
                      className="w-full rounded border border-border-subtle bg-bg-primary px-2 py-1 text-xs text-left text-text-primary focus:outline-none focus:ring-1 focus:ring-accent min-w-0 flex items-center justify-between gap-1"
                      title="依模型分類篩選（可複選）"
                    >
                      <span className="truncate">
                        {filterCategories.length === 0
                          ? '全部分類'
                          : filterCategories.length === 1
                            ? filterCategories[0] === 'unknown' ? '未知' : filterCategories[0]
                            : `已選 ${filterCategories.length} 項`}
                      </span>
                      <span className="shrink-0 text-text-muted">▾</span>
                    </button>
                    {openFilterDropdown === 'category' && (
                      <div className="absolute left-0 top-full z-10 mt-0.5 min-w-[100px] rounded border border-border-subtle bg-bg-primary py-1 shadow-lg">
                        {[
                          { value: 'VLM', label: 'VLM' },
                          { value: 'LLM', label: 'LLM' },
                          { value: 'unknown', label: '未知' },
                        ].map(({ value, label }) => (
                          <label
                            key={value}
                            className="flex items-center gap-2 px-3 py-1 text-xs cursor-pointer hover:bg-bg-secondary"
                          >
                            <input
                              type="checkbox"
                              checked={filterCategories.includes(value)}
                              onChange={(e) => {
                                setFilterCategories((prev) =>
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
                <th className="py-1.5 px-3 border-r border-border-subtle align-top">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenFilterDropdown((v) => (v === 'status' ? null : 'status'))}
                      className="w-full rounded border border-border-subtle bg-bg-primary px-2 py-1 text-xs text-left text-text-primary focus:outline-none focus:ring-1 focus:ring-accent min-w-0 flex items-center justify-between gap-1"
                      title="依狀態篩選（可複選）"
                    >
                      <span className="truncate">
                        {filterStatuses.length === 0
                          ? '全部狀態'
                          : filterStatuses.length === 1
                            ? filterStatuses[0] === 'working'
                              ? '可用'
                              : filterStatuses[0] === 'not_working'
                                ? '不可用'
                                : '尚未測試'
                            : `已選 ${filterStatuses.length} 項`}
                      </span>
                      <span className="shrink-0 text-text-muted">▾</span>
                    </button>
                    {openFilterDropdown === 'status' && (
                      <div className="absolute left-0 top-full z-10 mt-0.5 min-w-[100px] rounded border border-border-subtle bg-bg-primary py-1 shadow-lg">
                        {[
                          { value: 'working', label: '可用' },
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
                <th className="py-1.5 px-3 border-r border-border-subtle" colSpan={4} />
                {FEATURE_MODULES.map((mod: FeatureModule) => (
                  <th key={mod.key} className="py-1.5 px-2 border-r border-border-subtle last:border-r-0" />
                ))}
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
                    <td className="py-2.5 px-3 align-middle border-r border-border-subtle">
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
                    <td className="py-2.5 px-3 text-text-primary border-r border-border-subtle">{providerName}</td>
                    <td className="py-2.5 px-3 border-r border-border-subtle">
                      <span className="font-medium text-text-primary">{modelName}</span>
                      <span className="ml-1 font-mono text-text-muted">{modelId}</span>
                    </td>
                    <td className="py-2.5 px-3 border-r border-border-subtle">
                      {(() => {
                        const outputText = (outputByKey[key] ?? ev?.notes ?? '').trim();
                        const category = detectCategoryFromOutput(outputText);
                        const label = category === 'unknown' ? '未知' : category;
                        return (
                          <span
                            className="text-xs font-medium text-text-secondary"
                            title="依本列 Prompt output 自動偵測：成功解析檔案→VLM，有回應但未解析→LLM"
                          >
                            {label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-2.5 px-3 border-r border-border-subtle">
                      {(() => {
                        const sessionResult = testResultByKey[key];
                        if (sessionResult === true) {
                          return (
                            <span className="inline-flex items-center gap-1 text-green-400">
                              <CheckCircle2 size={12} /> 可用
                            </span>
                          );
                        }
                        if (sessionResult === false) {
                          return (
                            <span className="inline-flex items-center gap-1 text-amber-500">
                              <XCircle size={12} /> 不可用
                            </span>
                          );
                        }
                        if (ev?.is_working) {
                          return (
                            <span className="inline-flex items-center gap-1 text-green-400">
                              <CheckCircle2 size={12} /> 可用
                            </span>
                          );
                        }
                        if (ev && !ev.is_working) {
                          return (
                            <span className="inline-flex items-center gap-1 text-amber-500">
                              <XCircle size={12} /> 不可用
                            </span>
                          );
                        }
                        return (
                          <span className="text-text-muted">
                            {hasKey ? '未測試' : '—'}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-1.5 px-3 align-top max-w-[200px] border-r border-border-subtle">
                      <textarea
                        value={(rowPrompts[key]?.trim() ?? '') ? (rowPrompts[key] ?? '') : testPrompt}
                        onChange={(e) =>
                          setRowPrompts((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        placeholder={`例如：${DEFAULT_TEST_PROMPT}`}
                        rows={2}
                        className="w-full rounded border border-border-subtle bg-transparent px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent resize-y min-h-[44px]"
                        title="留空則使用上方全域 Prompt；填入後此列測試會使用此專屬 Prompt"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right border-r border-border-subtle">
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
                    <td className="py-2.5 px-3 align-top border-r border-border-subtle overflow-hidden min-w-0">
                      {isTesting ? (
                        <span className="inline-flex items-center gap-1 text-text-muted">
                          <Loader2 size={12} className="animate-spin" /> 測試中…
                        </span>
                      ) : (
                        <span
                          className="text-text-secondary whitespace-nowrap overflow-hidden text-overflow-ellipsis block"
                          title={output || ev?.notes || '—'}
                        >
                          {output || ev?.notes || '—'}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-text-muted border-r border-border-subtle">
                      {ev?.last_tested_at
                        ? new Date(ev.last_tested_at).toLocaleDateString('zh-TW', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    {FEATURE_MODULES.map((mod: FeatureModule) => {
                      const modState = moduleStates[mod.key];
                      const assign = modState?.assignments.find(
                        (a) => a.provider === providerId && a.model === modelId
                      );
                      const saving = moduleSavingSet.has(mod.key);
                      return (
                        <td
                          key={mod.key}
                          className="py-2 px-2 align-middle border-r border-border-subtle last:border-r-0"
                        >
                          {assign ? (
                            <div className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] bg-accent/10 text-accent border border-accent/20">
                              <input
                                type="number"
                                min={1}
                                max={100}
                                value={assign.priority ?? 1}
                                onChange={(e) => {
                                  const n = parseInt(e.target.value, 10);
                                  if (!Number.isNaN(n) && n >= 1 && n <= 100) {
                                    setModuleStates((p) => ({
                                      ...p,
                                      [mod.key]: {
                                        ...p[mod.key],
                                        assignments: p[mod.key].assignments.map((a) =>
                                          a.provider === providerId && a.model === modelId
                                            ? { ...a, priority: n }
                                            : a
                                        ),
                                      },
                                    }));
                                  }
                                }}
                                onBlur={(e) => {
                                  const n = parseInt(e.target.value, 10);
                                  handleModulePriorityChange(
                                    mod.key, providerId, modelId,
                                    Number.isNaN(n) ? 1 : n
                                  );
                                }}
                                disabled={saving}
                                className="w-5 bg-transparent border-none text-center text-[10px] focus:outline-none p-0"
                                title="1=主模型，2~100=備選"
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
                          ) : (
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
