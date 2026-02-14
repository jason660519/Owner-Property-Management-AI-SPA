// filepath: apps/superadmin/app/api/ai-settings/export/route.ts
// API route for exporting/importing AI settings

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

// GET: Export all AI settings as JSON
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [modelsRes, modulesRes, promptsRes] = await Promise.all([
      supabase.from('ai_model_selections').select('*').eq('user_id', userId).eq('is_active', true),
      supabase.from('ai_feature_modules').select('*').eq('user_id', userId),
      supabase.from('ai_system_prompts').select('*').eq('user_id', userId).eq('is_active', true),
    ]);

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      models: modelsRes.data || [],
      modules: modulesRes.data || [],
      prompts: promptsRes.data || [],
    };

    return NextResponse.json(exportData);
  } catch (err) {
    console.error('[AI Settings] Export error:', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

// POST: Import AI settings from JSON (models, modules, prompts only - not keys)
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { userId, data: importData } = await request.json();

    if (!userId || !importData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const results = { models: 0, modules: 0, prompts: 0 };

    // Import model selections
    if (importData.models?.length) {
      for (const model of importData.models) {
        await supabase.from('ai_model_selections').upsert({
          user_id: userId,
          provider: model.provider,
          model_id: model.model_id,
          model_name: model.model_name,
          is_primary: model.is_primary,
          is_active: true,
        });
        results.models++;
      }
    }

    // Import feature modules
    if (importData.modules?.length) {
      for (const mod of importData.modules) {
        await supabase.from('ai_feature_modules').upsert(
          {
            user_id: userId,
            module_key: mod.module_key,
            is_enabled: mod.is_enabled,
            assigned_provider: mod.assigned_provider,
            assigned_model: mod.assigned_model,
            config: mod.config || {},
          },
          { onConflict: 'user_id,module_key' }
        );
        results.modules++;
      }
    }

    // Import prompts
    if (importData.prompts?.length) {
      for (const prompt of importData.prompts) {
        await supabase.from('ai_system_prompts').insert({
          user_id: userId,
          module_key: prompt.module_key,
          provider: prompt.provider,
          prompt_name: prompt.prompt_name,
          prompt_content: prompt.prompt_content,
          version: 1,
          is_active: true,
        });
        results.prompts++;
      }
    }

    console.log(`[AI Settings] Import completed: ${JSON.stringify(results)}`);
    return NextResponse.json({ success: true, imported: results });
  } catch (err) {
    console.error('[AI Settings] Import error:', err);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
