import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function buildRequest(url: string, method = 'GET'): NextRequest {
  return new NextRequest(url, { method });
}

function mockOk(data: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    status: 200,
  } as Response);
}

function mockError(status = 500, body = 'Internal Server Error') {
  return Promise.resolve({
    ok: false,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(body),
    status,
  } as Response);
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('GET /api/elasticsearch', () => {
  it('returns health data when action=health', async () => {
    const healthData = { status: 'green', number_of_nodes: 1, active_primary_shards: 5, active_shards: 5 };
    mockFetch.mockResolvedValueOnce(mockOk(healthData));

    const req = buildRequest('http://localhost/api/elasticsearch?action=health');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('green');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/admin/es/health'),
      expect.anything()
    );
  });

  it('returns stats data when action=stats', async () => {
    const statsData = { index_name: 'property_documents', doc_count: 100, store_size_in_bytes: 1024 };
    mockFetch.mockResolvedValueOnce(mockOk(statsData));

    const req = buildRequest('http://localhost/api/elasticsearch?action=stats');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.doc_count).toBe(100);
  });

  it('returns search results when action=search', async () => {
    const searchData = { results: [{ document_id: 'doc-1', owner_name: '王小明', score: 0.9 }] };
    mockFetch.mockResolvedValueOnce(mockOk(searchData));

    const req = buildRequest('http://localhost/api/elasticsearch?action=search&q=%E7%8E%8B%E5%B0%8F%E6%98%8E');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.results).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/search/documents'),
      expect.anything()
    );
  });

  it('forwards query params in search request', async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ results: [] }));

    const req = buildRequest(
      'http://localhost/api/elasticsearch?action=search&q=test&owner_name=%E7%8E%8B&address=%E5%8F%B0%E5%8C%97'
    );
    await GET(req);

    const calledUrl: string = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('q=test');
    expect(calledUrl).toContain('owner_name=');
    expect(calledUrl).toContain('address=');
  });

  it('returns 400 for unknown action', async () => {
    const req = buildRequest('http://localhost/api/elasticsearch?action=unknown');
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  it('returns 503 when upstream throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

    const req = buildRequest('http://localhost/api/elasticsearch?action=health');
    const res = await GET(req);

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe('Connection refused');
  });

  it('returns upstream error status on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(mockError(502, 'Bad Gateway'));

    const req = buildRequest('http://localhost/api/elasticsearch?action=health');
    const res = await GET(req);

    expect(res.status).toBe(502);
  });
});

describe('POST /api/elasticsearch', () => {
  it('triggers reindex when action=reindex', async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ message: 'reindex started' }));

    const req = buildRequest('http://localhost/api/elasticsearch?action=reindex', 'POST');
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe('reindex started');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/admin/es/reindex'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('returns 400 for non-reindex action', async () => {
    const req = buildRequest('http://localhost/api/elasticsearch?action=health', 'POST');
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('returns 503 when reindex upstream throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Service unavailable'));

    const req = buildRequest('http://localhost/api/elasticsearch?action=reindex', 'POST');
    const res = await POST(req);

    expect(res.status).toBe(503);
  });

  it('returns upstream error on non-ok reindex response', async () => {
    mockFetch.mockResolvedValueOnce(mockError(500, 'Reindex failed'));

    const req = buildRequest('http://localhost/api/elasticsearch?action=reindex', 'POST');
    const res = await POST(req);

    expect(res.status).toBe(500);
  });
});
