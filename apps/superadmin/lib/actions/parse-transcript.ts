// filepath: apps/superadmin/lib/actions/parse-transcript.ts
// Server action: fetch 謄本 document from storage, call configured AI to parse, return structured JSON.

'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { decryptApiKey } from '@/lib/crypto';
import { resolveUserId } from '@/lib/resolve-ai-settings-user';
import type { AIProvider } from '@/lib/ai-providers';
import type { LandRegistryParsedResult } from '@/lib/types/transcript';

const TRANSCRIPT_PARSE_PROMPT = `你是一位台灣不動產謄本分析專家。請仔細分析此謄本（圖片或 PDF），提取所有關鍵資訊，並「僅」輸出一個合法的 JSON 物件，不要輸出任何其他文字、說明或 markdown。

JSON 結構請依下列 key 組織（若該區塊無資料則可為 null 或空陣列）：
- 謄本資訊：謄本種類、建物建號、行政區、列印時間、頁次、謄本類型、列印機構、謄本檢查號、查驗網址、地政事務所主任、大安電謄字號、資料管轄機關、謄本核發機關 等。
- 建物標示部：登記日期、登記原因、建物門牌、建物坐落地號、主要用途、主要建材、層數、層次、建築完成日期、附屬建物用途、總面積、層次面積、陽台面積、共有部分、權利範圍、其他登記事項（陣列）等。
- 建物所有權部：登記次序、登記日期、原因發生日期、登記原因、所有權人、住址、權利範圍、權狀字號、相關他項權利登記次序（陣列）、其他登記事項等。
- 土地標示部、土地所有權部、他項權利部：若有則比照類似結構。
- 備註：字串或 null。

請直接輸出單一 JSON 物件，不要用 \`\`\`json 包覆。`;

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
function isImageMime(mime: string): boolean {
  return IMAGE_MIMES.has(mime.toLowerCase());
}

function mimeFromPath(filePath: string): string {
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

export type ParseTranscriptResult =
  | { success: true; data: LandRegistryParsedResult }
  | { success: false; message: string };

/** Extract JSON from model output (strip optional markdown code fence) */
function extractJsonFromOutput(text: string): LandRegistryParsedResult {
  let raw = text.trim();
  const match = raw.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/m);
  if (match) raw = match[1].trim();
  return JSON.parse(raw) as LandRegistryParsedResult;
}

async function callOpenAI(
  apiKey: string,
  modelId: string,
  fileBase64: string,
  mimeType: string
): Promise<{ ok: boolean; text: string; error?: string }> {
  let content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = TRANSCRIPT_PARSE_PROMPT;
  if (isImageMime(mimeType)) {
    content = [
      { type: 'image_url' as const, image_url: { url: `data:${mimeType};base64,${fileBase64}` } },
      { type: 'text' as const, text: TRANSCRIPT_PARSE_PROMPT },
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
  const data = (await res.json().catch(() => ({}))) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
  const text = data?.choices?.[0]?.message?.content ?? '';
  if (res.ok) return { ok: true, text };
  return { ok: false, text: '', error: data?.error?.message ?? `HTTP ${res.status}` };
}

async function callAnthropic(
  apiKey: string,
  modelId: string,
  fileBase64: string,
  mimeType: string
): Promise<{ ok: boolean; text: string; error?: string }> {
  type Block = { type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } } | { type: 'document'; source: { type: 'base64'; media_type: string; data: string } };
  const blocks: Block[] = [];
  if (mimeType.toLowerCase() === 'application/pdf') {
    blocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 } });
  } else if (isImageMime(mimeType)) {
    blocks.push({ type: 'image', source: { type: 'base64', media_type: mimeType, data: fileBase64 } });
  }
  blocks.push({ type: 'text', text: TRANSCRIPT_PARSE_PROMPT });
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 4096,
      messages: [{ role: 'user', content: blocks }],
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { content?: { text?: string }[]; error?: { message?: string } };
  const text = data?.content?.[0]?.text ?? '';
  if (res.ok) return { ok: true, text };
  return { ok: false, text: '', error: data?.error?.message ?? `HTTP ${res.status}` };
}

async function callGemini(
  apiKey: string,
  modelId: string,
  fileBase64: string,
  mimeType: string
): Promise<{ ok: boolean; text: string; error?: string }> {
  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
    { inlineData: { mimeType, data: fileBase64 } },
    { text: TRANSCRIPT_PARSE_PROMPT },
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
  const data = (await res.json().catch(() => ({}))) as { candidates?: { content?: { parts?: { text?: string }[] } }[]; error?: { message?: string } };
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (res.ok) return { ok: true, text };
  return { ok: false, text: '', error: data?.error?.message ?? `HTTP ${res.status}` };
}

async function callDeepSeek(
  apiKey: string,
  modelId: string,
  fileBase64: string,
  mimeType: string
): Promise<{ ok: boolean; text: string; error?: string }> {
  let content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = TRANSCRIPT_PARSE_PROMPT;
  if (isImageMime(mimeType)) {
    content = [
      { type: 'image_url' as const, image_url: { url: `data:${mimeType};base64,${fileBase64}` } },
      { type: 'text' as const, text: TRANSCRIPT_PARSE_PROMPT },
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
  const data = (await res.json().catch(() => ({}))) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
  const text = data?.choices?.[0]?.message?.content ?? '';
  if (res.ok) return { ok: true, text };
  return { ok: false, text: '', error: data?.error?.message ?? `HTTP ${res.status}` };
}

async function callGrok(
  apiKey: string,
  modelId: string,
  fileBase64: string,
  mimeType: string
): Promise<{ ok: boolean; text: string; error?: string }> {
  let content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = TRANSCRIPT_PARSE_PROMPT;
  if (isImageMime(mimeType)) {
    content = [
      { type: 'image_url' as const, image_url: { url: `data:${mimeType};base64,${fileBase64}` } },
      { type: 'text' as const, text: TRANSCRIPT_PARSE_PROMPT },
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
  const data = (await res.json().catch(() => ({}))) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
  const text = data?.choices?.[0]?.message?.content ?? '';
  if (res.ok) return { ok: true, text };
  return { ok: false, text: '', error: data?.error?.message ?? `HTTP ${res.status}` };
}

const CALLERS: Record<AIProvider, (key: string, model: string, b64: string, mime: string) => Promise<{ ok: boolean; text: string; error?: string }>> = {
  openai: callOpenAI,
  anthropic: callAnthropic,
  gemini: callGemini,
  deepseek: callDeepSeek,
  grok: callGrok,
};

/**
 * Parse an uploaded 謄本 document with the AI model assigned to "online_ocr".
 * documentId: property_documents.id
 * userId: from useAISettings().userId (for resolving AI module + API key)
 */
export async function parseTranscriptWithAI(
  documentId: string,
  userId: string
): Promise<ParseTranscriptResult> {
  const adminClient = createAdminClient();

  const { data: doc, error: docError } = await adminClient
    .from('property_documents')
    .select('id, file_path, document_type')
    .eq('id', documentId)
    .eq('is_active', true)
    .single();

  if (docError || !doc) {
    return { success: false, message: '找不到該文件或文件已刪除' };
  }

  const filePath = doc.file_path as string;
  const mimeType = mimeFromPath(filePath);

  let fileBase64: string;
  try {
    const { data: blob, error: downloadError } = await adminClient.storage
      .from('property-documents')
      .download(filePath);

    if (downloadError || !blob) {
      return { success: false, message: `無法下載文件：${downloadError?.message ?? '未知錯誤'}` };
    }
    const ab = await blob.arrayBuffer();
    fileBase64 = Buffer.from(ab).toString('base64');
  } catch (e) {
    return { success: false, message: `讀取文件失敗：${e instanceof Error ? e.message : 'Unknown'}` };
  }

  const resolvedUserId = await resolveUserId(adminClient, userId);
  if (!resolvedUserId) {
    return { success: false, message: '無法解析使用者，請先登入或設定 AI 服務' };
  }

  const { data: moduleRow, error: modError } = await adminClient
    .from('ai_modules_assigned_function')
    .select('assigned_models, assigned_provider, assigned_model')
    .eq('user_id', resolvedUserId)
    .eq('assigned_function', 'online_ocr')
    .single();

  if (modError || !moduleRow) {
    return {
      success: false,
      message: '尚未設定「雲端OCR謄本解析」使用的 AI 模型，請至「AI 服務 / API KEY」為「雲端OCR謄本解析」指定模型。',
    };
  }

  const models = Array.isArray(moduleRow.assigned_models) ? moduleRow.assigned_models : [];
  const first = models[0] ?? (moduleRow.assigned_provider && moduleRow.assigned_model ? { provider: moduleRow.assigned_provider, model: moduleRow.assigned_model } : null);
  if (!first || typeof first !== 'object' || !('provider' in first) || !('model' in first)) {
    return {
      success: false,
      message: '雲端OCR謄本解析尚未指定模型，請至設定頁選擇模型。',
    };
  }

  const provider = first.provider as string;
  const modelId = first.model as string;
  const caller = CALLERS[provider as AIProvider];
  if (!caller) {
    return { success: false, message: `不支援的 AI 供應商：${provider}` };
  }

  const { data: keyRow, error: keyError } = await adminClient
    .from('ai_api_keys')
    .select('api_key_encrypted, iv')
    .eq('user_id', resolvedUserId)
    .eq('provider', provider)
    .eq('is_active', true)
    .single();

  if (keyError || !keyRow) {
    return { success: false, message: `找不到 ${provider} 的 API 金鑰，請至設定頁新增並啟用。` };
  }

  let apiKey: string;
  try {
    apiKey = await decryptApiKey(keyRow.api_key_encrypted, keyRow.iv);
  } catch {
    return { success: false, message: 'API 金鑰解密失敗' };
  }

  const result = await caller(apiKey, modelId, fileBase64, mimeType);
  if (!result.ok) {
    return { success: false, message: result.error ?? 'AI 解析失敗' };
  }

  try {
    const data = extractJsonFromOutput(result.text);
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      message: `AI 回傳無法解析為 JSON：${e instanceof Error ? e.message : 'Unknown'}`,
    };
  }
}
