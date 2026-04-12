'use client';

// Hook that fetches all active Paperclip tasks from the server-side task queue
// and exposes them keyed by rowId. Also triggers the server-side poll endpoint
// periodically to keep task statuses fresh (replacing client-side polling per task).

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PaperclipTaskRow } from '@/app/api/paperclip/task-queue/route';

export interface UsePaperclipTasksReturn {
  tasksByRowId: Record<string, PaperclipTaskRow>;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

const LIST_INTERVAL_MS = 15_000;
const POLL_INTERVAL_MS = 30_000;

export function usePaperclipTasks(): UsePaperclipTasksReturn {
  const [tasksByRowId, setTasksByRowId] = useState<Record<string, PaperclipTaskRow>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchTasks = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch('/api/paperclip/task-queue?active=true', {
        signal: ctrl.signal,
      });
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        return;
      }
      const json = (await res.json()) as { ok: boolean; tasks?: PaperclipTaskRow[]; error?: string };
      if (!json.ok) {
        setError(json.error ?? 'Unknown error');
        return;
      }
      const map: Record<string, PaperclipTaskRow> = {};
      for (const task of json.tasks ?? []) {
        // Keep the most recent task per rowId (tasks are sorted desc by created_at)
        if (!map[task.row_id]) {
          map[task.row_id] = task;
        }
      }
      setTasksByRowId(map);
      setError(null);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Trigger the server-side poll endpoint (updates statuses in DB)
  const triggerPoll = useCallback(async () => {
    try {
      await fetch('/api/paperclip/task-queue/poll');
    } catch {
      // poll is best-effort
    }
  }, []);

  const refresh = useCallback(() => {
    void triggerPoll().then(() => fetchTasks());
  }, [triggerPoll, fetchTasks]);

  // Initial fetch + periodic refresh
  useEffect(() => {
    void fetchTasks();
    const listTimer = window.setInterval(() => { void fetchTasks(); }, LIST_INTERVAL_MS);
    const pollTimer = window.setInterval(() => { void triggerPoll(); }, POLL_INTERVAL_MS);
    return () => {
      window.clearInterval(listTimer);
      window.clearInterval(pollTimer);
      abortRef.current?.abort();
    };
  }, [fetchTasks, triggerPoll]);

  return { tasksByRowId, isLoading, error, refresh };
}
