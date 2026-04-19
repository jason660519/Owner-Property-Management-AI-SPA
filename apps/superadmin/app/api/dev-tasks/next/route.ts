import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireSuperadminOrInternal } from '@/lib/auth/require-superadmin-or-internal';

type IDEType = 'Cursor' | 'VSCode' | 'Antigravity' | 'Claude CLI' | 'TRAE';

// Local agents poll this endpoint to claim the next queued dev task.
// Dual-track auth: superadmin session OR INTERNAL_API_KEY (Issue #34 PR G).
export async function GET(request: NextRequest) {
  const authResult = await requireSuperadminOrInternal({
    request,
    routeLabel: 'api/dev-tasks/next',
  });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  try {
    const supabase = createAdminClient();

    const url = request.nextUrl;
    const ideType = url.searchParams.get('ideType') as IDEType | null;
    const agentId = url.searchParams.get('agentId') ?? null;

    if (!ideType) {
      return NextResponse.json({ error: 'Missing ideType' }, { status: 400 });
    }

    const allowedIdes: IDEType[] = ['Cursor', 'VSCode', 'Antigravity', 'Claude CLI', 'TRAE'];
    if (!allowedIdes.includes(ideType)) {
      return NextResponse.json({ error: 'Invalid ideType', allowed: allowedIdes }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('dev_tasks')
      .select('id, user_id, row_id, feature_name, ide, prompt, metadata, status')
      .eq('status', 'queued')
      .eq('ide', ideType)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[DevTasks] GET next error:', error);
      return NextResponse.json({ error: 'Failed to fetch next dev task' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ task: null });
    }

    const { error: updateError } = await supabase
      .from('dev_tasks')
      .update({
        status: 'running',
        agent_id: agentId,
      })
      .eq('id', data.id);

    if (updateError) {
      console.error('[DevTasks] Failed to mark task as running:', updateError);
      return NextResponse.json({ error: 'Failed to claim dev task' }, { status: 500 });
    }

    return NextResponse.json({ task: data });
  } catch (err) {
    console.error('[DevTasks] GET /api/dev-tasks/next unexpected error:', err);
    return NextResponse.json({ error: 'Failed to fetch next dev task' }, { status: 500 });
  }
}

