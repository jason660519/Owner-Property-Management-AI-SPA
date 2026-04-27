// filepath: apps/superadmin/app/api/cron/transcript-intake-runs/route.ts
// Drain one route-selected unified transcript intake run.

import { NextRequest, NextResponse } from 'next/server';
import {
  peekOldestRouteSelectedTranscriptIntakeRunId,
  processTranscriptIntakeRunById,
} from '@/lib/transcript-parse/process-transcript-intake-run';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const runId = await peekOldestRouteSelectedTranscriptIntakeRunId();
  if (!runId) {
    return NextResponse.json({ processed: false });
  }

  await processTranscriptIntakeRunById(runId);
  return NextResponse.json({ processed: true, runId });
}
