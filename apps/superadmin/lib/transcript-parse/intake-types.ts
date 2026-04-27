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
  | 'building_title'
  | 'land_title'
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
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
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
  fieldDecisions?: TranscriptReviewFieldDecision[];
  doubleCheckSummary?: string[];
  reviewerModels?: TranscriptIntakeAiStageModel[];
  reviewerErrors?: string[];
  reviewerReports?: TranscriptReviewerReport[];
}

export interface TranscriptReviewFieldDecision {
  fieldPath: string;
  decision: 'majority_accept' | 'reviewer_double_checked' | 'needs_user_confirmation' | 'insufficient_evidence';
  selectedValue?: unknown;
  parserVotes?: Array<{
    provider: string;
    model: string;
    value: unknown;
  }>;
  confidence: number;
  rationale: string;
  evidence?: TranscriptEvidenceRef[];
}

export interface TranscriptReviewerReport {
  provider: string;
  model: string;
  durationMs?: number | null;
  review: Omit<TranscriptReviewResult, 'reviewerModels' | 'reviewerErrors' | 'reviewerReports'>;
}

export type TranscriptIntakeAiStageKey = 'detect' | 'parse' | 'verify_review' | 'detail_builder';

export interface TranscriptIntakeAiStageModel {
  provider: string;
  model: string;
  role: 'detect' | 'parse' | 'judge' | 'review' | 'detail_builder' | 'local';
  status?: 'pending' | 'running' | 'success' | 'error' | 'cancelled' | 'skipped';
  startedAt?: string | null;
  durationMs?: number | null;
  confidence?: number | null;
  errorMessage?: string | null;
  reportUrl?: string | null;
}

export interface TranscriptIntakeAiStageTrace {
  stage: TranscriptIntakeAiStageKey;
  label: string;
  status: 'success' | 'fallback' | 'failed' | 'skipped';
  engine: 'vlm_ai' | 'local_python_text' | 'structured_json' | 'processor_seed' | 'mixed';
  durationMs?: number | null;
  agentKey?: string | null;
  moduleKey?: string | null;
  promptSource?: string | null;
  models: TranscriptIntakeAiStageModel[];
  confidence?: number | null;
  summary: string[];
  corrections: string[];
  warnings: string[];
  errorMessage?: string | null;
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
  aiStageTrace?: TranscriptIntakeAiStageTrace[];
  parserReports?: TranscriptParserReport[];
  areaDetailDraft?: TranscriptIntakeAreaDetailDraft | null;
  detailBuilderResult?: TranscriptDetailBuilderResult | null;
  parseOutcomes: Array<{
    documentId: string;
    kind: string;
    message?: string;
  }>;
  documents: TranscriptIntakeParsedDocument[];
}

export interface TranscriptParserReport {
  provider: string;
  model: string;
  durationMs?: number | null;
  documentCount: number;
  observations: string[];
  markdown: string;
  documents: Array<{
    documentId: string;
    durationMs?: number | null;
    errorMessage?: string | null;
    observations: string[];
    rawOutput: unknown;
  }>;
}

export interface TranscriptIntakeConfirmedResult {
  detection: TranscriptDetectionResult;
  parsed: TranscriptIntakeParsedResult;
  review: TranscriptReviewResult;
  confirmedAt: string;
}

export interface TranscriptIntakeAreaDetailRow {
  id: string;
  sourceDocumentId?: string;
  sourceDocumentName?: string | null;
  sourcePage?: number | null;
  label: string;
  identifier: string;
  areaSqm: string;
  shareRatio: string;
  use: string;
  evidenceText?: string;
  confidence?: number | null;
  derivedFrom?: 'parser' | 'reviewer_correction' | 'detail_builder_resolution' | 'ai_inference' | 'manual';
  needsUserConfirmation?: boolean;
  issueReason?: string;
  candidateValues?: string[];
}

export interface TranscriptIntakeAreaDetailDraft {
  version: 1;
  dispositionKind: TranscriptDispositionKind;
  parkingTitleRights: ParkingTitleRight[];
  buildingAreas: TranscriptIntakeAreaDetailRow[];
  landShareAreas: TranscriptIntakeAreaDetailRow[];
  parkingBuildingAreas: TranscriptIntakeAreaDetailRow[];
  parkingLandShareAreas: TranscriptIntakeAreaDetailRow[];
  updatedAt?: string;
}

export interface TranscriptDetailBuilderResult {
  areaDetailDraft: TranscriptIntakeAreaDetailDraft;
  summary: string[];
  warnings: string[];
  userConfirmationRequired: string[];
  confidence: number;
}
