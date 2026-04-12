'use client';

import { useState, useEffect, useCallback } from 'react';
import type { TutorialRole } from '@/lib/tutorial-data';
import { getTotalSteps } from '@/lib/tutorial-data';

const STORAGE_KEY_PREFIX = 'ownerai_tutorial_progress';

export interface TutorialProgress {
  completedStepIds: string[];
  lastStepId: string | null;
  completedAt: string | null;
}

function storageKey(role: TutorialRole): string {
  return `${STORAGE_KEY_PREFIX}_${role}`;
}

function loadProgress(role: TutorialRole): TutorialProgress {
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

function saveProgress(role: TutorialRole, progress: TutorialProgress): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(role), JSON.stringify(progress));
  } catch {
    // Storage may be unavailable (private browsing, quota exceeded) — fail silently
  }
}

export function useTutorialProgress(role: TutorialRole) {
  const [progress, setProgress] = useState<TutorialProgress>(() => loadProgress(role));

  // Re-sync when role changes
  useEffect(() => {
    setProgress(loadProgress(role));
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
        saveProgress(role, updated);
        return updated;
      });
    },
    [role],
  );

  const resetProgress = useCallback(() => {
    const empty: TutorialProgress = { completedStepIds: [], lastStepId: null, completedAt: null };
    saveProgress(role, empty);
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
