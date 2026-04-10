// filepath: apps/superadmin/lib/utils/ai-api-callers.ts
// Shared AI API caller functions — used by both single-model and consensus parsing.

import type { AIProvider } from '@/lib/ai-providers';
import { TRANSCRIPT_PARSE_PROMPT } from '@/lib/transcript-prompts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

export function isImageMime(mime: string): boolean {
  return IMAGE_MIMES.has(mime.toLowerCase());
}

export function mimeFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };
  return map[ext] ?? 'application/octet-stream';
}

/**
 * Extract JSON from model output.
 * - Strips optional markdown code fence (```json ... ```) anywhere in text.
 * - Falls back to first {...} object if no fence found (for "以下是結果：{...}" style).
 */
export function extractJsonFromOutput(text: string): unknown {
  let raw = text.trim();
  const codeFence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeFence) {
    raw = codeFence[1].trim();
  } else {
    const brace = raw.indexOf('{');
    if (brace >= 0) {
      let depth = 0;
      let end = -1;
      for (let i = brace; i < raw.length; i++) {
        if (raw[i] === '{') depth++;
        else if (raw[i] === '}') {
          depth--;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }
      if (end >= 0) raw = raw.slice(brace, end + 1);
    }
  }
  return JSON.parse(raw) as unknown;
}

// ---------------------------------------------------------------------------
// Per-provider caller return type
// ---------------------------------------------------------------------------

export interface CallerResult {
  ok: boolean;
  text: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// OpenAI
// ---------------------------------------------------------------------------

export async function callOpenAI(
  apiKey: string,
  modelId: string,
  fileBase64: string,
  mimeType: string,
  systemPrompt?: string,
  signal?: AbortSignal,
): Promise<CallerResult> {
  const prompt = systemPrompt ?? TRANSCRIPT_PARSE_PROMPT;

  type TextPart = { type: 'text'; text: string };
  type ImagePart = { type: 'image_url'; image_url: { url: string } };
  let content: string | (TextPart | ImagePart)[] = prompt;

  const isDocOrImage = isImageMime(mimeType) || mimeType.toLowerCase() === 'application/pdf';
  if (isDocOrImage) {
    content = [
      { type: 'image_url' as const, image_url: { url: `data:${mimeType};base64,${fileBase64}` } },
      { type: 'text' as const, text: prompt },
    ];
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content }],
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    error?: { message?: string };
  };

  const text = data?.choices?.[0]?.message?.content ?? '';
  if (res.ok) return { ok: true, text };
  return { ok: false, text: '', error: data?.error?.message ?? `HTTP ${res.status}` };
}

export async function callPerplexity(
  apiKey: string,
  modelId: string,
  fileBase64: string,
  mimeType: string,
  systemPrompt?: string,
  signal?: AbortSignal,
): Promise<CallerResult> {
  const prompt = systemPrompt ?? TRANSCRIPT_PARSE_PROMPT;

  type TextPart = { type: 'text'; text: string };
  type ImagePart = { type: 'image_url'; image_url: { url: string } };
  let content: string | (TextPart | ImagePart)[] = prompt;

  const isDocOrImage = isImageMime(mimeType) || mimeType.toLowerCase() === 'application/pdf';
  if (isDocOrImage) {
    content = [
      { type: 'image_url' as const, image_url: { url: `data:${mimeType};base64,${fileBase64}` } },
      { type: 'text' as const, text: prompt },
    ];
  }

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content }],
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };

  const text = data?.choices?.[0]?.message?.content ?? '';
  if (res.ok) return { ok: true, text };
  return { ok: false, text: '', error: data?.error?.message ?? `HTTP ${res.status}` };
}

// ---------------------------------------------------------------------------
// Anthropic
// ---------------------------------------------------------------------------

export async function callAnthropic(
  apiKey: string,
  modelId: string,
  fileBase64: string,
  mimeType: string,
  systemPrompt?: string,
  signal?: AbortSignal,
): Promise<CallerResult> {
  const prompt = systemPrompt ?? TRANSCRIPT_PARSE_PROMPT;

  type TextBlock = { type: 'text'; text: string };
  type ImageBlock = { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };
  type DocBlock = { type: 'document'; source: { type: 'base64'; media_type: string; data: string } };
  type Block = TextBlock | ImageBlock | DocBlock;

  const blocks: Block[] = [];
  if (mimeType.toLowerCase() === 'application/pdf') {
    blocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 } });
  } else if (isImageMime(mimeType)) {
    blocks.push({ type: 'image', source: { type: 'base64', media_type: mimeType, data: fileBase64 } });
  }
  blocks.push({ type: 'text', text: prompt });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 4096,
      messages: [{ role: 'user', content: blocks }],
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    content?: { text?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
    error?: { message?: string };
  };
  const text = data?.content?.[0]?.text ?? '';
  if (res.ok) return { ok: true, text };
  return { ok: false, text: '', error: data?.error?.message ?? `HTTP ${res.status}` };
}

// ---------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------

export async function callGemini(
  apiKey: string,
  modelId: string,
  fileBase64: string,
  mimeType: string,
  systemPrompt?: string,
  signal?: AbortSignal,
): Promise<CallerResult> {
  const prompt = systemPrompt ?? TRANSCRIPT_PARSE_PROMPT;

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
    { inlineData: { mimeType, data: fileBase64 } },
    { text: prompt },
  ];

  const name = modelId.startsWith('models/') ? modelId : `models/${modelId}`;
  // Gemma models (gemma-*) do not support responseMimeType:'application/json';
  // use plain text mode and rely on extractJsonFromOutput for those models.
  const isGemma = /gemma/i.test(modelId);
  const generationConfig = isGemma
    ? { maxOutputTokens: 4096 }
    : { maxOutputTokens: 4096, responseMimeType: 'application/json' };
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${name}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig,
      }),
    }
  );

  const data = (await res.json().catch(() => ({}))) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
    error?: { message?: string };
  };
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (res.ok) return { ok: true, text };
  return { ok: false, text: '', error: data?.error?.message ?? `HTTP ${res.status}` };
}

// ---------------------------------------------------------------------------
// DeepSeek
// ---------------------------------------------------------------------------

export async function callDeepSeek(
  apiKey: string,
  modelId: string,
  fileBase64: string,
  mimeType: string,
  systemPrompt?: string,
  signal?: AbortSignal,
): Promise<CallerResult> {
  const prompt = systemPrompt ?? TRANSCRIPT_PARSE_PROMPT;

  type TextPart = { type: 'text'; text: string };
  type ImagePart = { type: 'image_url'; image_url: { url: string } };
  let content: string | (TextPart | ImagePart)[] = prompt;

  const isDocOrImage = isImageMime(mimeType) || mimeType.toLowerCase() === 'application/pdf';
  if (isDocOrImage) {
    content = [
      { type: 'image_url' as const, image_url: { url: `data:${mimeType};base64,${fileBase64}` } },
      { type: 'text' as const, text: prompt },
    ];
  }

  // DeepSeek requires the word "json" somewhere in the prompt when using
  // response_format:json_object. Use a system message to guarantee this.
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: '請務必以嚴格的 JSON 格式輸出結果，不要加任何說明文字。' },
        { role: 'user', content },
      ],
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  const text = data?.choices?.[0]?.message?.content ?? '';
  if (res.ok) return { ok: true, text };
  return { ok: false, text: '', error: data?.error?.message ?? `HTTP ${res.status}` };
}

// ---------------------------------------------------------------------------
// Grok (xAI)
// ---------------------------------------------------------------------------

export async function callGrok(
  apiKey: string,
  modelId: string,
  fileBase64: string,
  mimeType: string,
  systemPrompt?: string,
  signal?: AbortSignal,
): Promise<CallerResult> {
  const prompt = systemPrompt ?? TRANSCRIPT_PARSE_PROMPT;

  type TextPart = { type: 'text'; text: string };
  type ImagePart = { type: 'image_url'; image_url: { url: string } };
  let content: string | (TextPart | ImagePart)[] = prompt;

  const isDocOrImage = isImageMime(mimeType) || mimeType.toLowerCase() === 'application/pdf';
  if (isDocOrImage) {
    content = [
      { type: 'image_url' as const, image_url: { url: `data:${mimeType};base64,${fileBase64}` } },
      { type: 'text' as const, text: prompt },
    ];
  }

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content }],
      max_tokens: 4096,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  const text = data?.choices?.[0]?.message?.content ?? '';
  if (res.ok) return { ok: true, text };
  return { ok: false, text: '', error: data?.error?.message ?? `HTTP ${res.status}` };
}

// ---------------------------------------------------------------------------
// Together AI (OpenAI-compatible API)
// Note: most Together models are text-only and cannot read documents;
// they will return an empty/invalid JSON which hasTranscriptContent() will
// reject. Vision-capable Together models work normally.
// ---------------------------------------------------------------------------

export async function callTogether(
  apiKey: string,
  modelId: string,
  fileBase64: string,
  mimeType: string,
  systemPrompt?: string,
  signal?: AbortSignal,
): Promise<CallerResult> {
  const prompt = systemPrompt ?? TRANSCRIPT_PARSE_PROMPT;

  type TextPart = { type: 'text'; text: string };
  type ImagePart = { type: 'image_url'; image_url: { url: string } };
  let content: string | (TextPart | ImagePart)[] = prompt;

  // Only pass image inline data for vision-capable models; PDF is never supported.
  if (isImageMime(mimeType)) {
    content = [
      { type: 'image_url' as const, image_url: { url: `data:${mimeType};base64,${fileBase64}` } },
      { type: 'text' as const, text: prompt },
    ];
  }

  const res = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: '請務必以嚴格的 JSON 格式輸出結果，不要加任何說明文字。' },
        { role: 'user', content },
      ],
      max_tokens: 4096,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  const text = data?.choices?.[0]?.message?.content ?? '';
  if (res.ok) return { ok: true, text };
  return { ok: false, text: '', error: data?.error?.message ?? `HTTP ${res.status}` };
}

// ---------------------------------------------------------------------------
// Kimi (Moonshot) — OpenAI-compatible
// ---------------------------------------------------------------------------

export async function callKimi(
  apiKey: string,
  modelId: string,
  fileBase64: string,
  mimeType: string,
  systemPrompt?: string,
  signal?: AbortSignal,
): Promise<CallerResult> {
  const prompt = systemPrompt ?? TRANSCRIPT_PARSE_PROMPT;

  type TextPart = { type: 'text'; text: string };
  type ImagePart = { type: 'image_url'; image_url: { url: string } };
  let content: string | (TextPart | ImagePart)[] = prompt;

  const isDocOrImage = isImageMime(mimeType) || mimeType.toLowerCase() === 'application/pdf';
  if (isDocOrImage) {
    content = [
      { type: 'image_url' as const, image_url: { url: `data:${mimeType};base64,${fileBase64}` } },
      { type: 'text' as const, text: prompt },
    ];
  }

  const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: '請務必以嚴格的 JSON 格式輸出結果，不要加任何說明文字。' },
        { role: 'user', content },
      ],
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  const text = data?.choices?.[0]?.message?.content ?? '';
  if (res.ok) return { ok: true, text };
  return { ok: false, text: '', error: data?.error?.message ?? `HTTP ${res.status}` };
}

// ---------------------------------------------------------------------------
// OpenRouter — OpenAI-compatible
// ---------------------------------------------------------------------------

export async function callOpenRouter(
  apiKey: string,
  modelId: string,
  fileBase64: string,
  mimeType: string,
  systemPrompt?: string,
  signal?: AbortSignal,
): Promise<CallerResult> {
  const prompt = systemPrompt ?? TRANSCRIPT_PARSE_PROMPT;

  type TextPart = { type: 'text'; text: string };
  type ImagePart = { type: 'image_url'; image_url: { url: string } };
  let content: string | (TextPart | ImagePart)[] = prompt;

  const isDocOrImage = isImageMime(mimeType) || mimeType.toLowerCase() === 'application/pdf';
  if (isDocOrImage) {
    content = [
      { type: 'image_url' as const, image_url: { url: `data:${mimeType};base64,${fileBase64}` } },
      { type: 'text' as const, text: prompt },
    ];
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: '請務必以嚴格的 JSON 格式輸出結果，不要加任何說明文字。' },
        { role: 'user', content },
      ],
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  const text = data?.choices?.[0]?.message?.content ?? '';
  if (res.ok) return { ok: true, text };
  return { ok: false, text: '', error: data?.error?.message ?? `HTTP ${res.status}` };
}

// ---------------------------------------------------------------------------
// Zhipu (智谱 GLM) — OpenAI-compatible
// ---------------------------------------------------------------------------

export async function callZhipu(
  apiKey: string,
  modelId: string,
  fileBase64: string,
  mimeType: string,
  systemPrompt?: string,
  signal?: AbortSignal,
): Promise<CallerResult> {
  const prompt = systemPrompt ?? TRANSCRIPT_PARSE_PROMPT;

  type TextPart = { type: 'text'; text: string };
  type ImagePart = { type: 'image_url'; image_url: { url: string } };
  let content: string | (TextPart | ImagePart)[] = prompt;

  const isDocOrImage = isImageMime(mimeType) || mimeType.toLowerCase() === 'application/pdf';
  if (isDocOrImage) {
    content = [
      { type: 'image_url' as const, image_url: { url: `data:${mimeType};base64,${fileBase64}` } },
      { type: 'text' as const, text: prompt },
    ];
  }

  const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: '請務必以嚴格的 JSON 格式輸出結果，不要加任何說明文字。' },
        { role: 'user', content },
      ],
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  const text = data?.choices?.[0]?.message?.content ?? '';
  if (res.ok) return { ok: true, text };
  return { ok: false, text: '', error: data?.error?.message ?? `HTTP ${res.status}` };
}

// ---------------------------------------------------------------------------
// Caller registry
// ---------------------------------------------------------------------------

export type CallerFn = (
  key: string,
  model: string,
  b64: string,
  mime: string,
  systemPrompt?: string,
  signal?: AbortSignal,
) => Promise<CallerResult>;

// ---------------------------------------------------------------------------
// Qwen (Alibaba DashScope) — OpenAI-compatible
// Note: only qwen-vl-* models accept images; text models will ignore file data.
// PDFs are not natively supported and will be rejected by the model.
// ---------------------------------------------------------------------------

export async function callQwen(
  apiKey: string,
  modelId: string,
  fileBase64: string,
  mimeType: string,
  systemPrompt?: string,
  signal?: AbortSignal,
): Promise<CallerResult> {
  const prompt = systemPrompt ?? TRANSCRIPT_PARSE_PROMPT;

  type TextPart = { type: 'text'; text: string };
  type ImagePart = { type: 'image_url'; image_url: { url: string } };
  let content: string | (TextPart | ImagePart)[] = prompt;

  if (isImageMime(mimeType)) {
    content = [
      { type: 'image_url' as const, image_url: { url: `data:${mimeType};base64,${fileBase64}` } },
      { type: 'text' as const, text: prompt },
    ];
  }

  const res = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: '請務必以嚴格的 JSON 格式輸出結果，不要加任何說明文字。' },
        { role: 'user', content },
      ],
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  const text = data?.choices?.[0]?.message?.content ?? '';
  if (res.ok) return { ok: true, text };
  return { ok: false, text: '', error: data?.error?.message ?? `HTTP ${res.status}` };
}

export const CALLERS: Record<AIProvider, CallerFn> = {
  openai: callOpenAI,
  anthropic: callAnthropic,
  gemini: callGemini,
  deepseek: callDeepSeek,
  grok: callGrok,
  together: callTogether,
  kimi: callKimi,
  openrouter: callOpenRouter,
  zhipu: callZhipu,
  perplexity: callPerplexity,
  qwen: callQwen,
};
