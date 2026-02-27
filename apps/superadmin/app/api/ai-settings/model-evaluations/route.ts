import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { resolveUserId } from '@/lib/resolve-ai-settings-user';

interface EvaluationPayload {
  provider: string;
  model_id: string;
  model_name: string;
  is_working: boolean;
  specialties: string[];
  is_candidate: boolean;
  notes?: string;
  last_tested_at?: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const requestedUserId = request.headers.get('x-user-id');

    if (!requestedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await resolveUserId(supabase, requestedUserId);
    if (!userId) {
      return NextResponse.json({ evaluations: [] });
    }

    const { data, error } = await supabase
      .from('ai_model_evaluations')
      .select('*')
      .eq('user_id', userId)
      .order('provider')
      .order('model_id');

    if (error) throw error;

    return NextResponse.json({ evaluations: data ?? [] });
  } catch (err) {
    console.error('[AI Settings] GET model-evaluations error:', err);
    return NextResponse.json({ error: 'Failed to fetch model evaluations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { userId: requestedUserId, evaluations } = body as {
      userId: string;
      evaluations: EvaluationPayload[];
    };

    if (!requestedUserId || !Array.isArray(evaluations)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userId = await resolveUserId(supabase, requestedUserId);
    if (!userId) {
      return NextResponse.json({ error: '找不到可用的使用者' }, { status: 401 });
    }

    const VALID_SPECIALTIES = [
      'language_analysis', 'image_generation', 'coding',
      'reasoning', 'vision', 'general',
    ];

    const rows = evaluations.map((e) => ({
      user_id: userId,
      provider: e.provider,
      model_id: e.model_id,
      model_name: e.model_name,
      is_working: e.is_working,
      specialties: (e.specialties ?? []).filter((s: string) => VALID_SPECIALTIES.includes(s)),
      is_candidate: e.is_candidate,
      notes: e.notes ?? '',
      last_tested_at: e.last_tested_at ?? null,
    }));

    const { data, error } = await supabase
      .from('ai_model_evaluations')
      .upsert(rows, { onConflict: 'user_id,provider,model_id' })
      .select();

    if (error) throw error;

    console.log(`[AI Settings] Model evaluations saved: ${rows.length} entries`);
    return NextResponse.json({ success: true, evaluations: data });
  } catch (err) {
    console.error('[AI Settings] POST model-evaluations error:', err);
    return NextResponse.json({ error: 'Failed to save model evaluations' }, { status: 500 });
  }
}
