// filepath: apps/superadmin/lib/utils/storage-state.ts
// Thin, SSR-safe wrappers for localStorage / sessionStorage with JSON serialisation.

function safeRead<T>(store: Storage | undefined, key: string, fallback: T): T {
  if (!store) return fallback;
  try {
    const raw = store.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(store: Storage | undefined, key: string, value: T): void {
  if (!store) return;
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded or private-mode — silently ignore
  }
}

const ls = (): Storage | undefined =>
  typeof window !== 'undefined' ? window.localStorage : undefined;

const ss = (): Storage | undefined =>
  typeof window !== 'undefined' ? window.sessionStorage : undefined;

export function readLocalStorage<T>(key: string, fallback: T): T {
  return safeRead(ls(), key, fallback);
}

export function writeLocalStorage<T>(key: string, value: T): void {
  safeWrite(ls(), key, value);
}

export function readSessionStorage<T>(key: string, fallback: T): T {
  return safeRead(ss(), key, fallback);
}

export function writeSessionStorage<T>(key: string, value: T): void {
  safeWrite(ss(), key, value);
}
