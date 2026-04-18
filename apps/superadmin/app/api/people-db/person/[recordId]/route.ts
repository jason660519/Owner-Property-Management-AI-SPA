import { NextRequest, NextResponse } from 'next/server';
import { esSearch, requireSuperAdmin } from '@/lib/people-db/es-gateway';

// Fetches a single people-database record by record_id. Used by the person
// detail page to render the master profile before delegating relationship
// discovery to /api/people-db/related.

interface PersonSource {
  record_id?: string;
  full_name?: string;
  name?: string;
  id_number?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  address?: string | null;
  address_normalized?: string | null;
  company?: string | null;
  organization?: string | null;
  birth_date?: string | null;
  note?: string | null;
  data_source?: string | null;
  dataset_path?: string | null;
  quality_score?: number | null;
  import_batch_id?: string | null;
  source_file_path?: string | null;
  source_document_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface EsHit {
  _id: string;
  _source: PersonSource;
}

interface EsResponse {
  hits?: { hits?: EsHit[] };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ recordId: string }> },
) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const { recordId } = await params;
  if (!recordId) {
    return NextResponse.json({ detail: 'recordId is required' }, { status: 400 });
  }

  try {
    const response = await esSearch<EsResponse>({
      size: 1,
      query: { term: { record_id: recordId } },
    });
    const hit = response.hits?.hits?.[0];
    if (!hit) {
      return NextResponse.json({ detail: 'record not found', record_id: recordId }, { status: 404 });
    }

    const source = hit._source ?? {};
    return NextResponse.json({
      record_id: source.record_id ?? hit._id,
      full_name: source.full_name ?? source.name ?? '',
      id_number: source.id_number ?? null,
      phone: source.phone ?? null,
      mobile: source.mobile ?? null,
      email: source.email ?? null,
      address: source.address ?? null,
      address_normalized: source.address_normalized ?? null,
      company: source.company ?? source.organization ?? null,
      birth_date: source.birth_date ?? null,
      note: source.note ?? null,
      data_source: source.data_source ?? null,
      dataset_path: source.dataset_path ?? source.data_source ?? null,
      quality_score: source.quality_score ?? null,
      import_batch_id: source.import_batch_id ?? null,
      source_file_path: source.source_file_path ?? null,
      source_document_id: source.source_document_id ?? null,
      created_at: source.created_at ?? null,
      updated_at: source.updated_at ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { detail: 'Lookup failed', error: message },
      { status: 503 },
    );
  }
}
