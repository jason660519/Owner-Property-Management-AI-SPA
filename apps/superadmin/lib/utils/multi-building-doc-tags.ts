// filepath: apps/superadmin/lib/utils/multi-building-doc-tags.ts
// 多建號分筆：property_documents.tags 使用 "mbi:1" … "mbi:N" 對應第幾筆建號

import type { PropertyDocumentItem } from '@/lib/types/properties';

export const MULTI_BUILDING_INDEX_TAG_PREFIX = 'mbi:' as const;

export function multiBuildingIndexTag(slotIndex: number): string {
  return `${MULTI_BUILDING_INDEX_TAG_PREFIX}${slotIndex}`;
}

export function hasAnyMultiBuildingIndexTag(docs: PropertyDocumentItem[]): boolean {
  return docs.some((d) => d.tags?.some((t) => t.startsWith(MULTI_BUILDING_INDEX_TAG_PREFIX)));
}

/**
 * 第 slotIndex 筆（1-based）可見的文件。
 * 若尚無任何 mbi 標籤（舊資料），全部歸於第 1 筆。
 */
export function filterDocumentsForMultiBuildingSlot(
  docs: PropertyDocumentItem[],
  slotIndex: number,
): PropertyDocumentItem[] {
  const anyTagged = hasAnyMultiBuildingIndexTag(docs);
  if (!anyTagged) {
    return slotIndex === 1 ? docs : [];
  }
  const tag = multiBuildingIndexTag(slotIndex);
  return docs.filter((d) => d.tags?.includes(tag));
}
