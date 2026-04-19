import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { esBulkIndex } from '@/lib/people-db/es-gateway';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import { mapRowsToDocuments } from '@/lib/people-db/import-mapper';
import {
  dispatchParse,
  extOf,
  isSupportedExt,
  UnsupportedFormatError,
} from '@/lib/people-db/parse-dispatch';

// Stateless submit: the client re-sends the file alongside the mapping so
// there's no server-side temp storage. We parse, map, and bulk-index to ES in
// one request. For files above MAX_SYNC_FILE_BYTES callers should instead go
// through the background job queue (Sprint 5b). This route keeps the 25MB cap
// for now — anything larger gets a 413 suggesting the async path.

export const runtime = 'nodejs';

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const BULK_CHUNK_SIZE = 500;

export async function POST(req: NextRequest) {
  const auth = await requireSuperadmin({
    request: req,
    allowHeaderFallback: false,
    routeLabel: 'api/people-db/import/submit',
  });
  if (!auth.ok) {
    return NextResponse.json({ detail: auth.message }, { status: auth.status });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ detail: 'file is required' }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { detail: `file exceeds ${MAX_FILE_BYTES} bytes` },
      { status: 413 },
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

  // Row 146: dataset_root is now mandatory so every imported record can be
  // traced back to a named dataset. The legacy data_source / 'uncategorized'
  // fallbacks are intentionally removed — callers that hit this 400 should
  // surface the dataset picker on the client (see ImportWorkspace).
  const datasetRoot = stringField(form, 'dataset_root');
  if (!datasetRoot) {
    return NextResponse.json(
      { detail: 'dataset_root is required (Row 146: 匯入時必須指定資料集根目錄)' },
      { status: 400 },
    );
  }
  const datasetSubpath = stringField(form, 'dataset_subpath');
  const explicitPath = stringField(form, 'dataset_path');
  const datasetPath =
    explicitPath ||
    [datasetRoot, datasetSubpath].filter(Boolean).join('/');

  const batchId = randomUUID();

  let parsed;
  try {
    parsed = await dispatchParse(file);
  } catch (err) {
    if (err instanceof UnsupportedFormatError) {
      return NextResponse.json({ detail: err.message }, { status: 415 });
    }
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : 'failed to parse file' },
      { status: 422 },
    );
  }

  if (parsed.likelyScanned) {
    return NextResponse.json(
      {
        detail: 'PDF 看起來是掃描影像（純圖片），需先走 OCR 流程再匯入。',
        likely_scanned: true,
        batch_id: batchId,
      },
      { status: 415 },
    );
  }

  const docs = mapRowsToDocuments({
    columns: parsed.columns,
    rows: parsed.rows,
    columnMapping,
    datasetPath,
    datasetRoot: datasetRoot || null,
    datasetSubpath: datasetSubpath || null,
    dataSource: stringField(form, 'data_source') || null,
    batchId,
    batchLabel: stringField(form, 'batch_label') || null,
  });

  if (docs.length === 0) {
    return NextResponse.json(
      {
        detail: 'No valid rows — full_name column is empty for every row.',
        batch_id: batchId,
        warnings: parsed.warnings,
      },
      { status: 422 },
    );
  }

  let totalIndexed = 0;
  let totalFailed = 0;
  const failures: Array<{ index: number; reason: string }> = [];
  for (let start = 0; start < docs.length; start += BULK_CHUNK_SIZE) {
    const chunk = docs.slice(start, start + BULK_CHUNK_SIZE);
    const result = await esBulkIndex(chunk);
    totalIndexed += result.indexed;
    totalFailed += result.failed;
    for (const f of result.failures) {
      failures.push({ index: start + f.index, reason: f.reason });
    }
  }

  return NextResponse.json({
    batch_id: batchId,
    dataset_path: datasetPath,
    format: parsed.ext,
    total_rows: parsed.rows.length,
    indexed: totalIndexed,
    failed: totalFailed,
    failures: failures.slice(0, 20),
    warnings: parsed.warnings,
  });
}

function stringField(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === 'string' ? v.trim() : '';
}
