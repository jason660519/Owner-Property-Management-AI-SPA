// Issue #34 PR D — /api/transcript-parse/jobs/[id] (GET) must require a
// super_admin session. Previously no-auth, exposing transcript parse job
// status + error messages to any caller who could guess a job UUID.

import { NextRequest } from 'next/server';

interface AuthState {
  ok: boolean;
  status?: 401 | 403;
}
const authState: AuthState = { ok: true };

jest.mock('@/lib/auth/require-superadmin', () => ({
  requireSuperadmin: jest.fn(async () => {
    if (authState.ok) {
      return { ok: true, userId: 'admin-1', source: 'session' as const, viaSession: true };
    }
    return { ok: false, status: authState.status ?? 401, message: 'denied' };
  }),
}));

const fromSpy = jest.fn();

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      fromSpy(table);
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: {
                  id: 'job-1',
                  status: 'completed',
                  phase_message: null,
                  progress: 100,
                  error_message: null,
                  created_at: '2026-01-01T00:00:00Z',
                  started_at: '2026-01-01T00:00:01Z',
                  completed_at: '2026-01-01T00:00:10Z',
                  property_document_id: 'doc-1',
                },
                error: null,
              }),
          }),
        }),
      };
    },
  }),
}));

import { GET } from '../route';

function req(): NextRequest {
  return new NextRequest('http://localhost:3001/api/transcript-parse/jobs/job-1', {
    method: 'GET',
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  authState.ok = true;
  authState.status = undefined;
});

describe('GET /api/transcript-parse/jobs/[id]', () => {
  it('returns 401 when auth fails', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await GET(req(), { params: Promise.resolve({ id: 'job-1' }) });
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('returns 403 when auth fails with 403', async () => {
    authState.ok = false;
    authState.status = 403;
    const res = await GET(req(), { params: Promise.resolve({ id: 'job-1' }) });
    expect(res.status).toBe(403);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('returns 200 with job snapshot for super_admin', async () => {
    const res = await GET(req(), { params: Promise.resolve({ id: 'job-1' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('job-1');
    expect(body.status).toBe('completed');
    expect(fromSpy).toHaveBeenCalledWith('transcript_parse_jobs');
  });
});
