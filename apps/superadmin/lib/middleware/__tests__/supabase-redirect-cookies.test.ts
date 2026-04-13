import {
  createSupabaseRedirectCookieBridge,
  type RedirectCookieSink,
} from '../supabase-redirect-cookies';

describe('createSupabaseRedirectCookieBridge', () => {
  it('replays setAll cookies onto a redirect with full options (regression: intermittent login)', () => {
    const bridge = createSupabaseRedirectCookieBridge();

    bridge.recordFromSetAll([
      {
        name: 'sb-localhost-auth-token',
        value: 'v1',
        options: { httpOnly: true, path: '/', sameSite: 'lax' as const, secure: false },
      },
    ]);
    bridge.recordFromSetAll([
      {
        name: 'sb-localhost-auth-token',
        value: 'v2-refreshed',
        options: { httpOnly: true, path: '/', sameSite: 'lax' as const, secure: false, maxAge: 3600 },
      },
    ]);

    const sets: { name: string; value: string; options?: Record<string, unknown> }[] = [];
    const sink: RedirectCookieSink = {
      set(name, value, options) {
        sets.push({ name, value, options });
      },
    };

    bridge.applyToRedirect(sink);

    expect(sets).toHaveLength(1);
    expect(sets[0].name).toBe('sb-localhost-auth-token');
    expect(sets[0].value).toBe('v2-refreshed');
    expect(sets[0].options).toMatchObject({ httpOnly: true, maxAge: 3600 });
  });
});
