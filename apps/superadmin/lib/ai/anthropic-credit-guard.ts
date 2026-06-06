/**
 * Anthropic credit guard: low-balance alert + circuit breaker.
 *
 * Tracks Anthropic spend (derived from `ai_prompt_audit_logs`) against an
 * operator-configured credit budget. When remaining balance drops below
 * alert_threshold_usd an alert event is recorded (best-effort). When it
 * drops below circuit_breaker_threshold_usd, callers can treat the guard as
 * "paused" and stop non-essential Anthropic usage.
 *
 * Background: the 2026-04-13 outage (VIS-48) showed that Anthropic credit
 * exhaustion fails silently for hours. This module adds proactive detection.
 *
 * Design notes
 * ------------
 * - Pure helpers (evaluateCreditStatus, shouldFireAlert, shouldRunCreditCheck)
 *   are easy to unit-test with no DB or network access.
 * - CreditGuardReader is a minimal interface satisfied by the Supabase admin
 *   client (same testability pattern as AuditLogReader in agent-cost-guard.ts).
 * - runCreditGuardCycle is the main orchestration entry point; it is
 *   rate-limited internally to every 5 minutes and is safe to call on every
 *   poll tick.
 */

import { computeCostUsd } from '@/lib/ai/agent-cost-guard';

// ── Types ──────────────────────────────────────────────────────────────────

export interface CreditGuardConfig {
  id: string;
  total_credits_usd: number;
  tracking_start_at: string;
  alert_threshold_usd: number;
  circuit_breaker_threshold_usd: number;
  circuit_breaker_active: boolean;
  circuit_breaker_tripped_at: string | null;
  circuit_breaker_restored_at: string | null;
  last_alert_fired_at: string | null;
  last_balance_check_at: string | null;
}

export interface CreditGuardStatus {
  configuredCreditsUsd: number;
  spentUsd: number;
  remainingUsd: number;
  alertThresholdUsd: number;
  circuitBreakerThresholdUsd: number;
  circuitBreakerActive: boolean;
  /** 'ok' | 'low' (below alert threshold) | 'critical' (CB should trip) */
  status: 'ok' | 'low' | 'critical';
  lastCheckedAt: string;
}

// Minimal Supabase query interface (testable without the real client).
// Mirrors the pattern in agent-cost-guard.ts (AuditLogReader).
interface TerminalQuery {
  then: PromiseLike<{ data: unknown; error: unknown }>['then'];
}
interface FilterBuilder extends TerminalQuery {
  gte(col: string, val: string): FilterBuilder;
  eq(col: string, val: string): FilterBuilder;
  maybeSingle(): PromiseLike<{ data: unknown; error: unknown }>;
}
interface TableBuilder {
  select(cols: string): FilterBuilder;
  update(data: Record<string, unknown>): FilterBuilder;
}

export interface CreditGuardReader {
  from(table: string): TableBuilder;
}

// ── DB helpers ─────────────────────────────────────────────────────────────

/**
 * Load the singleton credit guard config row.
 * Returns null if the table is not yet seeded or on DB error.
 */
export async function loadCreditGuardConfig(
  db: CreditGuardReader,
): Promise<CreditGuardConfig | null> {
  try {
    const { data, error } = await db
      .from('anthropic_credit_guard')
      .select('*')
      .maybeSingle();
    if (error) {
      console.warn('[credit-guard] failed to load config:', error);
      return null;
    }
    return (data as CreditGuardConfig | null) ?? null;
  } catch (err) {
    console.warn('[credit-guard] exception loading config:', err);
    return null;
  }
}

/**
 * Sum USD spend for Anthropic calls since tracking_start_at using audit logs.
 * Returns 0 on DB error so the guard degrades gracefully.
 */
export async function getAnthropicSpendUsd(
  db: CreditGuardReader,
  trackingStartAt: string,
): Promise<number> {
  try {
    const { data, error } = await db
      .from('ai_prompt_audit_logs')
      .select('provider, model_id, input_tokens, output_tokens')
      .gte('created_at', trackingStartAt)
      .eq('provider', 'anthropic')
      .eq('status', 'success');

    if (error) {
      console.warn('[credit-guard] failed to query audit log spend:', error);
      return 0;
    }
    if (!Array.isArray(data)) return 0;

    let total = 0;
    for (const row of data as Array<{
      provider: string;
      model_id: string;
      input_tokens: number | null;
      output_tokens: number | null;
    }>) {
      total += computeCostUsd(
        row.provider,
        row.model_id,
        row.input_tokens ?? 0,
        row.output_tokens ?? 0,
      );
    }
    return total;
  } catch (err) {
    console.warn('[credit-guard] exception querying audit log spend:', err);
    return 0;
  }
}

// ── Pure evaluation ────────────────────────────────────────────────────────

/**
 * Compute credit status from config + spend. Pure — no I/O.
 * Status semantics:
 *   'ok'       — above alert threshold, no action needed
 *   'low'      — below alert threshold, fire a warning alert
 *   'critical' — below circuit breaker threshold, pause new task dispatch
 */
export function evaluateCreditStatus(
  config: CreditGuardConfig,
  spentUsd: number,
): CreditGuardStatus {
  const remaining = Math.max(0, config.total_credits_usd - spentUsd);

  let status: 'ok' | 'low' | 'critical';
  if (remaining < config.circuit_breaker_threshold_usd) {
    status = 'critical';
  } else if (remaining < config.alert_threshold_usd) {
    status = 'low';
  } else {
    status = 'ok';
  }

  return {
    configuredCreditsUsd: config.total_credits_usd,
    spentUsd,
    remainingUsd: remaining,
    alertThresholdUsd: config.alert_threshold_usd,
    circuitBreakerThresholdUsd: config.circuit_breaker_threshold_usd,
    circuitBreakerActive: config.circuit_breaker_active,
    status,
    lastCheckedAt: new Date().toISOString(),
  };
}

// ── Alert dedup / rate-limit ───────────────────────────────────────────────

/** Minimum quiet period between consecutive alerts (6 hours). */
const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000;

/** Minimum interval between credit guard DB checks (5 minutes). */
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

/** True if enough time has elapsed since the last alert to fire another. */
export function shouldFireAlert(
  config: CreditGuardConfig,
  now: Date = new Date(),
): boolean {
  if (!config.last_alert_fired_at) return true;
  return now.getTime() - new Date(config.last_alert_fired_at).getTime() >= ALERT_COOLDOWN_MS;
}

/** True if the credit guard check should run (respects 5-minute rate limit). */
export function shouldRunCreditCheck(
  config: CreditGuardConfig,
  now: Date = new Date(),
): boolean {
  if (!config.last_balance_check_at) return true;
  return now.getTime() - new Date(config.last_balance_check_at).getTime() >= CHECK_INTERVAL_MS;
}

// ── Main orchestration ─────────────────────────────────────────────────────

/**
 * Run one credit guard cycle:
 *   1. Load config from DB (returns null if missing).
 *   2. Rate-limit: skip if last check was < 5 minutes ago.
 *   3. Compute spend from ai_prompt_audit_logs since tracking_start_at.
 *   4. Evaluate alert / circuit-breaker thresholds.
 *   5. Update circuit breaker state (trip or restore).
 *   6. Record an alert event (best-effort) if balance is low/critical and cooldown passed.
 *   7. Persist updated state back to DB.
 *
 * Safe to call on every poll tick — internally rate-limited.
 * Returns null if config is missing or the check was skipped.
 */
export async function runCreditGuardCycle(
  db: CreditGuardReader,
): Promise<CreditGuardStatus | null> {
  const config = await loadCreditGuardConfig(db);
  if (!config) return null;

  const now = new Date();
  if (!shouldRunCreditCheck(config, now)) return null;

  const spentUsd = await getAnthropicSpendUsd(db, config.tracking_start_at);
  const creditStatus = evaluateCreditStatus(config, spentUsd);

  const updates: Record<string, unknown> = {
    last_balance_check_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  // Trip circuit breaker when balance hits critical threshold.
  if (creditStatus.status === 'critical' && !config.circuit_breaker_active) {
    updates.circuit_breaker_active = true;
    updates.circuit_breaker_tripped_at = now.toISOString();
    console.warn(
      `[credit-guard] circuit breaker TRIPPED — $${creditStatus.remainingUsd.toFixed(2)} remaining`,
    );
  }

  // Restore circuit breaker when balance recovers above CB threshold
  // (e.g., after operator tops up credits and updates total_credits_usd).
  if (config.circuit_breaker_active && creditStatus.status !== 'critical') {
    updates.circuit_breaker_active = false;
    updates.circuit_breaker_restored_at = now.toISOString();
    console.log(
      `[credit-guard] circuit breaker RESTORED — $${creditStatus.remainingUsd.toFixed(2)} remaining`,
    );
  }

  // Fire alert when balance is low or critical and cooldown has passed.
  if (
    (creditStatus.status === 'low' || creditStatus.status === 'critical') &&
    shouldFireAlert(config, now)
  ) {
    console.warn(
      `[credit-guard] low balance: status=${creditStatus.status} remaining=$${creditStatus.remainingUsd.toFixed(2)}`,
    );
    updates.last_alert_fired_at = now.toISOString();
  }

  // Persist state.
  await db.from('anthropic_credit_guard').update(updates).eq('id', config.id);

  // Return status with the latest CB state (may differ from config snapshot).
  const finalCbActive =
    typeof updates.circuit_breaker_active === 'boolean'
      ? updates.circuit_breaker_active
      : config.circuit_breaker_active;

  return { ...creditStatus, circuitBreakerActive: finalCbActive };
}
