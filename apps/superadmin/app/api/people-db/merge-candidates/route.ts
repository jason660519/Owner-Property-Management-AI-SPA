// GET /api/people-db/merge-candidates
//
// Lists merge candidates for admin review. Defaults to status='pending' +
// newest-first; supports ?status= + pagination + ?embed=person,staging for
// the admin UI's left/right comparison cards (Sprint 4b).
//
// super_admin only — guarded by requireSuperadmin. Reads via createAdminClient
// so the route works even if a super_admin's session RLS evaluation is slow
// (consistent with Row 144 convention).

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';

const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 100;
const VALID_STATUSES = ['pending', 'confirmed', 'rejected', 'all'] as const;
type StatusFilter = (typeof VALID_STATUSES)[number];
// Row 146 Step 5: 'file' embeds dataset_root / dataset_subpath from
// people_db_files so the admin UI can render a colored DatasetBadge per
// candidate. Requires 'staging' to also be embedded (file_id lives there).
const VALID_EMBEDS = ['person', 'staging', 'file'] as const;
type EmbedToken = (typeof VALID_EMBEDS)[number];

interface CandidateRow {
  id: string;
  person_a_id: string;
  record_b_id: string;
  match_reason: string;
  confidence: number;
  status: string;
  [key: string]: unknown;
}

interface PersonFixture {
  person_id: string;
  [key: string]: unknown;
}

interface StagingFixture {
  id: string;
  file_id?: string | null;
  [key: string]: unknown;
}

interface FileFixture {
  id: string;
  dataset_root: string | null;
  dataset_subpath: string | null;
}

function parseEmbed(raw: string | null): Set<EmbedToken> {
  if (!raw) return new Set();
  const tokens = raw
    .split(',')
    .map((t) => t.trim())
    .filter((t): t is EmbedToken => (VALID_EMBEDS as readonly string[]).includes(t));
  return new Set(tokens);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireSuperadmin({
    request,
    allowHeaderFallback: false,
    routeLabel: 'api/people-db/merge-candidates',
  });
  if (!auth.ok) {
    return NextResponse.json({ detail: auth.message }, { status: auth.status });
  }

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

  const embed = parseEmbed(url.searchParams.get('embed'));

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

  const items = (data ?? []) as CandidateRow[];

  // Optional embed enrichment. Parallelise the two IN-lookups so worst-case
  // latency stays at 1 round-trip regardless of which tokens were requested.
  // Return freshly-mapped items rather than mutating in place — keeps the
  // function side-effect-free and avoids surprising the caller.
  let enrichedItems: CandidateRow[] = items;
  if (embed.size > 0 && items.length > 0) {
    const personIds = Array.from(new Set(items.map((c) => c.person_a_id)));
    const recordIds = Array.from(new Set(items.map((c) => c.record_b_id)));

    const [personsRes, stagingRes] = await Promise.all([
      embed.has('person')
        ? supabase
            .from('people_db_persons')
            .select(
              'person_id, canonical_name, canonical_id_no, canonical_phones, canonical_address, source_count, quality_score',
            )
            .in('person_id', personIds)
        : Promise.resolve({ data: [] as PersonFixture[], error: null }),
      embed.has('staging')
        ? supabase
            .from('people_db_staging_records')
            .select('id, file_id, record_index, normalized, created_at')
            .in('id', recordIds)
        : Promise.resolve({ data: [] as StagingFixture[], error: null }),
    ]);

    if (personsRes.error) {
      return NextResponse.json(
        { ok: false, error: 'Embed lookup failed (persons)', detail: personsRes.error.message },
        { status: 500 },
      );
    }
    if (stagingRes.error) {
      return NextResponse.json(
        { ok: false, error: 'Embed lookup failed (staging)', detail: stagingRes.error.message },
        { status: 500 },
      );
    }

    const personMap = new Map<string, PersonFixture>();
    for (const p of (personsRes.data ?? []) as PersonFixture[]) {
      personMap.set(p.person_id, p);
    }
    const stagingMap = new Map<string, StagingFixture>();
    for (const s of (stagingRes.data ?? []) as StagingFixture[]) {
      stagingMap.set(s.id, s);
    }

    // Row 146 Step 5: optional second-pass file lookup for dataset color
    // badges. Skipped silently when 'file' wasn't requested or when staging
    // produced no file_ids — keeps the worst-case round-trip count predictable.
    const fileMap = new Map<string, FileFixture>();
    if (embed.has('file') && stagingMap.size > 0) {
      const fileIds = Array.from(
        new Set(
          Array.from(stagingMap.values())
            .map((s) => s.file_id)
            .filter((v): v is string => typeof v === 'string' && v.length > 0),
        ),
      );
      if (fileIds.length > 0) {
        const filesRes = await supabase
          .from('people_db_files')
          .select('id, dataset_root, dataset_subpath')
          .in('id', fileIds);
        if (filesRes.error) {
          return NextResponse.json(
            { ok: false, error: 'Embed lookup failed (files)', detail: filesRes.error.message },
            { status: 500 },
          );
        }
        for (const f of (filesRes.data ?? []) as FileFixture[]) {
          fileMap.set(f.id, f);
        }
      }
    }

    enrichedItems = items.map((item) => {
      const next: CandidateRow = { ...item };
      if (embed.has('person')) {
        next.person = personMap.get(item.person_a_id) ?? null;
      }
      if (embed.has('staging')) {
        next.staging = stagingMap.get(item.record_b_id) ?? null;
      }
      if (embed.has('file')) {
        const staging = stagingMap.get(item.record_b_id);
        const file = staging?.file_id ? fileMap.get(staging.file_id) ?? null : null;
        next.file = file;
      }
      return next;
    });
  }

  return NextResponse.json({
    ok: true,
    total: count ?? 0,
    page,
    page_size: pageSize,
    items: enrichedItems,
  });
}
