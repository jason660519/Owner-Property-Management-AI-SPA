// filepath: apps/superadmin/app/api/ai-settings/keys/route.ts
// API route for managing AI API keys (CRUD + validation)

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

// GET: Fetch all API keys for the current user (masked)
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: '未授權存取' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('ai_api_keys')
      .select('id, provider, is_valid, last_validated_at, is_active, created_at, updated_at, api_key_encrypted, iv')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('provider');

    if (error) throw error;

    return NextResponse.json({ keys: data || [] });
  } catch (err) {
    console.error('[AI Settings] GET keys error:', err);
    return NextResponse.json({ error: '無法讀取金鑰列表' }, { status: 500 });
  }
}

// POST: Save or update an API key
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { userId, provider, encrypted, iv } = body;

    if (!userId || !provider || !encrypted || !iv) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }

    // Deactivate existing keys for this provider
    await supabase
      .from('ai_api_keys')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('provider', provider);

    // Insert new key
    const { data, error } = await supabase
      .from('ai_api_keys')
      .insert({
        user_id: userId,
        provider,
        api_key_encrypted: encrypted,
        iv,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`[AI Settings] API key saved for provider: ${provider}`);
    return NextResponse.json({ key: data });
  } catch (err) {
    console.error('[AI Settings] POST key error:', err);
    return NextResponse.json({ error: '資料庫連線失敗' }, { status: 500 });
  }
}

// DELETE: Remove an API key
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!keyId || !userId) {
      return NextResponse.json({ error: '缺少 id 或 userId' }, { status: 400 });
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
