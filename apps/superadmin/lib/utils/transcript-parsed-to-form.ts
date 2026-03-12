// filepath: apps/superadmin/lib/utils/transcript-parsed-to-form.ts
// Maps AI-parsed 謄本 JSON (LandRegistryParsedResult) to building form state.

import type { LandRegistryParsedResult } from '@/lib/types/transcript';
import type {
  TranscriptHeader,
  BuildingDescription,
  OwnershipRecord,
  EncumbranceRecord,
  AnnexedBuilding,
  CommonAreaEntry,
} from '@/lib/types/properties';

function str(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  return String(v).trim();
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function asRecordArray(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v)) return [];
  return v.filter((item): item is Record<string, unknown> =>
    !!item && typeof item === 'object' && !Array.isArray(item)
  );
}

function newId(): string {
  return typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

export function normalizeLocalParsedToCloudSchema(parsed: unknown): LandRegistryParsedResult {
  const source = asRecord(parsed);
  if (!source) return {};
  if (
    asRecord(source.謄本資訊) ||
    asRecord(source.建物標示部) ||
    asRecord(source.建物所有權部) ||
    asRecord(source.他項權利部)
  ) {
    return source as LandRegistryParsedResult;
  }

  const meta = asRecord(source.meta) ?? {};
  const desc = asRecord(source.building_description) ?? {};
  const ownershipRecords = asRecordArray(source.ownership_records);
  const otherRightRecords = asRecordArray(source.other_right_records);
  const floorLevels = asRecordArray(desc.floor_levels);
  const attachedStructures = asRecordArray(desc.attached_structures);
  const commonAreas = asRecordArray(desc.common_areas);

  const firstFloor = floorLevels[0] ?? {};

  return {
    謄本資訊: {
      謄本種類: str(meta.transcript_name),
      建物建號: str(meta.building_number),
      列印時間: str(meta.print_time),
      列印機構: str(meta.print_operator),
      謄本檢查號: str(meta.document_check_number),
      謄本字號: str(meta.transcript_check_number),
      資料管轄機關: str(meta.data_authority),
      謄本核發機關: str(meta.issuing_authority),
    },
    建物標示部: {
      登記日期: str(desc.registration_date),
      登記原因: str(desc.registration_reason),
      建物門牌: str(desc.door_number),
      建物坐落地號: str(desc.land_number),
      主要用途: str(desc.primary_use),
      主要建材: str(desc.primary_material),
      層數: str(desc.floors),
      總面積: str(desc.total_area),
      層次: str(firstFloor.層次),
      層次面積: str(firstFloor.面積),
      建築完成日期: str(desc.completion_date),
      附屬建物用途: attachedStructures.map((item) => str(item.用途)),
      陽台面積: attachedStructures.map((item) => str(item.面積)),
      共有部分: commonAreas.map((item) => str(item.面積)),
      權利範圍: commonAreas.map((item) => str(item.權利範圍)),
      其他登記事項: str(desc.other_notes),
    },
    建物所有權部: ownershipRecords.map((item) => ({
      登記次序: str(item.sequence),
      登記日期: str(item.registration_date),
      登記原因: str(item.registration_reason),
      原因發生日期: str(item.reason_date),
      所有權人: str(item.owner_name),
      住址: str(item.owner_address),
      權利範圍: str(item.share),
      權狀字號: str(item.certificate_number),
      相關他項權利登記次序: str(item.related_other_rights),
      其他登記事項: str(item.other_notes),
    })),
    他項權利部: otherRightRecords.map((item) => ({
      登記次序: str(item.sequence),
      權利種類: str(item.right_type),
      收件日期: str(item.receipt_date),
      字號: str(item.receipt_number),
      登記日期: str(item.registration_date),
      登記原因: str(item.registration_reason),
      權利人: str(item.right_holder),
      權利人住址: str(item.right_holder_address),
      債權額比例: str(item.debt_ratio),
      擔保債權總金額: str(item.total_secured_debt),
      存續期間: str(item.duration),
      清償日期: str(item.repayment_date),
      利息率: str(item.interest_rate),
      遲延利息率: str(item.default_interest_rate),
      違約金: str(item.penalty),
      債務人及債務額比例: str(item.debtor_ratio),
      權利標的: str(item.right_subject),
      標的登記次序: str(item.subject_sequence),
      設定權利範圍: str(item.right_scope),
      證明書字號: str(item.certificate_number),
      設定義務人: str(item.obligor),
      共同擔保地號: str(item.common_collateral_land),
      共同擔保建號: str(item.common_collateral_building),
      其他登記事項: str(item.other_notes),
    })),
  };
}

/** Map parsed 謄本 result to building transcript form (header, description, ownership, encumbrances). */
export function mapParsedResultToBuildingForm(
  parsed: LandRegistryParsedResult
): {
  header: TranscriptHeader;
  description: BuildingDescription;
  ownership: OwnershipRecord[];
  encumbrances: EncumbranceRecord[];
} {
  const meta = parsed.謄本資訊 ?? {};
  const mark = parsed.建物標示部 ?? {};

  const header: TranscriptHeader = {
    transcriptType: str(meta.謄本種類),
    documentTitle: str(meta.建物建號),
    printTime: str(meta.列印時間),
    pageInfo: str(meta.頁次),
    printer: str(meta.列印機構),
    checkNumber: str(meta.謄本檢查號),
    documentNumber: str(meta.大安電謄字號 ?? (meta as Record<string, unknown>)['謄本字號']),
    dataJurisdiction: str(meta.資料管轄機關),
    issuingAuthority: str(meta.謄本核發機關),
    transcriptNotes: str(parsed.備註),
  };

  const annexed: AnnexedBuilding[] = [];
  // Handle array or string for Annexed Buildings
  const annexUses = Array.isArray(mark.附屬建物用途) 
    ? mark.附屬建物用途 
    : (mark.附屬建物用途 ? [mark.附屬建物用途] : []);
    
  // Try multiple keys for area and handle array/string
  const rawArea = mark.陽台面積 ?? mark.附屬建物面積 ?? (mark as any)['面積'];
  const annexAreas = Array.isArray(rawArea) 
    ? rawArea 
    : (rawArea ? [rawArea] : []);

  // Pair them up
  const maxAnnexLen = Math.max(annexUses.length, annexAreas.length);
  for (let i = 0; i < maxAnnexLen; i++) {
    annexed.push({ 
      use: str(annexUses[i] || '附屬建物'), 
      area: str(annexAreas[i]) 
    });
  }

  const common: CommonAreaEntry[] = [];
  // Handle array or string for Common Areas
  const commonParts = Array.isArray(mark.共有部分) 
    ? mark.共有部分 
    : (mark.共有部分 ? [mark.共有部分] : []);
    
  const commonRatios = Array.isArray(mark.權利範圍) 
    ? mark.權利範圍 
    : (mark.權利範圍 ? [mark.權利範圍] : []);

  const maxCommonLen = Math.max(commonParts.length, commonRatios.length);
  for (let i = 0; i < maxCommonLen; i++) {
    common.push({ 
      buildingNumber: '', 
      area: str(commonParts[i]), 
      ratio: str(commonRatios[i]) 
    });
  }

  const description: BuildingDescription = {
    buildingNumber: str((mark as Record<string, unknown>)['建號'] ?? meta.建物建號),
    regDate: str(mark.登記日期),
    regReason: str(mark.登記原因),
    doorAddress: str(mark.建物門牌),
    landParcelNumber: str(mark.建物坐落地號),
    mainUse: str(mark.主要用途),
    mainMaterial: str(mark.主要建材),
    totalFloors: str(mark.層數),
    totalArea: str(mark.總面積),
    floorLevel: str(mark.層次),
    floorArea: str(mark.層次面積),
    completionDate: str(mark.建築完成日期),
    annexedBuildings: annexed,
    commonAreas: common,
    notes: Array.isArray(mark.其他登記事項)
      ? (mark.其他登記事項 as string[]).join('\n')
      : str(mark.其他登記事項),
  };

  const ownership: OwnershipRecord[] = [];
  const ownershipSection = parsed.建物所有權部;
  // Handle array or single object for Ownership
  const ownerList = Array.isArray(ownershipSection) 
    ? ownershipSection 
    : (ownershipSection ? [ownershipSection] : []);

  for (const o of ownerList) {
    if (typeof o !== 'object' || !o) continue;
    const item = o as any; // Cast to any to access properties safely
    const rel = item.相關他項權利登記次序;
    const relatedSeq = Array.isArray(rel) ? (rel as string[]).join('、') : str(rel);
    
    ownership.push({
      id: newId(),
      seq: str(item.登記次序),
      regDate: str(item.登記日期),
      regReason: str(item.登記原因),
      causeDate: str(item.原因發生日期),
      ownerName: str(item.所有權人),
      ownerAddress: str(item.住址 ?? item.設籍住址 ?? item.所有權人住址),
      ownershipRatio: str(item.權利範圍),
      titleNumber: str(item.權狀字號),
      relatedEncumbranceSeq: relatedSeq,
      notes: str(item.其他登記事項),
    });
  }

  const encumbrances: EncumbranceRecord[] = [];
  const encSection = parsed.他項權利部;
  // Handle array or single object for Encumbrances
  const encList = Array.isArray(encSection) 
    ? encSection 
    : (encSection ? [encSection] : []);

  for (const e of encList) {
    if (typeof e !== 'object' || !e) continue;
    const item = e as Record<string, unknown>;
    
    encumbrances.push({
      id: newId(),
      seq: str(item.登記次序),
      encumbranceType: str(item.權利種類 ?? '抵押權'),
      receiptDate: str(item.收件日期),
      receiptNumber: str(item.字號),
      regDate: str(item.登記日期),
      regReason: str(item.登記原因 ?? '設定'),
      creditorName: str(item.權利人),
      creditorAddress: str(item.住址 ?? item.權利人住址),
      debtRatio: str(item.債權額比例),
      totalDebt: str(item.擔保債權總金額),
      duration: str(item.存續期間),
      repaymentDate: str(item.清償日期),
      interest: str(item.利息率 ?? item.利息),
      lateInterest: str(item.遲延利息率 ?? item.遲延利息),
      penalty: str(item.違約金),
      debtorAndRatio: str(item.債務人及債務額比例),
      rightsSubject: str(item.權利標的),
      targetSeq: str(item.標的登記次序),
      settleRightsRatio: str(item.設定權利範圍),
      certNumber: str(item.證明書字號),
      settlor: str(item.設定義務人),
      jointGuaranteeLandNumbers: str(item.共同擔保地號),
      jointGuaranteeBuildingNumbers: str(item.共同擔保建號),
      notes: str(item.其他登記事項),
      debtScope: str(item.債權範圍),
      debtConfirmDate: str(item.債權確定日期),
      otherGuaranteeScope: str(item.其他擔保範圍),
    });
  }

  return { header, description, ownership, encumbrances };
}
