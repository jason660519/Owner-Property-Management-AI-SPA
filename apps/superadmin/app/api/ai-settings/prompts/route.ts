// filepath: apps/superadmin/app/api/ai-settings/prompts/route.ts
// API route for managing AI system prompts

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

// GET: Fetch system prompts
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('ai_system_prompts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('module_key')
      .order('version', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ prompts: data || [] });
  } catch (err) {
    console.error('[AI Settings] GET prompts error:', err);
    return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 });
  }
}

// POST: Save or update a system prompt
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { userId, moduleKey, provider, promptName, promptContent } = await request.json();

    if (!userId || !moduleKey || !provider) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get current max version
    const { data: existing } = await supabase
      .from('ai_system_prompts')
      .select('version')
      .eq('user_id', userId)
      .eq('module_key', moduleKey)
      .eq('provider', provider)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = (existing?.[0]?.version || 0) + 1;

    // Deactivate previous versions
    await supabase
      .from('ai_system_prompts')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('module_key', moduleKey)
      .eq('provider', provider);

    // Insert new version
    const { data, error } = await supabase
      .from('ai_system_prompts')
      .insert({
        user_id: userId,
        module_key: moduleKey,
        provider,
        prompt_name: promptName || 'default',
        prompt_content: promptContent || '',
        version: nextVersion,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`[AI Settings] Prompt saved for ${moduleKey}/${provider} v${nextVersion}`);
    return NextResponse.json({ prompt: data });
  } catch (err) {
    console.error('[AI Settings] POST prompt error:', err);
    return NextResponse.json({ error: 'Failed to save prompt' }, { status: 500 });
  }
}
