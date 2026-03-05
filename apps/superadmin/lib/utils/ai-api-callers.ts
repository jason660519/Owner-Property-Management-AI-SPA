// filepath: apps/superadmin/lib/utils/ai-api-callers.ts
// Shared AI API caller functions — used by both single-model and consensus parsing.

import type { AIProvider } from '@/lib/ai-providers';
import type { LandRegistryParsedResult } from '@/lib/types/transcript';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const TRANSCRIPT_PARSE_PROMPT = `你是一位台灣不動產謄本分析專家。請仔細分析此謄本（圖片或 PDF），提取所有關鍵資訊，並「僅」輸出一個合法的 JSON 物件，不要輸出任何其他文字、說明或 markdown。

JSON 結構請依下列 key 組織（若該區塊無資料則可為 null 或空陣列）：
- 謄本資訊：謄本種類、建物建號、行政區、列印時間、頁次、謄本類型、列印機構、謄本檢查號、查驗網址、地政事務所主任、大安電謄字號、資料管轄機關、謄本核發機關 等。
- 建物標示部：登記日期、登記原因、建物門牌、建物坐落地號、主要用途、主要建材、層數、層次、建築完成日期、附屬建物用途、總面積、層次面積、陽台面積、共有部分、權利範圍、其他登記事項（陣列）等。
- 建物所有權部：登記次序、登記日期、原因發生日期、登記原因、所有權人、住址、權利範圍、權狀字號、相關他項權利登記次序（陣列）、其他登記事項等。
- 土地標示部、土地所有權部、他項權利部：若有則比照類似結構。
- 備註：字串或 null。

請直接輸出單一 JSON 物件，不要用 \`\`\`json 包覆。`;

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
  systemPrompt?: string
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
  systemPrompt?: string
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
  systemPrompt?: string
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
  systemPrompt?: string
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
  systemPrompt?: string
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
  systemPrompt?: string
) => Promise<CallerResult>;

export const CALLERS: Record<AIProvider, CallerFn> = {
  openai: callOpenAI,
  anthropic: callAnthropic,
  gemini: callGemini,
  deepseek: callDeepSeek,
  grok: callGrok,
};
