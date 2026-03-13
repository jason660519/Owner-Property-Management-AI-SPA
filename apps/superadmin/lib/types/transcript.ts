// filepath: apps/superadmin/lib/types/transcript.ts
// Types for AI-parsed 謄本 (land registry transcript) JSON output.

import type { BuildingTranscriptData, LandTranscriptData } from '@/lib/types/properties';

export type TranscriptKind = 'building' | 'land';

export interface TranscriptParseOutput {
  kind: TranscriptKind;
  buildingTranscript: BuildingTranscriptData;
  landTranscript: LandTranscriptData;
}

// ============================================================================
// Multi-model consensus types
// ============================================================================

/** Information about a single model used during consensus parsing */
export interface ModelInfo {
  provider: string;
  model: string;
  duration_ms: number;
  token_usage?: TokenUsage;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/** A single model's parse attempt (success or failure) */
export interface ModelParseResult {
  provider: string;
  model: string;
  result: TranscriptParseOutput | null;
  duration_ms: number;
  token_usage?: TokenUsage;
  error?: string;
}

/** Details of a field-level conflict between models */
export interface ConflictDetail {
  /** Dot-separated path, e.g. "建物標示部.總面積" */
  field_path: string;
  /** Each model's value for this field */
  values: { provider: string; model: string; value: unknown }[];
  /** How the conflict was resolved */
  resolved_by: 'majority' | 'judge' | 'unresolved';
  /** Final chosen value (undefined when unresolved) */
  final_value?: unknown;
}

/** Metadata produced by the consensus algorithm */
export interface ConsensusMetadata {
  strategy: 'single' | 'consensus';
  /** Per-field confidence: key = dot-path, value = 0–1 */
  field_confidences: Record<string, number>;
  /** Fields where models disagreed */
  conflicts: ConflictDetail[];
  /** Weighted average of all field confidences */
  total_confidence: number;
  /** Models used in Phase 1 (parsing) */
  models_used: ModelInfo[];
  /** Model used in Phase 3 (judging) — omitted when no conflicts */
  judge_used?: ModelInfo;
  /** Total wall-clock duration of the entire consensus process */
  total_duration_ms: number;
}

/** Return type of the consensus parse engine */
export type ConsensusParseResult =
  | { success: true; data: TranscriptParseOutput; metadata: ConsensusMetadata }
  | { success: false; message: string };

/** Judge model resolution for a single conflict */
export interface JudgeResolution {
  field_path: string;
  correct_value: unknown;
  chosen_from?: string;
  /** 0–1 confidence score returned by the judge model itself */
  confidence?: number;
  reason?: string;
}
