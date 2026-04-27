import type { createAdminClient } from '@/utils/supabase/admin';
import type {
  TranscriptDetailBuilderResult,
  TranscriptIntakeAiStageModel,
  TranscriptIntakeAiStageTrace,
  TranscriptReviewResult,
} from '@/lib/transcript-parse/intake-types';
import {
  resolveTranscriptIntakeAiStageInfo,
  type TranscriptIntakeAiStageInfo,
} from '@/lib/transcript-parse/intake-ai';
import { resolveAssignedModels } from '@/lib/transcript-parse/run-transcript-parse-core';
import {
  limitTranscriptEnsembleModels,
  TRANSCRIPT_PARSE_CANDIDATE_SIZE,
} from '@/lib/transcript-parse/transcript-ensemble-models';

type AdminClient = ReturnType<typeof createAdminClient>;

interface TraceDocumentSnapshot {
  id: string;
  parsed_result: unknown;
  consensus_metadata: Record<string, unknown> | null;
}

export function stageModelFromInfo(
  info: TranscriptIntakeAiStageInfo | null,
  role: TranscriptIntakeAiStageModel['role'],
): TranscriptIntakeAiStageModel[] {
  if (info?.models?.length) {
    return info.models.map((model) => ({ ...model, role }));
  }
  if (!info?.provider || !info.model) return [];
  return [{ provider: info.provider, model: info.model, role }];
}

export async function safeResolveStageInfo(
  admin: AdminClient,
  userId: string,
  stage: 'detect' | 'review' | 'detail_builder',
): Promise<TranscriptIntakeAiStageInfo | null> {
  try {
    return await resolveTranscriptIntakeAiStageInfo(admin, userId, stage);
  } catch {
    return null;
  }
}

export function buildPendingDetailBuilderStageTrace(
  info: TranscriptIntakeAiStageInfo | null,
): TranscriptIntakeAiStageTrace {
  return {
    stage: 'detail_builder',
    label: 'Detail Builder 明細草稿',
    status: 'skipped',
    engine: 'vlm_ai',
    durationMs: null,
    agentKey: info?.agentKey ?? 'transcript_detail_builder',
    moduleKey: info?.moduleKey ?? null,
    promptSource: info?.promptSource ?? null,
    models: stageModelFromInfo(info, 'detail_builder'),
    confidence: null,
    summary: ['等待產生明細草稿'],
    corrections: [],
    warnings: [],
  };
}

function routeModes(routeDecision: Record<string, unknown>): { hasLocal: boolean; hasVlm: boolean } {
  const routes: string[] = [];
  if (typeof routeDecision.aggregateRoute === 'string') routes.push(routeDecision.aggregateRoute);
  if (Array.isArray(routeDecision.documents)) {
    for (const raw of routeDecision.documents) {
      const item = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : null;
      if (typeof item?.route === 'string') {
        routes.push(item.route);
      }
    }
  }
  return {
    hasLocal: routes.includes('local_python_text'),
    hasVlm: routes.length === 0 || routes.some((route) => route !== 'local_python_text'),
  };
}

export async function safeResolveParseStageModels(
  admin: AdminClient,
  userId: string,
  routeDecision: Record<string, unknown>,
): Promise<TranscriptIntakeAiStageModel[]> {
  const modes = routeModes(routeDecision);
  const models: TranscriptIntakeAiStageModel[] = modes.hasLocal
    ? [{ provider: 'local', model: 'local-python-text', role: 'local' }]
    : [];
  if (!modes.hasVlm) return models;
  try {
    const resolution = await resolveAssignedModels(admin, userId, 'transcript_visual_parse', ['online_ocr_parse', 'online_ocr']);
    const parserModels = limitTranscriptEnsembleModels(resolution.models, TRANSCRIPT_PARSE_CANDIDATE_SIZE);
    return dedupeModels([...models, ...parserModels.map((model) => ({
      provider: model.provider,
      model: model.model,
      role: 'parse' as const,
    }))]);
  } catch {
    return models;
  }
}

export function buildPendingParseStageTrace(
  models: TranscriptIntakeAiStageModel[],
  routeDecision: Record<string, unknown>,
): TranscriptIntakeAiStageTrace {
  const modes = routeModes(routeDecision);
  return {
    stage: 'parse',
    label: 'Parse 正式擷取',
    status: 'skipped',
    engine: modes.hasLocal && modes.hasVlm ? 'mixed' : modes.hasLocal ? 'local_python_text' : 'vlm_ai',
    durationMs: null,
    agentKey: modes.hasVlm ? 'transcript_visual_parse' : null,
    moduleKey: modes.hasVlm ? 'transcript.parse' : null,
    promptSource: null,
    models: models.map((model) => ({ ...model, status: 'pending' as const })),
    confidence: null,
    summary: ['等待正式解析開始'],
    corrections: [],
    warnings: [],
  };
}

export function buildPendingReviewStageTrace(
  info: TranscriptIntakeAiStageInfo | null,
): TranscriptIntakeAiStageTrace {
  return {
    stage: 'verify_review',
    label: 'Verify / Review 驗證審查',
    status: 'skipped',
    engine: 'vlm_ai',
    durationMs: null,
    agentKey: info?.agentKey ?? 'transcript_audit',
    moduleKey: info?.moduleKey ?? null,
    promptSource: info?.promptSource ?? null,
    models: stageModelFromInfo(info, 'review').map((model) => ({ ...model, status: 'pending' as const })),
    confidence: null,
    summary: ['等待驗證審查開始'],
    corrections: [],
    warnings: [],
  };
}

export function replaceStageTrace(
  traces: TranscriptIntakeAiStageTrace[],
  next: TranscriptIntakeAiStageTrace,
): void {
  const index = traces.findIndex((trace) => trace.stage === next.stage);
  if (index >= 0) traces.splice(index, 1, next);
  else traces.push(next);
}

function formatTraceValue(value: unknown): string {
  if (value === null || value === undefined) return '空值';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return '複合值';
  }
}

function modelListFromConsensus(metadata: Record<string, unknown> | null): TranscriptIntakeAiStageModel[] {
  const rawModels = Array.isArray(metadata?.models_used) ? metadata.models_used : [];
  return rawModels.flatMap((raw): TranscriptIntakeAiStageModel[] => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
    const item = raw as Record<string, unknown>;
    const provider = typeof item.provider === 'string' ? item.provider : null;
    const model = typeof item.model === 'string' ? item.model : null;
    if (!provider || !model) return [];
    return [{
      provider,
      model,
      role: provider === 'local' ? 'local' : 'parse',
      durationMs: typeof item.duration_ms === 'number' ? item.duration_ms : null,
    }];
  });
}

function dedupeModels(models: TranscriptIntakeAiStageModel[]): TranscriptIntakeAiStageModel[] {
  const seen = new Set<string>();
  const result: TranscriptIntakeAiStageModel[] = [];
  for (const model of models) {
    const key = `${model.role}:${model.provider}:${model.model}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(model);
  }
  return result;
}

export function buildParseStageTrace(
  parsedDocuments: TraceDocumentSnapshot[],
  parseOutcomes: Array<{ documentId: string; kind: string; message?: string }>,
  durationMs?: number,
  fallbackModels: TranscriptIntakeAiStageModel[] = [],
): TranscriptIntakeAiStageTrace {
  const models = dedupeModels([
    ...parsedDocuments.flatMap((doc) => modelListFromConsensus(doc.consensus_metadata)),
    ...fallbackModels,
  ]);
  const outcomeKinds = [...new Set(parseOutcomes.map((outcome) => outcome.kind))];
  const hasLocal = outcomeKinds.includes('local_python_text') || models.some((model) => model.role === 'local');
  const hasVlm = models.some((model) => model.role === 'parse');
  return {
    stage: 'parse',
    label: 'Parse 正式擷取',
    status: parseOutcomes.every((outcome) => outcome.kind === 'local_python_text' || outcome.kind === 'complete')
      ? 'success'
      : 'fallback',
    engine: hasLocal && hasVlm ? 'mixed' : hasLocal ? 'local_python_text' : 'vlm_ai',
    durationMs: typeof durationMs === 'number' ? durationMs : null,
    agentKey: hasVlm ? 'transcript_visual_parse' : null,
    moduleKey: hasVlm ? 'transcript.parse' : null,
    promptSource: null,
    models,
    confidence: null,
    summary: [
      `完成 ${parsedDocuments.filter((doc) => doc.parsed_result).length}/${parsedDocuments.length} 份文件解析`,
      `解析路徑：${outcomeKinds.length ? outcomeKinds.join('、') : '—'}`,
    ],
    corrections: [],
    warnings: parseOutcomes
      .filter((outcome) => outcome.message)
      .map((outcome) => `${outcome.documentId}: ${outcome.message}`),
  };
}

export function buildReviewCorrections(review: TranscriptReviewResult): string[] {
  return review.issues
    .filter((issue) => issue.suggestedValue !== undefined && issue.suggestedValue !== null)
    .map((issue) => `${issue.fieldPath} 建議改為 ${formatTraceValue(issue.suggestedValue)}`);
}

export function reviewStageModelsFromResult(
  review: TranscriptReviewResult,
  info: TranscriptIntakeAiStageInfo | null,
): TranscriptIntakeAiStageModel[] {
  return review.reviewerModels?.length
    ? review.reviewerModels
    : stageModelFromInfo(info, 'review');
}

export function attachStageReportUrls(
  runId: string,
  trace: TranscriptIntakeAiStageTrace,
): TranscriptIntakeAiStageTrace {
  if (trace.stage !== 'parse' && trace.stage !== 'verify_review' && trace.stage !== 'detail_builder') return trace;
  return {
    ...trace,
    models: trace.models.map((model) => {
      if (model.role !== 'parse' && model.role !== 'review' && model.role !== 'detail_builder') return model;
      const params = new URLSearchParams({
        stage: trace.stage,
        provider: model.provider,
        model: model.model,
      });
      return { ...model, reportUrl: `/api/transcript-intake/runs/${runId}/ai-reports?${params.toString()}` };
    }),
  };
}

export function buildDetailBuilderCorrections(result: TranscriptDetailBuilderResult): string[] {
  const counts = [
    `建物 ${result.areaDetailDraft.buildingAreas.length} 列`,
    `土地 ${result.areaDetailDraft.landShareAreas.length} 列`,
    `車位建物 ${result.areaDetailDraft.parkingBuildingAreas.length} 列`,
    `車位土地 ${result.areaDetailDraft.parkingLandShareAreas.length} 列`,
  ];
  return [`產生明細草稿：${counts.join('、')}`];
}
