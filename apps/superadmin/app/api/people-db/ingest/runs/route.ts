// Row 145 Sprint 6 — GET /api/people-db/ingest/runs
//
// Returns the most recent ingest run audit rows written by the
// orchestrator CLI (tools/people-db/ingest.ts). Ordered newest first.

import { NextRequest, NextResponse } from 'next/server';

import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import { createAdminClient } from '@/utils/supabase/admin';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireSuperadmin({
    request: req,
    allowHeaderFallback: false,
    routeLabel: 'api/people-db/ingest/runs',
  });
  if (!auth.ok) {
    return NextResponse.json({ detail: auth.message }, { status: auth.status });
  }

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return NextResponse.json(
      { detail: `limit must be in [1, ${MAX_LIMIT}]` },
      { status: 400 },
    );
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from('people_db_ingest_runs')
    .select('id, stage, status, started_at, finished_at, processed, failed, notes')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json(
      { detail: 'Failed to list runs', error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ items: data ?? [], limit });
}
