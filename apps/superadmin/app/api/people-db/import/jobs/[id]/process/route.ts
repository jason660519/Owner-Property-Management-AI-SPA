import { NextRequest, NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import { processImportJob } from '@/lib/people-db/import-jobs';

// Worker trigger. Invoked from:
//   - the admin UI right after POST /jobs returns 202 (typical path), so work
//     begins immediately and the UI can then poll GET /jobs/[id] for progress.
//   - a cron / scheduled task that picks up stragglers (Sprint 5b).
//
// Response shape matches GET /jobs/[id] so callers can treat kick-off + poll
// uniformly.

export const runtime = 'nodejs';
// The parse + bulk-index path can take tens of seconds for ~25MB files.
// Default Next.js serverless functions cap at 10s on some hosts; explicit
// configuration avoids silent timeouts when we eventually deploy.
export const maxDuration = 300;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSuperadmin({
    request: req,
    allowHeaderFallback: false,
    routeLabel: 'api/people-db/import/jobs/[id]/process',
  });
  if (!auth.ok) {
    return NextResponse.json({ detail: auth.message }, { status: auth.status });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ detail: 'job id is required' }, { status: 400 });
  }

  try {
    const job = await processImportJob(id);
    return NextResponse.json({ job });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : 'processing failed' },
      { status: 500 },
    );
  }
}
