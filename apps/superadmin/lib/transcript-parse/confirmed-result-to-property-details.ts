// Convert a confirmed transcript intake run into property details updates.

import type { BuildingTranscriptData, LandTranscriptData, ParkingTitleRight } from '@/lib/types/properties';
import type { TranscriptParseOutput } from '@/lib/types/transcript';
import type {
  TranscriptDetectionResult,
  TranscriptDispositionKind,
  TranscriptIntakeAreaDetailDraft,
  TranscriptReviewResult,
} from './intake-types';
import {
  applyAreaDetailDraftToBuildingTranscript,
  applyAreaDetailDraftToLandTranscript,
  normalizeAreaDetailDraft,
} from './intake-area-details';

type TranscriptDetailsPatch = {
  buildingTranscript?: BuildingTranscriptData;
  landTranscript?: LandTranscriptData;
  parkingBuildingTranscript?: BuildingTranscriptData;
  parkingLandTranscript?: LandTranscriptData;
  parkingTitleRights?: ParkingTitleRight[];
  transcriptIntakeDispositionKind?: TranscriptDispositionKind;
  transcriptIntakeConfirmedAt?: string;
  transcriptIntakeRunId?: string;
  transcriptIntakeAreaDetails?: TranscriptIntakeAreaDetailDraft;
};

export interface ConfirmedResultPropertySync {
  detailsPatch: TranscriptDetailsPatch;
  hasIndependentParking: boolean;
  isPureLand: boolean;
  landNumber: string | null;
  primaryOwnerName: string | null;
}

interface ParsedDocumentEnvelope {
  documentType: string;
  parsedResult: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readParsedDocuments(parsedResult: unknown): ParsedDocumentEnvelope[] {
  if (!isRecord(parsedResult) || !Array.isArray(parsedResult.documents)) return [];

  return parsedResult.documents
    .filter(isRecord)
    .map((doc) => ({
      documentType: typeof doc.documentType === 'string' ? doc.documentType : '',
      parsedResult: doc.parsedResult,
    }))
    .filter((doc) => doc.documentType.length > 0);
}

function isTranscriptParseOutput(value: unknown): value is TranscriptParseOutput {
  return isRecord(value) &&
    (value.kind === 'building' || value.kind === 'land') &&
    isRecord(value.buildingTranscript) &&
    isRecord(value.landTranscript);
}

function hasBuildingContent(value: TranscriptParseOutput): boolean {
  const desc = value.buildingTranscript.description;
  return Boolean(
    desc.buildingNumber ||
    desc.totalArea ||
    desc.floorArea ||
    desc.mainBuildings?.length ||
    value.buildingTranscript.ownership.length,
  );
}

function hasLandContent(value: TranscriptParseOutput): boolean {
  const desc = value.landTranscript.description;
  return Boolean(
    desc.landNumber ||
    desc.area ||
    value.landTranscript.ownership.length,
  );
}

function readParkingTitleRights(
  detection: TranscriptDetectionResult | null,
  review: TranscriptReviewResult | null,
): ParkingTitleRight[] {
  const rights = review?.parkingTitleRights ?? detection?.parkingTitleRights ?? [];
  return [...new Set(rights.filter((right): right is ParkingTitleRight => (
    right === 'independent' || right === 'shared_facility'
  )))];
}

function readDispositionKind(
  detection: TranscriptDetectionResult | null,
  review: TranscriptReviewResult | null,
): TranscriptDispositionKind {
  return review?.dispositionKind ?? detection?.dispositionKind ?? 'unknown';
}

function readPrimaryOwnerName(
  buildingTranscript: BuildingTranscriptData | undefined,
  landTranscript: LandTranscriptData | undefined,
): string | null {
  const buildingOwner = buildingTranscript?.ownership.find((owner) => owner.ownerName.trim().length > 0)?.ownerName;
  const landOwner = landTranscript?.ownership.find((owner) => owner.ownerName.trim().length > 0)?.ownerName;
  return (buildingOwner ?? landOwner ?? '').trim() || null;
}

export function buildPropertySyncFromConfirmedTranscriptIntake(params: {
  runId: string;
  parsedResult: unknown;
  detection: TranscriptDetectionResult | null;
  review: TranscriptReviewResult | null;
  confirmedAt: string;
  areaDetailDraft?: unknown;
}): ConfirmedResultPropertySync {
  const detailsPatch: TranscriptDetailsPatch = {
    transcriptIntakeConfirmedAt: params.confirmedAt,
    transcriptIntakeRunId: params.runId,
  };

  for (const doc of readParsedDocuments(params.parsedResult)) {
    if (!isTranscriptParseOutput(doc.parsedResult)) continue;

    if (doc.documentType === 'building_registry_transcript' || doc.documentType === 'building_title') {
      detailsPatch.buildingTranscript = doc.parsedResult.buildingTranscript;
    } else if (doc.documentType === 'land_registry_transcript' || doc.documentType === 'land_title') {
      detailsPatch.landTranscript = doc.parsedResult.landTranscript;
    } else if (doc.documentType === 'parking_building_registry_transcript') {
      detailsPatch.parkingBuildingTranscript = doc.parsedResult.buildingTranscript;
    } else if (doc.documentType === 'parking_land_registry_transcript') {
      detailsPatch.parkingLandTranscript = doc.parsedResult.landTranscript;
    } else if (doc.documentType === 'registry_transcript_unclassified') {
      if ((doc.parsedResult.kind === 'land' || hasLandContent(doc.parsedResult)) && !detailsPatch.landTranscript) {
        detailsPatch.landTranscript = doc.parsedResult.landTranscript;
      }
      if ((doc.parsedResult.kind === 'building' || hasBuildingContent(doc.parsedResult)) && !detailsPatch.buildingTranscript) {
        detailsPatch.buildingTranscript = doc.parsedResult.buildingTranscript;
      }
    }
  }

  const areaDetailDraft = normalizeAreaDetailDraft(params.areaDetailDraft);
  const parkingTitleRights = areaDetailDraft?.parkingTitleRights.length
    ? areaDetailDraft.parkingTitleRights
    : readParkingTitleRights(params.detection, params.review);
  if (areaDetailDraft) {
    detailsPatch.transcriptIntakeAreaDetails = {
      ...areaDetailDraft,
      updatedAt: params.confirmedAt,
    };
  }

  if (areaDetailDraft?.buildingAreas.length && detailsPatch.buildingTranscript) {
    detailsPatch.buildingTranscript = applyAreaDetailDraftToBuildingTranscript(
      detailsPatch.buildingTranscript,
      areaDetailDraft.buildingAreas,
    );
  }
  if (areaDetailDraft?.landShareAreas.length && detailsPatch.landTranscript) {
    detailsPatch.landTranscript = applyAreaDetailDraftToLandTranscript(
      detailsPatch.landTranscript,
      areaDetailDraft.landShareAreas,
    );
  }
  if (areaDetailDraft?.parkingBuildingAreas.length && detailsPatch.parkingBuildingTranscript) {
    detailsPatch.parkingBuildingTranscript = applyAreaDetailDraftToBuildingTranscript(
      detailsPatch.parkingBuildingTranscript,
      areaDetailDraft.parkingBuildingAreas,
    );
  }
  if (areaDetailDraft?.parkingLandShareAreas.length && detailsPatch.parkingLandTranscript) {
    detailsPatch.parkingLandTranscript = applyAreaDetailDraftToLandTranscript(
      detailsPatch.parkingLandTranscript,
      areaDetailDraft.parkingLandShareAreas,
    );
  }

  detailsPatch.parkingTitleRights = parkingTitleRights;
  detailsPatch.transcriptIntakeDispositionKind = readDispositionKind(params.detection, params.review);

  const isPureLand = detailsPatch.transcriptIntakeDispositionKind === 'pure_land_sale' ||
    (!!detailsPatch.landTranscript && !detailsPatch.buildingTranscript);

  return {
    detailsPatch,
    hasIndependentParking: parkingTitleRights.includes('independent') ||
      Boolean(detailsPatch.parkingBuildingTranscript || detailsPatch.parkingLandTranscript),
    isPureLand,
    landNumber: detailsPatch.landTranscript?.description.landNumber.trim() || null,
    primaryOwnerName: readPrimaryOwnerName(detailsPatch.buildingTranscript, detailsPatch.landTranscript),
  };
}
