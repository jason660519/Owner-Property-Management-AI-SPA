import { NextRequest } from 'next/server';

const authState = { ok: true as boolean };
const fromMock = jest.fn();
const insertMock = jest.fn();
const eqMock = jest.fn();
const rangeMock = jest.fn();

jest.mock('@/lib/auth/require-superadmin', () => ({
  requireSuperadmin: jest.fn(async () => {
    if (!authState.ok) {
      return { ok: false as const, status: 401 as const, message: 'denied' };
    }
    return { ok: true as const, userId: 'user-1', source: 'session' as const, viaSession: true };
  }),
}));

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      fromMock(table);
      const listTerminal = Promise.resolve({
        data: [
          {
            id: 'run-1',
            row_id: 'baseline-gemini-banana',
            provider: 'gemini',
            model_id: 'gemini-3.1-flash-image-preview',
            success: true,
            created_at: '2026-04-30T00:00:00.000Z',
          },
        ],
        error: null,
        count: 1,
      });
      const insertTerminal = Promise.resolve({
        data: { id: 'run-1', row_id: 'baseline-gemini-banana' },
        error: null,
      });
      const chain = {
        select: () => chain,
        eq: (...args: unknown[]) => {
          eqMock(...args);
          return chain;
        },
        order: () => chain,
        range: (...args: unknown[]) => {
          rangeMock(...args);
          return listTerminal;
        },
        insert: (...args: unknown[]) => {
          insertMock(...args);
          return {
            select: () => ({
              single: () => insertTerminal,
            }),
          };
        },
      };
      return chain;
    },
  }),
}));

import { GET, POST } from '../route';

function req(url: string): NextRequest {
  return new NextRequest(url);
}

function postReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/ai-settings/image-to-image-evaluation-runs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  authState.ok = true;
  jest.clearAllMocks();
});

describe('/api/ai-settings/image-to-image-evaluation-runs', () => {
  it('GET returns 401 without touching run table when auth fails', async () => {
    authState.ok = false;
    const res = await GET(req('http://localhost/api/ai-settings/image-to-image-evaluation-runs'));

    expect(res.status).toBe(401);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('GET loads user-scoped row history', async () => {
    const res = await GET(req('http://localhost/api/ai-settings/image-to-image-evaluation-runs?rowId=baseline-gemini-banana&limit=10'));
    const body = await res.json() as { runs: { row_id: string }[]; total: number };

    expect(res.status).toBe(200);
    expect(fromMock).toHaveBeenCalledWith('image_to_image_evaluation_runs');
    expect(eqMock).toHaveBeenCalledWith('user_id', 'user-1');
    expect(eqMock).toHaveBeenCalledWith('row_id', 'baseline-gemini-banana');
    expect(rangeMock).toHaveBeenCalledWith(0, 9);
    expect(body.total).toBe(1);
    expect(body.runs[0].row_id).toBe('baseline-gemini-banana');
  });

  it('POST inserts a user-scoped run record', async () => {
    const res = await POST(postReq({
      rowId: 'baseline-gemini-banana',
      provider: 'gemini',
      modelId: 'gemini-3.1-flash-image-preview',
      style: 'modern',
      outputMode: '2d',
      fileName: 'floor-plan.png',
      prompt: 'render floor plan',
      success: true,
      message: '測試完成。',
      resultText: 'done',
      resultImageUrl: 'data:image/png;base64,abc',
      result2dImageUrl: 'data:image/png;base64,2d',
      result3dImageUrl: 'data:image/png;base64,3d',
      e2eMs: 1234.4,
      httpStatus: 200,
    }));

    expect(res.status).toBe(200);
    expect(fromMock).toHaveBeenCalledWith('image_to_image_evaluation_runs');
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      row_id: 'baseline-gemini-banana',
      provider: 'gemini',
      model_id: 'gemini-3.1-flash-image-preview',
      result_2d_image_url: 'data:image/png;base64,2d',
      result_3d_image_url: 'data:image/png;base64,3d',
      e2e_ms: 1234,
      http_status: 200,
    }));
  });

  it('POST rejects missing model fields', async () => {
    const res = await POST(postReq({ provider: 'gemini' }));

    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });
});
