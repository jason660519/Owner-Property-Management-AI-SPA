// GET: Return per-key validation cache (available models) valid for 6 hours.
// Used to show the model list without re-clicking 驗證金鑰 after refresh or when coming from another page.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { resolveUserId } from '@/lib/resolve-ai-settings-user';

const CACHE_TTL_HOURS = 72;

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const requestedUserId = request.headers.get('x-user-id');
    if (!requestedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await resolveUserId(supabase, requestedUserId);
    if (!userId) {
      return NextResponse.json({ cache: {} });
    }

    const cutoff = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('ai_key_validation_cache')
      .select('key_id, provider, available_models, validated_at')
      .eq('user_id', userId)
      .gte('validated_at', cutoff)
      .order('validated_at', { ascending: false });

    if (error) throw error;

    const cache: Record<string, { valid: boolean; availableModels: string[]; message: string; validatedAt?: string }> = {};
    for (const row of data ?? []) {
      const keyId = row.key_id as string;
      if (cache[keyId]) continue; // keep first (most recent) per key
      cache[keyId] = {
        valid: true,
        availableModels: Array.isArray(row.available_models) ? row.available_models : [],
        message: '金鑰驗證成功（快取，6 小時內有效）',
        validatedAt: row.validated_at ?? undefined,
      };
    }

    return NextResponse.json({ cache });
  } catch (err) {
    console.error('[AI Settings] GET validation-cache error:', err);
    return NextResponse.json({ error: 'Failed to fetch validation cache' }, { status: 500 });
  }
}
