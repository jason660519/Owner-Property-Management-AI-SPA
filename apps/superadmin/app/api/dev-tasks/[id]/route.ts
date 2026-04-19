import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { resolveUserId } from '@/lib/resolve-ai-settings-user';
import { requireSuperadminOrInternal } from '@/lib/auth/require-superadmin-or-internal';

type DevTaskStatus = 'queued' | 'running' | 'succeeded' | 'failed';

interface CompletePayload {
  status: DevTaskStatus;
  resultSummary?: Record<string, unknown>;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = createAdminClient();
    const requestedUserId = request.headers.get('x-user-id');
    if (!requestedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await resolveUserId(supabase, requestedUserId);
    if (!userId) {
      return NextResponse.json({ error: '找不到可用的使用者' }, { status: 401 });
    }

    const { id: taskId } = await context.params;
    if (!taskId) {
      return NextResponse.json({ error: 'Missing task id' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('dev_tasks')
      .select('id, row_id, feature_name, ide, status, logs, result_summary, created_at, updated_at')
      .eq('id', taskId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[DevTasks] GET by id error:', error);
      return NextResponse.json({ error: 'Failed to fetch dev task' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ task: data });
  } catch (err) {
    console.error('[DevTasks] GET /api/dev-tasks/[id] unexpected error:', err);
    return NextResponse.json({ error: 'Failed to fetch dev task' }, { status: 500 });
  }
}

// Local agents can append logs for a task.
// Dual-track auth: superadmin session OR INTERNAL_API_KEY (Issue #34 PR G).
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireSuperadminOrInternal({
    request,
    routeLabel: 'api/dev-tasks/[id]',
  });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  try {
    const supabase = createAdminClient();
    const { id: taskId } = await context.params;
    if (!taskId) {
      return NextResponse.json({ error: 'Missing task id' }, { status: 400 });
    }

    const body = (await request.json()) as unknown;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { logs: newLogs } = body as { logs?: string[] };

    if (!newLogs || !Array.isArray(newLogs) || newLogs.length === 0) {
      return NextResponse.json({ error: 'Missing logs' }, { status: 400 });
    }

    const { data: existingTask, error: fetchError } = await supabase
      .from('dev_tasks')
      .select('logs')
      .eq('id', taskId)
      .maybeSingle();

    if (fetchError) {
      console.error('[DevTasks] PATCH fetch logs error:', fetchError);
      return NextResponse.json({ error: 'Failed to update logs' }, { status: 500 });
    }

    const currentLogs = Array.isArray(existingTask?.logs) ? (existingTask?.logs as string[]) : [];
    const mergedLogs = [...currentLogs, ...newLogs];

    const { error: updateError } = await supabase
      .from('dev_tasks')
      .update({ logs: mergedLogs })
      .eq('id', taskId);

    if (updateError) {
      console.error('[DevTasks] PATCH update logs error:', updateError);
      return NextResponse.json({ error: 'Failed to update logs' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DevTasks] PATCH /api/dev-tasks/[id] unexpected error:', err);
    return NextResponse.json({ error: 'Failed to update logs' }, { status: 500 });
  }
}

// Local agents mark task complete with final status and summary.
// Dual-track auth: superadmin session OR INTERNAL_API_KEY (Issue #34 PR G).
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireSuperadminOrInternal({
    request,
    routeLabel: 'api/dev-tasks/[id]',
  });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  try {
    const supabase = createAdminClient();
    const { id: taskId } = await context.params;
    if (!taskId) {
      return NextResponse.json({ error: 'Missing task id' }, { status: 400 });
    }

    const body = (await request.json()) as unknown;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { status, resultSummary } = body as CompletePayload;

    const allowed: DevTaskStatus[] = ['queued', 'running', 'succeeded', 'failed'];
    if (!status || !allowed.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status', allowed },
        { status: 400 },
      );
    }

    const { error: updateError } = await supabase
      .from('dev_tasks')
      .update({
        status,
        result_summary: resultSummary ?? null,
      })
      .eq('id', taskId);

    if (updateError) {
      console.error('[DevTasks] POST complete error:', updateError);
      return NextResponse.json({ error: 'Failed to complete dev task' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DevTasks] POST /api/dev-tasks/[id] unexpected error:', err);
    return NextResponse.json({ error: 'Failed to complete dev task' }, { status: 500 });
  }
}
