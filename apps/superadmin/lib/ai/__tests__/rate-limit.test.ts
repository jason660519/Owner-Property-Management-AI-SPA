// Tests for lib/ai/rate-limit.ts. See ai-prompt-safety-guide §6.2.

import { checkRateLimit } from '../rate-limit';

// Fake Supabase admin client that emulates the subset of the fluent query
// builder API we actually use.
function makeFakeClient(initial: {
  countByUserEndpoint?: number;
  countError?: string;
  insertError?: string;
  deleteError?: string;
}) {
  let inserts = 0;
  let deletes = 0;
  let capturedCount = initial.countByUserEndpoint ?? 0;

  const client = {
    from() {
      return {
        // delete chain
        delete() {
          return {
            eq() {
              return this;
            },
            lt() {
              deletes += 1;
              if (initial.deleteError) {
                return Promise.resolve({ error: { message: initial.deleteError } });
              }
              return Promise.resolve({ error: null });
            },
          };
        },
        // select (with head + count: 'exact') chain
        select() {
          return {
            eq() {
              return this;
            },
            gte() {
              if (initial.countError) {
                return Promise.resolve({
                  count: null,
                  error: { message: initial.countError },
                });
              }
              return Promise.resolve({ count: capturedCount, error: null });
            },
          };
        },
        // insert
        insert() {
          inserts += 1;
          capturedCount += 1;
          if (initial.insertError) {
            return Promise.resolve({ error: { message: initial.insertError } });
          }
          return Promise.resolve({ error: null });
        },
      };
    },
  } as any;

  return {
    client,
    getInserts: () => inserts,
    getDeletes: () => deletes,
    setCount: (n: number) => {
      capturedCount = n;
    },
  };
}

describe('checkRateLimit', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('allows a call when the bucket is empty', async () => {
    const { client, getInserts } = makeFakeClient({ countByUserEndpoint: 0 });

    const result = await checkRateLimit({
      userId: 'u-1',
      endpointKey: 'test/endpoint',
      limit: 10,
      windowMs: 60_000,
      client,
    });

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.remaining).toBe(9);
    }
    expect(getInserts()).toBe(1);
  });

  it('denies when current count equals the limit', async () => {
    const { client, getInserts } = makeFakeClient({ countByUserEndpoint: 10 });

    const result = await checkRateLimit({
      userId: 'u-1',
      endpointKey: 'test/endpoint',
      limit: 10,
      windowMs: 60_000,
      client,
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.message).toMatch(/Too many requests/);
      expect(result.retryAfterSeconds).toBe(60);
      expect(result.limit).toBe(10);
    }
    // Must not insert when denied.
    expect(getInserts()).toBe(0);
  });

  it('denies when current count exceeds the limit', async () => {
    const { client } = makeFakeClient({ countByUserEndpoint: 15 });

    const result = await checkRateLimit({
      userId: 'u-1',
      endpointKey: 'test/endpoint',
      limit: 10,
      client,
    });

    expect(result.allowed).toBe(false);
  });

  it('prunes stale rows before counting', async () => {
    const { client, getDeletes } = makeFakeClient({ countByUserEndpoint: 0 });

    await checkRateLimit({
      userId: 'u-1',
      endpointKey: 'test/endpoint',
      client,
    });

    expect(getDeletes()).toBe(1);
  });

  it('honors custom limit and windowMs', async () => {
    const { client } = makeFakeClient({ countByUserEndpoint: 2 });

    const result = await checkRateLimit({
      userId: 'u-1',
      endpointKey: 'test/endpoint',
      limit: 3,
      windowMs: 5_000,
      client,
    });

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.remaining).toBe(0);
    }
  });

  it('fails open when the count query errors (limiter brokenness must not block traffic)', async () => {
    const { client } = makeFakeClient({
      countByUserEndpoint: 0,
      countError: 'connection reset',
    });

    const result = await checkRateLimit({
      userId: 'u-1',
      endpointKey: 'test/endpoint',
      client,
    });

    expect(result.allowed).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      '[rate-limit] count failed — failing open',
      expect.objectContaining({ error: 'connection reset' }),
    );
  });

  it('allows the call even if the insert fails (best-effort bookkeeping)', async () => {
    const { client } = makeFakeClient({
      countByUserEndpoint: 0,
      insertError: 'dup key',
    });

    const result = await checkRateLimit({
      userId: 'u-1',
      endpointKey: 'test/endpoint',
      client,
    });

    expect(result.allowed).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      '[rate-limit] insert failed — allowing anyway',
      expect.objectContaining({ error: 'dup key' }),
    );
  });

  it('defaults to 10 calls per 60s when limits are omitted', async () => {
    const { client } = makeFakeClient({ countByUserEndpoint: 9 });

    const result = await checkRateLimit({
      userId: 'u-1',
      endpointKey: 'test/endpoint',
      client,
    });

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.remaining).toBe(0);
    }

    const next = await checkRateLimit({
      userId: 'u-1',
      endpointKey: 'test/endpoint',
      client,
    });
    // After the fake client increments, we should be at 10 == limit.
    expect(next.allowed).toBe(false);
  });
});
