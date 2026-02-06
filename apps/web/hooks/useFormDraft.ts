/**
 * @file useFormDraft.ts
 * @created 2026-02-04
 * @creator Claude Sonnet 4.5
 * @lastModified 2026-02-06
 * @modifiedBy GPT-5.1
 * @description 表單草稿儲存 Hook - 由 localStorage 改為 Supabase form_drafts 資料表
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface DraftMetadata {
  id: string;
  name: string;
  savedAt: string;
  data: any;
}

export function useFormDraft<T extends Record<string, any>>(formKey: string) {
  const [drafts, setDrafts] = useState<DraftMetadata[]>([]);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // 從 Supabase 載入指定 formKey 的草稿
  const loadDrafts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('form_drafts')
        .select('id, name, data, updated_at, form_key')
        .eq('form_key', formKey)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('[Draft] Failed to load drafts from Supabase:', error);
        return;
      }

      const mapped: DraftMetadata[] =
        data?.map((row: any) => ({
          id: row.id,
          name: row.name,
          savedAt: row.updated_at,
          data: row.data,
        })) ?? [];

      setDrafts(mapped);
    } catch (error) {
      console.error('[Draft] Unexpected error while loading drafts:', error);
    }
  }, [formKey]);

  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);

  // Helper function to serialize data（移除 File 物件，保留可序列化的欄位）
  const serializeData = useCallback((data: any): any => {
    if (data === null || data === undefined) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(serializeData);
    }

    if (typeof data === 'object') {
      // Handle File objects（Supabase JSON 也無法儲存 File）
      if (data instanceof File) {
        return null;
      }

      // Handle photo objects with file property
      if (data.file instanceof File) {
        return {
          ...data,
          file: null, // 移除 File 物件（無法直接儲存在 JSON 中）
        };
      }

      // Recursively serialize nested objects
      const serialized: any = {};
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          serialized[key] = serializeData(data[key]);
        }
      }
      return serialized;
    }

    return data;
  }, []);

  const saveDraft = useCallback(
    async (data: T, customName?: string) => {
      try {
        console.log('[Draft] Starting save (Supabase)...', { customName, hasData: !!data });

        const draftId = currentDraftId || null;
        const draftName =
          customName ||
          `草稿 ${new Date().toLocaleDateString('zh-TW')} ${new Date().toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit',
          })}`;

        console.log('[Draft] Serializing data...');

        // Serialize data to remove File objects
        const serializedData = serializeData({
          ...data,
          formKey,
        });

        console.log('[Draft] Data serialized successfully');

        let row: any | null = null;

        if (draftId) {
          // 更新既有草稿
          const { data: updated, error } = await supabase
            .from('form_drafts')
            .update({
              name: draftName,
              data: serializedData,
            })
            .eq('id', draftId)
            .eq('form_key', formKey)
            .select('id, name, data, updated_at')
            .single();

          if (error) {
            throw error;
          }

          row = updated;
          console.log('[Draft] Updated existing draft in Supabase');
        } else {
          // 新增草稿
          const { data: inserted, error } = await supabase
            .from('form_drafts')
            .insert({
              form_key: formKey,
              name: draftName,
              data: serializedData,
            })
            .select('id, name, data, updated_at')
            .single();

          if (error) {
            throw error;
          }

          row = inserted;
          console.log('[Draft] Added new draft in Supabase');
        }

        if (!row) {
          throw new Error('無法取得草稿資料');
        }

        const newDraft: DraftMetadata = {
          id: row.id,
          name: row.name,
          savedAt: row.updated_at,
          data: row.data,
        };

        // 更新本地狀態（保持最近 10 筆）
        setDrafts((prev) => {
          const others = prev.filter((d) => d.id !== newDraft.id);
          const merged = [newDraft, ...others].slice(0, 10);
          return merged;
        });

        setCurrentDraftId(newDraft.id);
        setLastSavedAt(new Date(newDraft.savedAt));

        console.log('[Draft] Save completed successfully (Supabase)');
        return newDraft.id;
      } catch (error) {
        console.error('[Draft] Save failed (Supabase):', error);
        if (error instanceof Error) {
          throw new Error(`儲存草稿失敗：${error.message}`);
        }
        // 將非 Error 類型也轉成可閱讀的訊息，方便除錯
        throw new Error(
          `儲存草稿失敗：${
            typeof error === 'string' ? error : JSON.stringify(error)
          }`
        );
      }
    },
    [currentDraftId, formKey, serializeData]
  );

  const loadDraft = useCallback(
    (draftId: string): T | null => {
      try {
        const draft = drafts.find((d) => d.id === draftId);
        if (draft && draft.data.formKey === formKey) {
          setCurrentDraftId(draftId);
          return draft.data;
        }
        return null;
      } catch (error) {
        console.error('[Draft] Failed to load draft from state:', error);
        return null;
      }
    },
    [drafts, formKey]
  );

  const deleteDraft = useCallback(
    async (draftId: string) => {
      try {
        const { error } = await supabase
          .from('form_drafts')
          .delete()
          .eq('id', draftId)
          .eq('form_key', formKey);

        if (error) {
          throw error;
        }

        setDrafts((prev) => prev.filter((d) => d.id !== draftId));

        if (currentDraftId === draftId) {
          setCurrentDraftId(null);
        }
      } catch (error) {
        console.error('[Draft] Failed to delete draft (Supabase):', error);
      }
    },
    [currentDraftId, formKey]
  );

  const renameDraft = useCallback(
    async (draftId: string, newName: string) => {
      try {
        const { data, error } = await supabase
          .from('form_drafts')
          .update({ name: newName })
          .eq('id', draftId)
          .eq('form_key', formKey)
          .select('id, name, data, updated_at')
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          const updated: DraftMetadata = {
            id: data.id,
            name: data.name,
            savedAt: data.updated_at,
            data: data.data,
          };

          setDrafts((prev) => {
            const others = prev.filter((d) => d.id !== updated.id);
            return [updated, ...others];
          });
        }
      } catch (error) {
        console.error('[Draft] Failed to rename draft (Supabase):', error);
      }
    },
    [formKey]
  );

  const clearAllDrafts = useCallback(
    async () => {
      try {
        const { error } = await supabase
          .from('form_drafts')
          .delete()
          .eq('form_key', formKey);

        if (error) {
          throw error;
        }

        setDrafts([]);
        setCurrentDraftId(null);
      } catch (error) {
        console.error('[Draft] Failed to clear drafts (Supabase):', error);
      }
    },
    [formKey]
  );

  return {
    drafts: drafts.filter((d) => d.data.formKey === formKey),
    currentDraftId,
    autoSaveEnabled,
    lastSavedAt,
    setAutoSaveEnabled,
    saveDraft,
    loadDraft,
    deleteDraft,
    renameDraft,
    clearAllDrafts,
  };
}

