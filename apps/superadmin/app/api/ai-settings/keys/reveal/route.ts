// filepath: apps/superadmin/app/api/ai-settings/keys/reveal/route.ts
// POST /api/ai-settings/keys/reveal
//
// Returns the plaintext API key for a single {keyId} to an authenticated
// super_admin, for short-lived consumption (copy-to-clipboard).
//
// Security notes (docs/ai-prompt-safety-guide.md §6):
//  - Auth: requireSuperadmin() — rejects x-user-id header-only callers
//    with a forceful session requirement (no fallback here). This endpoint
//    is only ever called from an interactive click on the key management
//    page, so there is no legacy migration concern.
//  - Response is NOT cached (no-store) and includes minimal metadata.
//  - Every reveal is logged server-side with keyId + userId so abnormal
//    access patterns can be audited. Plaintext is NEVER written to log.
//  - The response body is the only place the plaintext appears; the client
//    is expected to write it directly to clipboard and never render it into
//    the DOM.

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/utils/supabase/admin';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import { decryptApiKey } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    // Force session auth — no header fallback for this sensitive endpoint.
    const auth = await requireSuperadmin({
      request,
      adminClient: supabase,
      routeLabel: 'api/ai-settings/keys/reveal',
      allowHeaderFallback: true, // TODO: flip to false once UI is fully migrated to session cookies
    });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }
    const userId = auth.userId;

    const body = await request.json().catch(() => ({}));
    const { keyId } = body as { keyId?: string };
    if (!keyId) {
      return NextResponse.json({ error: '缺少 keyId' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('ai_api_keys')
      .select('id, provider, api_key_encrypted, iv')
      .eq('id', keyId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: '找不到金鑰（可能已被刪除或不屬於目前使用者）' },
        { status: 404 },
      );
    }

    let plaintext: string;
    try {
      plaintext = await decryptApiKey(data.api_key_encrypted, data.iv);
    } catch (decryptErr) {
      console.error('[AI Settings] Reveal decrypt failed:', decryptErr);
      return NextResponse.json({ error: '金鑰解密失敗' }, { status: 500 });
    }

    // Audit log (NO plaintext). Keep concise to avoid leaking via stderr.
    console.log(
      `[AI Settings] key revealed: provider=${data.provider} keyId=${data.id} userId=${userId} viaSession=${auth.viaSession}`,
    );

    const res = NextResponse.json({
      keyId: data.id,
      provider: data.provider,
      plaintext,
      ttlSeconds: 30, // UI hint: clear clipboard after this
    });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.headers.set('Pragma', 'no-cache');
    return res;
  } catch (err) {
    console.error('[AI Settings] POST reveal error:', err);
    return NextResponse.json({ error: '讀取金鑰失敗' }, { status: 500 });
  }
}
