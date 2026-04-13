// POST /api/paperclip/issues/[issueId]/update
//
// Proxy for PATCH /api/issues/:id on Paperclip.
// Accepts partial update fields (status, assigneeAgentId).

import { NextRequest, NextResponse } from 'next/server';
import { updateIssue } from '@/lib/paperclip/client';
import type { PaperclipIssueStatus } from '@/lib/paperclip/types';

const PAPERCLIP_BASE_URL =
  process.env.NEXT_PUBLIC_PAPERCLIP_BASE_URL ?? 'http://localhost:3187';
const PAPERCLIP_API_KEY = process.env.PAPERCLIP_API_KEY ?? '';

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
  if (!PAPERCLIP_API_KEY) {
    return NextResponse.json(
      { ok: false, error: 'Paperclip API key not configured' },
      { status: 500 },
    );
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

  const result = await updateIssue({
    baseUrl: PAPERCLIP_BASE_URL,
    apiKey: PAPERCLIP_API_KEY,
    issueId,
    payload,
  });

  const httpStatus = result.ok ? 200 : result.status || 502;
  return NextResponse.json(result, { status: httpStatus });
}
