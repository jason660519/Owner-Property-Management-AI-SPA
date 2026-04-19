import { NextRequest, NextResponse } from 'next/server';
import { buildSearchBody } from '@/lib/people-db/search-strategy';
import { esSearch } from '@/lib/people-db/es-gateway';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  aggregateByPerson,
  type PersonCanonical,
  type PersonSourceLink,
  type SearchRecord,
} from '@/lib/people-db/search-person-aggregate';

interface EsHit {
  _id: string;
  _source: {
    record_id?: string;
    name?: string;
    full_name?: string;
    id_number?: string | null;
    phone?: string | null;
    mobile?: string | null;
    email?: string | null;
    address?: string | null;
    company?: string | null;
    organization?: string | null;
    data_source?: string | null;
    dataset_path?: string | null;
    quality_score?: number | null;
    import_batch_id?: string | null;
    source_file_path?: string | null;
    source_document_id?: string | null;
    created_at?: string | null;
  };
}

interface EsSearchResponse {
  hits: {
    total: { value: number } | number;
    hits: EsHit[];
  };
}

const VALID_QUALITY = new Set(['all', 'high', 'medium', 'low']);
const VALID_GROUP_BY = new Set(['record', 'person']);

export async function GET(req: NextRequest) {
  const auth = await requireSuperadmin({
    request: req,
    allowHeaderFallback: false,
    routeLabel: 'api/people-db/search',
  });
  if (!auth.ok) {
    return NextResponse.json({ detail: auth.message }, { status: auth.status });
  }

  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q') ?? '';
  const pageRaw = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const pageSizeRaw = Number.parseInt(searchParams.get('page_size') ?? '20', 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const pageSize = Number.isFinite(pageSizeRaw) ? Math.min(Math.max(pageSizeRaw, 1), 100) : 20;

  const qualityParam = searchParams.get('quality') ?? 'all';
  const quality = (VALID_QUALITY.has(qualityParam) ? qualityParam : 'all') as
    | 'all'
    | 'high'
    | 'medium'
    | 'low';

  // Sprint 4b: group_by toggle. Default 'record' keeps the Row 144
  // flat-list shape working for existing callers.
  const groupByParam = searchParams.get('group_by') ?? 'record';
  const groupBy = (VALID_GROUP_BY.has(groupByParam) ? groupByParam : 'record') as
    | 'record'
    | 'person';

  const dataSources = [
    ...searchParams.getAll('data_sources'),
    ...searchParams.getAll('data_source'),
  ].filter((s) => s.trim().length > 0);

  const body = buildSearchBody({ q, page, pageSize, dataSources, quality });

  try {
    const response = await esSearch<EsSearchResponse>(body);
    const totalRaw = response.hits?.total;
    const total = typeof totalRaw === 'number' ? totalRaw : totalRaw?.value ?? 0;

    const results = (response.hits?.hits ?? []).map((hit) => {
      const source = hit._source ?? {};
      return {
        record_id: source.record_id ?? hit._id,
        full_name: source.full_name ?? source.name ?? '',
        id_number: source.id_number ?? null,
        phone: source.phone ?? null,
        mobile: source.mobile ?? null,
        email: source.email ?? null,
        address: source.address ?? null,
        company: source.company ?? source.organization ?? null,
        data_source: source.data_source ?? null,
        dataset_path: source.dataset_path ?? source.data_source ?? null,
        quality_score: source.quality_score ?? null,
        import_batch_id: source.import_batch_id ?? null,
        source_file_path: source.source_file_path ?? null,
        source_document_id: source.source_document_id ?? null,
        created_at: source.created_at ?? null,
      };
    });

    if (groupBy === 'person' && results.length > 0) {
      const recordIds = results.map((r) => r.record_id);
      const supabase = createAdminClient();

      const linksRes = await supabase
        .from('people_db_person_sources')
        .select('record_id, person_id')
        .in('record_id', recordIds);
      if (linksRes.error) {
        return NextResponse.json(
          { detail: 'Search aggregation failed (source_links)', error: linksRes.error.message },
          { status: 503 },
        );
      }
      const sourceLinks = (linksRes.data ?? []) as PersonSourceLink[];
      const personIds = Array.from(new Set(sourceLinks.map((l) => l.person_id)));

      let persons: PersonCanonical[] = [];
      if (personIds.length > 0) {
        const pRes = await supabase
          .from('people_db_persons')
          .select(
            'person_id, canonical_name, canonical_id_no, canonical_phones, canonical_address, source_count, quality_score',
          )
          .in('person_id', personIds);
        if (pRes.error) {
          return NextResponse.json(
            { detail: 'Search aggregation failed (persons)', error: pRes.error.message },
            { status: 503 },
          );
        }
        persons = (pRes.data ?? []) as PersonCanonical[];
      }

      const aggregated = aggregateByPerson(results as SearchRecord[], sourceLinks, persons);

      return NextResponse.json({
        results: aggregated,
        total,
        page,
        page_size: pageSize,
        group_by: 'person',
      });
    }

    return NextResponse.json({
      results,
      total,
      page,
      page_size: pageSize,
      group_by: 'record',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { detail: 'Search failed', error: message, results: [], total: 0, page, page_size: pageSize },
      { status: 503 },
    );
  }
}
