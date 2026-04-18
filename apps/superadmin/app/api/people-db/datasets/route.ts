import { NextResponse } from 'next/server';
import { esSearch, requireSuperAdmin } from '@/lib/people-db/es-gateway';

// Legacy flat facet endpoint. Kept for backward compatibility with UI surfaces
// that haven't adopted the hierarchical /dataset-tree endpoint yet.

interface FacetResponse {
  aggregations?: {
    by_source?: {
      buckets: Array<{ key: string; doc_count: number }>;
    };
  };
}

export async function GET() {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const response = await esSearch<FacetResponse>({
      size: 0,
      aggs: {
        by_source: {
          terms: { field: 'data_source', size: 1000 },
        },
      },
    });

    const datasets =
      response.aggregations?.by_source?.buckets?.map((bucket) => ({
        key: bucket.key,
        count: bucket.doc_count,
      })) ?? [];

    return NextResponse.json({ datasets });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { detail: 'Failed to load datasets', error: message, datasets: [] },
      { status: 503 },
    );
  }
}
