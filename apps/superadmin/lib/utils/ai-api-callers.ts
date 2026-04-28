// filepath: apps/superadmin/lib/utils/ai-api-callers.ts
// Shared AI API caller functions — used by both single-model and consensus parsing.

import type { AIProvider } from '@/lib/ai-providers';
import type { AgentModelConfig } from '@/lib/types/agent-assignment';
import { TRANSCRIPT_PARSE_PROMPT } from '@/lib/transcript-prompts';
import { execFile } from 'child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/tiff', 'image/bmp']);
const PDF_IMAGE_PAGE_LIMIT = 4;
const TRANSCRIPT_VISION_MAX_TOKENS = 8192;

function configuredMaxTokens(config?: AgentModelConfig): number {
  return typeof config?.max_tokens === 'number' && Number.isFinite(config.max_tokens)
    ? config.max_tokens
    : TRANSCRIPT_VISION_MAX_TOKENS;
}

function isOpenAiMaxCompletionModel(modelId: string): boolean {
  const normalized = modelId.toLowerCase();
  return normalized.startsWith('gpt-5') || normalized.startsWith('o1') || normalized.startsWith('o3') || normalized.startsWith('o4');
}

function openAiTokenLimit(modelId: string, config?: AgentModelConfig): Record<string, number> {
  const maxTokens = configuredMaxTokens(config);
  return isOpenAiMaxCompletionModel(modelId)
    ? { max_completion_tokens: maxTokens }
    : { max_tokens: maxTokens };
}

function configuredTemperature(config?: AgentModelConfig): number | undefined {
  return typeof config?.temperature === 'number' && Number.isFinite(config.temperature)
    ? config.temperature
    : undefined;
}

function geminiThinkingConfig(modelId: string, config?: AgentModelConfig): Record<string, unknown> | undefined {
  if (!modelId.startsWith('gemini-3')) return undefined;
  if (!config?.reasoning_effort) return undefined;
  return { thinkingLevel: config.reasoning_effort };
}

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
    gif: 'image/gif',
    webp: 'image/webp',
    tif: 'image/tiff',
    tiff: 'image/tiff',
    bmp: 'image/bmp',
  };
  return map[ext] ?? 'application/octet-stream';
}

function runPdftoppm(pdfPath: string, outputPrefix: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      'pdftoppm',
      ['-jpeg', '-r', '180', '-f', '1', '-l', String(PDF_IMAGE_PAGE_LIMIT), pdfPath, outputPrefix],
      { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 },
      (error) => {
        if (error) reject(error);
        else resolve();
      },
    );
  });
}

async function pdfToJpegDataUrls(fileBase64: string): Promise<string[]> {
  const dir = await mkdtemp(path.join(tmpdir(), 'transcript-vlm-pdf-'));
  const pdfPath = path.join(dir, 'source.pdf');
  const outputPrefix = path.join(dir, 'page');
  try {
    await writeFile(pdfPath, Buffer.from(fileBase64, 'base64'));
    await runPdftoppm(pdfPath, outputPrefix);
    const files = (await readdir(dir)).filter((file) => file.endsWith('.jpg')).sort();
    const dataUrls: string[] = [];
    for (const file of files) {
      const bytes = await readFile(path.join(dir, file));
      dataUrls.push(`data:image/jpeg;base64,${bytes.toString('base64')}`);
    }
    return dataUrls;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function visionDataUrls(fileBase64: string, mimeType: string): Promise<string[]> {
  const mime = mimeType.toLowerCase();
  if (isImageMime(mime)) return [`data:${mime};base64,${fileBase64}`];
  if (mime === 'application/pdf') return pdfToJpegDataUrls(fileBase64);
  return [];
}

/**
 * Extract JSON from model output.
 * - Strips optional markdown code fence (```json ... ```) anywhere in text.
 * - Falls back to first {...} object if no fence found (for "以下是結果：{...}" style).
 */
export function extractJsonFromOutput(text: string): unknown {
  let raw = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const codeFence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeFence) {
    raw = codeFence[1].trim();
  } else {
    raw = extractFirstJsonObject(raw);
  }
  return parseJsonWithCommonRepairs(raw);
}

function extractFirstJsonObject(text: string): string {
  const brace = text.indexOf('{');
  if (brace < 0) return text;

  let depth = 0;
  let end = -1;
  let inString = false;
  let escaped = false;

  for (let i = brace; i < text.length; i += 1) {
    const char = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = inString;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  return end >= 0 ? text.slice(brace, end + 1) : text.slice(brace);
}

function parseJsonWithCommonRepairs(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    const repaired = raw
      .replace(/^\uFEFF/, '')
      .replace(/,\s*([}\]])/g, '$1')
      .trim();
    if (repaired !== raw) {
      return JSON.parse(repaired) as unknown;
    }
    throw error;
  }
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
  config?: AgentModelConfig,
): Promise<CallerResult> {
  const prompt = systemPrompt ?? TRANSCRIPT_PARSE_PROMPT;

  type TextPart = { type: 'text'; text: string };
  type ImagePart = { type: 'image_url'; image_url: { url: string } };
  let content: string | (TextPart | ImagePart)[] = prompt;

  const imageUrls = await visionDataUrls(fileBase64, mimeType);
  if (imageUrls.length) {
    content = [
      ...imageUrls.map((url) => ({ type: 'image_url' as const, image_url: { url } })),
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
      ...openAiTokenLimit(modelId, config),
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

  const imageUrls = await visionDataUrls(fileBase64, mimeType);
  if (imageUrls.length) {
    content = [
      ...imageUrls.map((url) => ({ type: 'image_url' as const, image_url: { url } })),
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
      max_tokens: TRANSCRIPT_VISION_MAX_TOKENS,
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
      max_tokens: TRANSCRIPT_VISION_MAX_TOKENS,
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
  config?: AgentModelConfig,
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
  const baseGenerationConfig = {
    maxOutputTokens: configuredMaxTokens(config),
    ...(configuredTemperature(config) !== undefined ? { temperature: configuredTemperature(config) } : {}),
    ...(geminiThinkingConfig(modelId, config) ? { thinkingConfig: geminiThinkingConfig(modelId, config) } : {}),
  };
  const generationConfig = isGemma
    ? baseGenerationConfig
    : { ...baseGenerationConfig, responseMimeType: 'application/json' };
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

  const imageUrls = await visionDataUrls(fileBase64, mimeType);
  if (imageUrls.length) {
    content = [
      ...imageUrls.map((url) => ({ type: 'image_url' as const, image_url: { url } })),
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
      max_tokens: TRANSCRIPT_VISION_MAX_TOKENS,
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

  const imageUrls = await visionDataUrls(fileBase64, mimeType);
  if (imageUrls.length) {
    content = [
      ...imageUrls.map((url) => ({ type: 'image_url' as const, image_url: { url } })),
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
      max_tokens: TRANSCRIPT_VISION_MAX_TOKENS,
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
      max_tokens: TRANSCRIPT_VISION_MAX_TOKENS,
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

  const imageUrls = await visionDataUrls(fileBase64, mimeType);
  if (imageUrls.length) {
    content = [
      ...imageUrls.map((url) => ({ type: 'image_url' as const, image_url: { url } })),
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
      max_tokens: TRANSCRIPT_VISION_MAX_TOKENS,
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

  const imageUrls = await visionDataUrls(fileBase64, mimeType);
  if (imageUrls.length) {
    content = [
      ...imageUrls.map((url) => ({ type: 'image_url' as const, image_url: { url } })),
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
      max_tokens: TRANSCRIPT_VISION_MAX_TOKENS,
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

  const imageUrls = await visionDataUrls(fileBase64, mimeType);
  if (imageUrls.length) {
    content = [
      ...imageUrls.map((url) => ({ type: 'image_url' as const, image_url: { url } })),
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
      max_tokens: TRANSCRIPT_VISION_MAX_TOKENS,
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
  config?: AgentModelConfig,
) => Promise<CallerResult>;

// ---------------------------------------------------------------------------
// Qwen (Alibaba DashScope) — OpenAI-compatible
// Qwen multimodal families accept image_url parts. PDFs are left to providers
// with native PDF support, such as Gemini or Anthropic.
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

  const imageUrls = await visionDataUrls(fileBase64, mimeType);
  if (imageUrls.length) {
    content = [
      ...imageUrls.map((url) => ({ type: 'image_url' as const, image_url: { url } })),
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
      max_tokens: TRANSCRIPT_VISION_MAX_TOKENS,
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
// Ollama — OpenAI-compatible endpoint at /v1/chat/completions
// Cloud hosts models (gpt-oss, etc.) behind an API key; local talks to the
// user's own daemon on 127.0.0.1:11434 with no auth.
// ---------------------------------------------------------------------------

async function callOllamaAt(
  baseUrl: string,
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

  const imageUrls = await visionDataUrls(fileBase64, mimeType);
  if (imageUrls.length) {
    content = [
      ...imageUrls.map((url) => ({ type: 'image_url' as const, image_url: { url } })),
      { type: 'text' as const, text: prompt },
    ];
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    signal,
    headers,
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content }],
      max_tokens: TRANSCRIPT_VISION_MAX_TOKENS,
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

export const callOllamaCloud: CallerFn = (key, model, b64, mime, sys, signal) =>
  callOllamaAt('https://ollama.com', key, model, b64, mime, sys, signal);

export const callOllamaLocal: CallerFn = (key, model, b64, mime, sys, signal) =>
  callOllamaAt('http://localhost:11434', key, model, b64, mime, sys, signal);

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
  ollama_cloud: callOllamaCloud,
  ollama_local: callOllamaLocal,
  kilo: callOpenRouter,
  opencode: callOpenRouter,
};
