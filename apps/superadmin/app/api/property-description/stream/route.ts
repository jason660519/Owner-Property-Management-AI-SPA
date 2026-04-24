import { NextRequest } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { decryptApiKey } from '@/lib/crypto';
import { resolveUserId } from '@/lib/resolve-ai-settings-user';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { PromptNotFoundError, resolveSystemPrompt } from '@/lib/ai/prompt-safety';
import { startPromptAudit } from '@/lib/ai/audit';
import {
  createLLMObservabilityTrace,
  logLLMObservabilityInvocation,
} from '@/lib/ai/observability';
import { checkRateLimit } from '@/lib/ai/rate-limit';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import {
  resolveAgentModel,
  AgentDisabledError,
  InvalidAgentKeyError,
  type AgentAssignmentReader,
} from '@/lib/ai/resolve-agent-model';
import { sortByProviderPriority } from '@/lib/ai/provider-priority';
import {
  checkAgentBudget,
  type AuditLogReader,
} from '@/lib/ai/agent-cost-guard';
import { applyForbidProviders } from '@/lib/ai/agent-guardrail-filters';
import type { AgentGuardrails } from '@/lib/types/agent-assignment';
import {
  buildCurrentDescriptionSection,
  buildFacts,
  buildGenerationSettings,
  buildResources,
  DEFAULT_MODEL,
  DEFAULT_PROMPT,
  DEFAULT_PROVIDER,
  getMaxTokens,
  type GenerateDescriptionInput,
  PROMPT_NAME,
  PROMPT_SAFETY_TRAILER,
  truncate,
} from './utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'grok' | 'together' | 'kimi' | 'openrouter' | 'zhipu';
type PromptSource = 'ai_system_prompt' | 'saved_prompt' | 'default';
type ModelSelectionSource = 'agent_config_db' | 'agent_config_factory_default' | 'ai_module' | 'default';
type ApiKeySource = 'ai_settings' | 'env' | 'missing';
type AssignedModelRow = { provider: AIProvider; model: string; priority?: number };
type PromptResolution = {
  template: string;
  source: PromptSource;
  moduleKey: string | null;
  version: number | null;
  /** saved_prompts.id when the template came from saved_prompts (else null). */
  savedPromptId: string | null;
};
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
  // 1. Per-user override via legacy ai_system_prompts (property_description / blog_generator).
  if (userId) {
    const modulePrompt = await fetchModulePrompt(adminClient, userId, PROPERTY_DESCRIPTION_MODULE_KEYS);
    if (modulePrompt.template) {
      return {
        template: modulePrompt.template,
        source: 'ai_system_prompt',
        moduleKey: modulePrompt.moduleKey,
        version: modulePrompt.version,
        savedPromptId: null,
      };
    }
  }

  // 2. Legacy saved_prompts lookup by exact name (kept for backwards-compat).
  const customPrompt = await getCustomPromptTemplate();
  if (customPrompt) {
    return {
      template: customPrompt,
      source: 'saved_prompt',
      moduleKey: null,
      version: null,
      savedPromptId: null,
    };
  }

  // 3. Canonical SSoT lookup via saved_prompts.module_key (introduced by
  //    20260411090000_add_module_key_to_saved_prompts.sql + seedDefaultPrompts).
  try {
    const resolved = await resolveSystemPrompt({
      moduleKey: 'property.description.default',
      client: adminClient,
    });
    return {
      template: resolved.content,
      source: 'saved_prompt',
      moduleKey: 'property.description.default',
      version: null,
      savedPromptId: resolved.savedPromptId ?? null,
    };
  } catch (err) {
    if (!(err instanceof PromptNotFoundError)) {
      throw err;
    }
    // Fall through to hard-code fallback (warned below).
  }

  // 4. Loud fallback to the hard-coded constant — log it so we can detect
  //    missing seeds in production. See docs/ai-prompt-safety-guide.md §10.6.
  console.warn(
    '[property-description] No prompt found in ai_system_prompts or saved_prompts. ' +
      'Falling back to DEFAULT_PROMPT hard-code. ' +
      'Run seedDefaultPrompts() from the prompt-management UI to fix.',
  );
  return {
    template: DEFAULT_PROMPT,
    source: 'default',
    moduleKey: null,
    version: null,
    savedPromptId: null,
  };
}

interface CandidateResolution {
  candidates: ModelResolution[];
  /** Non-null only when candidates came from the Phase 2 resolver path. */
  guardrails: AgentGuardrails | null;
}

async function resolveModelCandidates(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string | null,
): Promise<CandidateResolution> {
  // Phase 2 primary path: read the global ai_agent_model_assignments table
  // via the shared resolver. `property_description` is the canonical agent_key;
  // falls back to factory defaults if no row exists.
  //
  // The Supabase admin client satisfies the AgentAssignmentReader shape at
  // runtime, but Supabase's generated types drag in such a deep union that
  // TS2589 triggers without an explicit cast here.
  try {
    const resolved = await resolveAgentModel('property_description', {
      supabase: adminClient as unknown as AgentAssignmentReader,
    });
    const selectionSource =
      resolved.source === 'db' ? 'agent_config_db' : 'agent_config_factory_default';

    // Phase 2.5 static guardrail: strip providers that match
    // `guardrails.forbid_providers` BEFORE we build the candidate chain.
    // (`require_tags` is not enforced here — server-side role-catalog
    // lookup is a separate future task.)
    const sanitized = applyForbidProviders(resolved.chain, resolved.guardrails.forbid_providers);
    if (sanitized.dropped.length > 0) {
      console.info(
        `[property-description/stream] forbid_providers dropped ${sanitized.dropped.length} link(s):`,
        sanitized.dropped.map((d) => `${d.link.provider}/${d.link.model_id}`),
      );
    }

    const orderedLinks = sortByProviderPriority(sanitized.allowed);
    const resolutions = await Promise.all(
      orderedLinks.map(async (link) => {
        const provider = link.provider as AIProvider;
        const keyResolution = await getProviderApiKey(adminClient, userId, provider);
        return {
          provider,
          model: link.model_id,
          moduleKey: resolved.agent_key,
          selectionSource: selectionSource as ModelSelectionSource,
          apiKey: keyResolution.apiKey,
          apiKeySource: keyResolution.source,
        };
      }),
    );
    if (resolutions.length > 0) {
      return { candidates: resolutions, guardrails: resolved.guardrails };
    }
  } catch (err) {
    // InvalidAgentKeyError / AgentDisabledError bubble up to the legacy path.
    if (!(err instanceof InvalidAgentKeyError || err instanceof AgentDisabledError)) {
      console.warn(
        '[property-description/stream] resolveAgentModel failed, falling back to ai_modules_assigned_function',
        err,
      );
    } else {
      console.info(
        `[property-description/stream] resolveAgentModel declined (${err.name}), falling back to legacy per-user assignments`,
      );
    }
  }

  // Legacy path: per-user ai_modules_assigned_function. Kept so existing rows
  // keep working during the Phase 2 rollout — remove once all superadmins
  // are migrated to the global config.
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
      return { candidates: resolutions, guardrails: null };
    }
  }

  const fallbackKey = await getProviderApiKey(adminClient, userId, DEFAULT_PROVIDER);
  return {
    candidates: [
      {
        provider: DEFAULT_PROVIDER,
        model: DEFAULT_MODEL,
        moduleKey: null,
        selectionSource: 'default',
        apiKey: fallbackKey.apiKey,
        apiKeySource: fallbackKey.source,
      },
    ],
    guardrails: null,
  };
}

export async function POST(request: NextRequest) {
  // Caller must be a super_admin. Session-first with header fallback.
  const auth = await requireSuperadmin({
    request,
    routeLabel: 'api/property-description/stream',
  });
  if (!auth.ok) {
    return new Response(auth.message, { status: auth.status });
  }

  const rl = await checkRateLimit({
    userId: auth.userId,
    endpointKey: 'api/property-description/stream',
  });
  if (!rl.allowed) {
    return new Response(rl.message, {
      status: 429,
      headers: { 'Retry-After': String(rl.retryAfterSeconds) },
    });
  }

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
      const traceStartedAt = new Date(startedAt).toISOString();
      const observabilityTraceKey = `property-description:${randomUUID()}`;
      let observabilityTraceId: string | null = null;
      const adminClient = createAdminClient();

      try {
        send({ type: 'phase', phase: 'collecting_context' satisfies TracePhase, message: '蒐集物件資料中…' });
        const resources = buildResources(body);
        send({ type: 'resources', resources });
        const userId = await resolveEffectiveUserId();

        send({ type: 'phase', phase: 'loading_prompt' satisfies TracePhase, message: '載入 Prompt 模板中…' });
        const promptResolution = await resolvePromptTemplate(adminClient, userId);
        const template = promptResolution.template;
        // buildFacts() already returns its output wrapped in a
        // <property_data> XML block with each field XML-escaped, so the LLM
        // sees user-controlled values as data, not instructions. See
        // docs/ai-prompt-safety-guide.md §4.
        const facts = buildFacts(body);
        const generationSettings = buildGenerationSettings(body);
        const currentDescriptionSection = buildCurrentDescriptionSection(body.currentDescription);
        const prompt = template.includes('{物件資料}')
          ? template.replace('{物件資料}', facts)
          : `${template}\n\n物件資料：\n${facts}`;

        send({ type: 'phase', phase: 'building_prompt' satisfies TracePhase, message: '整理生成指令中…' });
        const finalPrompt = `${prompt}\n\n生成設定：\n${generationSettings}${currentDescriptionSection}${PROMPT_SAFETY_TRAILER}`;
        const finalPromptHash = createHash('sha256').update(finalPrompt).digest('hex');
        observabilityTraceId = await createLLMObservabilityTrace({
          client: adminClient,
          traceKey: observabilityTraceKey,
          userId,
          pagePath: '/api/property-description/stream',
          moduleKey: 'property_description',
          invocationName: PROMPT_NAME,
          executionName: 'stream',
          status: 'running',
          startedAt: traceStartedAt,
          metadata: {
            promptSource: promptResolution.source,
            promptModuleKey: promptResolution.moduleKey,
            promptVersion: promptResolution.version,
            finalPromptHash,
            listingType: body.listingType,
            generationTone: body.generationTone ?? null,
            generationLength: body.generationLength ?? null,
            generationGoal: body.generationGoal ?? null,
          },
        });
        send({
          type: 'prompt_loaded',
          promptName: PROMPT_NAME,
          promptSource: promptResolution.source,
          moduleKey: promptResolution.moduleKey,
          templatePreview: truncate(template),
          finalPromptPreview: truncate(finalPrompt, 1200),
        });

        send({ type: 'phase', phase: 'selecting_model' satisfies TracePhase, message: '選擇 LLM 與金鑰來源中…' });
        const { candidates: modelCandidates, guardrails } = await resolveModelCandidates(adminClient, userId);

        // Phase 2.5 guardrail: if this agent has a monthly USD cap and the
        // current month's audit log total is already at or above it, refuse
        // the call before touching any LLM. The resolver's own `cost_over`
        // fallback chain is intended for runtime cost surprises — once the
        // monthly cap is hit, no model (fallback or not) is allowed.
        if (guardrails && guardrails.max_monthly_usd && guardrails.max_monthly_usd > 0) {
          const verdict = await checkAgentBudget(
            adminClient as unknown as AuditLogReader,
            'property_description',
            guardrails,
          );
          send({
            type: 'budget_check',
            allowed: verdict.allowed,
            spentUsd: Number(verdict.spentUsd.toFixed(4)),
            capUsd: verdict.capUsd,
          });
          if (!verdict.allowed) {
            send({
              type: 'error',
              phase: 'selecting_model' satisfies TracePhase,
              message: `本月累計花費 $${verdict.spentUsd.toFixed(2)} 已達上限 $${verdict.capUsd}，請至「模型選擇與設定」調整 guardrails 或等待下個月。`,
              code: 'monthly_cap_exceeded',
            });
            // Outer finally will close the controller — just bail out.
            return;
          }
        }

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
            await logLLMObservabilityInvocation({
              client: adminClient,
              traceId: observabilityTraceId,
              userId,
              sourceKind: 'llm_call',
              provider: candidate.provider,
              requestedModel: candidate.model,
              effectiveModel: candidate.model,
              inputPrompt: finalPrompt,
              evaluationLabel: 'fail',
              evaluationScore: 0,
              evaluationMessage: 'missing_api_key',
              tokensInput: 0,
              tokensOutput: 0,
              costUsd: 0,
              status: 'error',
              errorMessage: 'missing_api_key',
              startedAt: new Date().toISOString(),
              endedAt: new Date().toISOString(),
              metadata: {
                apiKeySource: candidate.apiKeySource,
                selectionSource: candidate.selectionSource,
                moduleKey: candidate.moduleKey,
                finalPromptHash,
              },
            });
            continue;
          }

          send({ type: 'phase', phase: 'sending_request' satisfies TracePhase, message: '正在送出 AI 請求…' });
          send({ type: 'phase', phase: 'waiting_response' satisfies TracePhase, message: '等待 LLM 回應中…' });

          // Hash the user-controlled portion of the request so the audit log
          // can detect replays without persisting private data.
          const userInputFingerprint = JSON.stringify({
            title: body.title,
            propertyType: body.propertyType,
            addressCity: body.addressCity,
            addressDistrict: body.addressDistrict,
            addressStreet: body.addressStreet,
            currentDescription: body.currentDescription,
          });

          const audit = startPromptAudit({
            moduleKey: 'property.description.default',
            agentKey: 'property_description',
            provider: candidate.provider,
            modelId: candidate.model,
            userId,
            savedPromptId: promptResolution.savedPromptId,
            promptSource: promptResolution.source,
            userInput: userInputFingerprint,
            client: adminClient,
          });

          const callStart = Date.now();
          const callStartedAt = new Date(callStart).toISOString();
          let response: Awaited<ReturnType<typeof invokeProvider>>;
          try {
            response = await invokeProvider(
              candidate.provider,
              candidate.model,
              candidate.apiKey,
              finalPrompt,
              maxTokens,
            );
          } catch (callErr) {
            const callEndedAt = new Date().toISOString();
            const latencyMs = Date.now() - callStart;
            await audit.complete('api_error', {
              errorMessage: callErr instanceof Error ? callErr.message : 'Unknown',
              latencyMs,
            });
            await logLLMObservabilityInvocation({
              client: adminClient,
              traceId: observabilityTraceId,
              userId,
              sourceKind: 'llm_call',
              provider: candidate.provider,
              requestedModel: candidate.model,
              effectiveModel: candidate.model,
              inputPrompt: finalPrompt,
              evaluationLabel: 'fail',
              evaluationScore: 0,
              evaluationMessage: callErr instanceof Error ? callErr.message : 'Unknown provider error',
              e2eMs: latencyMs,
              status: 'error',
              errorMessage: callErr instanceof Error ? callErr.message : 'Unknown provider error',
              startedAt: callStartedAt,
              endedAt: callEndedAt,
              metadata: {
                apiKeySource: candidate.apiKeySource,
                selectionSource: candidate.selectionSource,
                moduleKey: candidate.moduleKey,
                finalPromptHash,
              },
            });
            throw callErr;
          }
          const callDuration = Date.now() - callStart;
          const callEndedAt = new Date().toISOString();

          if (response.ok && response.description) {
            await audit.complete('success', {
              latencyMs: callDuration,
              inputTokens: response.usage?.inputTokens ?? null,
              outputTokens: response.usage?.outputTokens ?? null,
            });
          } else {
            await audit.complete(
              response.ok ? 'schema_mismatch' : 'api_error',
              {
                latencyMs: callDuration,
                errorMessage: `http_${response.status}`,
                inputTokens: response.usage?.inputTokens ?? null,
                outputTokens: response.usage?.outputTokens ?? null,
              },
            );
          }

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

          await logLLMObservabilityInvocation({
            client: adminClient,
            traceId: observabilityTraceId,
            userId,
            sourceKind: 'llm_call',
            provider: candidate.provider,
            requestedModel: candidate.model,
            effectiveModel: candidate.model,
            inputPrompt: finalPrompt,
            rawOutput: response.raw,
            renderedOutput: response.description || null,
            evaluationLabel: response.ok && response.description ? 'pass' : 'fail',
            evaluationScore: response.ok && response.description ? 1 : 0,
            evaluationMessage: response.ok && response.description ? 'description_generated' : `http_${response.status}`,
            e2eMs: callDuration,
            throughputTokensPerS:
              response.usage?.outputTokens && callDuration > 0
                ? Number(((response.usage.outputTokens / callDuration) * 1000).toFixed(2))
                : null,
            httpStatus: response.status,
            tokensInput: response.usage?.inputTokens ?? null,
            tokensOutput: response.usage?.outputTokens ?? null,
            costUsd: 0,
            status: response.ok && response.description ? 'success' : 'error',
            errorMessage: response.ok && response.description ? null : `http_${response.status}`,
            startedAt: callStartedAt,
            endedAt: callEndedAt,
            metadata: {
              apiKeySource: candidate.apiKeySource,
              selectionSource: candidate.selectionSource,
              moduleKey: candidate.moduleKey,
              promptSource: promptResolution.source,
              promptModuleKey: promptResolution.moduleKey,
              promptVersion: promptResolution.version,
              finalPromptHash,
            },
          });

          if (response.ok && response.description) {
            await createLLMObservabilityTrace({
              client: adminClient,
              traceKey: observabilityTraceKey,
              userId,
              pagePath: '/api/property-description/stream',
              moduleKey: 'property_description',
              invocationName: PROMPT_NAME,
              executionName: 'stream',
              status: 'success',
              startedAt: traceStartedAt,
              endedAt: callEndedAt,
              metadata: {
                finalPromptHash,
                completedProvider: candidate.provider,
                completedModel: candidate.model,
              },
            });
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
          await createLLMObservabilityTrace({
            client: adminClient,
            traceKey: observabilityTraceKey,
            userId,
            pagePath: '/api/property-description/stream',
            moduleKey: 'property_description',
            invocationName: PROMPT_NAME,
            executionName: 'stream',
            status: 'error',
            startedAt: traceStartedAt,
            endedAt: new Date().toISOString(),
            metadata: { finalPromptHash, error: 'missing_api_key' },
          });
          send({ type: 'error', message: '尚未設定可用的 AI 服務 API 金鑰，請至「AI 服務 / API KEY」完成設定' });
          return;
        }

        if (lastErrorMessage) {
          await createLLMObservabilityTrace({
            client: adminClient,
            traceKey: observabilityTraceKey,
            userId,
            pagePath: '/api/property-description/stream',
            moduleKey: 'property_description',
            invocationName: PROMPT_NAME,
            executionName: 'stream',
            status: 'error',
            startedAt: traceStartedAt,
            endedAt: new Date().toISOString(),
            metadata: { finalPromptHash, error: lastErrorMessage },
          });
          send({ type: 'error', message: lastErrorMessage });
          return;
        }

        await createLLMObservabilityTrace({
          client: adminClient,
          traceKey: observabilityTraceKey,
          userId,
          pagePath: '/api/property-description/stream',
          moduleKey: 'property_description',
          invocationName: PROMPT_NAME,
          executionName: 'stream',
          status: 'error',
          startedAt: traceStartedAt,
          endedAt: new Date().toISOString(),
          metadata: { finalPromptHash, error: 'generation_failed' },
        });
        send({ type: 'error', message: '生成失敗，請稍後再試' });
      } catch (error) {
        if (request.signal.aborted) {
          return;
        }
        await createLLMObservabilityTrace({
          client: adminClient,
          traceKey: observabilityTraceKey,
          pagePath: '/api/property-description/stream',
          moduleKey: 'property_description',
          invocationName: PROMPT_NAME,
          executionName: 'stream',
          status: 'error',
          startedAt: traceStartedAt,
          endedAt: new Date().toISOString(),
          metadata: {
            error: error instanceof Error ? error.message : String(error),
          },
        });
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
