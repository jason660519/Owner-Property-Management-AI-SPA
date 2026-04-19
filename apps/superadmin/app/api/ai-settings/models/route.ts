// filepath: apps/superadmin/app/api/ai-settings/models/route.ts
// API route for managing AI model selections

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';

// GET: Fetch selected models（session-authenticated user scope）
export async function GET(request: NextRequest) {
  const authResult = await requireSuperadmin({
    request,
    allowHeaderFallback: false,
    routeLabel: 'api/ai-settings/models',
  });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }
  const userId = authResult.userId;

  try {
    const supabase = createAdminClient();

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
  const authResult = await requireSuperadmin({
    request,
    allowHeaderFallback: false,
    routeLabel: 'api/ai-settings/models',
  });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }
  const userId = authResult.userId;

  try {
    const supabase = createAdminClient();
    const { provider, selections } = await request.json();

    if (!provider || !Array.isArray(selections)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
