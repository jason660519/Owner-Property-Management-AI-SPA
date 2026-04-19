// Row 145 Sprint 6 — POST /api/people-db/ingest/retry/[fileId] route tests.
// Covers tdd-spec §6.3: 4 cases (auth / happy path / not found / wrong state).

import { NextRequest } from 'next/server';

// --- Mocks -----------------------------------------------------------------

interface AuthState {
  ok: boolean;
  userId?: string;
  responseStatus?: number;
}
const authState: AuthState = { ok: true, userId: 'admin-1' };

jest.mock('@/lib/auth/require-superadmin', () => ({
  requireSuperadmin: async () => {
    if (authState.ok) {
      return {
        ok: true,
        userId: authState.userId ?? 'admin-1',
        source: 'session' as const,
        viaSession: true,
      };
    }
    return {
      ok: false,
      status: (authState.responseStatus ?? 401) as 401 | 403,
      message: authState.responseStatus === 403 ? 'Forbidden' : 'Unauthorized',
    };
  },
}));

interface FileRow {
  id: string;
  status: string;
  attempts: number;
  error_msg: string | null;
}

interface FilesStore {
  row: FileRow | null;
  selectError: null | { message: string };
  updateError: null | { message: string };
  lastUpdate: Record<string, unknown> | null;
}
const store: FilesStore = {
  row: null,
  selectError: null,
  updateError: null,
  lastUpdate: null,
};

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (_table: string) => ({
      select: (_c?: string) => ({
        eq: (_col: string, _val: unknown) => ({
          maybeSingle: async () => ({
            data: store.row,
            error: store.selectError,
          }),
        }),
      }),
      update: (values: Record<string, unknown>) => ({
        eq: async (_col: string, _val: unknown) => {
          store.lastUpdate = values;
          return { error: store.updateError };
        },
      }),
    }),
  }),
}));

// --- Import route after mocks ---------------------------------------------

import { POST } from '../route';

function postReq(fileId: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/people-db/ingest/retry/${fileId}`,
    { method: 'POST' },
  );
}

beforeEach(() => {
  authState.ok = true;
  authState.userId = 'admin-1';
  authState.responseStatus = undefined;
  store.row = null;
  store.selectError = null;
  store.updateError = null;
  store.lastUpdate = null;
});

// ---------------------------------------------------------------------------

describe('POST /api/people-db/ingest/retry/[fileId]', () => {
  it('returns 401 when unauthorized', async () => {
    authState.ok = false;
    authState.responseStatus = 401;
    const res = await POST(postReq('f1'), { params: Promise.resolve({ fileId: 'f1' }) });
    expect(res.status).toBe(401);
    expect(store.lastUpdate).toBeNull();
  });

  it('resets a failed file to pending and returns 200', async () => {
    store.row = { id: 'f1', status: 'failed', attempts: 3, error_msg: 'parser crashed' };
    const res = await POST(postReq('f1'), { params: Promise.resolve({ fileId: 'f1' }) });
    expect(res.status).toBe(200);
    expect(store.lastUpdate).toMatchObject({
      status: 'pending',
      attempts: 0,
      error_msg: null,
    });
  });

  it('returns 400 for skipped_unsupported (retry does not bypass unsupported gate)', async () => {
    store.row = {
      id: 'f1',
      status: 'skipped_unsupported',
      attempts: 0,
      error_msg: null,
    };
    const res = await POST(postReq('f1'), { params: Promise.resolve({ fileId: 'f1' }) });
    expect(res.status).toBe(400);
    expect(store.lastUpdate).toBeNull();
  });

  it('returns 404 when the file does not exist', async () => {
    store.row = null;
    const res = await POST(postReq('missing'), {
      params: Promise.resolve({ fileId: 'missing' }),
    });
    expect(res.status).toBe(404);
    expect(store.lastUpdate).toBeNull();
  });

  it('returns 400 when file status is not failed/dead_letter', async () => {
    store.row = { id: 'f1', status: 'parsed', attempts: 1, error_msg: null };
    const res = await POST(postReq('f1'), { params: Promise.resolve({ fileId: 'f1' }) });
    expect(res.status).toBe(400);
    expect(store.lastUpdate).toBeNull();
  });
});
