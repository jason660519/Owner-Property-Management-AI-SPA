// =============================================================================
// requireSuperadmin() — trustworthy authorization for superadmin LLM endpoints.
//
// Background: historically the superadmin app has trusted an `x-user-id`
// HTTP header for caller identity, which is forgeable. Per
// docs/ai-prompt-safety-guide.md §6.1 we must switch to server-side Supabase
// sessions for anything touching LLM cost / security.
//
// This helper returns the authenticated super_admin user ID when present, or
// a structured reason when not. The LLM routes call it before running any
// expensive work; they MAY still honor x-user-id as a fallback during the
// migration window, but each such fallback logs a deprecation warning with
// the request path so operators can track remaining call sites.
// =============================================================================

import type { NextRequest } from 'next/server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { resolveUserId } from '@/lib/resolve-ai-settings-user';

type AdminClient = ReturnType<typeof createAdminClient>;

export type RequireSuperadminResult =
  | {
      ok: true;
      userId: string;
      source: 'session' | 'header_fallback';
      /** True when the caller was authenticated via a real Supabase session. */
      viaSession: boolean;
    }
  | {
      ok: false;
      status: 401 | 403;
      message: string;
    };

export interface RequireSuperadminOptions {
  /** Request object (used to read the x-user-id header for the fallback path). */
  request: NextRequest;
  /** Optional admin client (injected for tests). */
  adminClient?: AdminClient;
  /** Debug label used in the deprecation warning. */
  routeLabel?: string;
  /**
   * When false, any x-user-id header is ignored — the session is the only
   * accepted identity source. Use this for endpoints that have been fully
   * migrated off header-based auth.
   */
  allowHeaderFallback?: boolean;
}

async function isSuperadmin(
  adminClient: AdminClient,
  userId: string,
): Promise<boolean> {
  try {
    const { data: roleRows, error } = await adminClient.rpc('get_user_roles', {
      lookup_user_id: userId,
    });
    if (error) {
      console.warn('[require-superadmin] get_user_roles RPC failed', {
        userId,
        error: error.message,
      });
      return false;
    }
    const roles = Array.isArray(roleRows)
      ? (roleRows as Array<{ role_name: string }>).map((r) => r.role_name)
      : [];
    return roles.includes('super_admin');
  } catch (err) {
    console.warn('[require-superadmin] unexpected error checking role', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/**
 * Authorize a request against the super_admin role.
 *
 * Resolution order:
 *   1. Supabase server-side session (cookie-based). If present and has
 *      super_admin role → OK.
 *   2. Legacy `x-user-id` header. If present, exists in auth.users, and has
 *      super_admin role → OK + deprecation warning.
 *   3. Deny.
 *
 * Callers should short-circuit on `!result.ok` and return the indicated
 * status/message.
 */
export async function requireSuperadmin(
  opts: RequireSuperadminOptions,
): Promise<RequireSuperadminResult> {
  const allowHeaderFallback = opts.allowHeaderFallback ?? true;
  const adminClient = opts.adminClient ?? createAdminClient();

  // --- 1. Supabase server session (cookie-based, non-forgeable) -----------
  try {
    const sessionClient = await createClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();

    if (user?.id) {
      const ok = await isSuperadmin(adminClient, user.id);
      if (ok) {
        return {
          ok: true,
          userId: user.id,
          source: 'session',
          viaSession: true,
        };
      }
      return {
        ok: false,
        status: 403,
        message: 'Forbidden: super_admin role required',
      };
    }
  } catch (err) {
    // Session lookup is best-effort — fall through to the header fallback
    // below, which is still gated by the role check.
    console.warn('[require-superadmin] session lookup failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // --- 2. Legacy x-user-id header fallback --------------------------------
  if (allowHeaderFallback) {
    const headerUserId = opts.request.headers.get('x-user-id');
    if (headerUserId) {
      const resolved = await resolveUserId(adminClient, headerUserId);
      if (resolved) {
        const ok = await isSuperadmin(adminClient, resolved);
        if (ok) {
          console.warn(
            '[require-superadmin] DEPRECATED x-user-id header fallback used. ' +
              'Switch the caller to a real Supabase session.',
            { route: opts.routeLabel, headerUserId: resolved },
          );
          return {
            ok: true,
            userId: resolved,
            source: 'header_fallback',
            viaSession: false,
          };
        }
        return {
          ok: false,
          status: 403,
          message: 'Forbidden: super_admin role required',
        };
      }
    }
  }

  // --- 3. Deny ------------------------------------------------------------
  return {
    ok: false,
    status: 401,
    message: 'Unauthorized: missing session or header identity',
  };
}
