// =============================================================================
// requireSuperadminOrInternal() — dual-track auth for routes that are called
// both from the superadmin UI (with a Supabase session cookie) AND from
// server-side callers that cannot carry a session: Claude Code skills invoked
// via shell curl, GitHub Actions cron jobs, scheduled-tasks MCP, etc.
//
// Accepted identities (first match wins):
//   1. `Authorization: Bearer <INTERNAL_API_KEY>` — server-to-server token
//      compared with crypto.timingSafeEqual. Returns { source: 'internal' }
//      with userId undefined.
//   2. Supabase session cookie — reuses requireSuperadmin() below. Returns
//      { source: 'session', userId }.
//
// When both tracks fail, returns the stricter of the two reasons so 401 vs 403
// remains accurate for session callers that merely lack a role.
// =============================================================================

import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

import { requireSuperadmin, type RequireSuperadminResult } from './require-superadmin';

export type RequireSuperadminOrInternalResult =
  | {
      ok: true;
      source: 'internal';
      userId: null;
    }
  | {
      ok: true;
      source: 'session';
      userId: string;
    }
  | {
      ok: false;
      status: 401 | 403;
      message: string;
    };

export interface RequireSuperadminOrInternalOptions {
  request: NextRequest;
  routeLabel?: string;
  /** Override the env var, used by tests to inject a deterministic key. */
  internalKeyOverride?: string;
  /**
   * When false, the internal-key branch is skipped entirely — useful for
   * routes that MUST have a human identity (e.g. a claim handler that writes
   * the caller's userId into `claimed_by`).
   */
  allowInternalKey?: boolean;
}

function extractBearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return match[1].trim();
}

/** Constant-time comparison. Returns false if lengths differ. */
function secureEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export type RequireSuperadminSessionOnlyResult =
  | {
      ok: true;
      source: 'session';
      userId: string;
    }
  | {
      ok: false;
      status: 401 | 403;
      message: string;
    };

// When the caller forbids the internal-key branch, we can narrow the return
// type to guarantee userId is a string — useful for handlers that write the
// caller's identity into a column (e.g. claimed_by).
export async function requireSuperadminOrInternal(
  opts: RequireSuperadminOrInternalOptions & { allowInternalKey: false },
): Promise<RequireSuperadminSessionOnlyResult>;
export async function requireSuperadminOrInternal(
  opts: RequireSuperadminOrInternalOptions,
): Promise<RequireSuperadminOrInternalResult>;
export async function requireSuperadminOrInternal(
  opts: RequireSuperadminOrInternalOptions,
): Promise<RequireSuperadminOrInternalResult> {
  const allowInternalKey = opts.allowInternalKey ?? true;

  // ── 1. Internal API key (server-to-server) ───────────────────────────────
  if (allowInternalKey) {
    const expected = opts.internalKeyOverride ?? process.env.INTERNAL_API_KEY ?? '';
    const presented = extractBearerToken(opts.request);
    if (presented && expected && secureEqual(presented, expected)) {
      return { ok: true, source: 'internal', userId: null };
    }
    // If a bearer token was presented but did not match, fall through to
    // session auth — the caller may have sent a stale/wrong token while
    // still having a valid session cookie. Do NOT short-circuit to 401 here.
  }

  // ── 2. Supabase session ──────────────────────────────────────────────────
  const sessionResult: RequireSuperadminResult = await requireSuperadmin({
    request: opts.request,
    allowHeaderFallback: false,
    routeLabel: opts.routeLabel,
  });
  if (sessionResult.ok) {
    return { ok: true, source: 'session', userId: sessionResult.userId };
  }

  return {
    ok: false,
    status: sessionResult.status,
    message: sessionResult.message,
  };
}
