// Row 145 Sprint 6 — GET /api/people-db/ingest/stage-counts
//
// Returns one count per status so the monitoring dashboard can render
// stage cards (pending, parsing, parsed, …) without pulling rows.
//
// The Supabase JS SDK has no GROUP BY, so we issue N parallel HEAD
// counts (one per known status). N=11 is small and every call uses
// the status b-tree index, so this stays cheap even at M-row scale.

import { NextResponse } from 'next/server';

import { requireSuperAdmin } from '@/lib/people-db/es-gateway';
import { createAdminClient } from '@/utils/supabase/admin';

const STATUSES = [
  'pending',
  'parsing',
  'parsed',
  'ocr_queued',
  'normalized',
  'resolved',
  'indexed',
  'failed',
  'skipped_unsupported',
  'skipped_duplicate',
  'missing',
] as const;

type StatusKey = (typeof STATUSES)[number];

export async function GET(): Promise<NextResponse> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const db = createAdminClient();

  const entries = await Promise.all(
    STATUSES.map(async (status) => {
      const { count, error } = await db
        .from('people_db_files')
        .select('id', { count: 'exact', head: true })
        .eq('status', status);
      if (error) {
        return [status, { count: 0, error: error.message }] as const;
      }
      return [status, { count: count ?? 0 }] as const;
    }),
  );

  const counts: Record<StatusKey, number> = Object.fromEntries(
    entries.map(([status, v]) => [status, v.count]),
  ) as Record<StatusKey, number>;

  const errors = entries
    .filter(([, v]) => 'error' in v)
    .map(([status, v]) => ({ status, error: (v as { error: string }).error }));

  return NextResponse.json({
    counts,
    total: Object.values(counts).reduce((a, b) => a + b, 0),
    errors: errors.length > 0 ? errors : undefined,
  });
}
