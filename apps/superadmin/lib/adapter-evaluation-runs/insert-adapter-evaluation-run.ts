import { createAdminClient } from '@/utils/supabase/admin';
import { ADAPTER_CONFIG_ITEMS } from '@/lib/adapter-config';
import { evaluateAdapterRun } from '@/app/superadmin/settings/api_key_and_model_setting/adapter-evaluation';

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
  const { error } = await supabase.from('adapter_evaluation_runs').insert(row);
  if (error) {
    console.error('[adapter-evaluation-runs] insert failed', error);
  }
}
