import { NextRequest } from 'next/server';

interface AuthState {
  ok: boolean;
  status?: 401 | 403;
  userId: string;
}

const authState: AuthState = { ok: true, userId: 'admin-1' };

jest.mock('@/lib/auth/require-superadmin', () => ({
  requireSuperadmin: jest.fn(async () => {
    if (authState.ok) {
      return { ok: true, userId: authState.userId, source: 'session' as const, viaSession: true };
    }
    return { ok: false, status: authState.status ?? 401, message: 'denied' };
  }),
}));

jest.mock('@/lib/ai/rate-limit', () => ({
  checkRateLimit: jest.fn(async () => ({
    allowed: true,
    remaining: 9,
    resetAt: new Date('2026-04-27T00:01:00Z'),
  })),
}));

const pdfProbeSpy = jest.fn(async (_buffer?: unknown) => ({
  text: '建物登記第二類謄本 建物標示部 所有權部 謄本檢查號 地政事務所 '.repeat(4),
  pageCount: 1,
  totalChars: 160,
  likelyScanned: false,
}));

jest.mock('@/lib/transcript-parse/transcript-pdf-probe', () => ({
  extractTranscriptPdfTextForRouting: (buffer: unknown) => pdfProbeSpy(buffer),
}));

interface DocumentRow {
  id: string;
  property_id: string;
  property_type: string;
  file_path: string;
  document_name: string | null;
  mime_type: string | null;
  original_filename: string | null;
  document_type: string | null;
}

const fromSpy = jest.fn();
let documentRows: DocumentRow[] = [];
let insertedPayload: Record<string, unknown> | null = null;
let listRows: Array<Record<string, unknown>> = [];

const runRow = {
  id: 'run-1',
  property_id: 'property-1',
  property_type: 'sale',
  requested_by_user_id: 'admin-1',
  status: 'route_selected',
  current_phase: 'route_selected',
  source_document_ids: ['doc-1'],
  route_decision: { aggregateRoute: 'vlm_visual', documents: [] },
  detection_result: {},
  parsed_result: {},
  review_result: {},
  confirmed_result: null,
  error_message: null,
  created_at: '2026-04-27T00:00:00Z',
  updated_at: '2026-04-27T00:00:00Z',
  completed_at: null,
};

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        download: async () => ({
          data: {
            arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
          },
          error: null,
        }),
      }),
    },
    from: (table: string) => {
      fromSpy(table);
      if (table === 'property_documents') {
        return {
          select: () => ({
            in: () => ({
              eq: async () => ({ data: documentRows, error: null }),
            }),
          }),
        };
      }
      if (table === 'transcript_intake_runs') {
        return {
          insert: (payload: Record<string, unknown>) => {
            insertedPayload = payload;
            return {
              select: () => ({
                single: async () => ({ data: { ...runRow, ...payload, id: 'run-1' }, error: null }),
              }),
            };
          },
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: async () => ({ data: listRows, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  }),
}));

import { GET, POST } from '../route';

function postReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3001/api/transcript-intake/runs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function getReq(): NextRequest {
  return new NextRequest(
    'http://localhost:3001/api/transcript-intake/runs?propertyId=property-1&propertyType=sale',
    { method: 'GET' },
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  authState.ok = true;
  authState.status = undefined;
  authState.userId = 'admin-1';
  insertedPayload = null;
  listRows = [runRow];
  documentRows = [
    {
      id: 'doc-1',
      property_id: 'property-1',
      property_type: 'sales',
      file_path: 'property-1/scan.pdf',
      document_name: '謄本-scan',
      mime_type: 'application/pdf',
      original_filename: 'scan.pdf',
      document_type: 'building_registry_transcript',
    },
  ];
  pdfProbeSpy.mockClear();
  pdfProbeSpy.mockResolvedValue({
    text: '建物登記第二類謄本 建物標示部 所有權部 謄本檢查號 地政事務所 '.repeat(4),
    pageCount: 1,
    totalChars: 160,
    likelyScanned: false,
  });
});

describe('/api/transcript-intake/runs', () => {
  it('POST returns 401 before touching Supabase when auth fails', async () => {
    authState.ok = false;
    authState.status = 401;

    const res = await POST(postReq({
      propertyId: 'property-1',
      propertyType: 'sale',
      documentIds: ['doc-1'],
    }));

    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('POST creates a route-selected run for matching documents', async () => {
    const res = await POST(postReq({
      propertyId: 'property-1',
      propertyType: 'sale',
      documentIds: ['doc-1'],
    }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.run.id).toBe('run-1');
    expect(insertedPayload?.status).toBe('route_selected');
    expect(insertedPayload?.source_document_ids).toEqual(['doc-1']);
    expect(insertedPayload?.route_decision).toMatchObject({
      aggregateRoute: 'local_python_text',
    });
    expect(pdfProbeSpy).toHaveBeenCalledTimes(1);
  });

  it('POST routes PDF without usable text to VLM', async () => {
    pdfProbeSpy.mockResolvedValue({
      text: '',
      pageCount: 5,
      totalChars: 0,
      likelyScanned: true,
    });

    const res = await POST(postReq({
      propertyId: 'property-1',
      propertyType: 'sale',
      documentIds: ['doc-1'],
    }));

    expect(res.status).toBe(200);
    expect(insertedPayload?.route_decision).toMatchObject({
      aggregateRoute: 'vlm_visual',
      documents: [
        expect.objectContaining({
          pdfTextProbe: expect.objectContaining({ likelyScanned: true }),
        }),
      ],
    });
  });

  it('POST routes owner title deed images to VLM without PDF text probing', async () => {
    documentRows = [{
      ...documentRows[0],
      file_path: 'property-1/title-copy.jpg',
      document_name: '屋主建物權狀影本',
      mime_type: 'image/jpeg',
      original_filename: '屋主建物權狀影本.jpg',
      document_type: 'building_title',
    }];

    const res = await POST(postReq({
      propertyId: 'property-1',
      propertyType: 'sale',
      documentIds: ['doc-1'],
    }));

    expect(res.status).toBe(200);
    expect(insertedPayload?.route_decision).toMatchObject({
      aggregateRoute: 'vlm_visual',
      documents: [
        expect.objectContaining({
          route: 'vlm_visual',
          inputFormat: 'image',
          pdfTextProbe: null,
        }),
      ],
    });
    expect(pdfProbeSpy).not.toHaveBeenCalled();
  });

  it('POST rejects documents that belong to another property', async () => {
    documentRows = [{ ...documentRows[0], property_id: 'other-property' }];

    const res = await POST(postReq({
      propertyId: 'property-1',
      propertyType: 'sale',
      documentIds: ['doc-1'],
    }));

    expect(res.status).toBe(400);
    expect(insertedPayload).toBeNull();
  });

  it('GET lists runs for a property', async () => {
    const res = await GET(getReq());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.runs).toHaveLength(1);
    expect(body.runs[0].id).toBe('run-1');
    expect(fromSpy).toHaveBeenCalledWith('transcript_intake_runs');
  });
});
