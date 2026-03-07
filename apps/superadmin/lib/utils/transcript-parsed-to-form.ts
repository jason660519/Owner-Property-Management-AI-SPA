// filepath: apps/superadmin/lib/utils/transcript-parsed-to-form.ts
// Maps AI-parsed 謄本 JSON (LandRegistryParsedResult) to building form state.

import type { LandRegistryParsedResult } from '@/lib/types/transcript';
import type {
  TranscriptHeader,
  BuildingDescription,
  OwnershipRecord,
  AnnexedBuilding,
  CommonAreaEntry,
} from '@/lib/types/properties';

function str(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  return String(v).trim();
}

function newId(): string {
  return typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

/** Map parsed 謄本 result to building transcript form (header, description, ownership). */
export function mapParsedResultToBuildingForm(
  parsed: LandRegistryParsedResult
): {
  header: TranscriptHeader;
  description: BuildingDescription;
  ownership: OwnershipRecord[];
} {
  const meta = parsed.謄本資訊 ?? {};
  const mark = parsed.建物標示部 ?? {};
  const ownershipSection = parsed.建物所有權部;

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
  const use = str(mark.附屬建物用途);
  const area = str(mark.陽台面積);
  if (use || area) annexed.push({ use: use || '附屬建物', area });

  const common: CommonAreaEntry[] = [];
  const commonPart = str(mark.共有部分);
  const ratio = str(mark.權利範圍);
  if (commonPart || ratio) {
    common.push({ buildingNumber: '', area: commonPart, ratio });
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
  if (ownershipSection && typeof ownershipSection === 'object') {
    const rel = ownershipSection.相關他項權利登記次序;
    const relatedSeq = Array.isArray(rel) ? (rel as string[]).join('、') : str(rel);
    ownership.push({
      id: newId(),
      seq: str(ownershipSection.登記次序),
      regDate: str(ownershipSection.登記日期),
      regReason: str(ownershipSection.登記原因),
      causeDate: str(ownershipSection.原因發生日期),
      ownerName: str(ownershipSection.所有權人),
      ownerAddress: str(ownershipSection.住址),
      ownershipRatio: str(ownershipSection.權利範圍),
      titleNumber: str(ownershipSection.權狀字號),
      relatedEncumbranceSeq: relatedSeq,
      notes: str(ownershipSection.其他登記事項),
    });
  }

  return { header, description, ownership };
}
