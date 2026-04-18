import { NextRequest, NextResponse } from 'next/server';
import { esSearch, requireSuperAdmin } from '@/lib/people-db/es-gateway';

// Finds people linked to the given record by shared address / phone / company.
// Used by the person-detail page's "親友關係圖譜" feature. The query pivots on
// the seed record's identifiers, excludes the record itself, and groups by
// match type so the UI can render a grouped list.

interface RelatedSource {
  name?: string;
  id_number?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  address?: string;
  address_normalized?: string;
  company?: string;
  dataset_path?: string;
  record_id?: string;
}

interface EsHit<T> {
  _id: string;
  _score: number;
  _source: T;
}

interface EsSearchResponse<T> {
  hits?: { total?: { value?: number } | number; hits?: EsHit<T>[] };
}

const DEFAULT_SIZE = 50;

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const params = req.nextUrl.searchParams;
  const recordId = params.get('record_id');
  const address = params.get('address') ?? params.get('address_normalized');
  const phone = params.get('phone');
  const mobile = params.get('mobile');
  const company = params.get('company');
  const size = clampSize(params.get('size'));

  if (!recordId && !address && !phone && !mobile && !company) {
    return NextResponse.json(
      { detail: 'at least one of record_id / address / phone / mobile / company is required' },
      { status: 400 },
    );
  }

  // When record_id is given, fetch the seed first so the UI can drive
  // subsequent calls with derived fields. This keeps the endpoint symmetrical
  // whether callers pass the record or the identifiers directly.
  let seed: RelatedSource | null = null;
  if (recordId) {
    const seedRes = await esSearch<EsSearchResponse<RelatedSource>>({
      size: 1,
      query: { term: { record_id: recordId } },
    });
    seed = seedRes.hits?.hits?.[0]?._source ?? null;
    if (!seed) {
      return NextResponse.json({ detail: 'seed record not found', record_id: recordId }, { status: 404 });
    }
  }

  const targets = {
    address: address ?? seed?.address_normalized ?? seed?.address ?? null,
    phone: phone ?? seed?.phone ?? null,
    mobile: mobile ?? seed?.mobile ?? null,
    company: company ?? seed?.company ?? null,
  };

  const groups: Record<string, Array<{ record_id: string; source: RelatedSource; score: number }>> = {
    address: [],
    phone: [],
    mobile: [],
    company: [],
  };

  const seedRecordId = recordId ?? seed?.record_id ?? null;

  await Promise.all(
    (Object.keys(groups) as Array<keyof typeof groups>).map(async (key) => {
      const value = targets[key];
      if (!value) return;
      const field = key === 'address' ? 'address_normalized' : key;
      const must: unknown[] = [{ term: { [field]: value } }];
      const mustNot: unknown[] = seedRecordId ? [{ term: { record_id: seedRecordId } }] : [];
      const response = await esSearch<EsSearchResponse<RelatedSource>>({
        size,
        query: { bool: { must, must_not: mustNot } },
      });
      for (const hit of response.hits?.hits ?? []) {
        groups[key].push({
          record_id: hit._source.record_id ?? hit._id,
          source: hit._source,
          score: hit._score,
        });
      }
    }),
  );

  return NextResponse.json({
    seed: seedRecordId ? { record_id: seedRecordId, source: seed } : null,
    targets,
    groups,
  });
}

function clampSize(raw: string | null): number {
  const n = raw ? Number(raw) : DEFAULT_SIZE;
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_SIZE;
  return Math.min(200, Math.max(1, Math.floor(n)));
}
