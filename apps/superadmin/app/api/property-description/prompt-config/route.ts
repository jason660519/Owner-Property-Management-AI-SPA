import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
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

export async function GET(request: NextRequest) {
  const authResult = await requireSuperadmin({
    request,
    allowHeaderFallback: false,
    routeLabel: 'api/property-description/prompt-config',
  });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }
  const userId = authResult.userId;

  try {
    const adminClient = createAdminClient();

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
