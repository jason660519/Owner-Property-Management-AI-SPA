/**
 * @file useFormDraft.ts
 * @created 2026-02-04
 * @creator Claude Sonnet 4.5
 * @description 表單草稿儲存 Hook - 支援自動儲存與自訂檔名
 */

import { useState, useEffect, useCallback } from 'react';

export interface DraftMetadata {
  id: string;
  name: string;
  savedAt: string;
  data: any;
}

const DRAFT_STORAGE_KEY = 'property_form_drafts';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

export function useFormDraft<T extends Record<string, any>>(formKey: string) {
  const [drafts, setDrafts] = useState<DraftMetadata[]>([]);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Load drafts from localStorage
  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = useCallback(() => {
    try {
      const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (stored) {
        const allDrafts = JSON.parse(stored);
        setDrafts(allDrafts);
      }
    } catch (error) {
      console.error('Failed to load drafts:', error);
    }
  }, []);

  // Helper function to serialize data (remove File objects)
  const serializeData = useCallback((data: any): any => {
    if (data === null || data === undefined) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(serializeData);
    }

    if (typeof data === 'object') {
      // Handle File objects
      if (data instanceof File) {
        return null;
      }

      // Handle photo objects with file property
      if (data.file instanceof File) {
        return {
          ...data,
          file: null, // Remove File object
        };
      }

      // Recursively serialize nested objects
      const serialized: any = {};
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          serialized[key] = serializeData(data[key]);
        }
      }
      return serialized;
    }

    return data;
  }, []);

  const saveDraft = useCallback(
    (data: T, customName?: string) => {
      try {
        console.log('[Draft] Starting save...', { customName, hasData: !!data });

        const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
        const allDrafts: DraftMetadata[] = stored ? JSON.parse(stored) : [];

        const draftId = currentDraftId || Date.now().toString();
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

        const newDraft: DraftMetadata = {
          id: draftId,
          name: draftName,
          savedAt: new Date().toISOString(),
          data: serializedData,
        };

        // Update or add draft
        const existingIndex = allDrafts.findIndex((d) => d.id === draftId);
        if (existingIndex >= 0) {
          allDrafts[existingIndex] = newDraft;
          console.log('[Draft] Updated existing draft');
        } else {
          allDrafts.unshift(newDraft);
          console.log('[Draft] Added new draft');
        }

        // Keep only last 10 drafts
        const limitedDrafts = allDrafts.slice(0, 10);

        console.log('[Draft] Saving to localStorage...');
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(limitedDrafts));

        console.log('[Draft] Updating state...');
        setDrafts(limitedDrafts);
        setCurrentDraftId(draftId);
        setLastSavedAt(new Date());

        console.log('[Draft] Save completed successfully');
        return draftId;
      } catch (error) {
        console.error('[Draft] Save failed:', error);
        console.error('[Draft] Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });

        if (error instanceof Error) {
          if (error.name === 'QuotaExceededError') {
            throw new Error('儲存草稿失敗：儲存空間不足，請刪除部分草稿後再試');
          }
          throw new Error(`儲存草稿失敗: ${error.message}`);
        }
        throw new Error('儲存草稿失敗：未知錯誤');
      }
    },
    [currentDraftId, formKey, serializeData]
  );

  const loadDraft = useCallback((draftId: string): T | null => {
    try {
      const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!stored) return null;

      const allDrafts: DraftMetadata[] = JSON.parse(stored);
      const draft = allDrafts.find((d) => d.id === draftId);

      if (draft && draft.data.formKey === formKey) {
        setCurrentDraftId(draftId);
        return draft.data;
      }

      return null;
    } catch (error) {
      console.error('Failed to load draft:', error);
      return null;
    }
  }, [formKey]);

  const deleteDraft = useCallback((draftId: string) => {
    try {
      const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!stored) return;

      const allDrafts: DraftMetadata[] = JSON.parse(stored);
      const filtered = allDrafts.filter((d) => d.id !== draftId);

      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(filtered));
      setDrafts(filtered);

      if (currentDraftId === draftId) {
        setCurrentDraftId(null);
      }
    } catch (error) {
      console.error('Failed to delete draft:', error);
    }
  }, [currentDraftId]);

  const renameDraft = useCallback((draftId: string, newName: string) => {
    try {
      const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!stored) return;

      const allDrafts: DraftMetadata[] = JSON.parse(stored);
      const draft = allDrafts.find((d) => d.id === draftId);

      if (draft) {
        draft.name = newName;
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(allDrafts));
        setDrafts([...allDrafts]);
      }
    } catch (error) {
      console.error('Failed to rename draft:', error);
    }
  }, []);

  const clearAllDrafts = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setDrafts([]);
      setCurrentDraftId(null);
    } catch (error) {
      console.error('Failed to clear drafts:', error);
    }
  }, []);

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
