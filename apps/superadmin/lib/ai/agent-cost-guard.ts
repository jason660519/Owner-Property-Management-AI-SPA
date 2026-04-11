/**
 * Phase 2.5: Guardrails enforcement for the "模型選擇與設定" feature.
 *
 * This module adds the cost half of `AgentGuardrails` — when an agent has
 * `max_monthly_usd` set, callers can gate LLM invocations on the accumulated
 * spend for the current calendar month. Data source is
 * `ai_prompt_audit_logs`, which already records per-call
 * `(provider, model_id, input_tokens, output_tokens)`.
 *
 * Pricing comes from the static `AI_PROVIDERS` catalogue, so the cost is
 * computed at query time rather than stored. Unknown (provider, model_id)
 * pairs fall back to `0`; we log a warning so the gap is visible.
 *
 * Design notes
 * ------------
 * - Pure functions (`computeCostUsd`, `startOfCurrentMonthUtc`,
 *   `evaluateMonthlyCap`) are easy to unit-test.
 * - `getAgentMonthlySpendUsd()` accepts a loose `AuditLogReader` to stay
 *   decoupled from the Supabase client type (same trick the resolver uses).
 * - Audit logs still store the *legacy* `module_key` (e.g. `online_ocr_parse`),
 *   so we expand each canonical agent_key into all aliases that map to it
 *   via `LEGACY_MODULE_KEY_ALIASES` before querying.
 */

import { AI_PROVIDERS } from '@/lib/ai-providers';
import type { AgentGuardrails } from '@/lib/types/agent-assignment';
import { LEGACY_MODULE_KEY_ALIASES } from '@/lib/ai/resolve-agent-model';

// ---------------------------------------------------------------------------
// Pricing lookup
// ---------------------------------------------------------------------------

interface PriceEntry {
  inputPricePer1M: number;
  outputPricePer1M: number;
}

const PRICE_INDEX: Map<string, PriceEntry> = (() => {
  const map = new Map<string, PriceEntry>();
  for (const provider of AI_PROVIDERS) {
    for (const model of provider.models) {
      map.set(`${provider.id}::${model.id}`, {
        inputPricePer1M: model.inputPrice,
        outputPricePer1M: model.outputPrice,
      });
    }
  }
  return map;
})();

/**
 * Best-effort cost calculation. Returns 0 and logs a warning for
 * unknown (provider, model_id) pairs so the caller can keep going rather
 * than crashing an entire batch.
 *
 * Exported so callers can invoke it directly for non-logged estimates
 * (e.g. cost-aware fallback selection).
 */
export function computeCostUsd(
  provider: string,
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const entry = PRICE_INDEX.get(`${provider}::${modelId}`);
  if (!entry) {
    if (inputTokens > 0 || outputTokens > 0) {
      console.warn(
        `[agent-cost-guard] Unknown pricing for ${provider}/${modelId}; treating cost as $0`,
      );
    }
    return 0;
  }
  const input = Math.max(0, inputTokens) / 1_000_000;
  const output = Math.max(0, outputTokens) / 1_000_000;
  return input * entry.inputPricePer1M + output * entry.outputPricePer1M;
}

// ---------------------------------------------------------------------------
// Month window helper
// ---------------------------------------------------------------------------

/** First instant of the current calendar month in UTC. */
export function startOfCurrentMonthUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

// ---------------------------------------------------------------------------
// Legacy key reverse lookup
// ---------------------------------------------------------------------------

/**
 * Given a canonical agent_key, return every legacy module_key that maps to
 * it (including the canonical key itself). Used to query audit logs that
 * still write rows under pre-Phase-2 module_key names.
 */
export function legacyKeysForAgent(canonicalKey: string): string[] {
  const result = new Set<string>([canonicalKey]);
  for (const [legacy, canonical] of Object.entries(LEGACY_MODULE_KEY_ALIASES)) {
    if (canonical === canonicalKey) result.add(legacy);
  }
  return [...result];
}

// ---------------------------------------------------------------------------
// DB reader contract
// ---------------------------------------------------------------------------

/**
 * Minimal shape `getAgentMonthlySpendUsd` needs from the Supabase admin client.
 * Deliberately loose (string tables, `PromiseLike` results) so both the real
 * client and test doubles satisfy it. Mirrors `AgentAssignmentReader`.
 *
 * Supports two chain patterns:
 *   1. `.from().select().in().gte().eq()` — legacy query used when the
 *      audit table doesn't yet have an `agent_key` column (pre-migration).
 *   2. `.from().select().or().gte().eq()` — Phase 2.5 query that hits
 *      EITHER `agent_key = canonical` OR `module_key IN (...legacy aliases)`
 *      in a single round-trip via Supabase's PostgREST `.or()` clause.
 */
export interface AuditLogReader {
  from(table: string): {
    select(columns: string): {
      in(
        column: string,
        values: string[],
      ): {
        gte(
          column: string,
          value: string,
        ): {
          eq(
            column: string,
            value: string,
          ): PromiseLike<{ data: unknown; error: unknown }>;
        };
      };
      or(
        filters: string,
      ): {
        gte(
          column: string,
          value: string,
        ): {
          eq(
            column: string,
            value: string,
          ): PromiseLike<{ data: unknown; error: unknown }>;
        };
      };
    };
  };
}

interface AuditLogRow {
  provider: string;
  model_id: string;
  input_tokens: number | null;
  output_tokens: number | null;
}

// ---------------------------------------------------------------------------
// Monthly spend aggregation
// ---------------------------------------------------------------------------

export interface MonthlySpendQueryOptions {
  /** Override the month window start — primarily for tests. */
  monthStart?: Date;
  /**
   * When true, DB errors are swallowed and the function returns 0. Default
   * true — guardrails should never brick a working agent because the audit
   * table hiccupped.
   */
  fallbackOnDbError?: boolean;
}

/**
 * Sum USD spend for `agent_key` since the start of the current month.
 *
 * Phase 2.5+ rows carry a proper `agent_key` column (migration
 * 20260412120000); pre-migration rows only have the legacy `module_key`.
 * The query therefore uses a PostgREST `.or()` clause so ONE round-trip
 * matches both shapes:
 *
 *   agent_key.eq.<canonical>  OR  module_key.in.(<legacy aliases>)
 *
 * `legacyKeysForAgent()` returns the canonical key plus every legacy
 * alias that maps to it — the canonical key is also a valid legacy
 * `module_key` value for the rows that happened to use it directly,
 * so this covers every historical shape.
 */
export async function getAgentMonthlySpendUsd(
  supabase: AuditLogReader,
  agentKey: string,
  options: MonthlySpendQueryOptions = {},
): Promise<number> {
  const { monthStart = startOfCurrentMonthUtc(), fallbackOnDbError = true } = options;
  const legacyKeys = legacyKeysForAgent(agentKey);
  const orFilter = `agent_key.eq.${agentKey},module_key.in.(${legacyKeys.join(',')})`;

  try {
    const { data, error } = await supabase
      .from('ai_prompt_audit_logs')
      .select('provider, model_id, input_tokens, output_tokens')
      .or(orFilter)
      .gte('created_at', monthStart.toISOString())
      .eq('status', 'success');

    if (error) {
      if (!fallbackOnDbError) throw error;
      console.warn(
        `[agent-cost-guard] failed to read audit logs for agent_key=${agentKey}; returning 0`,
        error,
      );
      return 0;
    }

    if (!Array.isArray(data)) return 0;

    let total = 0;
    for (const row of data as AuditLogRow[]) {
      total += computeCostUsd(
        row.provider,
        row.model_id,
        row.input_tokens ?? 0,
        row.output_tokens ?? 0,
      );
    }
    return total;
  } catch (err) {
    if (!fallbackOnDbError) throw err;
    console.warn(
      `[agent-cost-guard] exception reading audit logs for agent_key=${agentKey}; returning 0`,
      err,
    );
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Guardrail evaluators (pure)
// ---------------------------------------------------------------------------

export interface MonthlyCapVerdict {
  allowed: boolean;
  spentUsd: number;
  capUsd: number | null;
  reason?: 'monthly_cap_exceeded';
}

/**
 * Pure predicate: given current month's spend and the agent's guardrails,
 * decide whether a new call is allowed. If `max_monthly_usd` is undefined
 * or ≤ 0, the cap is treated as off (always allowed).
 *
 * `>=` semantics: once spend reaches the cap we stop. This is deliberately
 * aggressive — we'd rather block one extra call than silently overshoot.
 */
export function evaluateMonthlyCap(
  spentUsd: number,
  guardrails: AgentGuardrails,
): MonthlyCapVerdict {
  const cap = guardrails.max_monthly_usd;
  if (cap === undefined || cap <= 0) {
    return { allowed: true, spentUsd, capUsd: null };
  }
  if (spentUsd >= cap) {
    return { allowed: false, spentUsd, capUsd: cap, reason: 'monthly_cap_exceeded' };
  }
  return { allowed: true, spentUsd, capUsd: cap };
}

// ---------------------------------------------------------------------------
// Convenience: one-shot check
// ---------------------------------------------------------------------------

/**
 * Query the audit table + evaluate the cap in one call. Useful for callsites
 * that just want a yes/no answer before invoking an LLM.
 */
export async function checkAgentBudget(
  supabase: AuditLogReader,
  agentKey: string,
  guardrails: AgentGuardrails,
  options?: MonthlySpendQueryOptions,
): Promise<MonthlyCapVerdict> {
  const spent = await getAgentMonthlySpendUsd(supabase, agentKey, options);
  return evaluateMonthlyCap(spent, guardrails);
}

// ---------------------------------------------------------------------------
// Phase 2.5+ : cost-aware fallback chain walking
// ---------------------------------------------------------------------------

/**
 * Estimator signature. Returns the projected USD cost of invoking a
 * specific chain link once, given the caller's own knowledge of prompt
 * size and `max_tokens`. Must be pure and synchronous — the walker calls
 * it for every link in the chain and does NOT cache results.
 */
export interface LinkCostEstimate {
  provider: string;
  model_id: string;
  /**
   * Estimated worst-case cost for a single call. Callers typically pass
   * `computeCostUsd(provider, model_id, promptTokens, maxTokens)` so it
   * represents the upper bound if the model uses its full output budget.
   */
  estimateUsd: number;
}

export interface AffordableLinkOptions {
  /** Current month spend (same units as capUsd). */
  spentUsd: number;
  /** The guardrail cap. `null` → no cap → every link is affordable. */
  capUsd: number | null;
  /**
   * Projected cost per link. Must include an entry for every chain link
   * by `${provider}::${model_id}`; missing entries are treated as 0.
   */
  estimates: readonly LinkCostEstimate[];
}

export interface AffordableLinkPick<T> {
  /** The link that fits within the remaining budget. */
  link: T;
  /** Its index in the original chain. */
  index: number;
  /** Original chain indices that were skipped because they exceeded the budget. */
  skipped: number[];
  /** Projected cost at the moment of selection. */
  estimatedUsd: number;
  /** Remaining budget BEFORE this link runs. `null` when cap is off. */
  remainingUsd: number | null;
}

/**
 * Walk the chain in order and return the first link whose estimated cost
 * fits into the remaining monthly budget. Returns `null` if every link
 * would push spend past the cap — callers should then surface a
 * `monthly_cap_exceeded` error.
 *
 * The chain's own `trigger` values (rate_limit / error / cost_over) are
 * NOT consulted here — this helper is concerned with PROACTIVE cost
 * protection, independent of runtime trigger handling. A future iteration
 * could prefer links tagged `cost_over` when skipping, but doing so
 * adds complexity without changing the end-user outcome.
 */
export function selectAffordableLink<
  T extends { provider: string; model_id: string },
>(
  chain: readonly T[],
  opts: AffordableLinkOptions,
): AffordableLinkPick<T> | null {
  const { spentUsd, capUsd, estimates } = opts;

  // Build a key lookup once.
  const estimateByKey = new Map<string, number>();
  for (const e of estimates) {
    estimateByKey.set(`${e.provider}::${e.model_id}`, e.estimateUsd);
  }

  const skipped: number[] = [];
  for (let i = 0; i < chain.length; i++) {
    const link = chain[i];
    const key = `${link.provider}::${link.model_id}`;
    const est = estimateByKey.get(key) ?? 0;

    // `capUsd == null` → no cap → always affordable.
    if (capUsd == null) {
      return {
        link,
        index: i,
        skipped,
        estimatedUsd: est,
        remainingUsd: null,
      };
    }
    const projected = spentUsd + est;
    // Strictly `<` — if the projected spend would equal the cap we still
    // allow the call (parallel to `evaluateMonthlyCap` which blocks on `>=`
    // AFTER the call completes). The two rules together prevent double-dip.
    if (projected <= capUsd) {
      return {
        link,
        index: i,
        skipped,
        estimatedUsd: est,
        remainingUsd: Math.max(0, capUsd - spentUsd),
      };
    }
    skipped.push(i);
  }
  return null;
}

/**
 * Convenience: build a per-link estimate array from a uniform prompt-token
 * and max-tokens pair. This is what most callers need — they know the
 * same prompt is going to every candidate, so it's silly to repeat the
 * loop at every callsite.
 */
export function estimateChainCosts<
  T extends { provider: string; model_id: string },
>(
  chain: readonly T[],
  promptTokens: number,
  maxOutputTokens: number,
): LinkCostEstimate[] {
  return chain.map((link) => ({
    provider: link.provider,
    model_id: link.model_id,
    estimateUsd: computeCostUsd(link.provider, link.model_id, promptTokens, maxOutputTokens),
  }));
}
