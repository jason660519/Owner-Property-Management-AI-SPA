import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import { VALID_AGENT_KEYS } from '@/lib/ai/agent-registry';
import type {
  AgentAssignment,
  AgentAssignmentPatch,
  AgentFallbackEntry,
  AgentGuardrails,
  AgentModelConfig,
  FallbackTrigger,
} from '@/lib/types/agent-assignment';

// ---------------------------------------------------------------------------
// Shared validators
// ---------------------------------------------------------------------------

const VALID_TRIGGERS: ReadonlySet<FallbackTrigger> = new Set([
  'rate_limit',
  'error',
  'cost_over',
]);

/** Narrow an unknown value to a plain, non-null object. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeConfig(value: unknown): AgentModelConfig {
  if (!isPlainObject(value)) return {};
  const out: AgentModelConfig = {};
  if (typeof value.temperature === 'number') out.temperature = value.temperature;
  if (typeof value.max_tokens === 'number') out.max_tokens = value.max_tokens;
  if (typeof value.top_p === 'number') out.top_p = value.top_p;
  if (
    value.reasoning_effort === 'low' ||
    value.reasoning_effort === 'medium' ||
    value.reasoning_effort === 'high'
  ) {
    out.reasoning_effort = value.reasoning_effort;
  }
  return out;
}

function normalizeFallbacks(value: unknown): AgentFallbackEntry[] {
  if (!Array.isArray(value)) return [];
  const out: AgentFallbackEntry[] = [];
  for (const raw of value) {
    if (!isPlainObject(raw)) continue;
    const provider = typeof raw.provider === 'string' ? raw.provider : '';
    const modelId = typeof raw.model_id === 'string' ? raw.model_id : '';
    const trigger = raw.trigger;
    if (!provider || !modelId) continue;
    if (typeof trigger !== 'string' || !VALID_TRIGGERS.has(trigger as FallbackTrigger)) continue;
    out.push({
      provider,
      model_id: modelId,
      trigger: trigger as FallbackTrigger,
      config: normalizeConfig(raw.config),
    });
  }
  return out;
}

function normalizeGuardrails(value: unknown): AgentGuardrails {
  if (!isPlainObject(value)) return {};
  const out: AgentGuardrails = {};
  if (typeof value.max_monthly_usd === 'number') {
    out.max_monthly_usd = value.max_monthly_usd;
  }
  if (Array.isArray(value.require_tags)) {
    out.require_tags = value.require_tags.filter((t): t is string => typeof t === 'string');
  }
  if (Array.isArray(value.forbid_providers)) {
    out.forbid_providers = value.forbid_providers.filter(
      (p): p is string => typeof p === 'string',
    );
  }
  return out;
}

/**
 * Shape returned from Supabase.from('ai_agent_model_assignments'). We can't
 * rely on generated types (packages/types/database.ts isn't guaranteed to be
 * regenerated before this migration is applied), so we cast + normalize.
 */
interface RawRow {
  id: string;
  agent_key: string;
  is_enabled: boolean;
  primary_provider: string;
  primary_model_id: string;
  primary_config: unknown;
  fallbacks: unknown;
  guardrails: unknown;
  notes: string | null;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

function rowToAssignment(row: RawRow): AgentAssignment {
  return {
    id: row.id,
    agent_key: row.agent_key,
    is_enabled: row.is_enabled,
    primary_provider: row.primary_provider,
    primary_model_id: row.primary_model_id,
    primary_config: normalizeConfig(row.primary_config),
    fallbacks: normalizeFallbacks(row.fallbacks),
    guardrails: normalizeGuardrails(row.guardrails),
    notes: row.notes,
    updated_by: row.updated_by,
    updated_at: row.updated_at,
    created_at: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// GET: list all agent assignments (global config; superadmin-only)
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const authResult = await requireSuperadmin({
    request,
    allowHeaderFallback: false,
    routeLabel: 'api/ai-settings/agent-assignments',
  });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('ai_agent_model_assignments')
      .select('*')
      .order('agent_key');

    if (error) throw error;

    const rows = (data ?? []) as RawRow[];
    const assignments = rows.map(rowToAssignment);
    return NextResponse.json({ assignments });
  } catch (err) {
    console.error('[AI Settings] GET agent-assignments error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch agent assignments' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT: upsert a single assignment by agent_key
// ---------------------------------------------------------------------------
export async function PUT(request: NextRequest) {
  const authResult = await requireSuperadmin({
    request,
    allowHeaderFallback: false,
    routeLabel: 'api/ai-settings/agent-assignments',
  });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }
  const userId = authResult.userId;

  try {
    const supabase = createAdminClient();

    const body = (await request.json()) as Partial<AgentAssignmentPatch>;
    const agentKey = body.agent_key;
    if (typeof agentKey !== 'string' || !VALID_AGENT_KEYS.has(agentKey)) {
      return NextResponse.json(
        { error: `Invalid agent_key: ${String(agentKey)}` },
        { status: 400 },
      );
    }

    // primary_provider / primary_model_id are required when first creating a row.
    // For partial updates we'll fall back to the existing row's values.
    const { data: existingRaw, error: fetchErr } = await supabase
      .from('ai_agent_model_assignments')
      .select('*')
      .eq('agent_key', agentKey)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    const existing = existingRaw ? rowToAssignment(existingRaw as RawRow) : null;

    const primaryProvider =
      typeof body.primary_provider === 'string'
        ? body.primary_provider
        : existing?.primary_provider;
    const primaryModelId =
      typeof body.primary_model_id === 'string'
        ? body.primary_model_id
        : existing?.primary_model_id;

    if (!primaryProvider || !primaryModelId) {
      return NextResponse.json(
        { error: 'primary_provider and primary_model_id are required' },
        { status: 400 },
      );
    }

    const payload = {
      agent_key: agentKey,
      is_enabled: typeof body.is_enabled === 'boolean' ? body.is_enabled : existing?.is_enabled ?? true,
      primary_provider: primaryProvider,
      primary_model_id: primaryModelId,
      primary_config: normalizeConfig(body.primary_config ?? existing?.primary_config),
      fallbacks: normalizeFallbacks(body.fallbacks ?? existing?.fallbacks),
      guardrails: normalizeGuardrails(body.guardrails ?? existing?.guardrails),
      notes: body.notes === undefined ? existing?.notes ?? null : body.notes,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };

    const { data: upserted, error: upsertErr } = await supabase
      .from('ai_agent_model_assignments')
      .upsert(payload, { onConflict: 'agent_key' })
      .select('*')
      .single();

    if (upsertErr) throw upsertErr;

    return NextResponse.json({
      ok: true,
      assignment: rowToAssignment(upserted as RawRow),
    });
  } catch (err) {
    console.error('[AI Settings] PUT agent-assignments error:', err);
    return NextResponse.json(
      {
        error: 'Failed to save agent assignment',
        details: err instanceof Error ? err.message : undefined,
      },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE: reset an assignment (remove the row; UI treats missing = unset)
// ---------------------------------------------------------------------------
export async function DELETE(request: NextRequest) {
  const authResult = await requireSuperadmin({
    request,
    allowHeaderFallback: false,
    routeLabel: 'api/ai-settings/agent-assignments',
  });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }
  // userId not needed for delete (admin action, scoped by agent_key only)
  void authResult.userId;

  try {
    const supabase = createAdminClient();

    const url = new URL(request.url);
    const agentKey = url.searchParams.get('agent_key');
    if (!agentKey || !VALID_AGENT_KEYS.has(agentKey)) {
      return NextResponse.json({ error: 'Invalid agent_key' }, { status: 400 });
    }

    const { error } = await supabase
      .from('ai_agent_model_assignments')
      .delete()
      .eq('agent_key', agentKey);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[AI Settings] DELETE agent-assignments error:', err);
    return NextResponse.json(
      { error: 'Failed to delete agent assignment' },
      { status: 500 },
    );
  }
}
