// Row 145 Sprint 3 — OCR callback webhook unit tests.
// Locks the HMAC-SHA256 signature protocol and the row-lookup-by-jobId
// contract the MockOcrClient / OpenClaw client depends on.

import { createHmac } from 'node:crypto';
import { NextRequest } from 'next/server';

// --- Mock @/utils/supabase/admin -------------------------------------------
// The route uses a chainable Supabase query builder; we replace the whole
// module with a controllable mock per-test so assertions can trace what got
// written.

type UpdateArgs = Record<string, unknown>;

interface MockState {
  lookupResult: { data: { id: string } | null; error: null | { message: string } };
  updateCalls: { eqId: string; values: UpdateArgs }[];
  updateError: null | { message: string };
  upsertCalls: unknown[][];
  upsertError: null | { message: string };
}

const mockState: MockState = {
  lookupResult: { data: null, error: null },
  updateCalls: [],
  updateError: null,
  upsertCalls: [],
  upsertError: null,
};

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (_table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => mockState.lookupResult,
        }),
      }),
      update: (values: UpdateArgs) => ({
        eq: async (_col: string, id: string) => {
          mockState.updateCalls.push({ eqId: id, values });
          return { error: mockState.updateError };
        },
      }),
      upsert: async (rows: unknown[], _opts?: unknown) => {
        mockState.upsertCalls.push(rows);
        return { error: mockState.upsertError };
      },
    }),
  }),
}));

// Now import the route after jest.mock is set up.
import { POST } from '../route';

// --- Helpers ---------------------------------------------------------------

const SECRET = 'test-secret-xyz';
const ORIGINAL_ENV = process.env;

function sign(body: string, secret = SECRET): string {
  const digest = createHmac('sha256', secret).update(body, 'utf8').digest('hex');
  return `sha256=${digest}`;
}

function makeReq(body: string, signature: string | null): NextRequest {
  const headers = new Headers();
  if (signature !== null) headers.set('x-ocr-signature', signature);
  return new NextRequest('http://localhost:3001/api/people-db/ingest/ocr/callback', {
    method: 'POST',
    headers,
    body,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockState.lookupResult = { data: null, error: null };
  mockState.updateCalls = [];
  mockState.updateError = null;
  mockState.upsertCalls = [];
  mockState.upsertError = null;
  process.env = {
    ...ORIGINAL_ENV,
    OCR_CALLBACK_SECRET: SECRET,
  };
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

// ---------------------------------------------------------------------------

describe('POST /api/people-db/ingest/ocr/callback', () => {
  it('returns 200, inserts staging rows, and updates the file row when signature is valid and jobId exists', async () => {
    mockState.lookupResult = { data: { id: 'file-uuid-1' }, error: null };
    const payload = {
      jobId: 'mock-abc',
      pages: [
        { pageNumber: 1, text: '闕貴卿 南港路一段212號2樓' },
        { pageNumber: 2, text: '詹坤隆 中南街123號' },
      ],
    };
    const body = JSON.stringify(payload);
    const res = await POST(makeReq(body, sign(body)));
    expect(res.status).toBe(200);

    // Staging rows inserted first, file status updated second.
    expect(mockState.upsertCalls).toHaveLength(1);
    const staged = mockState.upsertCalls[0] as Array<{
      file_id: string;
      record_index: number;
      raw: { page_text: string; page_number: number };
    }>;
    expect(staged).toHaveLength(2);
    expect(staged[0]).toEqual({
      file_id: 'file-uuid-1',
      record_index: 0,
      raw: { page_text: '闕貴卿 南港路一段212號2樓', page_number: 1 },
    });
    expect(staged[1].record_index).toBe(1);

    expect(mockState.updateCalls).toHaveLength(1);
    const call = mockState.updateCalls[0];
    expect(call.eqId).toBe('file-uuid-1');
    expect(call.values.status).toBe('parsed');
    expect(call.values.row_count).toBe(2);
    expect(call.values.parser).toBe('ocr');
    expect(call.values.error_msg).toBeNull();
  });

  it('returns 500 and does NOT flip status when staging insert fails', async () => {
    mockState.lookupResult = { data: { id: 'file-uuid-1' }, error: null };
    mockState.upsertError = { message: 'unique violation' };
    const body = JSON.stringify({
      jobId: 'mock-abc',
      pages: [{ pageNumber: 1, text: 'x' }],
    });
    const res = await POST(makeReq(body, sign(body)));
    expect(res.status).toBe(500);
    expect(mockState.upsertCalls).toHaveLength(1);
    expect(mockState.updateCalls).toHaveLength(0);
  });

  it('returns 401 when the signature header is missing', async () => {
    const body = JSON.stringify({ jobId: 'mock-abc', pages: [] });
    const res = await POST(makeReq(body, null));
    expect(res.status).toBe(401);
    expect(mockState.updateCalls).toHaveLength(0);
  });

  it('returns 401 when the signature is wrong', async () => {
    const body = JSON.stringify({ jobId: 'mock-abc', pages: [] });
    const res = await POST(makeReq(body, 'sha256=0000deadbeef'));
    expect(res.status).toBe(401);
    expect(mockState.updateCalls).toHaveLength(0);
  });

  it('returns 404 when jobId does not match any row', async () => {
    mockState.lookupResult = { data: null, error: null };
    const body = JSON.stringify({ jobId: 'mock-unknown', pages: [] });
    const res = await POST(makeReq(body, sign(body)));
    expect(res.status).toBe(404);
    expect(mockState.updateCalls).toHaveLength(0);
  });

  it('returns 400 when body is not valid JSON', async () => {
    const body = '{not json';
    const res = await POST(makeReq(body, sign(body)));
    expect(res.status).toBe(400);
  });

  it('returns 400 when required fields are missing', async () => {
    const body = JSON.stringify({ pages: [{ pageNumber: 1, text: 'hi' }] });
    const res = await POST(makeReq(body, sign(body)));
    expect(res.status).toBe(400);
  });

  it('returns 500 when OCR_CALLBACK_SECRET is unset (config error, not invalid client)', async () => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.OCR_CALLBACK_SECRET;
    const body = JSON.stringify({ jobId: 'mock-abc', pages: [] });
    const res = await POST(makeReq(body, sign(body, 'whatever')));
    expect(res.status).toBe(500);
  });
});
