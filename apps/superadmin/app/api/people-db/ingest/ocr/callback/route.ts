// POST /api/people-db/ingest/ocr/callback
//
// Receives OCR results from the OCR provider (MockOcrClient in Sprint 3,
// OpenClaw when the service goes live), verifies the HMAC-SHA256 signature,
// looks up the matching people_db_files row by ocr_job_id, and transitions
// it from `ocr_queued` → `parsed`.
//
// Sprint 4a Phase 1 wires this callback to `people_db_staging_records`:
// pages are inserted as staging rows (1 row per page, raw.page_text holds
// the OCR text) so the normalize + ER workers can treat OCR output and
// parser output uniformly.
//
// Signature: header `x-ocr-signature: sha256=<hex-digest>` over the raw
// request body using env OCR_CALLBACK_SECRET. Shared with MockOcrClient's
// simulateCallback helper so tests and prod follow the same protocol.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { insertStagingRecords, ocrPagesToStaging } from '@/lib/people-db/staging';

interface OcrCallbackPage {
  pageNumber: number;
  text: string;
}
interface OcrCallbackPayload {
  jobId: string;
  pages: OcrCallbackPage[];
}

function verifySignature(body: string, signatureHeader: string, secret: string): boolean {
  const [prefix, digest] = signatureHeader.split('=', 2);
  if (prefix !== 'sha256' || !digest) return false;
  const expected = createHmac('sha256', secret).update(body, 'utf8').digest('hex');
  try {
    return timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

function isValidPayload(value: unknown): value is OcrCallbackPayload {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.jobId !== 'string' || v.jobId.length === 0) return false;
  if (!Array.isArray(v.pages)) return false;
  return v.pages.every(
    (p) =>
      p &&
      typeof p === 'object' &&
      typeof (p as Record<string, unknown>).pageNumber === 'number' &&
      typeof (p as Record<string, unknown>).text === 'string',
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.OCR_CALLBACK_SECRET;
  if (!secret) {
    // Hard-fail rather than silently accept unsigned callbacks. The worker
    // and webhook share this env; if it's missing, both sides are broken.
    return NextResponse.json(
      { ok: false, error: 'OCR_CALLBACK_SECRET not configured' },
      { status: 500 },
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get('x-ocr-signature') ?? '';
  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!isValidPayload(payload)) {
    return NextResponse.json(
      { ok: false, error: 'Missing or malformed fields: jobId, pages[].pageNumber, pages[].text' },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  // Look up the file row by ocr_job_id. maybeSingle so an unknown jobId is
  // a clean 404 instead of a Supabase error.
  const lookup = await supabase
    .from('people_db_files')
    .select('id')
    .eq('ocr_job_id', payload.jobId)
    .maybeSingle();
  if (lookup.error) {
    return NextResponse.json(
      { ok: false, error: 'DB lookup failed', detail: lookup.error.message },
      { status: 500 },
    );
  }
  if (!lookup.data) {
    return NextResponse.json(
      { ok: false, error: `No file row found for jobId=${payload.jobId}` },
      { status: 404 },
    );
  }

  // Sprint 4a Phase 1: persist OCR pages as staging rows (one row per
  // page, raw.page_text holds the text). Staging insert runs BEFORE the
  // status flip so if it fails the file stays 'ocr_queued' and can be
  // retried by re-calling this webhook; the unique (file_id, record_index)
  // constraint plus upsert makes that idempotent.
  const stagingRows = ocrPagesToStaging(lookup.data.id, payload.pages);
  try {
    await insertStagingRecords(supabase, stagingRows);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Staging insert failed',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  const updateResult = await supabase
    .from('people_db_files')
    .update({
      status: 'parsed',
      parser: 'ocr',
      row_count: payload.pages.length,
      error_msg: null,
    })
    .eq('id', lookup.data.id);
  if (updateResult.error) {
    return NextResponse.json(
      { ok: false, error: 'DB update failed', detail: updateResult.error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, jobId: payload.jobId, pageCount: payload.pages.length });
}
