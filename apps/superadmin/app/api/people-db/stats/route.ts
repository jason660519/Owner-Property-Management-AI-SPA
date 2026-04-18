import { NextResponse } from 'next/server';
import { esSearch, requireSuperAdmin } from '@/lib/people-db/es-gateway';

interface StatsResponse {
  hits?: { total?: { value?: number } | number };
  aggregations?: {
    source_count?: { value?: number };
    avg_quality?: { value?: number | null };
    indexed_count?: { doc_count?: number };
  };
}

export async function GET() {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const response = await esSearch<StatsResponse>({
      size: 0,
      track_total_hits: true,
      aggs: {
        source_count: { cardinality: { field: 'data_source' } },
        avg_quality: { avg: { field: 'quality_score' } },
        indexed_count: {
          filter: { exists: { field: 'record_id' } },
        },
      },
    });

    const totalRaw = response.hits?.total;
    const total_records = typeof totalRaw === 'number' ? totalRaw : totalRaw?.value ?? 0;

    return NextResponse.json({
      total_records,
      indexed_records: response.aggregations?.indexed_count?.doc_count ?? total_records,
      total_sources: response.aggregations?.source_count?.value ?? 0,
      avg_quality_score: response.aggregations?.avg_quality?.value ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        detail: 'Failed to load stats',
        error: message,
        total_records: null,
        indexed_records: null,
        total_sources: null,
        avg_quality_score: null,
      },
      { status: 503 },
    );
  }
}
