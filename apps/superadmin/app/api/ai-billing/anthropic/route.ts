// GET  /api/ai-billing/anthropic — current credit guard status + config
// POST /api/ai-billing/anthropic — update config (total_credits_usd, thresholds,
//                                  tracking_start_at, reset_circuit_breaker)
//
// Used by the superadmin dashboard and by operators after topping up credits.
// Only accessible server-side (PAPERCLIP_API_KEY gated in middleware).

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import {
  loadCreditGuardConfig,
  getPaperclipSpendUsd,
  evaluateCreditStatus,
  type CreditGuardReader,
} from '@/lib/ai/anthropic-credit-guard';

export async function GET(request: NextRequest) {
  const authResult = await requireSuperadmin({
    request,
    allowHeaderFallback: false,
    routeLabel: 'api/ai-billing/anthropic',
  });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const supabase = createAdminClient() as unknown as CreditGuardReader;

  const config = await loadCreditGuardConfig(supabase);
  if (!config) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Credit guard not initialised. Run migration 20260413200000 and seed the anthropic_credit_guard table.',
      },
      { status: 404 },
    );
  }

  const spentUsd = await getPaperclipSpendUsd(supabase, config.tracking_start_at);
  const status = evaluateCreditStatus(config, spentUsd);

  return NextResponse.json({ ok: true, config, status });
}

interface ConfigureBody {
  /** Total Anthropic credits purchased since tracking_start_at. Update after top-up. */
  total_credits_usd?: number;
  /** Fire alert when remaining drops below this. Default: 10 */
  alert_threshold_usd?: number;
  /** Trip circuit breaker when remaining drops below this. Default: 5 */
  circuit_breaker_threshold_usd?: number;
  /** ISO-8601. Reset to now when resetting after a top-up. */
  tracking_start_at?: string;
  /** When true, clears circuit_breaker_active + last_alert_fired_at. */
  reset_circuit_breaker?: boolean;
}

export async function POST(request: NextRequest) {
  const authResult = await requireSuperadmin({
    request,
    allowHeaderFallback: false,
    routeLabel: 'api/ai-billing/anthropic',
  });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const adminClient = createAdminClient();
  const supabase = adminClient as unknown as CreditGuardReader;

  let body: ConfigureBody;
  try {
    body = (await request.json()) as ConfigureBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  const config = await loadCreditGuardConfig(supabase);
  if (!config) {
    return NextResponse.json(
      { ok: false, error: 'Credit guard not initialised.' },
      { status: 404 },
    );
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.total_credits_usd !== undefined) {
    if (typeof body.total_credits_usd !== 'number' || body.total_credits_usd < 0) {
      return NextResponse.json(
        { ok: false, error: 'total_credits_usd must be a non-negative number.' },
        { status: 400 },
      );
    }
    updates.total_credits_usd = body.total_credits_usd;
  }

  if (body.alert_threshold_usd !== undefined) {
    if (typeof body.alert_threshold_usd !== 'number' || body.alert_threshold_usd < 0) {
      return NextResponse.json(
        { ok: false, error: 'alert_threshold_usd must be a non-negative number.' },
        { status: 400 },
      );
    }
    updates.alert_threshold_usd = body.alert_threshold_usd;
  }

  if (body.circuit_breaker_threshold_usd !== undefined) {
    if (
      typeof body.circuit_breaker_threshold_usd !== 'number' ||
      body.circuit_breaker_threshold_usd < 0
    ) {
      return NextResponse.json(
        { ok: false, error: 'circuit_breaker_threshold_usd must be a non-negative number.' },
        { status: 400 },
      );
    }
    updates.circuit_breaker_threshold_usd = body.circuit_breaker_threshold_usd;
  }

  if (body.tracking_start_at !== undefined) {
    if (typeof body.tracking_start_at !== 'string' || isNaN(Date.parse(body.tracking_start_at))) {
      return NextResponse.json(
        { ok: false, error: 'tracking_start_at must be a valid ISO-8601 date string.' },
        { status: 400 },
      );
    }
    updates.tracking_start_at = body.tracking_start_at;
  }

  if (body.reset_circuit_breaker) {
    updates.circuit_breaker_active = false;
    updates.circuit_breaker_restored_at = new Date().toISOString();
    updates.last_alert_fired_at = null;
  }

  if (Object.keys(updates).length === 1) {
    // Only updated_at was set — nothing to do.
    return NextResponse.json({ ok: true, updated: [], message: 'No fields to update.' });
  }

  const { error } = await adminClient
    .from('anthropic_credit_guard')
    .update(updates)
    .eq('id', config.id);

  if (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    updated: Object.keys(updates).filter((k) => k !== 'updated_at'),
  });
}
