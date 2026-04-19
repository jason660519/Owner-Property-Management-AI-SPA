import { NextRequest, NextResponse } from 'next/server';
import { esSearch } from '@/lib/people-db/es-gateway';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';

// Legacy flat facet endpoint. Kept for backward compatibility with UI surfaces
// that haven't adopted the hierarchical /dataset-tree endpoint yet.

interface FacetResponse {
  aggregations?: {
    by_source?: {
      buckets: Array<{ key: string; doc_count: number }>;
    };
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireSuperadmin({
    request,
    allowHeaderFallback: false,
    routeLabel: 'api/people-db/datasets',
  });
  if (!auth.ok) {
    return NextResponse.json({ detail: auth.message }, { status: auth.status });
  }

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
