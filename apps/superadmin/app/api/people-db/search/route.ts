import { NextRequest, NextResponse } from 'next/server';
import { buildSearchBody } from '@/lib/people-db/search-strategy';
import { esSearch, requireSuperAdmin } from '@/lib/people-db/es-gateway';

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

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

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

    return NextResponse.json({
      results,
      total,
      page,
      page_size: pageSize,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { detail: 'Search failed', error: message, results: [], total: 0, page, page_size: pageSize },
      { status: 503 },
    );
  }
}
