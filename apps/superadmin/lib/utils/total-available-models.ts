/**
 * 依「目前仍存在的 key」計算可選模型總數，刪除金鑰後數字會同步減少。
 * 僅統計 validationResultsByKeyId 中 keyId 屬於 currentKeys 的結果，依 provider 取最大再加總。
 */

import type { KeyValidationResult } from '@/lib/hooks/useAISettings';

export interface KeyWithId {
  id: string;
  provider: string;
}

export interface SavedModelLike {
  provider: string;
  model_id: string;
}

/**
 * @param validationResultsByKeyId 各 key 的驗證結果（含 availableModels）
 * @param currentKeys 目前存在的金鑰（刪除後會變少）
 * @returns 可選模型總數；只計入 currentKeys 中 key 的結果，無結果時為 0
 */
export function getTotalAvailableModels(
  validationResultsByKeyId: Record<string, KeyValidationResult>,
  currentKeys: KeyWithId[]
): number {
  const keyIds = new Set(currentKeys.map((k) => k.id));
  const byProvider = new Map<string, number>();
  for (const [keyId, r] of Object.entries(validationResultsByKeyId)) {
    if (!keyIds.has(keyId) || !r?.availableModels?.length) continue;
    const provider = currentKeys.find((k) => k.id === keyId)?.provider;
    if (!provider) continue;
    const count = r.availableModels.length;
    const existing = byProvider.get(provider);
    if (existing === undefined || existing < count) byProvider.set(provider, count);
  }
  return Array.from(byProvider.values()).reduce((a, b) => a + b, 0);
}

/**
 * 從驗證結果組出「可選模型」清單（與頁首 可選 數量同一資料源）。
 * 每個 provider 取所有 key 的 availableModels 聯集，回傳 (provider, modelId) 陣列。
 */
export function getAvailableModelsList(
  validationResultsByKeyId: Record<string, KeyValidationResult>,
  currentKeys: KeyWithId[]
): { providerId: string; modelId: string }[] {
  const keyIds = new Set(currentKeys.map((k) => k.id));
  const availableByProvider = new Map<string, Set<string>>();
  for (const [keyId, r] of Object.entries(validationResultsByKeyId)) {
    if (!keyIds.has(keyId) || !r?.availableModels?.length) continue;
    const provider = currentKeys.find((k) => k.id === keyId)?.provider;
    if (!provider) continue;
    const set = availableByProvider.get(provider) ?? new Set<string>();
    for (const id of r.availableModels) set.add(id);
    availableByProvider.set(provider, set);
  }
  const out: { providerId: string; modelId: string }[] = [];
  for (const [providerId, modelIds] of availableByProvider) {
    for (const modelId of modelIds) {
      out.push({ providerId, modelId });
    }
  }
  return out;
}

/**
 * 已選且仍在可選名單內的數量（已選 ⊆ 可選，故不會出現 已選 > 可選）。
 * 若無驗證結果則回傳 null，由呼叫端決定 fallback。
 */
export function getSelectedCountInAvailable(
  savedModels: SavedModelLike[],
  validationResultsByKeyId: Record<string, KeyValidationResult>,
  currentKeys: KeyWithId[]
): number | null {
  const keyIds = new Set(currentKeys.map((k) => k.id));
  const availableByProvider = new Map<string, Set<string>>();
  for (const [keyId, r] of Object.entries(validationResultsByKeyId)) {
    if (!keyIds.has(keyId) || !r?.availableModels?.length) continue;
    const provider = currentKeys.find((k) => k.id === keyId)?.provider;
    if (!provider) continue;
    const set = availableByProvider.get(provider) ?? new Set<string>();
    for (const id of r.availableModels) set.add(id);
    availableByProvider.set(provider, set);
  }
  if (availableByProvider.size === 0) return null;
  const currentProviderIds = new Set(currentKeys.map((k) => k.provider));
  let count = 0;
  for (const m of savedModels) {
    if (!currentProviderIds.has(m.provider)) continue;
    const available = availableByProvider.get(m.provider);
    if (available?.has(m.model_id)) count++;
  }
  return count;
}
