import { createAdminClient } from '@/utils/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

type ObservabilityStatus =
  | 'running'
  | 'success'
  | 'error'
  | 'timeout'
  | 'cancelled'
  | 'warning'
  | 'fail'
  | 'pass'
  | 'pending';

type TraceStatus = 'running' | 'success' | 'error' | 'timeout' | 'cancelled';

export interface CreateLLMTraceOptions {
  traceKey: string;
  userId?: string | null;
  pagePath?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  moduleKey?: string | null;
  invocationName?: string | null;
  executionName?: string | null;
  status?: TraceStatus;
  startedAt?: string | null;
  endedAt?: string | null;
  metadata?: Record<string, unknown>;
  client?: AdminClient;
}

export interface LogLLMInvocationOptions {
  traceId?: string | null;
  trace?: CreateLLMTraceOptions;
  userId?: string | null;
  sourceKind?: 'llm_call' | 'adapter_run' | 'evaluator_run' | 'tool_call' | 'legacy_usage';
  provider?: string | null;
  adapterId?: string | null;
  adapterModel?: string | null;
  requestedModel?: string | null;
  effectiveModel?: string | null;
  inputPrompt?: string | null;
  testPrompt?: string | null;
  testFileName?: string | null;
  rawOutput?: string | null;
  renderedOutput?: string | null;
  evaluationLabel?: string | null;
  evaluationScore?: number | null;
  evaluationMessage?: string | null;
  ttftMs?: number | null;
  e2eMs?: number | null;
  throughputTokensPerS?: number | null;
  httpStatus?: number | null;
  tokensInput?: number | null;
  tokensOutput?: number | null;
  costUsd?: number | null;
  status?: ObservabilityStatus;
  errorMessage?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  metadata?: Record<string, unknown>;
  client?: AdminClient;
}

const MAX_TEXT_FIELD = 400_000;

function truncateText(value: string | null | undefined): string | null {
  if (!value) return value ?? null;
  if (value.length <= MAX_TEXT_FIELD) return value;
  return `${value.slice(0, MAX_TEXT_FIELD)}\n\n…(truncated)`;
}

export async function createLLMObservabilityTrace(opts: CreateLLMTraceOptions): Promise<string | null> {
  const client = opts.client ?? createAdminClient();
  const startedAt = opts.startedAt ?? new Date().toISOString();

  try {
    const { data, error } = await client
      .from('llm_observability_traces')
      .upsert(
        {
          trace_key: opts.traceKey,
          user_id: opts.userId ?? null,
          page_path: opts.pagePath ?? null,
          company_id: opts.companyId ?? null,
          company_name: opts.companyName ?? null,
          module_key: opts.moduleKey ?? null,
          invocation_name: opts.invocationName ?? null,
          execution_name: opts.executionName ?? null,
          status: opts.status ?? 'running',
          started_at: startedAt,
          ended_at: opts.endedAt ?? null,
          metadata: opts.metadata ?? {},
        },
        { onConflict: 'trace_key' },
      )
      .select('id')
      .single();

    if (error) {
      console.warn('[llm-observability] trace upsert failed', {
        traceKey: opts.traceKey,
        message: error.message,
      });
      return null;
    }

    return typeof data?.id === 'string' ? data.id : null;
  } catch (err) {
    console.warn('[llm-observability] trace unexpected error', {
      traceKey: opts.traceKey,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function logLLMObservabilityInvocation(opts: LogLLMInvocationOptions): Promise<void> {
  const client = opts.client ?? opts.trace?.client ?? createAdminClient();
  const traceId = opts.traceId ?? (opts.trace ? await createLLMObservabilityTrace({ ...opts.trace, client }) : null);
  const startedAt = opts.startedAt ?? opts.trace?.startedAt ?? new Date().toISOString();

  try {
    const { error } = await client.from('llm_observability_invocations').insert({
      trace_id: traceId,
      user_id: opts.userId ?? opts.trace?.userId ?? null,
      source_kind: opts.sourceKind ?? 'llm_call',
      provider: opts.provider ?? null,
      adapter_id: opts.adapterId ?? null,
      adapter_model: opts.adapterModel ?? null,
      requested_model: opts.requestedModel ?? null,
      effective_model: opts.effectiveModel ?? null,
      input_prompt: truncateText(opts.inputPrompt),
      test_prompt: truncateText(opts.testPrompt),
      test_file_name: opts.testFileName ?? null,
      raw_output: truncateText(opts.rawOutput),
      rendered_output: truncateText(opts.renderedOutput),
      evaluation_label: opts.evaluationLabel ?? null,
      evaluation_score: opts.evaluationScore ?? null,
      evaluation_message: truncateText(opts.evaluationMessage),
      ttft_ms: opts.ttftMs ?? null,
      e2e_ms: opts.e2eMs ?? null,
      throughput_tokens_per_s: opts.throughputTokensPerS ?? null,
      http_status: opts.httpStatus ?? null,
      tokens_input: opts.tokensInput ?? null,
      tokens_output: opts.tokensOutput ?? null,
      cost_usd: opts.costUsd ?? null,
      status: opts.status ?? 'running',
      error_message: truncateText(opts.errorMessage),
      started_at: startedAt,
      ended_at: opts.endedAt ?? null,
      metadata: opts.metadata ?? {},
    });

    if (error) {
      console.warn('[llm-observability] invocation insert failed', {
        provider: opts.provider,
        requestedModel: opts.requestedModel,
        message: error.message,
      });
    }
  } catch (err) {
    console.warn('[llm-observability] invocation unexpected error', {
      provider: opts.provider,
      requestedModel: opts.requestedModel,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
