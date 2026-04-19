// GET  /api/paperclip/task-queue         — list active tasks (optionally filter by rowId)
// POST /api/paperclip/task-queue         — record a new task (called after issue creation)
//
// Uses service_role to bypass RLS so the server-side poll can also read/write.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireSuperadminOrInternal } from '@/lib/auth/require-superadmin-or-internal';

export interface PaperclipTaskRow {
  id: string;
  row_id: string;
  issue_id: string;
  issue_url: string;
  assigned_agent: string | null;
  assigned_by: string | null;
  assigned_role: string | null;
  ide: string | null;
  status: string;
  attempt_count: number;
  consecutive_failures: number;
  max_attempts: number;
  cooldown_seconds: number;
  last_error: string | null;
  cost_usd: number | null;
  worktree_slug: string | null;
  worktree_branch: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function GET(request: NextRequest) {
  const authResult = await requireSuperadminOrInternal({
    request,
    routeLabel: 'api/paperclip/task-queue',
  });
  if (!authResult.ok) {
    return NextResponse.json({ ok: false, error: authResult.message }, { status: authResult.status });
  }

  const supabase = createAdminClient();
  const rowId = request.nextUrl.searchParams.get('rowId');
  const activeOnly = request.nextUrl.searchParams.get('active') !== 'false';

  let query = supabase
    .from('paperclip_tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (rowId) {
    query = query.eq('row_id', rowId);
  }
  if (activeOnly) {
    query = query.in('status', ['submitted', 'running']);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    tasks: (data ?? []) as PaperclipTaskRow[],
  });
}

interface CreateTaskBody {
  rowId: string;
  issueId: string;
  issueUrl: string;
  assignedAgent?: string;
  assignedBy?: string;
  assignedRole?: string;
  ide?: string;
  promptText?: string;
  worktreeSlug?: string;
  worktreeBranch?: string;
  maxAttempts?: number;
  cooldownSeconds?: number;
}

export async function POST(request: NextRequest) {
  const authResult = await requireSuperadminOrInternal({
    request,
    routeLabel: 'api/paperclip/task-queue',
  });
  if (!authResult.ok) {
    return NextResponse.json({ ok: false, error: authResult.message }, { status: authResult.status });
  }

  let body: CreateTaskBody;
  try {
    body = (await request.json()) as CreateTaskBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  if (!body.rowId || !body.issueId || !body.issueUrl) {
    return NextResponse.json(
      { ok: false, error: 'rowId, issueId, and issueUrl are required' },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('paperclip_tasks')
    .insert({
      row_id: body.rowId,
      issue_id: body.issueId,
      issue_url: body.issueUrl,
      assigned_agent: body.assignedAgent ?? null,
      assigned_by: body.assignedBy ?? null,
      assigned_role: body.assignedRole ?? null,
      ide: body.ide ?? null,
      prompt_text: body.promptText ?? null,
      worktree_slug: body.worktreeSlug ?? null,
      worktree_branch: body.worktreeBranch ?? null,
      max_attempts: body.maxAttempts ?? 3,
      cooldown_seconds: body.cooldownSeconds ?? 30,
      status: 'submitted',
    })
    .select()
    .single();

  if (error) {
    // Partial unique index violation → duplicate active task for same row
    if (error.code === '23505') {
      return NextResponse.json(
        { ok: false, error: `Row ${body.rowId} already has an active task` },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, task: data as PaperclipTaskRow });
}
