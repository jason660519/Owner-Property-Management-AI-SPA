// filepath: apps/superadmin/app/api/ai-settings/models/test/route.ts
// Test if a specific model can receive prompts and respond (連線測試)

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { decryptApiKey } from '@/lib/crypto';
import { resolveUserId } from '@/lib/resolve-ai-settings-user';
import type { AIProvider } from '@/lib/ai-providers';

const DEFAULT_TEST_PROMPT = '請用一句話回覆：你好，我是{你的模型名稱與型號}，可以正常接收並回應。';

type TestResult = { success: boolean; message: string; output?: string };

function getPromptAndMaxTokens(prompt?: string): { prompt: string; max_tokens: number } {
  const text = typeof prompt === 'string' && prompt.trim() ? prompt.trim() : DEFAULT_TEST_PROMPT;
  const max_tokens = text === DEFAULT_TEST_PROMPT ? 64 : 512;
  return { prompt: text, max_tokens };
}

function extractOpenAIOutput(data: unknown): string {
  const choices = (data as { choices?: { message?: { content?: string } }[] })?.choices;
  const text = choices?.[0]?.message?.content;
  return typeof text === 'string' ? text.trim() : '';
}

async function testOpenAI(apiKey: string, modelId: string, userPrompt?: string): Promise<TestResult> {
  const { prompt, max_tokens } = getPromptAndMaxTokens(userPrompt);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { success: true, message: '連線成功', output: extractOpenAIOutput(data) || '（無輸出）' };
    return { success: false, message: (data as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { success: false, message: `連線失敗: ${e instanceof Error ? e.message : 'Unknown'}` };
  }
}

function extractAnthropicOutput(data: unknown): string {
  const content = (data as { content?: { text?: string }[] })?.content;
  const text = content?.[0]?.text;
  return typeof text === 'string' ? text.trim() : '';
}

async function testAnthropic(apiKey: string, modelId: string, userPrompt?: string): Promise<TestResult> {
  const { prompt, max_tokens } = getPromptAndMaxTokens(userPrompt);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { success: true, message: '連線成功', output: extractAnthropicOutput(data) || '（無輸出）' };
    return { success: false, message: (data as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { success: false, message: `連線失敗: ${e instanceof Error ? e.message : 'Unknown'}` };
  }
}

function extractGeminiOutput(data: unknown): string {
  const parts = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })?.candidates?.[0]?.content?.parts;
  const text = parts?.[0]?.text;
  return typeof text === 'string' ? text.trim() : '';
}

async function testGemini(apiKey: string, modelId: string, userPrompt?: string): Promise<TestResult> {
  const { prompt, max_tokens } = getPromptAndMaxTokens(userPrompt);
  try {
    const name = modelId.startsWith('models/') ? modelId : `models/${modelId}`;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${name}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: max_tokens },
        }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { success: true, message: '連線成功', output: extractGeminiOutput(data) || '（無輸出）' };
    return { success: false, message: (data as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { success: false, message: `連線失敗: ${e instanceof Error ? e.message : 'Unknown'}` };
  }
}

async function testDeepSeek(apiKey: string, modelId: string, userPrompt?: string): Promise<TestResult> {
  const { prompt, max_tokens } = getPromptAndMaxTokens(userPrompt);
  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { success: true, message: '連線成功', output: extractOpenAIOutput(data) || '（無輸出）' };
    return { success: false, message: (data as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { success: false, message: `連線失敗: ${e instanceof Error ? e.message : 'Unknown'}` };
  }
}

async function testGrok(apiKey: string, modelId: string, userPrompt?: string): Promise<TestResult> {
  const { prompt, max_tokens } = getPromptAndMaxTokens(userPrompt);
  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { success: true, message: '連線成功', output: extractOpenAIOutput(data) || '（無輸出）' };
    return { success: false, message: (data as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { success: false, message: `連線失敗: ${e instanceof Error ? e.message : 'Unknown'}` };
  }
}

const testers: Record<AIProvider, (key: string, modelId: string, userPrompt?: string) => Promise<TestResult>> = {
  openai: testOpenAI,
  anthropic: testAnthropic,
  gemini: testGemini,
  deepseek: testDeepSeek,
  grok: testGrok,
};

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const requestedUserId = request.headers.get('x-user-id');
    if (!requestedUserId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const userId = await resolveUserId(supabase, requestedUserId);
    if (!userId) {
      return NextResponse.json({ success: false, message: '找不到可用的使用者' }, { status: 401 });
    }
    const body = await request.json();
    const { provider, modelId, prompt: userPrompt } = body as { provider?: string; modelId?: string; prompt?: string };
    if (!provider || !modelId) {
      return NextResponse.json({ success: false, message: '缺少 provider 或 modelId' }, { status: 400 });
    }
    const test = testers[provider as AIProvider];
    if (!test) {
      return NextResponse.json({ success: false, message: '不支援的 provider' }, { status: 400 });
    }
    const { data: keyRow, error } = await supabase
      .from('ai_api_keys')
      .select('api_key_encrypted, iv')
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('is_active', true)
      .single();
    if (error || !keyRow) {
      return NextResponse.json({ success: false, message: '找不到該 provider 的 API 金鑰' }, { status: 404 });
    }
    let apiKey: string;
    try {
      apiKey = await decryptApiKey(keyRow.api_key_encrypted, keyRow.iv);
    } catch {
      return NextResponse.json({ success: false, message: '金鑰解密失敗' }, { status: 500 });
    }
    const result = await test(apiKey, modelId, userPrompt);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[AI Settings] Model test error:', err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : '測試失敗' },
      { status: 500 }
    );
  }
}
