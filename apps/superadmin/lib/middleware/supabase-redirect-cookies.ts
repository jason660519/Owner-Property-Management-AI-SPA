/**
 * Supabase SSR middleware calls `setAll` with full cookie options. Next.js
 * `ResponseCookies#getAll()` only exposes name+value, so copying from the
 * middleware `NextResponse` into a redirect loses httpOnly/path/sameSite/etc.
 * and causes intermittent auth loss after refresh. This helper records the
 * latest options per cookie name from each `setAll` batch and reapplies them
 * on redirects.
 */

export type SupabaseCookieToSet = {
  name: string;
  value: string;
  /** Matches Next / Supabase SSR cookie options */
  options?: Record<string, unknown>;
};

export interface RedirectCookieSink {
  set(name: string, value: string, options?: Record<string, unknown>): void;
}

export function createSupabaseRedirectCookieBridge() {
  const latestByName = new Map<string, SupabaseCookieToSet>();

  function recordFromSetAll(cookiesToSet: SupabaseCookieToSet[]) {
    for (const c of cookiesToSet) {
      latestByName.set(c.name, c);
    }
  }

  function applyToRedirect(sink: RedirectCookieSink) {
    for (const { name, value, options } of latestByName.values()) {
      sink.set(name, value, options);
    }
  }

  /** Exposed for unit tests */
  function snapshot(): SupabaseCookieToSet[] {
    return [...latestByName.values()];
  }

  return { recordFromSetAll, applyToRedirect, snapshot };
}
