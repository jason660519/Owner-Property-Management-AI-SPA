// filepath: apps/superadmin/app/api/ai-settings/summary/route.ts
// GET: Fetch validation summary (DB-backed 組態概況). POST: Upsert after validate-all.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { resolveUserId } from '@/lib/resolve-ai-settings-user';

export const dynamic = 'force-dynamic';

export interface ValidationSummary {
  validatedCount: number;
  totalModels: number;
  updatedAt: string | null;
}

// GET: Return last validate-all result for current user
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const requestedUserId = request.headers.get('x-user-id');
    if (!requestedUserId) {
      return NextResponse.json({ error: '未授權存取' }, { status: 401 });
    }

    const userId = await resolveUserId(supabase, requestedUserId);
    if (!userId) {
      return NextResponse.json({
        summary: { validatedCount: 0, totalModels: 0, updatedAt: null } as ValidationSummary,
      });
    }

    const { data, error } = await supabase
      .from('ai_settings_validation_summary')
      .select('validated_count, total_models, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    const summary: ValidationSummary = data
      ? {
          validatedCount: data.validated_count ?? 0,
          totalModels: data.total_models ?? 0,
          updatedAt: data.updated_at ?? null,
        }
      : { validatedCount: 0, totalModels: 0, updatedAt: null };

    return NextResponse.json({ summary });
  } catch (err) {
    console.error('[AI Settings] GET summary error:', err);
    return NextResponse.json({ error: '無法讀取組態概況' }, { status: 500 });
  }
}

// POST: Upsert validation summary (called after 全部驗證). Use select-then-update-or-insert to avoid upsert quirks on repeated calls.
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json().catch(() => ({}));
    const { validatedCount, totalModels } = body as { validatedCount?: number; totalModels?: number };
    const requestedUserId = request.headers.get('x-user-id');
    if (!requestedUserId) {
      return NextResponse.json({ error: '未授權存取' }, { status: 401 });
    }

    const userId = await resolveUserId(supabase, requestedUserId);
    if (!userId) {
      return NextResponse.json({ error: '找不到可用的使用者' }, { status: 401 });
    }

    const vCount = typeof validatedCount === 'number' ? validatedCount : 0;
    const tModels = typeof totalModels === 'number' ? totalModels : 0;
    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from('ai_settings_validation_summary')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      const { error: updateErr } = await supabase
        .from('ai_settings_validation_summary')
        .update({
          validated_count: vCount,
          total_models: tModels,
          updated_at: now,
        })
        .eq('user_id', userId);
      if (updateErr) throw updateErr;
    } else {
      const { error: insertErr } = await supabase
        .from('ai_settings_validation_summary')
        .insert({
          user_id: userId,
          validated_count: vCount,
          total_models: tModels,
          updated_at: now,
        });
      if (insertErr) throw insertErr;
    }

    return NextResponse.json({
      summary: { validatedCount: vCount, totalModels: tModels, updatedAt: now },
    });
  } catch (err) {
    console.error('[AI Settings] POST summary error:', err);
    return NextResponse.json({ error: '無法儲存組態概況' }, { status: 500 });
  }
}
