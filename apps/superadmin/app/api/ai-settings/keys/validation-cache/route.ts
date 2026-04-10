// GET: Return per-key validation cache (available models) valid for 6 hours.
// Used to show the model list without re-clicking 驗證金鑰 after refresh or when coming from another page.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import type { AIProvider } from '@/lib/ai-providers';
import { pickRecommendedModelByProvider } from '@/lib/pick-latest-model';

const CACHE_TTL_HOURS = 72;

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    const auth = await requireSuperadmin({
      request,
      adminClient: supabase,
      routeLabel: 'api/ai-settings/keys/validation-cache',
    });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }
    const userId = auth.userId;

    const cutoff = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();

    // Fetch ALL cache rows (newest first) + the user's current active keys.
    // Run in parallel so orphaned cache (from deleted-and-recreated keys)
    // can still be rehydrated via the (user_id, provider) fallback below.
    const [cacheRes, keysRes] = await Promise.all([
      supabase
        .from('ai_key_validation_cache')
        .select('key_id, provider, available_models, validated_at')
        .eq('user_id', userId)
        .gte('validated_at', cutoff)
        .order('validated_at', { ascending: false }),
      supabase
        .from('ai_api_keys')
        .select('id, provider')
        .eq('user_id', userId)
        .eq('is_active', true),
    ]);

    if (cacheRes.error) throw cacheRes.error;
    if (keysRes.error) throw keysRes.error;

    // Map current active key_id for each provider so we can re-key orphaned
    // cache entries onto the key_id the frontend currently knows about.
    const currentKeyIdByProvider = new Map<string, string>();
    for (const row of keysRes.data ?? []) {
      if (row.provider && row.id && !currentKeyIdByProvider.has(row.provider)) {
        currentKeyIdByProvider.set(row.provider, row.id);
      }
    }

    const cache: Record<
      string,
      { valid: boolean; availableModels: string[]; message: string; modelInfo?: string; validatedAt?: string }
    > = {};
    // Track providers we've already satisfied so newer rows win (rows are ordered desc).
    const seenProviders = new Set<string>();
    for (const row of cacheRes.data ?? []) {
      const provider = row.provider as string;
      if (seenProviders.has(provider)) continue;

      // Prefer the current active key_id for this provider; fall back to the
      // cache row's own key_id so legacy flows that match by key_id still work.
      const targetKeyId = currentKeyIdByProvider.get(provider) ?? (row.key_id as string);
      if (!targetKeyId || cache[targetKeyId]) continue;

      const models = Array.isArray(row.available_models) ? (row.available_models as string[]) : [];
      // Re-derive the recommended chat model from the cached list so the
      // badge survives refresh without the user needing to click 驗證金鑰
      // again. Label as "推薦" to signal this is a heuristic, not an
      // authoritative "latest" claim.
      const recommended = pickRecommendedModelByProvider(provider as AIProvider, models);
      cache[targetKeyId] = {
        valid: true,
        availableModels: models,
        message: '金鑰驗證成功（快取，72 小時內有效）',
        modelInfo: recommended
          ? `推薦: ${recommended}`
          : models.length > 0
            ? `可用模型 ${models.length} 個`
            : undefined,
        validatedAt: row.validated_at ?? undefined,
      };
      seenProviders.add(provider);
    }

    return NextResponse.json({ cache });
  } catch (err) {
    console.error('[AI Settings] GET validation-cache error:', err);
    return NextResponse.json({ error: 'Failed to fetch validation cache' }, { status: 500 });
  }
}
