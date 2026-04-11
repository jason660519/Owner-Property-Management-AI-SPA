// GET /api/paperclip/issues/[issueId]/status
//
// Lightweight proxy to Paperclip's issue endpoint — polled by the Modal after
// send so the user sees live progress (queued → in_progress → done). Keeps
// PAPERCLIP_API_KEY server-side.

import { NextRequest, NextResponse } from 'next/server';
import { fetchIssueStatus } from '@/lib/paperclip/client';

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

  const baseUrl = process.env.NEXT_PUBLIC_PAPERCLIP_BASE_URL;
  const apiKey = process.env.PAPERCLIP_API_KEY;
  if (!baseUrl) {
    return NextResponse.json(
      {
        ok: false,
        status: 500,
        error: 'NEXT_PUBLIC_PAPERCLIP_BASE_URL not set.',
      },
      { status: 500 },
    );
  }
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, status: 500, error: 'PAPERCLIP_API_KEY not set.' },
      { status: 500 },
    );
  }

  const result = await fetchIssueStatus({ baseUrl, apiKey, issueId });
  const httpStatus = result.ok ? 200 : result.status || 502;
  return NextResponse.json(result, { status: httpStatus });
}
