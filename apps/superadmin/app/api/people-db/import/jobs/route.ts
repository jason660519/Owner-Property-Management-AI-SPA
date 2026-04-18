import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/people-db/es-gateway';
import {
  enqueueImportJob,
  ASYNC_THRESHOLD_BYTES,
  MAX_ASYNC_FILE_BYTES,
} from '@/lib/people-db/import-jobs';
import { extOf, isSupportedExt } from '@/lib/people-db/parse-dispatch';
import { createAdminClient } from '@/utils/supabase/admin';

// Async upload path for files >= ASYNC_THRESHOLD_BYTES. Synchronous path at
// /api/people-db/import/submit is still the default — the frontend picks
// whichever is appropriate based on file size.
//
// POST: stage the file in Supabase Storage + create a pending job row.
// GET:  list recent jobs (paged; 50 at a time, status filter supported).

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ detail: 'file is required' }, { status: 400 });
  }
  if (file.size > MAX_ASYNC_FILE_BYTES) {
    return NextResponse.json(
      { detail: `file exceeds ${MAX_ASYNC_FILE_BYTES} bytes` },
      { status: 413 },
    );
  }
  if (file.size < ASYNC_THRESHOLD_BYTES) {
    return NextResponse.json(
      {
        detail: `file below async threshold (${ASYNC_THRESHOLD_BYTES} bytes); use /api/people-db/import/submit instead`,
      },
      { status: 400 },
    );
  }
  const ext = extOf(file.name);
  if (!isSupportedExt(ext)) {
    return NextResponse.json(
      { detail: `目前支援 CSV / TXT / XLSX / PDF；${ext || '(無副檔名)'} 尚未支援` },
      { status: 415 },
    );
  }

  const mappingRaw = form.get('column_mapping');
  if (typeof mappingRaw !== 'string') {
    return NextResponse.json({ detail: 'column_mapping is required' }, { status: 400 });
  }
  let columnMapping: Record<string, number>;
  try {
    const parsed = JSON.parse(mappingRaw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('column_mapping must be an object');
    }
    columnMapping = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const num = typeof value === 'number' ? value : Number(value);
      if (!Number.isInteger(num) || num < 0) continue;
      columnMapping[key] = num;
    }
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : 'invalid column_mapping' },
      { status: 400 },
    );
  }

  if (columnMapping.full_name === undefined) {
    return NextResponse.json(
      { detail: 'column_mapping.full_name is required' },
      { status: 400 },
    );
  }

  const datasetRoot = stringField(form, 'dataset_root') || null;
  const datasetSubpath = stringField(form, 'dataset_subpath') || null;
  const explicitPath = stringField(form, 'dataset_path');
  const datasetPath =
    explicitPath ||
    [datasetRoot, datasetSubpath].filter(Boolean).join('/') ||
    stringField(form, 'data_source') ||
    'uncategorized';

  try {
    const job = await enqueueImportJob({
      userId: auth.user.userId,
      file,
      columnMapping,
      datasetRoot,
      datasetSubpath,
      datasetPath: datasetPath || null,
      dataSource: stringField(form, 'data_source') || null,
      batchLabel: stringField(form, 'batch_label') || null,
    });
    return NextResponse.json(
      {
        job_id: job.id,
        status: job.status,
        file_name: job.file_name,
        file_size_bytes: job.file_size_bytes,
        created_at: job.created_at,
      },
      { status: 202 },
    );
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : 'enqueue failed' },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const limitRaw = Number.parseInt(searchParams.get('limit') ?? '50', 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;

  const admin = createAdminClient();
  let query = admin
    .from('people_import_jobs')
    .select(
      'id,file_name,file_size_bytes,file_ext,status,total_rows,indexed_rows,failed_rows,error_message,created_at,started_at,completed_at,batch_id,dataset_path',
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status && ['pending', 'processing', 'done', 'failed'].includes(status)) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ jobs: data ?? [] });
}

function stringField(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === 'string' ? v.trim() : '';
}
