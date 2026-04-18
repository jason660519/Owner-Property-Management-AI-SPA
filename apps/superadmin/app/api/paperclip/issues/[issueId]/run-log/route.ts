// GET /api/paperclip/issues/[issueId]/run-log
//
// Returns the live stdout excerpt + run status of the latest heartbeat run
// attached to an issue. Used by the Modal to stream progress while the agent
// is working — the badge polls status, this route polls the actual log.

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

  // If the caller already knows the runId (cached from a previous poll that
  // succeeded before Paperclip cleared executionRunId), pass it so we skip
  // the issue-discovery hop and go straight to the run endpoint.
  const runIdParam = _request.nextUrl.searchParams.get('runId') || undefined;

  const result = await runtimeResult.runtime.fetchIssueRunLog({
    issueId,
    runId: runIdParam,
  });
  const httpStatus = result.ok ? 200 : result.status || 502;
  return NextResponse.json(result, { status: httpStatus });
}
