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
import {
  KILO_GATEWAY_BASE,
  OPENCODE_ZEN_CHAT_COMPLETIONS_URL,
  openCodeZenChatModelId,
} from '@/lib/ai-key-validation/kilo-opencode-zen';

const DEFAULT_TEST_PROMPT = '請用一句話回覆：你好，我是{你的模型名稱與型號}，可以正常接收並回應。';
const OLLAMA_CLOUD_BASE_URL = process.env.OLLAMA_CLOUD_BASE_URL?.replace(/\/$/, '') || 'https://ollama.com';
const OLLAMA_LOCAL_BASE_URL = process.env.OLLAMA_LOCAL_BASE_URL?.replace(/\/$/, '') || 'http://localhost:11434';

/** Hard cap for user-supplied test prompts. Generous to allow legit evaluation
 *  scenarios but bounded so the endpoint cannot be abused as a free LLM proxy. */
const TEST_PROMPT_MAX_LEN = PROMPT_INPUT_LIMITS.userPromptMax * 5; // 10,000 chars

type TestResult = {
  success: boolean;
  message: string;
  output?: string;
  output_image_url?: string;
  http_status?: number;
};

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

/** AbortSignal with 55-second timeout for standard AI provider calls. */
function providerSignal(): AbortSignal {
  return AbortSignal.timeout(55_000);
}

/** AbortSignal with 120-second timeout for image generation calls (editing/generation is slower). */
function imageProviderSignal(): AbortSignal {
  return AbortSignal.timeout(120_000);
}

function isOpenAIImageModel(modelId: string): boolean {
  const lower = modelId.toLowerCase();
  return lower.startsWith('gpt-image') || lower === 'chatgpt-image-latest';
}

function isQwenImageModel(modelId: string): boolean {
  return modelId.toLowerCase().startsWith('qwen-image');
}

function openAIRequestHeaders(apiKey: string, contentType?: string): Record<string, string> {
  const organizationId =
    process.env.MY_OPENAI_ORGANIZATION_ID?.trim()
    || process.env.OPENAI_ORGANIZATION_ID?.trim()
    || process.env.OPENAI_ORG_ID?.trim();
  const projectId =
    process.env.MY_OPENAI_PROJECT_ID?.trim()
    || process.env.OPENAI_PROJECT_ID?.trim();
  return {
    ...(contentType ? { 'Content-Type': contentType } : {}),
    Authorization: `Bearer ${apiKey}`,
    ...(organizationId ? { 'OpenAI-Organization': organizationId } : {}),
    ...(projectId ? { 'OpenAI-Project': projectId } : {}),
  };
}

function hasOpenAIOrganizationHeader(): boolean {
  return Boolean(
    process.env.MY_OPENAI_ORGANIZATION_ID?.trim()
    || process.env.OPENAI_ORGANIZATION_ID?.trim()
    || process.env.OPENAI_ORG_ID?.trim(),
  );
}

function attachmentBlob(file: FileAttachment): Blob {
  return new Blob([Buffer.from(file.fileBase64, 'base64')], { type: file.mimeType });
}

function imageAttachments(files: FileAttachment[]): FileAttachment[] {
  return files.filter((file) => isImageMime(file.mimeType));
}

function imageDataUrl(file: FileAttachment): string {
  return `data:${file.mimeType};base64,${file.fileBase64}`;
}

type OpenAIImageError = {
  message?: string;
  type?: string;
  code?: string;
};

type OpenAIImageResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
    revised_prompt?: string;
  }>;
  error?: OpenAIImageError;
};

function extractOpenAIImageUrl(data: unknown): string {
  const image = (data as { data?: Array<{ b64_json?: string; url?: string }> })?.data?.[0];
  if (typeof image?.b64_json === 'string' && image.b64_json.length > 0) {
    return `data:image/png;base64,${image.b64_json}`;
  }
  return typeof image?.url === 'string' ? image.url : '';
}

function normalizeOpenAIImageError(
  status: number,
  data: OpenAIImageResponse,
  modelId: string,
  organizationConfigured: boolean,
): string {
  const message = data.error?.message ?? `HTTP ${status}`;
  const lower = message.toLowerCase();
  if (lower.includes('organization must be verified')) {
    if (!organizationConfigured) {
      return `OpenAI ${modelId} 需要 organization 完成驗證後才能使用；目前 server process 沒讀到 MY_OPENAI_ORGANIZATION_ID / OPENAI_ORGANIZATION_ID，請確認 .env 變數名稱並重啟 superadmin dev server。原始錯誤：${message}`;
    }
    return `OpenAI ${modelId} 需要 organization 完成驗證後才能使用。請到 OpenAI Platform 的 Verify organization 完成驗證後再測試。原始錯誤：${message}`;
  }
  if (status === 429 || lower.includes('rate limit') || lower.includes('too many requests')) {
    return `OpenAI ${modelId} 觸發速率限制，請稍後重試或減少同時全測列數。原始錯誤：${message}`;
  }
  return message;
}

function extractQwenImageUrl(data: unknown): string {
  const content = (data as {
    output?: { choices?: Array<{ message?: { content?: Array<{ image?: string }> } }> };
  })?.output?.choices?.[0]?.message?.content;
  const image = content?.find((item) => typeof item.image === 'string')?.image;
  return typeof image === 'string' ? image : '';
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
  file?: FileAttachment,
  files: FileAttachment[] = file ? [file] : [],
): Promise<TestResult> {
  const { prompt, max_tokens } = getPromptAndMaxTokens(userPrompt);
  const images = imageAttachments(files.length > 0 ? files : file ? [file] : []);
  if (images.length > 0 && isOpenAIImageModel(modelId)) {
    try {
      const form = new FormData();
      form.append('model', modelId);
      form.append('prompt', prompt);
      images.forEach((image, index) => {
        form.append(images.length === 1 ? 'image' : 'image[]', attachmentBlob(image), image.fileName ?? `reference-${index + 1}.png`);
      });
      form.append('size', '1536x1024');
      form.append('quality', 'low');
      form.append('output_format', 'png');
      const res = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: openAIRequestHeaders(apiKey),
        body: form,
        signal: imageProviderSignal(),
      });
      const data = (await res.json().catch(() => ({}))) as OpenAIImageResponse;
      if (res.ok) {
        const imageUrl = extractOpenAIImageUrl(data);
        return {
          success: imageUrl.length > 0,
          message: imageUrl ? '圖生圖成功' : '模型回應成功但未回傳圖片',
          output: data.data?.[0]?.revised_prompt ?? 'OpenAI image edit completed',
          http_status: res.status,
          ...(imageUrl ? { output_image_url: imageUrl } : {}),
        };
      }
      return {
        success: false,
        message: normalizeOpenAIImageError(res.status, data, modelId, hasOpenAIOrganizationHeader()),
        output: data.error?.message ?? '',
        http_status: res.status,
      };
    } catch (e) {
      return { success: false, message: `連線失敗: ${e instanceof Error ? e.message : 'Unknown'}` };
    }
  }
  let content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = prompt;
  if (file && isImageMime(file.mimeType)) {
    const dataUrl = imageDataUrl(file);
    content = [
      { type: 'image_url' as const, image_url: { url: dataUrl } },
      { type: 'text' as const, text: prompt },
    ];
  }
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: openAIRequestHeaders(apiKey, 'application/json'),
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

// Gemini REST API may return image parts as either `inlineData` (camelCase) or
// `inline_data` (snake_case) depending on model/version. Same for `mimeType`/`mime_type`.
type GeminiInlineData = {
  mimeType?: string;
  mime_type?: string;
  data?: string;
};
type GeminiPart = {
  text?: string;
  inlineData?: GeminiInlineData;
  inline_data?: GeminiInlineData;
};

function extractGeminiResult(data: unknown): { output: string; imageDataUrl?: string } {
  const parts = (data as { candidates?: { content?: { parts?: GeminiPart[] } }[] })
    ?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return { output: '' };

  let output = '';
  let imageDataUrl: string | undefined;

  for (const part of parts) {
    if (typeof part.text === 'string') {
      output += part.text;
      continue;
    }
    const inline = part.inlineData ?? part.inline_data;
    if (inline && typeof inline === 'object') {
      const mime = inline.mimeType ?? inline.mime_type;
      const blob = inline.data;
      if (typeof mime === 'string' && typeof blob === 'string' && !imageDataUrl) {
        imageDataUrl = `data:${mime};base64,${blob}`;
      }
    }
  }

  return { output: output.trim(), imageDataUrl };
}

async function testGemini(
  apiKey: string,
  modelId: string,
  userPrompt?: string,
  file?: FileAttachment,
  files: FileAttachment[] = file ? [file] : [],
): Promise<TestResult> {
  const { prompt, max_tokens } = getPromptAndMaxTokens(userPrompt);
  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
  const attachments = files.length > 0 ? files : file ? [file] : [];
  for (const attachment of attachments) {
    parts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.fileBase64 } });
  }
  parts.push({ text: prompt });

  const isImageRequest = attachments.some((attachment) => isImageMime(attachment.mimeType));
  // IMAGE modality: do not set maxOutputTokens (applies to text tokens only and may suppress image output)
  const generationConfig: Record<string, unknown> = isImageRequest
    ? { responseModalities: ['TEXT', 'IMAGE'] }
    : { maxOutputTokens: max_tokens };

  try {
    const name = modelId.startsWith('models/') ? modelId : `models/${modelId}`;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${name}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig,
        }),
        signal: isImageRequest ? imageProviderSignal() : providerSignal(),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const { output, imageDataUrl } = extractGeminiResult(data);
      if (isImageRequest && !imageDataUrl) {
        return { success: false, message: '未產圖：Gemini 回傳文字但無圖片，請確認模型支援圖片輸出。' };
      }
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

async function testQwen(
  apiKey: string,
  modelId: string,
  userPrompt?: string,
  file?: FileAttachment,
  files: FileAttachment[] = file ? [file] : [],
): Promise<TestResult> {
  // Qwen (Alibaba DashScope) — OpenAI-compatible endpoint. VL models accept
  // inline image_url like any other OpenAI-style chat completions API.
  const { prompt, max_tokens } = getPromptAndMaxTokens(userPrompt);
  const images = imageAttachments(files.length > 0 ? files : file ? [file] : []);
  if (images.length > 0 && isQwenImageModel(modelId)) {
    try {
      const res = await fetch('https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: modelId,
          input: {
            messages: [{
              role: 'user',
              content: [
                ...images.map((image) => ({ image: imageDataUrl(image) })),
                { text: prompt },
              ],
            }],
          },
          parameters: {
            size: '1536*1024',
            watermark: false,
            prompt_extend: true,
          },
        }),
        signal: providerSignal(),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const imageUrl = extractQwenImageUrl(data);
        return {
          success: imageUrl.length > 0,
          message: imageUrl ? '圖生圖成功' : '模型回應成功但未回傳圖片',
          output: imageUrl ? 'Qwen image edit completed' : JSON.stringify(data),
          ...(imageUrl ? { output_image_url: imageUrl } : {}),
        };
      }
      return { success: false, message: (data as { message?: string })?.message ?? `HTTP ${res.status}` };
    } catch (e) {
      return { success: false, message: `連線失敗: ${e instanceof Error ? e.message : 'Unknown'}` };
    }
  }
  let content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = prompt;
  if (file && isImageMime(file.mimeType)) {
    const dataUrl = imageDataUrl(file);
    content = [
      { type: 'image_url' as const, image_url: { url: dataUrl } },
      { type: 'text' as const, text: prompt },
    ];
  }
  try {
    const res = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
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

function extractOllamaOutput(data: unknown): string {
  const messageText = (data as { message?: { content?: string } })?.message?.content;
  if (typeof messageText === 'string' && messageText.trim()) return messageText.trim();
  const responseText = (data as { response?: string })?.response;
  if (typeof responseText === 'string') return responseText.trim();
  return '';
}

async function testOllamaCloud(
  apiKey: string,
  modelId: string,
  userPrompt?: string,
  file?: FileAttachment
): Promise<TestResult> {
  // Ollama cloud mode.
  const { prompt } = getPromptAndMaxTokens(userPrompt);
  const message: { role: 'user'; content: string; images?: string[] } = {
    role: 'user',
    content: prompt,
  };

  if (file && isImageMime(file.mimeType)) {
    message.images = [file.fileBase64];
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey?.trim()) {
      headers.Authorization = `Bearer ${apiKey.trim()}`;
    }
    const res = await fetch(`${OLLAMA_CLOUD_BASE_URL}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelId,
        stream: false,
        messages: [message],
      }),
      signal: providerSignal(),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return {
        success: true,
        message: '連線成功',
        output: extractOllamaOutput(data) || '（無輸出）',
      };
    }
    const errorText = (data as { error?: string })?.error;
    return { success: false, message: typeof errorText === 'string' ? errorText : `HTTP ${res.status}` };
  } catch (e) {
    return { success: false, message: `連線失敗: ${e instanceof Error ? e.message : 'Unknown'}` };
  }
}

async function testOllamaLocal(
  apiKey: string,
  modelId: string,
  userPrompt?: string,
  file?: FileAttachment
): Promise<TestResult> {
  // Ollama local mode.
  const token = apiKey.trim();
  if (!token) {
    return { success: false, message: 'Ollama Local 需要 API token' };
  }

  const { prompt } = getPromptAndMaxTokens(userPrompt);
  const message: { role: 'user'; content: string; images?: string[] } = {
    role: 'user',
    content: prompt,
  };

  if (file && isImageMime(file.mimeType)) {
    message.images = [file.fileBase64];
  }

  try {
    const res = await fetch(`${OLLAMA_LOCAL_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: modelId,
        stream: false,
        messages: [message],
      }),
      signal: providerSignal(),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return {
        success: true,
        message: '連線成功',
        output: extractOllamaOutput(data) || '（無輸出）',
      };
    }
    const errorText = (data as { error?: string })?.error;
    return { success: false, message: typeof errorText === 'string' ? errorText : `HTTP ${res.status}` };
  } catch (e) {
    return { success: false, message: `連線失敗: ${e instanceof Error ? e.message : 'Unknown'}` };
  }
}

async function testKilo(
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
    const res = await fetch(`${KILO_GATEWAY_BASE}/chat/completions`, {
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

async function testOpenCode(
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
    const res = await fetch(OPENCODE_ZEN_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: openCodeZenChatModelId(modelId),
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

type TesterFn = (key: string, modelId: string, userPrompt?: string, file?: FileAttachment, files?: FileAttachment[]) => Promise<TestResult>;
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
  qwen: testQwen,
  ollama_cloud: testOllamaCloud,
  ollama_local: testOllamaLocal,
  kilo: testKilo,
  opencode: testOpenCode,
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
      files,
    } = body as {
      provider?: string;
      modelId?: string;
      prompt?: unknown;
      fileBase64?: string;
      mimeType?: string;
      fileName?: string;
      files?: unknown;
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
    const fileAttachments: FileAttachment[] = Array.isArray(files)
      ? files.filter((item): item is FileAttachment => (
        item !== null &&
        typeof item === 'object' &&
        typeof (item as FileAttachment).fileBase64 === 'string' &&
        (item as FileAttachment).fileBase64.length > 0 &&
        typeof (item as FileAttachment).mimeType === 'string' &&
        (item as FileAttachment).mimeType.length > 0
      ))
      : fileAttachment ? [fileAttachment] : [];
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
      result = await test(apiKey, modelId, userPrompt, fileAttachment, fileAttachments);
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
