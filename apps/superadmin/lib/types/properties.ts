// filepath: apps/superadmin/lib/types/properties.ts
// created: 2026-02-14 | creator: Claude Opus 4.6
// Shared types and constants for properties (extracted from server actions to
// comply with Next.js "use server" export restrictions).

/** 結構化地址零件（台灣：縣市 → 區 → 路/段/街 → 門牌、樓層、單位） */
export interface StructuredAddress {
  city?: string;
  district?: string;
  street?: string;
  /** 門牌號碼，如 295號 */
  number?: string;
  /** 樓層，如 3F */
  floor?: string;
  /** 單位，如 之2 */
  unit?: string;
}

/** 以「縣市／區／路／門牌／樓層／單位」格式顯示；無結構化欄位時回傳原始 address */
export function formatStructuredAddress(item: {
  address?: string;
  addressCity?: string;
  addressDistrict?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressFloor?: string;
  addressUnit?: string;
}): string {
  const parts = [
    item.addressCity,
    item.addressDistrict,
    item.addressStreet,
    item.addressNumber,
    item.addressFloor,
    item.addressUnit,
  ].filter(Boolean) as string[];
  if (parts.length > 0) return parts.join('／');
  return item.address?.trim() || '—';
}

export interface PropertyItem {
  id: string;
  type: 'sale' | 'rental';
  title: string;
  address: string;
  /** 結構化地址（來自 details），用於表單下拉選單 */
  addressCity?: string;
  addressDistrict?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressFloor?: string;
  addressUnit?: string;
  status: string;
  price: number | null;
  monthlyRent: number | null;
  /** 創建人顯示名稱（若後端有 created_by 可填入） */
  creatorName?: string | null;
  ownerName: string | null;
  ownerId: string;
  area: number | null;
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  livingRooms: number | null;
  parkingSpaces: number | null;
  createdAt: string;
  /** 下架日期（可選，若 DB 有 delisted_at 再填入） */
  delistedAt?: string | null;
  /** 主照片 URL（用於列表縮圖，來自 details.imageUrl 或 property_photos 主圖） */
  mainPhotoUrl?: string | null;
}

export interface PropertiesResult {
  properties: PropertyItem[];
  totalSales: number;
  totalRentals: number;
}

export interface UpdatePropertyInput {
  address?: string;
  /** 結構化地址零件（儲存於 details，並可組成 address） */
  addressCity?: string;
  addressDistrict?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressFloor?: string;
  addressUnit?: string;
  status?: string;
  price?: number;
  monthlyRent?: number;
  leaseTerm?: number;
  // details JSONB fields
  title?: string;
  propertyType?: string;
  area?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  livingRooms?: number | null;
  parkingSpaces?: number | null;
  description?: string;
}

export interface ActionResult {
  success: boolean;
  message: string;
}

// ── Valid property building types (物件類型) ──────────────────────
export const PROPERTY_TYPES = [
  '公寓',
  '大樓',
  '華廈',
  '套房',
  '別墅/透天',
  '辦公',
  '倉庫',
  '店面',
  '廠房',
  '土地',
  '單售車位',
  '其他',
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

// ── Valid statuses (unified for all property types) ──────────────
export const PROPERTY_STATUSES = [
  'for_sale',
  'for_rent',
  'collecting_rent',
  'sold',
  'rented',
  'pending',
  'expired',
  'invalid',
] as const;

export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

/** @deprecated Use PROPERTY_STATUSES instead */
export const SALE_STATUSES = PROPERTY_STATUSES;
/** @deprecated Use PROPERTY_STATUSES instead */
export const RENTAL_STATUSES = PROPERTY_STATUSES;
/** @deprecated Use PropertyStatus instead */
export type SaleStatus = PropertyStatus;
/** @deprecated Use PropertyStatus instead */
export type RentalStatus = PropertyStatus;

/** 物件照片（用於編輯 modal 顯示/上傳） */
export interface PropertyPhotoItem {
  id: string;
  storagePath: string;
  url: string;
  isPrimary: boolean;
  photoType: string;
}

/** 物件文件（謄本、權狀等，用於編輯 modal 顯示/上傳） */
export interface PropertyDocumentItem {
  id: string;
  documentType: string;
  documentName: string;
  filePath: string;
  url: string;
}
