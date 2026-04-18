// POST /api/paperclip/issues/[issueId]/update
//
// Proxy for PATCH /api/issues/:id on Paperclip.
// Accepts partial update fields (status, assigneeAgentId).

import { NextRequest, NextResponse } from 'next/server';
import { getAgentRuntime } from '@/lib/agent-runtime';
import type { PaperclipIssueStatus } from '@/lib/paperclip/types';

const ALL_PAPERCLIP_STATUSES: readonly PaperclipIssueStatus[] = [
  'todo',
  'backlog',
  'blocked',
  'in_progress',
  'in_review',
  'done',
  'cancelled',
];

function isPaperclipIssueStatus(v: unknown): v is PaperclipIssueStatus {
  return typeof v === 'string' && (ALL_PAPERCLIP_STATUSES as readonly string[]).includes(v);
}

interface UpdateBodyRaw {
  status?: unknown;
  assigneeAgentId?: unknown;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> },
) {
  const { issueId } = await params;

  if (!issueId || issueId.trim() === '') {
    return NextResponse.json({ ok: false, error: 'issueId is required' }, { status: 400 });
  }

  const runtimeResult = getAgentRuntime();
  if (!runtimeResult.ok) {
    return NextResponse.json(runtimeResult, { status: runtimeResult.status });
  }

  let raw: UpdateBodyRaw;
  try {
    raw = (await request.json()) as UpdateBodyRaw;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const payload: { status?: PaperclipIssueStatus; assigneeAgentId?: string } = {};

  if (raw.status !== undefined) {
    if (!isPaperclipIssueStatus(raw.status)) {
      return NextResponse.json({ ok: false, error: 'Invalid status' }, { status: 400 });
    }
    payload.status = raw.status;
  }

  if (raw.assigneeAgentId !== undefined) {
    if (typeof raw.assigneeAgentId !== 'string') {
      return NextResponse.json({ ok: false, error: 'Invalid assigneeAgentId' }, { status: 400 });
    }
    payload.assigneeAgentId = raw.assigneeAgentId;
  }

  if (!payload.status && !payload.assigneeAgentId) {
    return NextResponse.json({ ok: false, error: 'No update fields provided' }, { status: 400 });
  }

  const result = await runtimeResult.runtime.updateIssue({
    issueId,
    payload,
  });

  const httpStatus = result.ok ? 200 : result.status || 502;
  return NextResponse.json(result, { status: httpStatus });
}
