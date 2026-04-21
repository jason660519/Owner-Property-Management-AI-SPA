import { NextRequest } from 'next/server';

const authState = { ok: true as boolean };
const rpcMock = jest.fn();
const fromMock = jest.fn();

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
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: (table: string) => {
      fromMock(table);
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: () =>
          Promise.resolve({
            data: [],
            error: null,
          }),
      };
      return chain;
    },
  }),
}));

import { GET } from '../route';

function req(url: string): NextRequest {
  return new NextRequest(url);
}

beforeEach(() => {
  authState.ok = true;
  jest.clearAllMocks();
  rpcMock.mockResolvedValue({
    data: [
      {
        adapter_id: 'a1',
        channel: 'cli',
        total_runs: 3,
        last_at: '2026-04-21T10:00:00.000Z',
        last_summary: 'ok',
      },
    ],
    error: null,
  });
});

describe('/api/ai-settings/adapter-evaluation-runs GET', () => {
  it('returns 401 when auth fails', async () => {
    authState.ok = false;
    const res = await GET(req('http://localhost/api/ai-settings/adapter-evaluation-runs?summary=1'));
    expect(res.status).toBe(401);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('summary=1 calls rpc and returns summaries', async () => {
    const res = await GET(req('http://localhost/api/ai-settings/adapter-evaluation-runs?summary=1'));
    expect(res.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith('adapter_evaluation_group_summary', { p_user_id: 'user-1' });
    const body = (await res.json()) as { summaries: { adapterId: string; totalRuns: number }[] };
    expect(body.summaries[0].adapterId).toBe('a1');
    expect(body.summaries[0].totalRuns).toBe(3);
  });

  it('returns 400 when missing summary and missing adapter params', async () => {
    const res = await GET(req('http://localhost/api/ai-settings/adapter-evaluation-runs'));
    expect(res.status).toBe(400);
  });
});
