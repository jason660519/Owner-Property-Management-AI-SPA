// filepath: apps/superadmin/lib/hooks/useTablePreferences.ts
// Hook: localStorage (instant) + DB (persistent) dual-write for table settings.
// Read: localStorage first for instant restore, then DB fetch to reconcile.
// Write: localStorage immediately, DB debounced.

import { useState, useEffect, useRef, useCallback } from 'react';
import { getTableSettings, setTableSettings } from '@/lib/actions/table-settings';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readLocal<T>(storageKey: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeLocal<T>(storageKey: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch { /* quota */ }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseTablePreferencesOptions<T extends Record<string, unknown>> {
  /** Unique key for user_page_settings.page_key */
  pageKey: string;
  /** localStorage key (keeps backward compat with existing keys) */
  storageKey: string;
  /** Default settings when nothing is stored */
  defaults: T;
  /** Debounce ms before flushing to DB (default 1500) */
  debounceMs?: number;
}

interface UseTablePreferencesReturn<T extends Record<string, unknown>> {
  /** Current merged settings */
  settings: T;
  /** Patch one or more keys — triggers localStorage write + debounced DB write */
  patch: (partial: Partial<T>) => void;
  /** Whether DB fetch has completed at least once */
  dbReady: boolean;
}

export function useTablePreferences<T extends Record<string, unknown>>(
  opts: UseTablePreferencesOptions<T>
): UseTablePreferencesReturn<T> {
  const { pageKey, storageKey, defaults, debounceMs = 1500 } = opts;

  // 1. Initialize from localStorage (instant)
  const [settings, setSettings] = useState<T>(() => {
    const local = readLocal<T>(storageKey);
    return local ? { ...defaults, ...local } : defaults;
  });

  const [dbReady, setDbReady] = useState(false);

  // Ref to latest settings for the debounce closure
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // 2. On mount, fetch from DB and reconcile (DB wins if localStorage is empty)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await getTableSettings<T>(pageKey);
      if (cancelled) return;
      if (data) {
        const local = readLocal<T>(storageKey);
        // If no localStorage yet, adopt DB; otherwise keep localStorage (fresher)
        if (!local) {
          const merged = { ...defaults, ...data };
          setSettings(merged);
          writeLocal(storageKey, merged);
        }
      }
      setDbReady(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);

  // Cleanup on unmount: flush pending writes
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        // Fire final DB write synchronously-ish via the server action
        setTableSettings(pageKey, settingsRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);

  // 3. Patch: localStorage immediate, DB debounced
  const patch = useCallback(
    (partial: Partial<T>) => {
      setSettings((prev) => {
        const next = { ...prev, ...partial };
        writeLocal(storageKey, next);
        // Schedule DB write
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          setTableSettings(pageKey, next);
        }, debounceMs);
        return next;
      });
    },
    [storageKey, pageKey, debounceMs]
  );

  return { settings, patch, dbReady };
}
