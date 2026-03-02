// filepath: apps/superadmin/lib/actions/consensus-parse.ts
// Server action: multi-model consensus transcript parsing engine.
// Phase 1 — parallel parse, Phase 2 — programmatic consensus, Phase 3 — AI judge (on demand).

'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { decryptApiKey } from '@/lib/crypto';
import { resolveUserId } from '@/lib/resolve-ai-settings-user';
import type { AIProvider } from '@/lib/ai-providers';
import type {
  LandRegistryParsedResult,
  ConsensusParseResult,
  ConsensusMetadata,
  ModelParseResult,
  ModelInfo,
  JudgeResolution,
  ConflictDetail,
} from '@/lib/types/transcript';
import {
  CALLERS,
  extractJsonFromOutput,
  mimeFromPath,
  TRANSCRIPT_PARSE_PROMPT,
} from '@/lib/utils/ai-api-callers';
import {
  buildConsensus,
  getConflictsNeedingJudge,
  applyJudgeResolutions,
} from '@/lib/utils/transcript-consensus';

// ---------------------------------------------------------------------------
// Types for assigned_models JSONB
// ---------------------------------------------------------------------------

interface AssignedModelRow {
  provider: string;
  model: string;
  priority?: number;
  settings?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Progress callback (optional, for UI streaming in the future)
// ---------------------------------------------------------------------------

export type ParsePhase = 'downloading' | 'parsing' | 'consensus' | 'judging' | 'saving' | 'done';

// ---------------------------------------------------------------------------
// Main entry: consensus parse
// ---------------------------------------------------------------------------

export async function parseTranscriptWithConsensus(
  documentId: string,
  userId: string
): Promise<ConsensusParseResult> {
  const startTime = Date.now();
  const adminClient = createAdminClient();

  // ─── 1. Fetch document ───────────────────────────────────────────────
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

  // ─── 2. Resolve user & fetch parser models ──────────────────────────
  const resolvedUserId = await resolveUserId(adminClient, userId);
  if (!resolvedUserId) {
    return { success: false, message: '無法解析使用者，請先登入或設定 AI 服務' };
  }

  const parserModels = await fetchAssignedModels(
    adminClient,
    resolvedUserId,
    ['online_ocr_parse', 'online_ocr'] // fallback to legacy key
  );

  if (parserModels.length === 0) {
    return {
      success: false,
      message: '尚未設定「雲端OCR謄本解析」使用的 AI 模型，請至「AI 服務 / API KEY」→「功能模組」為「雲端OCR謄本解析（解析組）」指定模型。',
    };
  }

  // ─── 3. Fetch system prompt (if custom) ─────────────────────────────
  const systemPrompt = await fetchSystemPrompt(adminClient, resolvedUserId, 'online_ocr_parse')
    ?? TRANSCRIPT_PARSE_PROMPT;

  // ─── 4. Single vs consensus mode ────────────────────────────────────
  if (parserModels.length === 1) {
    return singleModelParse(
      adminClient, documentId, resolvedUserId, parserModels[0],
      fileBase64, mimeType, systemPrompt, startTime
    );
  }

  // ─── 5. Phase 1: Parallel parse ────────────────────────────────────
  const parseResults = await parallelParse(
    adminClient, documentId, resolvedUserId, parserModels,
    fileBase64, mimeType, systemPrompt
  );

  const successCount = parseResults.filter((r) => r.result !== null).length;
  if (successCount === 0) {
    const errors = parseResults.map((r) => `${r.provider}/${r.model}: ${r.error}`).join('; ');
    return { success: false, message: `所有模型解析失敗：${errors}` };
  }

  // ─── 6. Phase 2: Programmatic consensus ─────────────────────────────
  const phaseTwoTime = Date.now();
  const { merged, metadata } = buildConsensus(parseResults, phaseTwoTime - startTime);

  // ─── 7. Phase 3: AI Judge (if needed) ───────────────────────────────
  const conflictsForJudge = getConflictsNeedingJudge(metadata);
  let finalMerged = merged;
  let finalMetadata = metadata;

  if (conflictsForJudge.length > 0) {
    const judgeResult = await runJudgePhase(
      adminClient, documentId, resolvedUserId,
      fileBase64, mimeType,
      conflictsForJudge, parseResults,
      merged, metadata
    );
    if (judgeResult) {
      finalMerged = judgeResult.merged;
      finalMetadata = judgeResult.metadata;
    }
  }

  // Update total duration
  finalMetadata = { ...finalMetadata, total_duration_ms: Date.now() - startTime };

  // ─── 8. Save final result to property_documents ─────────────────────
  await adminClient
    .from('property_documents')
    .update({
      parsed_result: finalMerged as unknown as Record<string, unknown>,
      consensus_metadata: finalMetadata as unknown as Record<string, unknown>,
      parse_strategy: 'consensus',
      parsed_at: new Date().toISOString(),
      ocr_status: 'completed',
      confidence_score: finalMetadata.total_confidence,
    })
    .eq('id', documentId);

  return { success: true, data: finalMerged, metadata: finalMetadata };
}

// ---------------------------------------------------------------------------
// Single-model fallback (backward compatible)
// ---------------------------------------------------------------------------

async function singleModelParse(
  adminClient: ReturnType<typeof createAdminClient>,
  documentId: string,
  resolvedUserId: string,
  model: AssignedModelRow,
  fileBase64: string,
  mimeType: string,
  systemPrompt: string,
  startTime: number
): Promise<ConsensusParseResult> {
  const { provider, model: modelId } = model;
  const caller = CALLERS[provider as AIProvider];
  if (!caller) {
    return { success: false, message: `不支援的 AI 供應商：${provider}` };
  }

  const apiKey = await getApiKey(adminClient, resolvedUserId, provider);
  if (!apiKey) {
    return { success: false, message: `找不到 ${provider} 的 API 金鑰，請至設定頁新增並啟用。` };
  }

  const callStart = Date.now();
  const result = await caller(apiKey, modelId, fileBase64, mimeType, systemPrompt);
  const duration = Date.now() - callStart;

  // Save raw output to ocr_parse_results
  await adminClient.from('ocr_parse_results').insert({
    property_document_id: documentId,
    provider,
    model_id: modelId,
    role: 'parser',
    raw_output: result.ok ? JSON.parse(result.text || '{}') : null,
    parse_duration_ms: duration,
    error_message: result.ok ? null : result.error,
  });

  if (!result.ok) {
    return { success: false, message: result.error ?? 'AI 解析失敗' };
  }

  try {
    const data = extractJsonFromOutput(result.text);
    const totalDuration = Date.now() - startTime;
    const metadata: ConsensusMetadata = {
      strategy: 'single',
      field_confidences: {},
      conflicts: [],
      total_confidence: 0.5, // single model = moderate confidence
      models_used: [{ provider, model: modelId, duration_ms: duration }],
      total_duration_ms: totalDuration,
    };

    // Save to property_documents
    await adminClient
      .from('property_documents')
      .update({
        parsed_result: data as unknown as Record<string, unknown>,
        consensus_metadata: metadata as unknown as Record<string, unknown>,
        parse_strategy: 'single',
        parsed_at: new Date().toISOString(),
        ocr_status: 'completed',
        vlm_provider: provider,
        vlm_model_version: modelId,
        parsing_duration_ms: duration,
        confidence_score: 0.5,
      })
      .eq('id', documentId);

    return { success: true, data, metadata };
  } catch (e) {
    return { success: false, message: `AI 回傳無法解析為 JSON：${e instanceof Error ? e.message : 'Unknown'}` };
  }
}

// ---------------------------------------------------------------------------
// Phase 1: Parallel Parse
// ---------------------------------------------------------------------------

async function parallelParse(
  adminClient: ReturnType<typeof createAdminClient>,
  documentId: string,
  resolvedUserId: string,
  models: AssignedModelRow[],
  fileBase64: string,
  mimeType: string,
  systemPrompt: string
): Promise<ModelParseResult[]> {
  // Pre-fetch all needed API keys (deduplicate by provider)
  const providers = [...new Set(models.map((m) => m.provider))];
  const keyMap = new Map<string, string>();
  for (const p of providers) {
    const key = await getApiKey(adminClient, resolvedUserId, p);
    if (key) keyMap.set(p, key);
  }

  // Launch parallel calls
  const promises = models.map(async (m): Promise<ModelParseResult> => {
    const apiKey = keyMap.get(m.provider);
    if (!apiKey) {
      return {
        provider: m.provider,
        model: m.model,
        result: null,
        duration_ms: 0,
        error: `找不到 ${m.provider} 的 API 金鑰`,
      };
    }

    const caller = CALLERS[m.provider as AIProvider];
    if (!caller) {
      return {
        provider: m.provider,
        model: m.model,
        result: null,
        duration_ms: 0,
        error: `不支援的 AI 供應商：${m.provider}`,
      };
    }

    const callStart = Date.now();
    try {
      const callerResult = await caller(apiKey, m.model, fileBase64, mimeType, systemPrompt);
      const duration = Date.now() - callStart;

      if (!callerResult.ok) {
        return {
          provider: m.provider,
          model: m.model,
          result: null,
          duration_ms: duration,
          error: callerResult.error ?? 'API 呼叫失敗',
        };
      }

      const parsed = extractJsonFromOutput(callerResult.text);
      return {
        provider: m.provider,
        model: m.model,
        result: parsed,
        duration_ms: duration,
      };
    } catch (e) {
      return {
        provider: m.provider,
        model: m.model,
        result: null,
        duration_ms: Date.now() - callStart,
        error: e instanceof Error ? e.message : 'Unknown error',
      };
    }
  });

  const results = await Promise.allSettled(promises);
  const parseResults: ModelParseResult[] = results.map((r) =>
    r.status === 'fulfilled'
      ? r.value
      : { provider: 'unknown', model: 'unknown', result: null, duration_ms: 0, error: String(r.reason) }
  );

  // Persist all results to ocr_parse_results
  const inserts = parseResults.map((r) => ({
    property_document_id: documentId,
    provider: r.provider,
    model_id: r.model,
    role: 'parser' as const,
    raw_output: r.result as unknown as Record<string, unknown> | null,
    parse_duration_ms: r.duration_ms,
    error_message: r.error ?? null,
  }));

  if (inserts.length > 0) {
    await adminClient.from('ocr_parse_results').insert(inserts);
  }

  return parseResults;
}

// ---------------------------------------------------------------------------
// Phase 3: AI Judge
// ---------------------------------------------------------------------------

async function runJudgePhase(
  adminClient: ReturnType<typeof createAdminClient>,
  documentId: string,
  resolvedUserId: string,
  fileBase64: string,
  mimeType: string,
  conflicts: ConflictDetail[],
  parseResults: ModelParseResult[],
  merged: LandRegistryParsedResult,
  metadata: ConsensusMetadata
): Promise<{ merged: LandRegistryParsedResult; metadata: ConsensusMetadata } | null> {
  // Fetch judge model
  const judgeModels = await fetchAssignedModels(adminClient, resolvedUserId, ['online_ocr_judge']);
  if (judgeModels.length === 0) {
    // No judge configured — return null to keep consensus result as-is
    return null;
  }

  const judge = judgeModels[0];
  const apiKey = await getApiKey(adminClient, resolvedUserId, judge.provider);
  if (!apiKey) return null;

  const caller = CALLERS[judge.provider as AIProvider];
  if (!caller) return null;

  // Fetch judge system prompt
  const judgeBasePrompt = await fetchSystemPrompt(adminClient, resolvedUserId, 'online_ocr_judge');

  // Build conflict summary for the judge
  const conflictSummary = conflicts.map((c) => ({
    field_path: c.field_path,
    model_values: c.values.map((v) => ({
      provider: v.provider,
      model: v.model,
      value: v.value,
    })),
  }));

  const judgePrompt = buildJudgePrompt(judgeBasePrompt, conflictSummary);

  const callStart = Date.now();
  const result = await caller(apiKey, judge.model, fileBase64, mimeType, judgePrompt);
  const duration = Date.now() - callStart;

  // Save judge raw output
  await adminClient.from('ocr_parse_results').insert({
    property_document_id: documentId,
    provider: judge.provider,
    model_id: judge.model,
    role: 'judge',
    raw_output: result.ok ? JSON.parse(result.text || '{}') : null,
    parse_duration_ms: duration,
    error_message: result.ok ? null : result.error,
  });

  if (!result.ok) return null;

  // Parse judge response
  try {
    const judgeOutput = extractJsonFromOutput(result.text) as unknown as {
      resolutions?: JudgeResolution[];
    };

    if (!judgeOutput.resolutions || !Array.isArray(judgeOutput.resolutions)) {
      return null;
    }

    const judgeInfo: ModelInfo = {
      provider: judge.provider,
      model: judge.model,
      duration_ms: duration,
    };

    return applyJudgeResolutions(merged, metadata, judgeOutput.resolutions, judgeInfo);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Judge prompt builder
// ---------------------------------------------------------------------------

function buildJudgePrompt(
  basePrompt: string | null,
  conflicts: { field_path: string; model_values: { provider: string; model: string; value: unknown }[] }[]
): string {
  const conflictJson = JSON.stringify(conflicts, null, 2);

  if (basePrompt) {
    return `${basePrompt}\n\n以下是有爭議的欄位，請一一判定：\n${conflictJson}`;
  }

  // Default judge prompt
  return `你是台灣不動產謄本解析的品質審核專家。
你收到一份謄本原始文件，以及多個 AI 模型對同一文件的解析結果中有爭議的欄位。

你的任務是：
1. 審查每個「有爭議的欄位」
2. 對照原始文件，判斷哪個模型的解析最正確
3. 若所有模型都錯，提供你自己的正確解析

以下是有爭議的欄位：
${conflictJson}

回傳格式（僅輸出有爭議的欄位，格式為嚴格 JSON）：
{
  "resolutions": [
    {
      "field_path": "欄位路徑",
      "correct_value": "正確值",
      "chosen_from": "model_provider（若選自某模型）",
      "reason": "判定理由"
    }
  ]
}

注意事項：
- 面積請保留原始單位（平方公尺），精確到小數點後兩位
- 日期格式統一為「民國 YYY 年 MM 月 DD 日」
- 地號/建號格式為「XXXX-XXXX」
- 若原始文件模糊無法辨識，在 reason 中說明，correct_value 設為 null
- 請直接輸出 JSON，不要用 \`\`\`json 包覆`;
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function fetchAssignedModels(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  moduleKeys: string[]
): Promise<AssignedModelRow[]> {
  // Try each module key in order (first match wins)
  for (const key of moduleKeys) {
    const { data } = await adminClient
      .from('ai_modules_assigned_function')
      .select('assigned_models, assigned_provider, assigned_model')
      .eq('user_id', userId)
      .eq('assigned_function', key)
      .single();

    if (data) {
      const models = Array.isArray(data.assigned_models) ? data.assigned_models as AssignedModelRow[] : [];
      if (models.length > 0) {
        // Sort by priority ascending
        return models.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
      }
      // Fallback to legacy single-model fields
      if (data.assigned_provider && data.assigned_model) {
        return [{ provider: data.assigned_provider as string, model: data.assigned_model as string, priority: 1 }];
      }
    }
  }

  return [];
}

async function fetchSystemPrompt(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  moduleKey: string
): Promise<string | null> {
  const { data } = await adminClient
    .from('ai_system_prompts')
    .select('prompt_text')
    .eq('user_id', userId)
    .eq('module_key', moduleKey)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  return data?.prompt_text as string | null ?? null;
}

async function getApiKey(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  provider: string
): Promise<string | null> {
  const { data: keyRow } = await adminClient
    .from('ai_api_keys')
    .select('api_key_encrypted, iv')
    .eq('user_id', userId)
    .eq('provider', provider)
    .eq('is_active', true)
    .single();

  if (!keyRow) return null;

  try {
    return await decryptApiKey(keyRow.api_key_encrypted, keyRow.iv);
  } catch {
    return null;
  }
}
