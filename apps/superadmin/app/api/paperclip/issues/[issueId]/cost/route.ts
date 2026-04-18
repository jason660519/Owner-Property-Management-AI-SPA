// GET /api/paperclip/issues/[issueId]/cost
//
// Returns the cost + token usage of the latest heartbeat run attached to an
// issue. Used by the Modal to display an at-a-glance "task cost" chip once
// the issue hits a terminal state.

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

  const result = await runtimeResult.runtime.fetchIssueCost({ issueId });
  const httpStatus = result.ok ? 200 : result.status || 502;
  return NextResponse.json(result, { status: httpStatus });
}
