import type {
  BuildingTranscriptData,
  LandTranscriptData,
  ParkingTitleRight,
} from '@/lib/types/properties';
import type { TranscriptParseOutput } from '@/lib/types/transcript';
import type {
  TranscriptDispositionKind,
  TranscriptIntakeAreaDetailDraft,
  TranscriptIntakeAreaDetailRow,
  TranscriptPageSourceTrust,
} from './intake-types';

interface ParsedDocumentEnvelope {
  documentId?: string;
  documentType: string;
  documentName?: string | null;
  parsedResult: unknown;
}

interface RoutePageSource {
  pageNumber: number;
  sourceTrust: TranscriptPageSourceTrust;
  evidenceText: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readParsedDocuments(parsedResult: unknown): ParsedDocumentEnvelope[] {
  if (!isRecord(parsedResult) || !Array.isArray(parsedResult.documents)) return [];

  return parsedResult.documents
    .filter(isRecord)
    .map((doc) => ({
      documentId: stringValue(doc.documentId),
      documentType: stringValue(doc.documentType),
      documentName: typeof doc.documentName === 'string' ? doc.documentName : null,
      parsedResult: doc.parsedResult,
    }))
    .filter((doc) => doc.documentType.length > 0);
}

function isSourceTrust(value: unknown): value is TranscriptPageSourceTrust {
  return value === 'authoritative' ||
    value === 'reference_only' ||
    value === 'ignore' ||
    value === 'unknown';
}

function readRoutePageIndex(parsedResult: unknown): Map<string, RoutePageSource[]> {
  const index = new Map<string, RoutePageSource[]>();
  if (!isRecord(parsedResult)) return index;
  const routeDecision = isRecord(parsedResult.routeDecision) ? parsedResult.routeDecision : {};
  const documents = Array.isArray(routeDecision.documents) ? routeDecision.documents : [];

  for (const rawDocument of documents) {
    if (!isRecord(rawDocument)) continue;
    const documentId = stringValue(rawDocument.documentId);
    if (!documentId) continue;
    const pages = Array.isArray(rawDocument.pages) ? rawDocument.pages : [];
    const pageSources = pages
      .filter(isRecord)
      .map((page): RoutePageSource | null => {
        const pageNumber = typeof page.pageNumber === 'number' && Number.isFinite(page.pageNumber)
          ? page.pageNumber
          : null;
        if (pageNumber === null) return null;
        return {
          pageNumber,
          sourceTrust: isSourceTrust(page.sourceTrust) ? page.sourceTrust : 'unknown',
          evidenceText: stringValue(page.evidenceText),
        };
      })
      .filter((page): page is RoutePageSource => page !== null);
    index.set(documentId, pageSources);
  }

  return index;
}

function authoritativePageForDocument(
  doc: ParsedDocumentEnvelope,
  pageIndex: Map<string, RoutePageSource[]>,
): RoutePageSource | null {
  const pages = pageIndex.get(doc.documentId ?? '') ?? [];
  return pages.find((page) => page.sourceTrust === 'authoritative') ?? null;
}

function isTranscriptParseOutput(value: unknown): value is TranscriptParseOutput {
  return isRecord(value) &&
    (value.kind === 'building' || value.kind === 'land') &&
    isRecord(value.buildingTranscript) &&
    isRecord(value.landTranscript);
}

function firstOwnershipRatio(transcript: BuildingTranscriptData | LandTranscriptData): string {
  return (transcript.ownership ?? []).find((owner) => owner.ownershipRatio.trim().length > 0)?.ownershipRatio ?? '';
}

function makeRow(params: {
  id: string;
  sourceDocumentId?: string;
  sourceDocumentName?: string | null;
  sourcePage?: number | null;
  sourceTrust?: TranscriptPageSourceTrust;
  groupShareRatio?: string;
  label: string;
  identifier: string;
  areaSqm: string;
  shareRatio?: string;
  use?: string;
  evidenceText?: string;
}): TranscriptIntakeAreaDetailRow {
  return {
    id: params.id,
    sourceDocumentId: params.sourceDocumentId,
    sourceDocumentName: params.sourceDocumentName ?? null,
    sourcePage: params.sourcePage ?? null,
    sourceTrust: params.sourceTrust,
    groupShareRatio: params.groupShareRatio,
    label: params.label,
    identifier: params.identifier,
    areaSqm: params.areaSqm,
    shareRatio: params.shareRatio ?? '',
    use: params.use ?? '',
    evidenceText: params.evidenceText,
    confidence: null,
  };
}

function buildingRowFromTranscript(
  doc: ParsedDocumentEnvelope,
  transcript: BuildingTranscriptData,
  idPrefix: string,
  routePage: RoutePageSource | null,
): TranscriptIntakeAreaDetailRow | null {
  const desc = transcript.description;
  const mainBuilding = desc.mainBuildings?.[0];
  const area = desc.totalArea || desc.floorArea || mainBuilding?.floorArea || '';
  const identifier = desc.buildingNumber || transcript.header.documentTitle || '';
  if (!area && !identifier) return null;

  return makeRow({
    id: `${idPrefix}-${doc.documentId || doc.documentType}`,
    sourceDocumentId: doc.documentId,
    sourceDocumentName: doc.documentName,
    sourcePage: routePage?.pageNumber ?? null,
    sourceTrust: routePage?.sourceTrust ?? 'authoritative',
    label: desc.floorLevel || mainBuilding?.floorLevel || '主建物',
    identifier,
    areaSqm: area,
    shareRatio: firstOwnershipRatio(transcript),
    use: desc.mainUse,
    evidenceText: routePage?.evidenceText || [identifier, area, desc.mainUse].filter(Boolean).join(' / '),
  });
}

function landRowFromTranscript(
  doc: ParsedDocumentEnvelope,
  transcript: LandTranscriptData,
  idPrefix: string,
  routePage: RoutePageSource | null,
): TranscriptIntakeAreaDetailRow | null {
  const desc = transcript.description;
  const identifier = desc.landNumber || transcript.header.documentTitle || '';
  if (!desc.area && !identifier) return null;

  return makeRow({
    id: `${idPrefix}-${doc.documentId || doc.documentType}`,
    sourceDocumentId: doc.documentId,
    sourceDocumentName: doc.documentName,
    sourcePage: routePage?.pageNumber ?? null,
    sourceTrust: routePage?.sourceTrust ?? 'authoritative',
    label: desc.useZone || desc.landCategory || '土地',
    identifier,
    areaSqm: desc.area,
    shareRatio: firstOwnershipRatio(transcript),
    use: desc.useZone || desc.useCategory,
    evidenceText: routePage?.evidenceText || [identifier, desc.area, firstOwnershipRatio(transcript)].filter(Boolean).join(' / '),
  });
}

export function buildAreaDetailDraftFromIntake(params: {
  parsedResult: unknown;
  dispositionKind: TranscriptDispositionKind;
  parkingTitleRights: ParkingTitleRight[];
}): TranscriptIntakeAreaDetailDraft {
  const draft: TranscriptIntakeAreaDetailDraft = {
    version: 1,
    dispositionKind: params.dispositionKind,
    parkingTitleRights: params.parkingTitleRights,
    buildingAreas: [],
    landShareAreas: [],
    parkingBuildingAreas: [],
    parkingLandShareAreas: [],
  };

  const pageIndex = readRoutePageIndex(params.parsedResult);

  for (const doc of readParsedDocuments(params.parsedResult)) {
    if (!isTranscriptParseOutput(doc.parsedResult)) continue;
    const routePage = authoritativePageForDocument(doc, pageIndex);

    if (
      doc.documentType === 'building_registry_transcript' ||
      doc.documentType === 'building_title' ||
      (doc.documentType === 'registry_transcript_unclassified' && doc.parsedResult.kind === 'building')
    ) {
      const row = buildingRowFromTranscript(doc, doc.parsedResult.buildingTranscript, 'building', routePage);
      if (row) draft.buildingAreas.push(row);
    }
    if (
      doc.documentType === 'land_registry_transcript' ||
      doc.documentType === 'land_title' ||
      (doc.documentType === 'registry_transcript_unclassified' && doc.parsedResult.kind === 'land')
    ) {
      const row = landRowFromTranscript(doc, doc.parsedResult.landTranscript, 'land', routePage);
      if (row) draft.landShareAreas.push(row);
    }
    if (doc.documentType === 'registry_transcript_unclassified') {
      const buildingRow = buildingRowFromTranscript(doc, doc.parsedResult.buildingTranscript, 'building', routePage);
      const landRow = landRowFromTranscript(doc, doc.parsedResult.landTranscript, 'land', routePage);
      if (buildingRow && !draft.buildingAreas.some((row) => row.id === buildingRow.id)) draft.buildingAreas.push(buildingRow);
      if (landRow && !draft.landShareAreas.some((row) => row.id === landRow.id)) draft.landShareAreas.push(landRow);
    } else if (doc.documentType === 'parking_building_registry_transcript') {
      const row = buildingRowFromTranscript(doc, doc.parsedResult.buildingTranscript, 'parking-building', routePage);
      if (row) draft.parkingBuildingAreas.push(row);
    } else if (doc.documentType === 'parking_land_registry_transcript') {
      const row = landRowFromTranscript(doc, doc.parsedResult.landTranscript, 'parking-land', routePage);
      if (row) draft.parkingLandShareAreas.push(row);
    }
  }

  return draft;
}

function validRows(rows: TranscriptIntakeAreaDetailRow[]): TranscriptIntakeAreaDetailRow[] {
  return rows.filter((row) => row.identifier.trim().length > 0 || row.areaSqm.trim().length > 0);
}

function isParkingTitleRight(value: unknown): value is ParkingTitleRight {
  return value === 'independent' || value === 'shared_facility';
}

function isDispositionKind(value: unknown): value is TranscriptDispositionKind {
  return typeof value === 'string' && [
    'pure_land_sale',
    'whole_building_sale',
    'townhouse_or_villa_sale',
    'unit_building_with_land_share_sale',
    'parking_only_sale',
    'mixed_or_unclear',
    'unknown',
  ].includes(value);
}

function readRows(value: unknown): TranscriptIntakeAreaDetailRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((row, index) => ({
    id: stringValue(row.id) || `manual-${index + 1}`,
    sourceDocumentId: stringValue(row.sourceDocumentId) || undefined,
    sourceDocumentName: typeof row.sourceDocumentName === 'string' ? row.sourceDocumentName : null,
    sourcePage: typeof row.sourcePage === 'number' && Number.isFinite(row.sourcePage) ? row.sourcePage : null,
    sourceTrust: isSourceTrust(row.sourceTrust) ? row.sourceTrust : undefined,
    groupShareRatio: stringValue(row.groupShareRatio) || undefined,
    label: stringValue(row.label),
    identifier: stringValue(row.identifier),
    areaSqm: stringValue(row.areaSqm),
    shareRatio: stringValue(row.shareRatio),
    use: stringValue(row.use),
    evidenceText: stringValue(row.evidenceText) || undefined,
    confidence: typeof row.confidence === 'number' ? row.confidence : null,
    derivedFrom: (
      row.derivedFrom === 'parser' ||
      row.derivedFrom === 'reviewer_correction' ||
      row.derivedFrom === 'detail_builder_resolution' ||
      row.derivedFrom === 'ai_inference' ||
      row.derivedFrom === 'manual'
    ) ? row.derivedFrom : undefined,
    needsUserConfirmation: row.needsUserConfirmation === true,
    issueReason: stringValue(row.issueReason) || undefined,
    candidateValues: Array.isArray(row.candidateValues)
      ? row.candidateValues.filter((item): item is string => typeof item === 'string')
      : undefined,
  }));
}

export function normalizeAreaDetailDraft(value: unknown): TranscriptIntakeAreaDetailDraft | null {
  if (!isRecord(value)) return null;
  const rawRights = Array.isArray(value.parkingTitleRights) ? value.parkingTitleRights : [];

  return {
    version: 1,
    dispositionKind: isDispositionKind(value.dispositionKind) ? value.dispositionKind : 'unknown',
    parkingTitleRights: [...new Set(rawRights.filter(isParkingTitleRight))],
    buildingAreas: validRows(readRows(value.buildingAreas)),
    landShareAreas: validRows(readRows(value.landShareAreas)),
    parkingBuildingAreas: validRows(readRows(value.parkingBuildingAreas)),
    parkingLandShareAreas: validRows(readRows(value.parkingLandShareAreas)),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : undefined,
  };
}

export function applyAreaDetailDraftToBuildingTranscript(
  transcript: BuildingTranscriptData,
  rows: TranscriptIntakeAreaDetailRow[],
): BuildingTranscriptData {
  const usableRows = validRows(rows);
  if (usableRows.length === 0) return transcript;
  const [first] = usableRows;

  return {
    ...transcript,
    description: {
      ...transcript.description,
      buildingNumber: first.identifier,
      mainUse: first.use,
      totalArea: first.areaSqm,
      floorLevel: first.label,
      floorArea: first.areaSqm,
      mainBuildings: usableRows.map((row) => ({
        totalFloors: '',
        totalArea: row.areaSqm,
        floorLevel: row.label,
        floorArea: row.areaSqm,
      })),
    },
    ownership: transcript.ownership.length
      ? transcript.ownership.map((owner, index) => index === 0 ? { ...owner, ownershipRatio: first.shareRatio } : owner)
      : transcript.ownership,
  };
}

export function applyAreaDetailDraftToLandTranscript(
  transcript: LandTranscriptData,
  rows: TranscriptIntakeAreaDetailRow[],
): LandTranscriptData {
  const usableRows = validRows(rows);
  if (usableRows.length === 0) return transcript;
  const [first] = usableRows;

  return {
    ...transcript,
    description: {
      ...transcript.description,
      landNumber: first.identifier,
      area: first.areaSqm,
      useZone: first.use || first.label,
    },
    ownership: transcript.ownership.length
      ? transcript.ownership.map((owner, index) => index === 0 ? { ...owner, ownershipRatio: first.shareRatio } : owner)
      : transcript.ownership,
  };
}
