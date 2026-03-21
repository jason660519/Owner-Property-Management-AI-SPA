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

  // ── Phase 3: 格局圖 + 位置圖 ──
  floorPlanPhotoUrl?: string;
}

// ── Helpers ──

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
