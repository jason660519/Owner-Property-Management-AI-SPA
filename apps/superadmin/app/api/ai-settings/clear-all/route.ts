// filepath: apps/superadmin/app/api/ai-settings/clear-all/route.ts
// POST: 一鍵清空該使用者於雲端的所有 AI 設定（keys / models / modules / prompts）

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';

export async function POST(request: NextRequest) {
  const authResult = await requireSuperadmin({
    request,
    allowHeaderFallback: false,
    routeLabel: 'api/ai-settings/clear-all',
  });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }
  const userId = authResult.userId;

  try {
    const supabase = createAdminClient();

    await Promise.all([
      supabase.from('ai_api_keys').update({ is_active: false }).eq('user_id', userId),
      supabase.from('ai_model_selections').update({ is_active: false }).eq('user_id', userId),
      supabase.from('ai_modules_assigned_function').delete().eq('user_id', userId),
      supabase.from('ai_system_prompts').update({ is_active: false }).eq('user_id', userId),
    ]);

    console.log(`[AI Settings] Clear-all completed for user ${userId}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[AI Settings] Clear-all error:', err);
    return NextResponse.json({ error: 'Clear failed' }, { status: 500 });
  }
}
