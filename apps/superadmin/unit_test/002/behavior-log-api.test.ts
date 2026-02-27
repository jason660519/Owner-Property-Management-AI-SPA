import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { POST } from '@/app/api/behavior-log/route';
import { createAdminClient } from '@/utils/supabase/admin';

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

describe('POST /api/behavior-log', () => {
  const insertMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (createAdminClient as unknown as vi.Mock).mockReturnValue({
      from: vi.fn(() => ({
        insert: insertMock.mockResolvedValue({ error: null }),
      })),
    });
  });

  function buildRequest(body: unknown, headers?: Record<string, string>): NextRequest {
    const h = new Headers({
      'content-type': 'application/json',
      ...(headers ?? {}),
    });
    const req = {
      headers: h,
      json: async () => body,
      nextUrl: new URL('http://localhost:3001/superadmin/dashboard/behavior-monitoring'),
      method: 'POST',
    } as unknown as NextRequest;
    return req;
  }

  it('inserts a behavior log with page path, action type, ip and metadata', async () => {
    const req = buildRequest(
      {
        pagePath: '/superadmin/dashboard/behavior-monitoring',
        actionType: 'PAGE_VIEW',
        metadata: { source: 'unit-test' },
      },
      {
        'x-user-id': 'user-123',
        'x-forwarded-for': '203.0.113.10',
        'user-agent': 'Vitest Test Agent',
      },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ success: true });
    expect(insertMock).toHaveBeenCalledTimes(1);

    const [payload] = insertMock.mock.calls[0] as [Record<string, unknown>];
    expect(payload).toMatchObject({
      page_path: '/superadmin/dashboard/behavior-monitoring',
      action_type: 'PAGE_VIEW',
      metadata: { source: 'unit-test' },
      user_id: 'user-123',
      ip_address: '203.0.113.10',
      user_agent: 'Vitest Test Agent',
    });
  });

  it('returns 400 when pagePath is missing', async () => {
    const req = buildRequest({ actionType: 'PAGE_VIEW' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toHaveProperty('error');
    expect(insertMock).not.toHaveBeenCalled();
  });
});

