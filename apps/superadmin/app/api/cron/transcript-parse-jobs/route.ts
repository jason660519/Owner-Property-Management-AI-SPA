// filepath: apps/superadmin/app/api/cron/transcript-parse-jobs/route.ts
// Drain one queued transcript parse job (Vercel Cron or manual GET with secret).

import { NextRequest, NextResponse } from 'next/server';
import {
  peekOldestQueuedTranscriptParseJobId,
  processTranscriptParseJobById,
} from '@/lib/transcript-parse/process-transcript-parse-job';

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

  const jobId = await peekOldestQueuedTranscriptParseJobId();
  if (!jobId) {
    return NextResponse.json({ processed: false });
  }

  await processTranscriptParseJobById(jobId);
  return NextResponse.json({ processed: true, jobId });
}
