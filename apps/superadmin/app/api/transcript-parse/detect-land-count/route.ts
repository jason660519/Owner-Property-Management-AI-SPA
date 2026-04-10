// filepath: apps/superadmin/app/api/transcript-parse/detect-land-count/route.ts
// Detect how many distinct land parcel numbers (地號) appear in a land registry transcript document.
// Hardened per docs/ai-prompt-safety-guide.md §2 — prompt resolved from
// saved_prompts (transcript.detect_land_count) before falling back to the
// hard-coded constant in lib/transcript-detect-prompts.ts.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { decryptApiKey } from '@/lib/crypto';
import { resolveUserId } from '@/lib/resolve-ai-settings-user';
import type { AIProvider } from '@/lib/ai-providers';
import { CALLERS, extractJsonFromOutput, mimeFromPath } from '@/lib/utils/ai-api-callers';
import {
  DETECT_LAND_COUNT_PROMPT,
  DETECT_LAND_COUNT_SAVED_PROMPT_MODULE_KEY,
} from '@/lib/transcript-detect-prompts';
import { PromptNotFoundError, resolveSystemPrompt } from '@/lib/ai/prompt-safety';
import { startPromptAudit } from '@/lib/ai/audit';
import { checkRateLimit } from '@/lib/ai/rate-limit';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DetectRequestBody {
  documentId?: string;
  userId?: string;
}

interface DetectResult {
  count: number;
  landParcelNumbers: string[];
  modelUsed?: { provider: string; model: string };
}

export async function POST(request: NextRequest) {
  const adminClient = createAdminClient();

  const auth = await requireSuperadmin({
    request,
    adminClient,
    routeLabel: 'api/transcript-parse/detect-land-count',
  });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const rl = await checkRateLimit({
    userId: auth.userId,
    endpointKey: 'api/transcript-parse/detect-land-count',
    client: adminClient,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: rl.message },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

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

  const resolvedUserId = await resolveUserId(adminClient, userId);
  if (!resolvedUserId) {
    return NextResponse.json({ error: '無法解析使用者，請先登入或設定 AI 服務' }, { status: 403 });
  }

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

  // Resolve system prompt from SSoT (saved_prompts.module_key) before
  // falling back to the hard-coded constant. See ai-prompt-safety-guide §2.
  let systemPrompt: string;
  let promptSource: string = 'saved_prompts_module_key';
  let savedPromptId: string | null = null;
  try {
    const resolved = await resolveSystemPrompt({
      moduleKey: DETECT_LAND_COUNT_SAVED_PROMPT_MODULE_KEY,
      client: adminClient,
    });
    systemPrompt = resolved.content;
    promptSource = resolved.source;
    savedPromptId = resolved.savedPromptId ?? null;
  } catch (err) {
    if (err instanceof PromptNotFoundError) {
      console.warn(
        '[detect-land-count] No prompt found in saved_prompts. ' +
          'Falling back to DETECT_LAND_COUNT_PROMPT hard-code. ' +
          'Run seedDefaultPrompts() from the prompt-management UI to fix.',
      );
      systemPrompt = DETECT_LAND_COUNT_PROMPT;
      promptSource = 'hardcode_fallback';
    } else {
      throw err;
    }
  }

  const audit = startPromptAudit({
    moduleKey: DETECT_LAND_COUNT_SAVED_PROMPT_MODULE_KEY,
    provider: model.provider,
    modelId: model.model,
    userId: resolvedUserId,
    savedPromptId,
    promptSource,
    client: adminClient,
  });

  let rawText: string;
  const callStart = Date.now();
  try {
    const result = await caller(apiKey, model.model, fileBase64, mimeType, systemPrompt);
    const duration = Date.now() - callStart;
    if (!result.ok) {
      await audit.complete('api_error', {
        errorMessage: result.error ?? 'API 呼叫失敗',
        latencyMs: duration,
      });
      return NextResponse.json(
        { error: `AI 呼叫失敗：${result.error ?? '未知錯誤'}` },
        { status: 502 },
      );
    }
    await audit.complete('success', { latencyMs: duration });
    rawText = result.text;
  } catch (e) {
    await audit.complete('api_error', {
      errorMessage: e instanceof Error ? e.message : 'Unknown',
      latencyMs: Date.now() - callStart,
    });
    return NextResponse.json(
      { error: `AI 呼叫例外：${e instanceof Error ? e.message : 'Unknown'}` },
      { status: 502 },
    );
  }

  let parsed: DetectResult;
  try {
    const json = extractJsonFromOutput(rawText) as {
      count?: unknown;
      landParcelNumbers?: unknown;
    };
    const count = typeof json?.count === 'number' ? Math.max(0, Math.floor(json.count)) : 0;
    const landParcelNumbers = Array.isArray(json?.landParcelNumbers)
      ? (json.landParcelNumbers as unknown[])
          .filter((v): v is string => typeof v === 'string')
          .slice(0, 20)
      : [];
    parsed = { count, landParcelNumbers, modelUsed: { provider: model.provider, model: model.model } };
  } catch {
    return NextResponse.json(
      { error: 'AI 回傳格式無法解析，請重試或改用手動輸入' },
      { status: 502 },
    );
  }

  return NextResponse.json(parsed);
}

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
