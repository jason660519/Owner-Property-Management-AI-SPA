// filepath: apps/superadmin/app/api/ai-settings/models/test/route.ts
// Test if a specific model can receive prompts and respond (連線測試). Supports optional file (image/PDF) for multimodal.
// Hardened per docs/ai-prompt-safety-guide.md (CRITICAL #1):
//   - Hard length cap on user-supplied prompt (defense-in-depth, super_admin still trusted).
//   - Soft injection-pattern detection logged for audit.
//   - Smoke-test default used whenever no prompt is provided.
// TODO: Replace x-user-id header trust with a real Supabase server session check
//       once the broader superadmin auth refactor lands. See guide §6.1.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { decryptApiKey } from '@/lib/crypto';
import type { AIProvider } from '@/lib/ai-providers';
import {
  PROMPT_INPUT_LIMITS,
  validateUserSuppliedPrompt,
} from '@/lib/ai/prompt-safety';
import { startPromptAudit } from '@/lib/ai/audit';
import { checkRateLimit } from '@/lib/ai/rate-limit';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';

const DEFAULT_TEST_PROMPT = '請用一句話回覆：你好，我是{你的模型名稱與型號}，可以正常接收並回應。';

/** Hard cap for user-supplied test prompts. Generous to allow legit evaluation
 *  scenarios but bounded so the endpoint cannot be abused as a free LLM proxy. */
const TEST_PROMPT_MAX_LEN = PROMPT_INPUT_LIMITS.userPromptMax * 5; // 10,000 chars

type TestResult = { success: boolean; message: string; output?: string; output_image_url?: string };

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

/** AbortSignal with 55-second timeout for all external AI provider calls. */
function providerSignal(): AbortSignal {
  return AbortSignal.timeout(55_000);
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
      signal: providerSignal(),
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
      signal: providerSignal(),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { success: true, message: '連線成功', output: extractAnthropicOutput(data) || '（無輸出）' };
    return { success: false, message: (data as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { success: false, message: `連線失敗: ${e instanceof Error ? e.message : 'Unknown'}` };
  }
}

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

function extractGeminiResult(data: unknown): { output: string; imageDataUrl?: string } {
  const parts = (data as { candidates?: { content?: { parts?: GeminiPart[] } }[] })
    ?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return { output: '' };

  let output = '';
  let imageDataUrl: string | undefined;

  for (const part of parts) {
    if ('text' in part && typeof part.text === 'string') {
      output += part.text;
    } else if ('inlineData' in part && typeof part.inlineData === 'object' && part.inlineData) {
      const { mimeType, data } = part.inlineData;
      if (typeof mimeType === 'string' && typeof data === 'string' && !imageDataUrl) {
        imageDataUrl = `data:${mimeType};base64,${data}`;
      }
    }
  }

  return { output: output.trim(), imageDataUrl };
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
  // Request image output modality when a file is attached (image editing/generation context)
  const responseModalities = file && isImageMime(file.mimeType) ? ['TEXT', 'IMAGE'] : undefined;
  try {
    const name = modelId.startsWith('models/') ? modelId : `models/${modelId}`;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${name}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            maxOutputTokens: max_tokens,
            ...(responseModalities ? { responseModalities } : {}),
          },
        }),
        signal: providerSignal(),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const { output, imageDataUrl } = extractGeminiResult(data);
      return {
        success: true,
        message: '連線成功',
        output: output || '（無輸出）',
        ...(imageDataUrl ? { output_image_url: imageDataUrl } : {}),
      };
    }
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
      signal: providerSignal(),
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
      signal: providerSignal(),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { success: true, message: '連線成功', output: extractOpenAIOutput(data) || '（無輸出）' };
    return { success: false, message: (data as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { success: false, message: `連線失敗: ${e instanceof Error ? e.message : 'Unknown'}` };
  }
}

async function testTogether(
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
    const res = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content }],
        max_tokens,
      }),
      signal: providerSignal(),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { success: true, message: '連線成功', output: extractOpenAIOutput(data) || '（無輸出）' };
    return { success: false, message: (data as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { success: false, message: `連線失敗: ${e instanceof Error ? e.message : 'Unknown'}` };
  }
}

async function testKimi(
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
    const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content }],
        max_tokens,
      }),
      signal: providerSignal(),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { success: true, message: '連線成功', output: extractOpenAIOutput(data) || '（無輸出）' };
    return { success: false, message: (data as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { success: false, message: `連線失敗: ${e instanceof Error ? e.message : 'Unknown'}` };
  }
}

async function testOpenRouter(
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
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content }],
        max_tokens,
      }),
      signal: providerSignal(),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { success: true, message: '連線成功', output: extractOpenAIOutput(data) || '（無輸出）' };
    return { success: false, message: (data as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { success: false, message: `連線失敗: ${e instanceof Error ? e.message : 'Unknown'}` };
  }
}

async function testZhipu(
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
    const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content }],
        max_tokens,
      }),
      signal: providerSignal(),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { success: true, message: '連線成功', output: extractOpenAIOutput(data) || '（無輸出）' };
    return { success: false, message: (data as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { success: false, message: `連線失敗: ${e instanceof Error ? e.message : 'Unknown'}` };
  }
}

async function testPerplexity(
  apiKey: string,
  modelId: string,
  userPrompt?: string
): Promise<TestResult> {
  // Perplexity is OpenAI-compatible chat completions; web search is built in.
  const { prompt, max_tokens } = getPromptAndMaxTokens(userPrompt);
  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens,
      }),
      signal: providerSignal(),
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
  together: testTogether,
  kimi: testKimi,
  openrouter: testOpenRouter,
  zhipu: testZhipu,
  perplexity: testPerplexity,
};

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    // Strong auth: server-side session first, legacy x-user-id header as fallback.
    // See docs/ai-prompt-safety-guide.md §6.1.
    const auth = await requireSuperadmin({
      request,
      adminClient: supabase,
      routeLabel: 'api/ai-settings/models/test',
    });
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status },
      );
    }
    const userId = auth.userId;

    // Rate limit: default 10 calls/min per (user, endpoint). See §6.2.
    const rl = await checkRateLimit({
      userId,
      endpointKey: 'api/ai-settings/models/test',
      client: supabase,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, message: rl.message },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
      );
    }
    const body = await request.json();
    const {
      provider,
      modelId,
      prompt: rawUserPrompt,
      fileBase64,
      mimeType,
      fileName,
    } = body as {
      provider?: string;
      modelId?: string;
      prompt?: unknown;
      fileBase64?: string;
      mimeType?: string;
      fileName?: string;
    };
    if (!provider || !modelId) {
      return NextResponse.json({ success: false, message: '缺少 provider 或 modelId' }, { status: 400 });
    }

    // Validate user-supplied prompt (length cap + injection-pattern logging).
    const promptValidation = validateUserSuppliedPrompt(rawUserPrompt, {
      maxLength: TEST_PROMPT_MAX_LEN,
      context: 'ai-settings/models/test',
    });
    if (!promptValidation.ok) {
      return NextResponse.json(
        { success: false, message: promptValidation.message },
        { status: 400 },
      );
    }
    const userPrompt = promptValidation.prompt;
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
    // Audit: record this smoke-test call with the user-prompt fingerprint and
    // any injection-pattern hits detected during validation.
    const audit = startPromptAudit({
      moduleKey: 'model.smoke_test',
      provider,
      modelId,
      userId,
      userInput: userPrompt ?? DEFAULT_TEST_PROMPT,
      injectionHits: promptValidation.injectionHits,
      promptSource: userPrompt ? 'user_supplied' : 'smoke_test_default',
      client: supabase,
    });

    const callStart = Date.now();
    let result: TestResult;
    try {
      result = await test(apiKey, modelId, userPrompt, fileAttachment);
    } catch (callErr) {
      await audit.complete('api_error', {
        errorMessage: callErr instanceof Error ? callErr.message : 'Unknown',
        latencyMs: Date.now() - callStart,
      });
      throw callErr;
    }
    await audit.complete(result.success ? 'success' : 'api_error', {
      errorMessage: result.success ? null : result.message,
      latencyMs: Date.now() - callStart,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[AI Settings] Model test error:', err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : '測試失敗' },
      { status: 500 }
    );
  }
}
