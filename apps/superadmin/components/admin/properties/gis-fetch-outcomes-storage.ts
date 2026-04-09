/**
 * Last completed outcome per layer (success / error + duration) for GIS map fetch.
 * Persisted in sessionStorage so it survives route changes within the same tab.
 */
import type { MapLayerPreset } from '@/lib/utils/cadastral-map-fetcher';

const PRESETS: MapLayerPreset[] = ['cadastral', 'building', 'both'];

export function gisOutcomesStorageKey(propertyId: string): string {
  return `gis-fetch-outcomes:${propertyId}`;
}

export type GisLayerOutcome =
  | { kind: 'success'; seconds: number; at: number }
  | { kind: 'error'; seconds: number; message: string; at: number };

export type GisOutcomesMap = Partial<Record<MapLayerPreset, GisLayerOutcome>>;

export function readOutcomesMap(propertyId: string): GisOutcomesMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(gisOutcomesStorageKey(propertyId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return {};
    const out: GisOutcomesMap = {};
    for (const k of PRESETS) {
      const v = (parsed as Record<string, unknown>)[k];
      if (!v || typeof v !== 'object') continue;
      const o = v as Record<string, unknown>;
      if (o.kind === 'success' && typeof o.seconds === 'number' && typeof o.at === 'number') {
        out[k] = { kind: 'success', seconds: o.seconds, at: o.at };
      } else if (
        o.kind === 'error' &&
        typeof o.seconds === 'number' &&
        typeof o.message === 'string' &&
        typeof o.at === 'number'
      ) {
        out[k] = { kind: 'error', seconds: o.seconds, message: o.message, at: o.at };
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function writeOutcome(propertyId: string, layer: MapLayerPreset, outcome: GisLayerOutcome): void {
  if (typeof window === 'undefined') return;
  const cur = readOutcomesMap(propertyId);
  cur[layer] = outcome;
  sessionStorage.setItem(gisOutcomesStorageKey(propertyId), JSON.stringify(cur));
}

/** Clear last outcome for one layer (e.g. when user starts a new fetch for that preset). */
export function clearOutcomeForLayer(propertyId: string, layer: MapLayerPreset): void {
  if (typeof window === 'undefined') return;
  const cur = readOutcomesMap(propertyId);
  delete cur[layer];
  const keys = Object.keys(cur);
  if (keys.length === 0) {
    sessionStorage.removeItem(gisOutcomesStorageKey(propertyId));
  } else {
    sessionStorage.setItem(gisOutcomesStorageKey(propertyId), JSON.stringify(cur));
  }
}

export function clearOutcomesMap(propertyId: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(gisOutcomesStorageKey(propertyId));
}

export const GIS_OUTCOME_PRESET_ORDER: MapLayerPreset[] = ['cadastral', 'building', 'both'];
