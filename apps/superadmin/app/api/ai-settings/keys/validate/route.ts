// filepath: apps/superadmin/app/api/ai-settings/keys/validate/route.ts
// API route for validating AI API keys against provider endpoints

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import type { AIProvider } from '@/lib/ai-providers';
import { decryptApiKey } from '@/lib/crypto';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import { pickRecommendedModelByProvider } from '@/lib/pick-latest-model';

interface ValidationResult {
  valid: boolean;
  provider: string;
  message: string;
  modelInfo?: string; // e.g. "推薦: gpt-5.4-pro"
  availableModels?: string[]; // full list of available models for provider/key
}

/**
 * Build the success-case modelInfo string by running the recommended-model
 * heuristic on the available models list. Returns undefined when the list
 * is empty or contained only non-chat models.
 */
function buildModelInfo(provider: AIProvider, models: string[]): string | undefined {
  const recommended = pickRecommendedModelByProvider(provider, models);
  if (recommended) return `推薦: ${recommended}`;
  if (models.length > 0) return `可用模型 ${models.length} 個`;
  return undefined;
}

async function validateOpenAI(apiKey: string): Promise<ValidationResult> {
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) {
      const data = await res.json();
      // Collect all model IDs returned by OpenAI for this key
      const models: string[] = Array.isArray(data?.data)
        ? data.data.map((m: { id: string }) => m.id).filter(Boolean)
        : [];

      return {
        valid: true,
        provider: 'openai',
        message: '金鑰驗證成功',
        modelInfo: buildModelInfo('openai', models),
        availableModels: models,
      };
    }
    return { valid: false, provider: 'openai', message: '金鑰無效或已過期' };
  } catch (e) {
    return { valid: false, provider: 'openai', message: `連線失敗: ${e instanceof Error ? e.message : 'Unknown'}` };
  }
}

async function validateAnthropic(apiKey: string): Promise<ValidationResult> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    });

    if (res.ok) {
      const data = await res.json();
      const models: string[] = Array.isArray(data?.data)
        ? data.data.map((m: { id: string }) => m.id).filter(Boolean)
        : [];

      return {
        valid: true,
        provider: 'anthropic',
        message: '金鑰驗證成功',
        modelInfo: buildModelInfo('anthropic', models),
        availableModels: models,
      };
    }

    // Fallback: If v1/models fails (e.g. 404), try the messages endpoint to at least validate the key
    if (res.status === 404) {
      const msgRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-opus-20240229',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });

      if (msgRes.ok || msgRes.status === 400) {
        return {
          valid: true,
          provider: 'anthropic',
          message: '金鑰驗證成功 (無法取得模型列表)',
          modelInfo: '推薦: (列表未取得)',
          availableModels: []
        };
      }
    }

    if (res.status === 401) {
      return { valid: false, provider: 'anthropic', message: '金鑰無效或已過期' };
    }
    return { valid: false, provider: 'anthropic', message: `HTTP ${res.status}` };
  } catch (e) {
    return { valid: false, provider: 'anthropic', message: `連線失敗: ${e instanceof Error ? e.message : 'Unknown'}` };
  }
}

async function validateGemini(apiKey: string): Promise<ValidationResult> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    if (res.ok) {
      const data = await res.json();
      const models: string[] = Array.isArray(data?.models)
        ? data.models.map((m: { name: string }) => m.name.replace(/^models\//, '')).filter(Boolean)
        : [];
      return {
        valid: true,
        provider: 'gemini',
        message: '金鑰驗證成功',
        modelInfo: buildModelInfo('gemini', models),
        availableModels: models,
      };
    }
    if (res.status === 400 || res.status === 403) {
      return { valid: false, provider: 'gemini', message: '金鑰無效或已過期' };
    }
    return { valid: false, provider: 'gemini', message: `HTTP ${res.status}` };
  } catch (e) {
    return { valid: false, provider: 'gemini', message: `連線失敗: ${e instanceof Error ? e.message : 'Unknown'}` };
  }
}

async function validateDeepSeek(apiKey: string): Promise<ValidationResult> {
  try {
    const res = await fetch('https://api.deepseek.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) {
      type OpenAICompatibleModel = { id?: string };
      type OpenAICompatibleModelsResponse = { data?: OpenAICompatibleModel[]; models?: OpenAICompatibleModel[] };
      const data = (await res.json().catch(() => ({}))) as OpenAICompatibleModelsResponse;
      // DeepSeek's API is OpenAI compatible; try typical shapes
      const models: string[] = Array.isArray(data?.data)
        ? data.data.map((m) => m.id ?? '').filter(Boolean)
        : Array.isArray(data?.models)
          ? data.models.map((m) => m.id ?? '').filter(Boolean)
          : [];

      return {
        valid: true,
        provider: 'deepseek',
        message: '金鑰驗證成功',
        modelInfo: buildModelInfo('deepseek', models),
        availableModels: models,
      };
    }
    if (res.status === 401) {
      return { valid: false, provider: 'deepseek', message: '金鑰無效或已過期' };
    }
    return { valid: false, provider: 'deepseek', message: `HTTP ${res.status}` };
  } catch (e) {
    return { valid: false, provider: 'deepseek', message: `連線失敗: ${e instanceof Error ? e.message : 'Unknown'}` };
  }
}

async function validateGrok(apiKey: string): Promise<ValidationResult> {
  try {
    const res = await fetch('https://api.x.ai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) {
      type OpenAICompatibleModel = { id?: string };
      type OpenAICompatibleModelsResponse = { data?: OpenAICompatibleModel[]; models?: OpenAICompatibleModel[] };
      const data = (await res.json().catch(() => ({}))) as OpenAICompatibleModelsResponse;
      const models: string[] = Array.isArray(data?.data)
        ? data.data.map((m) => m.id ?? '').filter(Boolean)
        : Array.isArray(data?.models)
          ? data.models.map((m) => m.id ?? '').filter(Boolean)
          : [];

      return {
        valid: true,
        provider: 'grok',
        message: '金鑰驗證成功',
        modelInfo: buildModelInfo('grok', models),
        availableModels: models,
      };
    }
    if (res.status === 401) {
      return { valid: false, provider: 'grok', message: '金鑰無效或已過期' };
    }
    return { valid: false, provider: 'grok', message: `HTTP ${res.status}` };
  } catch (e) {
    return { valid: false, provider: 'grok', message: `連線失敗: ${e instanceof Error ? e.message : 'Unknown'}` };
  }
}

async function validateTogether(apiKey: string): Promise<ValidationResult> {
  try {
    const res = await fetch('https://api.together.xyz/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      // Together AI returns the array directly OR nested under `.data`
      const raw: unknown[] = Array.isArray(data)
        ? (data as unknown[])
        : Array.isArray((data as { data?: unknown[] })?.data)
          ? (data as { data: unknown[] }).data
          : [];
      const models: string[] = raw
        .map((m) => (typeof (m as { id?: string }).id === 'string' ? (m as { id: string }).id : ''))
        .filter(Boolean);

      return {
        valid: true,
        provider: 'together',
        message: '金鑰驗證成功',
        modelInfo: buildModelInfo('together', models),
        availableModels: models,
      };
    }
    if (res.status === 401) {
      return { valid: false, provider: 'together', message: '金鑰無效或已過期' };
    }
    return { valid: false, provider: 'together', message: `HTTP ${res.status}` };
  } catch (e) {
    return { valid: false, provider: 'together', message: `連線失敗: ${e instanceof Error ? e.message : 'Unknown'}` };
  }
}

async function validateKimi(apiKey: string): Promise<ValidationResult> {
  try {
    const res = await fetch('https://api.moonshot.cn/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const models: string[] = Array.isArray((data as { data?: { id: string }[] })?.data)
        ? (data as { data: { id: string }[] }).data.map((m) => m.id).filter(Boolean)
        : [];
      return {
        valid: true,
        provider: 'kimi',
        message: '金鑰驗證成功',
        modelInfo: buildModelInfo('kimi', models) ?? '金鑰有效',
        availableModels: models,
      };
    }
    if (res.status === 401) {
      return { valid: false, provider: 'kimi', message: '金鑰無效或已過期' };
    }
    return { valid: false, provider: 'kimi', message: `HTTP ${res.status}` };
  } catch (e) {
    return { valid: false, provider: 'kimi', message: `連線失敗: ${e instanceof Error ? e.message : 'Unknown'}` };
  }
}

async function validateOpenRouter(apiKey: string): Promise<ValidationResult> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const raw = (data as { data?: { id: string }[] })?.data;
      const models: string[] = Array.isArray(raw)
        ? raw.map((m) => m.id).filter(Boolean)
        : [];
      return {
        valid: true,
        provider: 'openrouter',
        message: '金鑰驗證成功',
        modelInfo: buildModelInfo('openrouter', models),
        availableModels: models,
      };
    }
    if (res.status === 401) {
      return { valid: false, provider: 'openrouter', message: '金鑰無效或已過期' };
    }
    return { valid: false, provider: 'openrouter', message: `HTTP ${res.status}` };
  } catch (e) {
    return { valid: false, provider: 'openrouter', message: `連線失敗: ${e instanceof Error ? e.message : 'Unknown'}` };
  }
}

async function validateZhipu(apiKey: string): Promise<ValidationResult> {
  try {
    const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1,
      }),
    });
    if (res.ok) {
      return {
        valid: true,
        provider: 'zhipu',
        message: '金鑰驗證成功',
        modelInfo: '金鑰有效',
        availableModels: ['glm-4-plus', 'glm-4-flash', 'glm-4v-plus'],
      };
    }
    const err = await res.json().catch(() => ({}));
    const msg = (err as { error?: { message?: string } })?.error?.message;
    if (res.status === 401 || res.status === 403) {
      return { valid: false, provider: 'zhipu', message: msg ?? '金鑰無效或已過期' };
    }
    return { valid: false, provider: 'zhipu', message: msg ?? `HTTP ${res.status}` };
  } catch (e) {
    return { valid: false, provider: 'zhipu', message: `連線失敗: ${e instanceof Error ? e.message : 'Unknown'}` };
  }
}

async function validatePerplexity(apiKey: string): Promise<ValidationResult> {
  try {
    // Perplexity uses an OpenAI-compatible Chat Completions endpoint.
    // There is no public /models endpoint, so we send a 1-token probe.
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      }),
    });
    if (res.ok) {
      return {
        valid: true,
        provider: 'perplexity',
        message: '金鑰驗證成功',
        modelInfo: '金鑰有效',
        availableModels: ['sonar', 'sonar-pro', 'sonar-reasoning-pro', 'sonar-deep-research'],
      };
    }
    const err = await res.json().catch(() => ({}));
    const msg = (err as { error?: { message?: string } })?.error?.message;
    if (res.status === 401 || res.status === 403) {
      return { valid: false, provider: 'perplexity', message: msg ?? '金鑰無效或已過期' };
    }
    return { valid: false, provider: 'perplexity', message: msg ?? `HTTP ${res.status}` };
  } catch (e) {
    return { valid: false, provider: 'perplexity', message: `連線失敗: ${e instanceof Error ? e.message : 'Unknown'}` };
  }
}

async function validateQwen(apiKey: string): Promise<ValidationResult> {
  // Alibaba DashScope's OpenAI-compatible endpoint. International gateway works
  // outside mainland China; mainland callers can substitute dashscope.aliyuncs.com.
  try {
    const res = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) {
      type OpenAICompatibleModel = { id?: string };
      type OpenAICompatibleModelsResponse = { data?: OpenAICompatibleModel[]; models?: OpenAICompatibleModel[] };
      const data = (await res.json().catch(() => ({}))) as OpenAICompatibleModelsResponse;
      const models: string[] = Array.isArray(data?.data)
        ? data.data.map((m) => m.id ?? '').filter(Boolean)
        : Array.isArray(data?.models)
          ? data.models.map((m) => m.id ?? '').filter(Boolean)
          : [];

      return {
        valid: true,
        provider: 'qwen',
        message: '金鑰驗證成功',
        modelInfo: buildModelInfo('qwen', models),
        availableModels: models,
      };
    }

    // Fallback: some DashScope keys do not expose /models; verify with a 1-token probe.
    if (res.status === 404 || res.status === 403) {
      const probe = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'qwen-turbo',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
      });
      if (probe.ok) {
        return {
          valid: true,
          provider: 'qwen',
          message: '金鑰驗證成功 (無法取得模型列表)',
          modelInfo: '推薦: (列表未取得)',
          availableModels: [],
        };
      }
      if (probe.status === 401) {
        return { valid: false, provider: 'qwen', message: '金鑰無效或已過期' };
      }
      const err = await probe.json().catch(() => ({}));
      const msg = (err as { error?: { message?: string } })?.error?.message;
      return { valid: false, provider: 'qwen', message: msg ?? `HTTP ${probe.status}` };
    }

    if (res.status === 401) {
      return { valid: false, provider: 'qwen', message: '金鑰無效或已過期' };
    }
    return { valid: false, provider: 'qwen', message: `HTTP ${res.status}` };
  } catch (e) {
    return { valid: false, provider: 'qwen', message: `連線失敗: ${e instanceof Error ? e.message : 'Unknown'}` };
  }
}

async function validateKilo(apiKey: string): Promise<ValidationResult> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return { valid: false, provider: 'kilo', message: '金鑰為空，請重新貼上 KILO_API_KEY' };
  }
  // Kilo is currently consumed via local CLI adapter flow; no stable public
  // HTTP validation endpoint is used here.
  return {
    valid: true,
    provider: 'kilo',
    message: '金鑰格式已接收（Kilo 連線請於 Adapter Config 實測）',
    modelInfo: 'CLI adapter provider',
    availableModels: ['minimax-m2.6', 'dola-seed-2.0-pro', 'qwen-3.6-plus'],
  };
}

async function validateOpenCode(apiKey: string): Promise<ValidationResult> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return { valid: false, provider: 'opencode', message: '金鑰為空，請重新貼上 OPENCODE_API_KEY' };
  }
  return {
    valid: true,
    provider: 'opencode',
    message: '金鑰格式已接收（OpenCode 連線請於 Adapter Config 實測）',
    modelInfo: 'CLI adapter provider',
    availableModels: ['kimi-k2.5', 'glm5.1', 'minimax-m2.7', 'qwen3.6-plus'],
  };
}

const validators: Record<AIProvider, (key: string) => Promise<ValidationResult>> = {
  openai: validateOpenAI,
  anthropic: validateAnthropic,
  gemini: validateGemini,
  deepseek: validateDeepSeek,
  grok: validateGrok,
  together: validateTogether,
  kimi: validateKimi,
  openrouter: validateOpenRouter,
  zhipu: validateZhipu,
  perplexity: validatePerplexity,
  qwen: validateQwen,
  kilo: validateKilo,
  opencode: validateOpenCode,
};

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    // Server-side session auth (docs/ai-prompt-safety-guide.md §6.1). Header
    // fallback is still honored during the migration window but deprecated.
    const auth = await requireSuperadmin({
      request,
      adminClient: supabase,
      routeLabel: 'api/ai-settings/keys/validate',
    });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }
    const effectiveUserId = auth.userId;

    const { provider, apiKey, keyId } = await request.json();

    if (!provider) {
      return NextResponse.json({ error: 'Missing provider' }, { status: 400 });
    }

    let keyToValidate = apiKey;

    // If keyId is provided, fetch from DB and decrypt server-side.
    if (keyId && !apiKey) {
      const { data, error } = await supabase
        .from('ai_api_keys')
        .select('api_key_encrypted, iv')
        .eq('id', keyId)
        .eq('user_id', effectiveUserId)
        .single();

      if (error || !data) {
        return NextResponse.json({ valid: false, message: '找不到金鑰（可能已被刪除或不屬於目前使用者）' });
      }

      try {
        keyToValidate = await decryptApiKey(data.api_key_encrypted, data.iv);
      } catch (decryptError) {
        console.error('Decryption failed:', decryptError);
        return NextResponse.json({ valid: false, message: '金鑰解密失敗' });
      }
    }

    if (!keyToValidate) {
      return NextResponse.json({ error: 'Missing apiKey or keyId' }, { status: 400 });
    }

    const validate = validators[provider as AIProvider];
    if (!validate) {
      return NextResponse.json({ error: 'Unknown provider' }, { status: 400 });
    }

    const result = await validate(keyToValidate);

    // Persist validation outcome + cache available models (6h-72h reuse).
    if (keyId) {
      await supabase
        .from('ai_api_keys')
        .update({
          is_valid: result.valid,
          last_validated_at: new Date().toISOString(),
        })
        .eq('id', keyId)
        .eq('user_id', effectiveUserId);

      if (result.valid && Array.isArray(result.availableModels) && result.availableModels.length > 0) {
        await supabase
          .from('ai_key_validation_cache')
          .upsert(
            {
              user_id: effectiveUserId,
              key_id: keyId,
              provider: result.provider,
              available_models: result.availableModels,
              validated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,key_id' }
          );
      }
    }

    console.log(`[AI Settings] Key validation for ${provider}: ${result.valid ? 'PASS' : 'FAIL'}`);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[AI Settings] Validation error:', err);
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 });
  }
}
