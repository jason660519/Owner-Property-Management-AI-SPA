// Row 145 Sprint 1 — File inventory query API.
//
// GET /api/people-db/ingest/files
//   ?status=pending|parsing|...|missing   (optional, exact match)
//   &dataset_root=<string>                (optional, exact match)
//   &page=1                               (1-indexed, default 1)
//   &page_size=20                         (default 20, max 100)
//
// Returns { items, page, page_size, total } for the monitor UI and CLI tools.
// super_admin or service_role only (RLS enforces on the DB side too).

import { NextRequest, NextResponse } from 'next/server';

import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import { createAdminClient } from '@/utils/supabase/admin';

const ALLOWED_STATUSES = new Set([
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
]);

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function GET(req: NextRequest) {
  const auth = await requireSuperadmin({
    request: req,
    allowHeaderFallback: false,
    routeLabel: 'api/people-db/ingest/files',
  });
  if (!auth.ok) {
    return NextResponse.json({ detail: auth.message }, { status: auth.status });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const datasetRoot = url.searchParams.get('dataset_root');
  const page = Number(url.searchParams.get('page') ?? '1');
  const pageSize = Number(url.searchParams.get('page_size') ?? DEFAULT_PAGE_SIZE);

  if (!Number.isInteger(page) || page < 1) {
    return NextResponse.json({ detail: 'page must be a positive integer' }, { status: 400 });
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    return NextResponse.json(
      { detail: `page_size must be in [1, ${MAX_PAGE_SIZE}]` },
      { status: 400 },
    );
  }
  if (status && !ALLOWED_STATUSES.has(status)) {
    return NextResponse.json(
      { detail: `status must be one of: ${Array.from(ALLOWED_STATUSES).join(', ')}` },
      { status: 400 },
    );
  }

  const db = createAdminClient();
  let query = db
    .from('people_db_files')
    .select(
      'id, sha256, source_path, dataset_root, dataset_subpath, ext, mime, size_bytes, mtime, status, parser, row_count, error_msg, attempts, created_at, updated_at',
      { count: 'exact' },
    )
    .order('updated_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (datasetRoot) query = query.eq('dataset_root', datasetRoot);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json(
      { detail: 'Failed to list files', error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    items: data ?? [],
    page,
    page_size: pageSize,
    total: count ?? 0,
  });
}
