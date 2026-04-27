// filepath: apps/superadmin/app/api/transcript-intake/runs/[id]/process/route.ts
// Start a unified transcript intake run in the background.

import { after, NextRequest, NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/ai/rate-limit';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import { processTranscriptIntakeRunById } from '@/lib/transcript-parse/process-transcript-intake-run';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSuperadmin({
    request,
    routeLabel: 'api/transcript-intake/runs/[id]/process',
  });
  if (!auth.ok) return jsonError(auth.message, auth.status);

  const rl = await checkRateLimit({
    userId: auth.userId,
    endpointKey: 'api/transcript-intake/runs/process',
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: rl.message },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  const { id } = await context.params;
  if (!id) return jsonError('Missing id', 400);

  after(() => {
    void processTranscriptIntakeRunById(id);
  });

  return NextResponse.json({ accepted: true, runId: id });
}
