// filepath: apps/superadmin/lib/hooks/useAISettings.ts
// Custom hook for managing AI settings state and API calls

import { useState, useEffect, useCallback } from 'react';
import type { AIProvider } from '@/lib/ai-providers';
import { createClient } from '@/utils/supabase/client';

// NOTE: we intentionally do NOT import from '@/lib/crypto' anymore.
// Per docs/ai-prompt-safety-guide.md §6.3, API key encryption/decryption
// must only happen server-side. The frontend sends plaintext over HTTPS
// on save and fetches plaintext on-demand via POST /keys/reveal.

// Temporary mock user ID — replace with real auth
const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';

export interface SavedKey {
  id: string;
  provider: AIProvider;
  is_valid: boolean | null;
  last_validated_at: string | null;
  is_active: boolean;
  created_at: string;
  // Encrypted blob + iv are no longer sent to the client (see security note above).
  // `decryptedKey` used to hold a PBKDF2-decrypted plaintext; removed because
  // the plaintext must only flow through the short-lived reveal endpoint.
}

export interface SavedModel {
  id: string;
  provider: AIProvider;
  model_id: string;
  model_name: string;
  is_primary: boolean;
}

/** LLM 呼叫參數，各家 SDK 設定模式不同需客製化 */
export interface ModelSettings {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  base_url?: string;
  [key: string]: unknown;
}

export interface AssignedModel {
  provider: string;
  model: string;
  /** 1=主模型，2~100=備選順序；主模型失效時依編號替補 */
  priority?: number;
  /** 該模型/提供商的 SDK 專用設定 */
  settings?: ModelSettings;
}

export interface SavedModule {
  id: string;
  module_key: string;
  is_enabled: boolean;
  assigned_provider: string | null;
  assigned_model: string | null;
  /** Multiple model assignments for fallback and concurrent inference */
  assigned_models: AssignedModel[];
  config: Record<string, unknown>;
}

export interface SavedPrompt {
  id: string;
  module_key: string;
  provider: string;
  prompt_name: string;
  prompt_content: string;
  version: number;
}

export interface KeyValidationResult {
  valid: boolean;
  message: string;
  modelInfo?: string;
  availableModels?: string[];
}

/** DB-backed 組態概況：最近一次「全部驗證」結果 */
export interface ValidationSummary {
  validatedCount: number;
  totalModels: number;
  updatedAt: string | null;
}

/** 使用者手動覆寫的顯示狀態（AI 判斷錯誤時可自行修正） */
export type DisplayStatusOverride = 'vlm_ok' | 'llm_ok' | 'working' | 'not_working' | 'untested';

export interface ModelEvaluation {
  id?: string;
  provider: string;
  model_id: string;
  model_name: string;
  is_working: boolean;
  specialties: string[];
  is_candidate: boolean;
  notes: string;
  last_tested_at: string | null;
  /** 使用者手動設定的狀態，有值時優先於 AI 推斷顯示 */
  display_status_override?: DisplayStatusOverride | null;
}

export function useAISettings() {
  const [keys, setKeys] = useState<SavedKey[]>([]);
  const [models, setModels] = useState<SavedModel[]>([]);
  const [modules, setModules] = useState<SavedModule[]>([]);
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [evaluations, setEvaluations] = useState<ModelEvaluation[]>([]);
  const [validationCacheByKeyId, setValidationCacheByKeyId] = useState<Record<string, KeyValidationResult>>({});
  const [validationSummary, setValidationSummary] = useState<ValidationSummary>({
    validatedCount: 0,
    totalModels: 0,
    updatedAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>(MOCK_USER_ID);
  /** Prevents double-fetch: wait for auth resolution before first fetchAll */
  const [authChecked, setAuthChecked] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
      setAuthChecked(true);
    }
    getUser();
  }, []);

  const FETCH_TIMEOUT_MS = 15000;

  // ---- Fetch all settings ----
  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const headers = { 'x-user-id': userId };
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      // cache: 'no-store' + cache-bust 避免導入後重整仍拿到舊的（空）金鑰列表
      const keysUrl = `/api/ai-settings/keys?_=${Date.now()}`;
      const fetchWithTimeout = (url: string) =>
        fetch(url, { signal: controller.signal, headers: { ...headers }, cache: 'no-store' });

      const [keysRes, modelsRes, modulesRes, promptsRes, summaryRes, evalRes, cacheRes] = await Promise.all([
        fetchWithTimeout(keysUrl),
        fetchWithTimeout('/api/ai-settings/models'),
        fetchWithTimeout('/api/ai-settings/modules'),
        fetchWithTimeout('/api/ai-settings/prompts'),
        fetchWithTimeout('/api/ai-settings/summary'),
        fetchWithTimeout('/api/ai-settings/model-evaluations'),
        fetchWithTimeout('/api/ai-settings/keys/validation-cache'),
      ]).finally(() => clearTimeout(timeoutId));

      const keysData = await keysRes.json().catch(() => ({})) as { keys?: unknown[]; error?: string };
      const modelsData = await modelsRes.json().catch(() => ({})) as { models?: unknown[]; error?: string };
      const modulesData = await modulesRes.json().catch(() => ({})) as { modules?: unknown[]; error?: string };
      const promptsData = await promptsRes.json().catch(() => ({})) as { prompts?: unknown[]; error?: string };
      const summaryData = await summaryRes.json().catch(() => ({})) as { summary?: ValidationSummary; error?: string };
      const evalData = await evalRes.json().catch(() => ({})) as { evaluations?: ModelEvaluation[]; error?: string };

      const failMsg = !keysRes.ok ? (keysData?.error ?? '無法載入金鑰')
        : !modelsRes.ok ? (modelsData?.error ?? '無法載入模型')
        : !modulesRes.ok ? (modulesData?.error ?? '無法載入模組')
        : !promptsRes.ok ? (promptsData?.error ?? '無法載入提示詞') : null;
      if (failMsg) setError(failMsg);

      const rawKeys = (keysRes.ok ? (keysData?.keys ?? []) : []) as unknown[];
      // Keys now arrive as masked summaries only — no encrypted blob, no
      // decrypted plaintext. Plaintext is fetched on-demand via revealKey().
      setKeys(rawKeys as SavedKey[]);
      // 僅在該 API 成功時更新；若 API 回傳空陣列但目前已有勾選，不覆寫（保留使用者模型選定）
      if (modelsRes.ok) {
        const nextModels = (modelsData?.models ?? []) as SavedModel[];
        setModels((prev) =>
          nextModels.length > 0 ? nextModels : prev.length > 0 ? prev : nextModels
        );
      }
      if (modulesRes.ok) {
        const modules = (modulesData?.modules ?? []) as {
          assigned_function?: string;
          module_key?: string;
          assigned_models?: AssignedModel[] | unknown;
          assigned_provider?: string | null;
          assigned_model?: string | null;
        }[];
        setModules(modules.map((m) => {
          const raw = m.assigned_models;
          let arr: AssignedModel[] = Array.isArray(raw)
            ? raw
                .filter((x): x is Record<string, unknown> => x && typeof x === 'object' && 'provider' in x && 'model' in x)
                .map((x, i) => ({
                  provider: String(x.provider),
                  model: String(x.model),
                  priority: typeof x.priority === 'number' && x.priority >= 1 && x.priority <= 100
                    ? x.priority
                    : i + 1,
                  settings: x.settings && typeof x.settings === 'object' ? (x.settings as ModelSettings) : undefined,
                }))
            : m.assigned_provider && m.assigned_model
              ? [{ provider: m.assigned_provider, model: m.assigned_model, priority: 1 }]
              : [];
          arr = arr.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
          return {
            ...m,
            module_key: m.assigned_function ?? m.module_key ?? '',
            assigned_models: arr,
          };
        }) as SavedModule[]);
      }
      if (promptsRes.ok) setPrompts((promptsData?.prompts ?? []) as SavedPrompt[]);
      if (summaryRes.ok && summaryData?.summary) {
        setValidationSummary(summaryData.summary);
      }
      if (evalRes.ok) setEvaluations((evalData?.evaluations ?? []) as ModelEvaluation[]);
      const cacheData = await cacheRes.json().catch(() => ({})) as { cache?: Record<string, KeyValidationResult> };
      if (cacheRes.ok && cacheData?.cache && typeof cacheData.cache === 'object') {
        setValidationCacheByKeyId(cacheData.cache);
      }

      // Client-side decryption removed: keys never hold plaintext in React state.
    } catch (err) {
      const msg = err instanceof Error && err.name === 'AbortError'
        ? '載入逾時（超過 15 秒），請檢查網路或稍後再試'
        : err instanceof Error ? err.message : '載入設定失敗';
      setError(msg);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [userId]);

  // Only fetch after auth is resolved to prevent double-fetch with wrong user ID
  useEffect(() => { if (authChecked) fetchAll(); }, [authChecked, fetchAll]);

  // ---- API Key Operations ----
  /** skipRefresh: 批量導入時使用，避免每筆儲存都觸發 fetchAll 造成畫面閃爍
   *  Plaintext is sent over HTTPS and encrypted server-side. */
  const saveKey = useCallback(async (provider: AIProvider, rawKey: string, options?: { skipRefresh?: boolean }) => {
    const res = await fetch('/api/ai-settings/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify({ provider, plaintextKey: rawKey }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    if (options?.skipRefresh !== true) await fetchAll();
    return data.key;
  }, [userId, fetchAll]);

  const deleteKey = useCallback(async (keyId: string) => {
    const res = await fetch(`/api/ai-settings/keys?id=${keyId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userId },
    });
    if (!res.ok) throw new Error('刪除失敗');
    await fetchAll();
  }, [userId, fetchAll]);

  /** Fetch plaintext key from the server for short-lived consumption
   *  (e.g. copy-to-clipboard). Never store the result in React state. */
  const revealKey = useCallback(async (keyId: string): Promise<{ plaintext: string; ttlSeconds: number }> => {
    const res = await fetch('/api/ai-settings/keys/reveal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify({ keyId }),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error ?? '讀取金鑰失敗');
    return { plaintext: String(data.plaintext ?? ''), ttlSeconds: Number(data.ttlSeconds ?? 30) };
  }, [userId]);

  const validateKey = useCallback(
    async (
      provider: AIProvider,
      apiKey: string,
      keyId?: string,
      options?: { skipRefresh?: boolean }
    ) => {
      const res = await fetch('/api/ai-settings/keys/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ provider, apiKey, keyId, userId }),
      });
      const result = (await res.json()) as KeyValidationResult & { error?: string };
      // Single-key validation UI: refresh so is_valid badge updates. Batch 全部驗證: caller will refresh once.
      if (keyId && options?.skipRefresh !== true) await fetchAll(true);
      return result;
    },
    [userId, fetchAll]
  );

  // ---- Model Operations ----
  const saveModels = useCallback(async (
    provider: AIProvider,
    selections: { modelId: string; modelName: string; isPrimary: boolean }[]
  ) => {
    const res = await fetch('/api/ai-settings/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, provider, selections }),
    });
    if (!res.ok) throw new Error('儲存模型選擇失敗');
    await fetchAll(true);
  }, [userId, fetchAll]);

  // ---- Module Operations ----
  /** 靜默重整，避免綁定/解除綁定模型時觸發 loading 導致 ModelEvaluator 卸載、篩選與勾選狀態被重置 */
  const saveModule = useCallback(async (
    moduleKey: string,
    isEnabled: boolean,
    assignedModelsOrProvider?: AssignedModel[] | string,
    assignedModel?: string,
    config?: Record<string, unknown>
  ) => {
    const assignedModels = Array.isArray(assignedModelsOrProvider)
      ? assignedModelsOrProvider
      : assignedModelsOrProvider && assignedModel
        ? [{ provider: assignedModelsOrProvider, model: assignedModel }]
        : [];
    const res = await fetch('/api/ai-settings/modules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, moduleKey, isEnabled, assignedModels, config }),
    });
    if (!res.ok) throw new Error('儲存模組設定失敗');
    await fetchAll(true);
  }, [userId, fetchAll]);

  // ---- Prompt Operations ----
  const savePrompt = useCallback(async (
    moduleKey: string,
    provider: string,
    promptContent: string,
    promptName?: string
  ) => {
    const res = await fetch('/api/ai-settings/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, moduleKey, provider, promptContent, promptName }),
    });
    if (!res.ok) throw new Error('儲存 Prompt 失敗');
    await fetchAll();
  }, [userId, fetchAll]);

  const deletePrompt = useCallback(async (promptId: string) => {
    const res = await fetch('/api/ai-settings/prompts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, promptId }),
    });
    if (!res.ok) throw new Error('刪除 Prompt 失敗');
    await fetchAll(true);
  }, [userId, fetchAll]);

  // ---- Export / Import ----
  const exportSettings = async () => {
    const res = await fetch('/api/ai-settings/export', {
      headers: { 'x-user-id': userId },
    });
    return res.json();
  };

  const importSettings = async (data: unknown) => {
    const res = await fetch('/api/ai-settings/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, data }),
    });
    if (!res.ok) throw new Error('匯入失敗');
    await fetchAll();
    return res.json();
  };

  /** 一鍵清空雲端：API 金鑰、已選模型、功能模組、System Prompt */
  const clearAll = useCallback(async () => {
    const res = await fetch('/api/ai-settings/clear-all', {
      method: 'POST',
      headers: { 'x-user-id': userId },
    });
    if (!res.ok) throw new Error('清空失敗');
    await fetchAll();
  }, [userId, fetchAll]);

  /** 靜默重整：不設 loading，避免勾選模型後畫面閃爍 */
  const refreshSilent = useCallback(() => fetchAll(true), [fetchAll]);

  /** 連線測試：測試指定 model 是否能正常回應；可傳入自訂 prompt 與選用檔案（PDF/圖片），回應內容在 output */
  const testModel = useCallback(
    async (
      provider: string,
      modelId: string,
      prompt?: string,
      file?: File | null
    ): Promise<{ success: boolean; message?: string; output?: string; output_image_url?: string }> => {
      let fileBase64: string | undefined;
      let mimeType: string | undefined;
      let fileName: string | undefined;
      if (file && file.size > 0) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          mimeType = match[1];
          fileBase64 = match[2];
          fileName = file.name;
        }
      }
      const body: Record<string, unknown> = { provider, modelId, prompt: prompt ?? undefined };
      if (fileBase64 && mimeType) {
        body.fileBase64 = fileBase64;
        body.mimeType = mimeType;
        if (fileName) body.fileName = fileName;
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 65000); // 65s timeout
      let res: Response;
      try {
        res = await fetch('/api/ai-settings/models/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        const msg = fetchErr instanceof Error && fetchErr.name === 'AbortError'
          ? '請求逾時（65 秒），請檢查網路或稍後再試'
          : `連線失敗: ${fetchErr instanceof Error ? fetchErr.message : 'Unknown'}`;
        return { success: false, message: msg };
      }
      clearTimeout(timeoutId);
      const data = (await res.json()) as { success?: boolean; message?: string; output?: string; output_image_url?: string };
      return { success: data.success ?? false, message: data.message, output: data.output, output_image_url: data.output_image_url };
    },
    [userId]
  );

  /** 儲存「全部驗證」結果到 DB，供組態概況與 Supabase 同步 */
  const saveValidationSummary = useCallback(
    async (validatedCount: number, totalModels: number) => {
      const res = await fetch('/api/ai-settings/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ validatedCount, totalModels }),
      });
      if (!res.ok) throw new Error('儲存組態概況失敗');
      const data = (await res.json()) as { summary?: ValidationSummary };
      if (data.summary) setValidationSummary(data.summary);
    },
    [userId]
  );

  /**
   * 儲存模型評估結果。僅更新 evaluations 狀態（以送出的 items 合併），
   * 絕不呼叫 fetchAll，以保留使用者當前的模型勾選（models）不變。
   */
  const saveEvaluations = useCallback(async (items: ModelEvaluation[]) => {
    const res = await fetch('/api/ai-settings/model-evaluations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, evaluations: items }),
    });
    if (!res.ok) throw new Error('儲存模型評估失敗');
    // 僅用送出的 items 合併進 state，不 refetch，不觸及 setModels
    setEvaluations((prev) => {
      const byKey = new Map(prev.map((e) => [`${e.provider}::${e.model_id}`, e]));
      for (const e of items) {
        byKey.set(`${e.provider}::${e.model_id}`, e);
      }
      return Array.from(byKey.values());
    });
  }, [userId]);

  return {
    keys, models, modules, prompts, evaluations, validationCacheByKeyId, validationSummary,
    loading, error,
    saveKey, deleteKey, validateKey, revealKey,
    saveModels, saveModule, testModel,
    savePrompt, deletePrompt, saveEvaluations,
    exportSettings, importSettings,
    clearAll,
    saveValidationSummary,
    refresh: fetchAll,
    refreshSilent,
    userId,
  };
}
