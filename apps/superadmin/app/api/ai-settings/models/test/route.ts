// filepath: apps/superadmin/app/api/ai-settings/models/test/route.ts
// Test if a specific model can receive prompts and respond (連線測試). Supports optional file (image/PDF) for multimodal.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { decryptApiKey } from '@/lib/crypto';
import { resolveUserId } from '@/lib/resolve-ai-settings-user';
import type { AIProvider } from '@/lib/ai-providers';

const DEFAULT_TEST_PROMPT = '請用一句話回覆：你好，我是{你的模型名稱與型號}，可以正常接收並回應。';

type TestResult = { success: boolean; message: string; output?: string };

/** Optional file attachment (base64 + mime) for vision/PDF. */
export type FileAttachment = { fileBase64: string; mimeType: string; fileName?: string };

function getPromptAndMaxTokens(prompt?: string): { prompt: string; max_tokens: number } {
  const text = typeof prompt === 'string' && prompt.trim() ? prompt.trim() : DEFAULT_TEST_PROMPT;
  const max_tokens = text === DEFAULT_TEST_PROMPT ? 64 : 512;
  return { prompt: text, max_tokens };
}

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
function isImageMime(mime: string): boolean {
  return IMAGE_MIMES.has(mime.toLowerCase());
}

function extractOpenAIOutput(data: unknown): string {
  const choices = (data as { choices?: { message?: { content?: string } }[] })?.choices;
  const text = choices?.[0]?.message?.content;
  return typeof text === 'string' ? text.trim() : '';
}

async function testOpenAI(
  apiKey: string,
  modelId: string,
  userPrompt?: string,
  file?: FileAttachment
): Promise<TestResult> {
  const { prompt, max_tokens } = getPromptAndMaxTokens(userPrompt);
  let content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = prompt;
  if (file && isImageMime(file.mimeType)) {
    const dataUrl = `data:${file.mimeType};base64,${file.fileBase64}`;
    content = [
      { type: 'image_url' as const, image_url: { url: dataUrl } },
      { type: 'text' as const, text: prompt },
    ];
  }
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content }],
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

async function testAnthropic(
  apiKey: string,
  modelId: string,
  userPrompt?: string,
  file?: FileAttachment
): Promise<TestResult> {
  const { prompt, max_tokens } = getPromptAndMaxTokens(userPrompt);
  type ContentBlock =
    | { type: 'text'; text: string }
    | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
    | { type: 'document'; source: { type: 'base64'; media_type: string; data: string } };
  const contentBlocks: ContentBlock[] = [];
  if (file) {
    const isPdf = file.mimeType.toLowerCase() === 'application/pdf';
    if (isPdf) {
      contentBlocks.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: file.fileBase64 },
      });
    } else if (isImageMime(file.mimeType)) {
      contentBlocks.push({
        type: 'image',
        source: { type: 'base64', media_type: file.mimeType, data: file.fileBase64 },
      });
    }
  }
  contentBlocks.push({ type: 'text', text: prompt });
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
        messages: [{ role: 'user', content: contentBlocks }],
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

async function testGemini(
  apiKey: string,
  modelId: string,
  userPrompt?: string,
  file?: FileAttachment
): Promise<TestResult> {
  const { prompt, max_tokens } = getPromptAndMaxTokens(userPrompt);
  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
  if (file) {
    parts.push({ inlineData: { mimeType: file.mimeType, data: file.fileBase64 } });
  }
  parts.push({ text: prompt });
  try {
    const name = modelId.startsWith('models/') ? modelId : `models/${modelId}`;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${name}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
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

async function testDeepSeek(
  apiKey: string,
  modelId: string,
  userPrompt?: string,
  file?: FileAttachment
): Promise<TestResult> {
  const { prompt, max_tokens } = getPromptAndMaxTokens(userPrompt);
  let content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = prompt;
  if (file && isImageMime(file.mimeType)) {
    const dataUrl = `data:${file.mimeType};base64,${file.fileBase64}`;
    content = [
      { type: 'image_url' as const, image_url: { url: dataUrl } },
      { type: 'text' as const, text: prompt },
    ];
  }
  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content }],
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

async function testGrok(
  apiKey: string,
  modelId: string,
  userPrompt?: string,
  file?: FileAttachment
): Promise<TestResult> {
  const { prompt, max_tokens } = getPromptAndMaxTokens(userPrompt);
  let content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = prompt;
  if (file && isImageMime(file.mimeType)) {
    const dataUrl = `data:${file.mimeType};base64,${file.fileBase64}`;
    content = [
      { type: 'image_url' as const, image_url: { url: dataUrl } },
      { type: 'text' as const, text: prompt },
    ];
  }
  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content }],
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

type TesterFn = (key: string, modelId: string, userPrompt?: string, file?: FileAttachment) => Promise<TestResult>;
const testers: Record<AIProvider, TesterFn> = {
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
    const {
      provider,
      modelId,
      prompt: userPrompt,
      fileBase64,
      mimeType,
      fileName,
    } = body as {
      provider?: string;
      modelId?: string;
      prompt?: string;
      fileBase64?: string;
      mimeType?: string;
      fileName?: string;
    };
    if (!provider || !modelId) {
      return NextResponse.json({ success: false, message: '缺少 provider 或 modelId' }, { status: 400 });
    }
    const fileAttachment: FileAttachment | undefined =
      typeof fileBase64 === 'string' && fileBase64.length > 0 && typeof mimeType === 'string' && mimeType.length > 0
        ? { fileBase64, mimeType, fileName: typeof fileName === 'string' ? fileName : undefined }
        : undefined;
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
    const result = await test(apiKey, modelId, userPrompt, fileAttachment);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[AI Settings] Model test error:', err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : '測試失敗' },
      { status: 500 }
    );
  }
}
