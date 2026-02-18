// filepath: apps/superadmin/app/api/ai-settings/models/route.ts
// API route for managing AI model selections

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { resolveUserId } from '@/lib/resolve-ai-settings-user';

// GET: Fetch selected models（使用 resolveUserId 與 keys 一致，側欄「已選模型」數量才會正確）
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const requestedUserId = request.headers.get('x-user-id');

    if (!requestedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await resolveUserId(supabase, requestedUserId);
    if (!userId) {
      return NextResponse.json({ models: [] });
    }

    const { data, error } = await supabase
      .from('ai_model_selections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('provider')
      .order('is_primary', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ models: data || [] });
  } catch (err) {
    console.error('[AI Settings] GET models error:', err);
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
  }
}

// POST: Save model selections (replaces all for a provider)
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { userId: requestedUserId, provider, selections } = await request.json();

    if (!requestedUserId || !provider || !Array.isArray(selections)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userId = await resolveUserId(supabase, requestedUserId);
    if (!userId) {
      return NextResponse.json({ error: '找不到可用的使用者' }, { status: 401 });
    }

    // Deactivate existing selections for this provider
    await supabase
      .from('ai_model_selections')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('provider', provider);

    if (selections.length === 0) {
      return NextResponse.json({ success: true, models: [] });
    }

    // Insert new selections
    const inserts = selections.map((sel: { modelId: string; modelName: string; isPrimary: boolean }) => ({
      user_id: userId,
      provider,
      model_id: sel.modelId,
      model_name: sel.modelName,
      is_primary: sel.isPrimary || false,
      is_active: true,
    }));

    const { data, error } = await supabase
      .from('ai_model_selections')
      .insert(inserts)
      .select();

    if (error) throw error;

    console.log(`[AI Settings] Model selections saved for ${provider}: ${selections.length} models`);
    return NextResponse.json({ success: true, models: data });
  } catch (err) {
    console.error('[AI Settings] POST models error:', err);
    return NextResponse.json({ error: 'Failed to save models' }, { status: 500 });
  }
}
