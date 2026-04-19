import { NextRequest, NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import {
  dispatchParse,
  extOf,
  isSupportedExt,
  UnsupportedFormatError,
} from '@/lib/people-db/parse-dispatch';

// Parses the uploaded file and returns column metadata + sample rows so the
// front-end can drive the auto-mapping step. Sprint 5 adds XLSX and text-mode
// PDF in addition to CSV/TXT; scanned PDFs are short-circuited to the OCR
// queue with a clear message rather than feeding empty rows downstream.

export const runtime = 'nodejs';

const MAX_PREVIEW_ROWS = 20;
const MAX_SAMPLE_VALUES = 8;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const auth = await requireSuperadmin({
    request: req,
    allowHeaderFallback: false,
    routeLabel: 'api/people-db/import/preview',
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

  // Scanned-only PDFs have no recoverable text — surface a 415 so the UI can
  // route the user to the OCR workflow instead of pretending we parsed it.
  if (parsed.likelyScanned) {
    return NextResponse.json(
      {
        detail: 'PDF 看起來是掃描影像（純圖片），需先走 OCR 流程再匯入。',
        likely_scanned: true,
      },
      { status: 415 },
    );
  }

  if (parsed.columns.length === 0) {
    return NextResponse.json(
      { detail: '檔案未解析出任何欄位；請確認格式。', warnings: parsed.warnings },
      { status: 422 },
    );
  }

  const previewRows = parsed.rows.slice(0, MAX_PREVIEW_ROWS);
  const columns = parsed.columns.map((colName, idx) => ({
    index: idx,
    name: colName,
    sample_values: previewRows
      .map((row) => row[colName])
      .filter((v) => v !== undefined && v !== '')
      .slice(0, MAX_SAMPLE_VALUES),
  }));

  return NextResponse.json({
    columns,
    row_count: parsed.rows.length,
    preview_rows: previewRows,
    warnings: parsed.warnings,
    format: parsed.ext,
  });
}
