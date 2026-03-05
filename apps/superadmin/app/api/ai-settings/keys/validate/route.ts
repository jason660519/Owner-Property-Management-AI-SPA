// filepath: apps/superadmin/app/api/ai-settings/keys/validate/route.ts
// API route for validating AI API keys against provider endpoints

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import type { AIProvider } from '@/lib/ai-providers';
import { decryptApiKey } from '@/lib/crypto';
import { resolveUserId } from '@/lib/resolve-ai-settings-user';

interface ValidationResult {
  valid: boolean;
  provider: string;
  message: string;
  modelInfo?: string; // e.g. "最新可用: gpt-4o"
  availableModels?: string[]; // full list of available models for provider/key
}

/** Pick the "latest available" model from the list by trying predicates in order (newest-first). */
function pickLatestModel(
  models: string[],
  priorityPredicates: ((id: string) => boolean)[]
): string {
  for (const pred of priorityPredicates) {
    const found = models.find(pred);
    if (found) return found;
  }
  return models[0] ?? 'Unknown';
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

      // Newest-first: pick the latest available model this key can use (e.g. 5.2 vs market 5.3)
      const latest = pickLatestModel(models, [
        m => m.includes('gpt-5'),
        m => m.includes('gpt-4o'),
        m => m.includes('gpt-4-turbo'),
        m => m.includes('gpt-4'),
        m => m.includes('gpt-3.5'),
      ]);

      return {
        valid: true,
        provider: 'openai',
        message: '金鑰驗證成功',
        modelInfo: `最新可用: ${latest}`,
        availableModels: models,
      };
    }
    const err = await res.json().catch(() => ({}));
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

      const latest = pickLatestModel(models, [
        m => m.includes('claude-3-5'),
        m => m.includes('claude-3-opus'),
        m => m.includes('claude-3-sonnet'),
        m => m.includes('claude-3-haiku'),
        m => m.includes('claude-3'),
      ]);

      return {
        valid: true,
        provider: 'anthropic',
        message: '金鑰驗證成功',
        modelInfo: `最新可用: ${latest}`,
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
          modelInfo: '最新可用: (列表未取得)',
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
      const latest = pickLatestModel(models, [
        m => m.includes('gemini-2') || m.includes('Gemini 2'),
        m => m.includes('gemini-1.5') || m.includes('Gemini 1.5'),
        m => m.includes('gemini-1') || m.includes('Gemini 1'),
      ]);

      return {
        valid: true,
        provider: 'gemini',
        message: '金鑰驗證成功',
        modelInfo: `最新可用: ${latest}`,
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
      const data = await res.json().catch(() => ({}));
      // DeepSeek's API is OpenAI compatible; try typical shapes
      const models: string[] = Array.isArray((data as any)?.data)
        ? (data as any).data.map((m: { id: string }) => m.id).filter(Boolean)
        : Array.isArray((data as any)?.models)
          ? (data as any).models.map((m: { id: string }) => m.id).filter(Boolean)
          : [];

      const latest = pickLatestModel(models, [
        m => m.toLowerCase().includes('deepseek-reasoner'),
        m => m.toLowerCase().includes('deepseek-chat'),
        m => m.toLowerCase().includes('deepseek'),
      ]);

      return {
        valid: true,
        provider: 'deepseek',
        message: '金鑰驗證成功',
        modelInfo: `最新可用: ${latest}`,
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
      const data = await res.json().catch(() => ({}));
      const models: string[] = Array.isArray((data as any)?.data)
        ? (data as any).data.map((m: { id: string }) => m.id).filter(Boolean)
        : Array.isArray((data as any)?.models)
          ? (data as any).models.map((m: { id: string }) => m.id).filter(Boolean)
          : [];

      const latest = pickLatestModel(models, [
        m => m.toLowerCase().includes('grok-2'),
        m => m.toLowerCase().includes('grok-1'),
      ]);

      return {
        valid: true,
        provider: 'grok',
        message: '金鑰驗證成功',
        modelInfo: `最新可用: ${latest}`,
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

      const latest = pickLatestModel(models, [
        m => m.toLowerCase().includes('llama-3.3'),
        m => m.toLowerCase().includes('llama-3.2'),
        m => m.toLowerCase().includes('llama-3.1'),
        m => m.toLowerCase().includes('qwen2.5'),
        m => m.toLowerCase().includes('deepseek'),
      ]);

      return {
        valid: true,
        provider: 'together',
        message: '金鑰驗證成功',
        modelInfo: `最新可用: ${latest}`,
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

const validators: Record<AIProvider, (key: string) => Promise<ValidationResult>> = {
  openai: validateOpenAI,
  anthropic: validateAnthropic,
  gemini: validateGemini,
  deepseek: validateDeepSeek,
  grok: validateGrok,
  together: validateTogether,
};

export async function POST(request: NextRequest) {
  try {
    const { provider, apiKey, keyId, userId } = await request.json();

    if (!provider) {
      return NextResponse.json({ error: 'Missing provider' }, { status: 400 });
    }

    let keyToValidate = apiKey;

    // If keyId is provided, fetch from DB and decrypt (use resolveUserId so 未登入時與 keys API 一致)
    if (keyId && userId && !apiKey) {
      const supabase = createAdminClient();
      const effectiveUserId = await resolveUserId(supabase, userId);
      if (!effectiveUserId) {
        return NextResponse.json({ valid: false, message: '找不到可用的使用者，請先登入或確認 Auth 中已有使用者' });
      }
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

    // Update validation status in database if keyId provided (use same resolved userId)
    if (keyId && userId) {
      const supabase = createAdminClient();
      const effectiveUserId = await resolveUserId(supabase, userId);
      if (effectiveUserId) {
        await supabase
          .from('ai_api_keys')
          .update({
            is_valid: result.valid,
            last_validated_at: new Date().toISOString(),
          })
          .eq('id', keyId)
          .eq('user_id', effectiveUserId);

        // Cache available models for 6h so model list shows without re-validating (refresh / other page)
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
    }

    console.log(`[AI Settings] Key validation for ${provider}: ${result.valid ? 'PASS' : 'FAIL'}`);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[AI Settings] Validation error:', err);
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 });
  }
}
