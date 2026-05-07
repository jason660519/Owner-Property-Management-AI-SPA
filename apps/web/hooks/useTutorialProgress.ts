'use client';

import { useState, useEffect, useCallback } from 'react';
import type { TutorialRole } from '@/lib/tutorial-data';
import { getTotalSteps } from '@/lib/tutorial-data';
import { createClient } from '@/lib/supabase/client';

const STORAGE_KEY_PREFIX = 'ownerai_tutorial_progress';

export interface TutorialProgress {
  completedStepIds: string[];
  lastStepId: string | null;
  completedAt: string | null;
}

function storageKey(role: TutorialRole): string {
  return `${STORAGE_KEY_PREFIX}_${role}`;
}

function loadLocalProgress(role: TutorialRole): TutorialProgress {
  if (typeof window === 'undefined') {
    return { completedStepIds: [], lastStepId: null, completedAt: null };
  }
  try {
    const raw = localStorage.getItem(storageKey(role));
    if (!raw) return { completedStepIds: [], lastStepId: null, completedAt: null };
    return JSON.parse(raw) as TutorialProgress;
  } catch {
    return { completedStepIds: [], lastStepId: null, completedAt: null };
  }
}

function saveLocalProgress(role: TutorialRole, progress: TutorialProgress): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(role), JSON.stringify(progress));
  } catch {
    // Storage may be unavailable (private browsing, quota exceeded) — fail silently
  }
}

async function loadRemoteProgress(role: string): Promise<TutorialProgress | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('tutorial_progress')
      .select('completed_step_ids, last_step_id, completed_at')
      .eq('user_id', user.id)
      .eq('role', role)
      .maybeSingle();
    if (!data) return null;
    return {
      completedStepIds: (data.completed_step_ids as string[]) || [],
      lastStepId: (data.last_step_id as string | null) ?? null,
      completedAt: (data.completed_at as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

async function saveRemoteProgress(role: string, progress: TutorialProgress): Promise<void> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('tutorial_progress')
      .upsert(
        {
          user_id: user.id,
          role,
          completed_step_ids: progress.completedStepIds,
          last_step_id: progress.lastStepId,
          completed_at: progress.completedAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,role' }
      );
  } catch {
    // Remote sync failure is non-critical — local state still valid
  }
}

export function useTutorialProgress(role: TutorialRole) {
  const [progress, setProgress] = useState<TutorialProgress>(() => loadLocalProgress(role));

  // Re-sync when role changes
  useEffect(() => {
    setProgress(loadLocalProgress(role));
  }, [role]);

  // Hydrate from Supabase on mount (takes precedence over stale localStorage)
  useEffect(() => {
    loadRemoteProgress(role).then((remote) => {
      if (!remote) return;
      const local = loadLocalProgress(role);
      // Merge: use whichever has more completed steps
      if (remote.completedStepIds.length >= local.completedStepIds.length) {
        saveLocalProgress(role, remote);
        setProgress(remote);
      }
    });
  }, [role]);

  const markStepComplete = useCallback(
    (stepId: string) => {
      setProgress((prev) => {
        if (prev.completedStepIds.includes(stepId)) return prev;
        const completedStepIds = [...prev.completedStepIds, stepId];
        const totalSteps = getTotalSteps(role);
        const allDone = completedStepIds.length >= totalSteps;
        const updated: TutorialProgress = {
          completedStepIds,
          lastStepId: stepId,
          completedAt: allDone ? new Date().toISOString() : null,
        };
        saveLocalProgress(role, updated);
        void saveRemoteProgress(role, updated);
        return updated;
      });
    },
    [role],
  );

  const resetProgress = useCallback(() => {
    const empty: TutorialProgress = { completedStepIds: [], lastStepId: null, completedAt: null };
    saveLocalProgress(role, empty);
    void saveRemoteProgress(role, empty);
    setProgress(empty);
  }, [role]);

  const isStepComplete = useCallback(
    (stepId: string) => progress.completedStepIds.includes(stepId),
    [progress.completedStepIds],
  );

  const completionPercent = useCallback((): number => {
    const total = getTotalSteps(role);
    if (total === 0) return 0;
    return Math.round((progress.completedStepIds.length / total) * 100);
  }, [progress.completedStepIds, role]);

  const isAllComplete = progress.completedAt !== null;

  return {
    progress,
    markStepComplete,
    resetProgress,
    isStepComplete,
    completionPercent,
    isAllComplete,
  };
}
