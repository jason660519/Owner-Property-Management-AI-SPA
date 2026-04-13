/**
 * Anthropic credit guard: low-balance alert + circuit breaker.
 *
 * Tracks Paperclip task spend (paperclip_tasks.cost_usd) against an
 * operator-configured credit budget. When remaining balance drops below
 * alert_threshold_usd a Paperclip board notification is created. When it
 * drops below circuit_breaker_threshold_usd, new task dispatch is blocked.
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

export interface PaperclipAlertConfig {
  baseUrl: string;
  companyId: string;
  apiKey: string;
  projectId?: string;
}

// Minimal Supabase query interface (testable without the real client).
// Mirrors the pattern in agent-cost-guard.ts (AuditLogReader).
interface TerminalQuery {
  then: PromiseLike<{ data: unknown; error: unknown }>['then'];
}
interface FilterBuilder extends TerminalQuery {
  gte(col: string, val: string): FilterBuilder;
  in(col: string, vals: string[]): FilterBuilder;
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
 * Sum cost_usd from completed Paperclip tasks since tracking_start_at.
 * Only counts rows with status='succeeded' (terminal success).
 * Returns 0 on DB error so the guard degrades gracefully.
 */
export async function getPaperclipSpendUsd(
  db: CreditGuardReader,
  trackingStartAt: string,
): Promise<number> {
  try {
    const { data, error } = await db
      .from('paperclip_tasks')
      .select('cost_usd')
      .gte('created_at', trackingStartAt)
      .in('status', ['succeeded']);

    if (error) {
      console.warn('[credit-guard] failed to query task spend:', error);
      return 0;
    }
    if (!Array.isArray(data)) return 0;

    return (data as Array<{ cost_usd: number | null }>).reduce(
      (sum, row) => sum + (row.cost_usd ?? 0),
      0,
    );
  } catch (err) {
    console.warn('[credit-guard] exception querying task spend:', err);
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

// ── Alert (Paperclip board notification) ──────────────────────────────────

/**
 * Create a high-priority Paperclip issue as a board alert.
 * Failures are swallowed — the alert is best-effort, the guard still runs.
 */
export async function firePaperclipAlert(
  paperclip: PaperclipAlertConfig,
  creditStatus: CreditGuardStatus,
): Promise<void> {
  const urgency = creditStatus.status === 'critical' ? 'CRITICAL' : 'WARNING';
  const title = `[${urgency}] Anthropic credit low-balance detected`;

  const rows = [
    `| Configured total | $${creditStatus.configuredCreditsUsd.toFixed(2)} |`,
    `| Spent (tracked period) | $${creditStatus.spentUsd.toFixed(2)} |`,
    `| **Remaining** | **$${creditStatus.remainingUsd.toFixed(2)}** |`,
    `| Alert threshold | $${creditStatus.alertThresholdUsd.toFixed(2)} |`,
    `| Circuit breaker threshold | $${creditStatus.circuitBreakerThresholdUsd.toFixed(2)} |`,
  ].join('\n');

  const actionNote =
    creditStatus.status === 'critical'
      ? '**Circuit breaker has been activated — new Paperclip task dispatch is paused.**\n\n'
        + 'To restore: top up Anthropic credits, then call `POST /api/ai-billing/anthropic` '
        + 'with `{ "total_credits_usd": <new_total>, "reset_circuit_breaker": true }`.'
      : 'Please top up Anthropic credits soon to avoid service interruption.\n\n'
        + 'After topping up, call `POST /api/ai-billing/anthropic` '
        + 'with `{ "total_credits_usd": <new_total> }` to update the budget.';

  const description =
    `## Anthropic Credit Alert\n\n`
    + `**Status:** ${creditStatus.status.toUpperCase()}\n\n`
    + `| Metric | Value |\n| :--- | :--- |\n`
    + rows
    + `\n\n`
    + actionNote;

  try {
    const base = paperclip.baseUrl.replace(/\/+$/, '');
    const res = await fetch(`${base}/api/companies/${encodeURIComponent(paperclip.companyId)}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paperclip.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        description,
        priority: creditStatus.status === 'critical' ? 'critical' : 'high',
        ...(paperclip.projectId ? { projectId: paperclip.projectId } : {}),
      }),
    });
    if (!res.ok) {
      console.warn(`[credit-guard] alert issue creation failed (${res.status})`);
    } else {
      console.log(`[credit-guard] alert issued: ${urgency} — $${creditStatus.remainingUsd.toFixed(2)} remaining`);
    }
  } catch (err) {
    console.warn('[credit-guard] failed to fire Paperclip alert:', err instanceof Error ? err.message : err);
  }
}

// ── Main orchestration ─────────────────────────────────────────────────────

/**
 * Run one credit guard cycle:
 *   1. Load config from DB (returns null if missing).
 *   2. Rate-limit: skip if last check was < 5 minutes ago.
 *   3. Compute spend from paperclip_tasks since tracking_start_at.
 *   4. Evaluate alert / circuit-breaker thresholds.
 *   5. Update circuit breaker state (trip or restore).
 *   6. Fire a Paperclip alert if balance is low/critical and cooldown passed.
 *   7. Persist updated state to DB.
 *
 * Safe to call on every poll tick — internally rate-limited.
 * Returns null if config is missing or the check was skipped.
 */
export async function runCreditGuardCycle(
  db: CreditGuardReader,
  paperclip: PaperclipAlertConfig,
): Promise<CreditGuardStatus | null> {
  const config = await loadCreditGuardConfig(db);
  if (!config) return null;

  const now = new Date();
  if (!shouldRunCreditCheck(config, now)) return null;

  const spentUsd = await getPaperclipSpendUsd(db, config.tracking_start_at);
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
    await firePaperclipAlert(paperclip, creditStatus);
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
