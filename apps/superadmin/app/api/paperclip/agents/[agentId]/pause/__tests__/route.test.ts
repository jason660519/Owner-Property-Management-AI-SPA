import { NextRequest } from 'next/server';
import { POST } from '../route';

const ORIGINAL_ENV = process.env;

function makeReq() {
  return new NextRequest('http://localhost:3001/api/paperclip/agents/agent-1/pause', { method: 'POST' });
}

describe('POST /api/paperclip/agents/[agentId]/pause', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env = {
      ...ORIGINAL_ENV,
      NEXT_PUBLIC_PAPERCLIP_BASE_URL: 'http://localhost:3187',
      NEXT_PUBLIC_PAPERCLIP_COMPANY_ID: 'company-1',
      PAPERCLIP_API_KEY: 'pc_key',
    };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('returns 200 when upstream pause succeeds', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '',
    } as Response);

    const res = await POST(makeReq(), { params: Promise.resolve({ agentId: 'agent-1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3187/api/agents/agent-1/pause?companyId=company-1',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer pc_key',
        }),
      }),
    );
  });

  it('returns upstream error status on failure response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'upstream failure',
    } as Response);

    const res = await POST(makeReq(), { params: Promise.resolve({ agentId: 'agent-1' }) });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.ok).toBe(false);
    expect(body.error).toContain('Paperclip pause failed');
    expect(body.detail).toBe('Upstream pause request failed.');
  });

  it('returns 502 on network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const res = await POST(makeReq(), { params: Promise.resolve({ agentId: 'agent-1' }) });
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.ok).toBe(false);
    expect(body.error).toContain('ECONNREFUSED');
  });

  it('returns 500 when paperclip config is missing', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      NEXT_PUBLIC_PAPERCLIP_BASE_URL: '',
      NEXT_PUBLIC_PAPERCLIP_COMPANY_ID: '',
      PAPERCLIP_API_KEY: '',
    };
    const res = await POST(makeReq(), { params: Promise.resolve({ agentId: 'agent-1' }) });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.ok).toBe(false);
    expect(body.error).toContain('Paperclip config missing');
  });

  it('returns 400 when agentId is empty', async () => {
    const res = await POST(makeReq(), { params: Promise.resolve({ agentId: '   ' }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error).toContain('agentId is required');
  });
});
