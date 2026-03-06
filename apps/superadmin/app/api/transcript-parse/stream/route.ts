// filepath: apps/superadmin/app/api/transcript-parse/stream/route.ts
// created: 2026-03-04 | creator: Claude Sonnet 4.6
// SSE streaming endpoint for transcript consensus parsing.
// Emits per-model progress events so the UI can show real-time status.

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { decryptApiKey } from '@/lib/crypto';
import { resolveUserId } from '@/lib/resolve-ai-settings-user';
import type { AIProvider } from '@/lib/ai-providers';
import type {
  LandRegistryParsedResult,
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

export const runtime = 'nodejs';
// Prevent Next.js from buffering the response
export const dynamic = 'force-dynamic';

interface AssignedModelRow {
  provider: string;
  model: string;
  priority?: number;
}

type SendFn = (data: Record<string, unknown>) => void;

// ---------------------------------------------------------------------------
// POST /api/transcript-parse/stream
// Body: { documentId: string; userId: string; customPrompt?: string }
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: {
    documentId?: string;
    userId?: string;
    customPrompt?: string;
    overrideParserModels?: { provider: string; model: string }[];
    overrideJudgeModel?: { provider: string; model: string } | null;
  };
  try {
    body = await request.json() as typeof body;
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { documentId, userId, customPrompt, overrideParserModels, overrideJudgeModel } = body;
  if (!documentId || !userId) {
    return new Response('Missing documentId or userId', { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send: SendFn = (data) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Client disconnected; swallow to avoid unhandled rejection
        }
      };

      try {
        const adminClient = createAdminClient();
        const startTime = Date.now();

        send({ type: 'init', message: '初始化中…' });

        // ── 1. Fetch document ──────────────────────────────────────────
        const { data: doc, error: docError } = await adminClient
          .from('property_documents')
          .select('id, file_path, document_type')
          .eq('id', documentId)
          .eq('is_active', true)
          .single();

        if (docError || !doc) {
          send({ type: 'error', message: '找不到該文件或文件已刪除' });
          return;
        }

        const filePath = doc.file_path as string;
        const mimeType = mimeFromPath(filePath);

        // ── 2. Download file ───────────────────────────────────────────
        send({ type: 'downloading', message: '下載文件中…' });

        let fileBase64: string;
        try {
          const { data: blob, error: downloadError } = await adminClient.storage
            .from('property-documents')
            .download(filePath);
          if (downloadError || !blob) {
            send({ type: 'error', message: `無法下載文件：${downloadError?.message ?? '未知錯誤'}` });
            return;
          }
          fileBase64 = Buffer.from(await blob.arrayBuffer()).toString('base64');
        } catch (e) {
          send({ type: 'error', message: `讀取文件失敗：${e instanceof Error ? e.message : 'Unknown'}` });
          return;
        }

        // ── 3. Resolve user & fetch models ─────────────────────────────
        const resolvedUserId = await resolveUserId(adminClient, userId);
        if (!resolvedUserId) {
          send({ type: 'error', message: '無法解析使用者，請先登入或設定 AI 服務' });
          return;
        }

        const assignedParserModels = await fetchAssignedModels(
          adminClient,
          resolvedUserId,
          ['online_ocr_parse', 'online_ocr'],
        );
        let parserModels: AssignedModelRow[] = assignedParserModels;

        if (overrideParserModels && overrideParserModels.length > 0) {
          if (assignedParserModels.length > 0) {
            // 1) 正常情況：限制在「已於模組綁定中」的模型交集範圍內
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
            // 2) 若尚未設定模組綁定，仍允許以 override 清單直接執行一次解析
            parserModels = overrideParserModels.map((m) => ({
              provider: m.provider,
              model: m.model,
            }));
          }
        }

        if (parserModels.length === 0) {
          send({
            type: 'error',
            message:
              '尚未設定「雲端OCR謄本解析」使用的 AI 模型，請至「AI 服務 / API KEY」→「功能模組」為「雲端OCR謄本解析（解析組）」指定模型。',
          });
          return;
        }

        const judgeModels = await fetchAssignedModels(adminClient, resolvedUserId, ['online_ocr_judge']);
        // 準備裁判候選清單：優先前端指定，其次依 DB 優先順序（assigned_models priority）
        const judgeCandidates: { provider: string; model: string }[] = [];
        if (overrideJudgeModel) {
          judgeCandidates.push(overrideJudgeModel);
        }
        if (judgeModels.length > 0) {
          for (const j of judgeModels) {
            // 避免與 overrideJudgeModel 重複
            if (!judgeCandidates.some((c) => c.provider === j.provider && c.model === j.model)) {
              judgeCandidates.push({ provider: j.provider, model: j.model });
            }
          }
        }

        // ── 4. Resolve system prompt ───────────────────────────────────
        const storedPrompt = await fetchSystemPrompt(adminClient, resolvedUserId, 'online_ocr_parse');
        const systemPrompt = customPrompt?.trim() || storedPrompt || TRANSCRIPT_PARSE_PROMPT;

        // Emit model info so the UI can pre-populate the progress list
        send({
          type: 'models_loaded',
          parserModels: parserModels.map((m) => ({ provider: m.provider, model: m.model })),
          judgeModel,
        });

        // ── 5. Phase 1: Parse ─────────────────────────────────────────
        const TARGET_SUCCESS_COUNT = 5;
        const maxPlannedParsers = Math.min(parserModels.length, TARGET_SUCCESS_COUNT);
        send({ type: 'parse_start', total: maxPlannedParsers });

        // Pre-fetch API keys (one request per provider)
        const providers = [...new Set(parserModels.map((m) => m.provider))];
        const keyMap = new Map<string, string>();
        for (const p of providers) {
          const key = await getApiKey(adminClient, resolvedUserId, p);
          if (key) keyMap.set(p, key);
        }

        const parseResults: ModelParseResult[] = [];
        let successSoFar = 0;

        // 以排序順序依序呼叫模型，直到：
        // - 累積至少 TARGET_SUCCESS_COUNT 個成功解析，或
        // - 沒有更多模型可用為止。
        for (let index = 0; index < parserModels.length; index += 1) {
          const m = parserModels[index];
          // 若已達到目標成功數，停止再呼叫後續模型，節省成本
          if (successSoFar >= TARGET_SUCCESS_COUNT) break;

          send({ type: 'model_start', provider: m.provider, model: m.model, index });
          const result = await callSingleModel(m, keyMap, fileBase64, mimeType, systemPrompt);
          parseResults.push(result);
          if (result.result !== null) successSoFar += 1;

          send({
            type: 'model_result',
            provider: m.provider,
            model: m.model,
            index,
            success: result.result !== null,
            duration_ms: result.duration_ms,
            error: result.error,
          });
        }

        // Persist all parse results at once
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

        const successCount = parseResults.filter((r) => r.result !== null).length;
        if (successCount === 0) {
          const errors = parseResults.map((r) => `${r.provider}/${r.model}: ${r.error}`).join('; ');
          send({ type: 'error', message: `所有模型解析失敗：${errors}` });
          return;
        }

        // ── 6. Single-model shortcut (no consensus needed) ─────────────
        if (parserModels.length === 1 && parseResults[0].result !== null) {
          const m = parserModels[0];
          const data = parseResults[0].result as LandRegistryParsedResult;
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
          await adminClient.from('property_documents').update({
            parsed_result: data as unknown as Record<string, unknown>,
            consensus_metadata: metadata as unknown as Record<string, unknown>,
            parse_strategy: 'single',
            parsed_at: new Date().toISOString(),
            ocr_status: 'completed',
            vlm_provider: m.provider,
            vlm_model_version: m.model,
            parsing_duration_ms: parseResults[0].duration_ms,
            confidence_score: 0.5,
          }).eq('id', documentId);
          send({ type: 'complete', result: data, metadata });
          return;
        }

        // ── 7. Phase 2: Consensus ─────────────────────────────────────
        send({ type: 'consensus', message: '計算多模型共識中…' });
        const { merged, metadata } = buildConsensus(parseResults, Date.now() - startTime);

        // ── 8. Phase 3: AI Judge (optional) ──────────────────────────
        const conflictsForJudge = getConflictsNeedingJudge(metadata);
        let finalMerged = merged;
        let finalMetadata = metadata;

        if (conflictsForJudge.length > 0 && judgeCandidates.length > 0) {
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

        // ── 9. Save ───────────────────────────────────────────────────
        send({ type: 'saving', message: '儲存結果中…' });
        await adminClient.from('property_documents').update({
          parsed_result: finalMerged as unknown as Record<string, unknown>,
          consensus_metadata: finalMetadata as unknown as Record<string, unknown>,
          parse_strategy: 'consensus',
          parsed_at: new Date().toISOString(),
          ocr_status: 'completed',
          confidence_score: finalMetadata.total_confidence,
        }).eq('id', documentId);

        send({ type: 'complete', result: finalMerged, metadata: finalMetadata });

      } catch (e) {
        send({ type: 'error', message: e instanceof Error ? e.message : '解析過程發生未知錯誤' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

// ---------------------------------------------------------------------------
// Calls a single AI model and returns the result
// ---------------------------------------------------------------------------

async function callSingleModel(
  m: AssignedModelRow,
  keyMap: Map<string, string>,
  fileBase64: string,
  mimeType: string,
  systemPrompt: string,
): Promise<ModelParseResult> {
  const apiKey = keyMap.get(m.provider);
  if (!apiKey) {
    return { provider: m.provider, model: m.model, result: null, duration_ms: 0, error: `找不到 ${m.provider} 的 API 金鑰` };
  }
  const caller = CALLERS[m.provider as AIProvider];
  if (!caller) {
    return { provider: m.provider, model: m.model, result: null, duration_ms: 0, error: `不支援的 AI 供應商：${m.provider}` };
  }
  const callStart = Date.now();
  try {
    const callerResult = await caller(apiKey, m.model, fileBase64, mimeType, systemPrompt);
    const duration = Date.now() - callStart;
    if (!callerResult.ok) {
      return { provider: m.provider, model: m.model, result: null, duration_ms: duration, error: callerResult.error ?? 'API 呼叫失敗' };
    }
    const parsed = extractJsonFromOutput(callerResult.text);
    return { provider: m.provider, model: m.model, result: parsed, duration_ms: duration };
  } catch (e) {
    return { provider: m.provider, model: m.model, result: null, duration_ms: Date.now() - callStart, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// ---------------------------------------------------------------------------
// Phase 3: AI Judge (mirrors consensus-parse.ts runJudgePhase)
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
  metadata: ConsensusMetadata,
  judgeModel: { provider: string; model: string },
): Promise<{ merged: LandRegistryParsedResult; metadata: ConsensusMetadata } | null> {
  const judge = judgeModel;
  const apiKey = await getApiKey(adminClient, resolvedUserId, judge.provider);
  if (!apiKey) return null;

  const caller = CALLERS[judge.provider as AIProvider];
  if (!caller) return null;

  const judgeBasePrompt = await fetchSystemPrompt(adminClient, resolvedUserId, 'online_ocr_judge');
  const conflictSummary = conflicts.map((c) => ({
    field_path: c.field_path,
    model_values: c.values.map((v) => ({ provider: v.provider, model: v.model, value: v.value })),
  }));
  const judgePrompt = buildJudgePrompt(judgeBasePrompt, conflictSummary);

  const callStart = Date.now();
  const result = await caller(apiKey, judge.model, fileBase64, mimeType, judgePrompt);
  const duration = Date.now() - callStart;

  let judgeRawOutput: Record<string, unknown> | null = null;
  let judgeErrorMessage: string | null = result.ok ? null : result.error;
  if (result.ok && result.text) {
    try {
      judgeRawOutput = JSON.parse(result.text) as Record<string, unknown>;
    } catch (parseErr) {
      judgeErrorMessage = parseErr instanceof Error ? parseErr.message : '裁判回傳非合法 JSON';
    }
  }

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

// ---------------------------------------------------------------------------
// DB helpers (mirrors consensus-parse.ts private helpers)
// ---------------------------------------------------------------------------

async function fetchAssignedModels(
  adminClient: ReturnType<typeof createAdminClient>,
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

async function fetchSystemPrompt(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  moduleKey: string,
): Promise<string | null> {
  const { data } = await adminClient
    .from('ai_system_prompts')
    .select('prompt_text')
    .eq('user_id', userId)
    .eq('module_key', moduleKey)
    .order('version', { ascending: false })
    .limit(1)
    .single();
  return (data?.prompt_text as string | null) ?? null;
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
