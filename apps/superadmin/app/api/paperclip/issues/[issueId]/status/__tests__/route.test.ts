/** Tests for GET /api/paperclip/issues/[issueId]/status */

import { NextRequest } from 'next/server';

jest.mock('@/lib/paperclip/client', () => ({
  fetchIssueStatus: jest.fn(),
}));

import { fetchIssueStatus } from '@/lib/paperclip/client';
import { GET } from '../route';

const fetchIssueStatusMock = fetchIssueStatus as jest.MockedFunction<typeof fetchIssueStatus>;

function makeReq(url = 'http://localhost:3001/api/paperclip/issues/abc/status') {
  return new NextRequest(url, { method: 'GET' });
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

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe('GET /api/paperclip/issues/[issueId]/status', () => {
  it('returns 200 with snapshot when Paperclip responds ok', async () => {
    fetchIssueStatusMock.mockResolvedValue({
      ok: true,
      snapshot: {
        id: 'abc-uuid',
        title: '[Row 001] test',
        status: 'in_progress',
        updatedAt: '2026-04-11T10:00:00Z',
        issueUrl: 'http://localhost:3187/VIS/issues/abc-uuid',
        terminal: false,
      },
    });

    const res = await GET(makeReq(), { params: Promise.resolve({ issueId: 'abc-uuid' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.snapshot.id).toBe('abc-uuid');
    expect(body.snapshot.status).toBe('in_progress');
    expect(body.snapshot.terminal).toBe(false);

    expect(fetchIssueStatusMock).toHaveBeenCalledWith({
      baseUrl: 'http://localhost:3187',
      apiKey: 'pc_test_key',
      issueId: 'abc-uuid',
    });
  });

  it('returns 400 when issueId is empty after trim', async () => {
    const res = await GET(makeReq(), { params: Promise.resolve({ issueId: '   ' }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('Missing issueId');
    expect(fetchIssueStatusMock).not.toHaveBeenCalled();
  });

  it('returns 500 when PAPERCLIP_API_KEY is missing', async () => {
    delete process.env.PAPERCLIP_API_KEY;

    const res = await GET(makeReq(), { params: Promise.resolve({ issueId: 'abc' }) });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain('PAPERCLIP_API_KEY');
    expect(fetchIssueStatusMock).not.toHaveBeenCalled();
  });

  it('returns 500 when base URL is missing', async () => {
    delete process.env.NEXT_PUBLIC_PAPERCLIP_BASE_URL;

    const res = await GET(makeReq(), { params: Promise.resolve({ issueId: 'abc' }) });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain('NEXT_PUBLIC_PAPERCLIP_BASE_URL');
  });

  it('passes through Paperclip error status (e.g., 404)', async () => {
    fetchIssueStatusMock.mockResolvedValue({
      ok: false,
      status: 404,
      error: 'issue not found',
    });

    const res = await GET(makeReq(), { params: Promise.resolve({ issueId: 'nope' }) });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.ok).toBe(false);
    expect(body.error).toContain('issue not found');
  });

  it('converts network errors to 502', async () => {
    fetchIssueStatusMock.mockResolvedValue({
      ok: false,
      status: 0,
      error: 'Network error: ECONNREFUSED',
    });

    const res = await GET(makeReq(), { params: Promise.resolve({ issueId: 'abc' }) });
    expect(res.status).toBe(502);
  });
});
