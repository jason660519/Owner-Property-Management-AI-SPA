import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';

// GET: Fetch all role assignments for a user
export async function GET(request: NextRequest) {
  const authResult = await requireSuperadmin({
    request,
    allowHeaderFallback: false,
    routeLabel: 'api/ai-settings/role-assignments',
  });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }
  const userId = authResult.userId;

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('ai_model_role_assignments')
      .select('*')
      .eq('user_id', userId)
      .order('provider')
      .order('model_id');

    if (error) throw error;
    return NextResponse.json({ assignments: data ?? [] });
  } catch (err) {
    console.error('[AI Settings] GET role-assignments error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch role assignments' },
      { status: 500 },
    );
  }
}

interface AssignmentPayload {
  provider: string;
  model_id: string;
  tag_key: string;
  source: 'ai_online' | 'ai_offline' | 'manual';
  confidence?: number;
  classified_by?: string;
}

const VALID_SOURCES = new Set(['ai_online', 'ai_offline', 'manual']);

// POST: Batch upsert role assignments
export async function POST(request: NextRequest) {
  const authResult = await requireSuperadmin({
    request,
    allowHeaderFallback: false,
    routeLabel: 'api/ai-settings/role-assignments',
  });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }
  const userId = authResult.userId;

  try {
    const supabase = createAdminClient();
    const body = (await request.json()) as {
      assignments: AssignmentPayload[];
    };

    const { assignments } = body;

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json(
        { error: 'non-empty assignments array required' },
        { status: 400 },
      );
    }

    const rows = assignments
      .filter((a) => a.provider && a.model_id && a.tag_key && VALID_SOURCES.has(a.source))
      .map((a) => ({
        user_id: userId,
        provider: a.provider,
        model_id: a.model_id,
        tag_key: a.tag_key,
        source: a.source,
        confidence: Math.min(1, Math.max(0, a.confidence ?? 1)),
        classified_at: new Date().toISOString(),
        classified_by: a.classified_by ?? 'user',
      }));

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No valid assignments after filtering' },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from('ai_model_role_assignments')
      .upsert(rows, { onConflict: 'user_id,provider,model_id,tag_key' });

    if (error) throw error;

    return NextResponse.json({ ok: true, count: rows.length });
  } catch (err) {
    console.error('[AI Settings] POST role-assignments error:', err);
    return NextResponse.json(
      { error: 'Failed to upsert role assignments' },
      { status: 500 },
    );
  }
}

// DELETE: Remove specific assignments
export async function DELETE(request: NextRequest) {
  const authResult = await requireSuperadmin({
    request,
    allowHeaderFallback: false,
    routeLabel: 'api/ai-settings/role-assignments',
  });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }
  const userId = authResult.userId;

  try {
    const supabase = createAdminClient();
    const body = (await request.json()) as {
      items: Array<{ provider: string; model_id: string; tag_key: string }>;
    };

    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'non-empty items array required' },
        { status: 400 },
      );
    }

    // Delete one by one (small set expected)
    let deleted = 0;
    for (const item of items) {
      const { error } = await supabase
        .from('ai_model_role_assignments')
        .delete()
        .eq('user_id', userId)
        .eq('provider', item.provider)
        .eq('model_id', item.model_id)
        .eq('tag_key', item.tag_key);

      if (!error) deleted++;
    }

    return NextResponse.json({ ok: true, deleted });
  } catch (err) {
    console.error('[AI Settings] DELETE role-assignments error:', err);
    return NextResponse.json(
      { error: 'Failed to delete role assignments' },
      { status: 500 },
    );
  }
}
