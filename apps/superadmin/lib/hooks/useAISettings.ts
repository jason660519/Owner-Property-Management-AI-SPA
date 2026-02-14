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

  // ---- Fetch all settings ----
  const fetchAll = useCallback(async () => {
    // Wait for real user ID if possible, but don't block too long if using mock
    // Actually, we should probably wait until we check auth status
    
    setLoading(true);
    setError(null);
    try {
      const headers = { 'x-user-id': userId };
      const [keysRes, modelsRes, modulesRes, promptsRes] = await Promise.all([
        fetch('/api/ai-settings/keys', { headers }),
        fetch('/api/ai-settings/models', { headers }),
        fetch('/api/ai-settings/modules', { headers }),
        fetch('/api/ai-settings/prompts', { headers }),
      ]);
      const [keysData, modelsData, modulesData, promptsData] = await Promise.all([
        keysRes.json(),
        modelsRes.json(),
        modulesRes.json(),
        promptsRes.json(),
      ]);

      // Process keys: Decrypt them if encrypted data is present
      const rawKeys = keysData.keys || [];
      const processedKeys = await Promise.all(rawKeys.map(async (key: any) => {
        let decryptedKey = undefined;
        // If we have encrypted data, try to decrypt it
        if (key.api_key_encrypted && key.iv) {
          try {
            decryptedKey = await decryptApiKey(key.api_key_encrypted, key.iv);
          } catch (err) {
            console.warn(`[AI Settings] Failed to decrypt key for ${key.provider}`, err);
          }
        }
        return { ...key, decryptedKey };
      }));

      setKeys(processedKeys);
      setModels(modelsData.models || []);
      setModules(modulesData.modules || []);
      setPrompts(promptsData.prompts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入設定失敗');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ---- API Key Operations ----
  const saveKey = async (provider: AIProvider, rawKey: string) => {
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
  };

  const deleteKey = async (keyId: string) => {
    const res = await fetch(`/api/ai-settings/keys?id=${keyId}&userId=${userId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('刪除失敗');
    await fetchAll();
  };

  const validateKey = async (provider: AIProvider, apiKey: string, keyId?: string) => {
    const res = await fetch('/api/ai-settings/keys/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey, keyId, userId }),
    });
    const result = await res.json();
    if (keyId) await fetchAll();
    return result as { valid: boolean; message: string; modelInfo?: string };
  };

  // ---- Model Operations ----
  const saveModels = async (
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
  };

  // ---- Module Operations ----
  const saveModule = async (
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
  };

  // ---- Prompt Operations ----
  const savePrompt = async (
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
  };

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
