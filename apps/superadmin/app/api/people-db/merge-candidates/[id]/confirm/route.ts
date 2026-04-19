// POST /api/people-db/merge-candidates/[id]/confirm
//
// Admin confirms a fuzzy-match candidate: the suggested merge is correct.
// Delegates to confirmCandidate() which writes people_db_person_sources
// and marks the candidate row status='confirmed' with the admin's user id.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import {
  confirmCandidate,
  CandidateStateError,
} from '@/lib/people-db/merge-candidates';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireSuperadmin({
    request,
    allowHeaderFallback: false,
    routeLabel: 'api/people-db/merge-candidates/[id]/confirm',
  });
  if (!auth.ok) {
    return NextResponse.json({ detail: auth.message }, { status: auth.status });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, error: 'Missing candidate id' }, { status: 400 });
  }

  const supabase = createAdminClient();
  try {
    await confirmCandidate(supabase, id, auth.userId);
  } catch (err) {
    if (err instanceof CandidateStateError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 409 });
    }
    return NextResponse.json(
      {
        ok: false,
        error: 'Confirm failed',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id });
}
