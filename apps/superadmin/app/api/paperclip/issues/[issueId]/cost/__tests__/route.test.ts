/** Tests for GET /api/paperclip/issues/[issueId]/cost */

import { NextRequest } from 'next/server';

jest.mock('@/lib/paperclip/client', () => ({
  fetchIssueCost: jest.fn(),
}));

import { fetchIssueCost } from '@/lib/paperclip/client';
import { GET } from '../route';

const fetchMock = fetchIssueCost as jest.MockedFunction<typeof fetchIssueCost>;

function makeReq() {
  return new NextRequest('http://localhost:3001/api/paperclip/issues/abc/cost', { method: 'GET' });
}

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  jest.resetAllMocks();
  process.env = {
    ...ORIGINAL_ENV,
    NEXT_PUBLIC_PAPERCLIP_BASE_URL: 'http://localhost:3187',
    PAPERCLIP_API_KEY: 'pc_test_key',
  };
});
afterAll(() => { process.env = ORIGINAL_ENV; });

describe('GET /api/paperclip/issues/[issueId]/cost', () => {
  it('returns 200 with snapshot on success', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      snapshot: {
        issueId: 'abc',
        runId: 'run-1',
        costUsd: 0.15,
        inputTokens: 8,
        outputTokens: 2037,
        model: 'claude-sonnet-4-6',
        runStatus: 'succeeded',
      },
    });

    const res = await GET(makeReq(), { params: Promise.resolve({ issueId: 'abc' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.snapshot.costUsd).toBeCloseTo(0.15);
    expect(body.snapshot.model).toBe('claude-sonnet-4-6');
    expect(fetchMock).toHaveBeenCalledWith({
      baseUrl: 'http://localhost:3187',
      apiKey: 'pc_test_key',
      issueId: 'abc',
    });
  });

  it('returns 200 with empty snapshot when issue has no run yet', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      snapshot: { issueId: 'abc' },
    });

    const res = await GET(makeReq(), { params: Promise.resolve({ issueId: 'abc' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.snapshot.runId).toBeUndefined();
  });

  it('returns 400 when issueId is empty', async () => {
    const res = await GET(makeReq(), { params: Promise.resolve({ issueId: '  ' }) });
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 500 when API key is missing', async () => {
    delete process.env.PAPERCLIP_API_KEY;
    const res = await GET(makeReq(), { params: Promise.resolve({ issueId: 'abc' }) });
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error).toContain('PAPERCLIP_API_KEY');
  });

  it('returns 500 when base URL is missing', async () => {
    delete process.env.NEXT_PUBLIC_PAPERCLIP_BASE_URL;
    const res = await GET(makeReq(), { params: Promise.resolve({ issueId: 'abc' }) });
    expect(res.status).toBe(500);
  });

  it('passes through Paperclip 404', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, error: 'not found' });
    const res = await GET(makeReq(), { params: Promise.resolve({ issueId: 'missing' }) });
    expect(res.status).toBe(404);
  });

  it('converts network errors to 502', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 0, error: 'Network error: ECONNREFUSED' });
    const res = await GET(makeReq(), { params: Promise.resolve({ issueId: 'abc' }) });
    expect(res.status).toBe(502);
  });
});
