import { createAdminClient } from '@/utils/supabase/admin';
import { randomUUID } from 'crypto';
import { ADAPTER_CONFIG_ITEMS } from '@/lib/adapter-config';
import { evaluateAdapterRun } from '@/app/superadmin/settings/api_key_and_model_setting/adapter-evaluation';
import { logLLMObservabilityInvocation } from '@/lib/ai/observability';

const MAX_TEXT_FIELD = 400_000;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n…(truncated)`;
}

export type ActiveRunSnapshot = {
  userId: string;
  adapterId: string;
  provider: string;
  mode: 'cli' | 'http';
  requestedModel: string;
  effectiveModel: string;
  modelSource: string;
  logs: string[];
  resultText: string;
  testPrompt?: string | null;
  testFileName?: string | null;
  ttftMs: number | null;
  e2eLatencyMs: number | null;
  tokensPerSec: number | null;
  httpStatus: number | null;
  errorType: string;
};

/**
 * Persist one completed adapter run to `adapter_evaluation_runs` (per user).
 * Safe to fire-and-forget; logs errors without throwing to callers.
 */
export async function insertAdapterEvaluationRun(run: ActiveRunSnapshot): Promise<void> {
  const item = ADAPTER_CONFIG_ITEMS.find((i) => i.id === run.adapterId);
  const optionLabel = item?.optionLabel ?? run.adapterId;
  const renderedOutput = run.resultText ?? '';
  const evaluation = evaluateAdapterRun({
    requestedModel: run.requestedModel,
    effectiveModel: run.effectiveModel,
    renderedOutput,
    outputLines: run.logs,
    errorType: run.errorType,
    httpStatus: run.httpStatus,
  });
  const resultSummary = truncate((evaluation.message.trim() || evaluation.level).slice(0, 2000), 2000);

  const row = {
    user_id: run.userId,
    adapter_id: run.adapterId,
    channel: run.mode,
    provider: String(run.provider),
    adapter_option_label: optionLabel,
    requested_model: run.requestedModel,
    effective_model: run.effectiveModel,
    model_source: run.modelSource,
    evaluation_level: evaluation.level,
    evaluation_message: truncate(evaluation.message, MAX_TEXT_FIELD),
    result_summary: resultSummary,
    ttft_ms: run.ttftMs,
    e2e_ms: run.e2eLatencyMs,
    tokens_per_sec: run.tokensPerSec,
    http_status: run.httpStatus,
    error_type: run.errorType || null,
    rendered_output: truncate(renderedOutput, MAX_TEXT_FIELD),
    raw_output: truncate(run.logs.join('\n'), MAX_TEXT_FIELD),
  };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('adapter_evaluation_runs')
    .insert(row)
    .select('id, created_at')
    .single();
  if (error) {
    console.error('[adapter-evaluation-runs] insert failed', error);
    return;
  }

  const insertedId = typeof data?.id === 'string' ? data.id : randomUUID();
  const createdAt = typeof data?.created_at === 'string' ? data.created_at : new Date().toISOString();

  await logLLMObservabilityInvocation({
    client: supabase,
    sourceKind: 'adapter_run',
    userId: run.userId,
    provider: String(run.provider),
    adapterId: run.adapterId,
    adapterModel: optionLabel,
    requestedModel: run.requestedModel,
    effectiveModel: run.effectiveModel,
    testPrompt: run.testPrompt ?? null,
    testFileName: run.testFileName ?? null,
    rawOutput: row.raw_output,
    renderedOutput: row.rendered_output,
    evaluationLabel: evaluation.level,
    evaluationScore: evaluation.level === 'pass' ? 1 : evaluation.level === 'fail' ? 0 : null,
    evaluationMessage: evaluation.message,
    ttftMs: run.ttftMs,
    e2eMs: run.e2eLatencyMs,
    throughputTokensPerS: run.tokensPerSec,
    httpStatus: run.httpStatus,
    status: evaluation.level,
    errorMessage: run.errorType || null,
    startedAt: createdAt,
    endedAt: createdAt,
    trace: {
      client: supabase,
      traceKey: `adapter-evaluation:${insertedId}`,
      userId: run.userId,
      pagePath: 'superadmin/settings/api_key_and_model_setting#evaluations-global',
      moduleKey: 'ai_model_global_evaluation',
      invocationName: run.adapterId,
      executionName: run.mode,
      status: evaluation.level === 'fail' ? 'error' : 'success',
      startedAt: createdAt,
      endedAt: createdAt,
      metadata: {
        adapterOptionLabel: optionLabel,
        modelSource: run.modelSource,
      },
    },
    metadata: {
      adapterEvaluationRunId: insertedId,
      modelSource: run.modelSource,
      resultSummary,
    },
  });
}
