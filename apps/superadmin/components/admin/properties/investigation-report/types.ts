// filepath: apps/superadmin/components/admin/properties/investigation-report/types.ts
// 物件調查報告書 — 完整資料型別定義 (mapping from Excel 秘書-input sheet)

import { STANDARD_CLAUSES } from './constants';

export type TransactionType = 'sale' | 'rental';

/** 土地筆資料（最多 3 筆） */
export interface LandParcel {
  lotNumber: string;
  baseArea: number;
  ownershipDenom: number;
  ownershipNumer: number;
  zoningType: string;
  buildingCoverage: string;
  floorAreaRatio: string;
}

/** 建物各項面積（平方公尺） */
export interface BuildingAreas {
  buildingNumber: string;
  mainBuilding: number;
  balcony: number;
  rainCover: number;
  commonArea: number;
  basementCommon: number;
  other1: number;
  other2: number;
}

/** 車位資訊 */
export interface ParkingInfo {
  hasParking: boolean;
  parkingPrice: string;
  canRent: string;
  rentPrice: string;
  spotNumber: string;
  managementFee: string;
  usageType: string;
  parkingMethod: string;
  hasIndependentRegistration: string;
}

/** 付款比例 */
export interface PaymentSchedule {
  firstRatio: number;
  secondRatio: number;
  thirdRatio: number;
  fourthRatio: number;
}

/** 完整物件調查報告 */
export interface InvestigationReport {
  // ── Meta ──
  caseName: string;
  transactionType: TransactionType;
  createdBy: string;
  createdDate: string;
  reviewer: string;

  // ── 基本資料 ──
  region: string;
  addressStreet: string;
  addressNumber: string;
  agency: string;
  agentName: string;
  mainPurpose: string;
  currentCondition: string;
  buildingName: string;
  totalPrice: number;
  completionDate: string;
  buildingAge: number;
  mainMaterial: string;
  floorInfo: string;
  floorShort: string;
  layout: string;
  orientation: string;
  unitsPerFloor: number;
  isCornerUnit: string;
  hasCourt: string;
  elevatorCount: number;
  hasManagementFee: boolean;
  managementFeeAmount: number;
  security: string;
  schoolDistrict: string;
  viewingMethod: string;
  gasType: string;
  additions: string;
  transportation: string;
  airConditioning: string;
  propertyNumber: string;

  // ── 土地 ──
  landParcels: [LandParcel, LandParcel, LandParcel];

  // ── 建物面積 ──
  buildingAreas: BuildingAreas;

  // ── 他項限制 ──
  restrictionRegistration: string;

  // ── 車位 ──
  parking: ParkingInfo;

  // ── 特色 ──
  features: [string, string, string, string];

  // ── 交易條件 ──
  paymentSchedule: PaymentSchedule;
  sellerEquipment: string;
  deliveryCondition: string;

  // ── 注意事項 ──
  selectedNotes: string[];
  customNote: string;

  /** @deprecated Use attachmentSelections instead. Kept for backward compatibility. */
  reportAttachments: ReportAttachmentSelection[];
  /** 附加說明（純文字，列印於報告末頁） */
  reportAttachmentSupplement: string;

  /** V2 attachment selections: all attachment categories for combined print */
  attachmentSelections?: AttachmentSelection[];

  /** 屋況說明書（各項現況揭露） */
  conditionStatement: PropertyConditionStatement;

  // ── Phase 3: 格局圖 + 位置圖 ──
  floorPlanPhotoUrl?: string;
}

/** Attachment category types for the investigation report print system */
export type AttachmentCategory =
  | 'report'
  | 'document'
  | 'photo_sheet'
  | 'basic_info'
  | 'property_intro'
  | 'transaction_conditions'
  | 'area_detail'
  | 'zoning_usage'
  | 'map_location';

/** Unified attachment selection (v2: supports all categories) */
export interface AttachmentSelection {
  category: AttachmentCategory;
  /** Unique key within category (document ID, or category slug for data-driven) */
  id: string;
  label: string;
  url?: string;
  enabled: boolean;
}

/** @deprecated Use AttachmentSelection instead. Kept for backward compatibility with saved JSON. */
export interface ReportAttachmentSelection {
  kind: 'document' | 'photo';
  id: string;
  label: string;
  /** 照片為公開 URL；文件為後台檢視路徑（列印時僅顯示名稱） */
  url: string;
}

/** Migrate old ReportAttachmentSelection[] to AttachmentSelection[] */
export function migrateAttachments(
  old: ReportAttachmentSelection[],
): AttachmentSelection[] {
  return old.map((a) => ({
    category: a.kind === 'photo' ? 'photo_sheet' as const : 'document' as const,
    id: a.id,
    label: a.label,
    url: a.url,
    enabled: true,
  }));
}

/** 屋況說明書（物件現況揭露，供報告列印與存檔） */
export interface PropertyConditionStatement {
  /** 建物主體、室內外裝修、牆地天花板等現況 */
  structureInterior: string;
  /** 漏水、滲水、壁癌等 */
  waterLeakage: string;
  /** 白蟻、蟲鼠、其他公害 */
  pests: string;
  /** 增建、違建或未登記部分 */
  unregisteredParts: string;
  /** 鄰地、鄰房、特殊使用關係 */
  neighborsSpecial: string;
  /** 固定設備、機械停車、共用部分等 */
  equipmentFacilities: string;
  /** 其他約定或重要說明 */
  otherRemarks: string;
  /** 政府版標的物現況說明書地址文字 */
  govAddress: string;
  /** 賣方簽章 */
  govSigner: string;
  /** 買方簽章 */
  govBuyerSigner?: string;
  /** 買方簽章日期（YYYY-MM-DD） */
  govBuyerSignedDate?: string;
  /** 簽立日期（YYYY-MM-DD） */
  govSignedDate: string;
  /** 政府版 47 題清單 */
  govItems: GovConditionItem[];
}

export interface GovConditionItem {
  itemNo: number;
  answer: '' | 'yes' | 'no';
  note: string;
  /** Indices of checked □ in the noteHint template */
  checkedBoxes?: number[];
}

// ── Helpers ──

export const EMPTY_CONDITION_STATEMENT: PropertyConditionStatement = {
  structureInterior: '',
  waterLeakage: '',
  pests: '',
  unregisteredParts: '',
  neighborsSpecial: '',
  equipmentFacilities: '',
  otherRemarks: '',
  govAddress: '',
  govSigner: '',
  govSignedDate: '',
  govItems: Array.from({ length: 47 }, (_, i) => ({
    itemNo: i + 1,
    answer: '',
    note: '',
    checkedBoxes: [],
  })),
};

export function normalizeConditionStatement(
  raw: PropertyConditionStatement | null | undefined,
): PropertyConditionStatement {
  if (!raw || typeof raw !== 'object') {
    return { ...EMPTY_CONDITION_STATEMENT };
  }
  return {
    ...EMPTY_CONDITION_STATEMENT,
    ...raw,
    govItems:
      Array.isArray(raw.govItems) && raw.govItems.length > 0
        ? EMPTY_CONDITION_STATEMENT.govItems.map((defaultItem) => {
            const hit = raw.govItems.find((it) => it?.itemNo === defaultItem.itemNo);
            return {
              itemNo: defaultItem.itemNo,
              answer: hit?.answer === 'yes' || hit?.answer === 'no' ? hit.answer : '',
              note: typeof hit?.note === 'string' ? hit.note : '',
              checkedBoxes: Array.isArray(hit?.checkedBoxes) ? hit.checkedBoxes : [],
            };
          })
        : [...EMPTY_CONDITION_STATEMENT.govItems],
  };
}

export function hasConditionStatementContent(cs: PropertyConditionStatement): boolean {
  const hasLegacyText = [
    cs.structureInterior,
    cs.waterLeakage,
    cs.pests,
    cs.unregisteredParts,
    cs.neighborsSpecial,
    cs.equipmentFacilities,
    cs.otherRemarks,
    cs.govAddress,
    cs.govSigner,
    cs.govSignedDate,
  ].some((v) => typeof v === 'string' && v.trim().length > 0);
  const hasGovRows = cs.govItems.some((row) => row.answer !== '' || row.note.trim() !== '');
  return hasLegacyText || hasGovRows;
}

export const EMPTY_LAND_PARCEL: LandParcel = {
  lotNumber: '',
  baseArea: 0,
  ownershipDenom: 0,
  ownershipNumer: 0,
  zoningType: '',
  buildingCoverage: '',
  floorAreaRatio: '',
};

export const EMPTY_BUILDING_AREAS: BuildingAreas = {
  buildingNumber: '',
  mainBuilding: 0,
  balcony: 0,
  rainCover: 0,
  commonArea: 0,
  basementCommon: 0,
  other1: 0,
  other2: 0,
};

export const EMPTY_PARKING: ParkingInfo = {
  hasParking: false,
  parkingPrice: '',
  canRent: '',
  rentPrice: '',
  spotNumber: '',
  managementFee: '',
  usageType: '',
  parkingMethod: '',
  hasIndependentRegistration: '',
};

export const EMPTY_PAYMENT: PaymentSchedule = {
  firstRatio: 0.2,
  secondRatio: 0.1,
  thirdRatio: 0.2,
  fourthRatio: 0.5,
};

export function createEmptyReport(): InvestigationReport {
  return {
    caseName: '',
    transactionType: 'sale',
    createdBy: '',
    createdDate: new Date().toISOString().split('T')[0],
    reviewer: '',
    region: '',
    addressStreet: '',
    addressNumber: '',
    agency: '',
    agentName: '',
    mainPurpose: '',
    currentCondition: '',
    buildingName: '',
    totalPrice: 0,
    completionDate: '',
    buildingAge: 0,
    mainMaterial: '',
    floorInfo: '',
    floorShort: '',
    layout: '',
    orientation: '',
    unitsPerFloor: 0,
    isCornerUnit: '否',
    hasCourt: '無',
    elevatorCount: 0,
    hasManagementFee: false,
    managementFeeAmount: 0,
    security: '',
    schoolDistrict: '',
    viewingMethod: '',
    gasType: '',
    additions: '',
    transportation: '',
    airConditioning: '',
    propertyNumber: '',
    landParcels: [
      { ...EMPTY_LAND_PARCEL },
      { ...EMPTY_LAND_PARCEL },
      { ...EMPTY_LAND_PARCEL },
    ],
    buildingAreas: { ...EMPTY_BUILDING_AREAS },
    restrictionRegistration: '無',
    parking: { ...EMPTY_PARKING },
    features: ['', '', '', ''],
    paymentSchedule: { ...EMPTY_PAYMENT },
    sellerEquipment: '',
    deliveryCondition: '',
    selectedNotes: STANDARD_CLAUSES.map((clause) => clause.id),
    customNote: '',
    reportAttachments: [],
    reportAttachmentSupplement: '',
    conditionStatement: { ...EMPTY_CONDITION_STATEMENT },
  };
}

/** 平方公尺 → 坪 */
export function sqmToPing(sqm: number): number {
  return Math.round(sqm * 0.3025 * 100) / 100;
}

/** 計算土地持分面積 */
export function calcShareArea(parcel: LandParcel): number {
  if (!parcel.ownershipDenom || !parcel.ownershipNumer) return 0;
  return (parcel.baseArea * parcel.ownershipNumer) / parcel.ownershipDenom;
}

/** 建物面積合計 */
export function calcBuildingTotal(b: BuildingAreas): number {
  return b.mainBuilding + b.balcony + b.rainCover + b.commonArea + b.basementCommon + b.other1 + b.other2;
}
