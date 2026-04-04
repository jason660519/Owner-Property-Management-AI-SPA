import { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { decryptApiKey } from '@/lib/crypto';
import { resolveUserId } from '@/lib/resolve-ai-settings-user';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import {
  buildFacts,
  buildGenerationSettings,
  buildResources,
  DEFAULT_MODEL,
  DEFAULT_PROMPT,
  DEFAULT_PROVIDER,
  getMaxTokens,
  type GenerateDescriptionInput,
  PROMPT_NAME,
  truncate,
} from './utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'grok' | 'together' | 'kimi' | 'openrouter' | 'zhipu';
type PromptSource = 'ai_system_prompt' | 'saved_prompt' | 'default';
type ModelSelectionSource = 'ai_module' | 'default';
type ApiKeySource = 'ai_settings' | 'env' | 'missing';
type AssignedModelRow = { provider: AIProvider; model: string; priority?: number };
type PromptResolution = { template: string; source: PromptSource; moduleKey: string | null; version: number | null };
type ModelResolution = {
  provider: AIProvider;
  model: string;
  moduleKey: string | null;
  selectionSource: ModelSelectionSource;
  apiKey: string | null;
  apiKeySource: ApiKeySource;
};

type TracePhase =
  | 'collecting_context'
  | 'loading_prompt'
  | 'selecting_model'
  | 'building_prompt'
  | 'sending_request'
  | 'waiting_response'
  | 'completed';

const PROPERTY_DESCRIPTION_MODULE_KEYS = ['property_description', 'blog_generator'] as const;
function getEnvApiKey(provider: AIProvider): string | null {
  const envKeyMap: Record<AIProvider, string | undefined> = {
    anthropic: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY,
    grok: process.env.GROK_API_KEY,
    together: process.env.TOGETHER_AI_API_KEY,
    kimi: process.env.KIMI_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
    zhipu: process.env.ZHIPU_API_KEY,
  };
  return envKeyMap[provider]?.trim() || null;
}

async function getCustomPromptTemplate(): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('saved_prompts')
      .select('content')
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

    const adminClient = createAdminClient();
    const fallbackRequestedUserId =
      user?.id ?? process.env.SUPERADMIN_DEFAULT_USER_ID ?? '00000000-0000-0000-0000-000000000000';
    return await resolveUserId(adminClient, fallbackRequestedUserId);
  } catch (userLookupError) {
    console.error('[property-description/stream] Failed to resolve effective user:', userLookupError);
  }

  return null;
}

async function fetchAssignedModels(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  moduleKeys: readonly string[],
): Promise<{ models: AssignedModelRow[]; moduleKey: string | null }> {
  for (const key of moduleKeys) {
    const { data } = await adminClient
      .from('ai_modules_assigned_function')
      .select('assigned_models, assigned_provider, assigned_model')
      .eq('user_id', userId)
      .eq('assigned_function', key)
      .single();

    if (!data) {
      continue;
    }

    const models = Array.isArray(data.assigned_models) ? (data.assigned_models as AssignedModelRow[]) : [];
    if (models.length > 0) {
      return {
        models: models.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99)),
        moduleKey: key,
      };
    }

    if (data.assigned_provider && data.assigned_model) {
      return {
        models: [{ provider: data.assigned_provider as AIProvider, model: data.assigned_model as string, priority: 1 }],
        moduleKey: key,
      };
    }
  }

  return { models: [], moduleKey: null };
}

async function fetchModulePrompt(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  moduleKeys: readonly string[],
): Promise<{ template: string | null; moduleKey: string | null; version: number | null }> {
  for (const key of moduleKeys) {
    const { data } = await adminClient
      .from('ai_system_prompts')
      .select('prompt_content, version')
      .eq('user_id', userId)
      .eq('module_key', key)
      .order('version', { ascending: false })
      .limit(1)
      .single();
    if (typeof data?.prompt_content === 'string' && data.prompt_content.trim()) {
      return { template: data.prompt_content, moduleKey: key, version: typeof data.version === 'number' ? data.version : null };
    }
  }

  return { template: null, moduleKey: null, version: null };
}

async function getProviderApiKey(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string | null,
  provider: AIProvider,
): Promise<{ apiKey: string | null; source: ApiKeySource }> {
  if (userId) {
    try {
      const { data: keyRow } = await adminClient
        .from('ai_api_keys')
        .select('api_key_encrypted, iv')
        .eq('user_id', userId)
        .eq('provider', provider)
        .eq('is_active', true)
        .single();

      if (keyRow?.api_key_encrypted && keyRow?.iv) {
        try {
          return {
            apiKey: await decryptApiKey(keyRow.api_key_encrypted, keyRow.iv),
            source: 'ai_settings',
          };
        } catch (decryptError) {
          console.error(`[property-description/stream] Failed to decrypt ${provider} API key:`, decryptError);
        }
      }
    } catch (keyLookupError) {
      console.error(`[property-description/stream] Failed to resolve ${provider} API key:`, keyLookupError);
    }
  }

  const envKey = getEnvApiKey(provider);
  if (envKey) {
    return { apiKey: envKey, source: 'env' };
  }

  return { apiKey: null, source: 'missing' };
}

function extractOpenAIOutput(data: unknown): string {
  const choices = (data as { choices?: { message?: { content?: string } }[] })?.choices;
  const text = choices?.[0]?.message?.content;
  return typeof text === 'string' ? text.trim() : '';
}

function extractAnthropicOutput(data: unknown): string {
  const content = (data as { content?: { text?: string }[] })?.content;
  const text = content?.[0]?.text;
  return typeof text === 'string' ? text.trim() : '';
}

function extractGeminiOutput(data: unknown): string {
  const parts = (data as { candidates?: { content?: { parts?: Array<{ text?: string }> } }[] })
    ?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return '';
  }
  return parts
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('')
    .trim();
}

function providerSignal(): AbortSignal {
  return AbortSignal.timeout(55_000);
}

async function invokeProvider(
  provider: AIProvider,
  model: string,
  apiKey: string,
  prompt: string,
  maxTokens: number,
): Promise<{ ok: boolean; status: number; raw: string; description: string; usage?: { inputTokens?: number; outputTokens?: number } }> {
  switch (provider) {
    case 'anthropic': {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: providerSignal(),
      });
      const raw = await response.text();
      const json = JSON.parse(raw) as {
        content?: Array<{ type: string; text?: string }>;
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      return {
        ok: response.ok,
        status: response.status,
        raw,
        description: extractAnthropicOutput(json),
        usage: {
          inputTokens: json.usage?.input_tokens,
          outputTokens: json.usage?.output_tokens,
        },
      };
    }
    case 'gemini': {
      const modelName = model.startsWith('models/') ? model : `models/${model}`;
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: maxTokens },
          }),
          signal: providerSignal(),
        }
      );
      const raw = await response.text();
      const json = JSON.parse(raw) as unknown;
      return {
        ok: response.ok,
        status: response.status,
        raw,
        description: extractGeminiOutput(json),
      };
    }
    case 'openai':
    case 'deepseek':
    case 'grok':
    case 'together':
    case 'kimi':
    case 'openrouter':
    case 'zhipu': {
      const endpointMap: Record<Exclude<AIProvider, 'anthropic' | 'gemini'>, string> = {
        openai: 'https://api.openai.com/v1/chat/completions',
        deepseek: 'https://api.deepseek.com/v1/chat/completions',
        grok: 'https://api.x.ai/v1/chat/completions',
        together: 'https://api.together.xyz/v1/chat/completions',
        kimi: 'https://api.moonshot.cn/v1/chat/completions',
        openrouter: 'https://openrouter.ai/api/v1/chat/completions',
        zhipu: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      };
      const response = await fetch(endpointMap[provider], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
        }),
        signal: providerSignal(),
      });
      const raw = await response.text();
      const json = JSON.parse(raw) as {
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      return {
        ok: response.ok,
        status: response.status,
        raw,
        description: extractOpenAIOutput(json),
        usage: {
          inputTokens: json.usage?.prompt_tokens,
          outputTokens: json.usage?.completion_tokens,
        },
      };
    }
  }
}

async function resolvePromptTemplate(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string | null,
): Promise<PromptResolution> {
  if (userId) {
    const modulePrompt = await fetchModulePrompt(adminClient, userId, PROPERTY_DESCRIPTION_MODULE_KEYS);
    if (modulePrompt.template) {
      return {
        template: modulePrompt.template,
        source: 'ai_system_prompt',
        moduleKey: modulePrompt.moduleKey,
        version: modulePrompt.version,
      };
    }
  }

  const customPrompt = await getCustomPromptTemplate();
  if (customPrompt) {
    return { template: customPrompt, source: 'saved_prompt', moduleKey: null, version: null };
  }

  return { template: DEFAULT_PROMPT, source: 'default', moduleKey: null, version: null };
}

async function resolveModelCandidates(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string | null,
): Promise<ModelResolution[]> {
  if (userId) {
    const assignment = await fetchAssignedModels(adminClient, userId, PROPERTY_DESCRIPTION_MODULE_KEYS);
    if (assignment.models.length > 0) {
      const resolutions = await Promise.all(
        assignment.models.map(async (item) => {
          const keyResolution = await getProviderApiKey(adminClient, userId, item.provider);
          return {
            provider: item.provider,
            model: item.model,
            moduleKey: assignment.moduleKey,
            selectionSource: 'ai_module' as const,
            apiKey: keyResolution.apiKey,
            apiKeySource: keyResolution.source,
          };
        })
      );
      return resolutions;
    }
  }

  const fallbackKey = await getProviderApiKey(adminClient, userId, DEFAULT_PROVIDER);
  return [
    {
      provider: DEFAULT_PROVIDER,
      model: DEFAULT_MODEL,
      moduleKey: null,
      selectionSource: 'default',
      apiKey: fallbackKey.apiKey,
      apiKeySource: fallbackKey.source,
    },
  ];
}

export async function POST(request: NextRequest) {
  let body: GenerateDescriptionInput;
  try {
    body = (await request.json()) as GenerateDescriptionInput;
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const startedAt = Date.now();
      const adminClient = createAdminClient();

      try {
        send({ type: 'phase', phase: 'collecting_context' satisfies TracePhase, message: '蒐集物件資料中…' });
        const resources = buildResources(body);
        send({ type: 'resources', resources });
        const userId = await resolveEffectiveUserId();

        send({ type: 'phase', phase: 'loading_prompt' satisfies TracePhase, message: '載入 Prompt 模板中…' });
        const promptResolution = await resolvePromptTemplate(adminClient, userId);
        const template = promptResolution.template;
        const facts = buildFacts(body);
        const generationSettings = buildGenerationSettings(body);
        const currentDescriptionSection = body.currentDescription?.trim()
          ? `\n\n現有文案（僅供參考，可重寫與整理，但不要保留錯誤資訊）：\n${body.currentDescription.trim()}`
          : '';
        const prompt = template.includes('{物件資料}')
          ? template.replace('{物件資料}', facts)
          : `${template}\n\n物件資料：\n${facts}`;

        send({ type: 'phase', phase: 'building_prompt' satisfies TracePhase, message: '整理生成指令中…' });
        const finalPrompt = `${prompt}\n\n生成設定：\n${generationSettings}${currentDescriptionSection}`;
        const finalPromptHash = createHash('sha256').update(finalPrompt).digest('hex');
        send({
          type: 'prompt_loaded',
          promptName: PROMPT_NAME,
          promptSource: promptResolution.source,
          moduleKey: promptResolution.moduleKey,
          templatePreview: truncate(template),
          finalPromptPreview: truncate(finalPrompt, 1200),
        });

        send({ type: 'phase', phase: 'selecting_model' satisfies TracePhase, message: '選擇 LLM 與金鑰來源中…' });
        const modelCandidates = await resolveModelCandidates(adminClient, userId);
        const maxTokens = getMaxTokens(body.generationLength);
        let missingKeyCount = 0;
        let lastErrorMessage: string | null = null;

        for (const candidate of modelCandidates) {
          send({
            type: 'model_selected',
            provider: candidate.provider,
            model: candidate.model,
            apiKeySource: candidate.apiKeySource,
            moduleKey: candidate.moduleKey,
            selectionSource: candidate.selectionSource,
          });

          if (!candidate.apiKey) {
            missingKeyCount += 1;
            if (userId) {
              await adminClient.from('ai_usage_logs').insert({
                user_id: userId,
                provider: candidate.provider,
                model_id: candidate.model,
                module_key: 'property_description',
                tokens_input: 0,
                tokens_output: 0,
                cost_usd: 0,
                duration_ms: 0,
                status: 'error',
                error_message: 'missing_api_key',
                prompt_name: PROMPT_NAME,
                prompt_source: promptResolution.source,
                prompt_module_key: promptResolution.moduleKey,
                prompt_version: promptResolution.version,
                final_prompt_hash: finalPromptHash,
                request_path: '/api/property-description/stream',
                response_status: null,
              });
            }
            continue;
          }

          send({ type: 'phase', phase: 'sending_request' satisfies TracePhase, message: '正在送出 AI 請求…' });
          send({ type: 'phase', phase: 'waiting_response' satisfies TracePhase, message: '等待 LLM 回應中…' });

          const response = await invokeProvider(
            candidate.provider,
            candidate.model,
            candidate.apiKey,
            finalPrompt,
            maxTokens,
          );

          const elapsed = Date.now() - startedAt;
          send({ type: 'response_meta', status: response.status, durationMs: elapsed });

          if (userId) {
            await adminClient.from('ai_usage_logs').insert({
              user_id: userId,
              provider: candidate.provider,
              model_id: candidate.model,
              module_key: 'property_description',
              tokens_input: response.usage?.inputTokens ?? 0,
              tokens_output: response.usage?.outputTokens ?? 0,
              cost_usd: 0,
              duration_ms: elapsed,
              status: response.ok && response.description ? 'success' : 'error',
              error_message: response.ok && response.description ? null : `http_${response.status}`,
              prompt_name: PROMPT_NAME,
              prompt_source: promptResolution.source,
              prompt_module_key: promptResolution.moduleKey,
              prompt_version: promptResolution.version,
              final_prompt_hash: finalPromptHash,
              request_path: '/api/property-description/stream',
              response_status: response.status,
            });
          }

          if (response.ok && response.description) {
            send({ type: 'phase', phase: 'completed' satisfies TracePhase, message: 'AI 草稿已完成' });
            send({
              type: 'complete',
              description: response.description,
              durationMs: elapsed,
              usage: response.usage,
            });
            return;
          }

          console.error(
            '[property-description/stream] Provider error:',
            candidate.provider,
            candidate.model,
            response.status,
            response.raw,
          );

          if (response.status === 401) {
            lastErrorMessage = `${candidate.provider} API 金鑰無效或已過期，請至「AI 服務 / API KEY」更新後再試`;
            continue;
          }

          if (!response.description) {
            lastErrorMessage = 'AI 回傳內容為空，請再試一次';
            continue;
          }

          lastErrorMessage = `AI 服務錯誤（${response.status}），請稍後再試`;
        }

        if (missingKeyCount === modelCandidates.length) {
          send({ type: 'error', message: '尚未設定可用的 AI 服務 API 金鑰，請至「AI 服務 / API KEY」完成設定' });
          return;
        }

        if (lastErrorMessage) {
          send({ type: 'error', message: lastErrorMessage });
          return;
        }

        send({ type: 'error', message: '生成失敗，請稍後再試' });
      } catch (error) {
        if (request.signal.aborted) {
          return;
        }
        console.error('[property-description/stream] Unexpected error:', error);
        send({
          type: 'error',
          message: error instanceof Error ? `網路錯誤：${error.message}` : '生成失敗，請稍後再試',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
