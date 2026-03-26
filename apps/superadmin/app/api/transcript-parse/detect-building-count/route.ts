// filepath: apps/superadmin/app/api/transcript-parse/detect-building-count/route.ts
// created: 2026-03-24 | creator: Claude Sonnet 4.6
// Lightweight endpoint: detect how many distinct building numbers (建號) appear in a transcript document.
// Uses the first available online_ocr_parse model — same pool as the main parse route.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { decryptApiKey } from '@/lib/crypto';
import { resolveUserId } from '@/lib/resolve-ai-settings-user';
import type { AIProvider } from '@/lib/ai-providers';
import { CALLERS, extractJsonFromOutput, mimeFromPath } from '@/lib/utils/ai-api-callers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DETECT_PROMPT = `請仔細閱讀此建物謄本，找出其中所有獨立的「建號」（建物號碼）。

建號通常出現於謄本各區塊的標示部，格式如「建號：XXXX」、「建物號碼：XXXX」，或建物謄本首頁與每筆標題行。
若謄本含多個建號區塊，請逐一列出所有不重複的建號。

請只回傳以下 JSON 格式（不含任何說明文字）：
{"count": 2, "buildingNumbers": ["0001", "0002"]}

若謄本只有一個建號，請回傳：{"count": 1, "buildingNumbers": ["XXXX"]}
若無法辨識，請回傳：{"count": 0, "buildingNumbers": []}`;

interface DetectRequestBody {
  documentId?: string;
  userId?: string;
}

interface DetectResult {
  count: number;
  buildingNumbers: string[];
  modelUsed?: { provider: string; model: string };
}

export async function POST(request: NextRequest) {
  let body: DetectRequestBody;
  try {
    body = (await request.json()) as DetectRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { documentId, userId } = body;
  if (!documentId || !userId) {
    return NextResponse.json({ error: 'Missing documentId or userId' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // ── 1. Fetch document ──────────────────────────────────────────────────────
  const { data: doc, error: docError } = await adminClient
    .from('property_documents')
    .select('id, file_path')
    .eq('id', documentId)
    .eq('is_active', true)
    .single();

  if (docError || !doc) {
    return NextResponse.json({ error: '找不到該文件或文件已刪除' }, { status: 404 });
  }

  const filePath = doc.file_path as string;
  const mimeType = mimeFromPath(filePath);

  // ── 2. Download file ───────────────────────────────────────────────────────
  let fileBase64: string;
  try {
    const { data: blob, error: downloadError } = await adminClient.storage
      .from('property-documents')
      .download(filePath);
    if (downloadError || !blob) {
      return NextResponse.json(
        { error: `無法下載文件：${downloadError?.message ?? '未知錯誤'}` },
        { status: 500 },
      );
    }
    fileBase64 = Buffer.from(await blob.arrayBuffer()).toString('base64');
  } catch (e) {
    return NextResponse.json(
      { error: `讀取文件失敗：${e instanceof Error ? e.message : 'Unknown'}` },
      { status: 500 },
    );
  }

  // ── 3. Resolve user & pick model ──────────────────────────────────────────
  const resolvedUserId = await resolveUserId(adminClient, userId);
  if (!resolvedUserId) {
    return NextResponse.json({ error: '無法解析使用者，請先登入或設定 AI 服務' }, { status: 403 });
  }

  // Reuse the same model pool as the main parse route (online_ocr_parse → online_ocr fallback)
  const model = await pickFirstModel(adminClient, resolvedUserId);
  if (!model) {
    return NextResponse.json(
      {
        error:
          '尚未設定「雲端OCR謄本解析」使用的 AI 模型，請至「AI 服務 / API KEY」→「功能模組」指定模型',
      },
      { status: 422 },
    );
  }

  // ── 4. Fetch API key ───────────────────────────────────────────────────────
  const apiKey = await getApiKey(adminClient, resolvedUserId, model.provider);
  if (!apiKey) {
    return NextResponse.json(
      { error: `找不到 ${model.provider} 的 API 金鑰` },
      { status: 422 },
    );
  }

  const caller = CALLERS[model.provider as AIProvider];
  if (!caller) {
    return NextResponse.json(
      { error: `不支援的 AI 供應商：${model.provider}` },
      { status: 422 },
    );
  }

  // ── 5. Call AI ─────────────────────────────────────────────────────────────
  let rawText: string;
  try {
    const result = await caller(apiKey, model.model, fileBase64, mimeType, DETECT_PROMPT);
    if (!result.ok) {
      return NextResponse.json(
        { error: `AI 呼叫失敗：${result.error ?? '未知錯誤'}` },
        { status: 502 },
      );
    }
    rawText = result.text;
  } catch (e) {
    return NextResponse.json(
      { error: `AI 呼叫例外：${e instanceof Error ? e.message : 'Unknown'}` },
      { status: 502 },
    );
  }

  // ── 6. Parse response ──────────────────────────────────────────────────────
  let parsed: DetectResult;
  try {
    const json = extractJsonFromOutput(rawText) as {
      count?: unknown;
      buildingNumbers?: unknown;
    };
    const count = typeof json?.count === 'number' ? Math.max(0, Math.floor(json.count)) : 0;
    const buildingNumbers = Array.isArray(json?.buildingNumbers)
      ? (json.buildingNumbers as unknown[])
          .filter((v): v is string => typeof v === 'string')
          .slice(0, 20)
      : [];
    parsed = { count, buildingNumbers, modelUsed: { provider: model.provider, model: model.model } };
  } catch {
    return NextResponse.json(
      { error: 'AI 回傳格式無法解析，請重試或改用手動輸入' },
      { status: 502 },
    );
  }

  return NextResponse.json(parsed);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function pickFirstModel(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<{ provider: string; model: string } | null> {
  for (const moduleKey of ['online_ocr_parse', 'online_ocr']) {
    const { data } = await adminClient
      .from('ai_modules_assigned_function')
      .select('assigned_models, assigned_provider, assigned_model')
      .eq('user_id', userId)
      .eq('assigned_function', moduleKey)
      .single();
    if (!data) continue;
    const models = Array.isArray(data.assigned_models)
      ? (data.assigned_models as { provider: string; model: string; priority?: number }[])
      : [];
    if (models.length > 0) {
      const sorted = [...models].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
      return { provider: sorted[0].provider, model: sorted[0].model };
    }
    if (data.assigned_provider && data.assigned_model) {
      return {
        provider: data.assigned_provider as string,
        model: data.assigned_model as string,
      };
    }
  }
  return null;
}

async function getApiKey(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  provider: string,
): Promise<string | null> {
  const { data: keyRow } = await adminClient
    .from('ai_api_keys')
    .select('api_key_encrypted, iv')
    .eq('user_id', userId)
    .eq('provider', provider)
    .eq('is_active', true)
    .single();
  if (!keyRow?.api_key_encrypted || !keyRow?.iv) return null;
  try {
    return await decryptApiKey(keyRow.api_key_encrypted as string, keyRow.iv as string);
  } catch {
    return null;
  }
}
