// filepath: apps/superadmin/app/api/ai-settings/keys/validate/route.ts
// API route for validating AI API keys against provider endpoints

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import type { AIProvider } from '@/lib/ai-providers';
import { decryptApiKey } from '@/lib/crypto';

interface ValidationResult {
  valid: boolean;
  provider: string;
  message: string;
  modelInfo?: string; // e.g. "GPT-4 Turbo"
}

async function validateOpenAI(apiKey: string): Promise<ValidationResult> {
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) {
      const data = await res.json();
      // Try to find a flagship model to display
      const models = data.data?.map((m: { id: string }) => m.id) || [];
      const flagship = models.find((m: string) => m.includes('gpt-4')) || models.find((m: string) => m.includes('gpt-3.5')) || models[0] || 'Unknown Model';
      
      return { 
        valid: true, 
        provider: 'openai', 
        message: '金鑰驗證成功', 
        modelInfo: `OpenAI ${flagship}`
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
    const res = await fetch('https://api.anthropic.com/v1/messages', {
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
    
    if (res.ok || res.status === 400) { // 400 usually means valid key but invalid request body
      return { 
        valid: true, 
        provider: 'anthropic', 
        message: '金鑰驗證成功',
        modelInfo: 'Claude 3 Family'
      };
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
      const models = data.models?.map((m: { name: string, displayName: string }) => m.displayName || m.name) || [];
      const flagship = models.find((m: string) => m.includes('Gemini 1.5')) || models[0] || 'Unknown Model';
      
      return { 
        valid: true, 
        provider: 'gemini', 
        message: '金鑰驗證成功',
        modelInfo: `Google ${flagship}`
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
      return { 
        valid: true, 
        provider: 'deepseek', 
        message: '金鑰驗證成功',
        modelInfo: 'DeepSeek-V3/R1' 
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
       return { 
        valid: true, 
        provider: 'grok', 
        message: '金鑰驗證成功',
        modelInfo: 'Grok-1/Beta'
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

const validators: Record<AIProvider, (key: string) => Promise<ValidationResult>> = {
  openai: validateOpenAI,
  anthropic: validateAnthropic,
  gemini: validateGemini,
  deepseek: validateDeepSeek,
  grok: validateGrok,
};

export async function POST(request: NextRequest) {
  try {
    const { provider, apiKey, keyId, userId } = await request.json();

    if (!provider) {
      return NextResponse.json({ error: 'Missing provider' }, { status: 400 });
    }

    let keyToValidate = apiKey;

    // If keyId is provided, fetch from DB and decrypt
    if (keyId && userId && !apiKey) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('ai_api_keys')
        .select('api_key_encrypted, iv')
        .eq('id', keyId)
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return NextResponse.json({ valid: false, message: '資料庫連線失敗或找不到金鑰' });
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

    // Update validation status in database if keyId provided
    if (keyId && userId) {
      const supabase = createAdminClient();
      await supabase
        .from('ai_api_keys')
        .update({
          is_valid: result.valid,
          last_validated_at: new Date().toISOString(),
        })
        .eq('id', keyId)
        .eq('user_id', userId);
    }

    console.log(`[AI Settings] Key validation for ${provider}: ${result.valid ? 'PASS' : 'FAIL'}`);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[AI Settings] Validation error:', err);
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 });
  }
}
