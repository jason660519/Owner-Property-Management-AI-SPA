import { NextRequest } from 'next/server';

interface AuthState {
  ok: boolean;
  status?: 401 | 403;
}

const authState: AuthState = { ok: true };
const processSpy = jest.fn();

jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server');
  return {
    ...actual,
    after: (fn: () => void) => fn(),
  };
});

jest.mock('@/lib/auth/require-superadmin', () => ({
  requireSuperadmin: jest.fn(async () => {
    if (authState.ok) {
      return { ok: true, userId: 'admin-1', source: 'session' as const, viaSession: true };
    }
    return { ok: false, status: authState.status ?? 401, message: 'denied' };
  }),
}));

jest.mock('@/lib/ai/rate-limit', () => ({
  checkRateLimit: jest.fn(async () => ({
    allowed: true,
    remaining: 9,
    resetAt: new Date('2026-04-27T00:01:00Z'),
  })),
}));

jest.mock('@/lib/transcript-parse/process-transcript-intake-run', () => ({
  processTranscriptIntakeRunById: (id: string) => {
    processSpy(id);
    return Promise.resolve();
  },
}));

import { POST } from '../route';

function req(): NextRequest {
  return new NextRequest('http://localhost:3001/api/transcript-intake/runs/run-1/process', {
    method: 'POST',
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  authState.ok = true;
  authState.status = undefined;
});

describe('POST /api/transcript-intake/runs/[id]/process', () => {
  it('returns 401 before processing when auth fails', async () => {
    authState.ok = false;
    authState.status = 401;

    const res = await POST(req(), { params: Promise.resolve({ id: 'run-1' }) });

    expect(res.status).toBe(401);
    expect(processSpy).not.toHaveBeenCalled();
  });

  it('accepts and starts processing in after()', async () => {
    const res = await POST(req(), { params: Promise.resolve({ id: 'run-1' }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ accepted: true, runId: 'run-1' });
    expect(processSpy).toHaveBeenCalledWith('run-1');
  });
});
