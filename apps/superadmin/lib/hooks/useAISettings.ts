// filepath: apps/superadmin/lib/hooks/useAISettings.ts
// Custom hook for managing AI settings state and API calls

import { useState, useEffect, useCallback } from 'react';
import type { AIProvider } from '@/lib/ai-providers';
import { encryptApiKey, decryptApiKey } from '@/lib/crypto';
import { createClient } from '@/utils/supabase/client';

// Temporary mock user ID — replace with real auth
const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';

export interface SavedKey {
  id: string;
  provider: AIProvider;
  is_valid: boolean | null;
  last_validated_at: string | null;
  is_active: boolean;
  created_at: string;
  api_key_encrypted?: string;
  iv?: string;
  decryptedKey?: string;
}

export interface SavedModel {
  id: string;
  provider: AIProvider;
  model_id: string;
  model_name: string;
  is_primary: boolean;
}

export interface SavedModule {
  id: string;
  module_key: string;
  is_enabled: boolean;
  assigned_provider: string | null;
  assigned_model: string | null;
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

export function useAISettings() {
  const [keys, setKeys] = useState<SavedKey[]>([]);
  const [models, setModels] = useState<SavedModel[]>([]);
  const [modules, setModules] = useState<SavedModule[]>([]);
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>(MOCK_USER_ID);
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
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
      const fetchWithTimeout = (url: string) =>
        fetch(url, { signal: controller.signal, headers: { ...headers } });

      const [keysRes, modelsRes, modulesRes, promptsRes] = await Promise.all([
        fetchWithTimeout('/api/ai-settings/keys'),
        fetchWithTimeout('/api/ai-settings/models'),
        fetchWithTimeout('/api/ai-settings/modules'),
        fetchWithTimeout('/api/ai-settings/prompts'),
      ]).finally(() => clearTimeout(timeoutId));

      const keysData = await keysRes.json().catch(() => ({})) as { keys?: unknown[]; error?: string };
      const modelsData = await modelsRes.json().catch(() => ({})) as { models?: unknown[]; error?: string };
      const modulesData = await modulesRes.json().catch(() => ({})) as { modules?: unknown[]; error?: string };
      const promptsData = await promptsRes.json().catch(() => ({})) as { prompts?: unknown[]; error?: string };

      const failMsg = !keysRes.ok ? (keysData?.error ?? '無法載入金鑰')
        : !modelsRes.ok ? (modelsData?.error ?? '無法載入模型')
        : !modulesRes.ok ? (modulesData?.error ?? '無法載入模組')
        : !promptsRes.ok ? (promptsData?.error ?? '無法載入提示詞') : null;
      if (failMsg) setError(failMsg);

      const rawKeys = keysRes.ok ? (keysData?.keys ?? []) : [];
      // 先顯示列表並關閉 loading，避免解密 (PBKDF2) 阻塞造成一直轉圈
      setKeys(rawKeys.map((key: Record<string, unknown>) => ({ ...key, decryptedKey: undefined })));
      // 僅在該 API 成功時更新，避免錯誤回應把側欄數字蓋成 0
      if (modelsRes.ok) setModels(modelsData?.models ?? []);
      if (modulesRes.ok) setModules((modulesData?.modules ?? []).map((m: { assigned_function?: string; module_key?: string }) => ({
        ...m,
        module_key: m.assigned_function ?? m.module_key ?? '',
      })));
      if (promptsRes.ok) setPrompts(promptsData?.prompts ?? []);

      // 背景解密，完成後再更新 keys（不阻塞 loading）
      if (rawKeys.length > 0) {
        Promise.all(
          rawKeys.map(async (key: Record<string, unknown>) => {
            let decryptedKey: string | undefined;
            if (key.api_key_encrypted && key.iv) {
              try {
                decryptedKey = await decryptApiKey(
                  key.api_key_encrypted as string,
                  key.iv as string
                );
              } catch (err) {
                console.warn(`[AI Settings] Failed to decrypt key for ${key.provider}`, err);
              }
            }
            return { ...key, decryptedKey };
          })
        ).then((processedKeys) => setKeys(processedKeys));
      }
    } catch (err) {
      const msg = err instanceof Error && err.name === 'AbortError'
        ? '載入逾時（超過 15 秒），請檢查網路或稍後再試'
        : err instanceof Error ? err.message : '載入設定失敗';
      setError(msg);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ---- API Key Operations ----
  const saveKey = useCallback(async (provider: AIProvider, rawKey: string) => {
    const { encrypted, iv } = await encryptApiKey(rawKey);
    const res = await fetch('/api/ai-settings/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, provider, encrypted, iv }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    await fetchAll();
    return data.key;
  }, [userId, fetchAll]);

  const deleteKey = useCallback(async (keyId: string) => {
    const res = await fetch(`/api/ai-settings/keys?id=${keyId}&userId=${userId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('刪除失敗');
    await fetchAll();
  }, [userId, fetchAll]);

  const validateKey = useCallback(async (provider: AIProvider, apiKey: string, keyId?: string) => {
    const res = await fetch('/api/ai-settings/keys/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey, keyId, userId }),
    });
    const result = await res.json();
    // Use silent refresh to avoid unmounting components during validation
    if (keyId) await fetchAll(true);
    return result as KeyValidationResult;
  }, [userId, fetchAll]);

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
    await fetchAll();
  }, [userId, fetchAll]);

  // ---- Module Operations ----
  const saveModule = useCallback(async (
    moduleKey: string,
    isEnabled: boolean,
    assignedProvider?: string,
    assignedModel?: string,
    config?: Record<string, unknown>
  ) => {
    const res = await fetch('/api/ai-settings/modules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, moduleKey, isEnabled, assignedProvider, assignedModel, config }),
    });
    if (!res.ok) throw new Error('儲存模組設定失敗');
    await fetchAll();
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

  return {
    keys, models, modules, prompts,
    loading, error,
    saveKey, deleteKey, validateKey,
    saveModels, saveModule,
    savePrompt,
    exportSettings, importSettings,
    refresh: fetchAll,
    userId,
  };
}
