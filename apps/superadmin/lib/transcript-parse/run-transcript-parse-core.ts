// filepath: apps/superadmin/lib/transcript-parse/run-transcript-parse-core.ts
// Shared consensus parse pipeline for SSE stream and background jobs (no request lifetime coupling).

import { createAdminClient } from '@/utils/supabase/admin';
import { decryptApiKey } from '@/lib/crypto';
import { resolveUserId } from '@/lib/resolve-ai-settings-user';
import type { AIProvider } from '@/lib/ai-providers';
import type {
  TranscriptParseOutput,
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
} from '@/lib/utils/ai-api-callers';
import { TRANSCRIPT_PARSE_PROMPT, withTranscriptParseKindDirective } from '@/lib/transcript-prompts';
import { PromptNotFoundError, resolveSystemPrompt } from '@/lib/ai/prompt-safety';
import { startPromptAudit } from '@/lib/ai/audit';
import {
  buildConsensus,
  getConflictsNeedingJudge,
  applyJudgeResolutions,
} from '@/lib/utils/transcript-consensus';
import { runConcurrentUntilTargetSuccess } from '@/lib/utils/concurrent-success-runner';
import { resolveParserConcurrency } from '@/lib/utils/parser-concurrency';

export type AdminClient = ReturnType<typeof createAdminClient>;

export interface TranscriptParseStreamPayload {
  documentId: string;
  userId: string;
  customPrompt?: string;
  /** Scenario key used to look up the matching prompt in saved_prompts */
  parseScenarioKey?: string;
  parserConcurrency?: number;
  overrideParserModels?: { provider: string; model: string }[];
  overrideJudgeModel?: { provider: string; model: string } | null;
  injectedLocalResult?: TranscriptParseOutput & { field_confidences?: Record<string, number> };
}

export type TranscriptParseCoreOutcome =
  | { kind: 'complete' }
  | { kind: 'aborted' }
  | { kind: 'error'; message: string };

type SendFn = (data: Record<string, unknown>) => void;

interface AssignedModelRow {
  provider: string;
  model: string;
  priority?: number;
}

const ABORTED_ERROR = '__ABORTED__';

export async function runTranscriptParseCore(
  adminClient: AdminClient,
  payload: TranscriptParseStreamPayload,
  options: { stopSignal: AbortSignal; onEvent: SendFn },
): Promise<TranscriptParseCoreOutcome> {
  const { stopSignal, onEvent: send } = options;
  const {
    documentId,
    userId,
    customPrompt,
    parseScenarioKey,
    parserConcurrency,
    overrideParserModels,
    overrideJudgeModel,
    injectedLocalResult,
  } = payload;

  const fail = (message: string): TranscriptParseCoreOutcome => {
    send({ type: 'error', message });
    return { kind: 'error', message };
  };

  try {
    const startTime = Date.now();

    send({ type: 'init', message: '初始化中…' });

    const { data: doc, error: docError } = await adminClient
      .from('property_documents')
      .select('id, file_path, document_type')
      .eq('id', documentId)
      .eq('is_active', true)
      .single();

    if (docError || !doc) {
      return fail('找不到該文件或文件已刪除');
    }

    const filePath = doc.file_path as string;
    const mimeType = mimeFromPath(filePath);

    send({ type: 'downloading', message: '下載文件中…' });

    let fileBase64: string;
    try {
      const { data: blob, error: downloadError } = await adminClient.storage
        .from('property-documents')
        .download(filePath);
      if (downloadError || !blob) {
        return fail(`無法下載文件：${downloadError?.message ?? '未知錯誤'}`);
      }
      fileBase64 = Buffer.from(await blob.arrayBuffer()).toString('base64');
    } catch (e) {
      return fail(`讀取文件失敗：${e instanceof Error ? e.message : 'Unknown'}`);
    }

    const resolvedUserId = await resolveUserId(adminClient, userId);
    if (!resolvedUserId) {
      return fail('無法解析使用者，請先登入或設定 AI 服務');
    }

    const assignedParserModels = await fetchAssignedModels(adminClient, resolvedUserId, [
      'online_ocr_parse',
      'online_ocr',
    ]);
    let parserModels: AssignedModelRow[] = assignedParserModels;

    if (overrideParserModels && overrideParserModels.length > 0) {
      if (assignedParserModels.length > 0) {
        const byKey = new Map<string, AssignedModelRow>(
          assignedParserModels.map((m) => [`${m.provider}::${m.model}`, m]),
        );
        const filtered: AssignedModelRow[] = [];
        for (const { provider, model } of overrideParserModels) {
          const found = byKey.get(`${provider}::${model}`);
          if (found) filtered.push(found);
        }
        if (filtered.length > 0) {
          parserModels = filtered;
        }
      } else {
        parserModels = overrideParserModels.map((m) => ({
          provider: m.provider,
          model: m.model,
        }));
      }
    }

    if (parserModels.length === 0) {
      return fail(
        '尚未設定「雲端OCR謄本解析」使用的 AI 模型，請至「AI 服務 / API KEY」→「功能模組」為「雲端OCR謄本解析（解析組）」指定模型。',
      );
    }

    const judgeModels = await fetchAssignedModels(adminClient, resolvedUserId, ['online_ocr_judge']);
    const judgeCandidates: { provider: string; model: string }[] = [];
    if (overrideJudgeModel) {
      judgeCandidates.push(overrideJudgeModel);
    }
    if (judgeModels.length > 0) {
      for (const j of judgeModels) {
        if (!judgeCandidates.some((c) => c.provider === j.provider && c.model === j.model)) {
          judgeCandidates.push({ provider: j.provider, model: j.model });
        }
      }
    }

    // SSoT prompt resolution. Order:
    //   1. Caller-supplied customPrompt (already validated by the route layer)
    //   2. saved_prompts.module_key === transcript.parse[.<scenarioKey>]
    //   3. legacy saved_prompts name pattern `%(scenarioKey)%`
    //   4. TRANSCRIPT_PARSE_PROMPT hard-code (warned)
    // See docs/ai-prompt-safety-guide.md §2.
    let resolvedSource: string = 'custom_prompt';
    let resolvedSavedPromptId: string | null = null;
    let basePrompt: string;
    if (customPrompt?.trim()) {
      basePrompt = customPrompt.trim();
    } else {
      try {
        const resolved = await resolveSystemPrompt({
          moduleKey: 'transcript.parse',
          scenarioKey: parseScenarioKey ?? undefined,
          client: adminClient,
        });
        basePrompt = resolved.content;
        resolvedSource = resolved.source;
        resolvedSavedPromptId = resolved.savedPromptId ?? null;
      } catch (err) {
        if (err instanceof PromptNotFoundError) {
          // Loud fallback — saved_prompts hasn't been seeded for this module.
          // Run `seedDefaultPrompts` from the prompt-management UI to populate.
          console.warn(
            '[transcript-parse] No prompt found in saved_prompts for transcript.parse. ' +
              'Falling back to TRANSCRIPT_PARSE_PROMPT hard-code. ' +
              'Run seedDefaultPrompts() from the prompt-management UI to fix.',
            { scenarioKey: parseScenarioKey, error: err.message },
          );
          basePrompt = TRANSCRIPT_PARSE_PROMPT;
          resolvedSource = 'hardcode_fallback';
        } else {
          throw err;
        }
      }
    }
    const { prompt: systemPrompt } = withTranscriptParseKindDirective(
      doc.document_type as string | null | undefined,
      basePrompt,
    );

    // Audit context threaded into every parser LLM call below.
    const parserAuditCtx: ParseAuditContext = {
      adminClient,
      moduleKey: parseScenarioKey
        ? `transcript.parse.${parseScenarioKey}`
        : 'transcript.parse',
      userId: resolvedUserId ?? null,
      savedPromptId: resolvedSavedPromptId,
      promptSource: resolvedSource,
    };

    send({
      type: 'models_loaded',
      parserModels: parserModels.map((m) => ({ provider: m.provider, model: m.model })),
      judgeModel: judgeCandidates[0] ?? null,
    });

    const TARGET_SUCCESS_COUNT = Math.min(5, parserModels.length);
    const parseConcurrency = resolveParserConcurrency(parserConcurrency, parserModels.length);
    send({
      type: 'parse_start',
      total: parserModels.length,
      concurrency: parseConcurrency,
      targetSuccessCount: TARGET_SUCCESS_COUNT,
    });

    const providers = [...new Set(parserModels.map((m) => m.provider))];
    const keyMap = new Map<string, string>();
    for (const p of providers) {
      const key = await getApiKey(adminClient, resolvedUserId, p);
      if (key) keyMap.set(p, key);
    }

    const {
      results: parseResults,
      successCount,
      launchedCount,
      cancelledIndices,
      stoppedBySignal,
    } = await runConcurrentUntilTargetSuccess<AssignedModelRow, ModelParseResult>({
      items: parserModels,
      maxConcurrency: parseConcurrency,
      targetSuccessCount: TARGET_SUCCESS_COUNT,
      stopSignal,
      onItemStart: (m, index) => {
        send({ type: 'model_start', provider: m.provider, model: m.model, index });
      },
      onItemResult: (m, index, result) => {
        send({
          type: 'model_result',
          provider: m.provider,
          model: m.model,
          index,
          success: result.result !== null,
          duration_ms: result.duration_ms,
          error: result.error,
        });
      },
      runItem: (m, _index, signal) =>
        callSingleModel(m, keyMap, fileBase64, mimeType, systemPrompt, signal, parserAuditCtx),
      isSuccessful: (result) => result.result !== null,
      isCancelled: (result) => result.error === ABORTED_ERROR,
    });

    if (stoppedBySignal || stopSignal.aborted) {
      return { kind: 'aborted' };
    }

    if (successCount >= TARGET_SUCCESS_COUNT) {
      for (const index of cancelledIndices) {
        const cancelledModel = parserModels[index];
        if (!cancelledModel) continue;
        send({
          type: 'model_cancelled',
          provider: cancelledModel.provider,
          model: cancelledModel.model,
          index,
        });
      }

      const neverStartedIndices = Array.from(
        { length: parserModels.length - launchedCount },
        (_, offset) => launchedCount + offset,
      );
      for (const index of neverStartedIndices) {
        const skippedModel = parserModels[index];
        if (!skippedModel) continue;
        send({
          type: 'model_skipped',
          provider: skippedModel.provider,
          model: skippedModel.model,
          index,
        });
      }
    }

    if (injectedLocalResult) {
      const localModelResult: ModelParseResult = {
        provider: 'local',
        model: 'local-regex-parser',
        result: {
          kind: injectedLocalResult.kind,
          buildingTranscript: injectedLocalResult.buildingTranscript,
          landTranscript: injectedLocalResult.landTranscript,
        },
        duration_ms: 0,
      };
      parseResults.push(localModelResult);
      send({
        type: 'model_result',
        provider: 'local',
        model: 'local-regex-parser',
        index: parseResults.length - 1,
        success: true,
        duration_ms: 0,
      });
    }

    if (stopSignal.aborted) {
      return { kind: 'aborted' };
    }

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

    const totalSuccessCount = successCount + (injectedLocalResult ? 1 : 0);
    if (totalSuccessCount === 0) {
      const errors = parseResults
        .filter((r) => r.error && r.provider !== 'local')
        .map((r) => `${r.provider}/${r.model}: ${r.error}`)
        .join('; ');
      const pdfHint =
        mimeType.toLowerCase() === 'application/pdf'
          ? ' 目前上傳的為 PDF；若部分模型仍無法解析，請將謄本另存為 JPG/PNG 後再上傳。'
          : '';
      return fail(`所有模型解析失敗：${errors}${pdfHint}`);
    }

    if (parserModels.length === 1 && !injectedLocalResult && parseResults[0].result !== null) {
      const m = parserModels[0];
      const data = parseResults[0].result as TranscriptParseOutput;
      const totalDuration = Date.now() - startTime;
      const metadata: ConsensusMetadata = {
        strategy: 'single',
        field_confidences: {},
        conflicts: [],
        total_confidence: 0.5,
        models_used: [{ provider: m.provider, model: m.model, duration_ms: parseResults[0].duration_ms }],
        total_duration_ms: totalDuration,
      };
      send({ type: 'saving', message: '儲存結果中…' });
      const { error: updateErr } = await adminClient
        .from('property_documents')
        .update({
          parsed_result: data as unknown as Record<string, unknown>,
          consensus_metadata: metadata as unknown as Record<string, unknown>,
          parse_strategy: 'single',
          parsed_at: new Date().toISOString(),
          ocr_status: 'completed',
          vlm_provider: m.provider,
          vlm_model_version: m.model,
          parsing_duration_ms: parseResults[0].duration_ms,
          confidence_score: 0.5,
        })
        .eq('id', documentId);
      if (updateErr) {
        return fail(`儲存解析結果失敗：${updateErr.message}`);
      }
      send({ type: 'complete', result: data, metadata });
      return { kind: 'complete' };
    }

    send({ type: 'consensus', message: '計算多模型共識中…' });
    const { merged, metadata } = buildConsensus(parseResults, Date.now() - startTime);

    const conflictsForJudge = getConflictsNeedingJudge(metadata);
    let finalMerged = merged;
    let finalMetadata = metadata;

    if (conflictsForJudge.length > 0 && judgeCandidates.length > 0) {
      if (stopSignal.aborted) {
        return { kind: 'aborted' };
      }
      send({
        type: 'judge_start',
        message: `裁判解決 ${conflictsForJudge.length} 個衝突欄位中…`,
        conflictCount: conflictsForJudge.length,
      });

      let judgeSuccess = false;
      for (const candidate of judgeCandidates) {
        const judgeResult = await runJudgePhase(
          adminClient,
          documentId,
          resolvedUserId,
          fileBase64,
          mimeType,
          conflictsForJudge,
          parseResults,
          finalMerged,
          finalMetadata,
          candidate,
          stopSignal,
        );
        if (judgeResult) {
          finalMerged = judgeResult.merged;
          finalMetadata = judgeResult.metadata;
          judgeSuccess = true;
          break;
        }
      }

      send({ type: 'judge_done', success: judgeSuccess });
    }

    finalMetadata = { ...finalMetadata, total_duration_ms: Date.now() - startTime };

    if (stopSignal.aborted) {
      return { kind: 'aborted' };
    }
    send({ type: 'saving', message: '儲存結果中…' });
    const { error: updateErr } = await adminClient
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
    if (updateErr) {
      return fail(`儲存解析結果失敗：${updateErr.message}`);
    }
    send({ type: 'complete', result: finalMerged, metadata: finalMetadata });
    return { kind: 'complete' };
  } catch (e) {
    const message = e instanceof Error ? e.message : '解析過程發生未知錯誤';
    send({ type: 'error', message });
    return { kind: 'error', message };
  }
}

function hasTranscriptContent(obj: unknown): boolean {
  if (obj === null || obj === undefined) return false;
  if (typeof obj === 'string') return obj.trim().length > 0;
  if (typeof obj !== 'object') return true;
  if (Array.isArray(obj)) return obj.some((item) => hasTranscriptContent(item));
  const rec = obj as Record<string, unknown>;
  for (const value of Object.values(rec)) {
    if (hasTranscriptContent(value)) return true;
  }
  return false;
}

/** Context passed through to the audit log for each per-model LLM call. */
interface ParseAuditContext {
  adminClient: AdminClient;
  moduleKey: string;
  userId: string | null;
  savedPromptId?: string | null;
  promptSource?: string | null;
}

async function callSingleModel(
  m: AssignedModelRow,
  keyMap: Map<string, string>,
  fileBase64: string,
  mimeType: string,
  systemPrompt: string,
  signal?: AbortSignal,
  auditCtx?: ParseAuditContext,
): Promise<ModelParseResult> {
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

  const audit = auditCtx
    ? startPromptAudit({
        moduleKey: auditCtx.moduleKey,
        provider: m.provider,
        modelId: m.model,
        userId: auditCtx.userId,
        savedPromptId: auditCtx.savedPromptId ?? null,
        promptSource: auditCtx.promptSource ?? null,
        client: auditCtx.adminClient,
      })
    : null;

  const callStart = Date.now();
  try {
    const callerResult = await caller(apiKey, m.model, fileBase64, mimeType, systemPrompt, signal);
    const duration = Date.now() - callStart;
    if (!callerResult.ok) {
      await audit?.complete('api_error', {
        errorMessage: callerResult.error ?? 'API 呼叫失敗',
        latencyMs: duration,
      });
      return {
        provider: m.provider,
        model: m.model,
        result: null,
        duration_ms: duration,
        error: callerResult.error ?? 'API 呼叫失敗',
      };
    }
    const parsed = extractJsonFromOutput(callerResult.text) as TranscriptParseOutput;
    if (!hasTranscriptContent(parsed)) {
      await audit?.complete('schema_mismatch', {
        errorMessage: 'empty or invalid transcript fields',
        latencyMs: duration,
      });
      return {
        provider: m.provider,
        model: m.model,
        result: null,
        duration_ms: duration,
        error: '模型回傳不含有效欄位的空結果（可能不支援此文件格式）',
      };
    }
    await audit?.complete('success', { latencyMs: duration });
    return { provider: m.provider, model: m.model, result: parsed, duration_ms: duration };
  } catch (e) {
    const duration = Date.now() - callStart;
    const isAborted = signal?.aborted || (e instanceof Error && e.name === 'AbortError');
    await audit?.complete('api_error', {
      errorMessage: isAborted ? ABORTED_ERROR : e instanceof Error ? e.message : 'Unknown error',
      latencyMs: duration,
    });
    return {
      provider: m.provider,
      model: m.model,
      result: null,
      duration_ms: duration,
      error: isAborted ? ABORTED_ERROR : e instanceof Error ? e.message : 'Unknown error',
    };
  }
}

async function runJudgePhase(
  adminClient: AdminClient,
  documentId: string,
  resolvedUserId: string,
  fileBase64: string,
  mimeType: string,
  conflicts: ConflictDetail[],
  _parseResults: ModelParseResult[],
  merged: TranscriptParseOutput,
  metadata: ConsensusMetadata,
  judgeModel: { provider: string; model: string },
  signal?: AbortSignal,
): Promise<{ merged: TranscriptParseOutput; metadata: ConsensusMetadata } | null> {
  const judge = judgeModel;
  const apiKey = await getApiKey(adminClient, resolvedUserId, judge.provider);
  if (!apiKey) return null;

  const caller = CALLERS[judge.provider as AIProvider];
  if (!caller) return null;

  // SSoT lookup for the judge prompt — see docs/ai-prompt-safety-guide.md §2.
  let judgeBasePrompt: string | null = null;
  let judgeSavedPromptId: string | null = null;
  let judgePromptSource: string | null = null;
  try {
    const resolved = await resolveSystemPrompt({
      moduleKey: 'transcript.judge',
      scenarioKey: 'judge',
      client: adminClient,
    });
    judgeBasePrompt = resolved.content;
    judgeSavedPromptId = resolved.savedPromptId ?? null;
    judgePromptSource = resolved.source;
  } catch (err) {
    if (err instanceof PromptNotFoundError) {
      console.warn(
        '[transcript-parse] No judge prompt in saved_prompts. Using buildJudgePrompt default.',
        { error: err.message },
      );
      judgePromptSource = 'hardcode_fallback';
    } else {
      throw err;
    }
  }
  const conflictSummary = conflicts.map((c) => ({
    field_path: c.field_path,
    model_values: c.values.map((v) => ({ provider: v.provider, model: v.model, value: v.value })),
  }));
  const judgePrompt = buildJudgePrompt(judgeBasePrompt, conflictSummary);

  const judgeAudit = startPromptAudit({
    moduleKey: 'transcript.judge',
    provider: judge.provider,
    modelId: judge.model,
    userId: resolvedUserId,
    savedPromptId: judgeSavedPromptId,
    promptSource: judgePromptSource,
    client: adminClient,
  });

  const callStart = Date.now();
  let result;
  try {
    result = await caller(apiKey, judge.model, fileBase64, mimeType, judgePrompt, signal);
  } catch (e) {
    const isAborted = signal?.aborted || (e instanceof Error && e.name === 'AbortError');
    await judgeAudit.complete('api_error', {
      errorMessage: isAborted ? ABORTED_ERROR : e instanceof Error ? e.message : 'Unknown error',
      latencyMs: Date.now() - callStart,
    });
    if (isAborted) return null;
    throw e;
  }
  const duration = Date.now() - callStart;

  if (signal?.aborted) {
    await judgeAudit.complete('api_error', {
      errorMessage: ABORTED_ERROR,
      latencyMs: duration,
    });
    return null;
  }

  let judgeRawOutput: Record<string, unknown> | null = null;
  let judgeErrorMessage: string | null = result.ok ? null : (result.error ?? null);
  if (result.ok && result.text) {
    try {
      judgeRawOutput = JSON.parse(result.text) as Record<string, unknown>;
    } catch (parseErr) {
      judgeErrorMessage = parseErr instanceof Error ? parseErr.message : '裁判回傳非合法 JSON';
    }
  }

  await judgeAudit.complete(
    !result.ok ? 'api_error' : judgeErrorMessage ? 'schema_mismatch' : 'success',
    {
      errorMessage: judgeErrorMessage,
      latencyMs: duration,
    },
  );

  await adminClient.from('ocr_parse_results').insert({
    property_document_id: documentId,
    provider: judge.provider,
    model_id: judge.model,
    role: 'judge',
    raw_output: judgeRawOutput,
    parse_duration_ms: duration,
    error_message: judgeErrorMessage,
  });

  if (!result.ok) return null;

  try {
    const judgeOutput = extractJsonFromOutput(result.text) as unknown as { resolutions?: JudgeResolution[] };
    if (!judgeOutput.resolutions || !Array.isArray(judgeOutput.resolutions)) return null;
    const judgeInfo: ModelInfo = { provider: judge.provider, model: judge.model, duration_ms: duration };
    return applyJudgeResolutions(merged, metadata, judgeOutput.resolutions, judgeInfo);
  } catch {
    return null;
  }
}

function buildJudgePrompt(
  basePrompt: string | null,
  conflicts: { field_path: string; model_values: { provider: string; model: string; value: unknown }[] }[],
): string {
  const conflictJson = JSON.stringify(conflicts, null, 2);
  if (basePrompt) return `${basePrompt}\n\n以下是有爭議的欄位，請一一判定：\n${conflictJson}`;
  return `你是台灣不動產謄本解析的品質審核專家。\n你收到一份謄本原始文件，以及多個 AI 模型對同一文件的解析結果中有爭議的欄位。\n\n以下是有爭議的欄位：\n${conflictJson}\n\n回傳格式（僅輸出有爭議的欄位，格式為嚴格 JSON）：\n{\n  "resolutions": [\n    {\n      "field_path": "欄位路徑",\n      "correct_value": "正確值",\n      "chosen_from": "model_provider",\n      "reason": "判定理由"\n    }\n  ]\n}\n\n請直接輸出 JSON，不要用 \`\`\`json 包覆`;
}

async function fetchAssignedModels(
  adminClient: AdminClient,
  userId: string,
  moduleKeys: string[],
): Promise<AssignedModelRow[]> {
  for (const key of moduleKeys) {
    const { data } = await adminClient
      .from('ai_modules_assigned_function')
      .select('assigned_models, assigned_provider, assigned_model')
      .eq('user_id', userId)
      .eq('assigned_function', key)
      .single();
    if (data) {
      const models = Array.isArray(data.assigned_models) ? (data.assigned_models as AssignedModelRow[]) : [];
      if (models.length > 0) return models.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
      if (data.assigned_provider && data.assigned_model) {
        return [{ provider: data.assigned_provider as string, model: data.assigned_model as string, priority: 1 }];
      }
    }
  }
  return [];
}

// NOTE: Legacy helpers `fetchSavedPromptByScenario` and `fetchSystemPrompt`
// were removed in Phase 5 of the AI Prompt Safety refactor. Prompt lookups now
// go through `resolveSystemPrompt` in @/lib/ai/prompt-safety, which handles
// both the saved_prompts.module_key path and the legacy name pattern.

async function getApiKey(adminClient: AdminClient, userId: string, provider: string): Promise<string | null> {
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
