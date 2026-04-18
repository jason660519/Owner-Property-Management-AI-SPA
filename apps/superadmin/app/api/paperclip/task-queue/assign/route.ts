// POST /api/paperclip/task-queue/assign
//
// Admin manually assigns a task to a specific engineer.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getAgentRuntime } from '@/lib/agent-runtime';

interface AssignBody {
  rowId: string;
  assigneeUserId: string;
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: 'Missing x-user-id header' },
      { status: 401 },
    );
  }

  let body: AssignBody;
  try {
    body = (await request.json()) as AssignBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  if (!body.rowId || !body.assigneeUserId) {
    return NextResponse.json(
      { ok: false, error: 'rowId and assigneeUserId are required' },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  // Find the active task for this row
  const { data: task, error: findError } = await supabase
    .from('paperclip_tasks')
    .select('id, issue_id, assigned_agent')
    .eq('row_id', body.rowId)
    .in('status', ['submitted', 'running'])
    .maybeSingle();

  if (findError) {
    return NextResponse.json(
      { ok: false, error: findError.message },
      { status: 500 },
    );
  }

  if (!task) {
    return NextResponse.json(
      { ok: false, error: `No active task found for row ${body.rowId}` },
      { status: 404 },
    );
  }

  // Assign (overwrites any previous claim)
  const { data: updated, error: updateError } = await supabase
    .from('paperclip_tasks')
    .update({
      claimed_by: body.assigneeUserId,
      claimed_at: new Date().toISOString(),
    })
    .eq('id', task.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json(
      { ok: false, error: updateError.message },
      { status: 500 },
    );
  }

  // Best-effort: sync assignee to Paperclip (fire-and-forget).
  // If runtime is misconfigured we skip the sync silently — the assign itself
  // has already succeeded in Supabase.
  if (task.issue_id && task.assigned_agent) {
    const runtimeResult = getAgentRuntime();
    if (runtimeResult.ok) {
      runtimeResult.runtime
        .updateIssue({
          issueId: task.issue_id,
          payload: { assigneeAgentId: task.assigned_agent },
        })
        .catch(() => {
          // Paperclip sync is best-effort — don't block the assign response
        });
    }
  }

  return NextResponse.json({ ok: true, task: updated });
}
