// filepath: apps/superadmin/lib/utils/real-price-comparable-source.ts
// 載入正規化後的實價成交列（供報表篩選）。資料來源：環境變數 LVR_COMPARABLES_JSON_PATH 指向 JSON 陣列檔。

import { existsSync, readFileSync } from 'fs';
import type { NormalizedComparableSale } from '@/lib/utils/real-price-comparables';

function numOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function strOrEmpty(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function strOrNull(v: unknown): string | null {
  const s = strOrEmpty(v);
  return s.length > 0 ? s : null;
}

/** 自單筆 JSON 物件解析；欄位不符則略過該筆 */
export function parseComparableSaleRow(raw: unknown): NormalizedComparableSale | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const transactionDate = strOrEmpty(o.transactionDate);
  const totalPriceTwd = numOrNull(o.totalPriceTwd);
  const city = strOrEmpty(o.city);
  const district = strOrEmpty(o.district);
  const addressSnippet = strOrEmpty(o.addressSnippet);
  if (!transactionDate || totalPriceTwd == null || !city || !district || !addressSnippet) {
    return null;
  }

  let landSectionTokens: string[] = [];
  if (Array.isArray(o.landSectionTokens)) {
    landSectionTokens = o.landSectionTokens.filter((x): x is string => typeof x === 'string');
  }

  return {
    transactionDate,
    totalPriceTwd,
    buildingAreaSqm: numOrNull(o.buildingAreaSqm),
    unitPricePerSqm: numOrNull(o.unitPricePerSqm),
    buildingType: strOrNull(o.buildingType),
    floor: strOrNull(o.floor),
    addressSnippet,
    latitude: numOrNull(o.latitude),
    longitude: numOrNull(o.longitude),
    city,
    district,
    village: strOrNull(o.village),
    landSectionTokens,
  };
}

export function loadComparableSalesFromJsonFile(absPath: string): NormalizedComparableSale[] {
  if (!absPath || !existsSync(absPath)) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(absPath, 'utf8')) as unknown;
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: NormalizedComparableSale[] = [];
  for (const item of parsed) {
    const row = parseComparableSaleRow(item);
    if (row) out.push(row);
  }
  return out;
}

/** 優先讀取 LVR_COMPARABLES_JSON_PATH；未設定或讀取失敗則回傳空陣列 */
export function loadComparableSalesFromEnv(): NormalizedComparableSale[] {
  const p = process.env.LVR_COMPARABLES_JSON_PATH?.trim();
  if (!p) return [];
  return loadComparableSalesFromJsonFile(p);
}
