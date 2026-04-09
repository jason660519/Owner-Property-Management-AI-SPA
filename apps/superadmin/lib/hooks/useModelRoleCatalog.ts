'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { AI_PROVIDERS } from '@/lib/ai-providers';
import type { SavedKey, KeyValidationResult } from '@/lib/hooks/useAISettings';
import type {
  RoleTag,
  RoleAssignment,
  ModelStatus,
  ModelRoleCatalogRow,
  ClassifyModelsResult,
} from '@/lib/types/model-role-catalog';

// ---------------------------------------------------------------------------
// Version parser: extract a human-friendly version from model_id
// ---------------------------------------------------------------------------

function parseVersion(modelId: string): string {
  // Examples:
  //   gpt-4o => 4o
  //   claude-sonnet-4-5-20250929 => 4.5
  //   gemini-2.5-pro => 2.5
  //   deepseek-chat => chat
  //   grok-3-mini => 3-mini
  //   moonshot-v1-128k => v1-128k
  //   llama-4-scout-17b-16e-instruct => 4-scout

  // Strip common prefixes
  const stripped = modelId
    .replace(/^(gpt-|claude-|gemini-|deepseek-|grok-|moonshot-|glm-|llama-|qwen-|mixtral-)/, '')
    .replace(/-instruct$/, '')
    .replace(/-turbo$/, '-turbo');

  return stripped || modelId;
}

// ---------------------------------------------------------------------------
// Hook interface
// ---------------------------------------------------------------------------

export interface UseModelRoleCatalogDeps {
  savedKeys: SavedKey[];
  validationCache: Record<string, KeyValidationResult>;
  userId: string;
}

export type ClassifyStatus = 'idle' | 'running' | 'success' | 'error';

export interface UseModelRoleCatalogReturn {
  rows: ModelRoleCatalogRow[];
  roleTags: RoleTag[];
  loading: boolean;
  classifyStatus: ClassifyStatus;
  classifyError: string | null;
  /** Fetch tags + assignments from DB */
  refresh: () => Promise<void>;
  /** Run AI classification. Set skipRefresh=true when batching to avoid per-job DB queries. */
  classifyModels: (
    mode: 'online' | 'offline',
    classifierProvider: string,
    classifierModelId: string,
    options?: { skipRefresh?: boolean; signal?: AbortSignal },
  ) => Promise<ClassifyModelsResult>;
  /** Manually refresh assignments (call once after batch completes) */
  refreshAssignments: () => Promise<void>;
  /** Save manual tag assignments for one model */
  saveManualAssignments: (
    provider: string,
    modelId: string,
    tagKeys: string[],
  ) => Promise<void>;
  /** Remove specific assignment */
  removeAssignment: (
    provider: string,
    modelId: string,
    tagKey: string,
  ) => Promise<void>;
  /** Create a new custom tag */
  createCustomTag: (tagKey: string, tagLabel: string, description?: string) => Promise<RoleTag | null>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useModelRoleCatalog(deps: UseModelRoleCatalogDeps): UseModelRoleCatalogReturn {
  const { savedKeys, validationCache, userId } = deps;

  const [roleTags, setRoleTags] = useState<RoleTag[]>([]);
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [classifyStatus, setClassifyStatus] = useState<ClassifyStatus>('idle');
  const [classifyError, setClassifyError] = useState<string | null>(null);

  // ---- Helpers ----
  const headers = useMemo(() => ({ 'x-user-id': userId }), [userId]);

  const fetchTags = useCallback(async () => {
    const res = await fetch('/api/ai-settings/role-tags');
    const data = (await res.json()) as { tags?: RoleTag[] };
    setRoleTags(data.tags ?? []);
  }, []);

  const fetchAssignments = useCallback(async () => {
    const res = await fetch('/api/ai-settings/role-assignments', { headers });
    const data = (await res.json()) as { assignments?: RoleAssignment[] };
    setAssignments(data.assignments ?? []);
  }, [headers]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchTags(), fetchAssignments()]);
    } finally {
      setLoading(false);
    }
  }, [fetchTags, fetchAssignments]);

  // Initial load
  useEffect(() => {
    if (userId) refresh();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Derive model status per provider ----
  const keyStatusByProvider = useMemo(() => {
    const map = new Map<string, ModelStatus>();

    // Providers that have an active key
    const keysByProvider = new Map<string, SavedKey>();
    for (const k of savedKeys) {
      if (k.is_active) keysByProvider.set(k.provider, k);
    }

    // Providers with a valid key (via cache or DB flag)
    const validProviders = new Set<string>();
    for (const k of savedKeys) {
      if (!k.is_active) continue;
      const cached = validationCache[k.id];
      if (cached?.valid || k.is_valid === true) {
        validProviders.add(k.provider);
      }
    }

    // Collect all provider IDs: from static list + from actual keys
    const allProviderIds = new Set<string>(AI_PROVIDERS.map((p) => p.id));
    for (const k of savedKeys) allProviderIds.add(k.provider);

    for (const pid of allProviderIds) {
      if (!keysByProvider.has(pid)) {
        map.set(pid, 'no_key');
      } else if (validProviders.has(pid)) {
        map.set(pid, 'available');
      } else {
        map.set(pid, 'invalid');
      }
    }
    return map;
  }, [savedKeys, validationCache]);

  // ---- Build assignment lookup ----
  const assignmentMap = useMemo(() => {
    const m = new Map<string, RoleAssignment[]>();
    for (const a of assignments) {
      const key = `${a.provider}::${a.model_id}`;
      const arr = m.get(key) ?? [];
      arr.push(a);
      m.set(key, arr);
    }
    return m;
  }, [assignments]);

  // ---- Build provider name lookup ----
  const providerNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of AI_PROVIDERS) m.set(p.id, p.name);
    return m;
  }, []);

  // ---- Build static model name lookup (for models in AI_PROVIDERS) ----
  const staticModelNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of AI_PROVIDERS) {
      for (const model of p.models) {
        m.set(`${p.id}::${model.id}`, model.name);
      }
    }
    return m;
  }, []);

  // ---- Build rows: merge static AI_PROVIDERS + validated models from cache ----
  const rows: ModelRoleCatalogRow[] = useMemo(() => {
    // Collect all unique (provider, modelId) from validation cache
    const seen = new Set<string>();
    const result: ModelRoleCatalogRow[] = [];

    // Helper to add a row if not already added
    const addRow = (providerId: string, modelId: string) => {
      const rowKey = `${providerId}::${modelId}`;
      if (seen.has(rowKey)) return;
      seen.add(rowKey);

      const staticName = staticModelNameMap.get(rowKey);
      const pName = providerNameMap.get(providerId) ?? providerId;

      result.push({
        provider: providerId,
        providerName: pName,
        modelId,
        modelName: staticName ?? modelId,
        version: parseVersion(modelId),
        status: keyStatusByProvider.get(providerId) ?? 'no_key',
        assignments: assignmentMap.get(rowKey) ?? [],
      });
    };

    // 1. Add all models from validation cache (these are the real available models)
    for (const k of savedKeys) {
      if (!k.is_active) continue;
      const cached = validationCache[k.id];
      if (!cached?.availableModels?.length) continue;
      for (const modelId of cached.availableModels) {
        addRow(k.provider, modelId);
      }
    }

    // 2. Fill in static models for providers without validation results
    const providersWithCache = new Set(
      savedKeys
        .filter((k) => k.is_active && validationCache[k.id]?.availableModels?.length)
        .map((k) => k.provider),
    );

    for (const provider of AI_PROVIDERS) {
      if (providersWithCache.has(provider.id)) continue;
      // No cache for this provider — use static model list
      for (const model of provider.models) {
        addRow(provider.id, model.id);
      }
    }

    // Sort: by provider name, then model name
    result.sort((a, b) =>
      a.providerName.localeCompare(b.providerName) || a.modelName.localeCompare(b.modelName),
    );

    return result;
  }, [savedKeys, validationCache, keyStatusByProvider, assignmentMap, providerNameMap, staticModelNameMap]);

  // ---- Actions ----

  const classifyModels = useCallback(async (
    mode: 'online' | 'offline',
    classifierProvider: string,
    classifierModelId: string,
    options?: { skipRefresh?: boolean; signal?: AbortSignal },
  ): Promise<ClassifyModelsResult> => {
    const { skipRefresh = false, signal } = options ?? {};

    // Only set global status when not in batch mode
    if (!skipRefresh) {
      setClassifyStatus('running');
      setClassifyError(null);
    }

    try {
      const res = await fetch('/api/ai-settings/role-classify', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, mode, classifierProvider, classifierModelId }),
        signal,
      });
      const data = (await res.json()) as ClassifyModelsResult & { error?: string };
      if (!res.ok || !data.ok) {
        const errMsg = data.error ?? `HTTP ${res.status}`;
        if (!skipRefresh) {
          setClassifyStatus('error');
          setClassifyError(errMsg);
        }
        return { ok: false, count: 0, error: errMsg };
      }

      if (!skipRefresh) {
        setClassifyStatus('success');
        await fetchAssignments();
      }
      return { ok: true, count: data.count };
    } catch (err) {
      // Don't treat abort as an error
      if (err instanceof DOMException && err.name === 'AbortError') {
        return { ok: false, count: 0, error: 'Aborted' };
      }
      const msg = err instanceof Error ? err.message : 'Classification failed';
      if (!skipRefresh) {
        setClassifyStatus('error');
        setClassifyError(msg);
      }
      return { ok: false, count: 0, error: msg };
    }
  }, [headers, userId, fetchAssignments]);

  const saveManualAssignments = useCallback(async (
    provider: string,
    modelId: string,
    tagKeys: string[],
  ) => {
    // Find current manual assignments for this model
    const key = `${provider}::${modelId}`;
    const current = (assignmentMap.get(key) ?? []).filter((a) => a.source === 'manual');
    const currentKeys = new Set(current.map((a) => a.tag_key));
    const newKeys = new Set(tagKeys);

    // Tags to add
    const toAdd = tagKeys.filter((k) => !currentKeys.has(k));
    // Tags to remove
    const toRemove = current.filter((a) => !newKeys.has(a.tag_key));

    const promises: Promise<unknown>[] = [];

    if (toAdd.length > 0) {
      promises.push(
        fetch('/api/ai-settings/role-assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            assignments: toAdd.map((tagKey) => ({
              provider,
              model_id: modelId,
              tag_key: tagKey,
              source: 'manual' as const,
              confidence: 1,
              classified_by: 'user',
            })),
          }),
        }),
      );
    }

    if (toRemove.length > 0) {
      promises.push(
        fetch('/api/ai-settings/role-assignments', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            items: toRemove.map((a) => ({
              provider: a.provider,
              model_id: a.model_id,
              tag_key: a.tag_key,
            })),
          }),
        }),
      );
    }

    await Promise.all(promises);
    await fetchAssignments();
  }, [userId, assignmentMap, fetchAssignments]);

  const removeAssignment = useCallback(async (
    provider: string,
    modelId: string,
    tagKey: string,
  ) => {
    await fetch('/api/ai-settings/role-assignments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        items: [{ provider, model_id: modelId, tag_key: tagKey }],
      }),
    });
    await fetchAssignments();
  }, [userId, fetchAssignments]);

  const createCustomTag = useCallback(async (
    tagKey: string,
    tagLabel: string,
    description?: string,
  ): Promise<RoleTag | null> => {
    const res = await fetch('/api/ai-settings/role-tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_key: tagKey, tag_label: tagLabel, description }),
    });
    const data = (await res.json()) as { tag?: RoleTag; error?: string };
    if (!res.ok || !data.tag) return null;
    // Refresh tags list
    await fetchTags();
    return data.tag;
  }, [fetchTags]);

  return {
    rows,
    roleTags,
    loading,
    classifyStatus,
    classifyError,
    refresh,
    classifyModels,
    refreshAssignments: fetchAssignments,
    saveManualAssignments,
    removeAssignment,
    createCustomTag,
  };
}
