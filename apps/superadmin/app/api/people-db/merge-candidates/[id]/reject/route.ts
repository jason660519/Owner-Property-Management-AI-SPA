// POST /api/people-db/merge-candidates/[id]/reject
//
// Admin rejects a fuzzy-match candidate: the suggested merge is wrong.
// Delegates to rejectCandidate() which writes people_db_merge_blacklist
// so ER never re-suggests the pair and marks status='rejected'.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireSuperAdmin } from '@/lib/people-db/es-gateway';
import {
  rejectCandidate,
  CandidateStateError,
} from '@/lib/people-db/merge-candidates';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, error: 'Missing candidate id' }, { status: 400 });
  }

  const supabase = createAdminClient();
  try {
    await rejectCandidate(supabase, id, auth.user.userId);
  } catch (err) {
    if (err instanceof CandidateStateError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 409 });
    }
    return NextResponse.json(
      {
        ok: false,
        error: 'Reject failed',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id });
}
