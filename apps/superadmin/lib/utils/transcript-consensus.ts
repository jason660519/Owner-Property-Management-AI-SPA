// filepath: apps/superadmin/lib/utils/transcript-consensus.ts
// Core consensus algorithm for multi-model OCR transcript parsing.
// Deterministic field-level majority vote — no AI calls involved.

import type {
  LandRegistryParsedResult,
  ModelParseResult,
  ConsensusMetadata,
  ConflictDetail,
  ModelInfo,
} from '@/lib/types/transcript';

// ---------------------------------------------------------------------------
// Value normalisation helpers (Taiwan transcript specifics)
// ---------------------------------------------------------------------------

/** Normalise a transcript value for comparison. */
export function normalizeTranscriptValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'string') return JSON.stringify(value);

  let s = value;
  // Full-width → half-width digits & letters
  s = s.replace(/[\uff10-\uff19]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
  s = s.replace(/[\uff21-\uff3a\uff41-\uff5a]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
  // Full-width punctuation normalisation
  s = s.replace(/\uff0c/g, ',').replace(/\uff0e/g, '.').replace(/\uff1a/g, ':');
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  // Normalise common area unit variants
  s = s.replace(/平方(公尺|米)/g, '平方公尺');
  // Remove trailing zeros after decimal in numbers (e.g. "125.60" → "125.6")
  s = s.replace(/(\d+\.\d*?)0+(?=\s|$|平)/g, '$1');
  // Remove trailing dot (e.g. "125." → "125")
  s = s.replace(/(\d+)\.(?=\s|$|平)/g, '$1');
  return s;
}

/** Deep-compare two values after normalisation. */
export function deepCompareValues(a: unknown, b: unknown): boolean {
  // Both null/undefined
  if ((a === null || a === undefined) && (b === null || b === undefined)) return true;

  // Arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepCompareValues(v, b[i]));
  }

  // Objects (non-array)
  if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null && !Array.isArray(a) && !Array.isArray(b)) {
    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);
    const allKeys = new Set([...keysA, ...keysB]);
    for (const k of allKeys) {
      if (!deepCompareValues((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) return false;
    }
    return true;
  }

  // Primitive: normalise before comparing
  return normalizeTranscriptValue(a) === normalizeTranscriptValue(b);
}

// ---------------------------------------------------------------------------
// Majority vote per field
// ---------------------------------------------------------------------------

export interface VoteResult {
  value: unknown;
  confidence: number;
  isConflict: boolean;
  /** Which models agreed on the chosen value */
  agreeing: { provider: string; model: string }[];
  /** All model values (for conflict detail) */
  allValues: { provider: string; model: string; value: unknown }[];
}

/**
 * Given values from N models for a single field, perform majority vote.
 *
 * Confidence rules:
 * - All agree (N/N):          1.0
 * - Majority agrees (M/N):    M / N  (e.g. 2/3 = 0.67)
 * - All different:            1 / N  (e.g. 1/3 = 0.33)
 * - Only 2 models, agree:     0.8
 * - Only 2 models, disagree:  0.4
 * - Only 1 model:             0.3
 */
export function fieldMajorityVote(
  values: { provider: string; model: string; value: unknown }[]
): VoteResult {
  if (values.length === 0) {
    return { value: null, confidence: 0, isConflict: false, agreeing: [], allValues: [] };
  }

  if (values.length === 1) {
    return {
      value: values[0].value,
      confidence: 0.3,
      isConflict: false,
      agreeing: [{ provider: values[0].provider, model: values[0].model }],
      allValues: values,
    };
  }

  // Group values by equivalence
  const groups: { canonical: unknown; members: typeof values }[] = [];
  for (const v of values) {
    const existing = groups.find((g) => deepCompareValues(g.canonical, v.value));
    if (existing) {
      existing.members.push(v);
    } else {
      groups.push({ canonical: v.value, members: [v] });
    }
  }

  // Sort groups by size descending
  groups.sort((a, b) => b.members.length - a.members.length);
  const largest = groups[0];
  const totalModels = values.length;

  // Calculate confidence
  let confidence: number;
  const allAgree = largest.members.length === totalModels;

  if (totalModels === 2) {
    confidence = allAgree ? 0.8 : 0.4;
  } else {
    confidence = largest.members.length / totalModels;
  }

  const isConflict = !allAgree;

  return {
    value: largest.canonical,
    confidence,
    isConflict,
    agreeing: largest.members.map((m) => ({ provider: m.provider, model: m.model })),
    allValues: values,
  };
}

// ---------------------------------------------------------------------------
// Recursive object walk & consensus builder
// ---------------------------------------------------------------------------

interface WalkContext {
  fieldConfidences: Record<string, number>;
  conflicts: ConflictDetail[];
}

/**
 * Recursively walk a merged key-set across all model results, performing
 * majority vote at each leaf node.
 */
function walkAndVote(
  results: { provider: string; model: string; obj: Record<string, unknown> }[],
  prefix: string,
  ctx: WalkContext
): Record<string, unknown> {
  // Collect all keys across all results at this level
  const allKeys = new Set<string>();
  for (const r of results) {
    if (r.obj && typeof r.obj === 'object' && !Array.isArray(r.obj)) {
      Object.keys(r.obj).forEach((k) => allKeys.add(k));
    }
  }

  const merged: Record<string, unknown> = {};

  for (const key of allKeys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const childValues = results
      .filter((r) => r.obj && typeof r.obj === 'object' && key in r.obj)
      .map((r) => ({
        provider: r.provider,
        model: r.model,
        value: (r.obj as Record<string, unknown>)[key],
      }));

    if (childValues.length === 0) continue;

    // Check if all non-null values are plain objects (recurse)
    const nonNull = childValues.filter((v) => v.value !== null && v.value !== undefined);
    const allObjects = nonNull.length > 0 && nonNull.every(
      (v) => typeof v.value === 'object' && !Array.isArray(v.value)
    );

    if (allObjects) {
      // Recurse into sub-objects
      const subResults = nonNull.map((v) => ({
        provider: v.provider,
        model: v.model,
        obj: v.value as Record<string, unknown>,
      }));
      merged[key] = walkAndVote(subResults, path, ctx);
    } else {
      // Leaf: perform majority vote
      const vote = fieldMajorityVote(childValues);
      merged[key] = vote.value;
      ctx.fieldConfidences[path] = vote.confidence;

      if (vote.isConflict) {
        ctx.conflicts.push({
          field_path: path,
          values: vote.allValues,
          resolved_by: vote.confidence >= 0.5 ? 'majority' : 'unresolved',
          final_value: vote.confidence >= 0.5 ? vote.value : undefined,
        });
      }
    }
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ConsensusResult {
  merged: LandRegistryParsedResult;
  metadata: ConsensusMetadata;
}

/**
 * Build consensus from multiple model parse results.
 * Returns merged result + metadata (field confidences, conflicts, etc.)
 */
export function buildConsensus(
  results: ModelParseResult[],
  totalDurationMs: number
): ConsensusResult {
  const successful = results.filter((r) => r.result !== null);
  const modelsUsed: ModelInfo[] = results.map((r) => ({
    provider: r.provider,
    model: r.model,
    duration_ms: r.duration_ms,
    token_usage: r.token_usage,
  }));

  // Edge case: no successful results
  if (successful.length === 0) {
    return {
      merged: {} as LandRegistryParsedResult,
      metadata: {
        strategy: 'consensus',
        field_confidences: {},
        conflicts: [],
        total_confidence: 0,
        models_used: modelsUsed,
        total_duration_ms: totalDurationMs,
      },
    };
  }

  // Edge case: only 1 successful result — adopt as-is with low confidence
  if (successful.length === 1) {
    const solo = successful[0];
    const ctx: WalkContext = { fieldConfidences: {}, conflicts: [] };
    // Walk to populate field_confidences (all at 0.3)
    walkAndVote(
      [{ provider: solo.provider, model: solo.model, obj: solo.result as Record<string, unknown> }],
      '',
      ctx
    );
    return {
      merged: solo.result as LandRegistryParsedResult,
      metadata: {
        strategy: 'consensus',
        field_confidences: ctx.fieldConfidences,
        conflicts: [],
        total_confidence: 0.3,
        models_used: modelsUsed,
        total_duration_ms: totalDurationMs,
      },
    };
  }

  // Normal case: 2+ successful results
  const ctx: WalkContext = { fieldConfidences: {}, conflicts: [] };
  const walkable = successful.map((r) => ({
    provider: r.provider,
    model: r.model,
    obj: r.result as Record<string, unknown>,
  }));

  const merged = walkAndVote(walkable, '', ctx) as LandRegistryParsedResult;
  const totalConfidence = calculateTotalConfidence(ctx.fieldConfidences);

  return {
    merged,
    metadata: {
      strategy: 'consensus',
      field_confidences: ctx.fieldConfidences,
      conflicts: ctx.conflicts,
      total_confidence: totalConfidence,
      models_used: modelsUsed,
      total_duration_ms: totalDurationMs,
    },
  };
}

/** Calculate a weighted average of all field confidences. */
export function calculateTotalConfidence(fieldConfidences: Record<string, number>): number {
  const entries = Object.values(fieldConfidences);
  if (entries.length === 0) return 0;
  const sum = entries.reduce((acc, v) => acc + v, 0);
  return Math.round((sum / entries.length) * 100) / 100;
}

/**
 * Identify conflicts that need AI judge intervention.
 * Returns conflicts with confidence < threshold (default 0.5).
 */
export function getConflictsNeedingJudge(
  metadata: ConsensusMetadata,
  threshold = 0.5
): ConflictDetail[] {
  return metadata.conflicts.filter((c) => {
    const fieldConf = metadata.field_confidences[c.field_path] ?? 0;
    return fieldConf < threshold;
  });
}

/**
 * Apply judge resolutions to merged result and update metadata.
 */
export function applyJudgeResolutions(
  merged: LandRegistryParsedResult,
  metadata: ConsensusMetadata,
  resolutions: { field_path: string; correct_value: unknown; reason?: string }[],
  judgeInfo: ModelInfo
): { merged: LandRegistryParsedResult; metadata: ConsensusMetadata } {
  const updatedMerged = JSON.parse(JSON.stringify(merged)) as Record<string, unknown>;
  const updatedMetadata: ConsensusMetadata = {
    ...metadata,
    judge_used: judgeInfo,
    conflicts: [...metadata.conflicts],
    field_confidences: { ...metadata.field_confidences },
  };

  for (const resolution of resolutions) {
    // Set value in merged object via dot-path
    setNestedValue(updatedMerged, resolution.field_path, resolution.correct_value);

    // Update confidence for this field
    updatedMetadata.field_confidences[resolution.field_path] = 0.85;

    // Update conflict status
    const conflictIdx = updatedMetadata.conflicts.findIndex(
      (c) => c.field_path === resolution.field_path
    );
    if (conflictIdx >= 0) {
      updatedMetadata.conflicts[conflictIdx] = {
        ...updatedMetadata.conflicts[conflictIdx],
        resolved_by: 'judge',
        final_value: resolution.correct_value,
      };
    }
  }

  // Recalculate total confidence
  updatedMetadata.total_confidence = calculateTotalConfidence(updatedMetadata.field_confidences);

  return {
    merged: updatedMerged as LandRegistryParsedResult,
    metadata: updatedMetadata,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Set a value in a nested object using a dot-separated path. */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}
