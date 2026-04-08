import { NextResponse } from 'next/server';
import { resolveUserId } from '@/lib/resolve-ai-settings-user';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { DEFAULT_PROMPT, PROMPT_NAME, truncate } from '../stream/utils';

type PromptSource = 'ai_system_prompt' | 'saved_prompt' | 'default';

const PROPERTY_DESCRIPTION_MODULE_KEYS = ['property_description', 'blog_generator'] as const;

async function getCustomPromptTemplate(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<string | null> {
  try {
    const { data } = await admin
      .from('saved_prompts')
      .select('content')
      .eq('created_by', userId)
      .eq('name', PROMPT_NAME)
      .maybeSingle();
    return data?.content ?? null;
  } catch {
    return null;
  }
}

async function resolveEffectiveUserId(): Promise<string | null> {
  try {
    const sessionClient = await createClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();
    if (!user?.id) {
      return null;
    }

    const adminClient = createAdminClient();
    return await resolveUserId(adminClient, user.id);
  } catch {
    return null;
  }
}

async function fetchModulePrompt(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<{ template: string | null; moduleKey: string | null; version: number | null }> {
  for (const key of PROPERTY_DESCRIPTION_MODULE_KEYS) {
    const { data } = await adminClient
      .from('ai_system_prompts')
      .select('prompt_content, version')
      .eq('user_id', userId)
      .eq('module_key', key)
      .order('version', { ascending: false })
      .limit(1)
      .single();
    if (typeof data?.prompt_content === 'string' && data.prompt_content.trim()) {
      return {
        template: data.prompt_content,
        moduleKey: key,
        version: typeof data.version === 'number' ? data.version : null,
      };
    }
  }

  return { template: null, moduleKey: null, version: null };
}

export async function GET() {
  try {
    const adminClient = createAdminClient();
    const userId = await resolveEffectiveUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const modulePrompt = await fetchModulePrompt(adminClient, userId);
    if (modulePrompt.template) {
      return NextResponse.json({
        promptName: PROMPT_NAME,
        source: 'ai_system_prompt' as PromptSource,
        moduleKey: modulePrompt.moduleKey,
        version: modulePrompt.version,
        templatePreview: truncate(modulePrompt.template, 260),
      });
    }

    const customPrompt = await getCustomPromptTemplate(adminClient, userId);
    if (customPrompt) {
      return NextResponse.json({
        promptName: PROMPT_NAME,
        source: 'saved_prompt' as PromptSource,
        moduleKey: null,
        version: null,
        templatePreview: truncate(customPrompt, 260),
      });
    }

    return NextResponse.json({
      promptName: PROMPT_NAME,
      source: 'default' as PromptSource,
      moduleKey: null,
      version: null,
      templatePreview: truncate(DEFAULT_PROMPT, 260),
    });
  } catch {
    return NextResponse.json({ error: 'Failed to resolve prompt config' }, { status: 500 });
  }
}
