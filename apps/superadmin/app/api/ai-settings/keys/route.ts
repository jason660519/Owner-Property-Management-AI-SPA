// filepath: apps/superadmin/app/api/ai-settings/keys/route.ts
// API route for managing AI API keys (CRUD).
//
// Security (per docs/ai-prompt-safety-guide.md §6.1 / §6.3):
//  - All routes use requireSuperadmin() — server-side session auth with a
//    temporary x-user-id header fallback (logged as deprecation).
//  - GET never returns the encrypted blob or iv to the client. The client
//    can only ever see masked placeholder strings; the plaintext is fetched
//    on-demand via POST /api/ai-settings/keys/reveal.
//  - POST accepts a plaintext key over HTTPS and encrypts it server-side.
//    The previous flow (client does PBKDF2 + AES-GCM, sends blob) leaked
//    the encryption passphrase into the frontend bundle via NEXT_PUBLIC_*.

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createAdminClient } from '@/utils/supabase/admin';
import { encryptApiKey } from '@/lib/crypto';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';

// GET: Fetch masked summaries for the current user's AI API keys.
// NEVER returns `api_key_encrypted` or `iv` — those must not cross the wire.
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    const auth = await requireSuperadmin({
      request,
      adminClient: supabase,
      routeLabel: 'api/ai-settings/keys GET',
    });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }
    const userId = auth.userId;

    const { data, error } = await supabase
      .from('ai_api_keys')
      .select('id, provider, is_valid, last_validated_at, is_active, created_at, updated_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('provider');

    if (error) throw error;

    const res = NextResponse.json({ keys: data || [] });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res;
  } catch (err) {
    console.error('[AI Settings] GET keys error:', err);
    return NextResponse.json({ error: '無法讀取金鑰列表' }, { status: 500 });
  }
}

// POST: Save a new API key. Accepts plaintext, encrypts server-side.
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    const auth = await requireSuperadmin({
      request,
      adminClient: supabase,
      routeLabel: 'api/ai-settings/keys POST',
    });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }
    const userId = auth.userId;

    const body = await request.json();
    const { provider, plaintextKey } = body as {
      provider?: string;
      plaintextKey?: string;
    };

    if (!provider || !plaintextKey) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }

    // Sanity cap to prevent abuse. Real keys are short; anything beyond this
    // is certainly not a legitimate API key.
    if (plaintextKey.length > 512) {
      return NextResponse.json({ error: '金鑰長度超過上限' }, { status: 400 });
    }

    // Encrypt server-side using the shared AES-GCM helper. Node 20+ exposes
    // globalThis.crypto.subtle so this module works unchanged on the server.
    const { encrypted, iv } = await encryptApiKey(plaintextKey);

    // Deactivate existing keys for this provider before inserting the new one.
    await supabase
      .from('ai_api_keys')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('provider', provider);

    const { data, error } = await supabase
      .from('ai_api_keys')
      .insert({
        user_id: userId,
        provider,
        api_key_encrypted: encrypted,
        iv,
        is_active: true,
      })
      .select('id, provider, is_valid, last_validated_at, is_active, created_at, updated_at')
      .single();

    if (error) throw error;

    console.log(`[AI Settings] API key saved for provider: ${provider}`);
    return NextResponse.json({ key: data });
  } catch (err) {
    const pgErr = err as { code?: string; message?: string };
    console.error('[AI Settings] POST key error:', err);

    if (pgErr?.code === '23503') {
      return NextResponse.json(
        { error: '使用者不存在或未登入，請先登入 Superadmin 後再導入金鑰' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: pgErr?.message ?? '資料庫連線失敗' },
      { status: 500 }
    );
  }
}

// DELETE: Soft-delete an API key by id.
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    const auth = await requireSuperadmin({
      request,
      adminClient: supabase,
      routeLabel: 'api/ai-settings/keys DELETE',
    });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }
    const userId = auth.userId;

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json({ error: '缺少 id' }, { status: 400 });
    }

    const { error } = await supabase
      .from('ai_api_keys')
      .update({ is_active: false })
      .eq('id', keyId)
      .eq('user_id', userId);

    if (error) throw error;

    console.log(`[AI Settings] API key deleted: ${keyId}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[AI Settings] DELETE key error:', err);
    return NextResponse.json({ error: '刪除失敗' }, { status: 500 });
  }
}
