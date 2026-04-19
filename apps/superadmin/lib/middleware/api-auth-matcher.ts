// Defense-in-depth helper for the middleware-level /api/* auth gate.
// The route-level `requireSuperadmin` / `requireSuperadminOrInternal` helpers
// are still the authoritative check — this just prevents any future route
// from accidentally going live without auth. Issue #34 PR F.

/**
 * Paths under /api/* that MUST be reachable without a session cookie and
 * without an INTERNAL_API_KEY. Each entry is matched as a path prefix (a
 * trailing slash means "this directory and everything under it"); entries
 * without a trailing slash match the exact path only.
 *
 * Keep this list minimal — every entry is a hole in the middleware gate.
 */
export const PUBLIC_API_PATHS: ReadonlyArray<{
  prefix: string;
  reason: 'oauth' | 'hmac' | 'health';
  exact?: boolean;
}> = [
  // OAuth callbacks (Google etc.) — user identity is established by the
  // provider's redirect, not by a pre-existing session.
  { prefix: '/api/auth/', reason: 'oauth' },
  // HMAC-signed webhooks — verified at the route level against a shared
  // secret rather than a user session.
  { prefix: '/api/webhooks/', reason: 'hmac' },
  // People-DB OCR callback is HMAC-signed with `x-ocr-signature` instead of
  // living under /api/webhooks/, so it needs its own exception.
  {
    prefix: '/api/people-db/ingest/ocr/callback',
    reason: 'hmac',
    exact: true,
  },
];

/** True when `pathname` is in the public API allow-list. */
export function isPublicApiPath(pathname: string): boolean {
  for (const entry of PUBLIC_API_PATHS) {
    if (entry.exact) {
      if (pathname === entry.prefix) return true;
    } else if (pathname.startsWith(entry.prefix)) {
      return true;
    }
  }
  return false;
}

/**
 * Read the bearer token from the Authorization header. Returns null when the
 * header is absent or doesn't match the `Bearer <token>` shape.
 */
export function extractBearerToken(
  headerValue: string | null | undefined,
): string | null {
  if (!headerValue) return null;
  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  return token.length > 0 ? token : null;
}

/**
 * Compare the presented bearer token with the expected INTERNAL_API_KEY.
 *
 * NOTE: middleware runs on the edge runtime where `node:crypto.timingSafeEqual`
 * is not available. This is the *first* of two checks — the route-level
 * `requireSuperadminOrInternal` does the canonical constant-time comparison.
 * A middleware bypass here doesn't grant access by itself; it only defers
 * auth enforcement to the route handler, which runs on the node runtime.
 */
export function internalKeyMatches(
  presented: string | null,
  expected: string | null | undefined,
): boolean {
  if (!presented || !expected) return false;
  if (presented.length !== expected.length) return false;
  return presented === expected;
}

/** True when the caller has a valid INTERNAL_API_KEY bearer token. */
export function hasValidInternalKey(
  authorizationHeader: string | null | undefined,
  expectedKey: string | null | undefined,
): boolean {
  const token = extractBearerToken(authorizationHeader);
  return internalKeyMatches(token, expectedKey);
}
