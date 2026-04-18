// Row 145 Sprint 6 — POST /api/people-db/ingest/retry/[fileId]
//
// Admin-only. Flips a failed file back to status='pending' and resets
// attempts to 0 so the parse worker picks it up again. Any other status
// (parsed, parsing, ocr_queued, normalized, resolved, skipped_*, missing)
// is rejected with 400 — retry is only meaningful for terminal-failed rows.

import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/utils/supabase/admin';
import { requireSuperAdmin } from '@/lib/people-db/es-gateway';

const RETRIABLE_STATUSES: ReadonlySet<string> = new Set(['failed']);

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
): Promise<NextResponse> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const { fileId } = await params;
  if (!fileId) {
    return NextResponse.json({ ok: false, error: 'Missing fileId' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('people_db_files')
    .select('id, status, attempts, error_msg')
    .eq('id', fileId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: 'Lookup failed', detail: error.message },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json({ ok: false, error: 'File not found' }, { status: 404 });
  }

  const row = data as { id: string; status: string; attempts: number };
  if (!RETRIABLE_STATUSES.has(row.status)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Only failed or dead_letter files can be retried (got "${row.status}")`,
      },
      { status: 400 },
    );
  }

  const { error: updateError } = await supabase
    .from('people_db_files')
    .update({ status: 'pending', attempts: 0, error_msg: null })
    .eq('id', fileId);

  if (updateError) {
    return NextResponse.json(
      { ok: false, error: 'Retry failed', detail: updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: fileId });
}
