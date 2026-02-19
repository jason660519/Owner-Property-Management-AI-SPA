// filepath: apps/superadmin/app/api/ai-settings/modules/route.ts
// API route for managing AI feature modules

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { resolveUserId } from '@/lib/resolve-ai-settings-user';

// GET: Fetch all feature module configs（使用 resolveUserId 與 keys 一致）
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const requestedUserId = request.headers.get('x-user-id');

    if (!requestedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await resolveUserId(supabase, requestedUserId);
    if (!userId) {
      return NextResponse.json({ modules: [] });
    }

    const { data, error } = await supabase
      .from('ai_modules_assigned_function')
      .select('*')
      .eq('user_id', userId)
      .order('assigned_function');

    if (error) throw error;

    return NextResponse.json({ modules: data || [] });
  } catch (err) {
    console.error('[AI Settings] GET modules error:', err);
    return NextResponse.json({ error: 'Failed to fetch modules' }, { status: 500 });
  }
}

// POST: Save or update a feature module config
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const {
      userId,
      moduleKey,
      isEnabled,
      assignedProvider,
      assignedModel,
      assignedModels,
      config,
    } = body;

    if (!userId || !moduleKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // assignedModels: [{ provider, model }, ...] — primary; fallback to single for backward compat
    const models = Array.isArray(assignedModels)
      ? assignedModels
      : assignedProvider && assignedModel
        ? [{ provider: assignedProvider, model: assignedModel }]
        : [];

    const { data, error } = await supabase
      .from('ai_modules_assigned_function')
      .upsert(
        {
          user_id: userId,
          assigned_function: moduleKey,
          is_enabled: isEnabled ?? false,
          assigned_models: models,
          assigned_provider: models[0]?.provider ?? null,
          assigned_model: models[0]?.model ?? null,
          config: config || {},
        },
        { onConflict: 'user_id,assigned_function' }
      )
      .select()
      .single();

    if (error) throw error;

    console.log(`[AI Settings] Assigned function ${moduleKey} updated: enabled=${isEnabled}, models=${models.length}`);
    return NextResponse.json({ module: data });
  } catch (err) {
    console.error('[AI Settings] POST module error:', err);
    return NextResponse.json({ error: 'Failed to save module' }, { status: 500 });
  }
}
