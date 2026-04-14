'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { CronJobType } from '@/lib/paperclip/adapter-models';

export interface CronConfig {
  id: string;
  job_type: CronJobType;
  enabled: boolean;
  interval_seconds: number;
  last_run_at: string | null;
  last_result: Record<string, unknown> | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface UsePaperclipCronReturn {
  configs: CronConfig[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateConfig: (jobType: CronJobType, patch: { enabled?: boolean; interval_seconds?: number }) => Promise<boolean>;
  runJob: (jobType: CronJobType) => Promise<{ ok: boolean; result?: unknown }>;
  runningJob: CronJobType | null;
}

export function usePaperclipCron(userId: string): UsePaperclipCronReturn {
  const [configs, setConfigs] = useState<CronConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningJob, setRunningJob] = useState<CronJobType | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/paperclip/cron/configs');
      const json = await res.json();
      if (!mounted.current) return;
      if (json.ok) {
        setConfigs(json.configs);
        setError(null);
      } else {
        setError(json.error ?? 'Failed to load cron configs');
      }
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh();
    return () => { mounted.current = false; };
  }, [refresh]);

  const updateConfig = useCallback(async (
    jobType: CronJobType,
    patch: { enabled?: boolean; interval_seconds?: number },
  ) => {
    try {
      const res = await fetch('/api/paperclip/cron/configs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ job_type: jobType, ...patch }),
      });
      const json = await res.json();
      if (json.ok) {
        await refresh();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [userId, refresh]);

  const runJob = useCallback(async (jobType: CronJobType) => {
    setRunningJob(jobType);
    try {
      const res = await fetch('/api/paperclip/cron/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ job_type: jobType }),
      });
      const json = await res.json();
      await refresh();
      return { ok: json.ok, result: json.result };
    } catch {
      return { ok: false };
    } finally {
      if (mounted.current) setRunningJob(null);
    }
  }, [userId, refresh]);

  return { configs, loading, error, refresh, updateConfig, runJob, runningJob };
}
