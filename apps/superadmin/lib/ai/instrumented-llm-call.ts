import { estimateCostUsd, inferProvider } from './llm-price-map';
import { logLLMObservabilityInvocation } from './observability';
import { createAdminClient } from '@/utils/supabase/admin';

export interface LLMUsageReport {
  provider: string;
  model: string;
  userId: string | null | undefined;
  moduleKey?: string | null;
  inputPrompt?: string | null;
  outputText?: string | null;
  tokensInput?: number | null;
  tokensOutput?: number | null;
  httpStatus?: number | null;
  startedAt: string;
  startMs: number;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Report a completed LLM call to the observability system.
 * Best-effort: swallows all errors to avoid disrupting the caller.
 * Call with `void reportLLMUsage(...)` to fire-and-forget.
 */
export async function reportLLMUsage(report: LLMUsageReport): Promise<void> {
  try {
    const endedAt = new Date().toISOString();
    const e2eMs = Date.now() - report.startMs;

    const tokensIn = report.tokensInput ?? estimateTokensFromText(report.inputPrompt);
    const tokensOut = report.tokensOutput ?? estimateTokensFromText(report.outputText);
    const costUsd = estimateCostUsd(report.model, tokensIn ?? 0, tokensOut ?? 0);

    const provider = report.provider || inferProvider(report.model) || 'unknown';

    const client = createAdminClient();
    await logLLMObservabilityInvocation({
      client,
      sourceKind: 'llm_call',
      userId: report.userId ?? null,
      provider,
      requestedModel: report.model,
      effectiveModel: report.model,
      inputPrompt: report.inputPrompt ?? null,
      renderedOutput: report.outputText ?? null,
      tokensInput: tokensIn,
      tokensOutput: tokensOut,
      costUsd,
      e2eMs,
      httpStatus: report.httpStatus ?? null,
      status: report.errorMessage ? 'error' : 'success',
      errorMessage: report.errorMessage ?? null,
      startedAt: report.startedAt,
      endedAt,
      metadata: {
        ...(report.metadata ?? {}),
        moduleKey: report.moduleKey ?? null,
      },
      trace: {
        client,
        traceKey: `llm-call:${provider}:${report.model}:${report.startedAt}`,
        userId: report.userId ?? null,
        moduleKey: report.moduleKey ?? null,
        invocationName: report.model,
        executionName: provider,
        status: report.errorMessage ? 'error' : 'success',
        startedAt: report.startedAt,
        endedAt,
      },
    });
  } catch (err) {
    console.warn('[instrumented-llm-call] reportLLMUsage failed (non-blocking):', err);
  }
}

/**
 * Rough token estimate: ~4 characters per token (GPT-style BPE average).
 * Returns null for null/empty inputs.
 */
function estimateTokensFromText(text: string | null | undefined): number | null {
  if (!text) return null;
  return Math.ceil(text.length / 4);
}
