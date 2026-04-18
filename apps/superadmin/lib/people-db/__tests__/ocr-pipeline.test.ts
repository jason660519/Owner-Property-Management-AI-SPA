// Row 145 Sprint 3 — OCR pipeline end-to-end.
//
// Walks a scanned PDF from enqueue through the callback webhook, asserting
// the file row transitions pending → ocr_queued → parsed using the real
// dispatchOcr helper, the real MockOcrClient, and the real callback route.
//
// Gated on RUN_INTEGRATION=1 (skipped by default) so `npm test` stays fast.
// Run manually:
//
//   RUN_INTEGRATION=1 npx jest lib/people-db/__tests__/ocr-pipeline.test.ts

import { createHmac } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// In-memory Supabase store shared by dispatchOcr + route.POST mocks.
// ---------------------------------------------------------------------------

interface Row {
  id: string;
  sha256: string;
  source_path: string;
  status: string;
  ocr_job_id?: string | null;
  ocr_provider?: string | null;
  ocr_submitted_at?: string | null;
  parser?: string | null;
  row_count?: number | null;
  error_msg?: string | null;
}

const store = new Map<string, Row>();

function makeFakeDb() {
  return {
    from: (_table: string) => ({
      select: () => ({
        eq: (col: string, val: unknown) => ({
          maybeSingle: async () => {
            for (const row of store.values()) {
              if ((row as unknown as Record<string, unknown>)[col] === val) {
                return { data: { id: row.id }, error: null };
              }
            }
            return { data: null, error: null };
          },
        }),
      }),
      update: (values: Partial<Row>) => ({
        eq: async (col: string, val: unknown) => {
          for (const [id, row] of store) {
            if ((row as unknown as Record<string, unknown>)[col] === val) {
              store.set(id, { ...row, ...values });
              return { error: null };
            }
          }
          return { error: { message: 'row not found' } };
        },
      }),
    }),
  };
}

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => makeFakeDb(),
}));

import { POST } from '@/app/api/people-db/ingest/ocr/callback/route';
import { dispatchOcr } from '../ocr/dispatch';
import { MockOcrClient } from '../ocr/mock-client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SECRET = 'integration-secret';

function signedRequest(payload: unknown): NextRequest {
  const body = JSON.stringify(payload);
  const digest = createHmac('sha256', SECRET).update(body, 'utf8').digest('hex');
  const headers = new Headers({ 'x-ocr-signature': `sha256=${digest}` });
  return new NextRequest('http://localhost:3001/api/people-db/ingest/ocr/callback', {
    method: 'POST',
    headers,
    body,
  });
}

// ---------------------------------------------------------------------------

const describeIntegration = process.env.RUN_INTEGRATION === '1' ? describe : describe.skip;

describeIntegration('OCR pipeline integration: enqueue → callback → parsed', () => {
  let tmpDir: string;
  let pdfPath: string;
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    store.clear();
    tmpDir = mkdtempSync(join(tmpdir(), 'ocr-pipeline-'));
    pdfPath = join(tmpDir, 'scanned.pdf');
    // Minimal fake PDF bytes; MockOcrClient only checks byteLength.
    writeFileSync(pdfPath, Buffer.from('%PDF-FAKE-BYTES'));
    process.env = { ...ORIGINAL_ENV, OCR_CALLBACK_SECRET: SECRET };
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    process.env = ORIGINAL_ENV;
  });

  it('transitions pending → ocr_queued → parsed via MockOcrClient + callback webhook', async () => {
    // Seed a pending row.
    store.set('f1', {
      id: 'f1',
      sha256: 'sha-integration-1',
      source_path: pdfPath,
      status: 'pending',
    });

    // Hook the mock client to call the real webhook when simulateCallback fires.
    const client = new MockOcrClient();
    client.onResult(async (result) => {
      const res = await POST(
        signedRequest({ jobId: result.jobId, pages: result.pages }),
      );
      expect(res.status).toBe(200);
    });

    // Step 1: enqueue via dispatchOcr. Should set status=ocr_queued + job id fields.
    const db = makeFakeDb();
    const job = await dispatchOcr(
      db as unknown as Parameters<typeof dispatchOcr>[0],
      { id: 'f1', sha256: 'sha-integration-1', source_path: pdfPath },
      client,
    );

    expect(job.jobId).toMatch(/^mock-/);
    const afterEnqueue = store.get('f1');
    expect(afterEnqueue?.status).toBe('ocr_queued');
    expect(afterEnqueue?.ocr_job_id).toBe(job.jobId);
    expect(afterEnqueue?.ocr_provider).toBe('mock');
    expect(afterEnqueue?.ocr_submitted_at).toBeTruthy();

    // Step 2: simulate the OCR provider calling back with extracted text.
    await client.simulateCallback(job.jobId, [
      { pageNumber: 1, text: '闕貴卿 南港路一段212號2樓' },
      { pageNumber: 2, text: '詹坤隆 中南街123號' },
      { pageNumber: 3, text: '陳金賜 研究院路一段101巷25號' },
    ]);

    // Step 3: row should now be `parsed` with OCR metadata + row_count = page count.
    const afterCallback = store.get('f1');
    expect(afterCallback?.status).toBe('parsed');
    expect(afterCallback?.parser).toBe('ocr');
    expect(afterCallback?.row_count).toBe(3);
    expect(afterCallback?.ocr_job_id).toBe(job.jobId); // preserved for audit
  });

  it('does not transition the row when the jobId is unknown to the DB', async () => {
    const client = new MockOcrClient();
    let callbackStatus = 0;
    client.onResult(async (result) => {
      const res = await POST(
        signedRequest({ jobId: result.jobId, pages: result.pages }),
      );
      callbackStatus = res.status;
    });

    // Enqueue WITHOUT a matching row in the store.
    await client.enqueue('sha-none', new Uint8Array([1, 2, 3]));
    const allJobIds = [...(client as unknown as { queue: Map<string, unknown> }).queue.keys()];
    await client.simulateCallback(allJobIds[0], [{ pageNumber: 1, text: 'x' }]);

    expect(callbackStatus).toBe(404);
    // Store remains empty.
    expect(store.size).toBe(0);
  });
});
