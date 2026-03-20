import {
  ContractAttachmentSchema,
  LeaseContractDraftSchema,
  SaleContractDraftSchema,
  type ContractAttachment,
  type LeaseContractDraft,
  type SaleContractDraft,
  type SalePaymentMilestone,
  type TranscriptSummarySection,
} from '@/lib/types/contracts';
import {
  formatStructuredAddress,
  type BuildingTranscriptData,
  type LandTranscriptData,
  type OwnershipRecord,
  type PropertyItem,
} from '@/lib/types/properties';

export interface TranscriptAttachmentInput {
  attachmentId: string;
  fileName: string;
  storagePath: string;
  pageCount?: number;
  snapshotHash?: string;
  note?: string;
}

export interface BuildLeaseContractDraftInput {
  property: PropertyItem;
  tenantName: string;
  leaseStartDate: string;
  leaseEndDate: string;
  depositAmount: number;
  contractCopiesCount?: number;
  holdoverPenaltyMultiple?: number;
  monthlyRent?: number;
  paymentDueDay?: number;
  contractNumber?: string;
  contractDate?: string;
  ownerName?: string;
  buildingTranscriptAttachment?: TranscriptAttachmentInput;
  landTranscriptAttachment?: TranscriptAttachmentInput;
  usePurpose?: LeaseContractDraft['usePurpose'];
  includedItems?: string[];
  specialTerms?: string;
}

export interface BuildSaleContractDraftInput {
  property: PropertyItem;
  buyerName: string;
  sellerName?: string;
  salePriceTotal: number;
  landPrice?: number;
  buildingPrice?: number;
  parkingLandPrice?: number;
  parkingBuildingPrice?: number;
  paymentSchedule: SalePaymentMilestone[];
  handoverDate?: string;
  ownershipTransferDate?: string;
  contractNumber?: string;
  contractDate?: string;
  buildingTranscriptAttachment: TranscriptAttachmentInput;
  landTranscriptAttachment: TranscriptAttachmentInput;
  agentName?: string;
  brokerName?: string;
  scrivenerName?: string;
  deliveryCondition?: string;
  taxAllocation?: string;
  registrationFeeAllocation?: string;
  brokerFeeAllocation?: string;
  escrowMethod?: string;
  occupiedByOthersCondition?: string;
  encroachmentCondition?: string;
  leaseBorrowCondition?: string;
  copyRetentionHolder?: string;
  defaultClauseSummary?: string;
}

function parseArea(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value.replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sqmToPing(value: number | undefined): number | undefined {
  if (value == null || Number.isNaN(value)) return undefined;
  return Math.round(value * 0.3025 * 100) / 100;
}

function buildTranscriptAttachment(
  type: ContractAttachment['attachmentType'],
  source: TranscriptAttachmentInput,
): ContractAttachment {
  return ContractAttachmentSchema.parse({
    attachmentId: source.attachmentId,
    attachmentType: type,
    fileName: source.fileName,
    storagePath: source.storagePath,
    pageCount: source.pageCount,
    isRequired: true,
    isAttached: true,
    snapshotHash: source.snapshotHash,
    note: source.note,
  });
}

function summarizeOwnership(records: OwnershipRecord[]): string {
  if (records.length === 0) {
    return '未提供所有權部資料。';
  }

  return records
    .slice(0, 3)
    .map((record) => `${record.ownerName}（權利範圍：${record.ownershipRatio || '詳謄本'}）`)
    .join('；');
}

function buildEncumbranceSummary(
  buildingTranscript?: BuildingTranscriptData | null,
  landTranscript?: LandTranscriptData | null,
): string | undefined {
  const notes: string[] = [];

  if (buildingTranscript?.encumbrances.length) {
    const first = buildingTranscript.encumbrances[0];
    notes.push(
      `建物謄本記載${first.encumbranceType || '他項權利'}，權利人${first.creditorName || '詳謄本'}，擔保債權總金額${first.totalDebt || '詳謄本'}。`,
    );
  }

  if (landTranscript?.encumbrances.length) {
    const first = landTranscript.encumbrances[0];
    notes.push(
      `土地謄本記載${first.encumbranceType || '他項權利'}，權利人${first.creditorName || '詳謄本'}，擔保債權總金額${first.totalDebt || '詳謄本'}。`,
    );
  }

  if (notes.length === 0) {
    return undefined;
  }

  return notes.join(' ');
}

function buildBuildingDescriptionSection(
  transcript: BuildingTranscriptData,
  sourceAttachmentId?: string,
): TranscriptSummarySection {
  const areaPing = sqmToPing(parseArea(transcript.description.totalArea));

  return {
    title: '建物標示部',
    transcriptType: 'building',
    sourceAttachmentId,
    content: [
      `建號：${transcript.description.buildingNumber || '詳謄本'}`,
      `門牌：${transcript.description.doorAddress || '詳謄本'}`,
      `主要用途：${transcript.description.mainUse || '詳謄本'}`,
      `主要建材：${transcript.description.mainMaterial || '詳謄本'}`,
      `總樓層：${transcript.description.totalFloors || '詳謄本'}`,
      areaPing ? `建物面積：約 ${areaPing} 坪` : `建物面積：${transcript.description.totalArea || '詳謄本'}`,
    ].join('；'),
  };
}

function buildBuildingOwnershipSection(
  transcript: BuildingTranscriptData,
  sourceAttachmentId?: string,
): TranscriptSummarySection {
  return {
    title: '建物所有權部',
    transcriptType: 'building',
    sourceAttachmentId,
    content: summarizeOwnership(transcript.ownership),
  };
}

function buildLandDescriptionSection(
  transcript: LandTranscriptData,
  sourceAttachmentId?: string,
): TranscriptSummarySection {
  const areaPing = sqmToPing(parseArea(transcript.description.area));

  return {
    title: '土地標示部',
    transcriptType: 'land',
    sourceAttachmentId,
    content: [
      `地號：${transcript.description.landNumber || '詳謄本'}`,
      `地目：${transcript.description.landCategory || '詳謄本'}`,
      areaPing ? `土地面積：約 ${areaPing} 坪` : `土地面積：${transcript.description.area || '詳謄本'}`,
      `使用分區：${transcript.description.useZone || '詳謄本'}`,
      `使用地類別：${transcript.description.useCategory || '詳謄本'}`,
    ].join('；'),
  };
}

function buildLandOwnershipSection(
  transcript: LandTranscriptData,
  sourceAttachmentId?: string,
): TranscriptSummarySection {
  return {
    title: '土地所有權部',
    transcriptType: 'land',
    sourceAttachmentId,
    content: summarizeOwnership(transcript.ownership),
  };
}

function normalizeOwnerName(property: PropertyItem, explicitOwnerName?: string): string {
  return explicitOwnerName?.trim() || property.ownerName?.trim() || '待確認所有權人';
}

export function buildLeaseContractDraftFromProperty(
  input: BuildLeaseContractDraftInput,
): LeaseContractDraft {
  const propertyAddress = formatStructuredAddress(input.property);
  const ownerName = normalizeOwnerName(input.property, input.ownerName);
  const attachments: ContractAttachment[] = [];

  if (input.buildingTranscriptAttachment) {
    attachments.push(buildTranscriptAttachment('building_transcript', input.buildingTranscriptAttachment));
  }

  if (input.landTranscriptAttachment) {
    attachments.push(buildTranscriptAttachment('land_transcript', input.landTranscriptAttachment));
  }

  return LeaseContractDraftSchema.parse({
    contractType: 'lease',
    draftStatus: 'draft',
    templateCode: 'lease_v1',
    templateVersion: '2026-03-20',
    contractNumber: input.contractNumber,
    contractDate: input.contractDate,
    propertyId: input.property.id,
    propertyAddress,
    ownerName,
    sourceBuildingTranscriptId: input.buildingTranscriptAttachment?.attachmentId,
    sourceLandTranscriptId: input.landTranscriptAttachment?.attachmentId,
    buildingTranscriptAttached: Boolean(input.buildingTranscriptAttachment),
    landTranscriptAttached: Boolean(input.landTranscriptAttachment),
    attachments,
    generatedBy: 'system',
    tenantName: input.tenantName || '（待填）承租人',
    leaseStartDate: input.leaseStartDate || '待補',
    leaseEndDate: input.leaseEndDate || '待補',
    monthlyRent: input.monthlyRent ?? input.property.monthlyRent ?? 0,
    depositAmount: input.depositAmount,
    contractCopiesCount: input.contractCopiesCount ?? 2,
    holdoverPenaltyMultiple: input.holdoverPenaltyMultiple,
    paymentDueDay: input.paymentDueDay,
    usePurpose: input.usePurpose,
    includedItems: input.includedItems,
    specialTerms: input.specialTerms,
    transcriptAttachmentNote: '本契約附建物或土地謄本副本至少一份，供雙方核對標的資訊。',
    buildingNumber: input.property.buildingTranscript?.description.buildingNumber,
    landNumber: input.property.landTranscript?.description.landNumber,
    buildingAreaPing: sqmToPing(parseArea(input.property.buildingTranscript?.description.totalArea)),
    landAreaPing: sqmToPing(parseArea(input.property.landTranscript?.description.area)),
    buildingOwnershipSummary: input.property.buildingTranscript
      ? summarizeOwnership(input.property.buildingTranscript.ownership)
      : undefined,
    landOwnershipSummary: input.property.landTranscript
      ? summarizeOwnership(input.property.landTranscript.ownership)
      : undefined,
    encumbranceSummary: buildEncumbranceSummary(
      input.property.buildingTranscript,
      input.property.landTranscript,
    ),
  });
}

export function buildSaleContractDraftFromProperty(
  input: BuildSaleContractDraftInput,
): SaleContractDraft {
  const buildingTranscript = input.property.buildingTranscript;
  const landTranscript = input.property.landTranscript;

  if (!buildingTranscript || !landTranscript) {
    throw new Error('Sale contract draft requires both building and land transcripts.');
  }

  const sellerName = normalizeOwnerName(input.property, input.sellerName);
  const ownerName = input.property.ownerName?.trim();
  const ownershipMismatchFlag = Boolean(ownerName && sellerName !== ownerName);
  const encumbranceExistsFlag = buildingTranscript.encumbrances.length > 0 || landTranscript.encumbrances.length > 0;
  const riskNotes: string[] = [];

  if (ownershipMismatchFlag) {
    riskNotes.push('賣方姓名與物件 ownerName 不一致，需人工確認授權或代理關係。');
  }

  if (encumbranceExistsFlag) {
    riskNotes.push('謄本顯示他項權利或擔保設定，請於簽約前確認塗銷與交屋安排。');
  }

  const attachments = [
    buildTranscriptAttachment('building_transcript', input.buildingTranscriptAttachment),
    buildTranscriptAttachment('land_transcript', input.landTranscriptAttachment),
  ];

  return SaleContractDraftSchema.parse({
    contractType: 'sale',
    draftStatus: 'draft',
    templateCode: 'sale_v1',
    templateVersion: '2026-03-20',
    contractNumber: input.contractNumber,
    contractDate: input.contractDate,
    propertyId: input.property.id,
    propertyAddress: formatStructuredAddress(input.property),
    ownerName: sellerName,
    sourceBuildingTranscriptId: input.buildingTranscriptAttachment.attachmentId,
    sourceLandTranscriptId: input.landTranscriptAttachment.attachmentId,
    buildingTranscriptAttached: true,
    landTranscriptAttached: true,
    attachments,
    generatedBy: 'system',
    sellerName,
    buyerName: input.buyerName || '（待填）買方',
    agentName: input.agentName,
    brokerName: input.brokerName,
    scrivenerName: input.scrivenerName,
    buildingNumber: buildingTranscript.description.buildingNumber,
    landNumbers: [landTranscript.description.landNumber].filter(Boolean),
    parkingInfo: input.property.parkingSpaces ? `車位 ${input.property.parkingSpaces} 個` : undefined,
    buildingCurrentUse: buildingTranscript.description.mainUse || input.property.propertyType || undefined,
    deliveryCondition: input.deliveryCondition || input.property.description || undefined,
    transcriptSections: {
      buildingDescription: buildBuildingDescriptionSection(
        buildingTranscript,
        input.buildingTranscriptAttachment.attachmentId,
      ),
      buildingOwnership: buildBuildingOwnershipSection(
        buildingTranscript,
        input.buildingTranscriptAttachment.attachmentId,
      ),
      landDescription: buildLandDescriptionSection(
        landTranscript,
        input.landTranscriptAttachment.attachmentId,
      ),
      landOwnership: buildLandOwnershipSection(
        landTranscript,
        input.landTranscriptAttachment.attachmentId,
      ),
      encumbrances: encumbranceExistsFlag
        ? {
            title: '他項權利部摘要',
            transcriptType: 'building',
            content: buildEncumbranceSummary(buildingTranscript, landTranscript) || '詳謄本',
          }
        : undefined,
      restrictions: buildingTranscript.description.notes || landTranscript.description.notes
        ? {
            title: '限制登記或其他記事摘要',
            transcriptType: 'land',
            content: [buildingTranscript.description.notes, landTranscript.description.notes]
              .filter(Boolean)
              .join('；'),
          }
        : undefined,
    },
    salePriceTotal: input.salePriceTotal,
    landPrice: input.landPrice,
    buildingPrice: input.buildingPrice,
    parkingLandPrice: input.parkingLandPrice,
    parkingBuildingPrice: input.parkingBuildingPrice,
    paymentSchedule: input.paymentSchedule,
    handoverDate: input.handoverDate,
    ownershipTransferDate: input.ownershipTransferDate,
    taxAllocation: input.taxAllocation,
    registrationFeeAllocation: input.registrationFeeAllocation,
    brokerFeeAllocation: input.brokerFeeAllocation,
    escrowMethod: input.escrowMethod,
    occupiedByOthersCondition: input.occupiedByOthersCondition,
    encroachmentCondition: input.encroachmentCondition,
    leaseBorrowCondition: input.leaseBorrowCondition,
    copyRetentionHolder: input.copyRetentionHolder,
    defaultClauseSummary: input.defaultClauseSummary,
    ownershipMismatchFlag,
    encumbranceExistsFlag,
    restrictedRegistrationFlag: false,
    manualReviewRequired: riskNotes.length > 0,
    riskNotes: riskNotes.length > 0 ? riskNotes.join(' ') : undefined,
    transcriptAttachmentNote: '本契約附建物謄本及土地謄本副本各一份，供雙方核對標的與權利狀態。',
  });
}