// GET /api/people-db/merge-candidates
//
// Lists merge candidates for admin review. Defaults to status='pending' +
// newest-first; supports ?status= + pagination.
//
// super_admin only — guarded by requireSuperAdmin. Reads via createAdminClient
// so the route works even if a super_admin's session RLS evaluation is slow
// (consistent with Row 144 convention).

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireSuperAdmin } from '@/lib/people-db/es-gateway';

const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 100;
const VALID_STATUSES = ['pending', 'confirmed', 'rejected', 'all'] as const;
type StatusFilter = (typeof VALID_STATUSES)[number];

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const statusRaw = url.searchParams.get('status') ?? 'pending';
  const status: StatusFilter = VALID_STATUSES.includes(statusRaw as StatusFilter)
    ? (statusRaw as StatusFilter)
    : 'pending';

  const pageRaw = Number(url.searchParams.get('page') ?? '1');
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
  const sizeRaw = Number(url.searchParams.get('page_size') ?? String(PAGE_SIZE_DEFAULT));
  const pageSize = Math.min(
    PAGE_SIZE_MAX,
    Number.isFinite(sizeRaw) && sizeRaw >= 1 ? Math.floor(sizeRaw) : PAGE_SIZE_DEFAULT,
  );

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createAdminClient();
  let query = supabase
    .from('people_db_merge_candidates')
    .select('*', { count: 'exact' });
  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) {
    return NextResponse.json(
      { ok: false, error: 'DB query failed', detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    total: count ?? 0,
    page,
    page_size: pageSize,
    items: data ?? [],
  });
}
