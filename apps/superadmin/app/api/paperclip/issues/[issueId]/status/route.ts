// GET /api/paperclip/issues/[issueId]/status
//
// Lightweight proxy to Paperclip's issue endpoint — polled by the Modal after
// send so the user sees live progress (queued → in_progress → done). Keeps
// PAPERCLIP_API_KEY server-side.

import { NextRequest, NextResponse } from 'next/server';
import { getAgentRuntime } from '@/lib/agent-runtime';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> },
) {
  const { issueId } = await params;

  if (!issueId || issueId.trim() === '') {
    return NextResponse.json(
      { ok: false, status: 400, error: 'Missing issueId path parameter.' },
      { status: 400 },
    );
  }

  const runtimeResult = getAgentRuntime();
  if (!runtimeResult.ok) {
    return NextResponse.json(runtimeResult, { status: runtimeResult.status });
  }

  const result = await runtimeResult.runtime.fetchIssueStatus({ issueId });
  const httpStatus = result.ok ? 200 : result.status || 502;
  return NextResponse.json(result, { status: httpStatus });
}
