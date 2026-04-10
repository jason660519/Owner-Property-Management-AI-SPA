// =============================================================================
// Sliding-window rate limiter for LLM endpoints.
//
// Storage: ai_call_rate_limits table, one row per call. See
// docs/ai-prompt-safety-guide.md §6.2 for the full spec.
//
// Usage:
//   const rl = await checkRateLimit({
//     userId,
//     endpointKey: 'api/transcript-parse/stream',
//     client: adminClient,
//   });
//   if (!rl.allowed) {
//     return NextResponse.json({ error: rl.message }, { status: 429 });
//   }
// =============================================================================

import { createAdminClient } from '@/utils/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

export interface RateLimitOptions {
  userId: string;
  /** Stable string identifying the rate-limited endpoint, e.g. route path. */
  endpointKey: string;
  /** Maximum number of calls allowed in the window. Defaults to 10. */
  limit?: number;
  /** Window length in milliseconds. Defaults to 60,000 (1 minute). */
  windowMs?: number;
  /** Override admin client for tests. */
  client?: AdminClient;
}

export type RateLimitResult =
  | { allowed: true; remaining: number; resetAt: Date }
  | {
      allowed: false;
      message: string;
      retryAfterSeconds: number;
      limit: number;
      windowMs: number;
    };

/** Default: 10 calls per minute per (user, endpoint). */
const DEFAULT_LIMIT = 10;
const DEFAULT_WINDOW_MS = 60_000;

/**
 * Check whether the given user is allowed to call this endpoint right now.
 *
 * Implementation:
 *   1. Prune rows older than (now - windowMs) for this (user, endpoint).
 *   2. Count remaining rows.
 *   3. If count ≥ limit → deny with retry-after.
 *   4. Otherwise, insert a new row and allow.
 *
 * Race condition note: this isn't perfectly atomic across concurrent calls
 * from the same user, but it's accurate within a ~50ms window which is
 * acceptable for a 10-calls-per-minute budget. If we ever need strict
 * correctness we can promote this to a server-side Postgres function.
 */
export async function checkRateLimit(
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
  const client = opts.client ?? createAdminClient();

  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs).toISOString();

  // Best-effort prune of stale rows (ignore errors — they'll be cleaned up
  // next time or by a scheduled cleanup job).
  try {
    await client
      .from('ai_call_rate_limits')
      .delete()
      .eq('user_id', opts.userId)
      .eq('endpoint_key', opts.endpointKey)
      .lt('called_at', windowStart);
  } catch (err) {
    console.warn('[rate-limit] prune failed', {
      endpoint: opts.endpointKey,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Count fresh calls in the current window.
  const { count, error: countErr } = await client
    .from('ai_call_rate_limits')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', opts.userId)
    .eq('endpoint_key', opts.endpointKey)
    .gte('called_at', windowStart);

  if (countErr) {
    console.warn('[rate-limit] count failed — failing open', {
      endpoint: opts.endpointKey,
      error: countErr.message,
    });
    // Fail open: if the limiter itself is broken, do not block legitimate
    // traffic. The audit table will still record the call.
    return { allowed: true, remaining: limit, resetAt: new Date(now.getTime() + windowMs) };
  }

  const currentCount = count ?? 0;
  if (currentCount >= limit) {
    return {
      allowed: false,
      message: `Too many requests. Limit: ${limit} per ${windowMs / 1000}s window.`,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
      limit,
      windowMs,
    };
  }

  // Record the call. Swallow insert errors so limiter brokenness doesn't
  // block the endpoint. Supabase returns errors via { error }, not throws.
  try {
    const { error: insertErr } = await client.from('ai_call_rate_limits').insert({
      user_id: opts.userId,
      endpoint_key: opts.endpointKey,
      called_at: now.toISOString(),
    });
    if (insertErr) {
      console.warn('[rate-limit] insert failed — allowing anyway', {
        endpoint: opts.endpointKey,
        error: insertErr.message,
      });
    }
  } catch (err) {
    console.warn('[rate-limit] insert failed — allowing anyway', {
      endpoint: opts.endpointKey,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - currentCount - 1),
    resetAt: new Date(now.getTime() + windowMs),
  };
}
