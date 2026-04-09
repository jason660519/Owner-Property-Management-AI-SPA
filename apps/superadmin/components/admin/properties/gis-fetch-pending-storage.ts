/**
 * Persist in-flight GIS map fetches in sessionStorage so loading state survives
 * route changes (tab unmount). Server Actions continue on the server; this only
 * restores UI feedback when the user returns.
 */
import type { MapLayerPreset } from '@/lib/utils/cadastral-map-fetcher';

const PRESETS: MapLayerPreset[] = ['cadastral', 'building', 'both'];

export function gisPendingStorageKey(propertyId: string): string {
  return `gis-fetch-pending:${propertyId}`;
}

export type GisPendingMap = Partial<Record<MapLayerPreset, number>>;

export function readPendingMap(propertyId: string): GisPendingMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(gisPendingStorageKey(propertyId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return {};
    const out: GisPendingMap = {};
    for (const k of PRESETS) {
      const v = (parsed as Record<string, unknown>)[k];
      if (typeof v === 'number' && Number.isFinite(v)) {
        out[k] = v;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function writePendingLayer(propertyId: string, layer: MapLayerPreset, startedAt: number): void {
  if (typeof window === 'undefined') return;
  const cur = readPendingMap(propertyId);
  cur[layer] = startedAt;
  sessionStorage.setItem(gisPendingStorageKey(propertyId), JSON.stringify(cur));
}

export function clearPendingLayer(propertyId: string, layer: MapLayerPreset): void {
  if (typeof window === 'undefined') return;
  const cur = readPendingMap(propertyId);
  delete cur[layer];
  const keys = Object.keys(cur);
  if (keys.length === 0) {
    sessionStorage.removeItem(gisPendingStorageKey(propertyId));
  } else {
    sessionStorage.setItem(gisPendingStorageKey(propertyId), JSON.stringify(cur));
  }
}

export function pendingLayersList(propertyId: string): MapLayerPreset[] {
  const m = readPendingMap(propertyId);
  return PRESETS.filter((k) => m[k] != null);
}

export function maxElapsedSeconds(propertyId: string): number {
  const m = readPendingMap(propertyId);
  const now = Date.now();
  let max = 0;
  for (const k of PRESETS) {
    const t = m[k];
    if (typeof t === 'number') {
      max = Math.max(max, Math.floor((now - t) / 1000));
    }
  }
  return max;
}

/** Elapsed seconds for one in-flight layer (from pending map start timestamp). */
export function elapsedSecondsForLayer(propertyId: string, layer: MapLayerPreset): number {
  const m = readPendingMap(propertyId);
  const t = m[layer];
  if (typeof t !== 'number') return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 1000));
}
