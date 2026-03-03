// filepath: apps/superadmin/app/api/ai-settings/prompts/route.ts
// API route for managing AI system prompts

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { resolveUserId } from '@/lib/resolve-ai-settings-user';

// GET: Fetch system prompts（使用 resolveUserId 與 keys 一致）
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const requestedUserId = request.headers.get('x-user-id');

    if (!requestedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await resolveUserId(supabase, requestedUserId);
    if (!userId) {
      return NextResponse.json({ prompts: [] });
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
    const effectiveName = promptName || 'default';

    // Get current max version (per module+provider+name)
    const { data: existing } = await supabase
      .from('ai_system_prompts')
      .select('version')
      .eq('user_id', userId)
      .eq('module_key', moduleKey)
      .eq('provider', provider)
      .eq('prompt_name', effectiveName)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = (existing?.[0]?.version || 0) + 1;

    // Deactivate previous versions for the SAME prompt_name
    await supabase
      .from('ai_system_prompts')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('module_key', moduleKey)
      .eq('provider', provider)
      .eq('prompt_name', effectiveName);

    // Insert new version
    const { data, error } = await supabase
      .from('ai_system_prompts')
      .insert({
        user_id: userId,
        module_key: moduleKey,
        provider,
        prompt_name: effectiveName,
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

// DELETE: Soft-delete (deactivate) a specific prompt by id
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { userId, promptId } = await request.json();
    if (!userId || !promptId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const { error } = await supabase
      .from('ai_system_prompts')
      .update({ is_active: false })
      .eq('id', promptId)
      .eq('user_id', userId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[AI Settings] DELETE prompt error:', err);
    return NextResponse.json({ error: 'Failed to delete prompt' }, { status: 500 });
  }
}
