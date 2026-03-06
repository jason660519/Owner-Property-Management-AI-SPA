// filepath: apps/superadmin/lib/utils/ai-api-callers.ts
// Shared AI API caller functions — used by both single-model and consensus parsing.

import type { AIProvider } from '@/lib/ai-providers';
import { TRANSCRIPT_PARSE_PROMPT } from '@/lib/transcript-prompts';
import type { LandRegistryParsedResult } from '@/lib/types/transcript';

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

/** Extract JSON from model output — strips optional markdown code fence. */
export function extractJsonFromOutput(text: string): LandRegistryParsedResult {
  let raw = text.trim();
  const match = raw.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/m);
  if (match) raw = match[1].trim();
  return JSON.parse(raw) as LandRegistryParsedResult;
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

  if (isImageMime(mimeType)) {
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
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${name}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { maxOutputTokens: 4096, responseMimeType: 'application/json' },
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

  if (isImageMime(mimeType)) {
    content = [
      { type: 'image_url' as const, image_url: { url: `data:${mimeType};base64,${fileBase64}` } },
      { type: 'text' as const, text: prompt },
    ];
  }

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
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

  if (isImageMime(mimeType)) {
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

export const CALLERS: Record<AIProvider, CallerFn> = {
  openai: callOpenAI,
  anthropic: callAnthropic,
  gemini: callGemini,
  deepseek: callDeepSeek,
  grok: callGrok,
};
