// filepath: apps/superadmin/lib/types/properties.ts
// created: 2026-02-14 | creator: Claude Opus 4.6
// Shared types and constants for properties (extracted from server actions to
// comply with Next.js "use server" export restrictions).

import type { TranscriptIntakeAreaDetailDraft } from '@/lib/transcript-parse/intake-types';

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
  const city = item.addressCity || '';
  const district = item.addressDistrict || '';
  const rest = [
    item.addressStreet,
    item.addressNumber,
    item.addressFloor,
    item.addressUnit,
  ].filter(Boolean).join('');

  const parts = [city, district, rest].filter(Boolean);
  
  if (parts.length > 0) {
    return parts.join('  ');
  }
  return item.address?.trim() || '—';
}

/** 獨立產權建築物：銷售方式（可複選，存於 details.independentTitleSaleModes） */
export type IndependentTitleSaleMode =
  | 'building_only'
  | 'parking_only'
  | 'together'
  | 'common_parking_only'
  | 'building_common_parking_together';

const INDEPENDENT_TITLE_SALE_MODE_SET = new Set<IndependentTitleSaleMode>([
  'building_only',
  'parking_only',
  'together',
  'common_parking_only',
  'building_common_parking_together',
]);

/**
 * 車位涉及的產權類型（可複選：同一物件可同時含獨立產權車位與公設／共有持分車位）。
 * 儲存於 details.parkingTitleRights；若缺省則由銷售方式推導（見 parseParkingTitleRights）。
 */
export type ParkingTitleRight = 'independent' | 'shared_facility';

function legacyParkingTitleRightsFromMode(
  mode: IndependentTitleSaleMode | null
): ParkingTitleRight[] {
  if (!mode) return [];
  switch (mode) {
    case 'building_only':
      return [];
    case 'parking_only':
    case 'together':
      return ['independent'];
    case 'common_parking_only':
    case 'building_common_parking_together':
      return ['shared_facility'];
    default:
      return [];
  }
}

function legacyParkingTitleRightsFromModes(modes: IndependentTitleSaleMode[]): ParkingTitleRight[] {
  const acc = new Set<ParkingTitleRight>();
  for (const m of modes) {
    for (const r of legacyParkingTitleRightsFromMode(m)) {
      acc.add(r);
    }
  }
  return [...acc];
}

/** 自 details 解析車位產權複選；無存檔時依銷售方式（可複選）推導舊資料 */
export function parseParkingTitleRights(
  details: Record<string, unknown>,
  saleModes: IndependentTitleSaleMode[]
): ParkingTitleRight[] {
  if (Object.prototype.hasOwnProperty.call(details, 'parkingTitleRights')) {
    const raw = details.parkingTitleRights;
    if (!Array.isArray(raw)) return [];
    const allowed = new Set<ParkingTitleRight>(['independent', 'shared_facility']);
    const next = raw.filter(
      (x): x is ParkingTitleRight => typeof x === 'string' && allowed.has(x as ParkingTitleRight)
    );
    return [...new Set(next)];
  }
  return legacyParkingTitleRightsFromModes(saleModes);
}

/** 自 details 解析銷售方式（支援 independentTitleSaleMode 與舊版兩個布林） */
export function parseIndependentTitleSaleMode(
  details: Record<string, unknown>
): IndependentTitleSaleMode | null {
  const raw = details.independentTitleSaleMode;
  if (
    raw === 'building_only' ||
    raw === 'parking_only' ||
    raw === 'together' ||
    raw === 'common_parking_only' ||
    raw === 'building_common_parking_together'
  ) {
    return raw;
  }
  const b = details.independentTitleSaleBuilding === true;
  const p = details.independentTitleSaleParking === true;
  if (b && !p) return 'building_only';
  if (!b && p) return 'parking_only';
  if (b && p) return 'together';
  return null;
}

/** 自 details 解析銷售方式複選；無 independentTitleSaleModes 時由單一欄位／舊布林推導 */
export function parseIndependentTitleSaleModes(
  details: Record<string, unknown>
): IndependentTitleSaleMode[] {
  const rawArr = details.independentTitleSaleModes;
  if (Array.isArray(rawArr)) {
    const next = rawArr.filter(
      (x): x is IndependentTitleSaleMode =>
        typeof x === 'string' && INDEPENDENT_TITLE_SALE_MODE_SET.has(x as IndependentTitleSaleMode)
    );
    return [...new Set(next)];
  }
  const one = parseIndependentTitleSaleMode(details);
  return one ? [one] : [];
}

export const INDEPENDENT_BUILDING_NUMBER_COUNT_MIN = 1;
export const INDEPENDENT_BUILDING_NUMBER_COUNT_MAX = 10;

/** 主建物建號筆數（1＝單一建號；2–10＝多建號），存於 details.independentBuildingNumberCount */
export function clampIndependentBuildingNumberCount(n: number): number {
  if (!Number.isFinite(n)) return INDEPENDENT_BUILDING_NUMBER_COUNT_MIN;
  return Math.min(
    INDEPENDENT_BUILDING_NUMBER_COUNT_MAX,
    Math.max(INDEPENDENT_BUILDING_NUMBER_COUNT_MIN, Math.round(n))
  );
}

export function parseIndependentBuildingNumberCount(details: Record<string, unknown>): number {
  const raw = details.independentBuildingNumberCount;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return clampIndependentBuildingNumberCount(raw);
  }
  if (typeof raw === 'string' && raw.trim() !== '') {
    const v = Number(raw);
    if (Number.isFinite(v)) return clampIndependentBuildingNumberCount(v);
  }
  return INDEPENDENT_BUILDING_NUMBER_COUNT_MIN;
}

/**
 * 標的建築物之地號筆數（單選），存於 details.subjectLandParcelScope。
 * not_applicable：地上權／違建等不適用以土地謄本標示；single：單一筆；multi：多筆（搭配 independentLandParcelNumberCount）。
 */
export type SubjectLandParcelScope = 'not_applicable' | 'single' | 'multi';

const SUBJECT_LAND_PARCEL_SCOPE_SET = new Set<SubjectLandParcelScope>([
  'not_applicable',
  'single',
  'multi',
]);

export function parseSubjectLandParcelScope(details: Record<string, unknown>): SubjectLandParcelScope {
  const raw = details.subjectLandParcelScope;
  if (typeof raw === 'string' && SUBJECT_LAND_PARCEL_SCOPE_SET.has(raw as SubjectLandParcelScope)) {
    return raw as SubjectLandParcelScope;
  }
  return 'single';
}

/** 多筆地號時之筆數（1–10），存於 details.independentLandParcelNumberCount */
export function parseIndependentLandParcelNumberCount(details: Record<string, unknown>): number {
  const raw = details.independentLandParcelNumberCount;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return clampIndependentBuildingNumberCount(raw);
  }
  if (typeof raw === 'string' && raw.trim() !== '') {
    const v = Number(raw);
    if (Number.isFinite(v)) return clampIndependentBuildingNumberCount(v);
  }
  return INDEPENDENT_BUILDING_NUMBER_COUNT_MIN;
}

export interface PropertyItem {
  id: string;
  type: 'sale' | 'rental';
  title: string;
  address: string;
  /** 物件說明（details.description） */
  description?: string | null;
  /** 結構化地址（來自 details），用於表單下拉選單 */
  addressCity?: string;
  addressDistrict?: string;
  addressStreet?: string;
  addressNumber?: string;
  /** 村里（例：龍門里），存於 details.addressVillage，供同里成交報表比對 */
  addressVillage?: string;
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
  updatedAt: string;
  /** 下架日期（可選，若 DB 有 delisted_at 再填入） */
  delistedAt?: string | null;
  /** 主照片 URL（用於列表縮圖，來自 details.imageUrl 或 property_photos 主圖） */
  mainPhotoUrl?: string | null;
  /** 建物全部謄本資料（儲存於 details.buildingTranscript） */
  buildingTranscript?: BuildingTranscriptData | null;
  /** 土地全部謄本資料（儲存於 details.landTranscript） */
  landTranscript?: LandTranscriptData | null;
  /**
   * 獨立產權建築物之銷售方式（可複選，儲存於 details.independentTitleSaleModes）
   */
  independentTitleSaleModes?: IndependentTitleSaleMode[] | null;
  /**
   * 相容舊程式：等同 independentTitleSaleModes?.[0] ?? null
   */
  independentTitleSaleMode?: IndependentTitleSaleMode | null;
  /**
   * 車位產權類型複選（獨立產權／公設產權），與銷售方式搭配使用；存於 details.parkingTitleRights
   */
  parkingTitleRights?: ParkingTitleRight[] | null;
  /**
   * 主建物建號筆數（1＝單一建號；2–10＝多建號），存於 details.independentBuildingNumberCount
   */
  independentBuildingNumberCount?: number | null;
  /**
   * 標的建築物之地號筆數（單選），存於 details.subjectLandParcelScope
   */
  subjectLandParcelScope?: SubjectLandParcelScope | null;
  /**
   * 多筆地號時之筆數（2–10），存於 details.independentLandParcelNumberCount
   */
  independentLandParcelNumberCount?: number | null;
  /** 是否含獨立產權車位（有自己的建物＋土地謄本，可分開銷售） */
  hasIndependentParking?: boolean | null;
  /** 獨立車位建物謄本（儲存於 details.parkingBuildingTranscript） */
  parkingBuildingTranscript?: BuildingTranscriptData | null;
  /** 獨立車位土地謄本（儲存於 details.parkingLandTranscript） */
  parkingLandTranscript?: LandTranscriptData | null;
  /** 物件緯度（WGS84，直接儲存於 property_sales/rentals.latitude） */
  latitude?: number | null;
  /** 物件經度（WGS84，直接儲存於 property_sales/rentals.longitude） */
  longitude?: number | null;
  /** 純土地物件（無建物謄本），地址以地號取代門牌 */
  isPureLand?: boolean;
  /** 土地地號，來自土地謄本 OCR（e.g. 大安區○○段 第0345地號） */
  landNumber?: string | null;
  /** User 確認前可修正的四區面積明細 draft，儲存於 details.transcriptIntakeAreaDetails */
  transcriptIntakeAreaDetails?: TranscriptIntakeAreaDetailDraft | null;
  // ── Content status indicators (fetched in getAllProperties) ────────
  /** Total number of photos uploaded to property_photos */
  photoCount?: number;
  /** Has at least one transcript document in property_documents */
  hasTranscript?: boolean;
  /** Has at least one title document (building/land) in property_documents */
  hasTitleDoc?: boolean;
  /** Has at least one floor plan document in property_documents */
  hasFloorPlan?: boolean;
  /** Has at least one blog_posts row linked to this property */
  hasBlog?: boolean;
  /** Has at least one contract document in property_documents */
  hasContract?: boolean;
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
  addressVillage?: string;
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
  latitude?: number | null;
  longitude?: number | null;
}

export interface CreatePropertyInput {
  /** System user who created the record; defaults to current session user if omitted */
  ownerId?: string;
  title: string;
  /** Omit on creation — address is sourced from transcript OCR */
  address?: string;
  addressCity?: string;
  addressDistrict?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressVillage?: string;
  addressFloor?: string;
  addressUnit?: string;
  status: string;
  price?: number;
  monthlyRent?: number;
  leaseTerm?: number;
  propertyType?: string;
  area?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  livingRooms?: number | null;
  parkingSpaces?: number | null;
  description?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface OwnerOption {
  id: string;
  displayName: string;
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
  sortOrder: number;
}

/** 物件文件（謄本、權狀等，用於編輯 modal 顯示/上傳） */
export interface PropertyDocumentItem {
  id: string;
  documentType: string;
  documentName: string;
  filePath: string;
  url: string;
  createdAt?: string;
  /** 多建號分筆：如 mbi:1、mbi:2 */
  tags?: string[] | null;
}

/** User-uploaded contract file (from lawyer / conveyancer), stored under property-documents bucket */
export interface PropertyContractFileItem {
  id: string;
  documentName: string;
  filePath: string;
  /** MIME type: application/pdf | application/vnd.openxmlformats-officedocument.wordprocessingml.document | etc. */
  mimeType: string;
  /** Signed-URL viewer endpoint */
  viewUrl: string;
  /** Formatted creation timestamp (zh-TW) */
  createdAt: string;
}

// ── Transcript / Register Data Types ─────────────────────────────────────

/** 謄本封面資訊（建物 / 土地通用） */
export interface TranscriptHeader {
  /** 謄本種類 e.g. 建物登記第二類謄本（建號全部） */
  transcriptType: string;
  /** 建號或地號全稱 e.g. 大安區仁愛段二小段 01659-000建號 */
  documentTitle: string;
  /** 列印時間 e.g. 民國100年02月18日15時53分 */
  printTime: string;
  /** 頁字 / 頁次 */
  pageInfo: string;
  /** 謄本列印人 e.g. 願景不動產仲介股份有限公司 */
  printer: string;
  /** 謄本檢查號 e.g. 100AF001281REG... */
  checkNumber: string;
  /** 謄本字第號 e.g. 大安電謄字第001281號 */
  documentNumber: string;
  /** 資料管轄機關 e.g. 臺北市大安地政事務所 */
  dataJurisdiction: string;
  /** 謄本核發機關 */
  issuingAuthority: string;
  /** 注意事項 */
  transcriptNotes: string;
}

export interface AnnexedBuilding {
  use: string;
  area: string;
}

export interface CommonAreaEntry {
  buildingNumber: string;
  area: string;
  ratio: string;
}

export interface MainBuildingEntry {
  totalFloors: string;
  totalArea: string;
  floorLevel: string;
  floorArea: string;
}

export interface BuildingDescription {
  buildingNumber: string;
  regDate: string;
  regReason: string;
  doorAddress: string;
  landParcelNumber: string;
  mainUse: string;
  mainMaterial: string;
  totalFloors: string;
  totalArea: string;
  floorLevel: string;
  floorArea: string;
  /** 可重複的主建物明細（樓中樓可有多筆） */
  mainBuildings: MainBuildingEntry[];
  completionDate: string;
  annexedBuildings: AnnexedBuilding[];
  commonAreas: CommonAreaEntry[];
  notes: string;
}

export interface LandDescription {
  landNumber: string;
  regDate: string;
  regReason: string;
  landCategory: string;
  grade: string;
  area: string;
  useZone: string;
  useCategory: string;
  announcedValueYear: string;
  announcedValuePerSqm: string;
  buildingsOnLand: string;
  notes: string;
}

export interface OwnershipRecord {
  id: string;
  seq: string;
  regDate: string;
  regReason: string;
  causeDate: string;
  ownerName: string;
  ownerAddress: string;
  ownershipRatio: string;
  titleNumber: string;
  relatedEncumbranceSeq: string;
  notes: string;
}

export interface LandOwnershipRecord extends OwnershipRecord {
  currentDeclaredLandValueYear: string;
  currentDeclaredLandValuePerSqm: string;
  prevTransferValueYear: string;
  prevTransferValuePerSqm: string;
  historicalRatios: string;
}

export interface EncumbranceRecord {
  id: string;
  seq: string;
  encumbranceType: string;
  /** 收件日期 e.g. 民國091年07月04日 */
  receiptDate: string;
  receiptNumber: string;
  regDate: string;
  regReason: string;
  creditorName: string;
  creditorAddress: string;
  debtRatio: string;
  totalDebt: string;
  duration: string;
  repaymentDate: string;
  interest: string;
  lateInterest: string;
  penalty: string;
  debtorAndRatio: string;
  rightsSubject: string;
  targetSeq: string;
  settleRightsRatio: string;
  certNumber: string;
  settlor: string;
  jointGuaranteeLandNumbers: string;
  jointGuaranteeBuildingNumbers: string;
  notes: string;
  debtScope?: string;
  debtConfirmDate?: string;
  otherGuaranteeScope?: string;
}

export interface BuildingTranscriptData {
  header: TranscriptHeader;
  description: BuildingDescription;
  ownership: OwnershipRecord[];
  encumbrances: EncumbranceRecord[];
}

export interface LandTranscriptData {
  header: TranscriptHeader;
  description: LandDescription;
  ownership: LandOwnershipRecord[];
  encumbrances: EncumbranceRecord[];
}
