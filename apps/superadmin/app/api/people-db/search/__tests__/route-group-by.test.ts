// Row 145 Sprint 4b — search route group_by param tests.
//
// Covers the new ?group_by=person|record toggle. Default is `record`
// (backwards-compatible with Row 144). In person mode the route performs
// post-ES aggregation via aggregateByPerson after joining the hit list
// with people_db_person_sources + people_db_persons from Supabase.

import { NextRequest } from 'next/server';

// --- Mocks -----------------------------------------------------------------

const authState = { ok: true };

jest.mock('@/lib/auth/require-superadmin', () => ({
  requireSuperadmin: async () => {
    if (authState.ok) {
      return {
        ok: true,
        userId: 'admin-1',
        source: 'session' as const,
        viaSession: true,
      };
    }
    return {
      ok: false,
      status: 401 as const,
      message: 'Unauthorized',
    };
  },
}));

jest.mock('@/lib/people-db/es-gateway', () => ({
  esSearch: jest.fn(),
}));

const sourceLinksResult: { data: unknown[]; error: null | { message: string } } = {
  data: [],
  error: null,
};
const personsFetchResult: { data: unknown[]; error: null | { message: string } } = {
  data: [],
  error: null,
};

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'people_db_person_sources') {
        return {
          select: (_c?: string) => ({
            in: async (_col: string, _ids: unknown[]) => sourceLinksResult,
          }),
        };
      }
      if (table === 'people_db_persons') {
        return {
          select: (_c?: string) => ({
            in: async (_col: string, _ids: unknown[]) => personsFetchResult,
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  }),
}));

import { GET } from '../route';
import * as esGw from '@/lib/people-db/es-gateway';

const esSearchMock = esGw.esSearch as jest.Mock;

function makeHit(record_id: string, name = 'placeholder'): {
  _id: string;
  _source: Record<string, unknown>;
} {
  return {
    _id: record_id,
    _source: {
      record_id,
      full_name: name,
      name,
    },
  };
}

function esResponse(hits: Array<{ _id: string; _source: Record<string, unknown> }>) {
  return {
    hits: {
      total: { value: hits.length },
      hits,
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  authState.ok = true;
  sourceLinksResult.data = [];
  sourceLinksResult.error = null;
  personsFetchResult.data = [];
  personsFetchResult.error = null;
});

// ---------------------------------------------------------------------------

describe('GET /api/people-db/search — group_by', () => {
  it('defaults to record mode when group_by is omitted', async () => {
    esSearchMock.mockResolvedValueOnce(esResponse([makeHit('r1', '王小明'), makeHit('r2', '李大華')]));

    const req = new NextRequest('http://localhost/api/people-db/search?q=%E7%8E%8B');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.group_by).toBe('record');
    expect(body.results).toHaveLength(2);
    // Flat record shape preserved — a single "王小明" entry at [0].
    expect(body.results[0].record_id).toBe('r1');
    expect(body.results[0].full_name).toBe('王小明');
  });

  it('aggregates into person mode when ?group_by=person', async () => {
    esSearchMock.mockResolvedValueOnce(
      esResponse([makeHit('r1', '王小明'), makeHit('r2', '王小明'), makeHit('r3', '李大華')]),
    );
    sourceLinksResult.data = [
      { record_id: 'r1', person_id: 'p1' },
      { record_id: 'r2', person_id: 'p1' },
      { record_id: 'r3', person_id: 'p2' },
    ];
    personsFetchResult.data = [
      {
        person_id: 'p1',
        canonical_name: '王小明',
        canonical_id_no: null,
        canonical_phones: ['0912345678'],
        canonical_address: '台北市',
        source_count: 2,
        quality_score: 0.9,
      },
      {
        person_id: 'p2',
        canonical_name: '李大華',
        canonical_id_no: null,
        canonical_phones: [],
        canonical_address: null,
        source_count: 1,
        quality_score: null,
      },
    ];

    const req = new NextRequest(
      'http://localhost/api/people-db/search?q=%E7%8E%8B&group_by=person',
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.group_by).toBe('person');
    expect(body.results).toHaveLength(2);
    expect(body.results[0].person_id).toBe('p1');
    expect(body.results[0].canonical_name).toBe('王小明');
    expect(body.results[0].sources).toHaveLength(2);
    expect(body.results[1].person_id).toBe('p2');
    expect(body.results[1].sources).toHaveLength(1);
  });

  it('falls back to record mode for an unrecognised group_by value', async () => {
    esSearchMock.mockResolvedValueOnce(esResponse([makeHit('r1')]));

    const req = new NextRequest(
      'http://localhost/api/people-db/search?q=foo&group_by=bogus',
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.group_by).toBe('record');
    expect(body.results[0].record_id).toBe('r1');
  });
});
