// filepath: apps/superadmin/app/api/ai-settings/modules/route.ts
// API route for managing AI feature modules

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

// GET: Fetch all feature module configs
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('ai_feature_modules')
      .select('*')
      .eq('user_id', userId)
      .order('module_key');

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
    const { userId, moduleKey, isEnabled, assignedProvider, assignedModel, config } = await request.json();

    if (!userId || !moduleKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Upsert: update if exists, insert if not
    const { data, error } = await supabase
      .from('ai_feature_modules')
      .upsert(
        {
          user_id: userId,
          module_key: moduleKey,
          is_enabled: isEnabled ?? false,
          assigned_provider: assignedProvider || null,
          assigned_model: assignedModel || null,
          config: config || {},
        },
        { onConflict: 'user_id,module_key' }
      )
      .select()
      .single();

    if (error) throw error;

    console.log(`[AI Settings] Module ${moduleKey} updated: enabled=${isEnabled}`);
    return NextResponse.json({ module: data });
  } catch (err) {
    console.error('[AI Settings] POST module error:', err);
    return NextResponse.json({ error: 'Failed to save module' }, { status: 500 });
  }
}
