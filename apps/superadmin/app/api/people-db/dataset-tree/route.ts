import { NextResponse } from 'next/server';
import {
  buildDatasetTree,
  type DatasetBucket,
  type DatasetMetadataOverride,
} from '@/lib/people-db/dataset-tree';
import { esSearch, requireSuperAdmin } from '@/lib/people-db/es-gateway';
import { createClient } from '@/utils/supabase/server';

interface EsTermsAggregationResponse {
  aggregations?: {
    by_source?: {
      buckets: Array<{
        key: string;
        doc_count: number;
        last_import?: { value_as_string?: string };
        quality?: { value?: number };
      }>;
    };
  };
  hits?: { total?: { value?: number } };
}

export async function GET() {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const response = await esSearch<EsTermsAggregationResponse>({
      size: 0,
      track_total_hits: true,
      aggs: {
        by_source: {
          terms: { field: 'data_source', size: 1000 },
          aggs: {
            last_import: { max: { field: 'created_at' } },
            quality: { avg: { field: 'quality_score' } },
          },
        },
      },
    });

    const buckets: DatasetBucket[] =
      response.aggregations?.by_source?.buckets?.map((bucket) => ({
        key: bucket.key,
        doc_count: bucket.doc_count,
        last_imported_at: bucket.last_import?.value_as_string ?? null,
        quality_avg: typeof bucket.quality?.value === 'number' ? bucket.quality.value : null,
      })) ?? [];

    // Merge user overrides (rename / favorite / enabled) from Supabase. RLS
    // guarantees only super_admin rows come back; we treat failures as soft
    // (missing metadata just means no overrides for this request).
    const metadata: Record<string, DatasetMetadataOverride> = {};
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from('dataset_metadata')
        .select('dataset_path, display_name, favorited, enabled');
      for (const row of data ?? []) {
        metadata[row.dataset_path] = {
          displayName: row.display_name ?? undefined,
          favorited: row.favorited ?? undefined,
          enabled: row.enabled ?? undefined,
        };
      }
    } catch {
      // Soft-fail: absence of overrides shouldn't break the tree.
    }

    const tree = buildDatasetTree(buckets, metadata);
    const total = response.hits?.total?.value ?? 0;

    return NextResponse.json({ tree, total, buckets: buckets.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { detail: 'Failed to build dataset tree', error: message },
      { status: 503 },
    );
  }
}
