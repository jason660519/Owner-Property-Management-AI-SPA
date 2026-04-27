import type { ParkingTitleRight } from '@/lib/types/properties';
import type { TranscriptParseOutput } from '@/lib/types/transcript';

export type TranscriptInputFormat = 'pdf' | 'image' | 'json' | 'text' | 'unknown';

export type TranscriptTechnicalRoute =
  | 'local_python_text'
  | 'vlm_visual'
  | 'structured_json'
  | 'unsupported';

export type TranscriptIntakePhase =
  | 'uploaded'
  | 'route_selected'
  | 'detecting'
  | 'parsing'
  | 'reviewing'
  | 'needs_user_confirmation'
  | 'confirmed'
  | 'failed';

export type TranscriptDispositionKind =
  | 'pure_land_sale'
  | 'whole_building_sale'
  | 'townhouse_or_villa_sale'
  | 'unit_building_with_land_share_sale'
  | 'parking_only_sale'
  | 'mixed_or_unclear'
  | 'unknown';

export type TranscriptDocumentKind =
  | 'building_transcript'
  | 'land_transcript'
  | 'parking_building_transcript'
  | 'parking_land_transcript'
  | 'mixed_transcript'
  | 'unknown';

export interface TranscriptRouteMetrics {
  fileName: string;
  mimeType: string;
  inputFormat: TranscriptInputFormat;
  extractedTextLength: number;
  cjkCharacterCount: number;
  registryMarkerCount: number;
  hasUsableTraditionalChineseText: boolean;
}

export interface TranscriptRouteDecision {
  route: TranscriptTechnicalRoute;
  inputFormat: TranscriptInputFormat;
  reasons: string[];
  metrics: TranscriptRouteMetrics;
}

export interface TranscriptEvidenceRef {
  documentId?: string;
  page?: number;
  section?: string;
  text: string;
}

export interface TranscriptDetectionResult {
  dispositionKind: TranscriptDispositionKind;
  documentKinds: TranscriptDocumentKind[];
  parkingTitleRights: ParkingTitleRight[];
  hasBuildingTranscript: boolean;
  hasLandTranscript: boolean;
  hasParkingEvidence: boolean;
  buildingOwnershipLikelyFull: boolean | null;
  landOwnershipLikelyFull: boolean | null;
  buildingNumberCount: number | null;
  landParcelCount: number | null;
  riskFlags: string[];
  evidence: TranscriptEvidenceRef[];
}

export interface TranscriptReviewIssue {
  severity: 'info' | 'warning' | 'blocking';
  fieldPath: string;
  message: string;
  suggestedValue?: unknown;
  evidence?: TranscriptEvidenceRef[];
}

export interface TranscriptReviewResult {
  approved: boolean;
  confidence: number;
  issues: TranscriptReviewIssue[];
  parkingTitleRights: ParkingTitleRight[];
  dispositionKind: TranscriptDispositionKind;
  userConfirmationRequired: string[];
}

export interface TranscriptIntakeParsedDocument {
  documentId: string;
  documentType: string;
  documentName: string | null;
  parsedResult: TranscriptParseOutput | null;
  consensusMetadata: Record<string, unknown> | null;
}

export interface TranscriptIntakeParsedResult {
  strategy: 'existing_transcript_parse_core';
  routeDecision: Record<string, unknown>;
  parseOutcomes: Array<{
    documentId: string;
    kind: string;
    message?: string;
  }>;
  documents: TranscriptIntakeParsedDocument[];
}

export interface TranscriptIntakeConfirmedResult {
  detection: TranscriptDetectionResult;
  parsed: TranscriptIntakeParsedResult;
  review: TranscriptReviewResult;
  confirmedAt: string;
}
