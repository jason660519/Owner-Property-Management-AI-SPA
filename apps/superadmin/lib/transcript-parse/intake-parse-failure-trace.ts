import type { createAdminClient } from '@/utils/supabase/admin';
import type {
  TranscriptIntakeAiStageModel,
  TranscriptIntakeAiStageTrace,
} from '@/lib/transcript-parse/intake-types';
import { attachStageReportUrls } from '@/lib/transcript-parse/intake-stage-trace';

type AdminClient = ReturnType<typeof createAdminClient>;

interface ParserResultRow {
  provider?: unknown;
  model_id?: unknown;
  role?: unknown;
  parse_duration_ms?: unknown;
  error_message?: unknown;
  created_at?: unknown;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length ? value : null;
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

function rowTime(row: ParserResultRow): number {
  const createdAt = asString(row.created_at);
  if (!createdAt) return 0;
  const time = new Date(createdAt).getTime();
  return Number.isFinite(time) ? time : 0;
}

function modelsFromRows(rows: ParserResultRow[], startedAtMs: number): TranscriptIntakeAiStageModel[] {
  const latest = new Map<string, ParserResultRow>();
  for (const row of rows) {
    if (row.role !== 'parser') continue;
    const provider = asString(row.provider);
    const model = asString(row.model_id);
    if (!provider || !model) continue;
    const createdAt = rowTime(row);
    if (createdAt > 0 && createdAt + 1000 < startedAtMs) continue;
    const key = `${provider}:${model}`;
    const previous = latest.get(key);
    if (!previous || rowTime(row) >= rowTime(previous)) latest.set(key, row);
  }

  return Array.from(latest.values()).map((row) => ({
    provider: asString(row.provider) ?? 'unknown',
    model: asString(row.model_id) ?? 'unknown',
    role: 'parse',
    durationMs: asNumber(row.parse_duration_ms),
    errorMessage: asString(row.error_message),
  }));
}

export async function buildFailedParseStageTrace(params: {
  admin: AdminClient;
  runId: string;
  documentIds: string[];
  fallbackModels: TranscriptIntakeAiStageModel[];
  errorMessage: string;
  startedAtMs: number;
  durationMs: number;
}): Promise<TranscriptIntakeAiStageTrace> {
  let rowModels: TranscriptIntakeAiStageModel[] = [];
  try {
    const { data } = await params.admin
      .from('ocr_parse_results')
      .select('provider, model_id, role, parse_duration_ms, error_message, created_at')
      .in('property_document_id', params.documentIds);
    rowModels = Array.isArray(data) ? modelsFromRows(data as ParserResultRow[], params.startedAtMs) : [];
  } catch {
    rowModels = [];
  }

  const rowErrors = rowModels
    .map((model) => model.errorMessage ? `${model.provider}/${model.model}: ${model.errorMessage}` : null)
    .filter((item): item is string => item !== null);
  const trace: TranscriptIntakeAiStageTrace = {
    stage: 'parse',
    label: 'Parse 正式擷取',
    status: 'failed',
    engine: rowModels.some((model) => model.role === 'local') ? 'mixed' : 'vlm_ai',
    durationMs: params.durationMs,
    agentKey: 'transcript_visual_parse',
    moduleKey: 'transcript.parse',
    promptSource: null,
    models: dedupeModels([...rowModels, ...params.fallbackModels]),
    confidence: null,
    summary: [
      `完成 0/${params.documentIds.length} 份文件解析`,
      '解析路徑：failed',
    ],
    corrections: [],
    warnings: rowErrors,
    errorMessage: params.errorMessage,
  };
  return attachStageReportUrls(params.runId, trace);
}
