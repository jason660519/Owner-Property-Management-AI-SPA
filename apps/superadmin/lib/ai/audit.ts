// =============================================================================
// Prompt audit — persistent trail for every LLM call.
// See docs/ai-prompt-safety-guide.md §8 for the full spec.
//
// Usage:
//   const audit = startPromptAudit({ moduleKey, provider, modelId, userId, ... });
//   try {
//     const result = await callLLM(...);
//     await audit.complete('success', { inputTokens, outputTokens });
//   } catch (err) {
//     await audit.complete('api_error', { errorMessage: err.message });
//   }
//
// The helper is intentionally best-effort — it never throws back into the
// caller, because a failed audit write must not block the actual LLM call.
// =============================================================================

import { createAdminClient } from '@/utils/supabase/admin';

import { detectInjectionAttempt, sha256Hex } from './prompt-safety';

type AdminClient = ReturnType<typeof createAdminClient>;

export type PromptAuditStatus =
  | 'success'
  | 'schema_mismatch'
  | 'api_error'
  | 'rate_limited'
  | 'blocked'
  | 'prompt_not_found';

export interface StartPromptAuditOptions {
  /** Canonical module_key (e.g. 'transcript.parse'). */
  moduleKey: string;
  /** LLM provider name (openai / anthropic / gemini / ...). */
  provider: string;
  /** Model identifier as sent to the provider. */
  modelId: string;
  /** User triggering the call, when known. */
  userId?: string | null;
  /** saved_prompts.id the system prompt came from. */
  savedPromptId?: string | null;
  /** ai_system_prompts.id the system prompt came from. */
  aiSystemPromptId?: string | null;
  /** Free-form label of where the prompt came from (e.g. 'saved_prompts_module_key'). */
  promptSource?: string | null;
  /**
   * The raw user-controlled input, used to compute the SHA-256 fingerprint
   * and injection-pattern hit list. Plaintext is NEVER persisted — only the
   * hash, length, and injection flag names.
   */
  userInput?: string | null;
  /** Optional pre-computed injection hits (e.g. already detected upstream). */
  injectionHits?: string[];
  /** Inject a client for tests. */
  client?: AdminClient;
}

export interface CompletePromptAuditOptions {
  inputTokens?: number | null;
  outputTokens?: number | null;
  errorMessage?: string | null;
  /**
   * Override the latency calculation. Normally computed from the start
   * timestamp; set this to skip or override.
   */
  latencyMs?: number | null;
}

export interface PromptAuditHandle {
  /** Finalize and write the audit row. Safe to await; never throws. */
  complete(
    status: PromptAuditStatus,
    opts?: CompletePromptAuditOptions,
  ): Promise<void>;
}

/**
 * Begin a prompt-audit row. Call `.complete()` exactly once when the LLM
 * call finishes (success or failure).
 *
 * Errors inside the audit path are logged but never rethrown — the audit
 * system is observational and must not break the actual LLM flow.
 */
export function startPromptAudit(
  opts: StartPromptAuditOptions,
): PromptAuditHandle {
  const startedAt = Date.now();
  const client = opts.client ?? createAdminClient();

  // Compute input fingerprint synchronously so the hash reflects the input
  // at the exact moment the audit was started (before any mutation).
  const input = opts.userInput ?? null;
  const inputHash = input ? sha256Hex(input) : null;
  const inputLength = input != null ? input.length : null;
  const injectionHits = opts.injectionHits ?? (input ? detectInjectionAttempt(input) : []);

  let finalized = false;

  return {
    async complete(status, completeOpts = {}) {
      if (finalized) {
        console.warn('[prompt-audit] complete() called twice for the same handle', {
          moduleKey: opts.moduleKey,
        });
        return;
      }
      finalized = true;

      const latencyMs =
        completeOpts.latencyMs ?? Math.max(0, Date.now() - startedAt);

      const row = {
        user_id: opts.userId ?? null,
        module_key: opts.moduleKey,
        provider: opts.provider,
        model_id: opts.modelId,
        saved_prompt_id: opts.savedPromptId ?? null,
        ai_system_prompt_id: opts.aiSystemPromptId ?? null,
        prompt_source: opts.promptSource ?? null,
        user_input_sha256: inputHash,
        user_input_length: inputLength,
        injection_flags: injectionHits,
        input_tokens: completeOpts.inputTokens ?? null,
        output_tokens: completeOpts.outputTokens ?? null,
        latency_ms: latencyMs,
        status,
        error_message: completeOpts.errorMessage ?? null,
      };

      try {
        const { error } = await client.from('ai_prompt_audit_logs').insert(row);
        if (error) {
          console.warn('[prompt-audit] insert failed', {
            moduleKey: opts.moduleKey,
            message: error.message,
          });
        }
      } catch (err) {
        console.warn('[prompt-audit] unexpected error', {
          moduleKey: opts.moduleKey,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
  };
}

/**
 * One-shot helper that writes a single audit row without the start/complete
 * split. Use this for call sites where you already have every field up front
 * (e.g. blocked-before-call paths).
 */
export async function logPromptAudit(
  opts: StartPromptAuditOptions & {
    status: PromptAuditStatus;
    inputTokens?: number | null;
    outputTokens?: number | null;
    errorMessage?: string | null;
    latencyMs?: number | null;
  },
): Promise<void> {
  const { status, inputTokens, outputTokens, errorMessage, latencyMs, ...rest } = opts;
  const handle = startPromptAudit(rest);
  await handle.complete(status, { inputTokens, outputTokens, errorMessage, latencyMs });
}
