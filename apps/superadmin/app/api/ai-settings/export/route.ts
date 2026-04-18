// filepath: apps/superadmin/app/api/ai-settings/export/route.ts
// API route for exporting/importing AI settings

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';

// GET: Export all AI settings as JSON (keys 為加密形式；用 session-authenticated user)
export async function GET(request: NextRequest) {
  const authResult = await requireSuperadmin({
    request,
    allowHeaderFallback: false,
    routeLabel: 'api/ai-settings/export',
  });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }
  const userId = authResult.userId;

  try {
    const supabase = createAdminClient();

    const [keysRes, modelsRes, modulesRes, promptsRes] = await Promise.all([
      supabase.from('ai_api_keys').select('provider, api_key_encrypted, iv, is_valid, last_validated_at').eq('user_id', userId).eq('is_active', true),
      supabase.from('ai_model_selections').select('*').eq('user_id', userId).eq('is_active', true),
      supabase.from('ai_modules_assigned_function').select('*').eq('user_id', userId),
      supabase.from('ai_system_prompts').select('*').eq('user_id', userId).eq('is_active', true),
    ]);

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      keys: (keysRes.data || []).map((k: { provider: string; api_key_encrypted: string; iv: string; is_valid?: boolean | null; last_validated_at?: string | null }) => ({
        provider: k.provider,
        api_key_encrypted: k.api_key_encrypted,
        iv: k.iv,
        is_valid: k.is_valid ?? undefined,
        last_validated_at: k.last_validated_at ?? undefined,
      })),
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

// POST: Import AI settings from JSON (keys 為加密形式還原；可選 api_keys_env 由前端解析後逐筆 POST keys)
export async function POST(request: NextRequest) {
  const authResult = await requireSuperadmin({
    request,
    allowHeaderFallback: false,
    routeLabel: 'api/ai-settings/export',
  });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }
  const userId = authResult.userId;

  try {
    const supabase = createAdminClient();
    const { data: importData } = await request.json();

    if (!importData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const results = { keys: 0, models: 0, modules: 0, prompts: 0 };

    // Import keys（僅接受匯出檔中的加密 key；明文由前端用「批量導入API KEY」或 api_keys_env 處理）
    if (importData.keys?.length) {
      for (const key of importData.keys) {
        if (!key.provider || !key.api_key_encrypted || !key.iv) continue;
        await supabase.from('ai_api_keys').update({ is_active: false }).eq('user_id', userId).eq('provider', key.provider);
        await supabase.from('ai_api_keys').insert({
          user_id: userId,
          provider: key.provider,
          api_key_encrypted: key.api_key_encrypted,
          iv: key.iv,
          is_valid: key.is_valid ?? null,
          last_validated_at: key.last_validated_at ?? null,
          is_active: true,
        });
        results.keys++;
      }
    }

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

    // Import feature modules（DB 欄位為 assigned_function；支援 assigned_models 複選）
    if (importData.modules?.length) {
      for (const mod of importData.modules) {
        const assignedFunction = mod.assigned_function ?? mod.module_key;
        if (!assignedFunction) continue;
        const models = Array.isArray(mod.assigned_models)
          ? mod.assigned_models
              .filter((x: unknown) => x && typeof x === 'object' && 'provider' in x && 'model' in x)
              .map((x: Record<string, unknown>, i: number) => ({
                provider: x.provider,
                model: x.model,
                priority: typeof x.priority === 'number' && x.priority >= 1 && x.priority <= 100 ? x.priority : i + 1,
              }))
          : mod.assigned_provider && mod.assigned_model
            ? [{ provider: mod.assigned_provider, model: mod.assigned_model, priority: 1 }]
            : [];
        await supabase.from('ai_modules_assigned_function').upsert(
          {
            user_id: userId,
            assigned_function: assignedFunction,
            is_enabled: mod.is_enabled,
            assigned_models: models,
            assigned_provider: models[0]?.provider ?? mod.assigned_provider ?? null,
            assigned_model: models[0]?.model ?? mod.assigned_model ?? null,
            config: mod.config || {},
          },
          { onConflict: 'user_id,assigned_function' }
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
