'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bot, CheckCircle2, CircleAlert, CircleHelp, Clock3, ExternalLink, Loader2, XCircle } from 'lucide-react';

interface TranscriptAiStageTracePanelProps {
  run: {
    status: string;
    currentPhase: string | null;
    detectionResult: Record<string, unknown>;
    parsedResult: Record<string, unknown>;
    reviewResult: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
    id?: string;
  } | null;
}

interface StageModel {
  provider: string;
  model: string;
  role: string;
  status?: string | null;
  startedAt?: string | null;
  durationMs?: number | null;
  confidence?: number | null;
  errorMessage?: string | null;
  reportUrl?: string | null;
}

interface StageTrace {
  stage: string;
  label: string;
  status: string;
  engine: string;
  durationMs?: number | null;
  agentKey?: string | null;
  moduleKey?: string | null;
  promptSource?: string | null;
  models: StageModel[];
  confidence?: number | null;
  summary: string[];
  corrections: string[];
  warnings: string[];
  errorMessage?: string | null;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asString(value: unknown, fallback = '—'): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '空值';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return '複合值';
  }
}

function modelListFromMetadata(metadata: unknown): StageModel[] {
  const rec = asObject(metadata);
  const rawModels = Array.isArray(rec.models_used) ? rec.models_used : [];
  return rawModels.flatMap((raw): StageModel[] => {
    const item = asObject(raw);
    const provider = typeof item.provider === 'string' ? item.provider : null;
    const model = typeof item.model === 'string' ? item.model : null;
    if (!provider || !model) return [];
    return [{
      provider,
      model,
      role: provider === 'local' ? 'local' : 'parse',
      durationMs: asNumber(item.duration_ms),
    }];
  });
}

function dedupeModels(models: StageModel[]): StageModel[] {
  const seen = new Set<string>();
  return models.filter((model) => {
    const key = `${model.role}:${model.provider}:${model.model}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function issueCorrections(review: Record<string, unknown>): string[] {
  const rawIssues = Array.isArray(review.issues) ? review.issues : [];
  return rawIssues.flatMap((raw): string[] => {
    const issue = asObject(raw);
    if (issue.suggestedValue === undefined || issue.suggestedValue === null) return [];
    return [`${asString(issue.fieldPath)} 建議改為 ${formatValue(issue.suggestedValue)}`];
  });
}

function issueWarnings(review: Record<string, unknown>): string[] {
  const rawIssues = Array.isArray(review.issues) ? review.issues : [];
  const issues = rawIssues.map((raw) => {
    const issue = asObject(raw);
    return `${asString(issue.severity, 'warning')}: ${asString(issue.message)}`;
  });
  return [...issues, ...stringList(review.userConfirmationRequired)];
}

function parseStageTraceFromRaw(value: unknown): StageTrace[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw) => {
    const item = asObject(raw);
    const modelsRaw = Array.isArray(item.models) ? item.models : [];
    return {
      stage: asString(item.stage, 'unknown'),
      label: asString(item.label, 'AI 階段'),
      status: asString(item.status, 'skipped'),
      engine: asString(item.engine, '—'),
      durationMs: asNumber(item.durationMs),
      agentKey: typeof item.agentKey === 'string' ? item.agentKey : null,
      moduleKey: typeof item.moduleKey === 'string' ? item.moduleKey : null,
      promptSource: typeof item.promptSource === 'string' ? item.promptSource : null,
      models: modelsRaw.flatMap((rawModel): StageModel[] => {
        const model = asObject(rawModel);
        const provider = typeof model.provider === 'string' ? model.provider : null;
        const modelId = typeof model.model === 'string' ? model.model : null;
        if (!provider || !modelId) return [];
        return [{
          provider,
          model: modelId,
          role: asString(model.role, 'parse'),
          status: typeof model.status === 'string' ? model.status : null,
          startedAt: typeof model.startedAt === 'string' ? model.startedAt : null,
          durationMs: asNumber(model.durationMs),
          confidence: asNumber(model.confidence),
          errorMessage: typeof model.errorMessage === 'string' ? model.errorMessage : null,
          reportUrl: typeof model.reportUrl === 'string' ? model.reportUrl : null,
        }];
      }),
      confidence: asNumber(item.confidence),
      summary: stringList(item.summary),
      corrections: stringList(item.corrections),
      warnings: stringList(item.warnings),
      errorMessage: typeof item.errorMessage === 'string' ? item.errorMessage : null,
    };
  });
}

function fallbackTrace(run: TranscriptAiStageTracePanelProps['run']): StageTrace[] {
  if (!run) return [];
  const detection = asObject(run.detectionResult);
  const parsed = asObject(run.parsedResult);
  const review = asObject(run.reviewResult);
  const documents = Array.isArray(parsed.documents) ? parsed.documents.map(asObject) : [];
  const parseModels = dedupeModels(documents.flatMap((doc) => modelListFromMetadata(doc.consensusMetadata)));
  const hasLocal = parseModels.some((model) => model.role === 'local');
  return [
    {
      stage: 'detect',
      label: 'Detect 初判',
      status: stringList(detection.riskFlags).some((flag) => flag.includes('failed')) ? 'failed' : 'skipped',
      engine: 'vlm_ai',
      durationMs: null,
      agentKey: 'transcript_detection',
      moduleKey: 'transcript.intake.detect',
      promptSource: null,
      models: [],
      confidence: null,
      summary: [
        `物件型態：${asString(detection.dispositionKind)}`,
        `文件類型：${stringList(detection.documentKinds).join('、') || '—'}`,
      ],
      corrections: [],
      warnings: stringList(detection.riskFlags),
    },
    {
      stage: 'parse',
      label: 'Parse 正式擷取',
      status: documents.length ? 'success' : 'skipped',
      engine: hasLocal ? 'local_python_text' : 'vlm_ai',
      durationMs: null,
      agentKey: hasLocal ? null : 'transcript_visual_parse',
      moduleKey: hasLocal ? null : 'transcript.parse',
      promptSource: null,
      models: parseModels,
      confidence: null,
      summary: [`完成 ${documents.filter((doc) => doc.parsedResult).length}/${documents.length} 份文件解析`],
      corrections: [],
      warnings: [],
    },
    {
      stage: 'verify_review',
      label: 'Verify / Review 驗證審查',
      status: Object.keys(review).length ? 'success' : 'skipped',
      engine: 'vlm_ai',
      durationMs: null,
      agentKey: 'transcript_audit',
      moduleKey: 'transcript.intake.review',
      promptSource: null,
      models: [],
      confidence: asNumber(review.confidence),
      summary: [
        review.approved === true ? '審核結果：通過' : '審核結果：需人工確認',
        `判定型態：${asString(review.dispositionKind)}`,
      ],
      corrections: issueCorrections(review),
      warnings: issueWarnings(review),
    },
    {
      stage: 'detail_builder',
      label: 'Detail Builder 明細草稿',
      status: asObject(parsed.detailBuilderResult).areaDetailDraft ? 'success' : 'skipped',
      engine: 'vlm_ai',
      durationMs: null,
      agentKey: 'transcript_detail_builder',
      moduleKey: 'transcript.intake.detail_builder',
      promptSource: null,
      models: [],
      confidence: asNumber(asObject(parsed.detailBuilderResult).confidence),
      summary: stringList(asObject(parsed.detailBuilderResult).summary),
      corrections: [],
      warnings: [
        ...stringList(asObject(parsed.detailBuilderResult).warnings),
        ...stringList(asObject(parsed.detailBuilderResult).userConfirmationRequired),
      ],
    },
  ];
}

function getTrace(run: TranscriptAiStageTracePanelProps['run']): StageTrace[] {
  const trace = parseStageTraceFromRaw(asObject(run?.parsedResult).aiStageTrace);
  const fallback = fallbackTrace(run);
  if (!trace.length) return fallback;
  const byStage = new Map(trace.map((item) => [item.stage, item]));
  const merged = fallback.map((item) => byStage.get(item.stage) ?? item);
  const fallbackStages = new Set(fallback.map((item) => item.stage));
  return [
    ...merged,
    ...trace.filter((item) => !fallbackStages.has(item.stage)),
  ];
}

function statusLabel(status: string): string {
  switch (status) {
    case 'running':
      return '處理中';
    case 'success':
      return '成功';
    case 'fallback':
      return 'Fallback';
    case 'failed':
      return '失敗';
    case 'skipped':
      return '未執行';
    default:
      return status;
  }
}

function stageIsActive(run: TranscriptAiStageTracePanelProps['run'], stage: string): boolean {
  if (!run) return false;
  if (stage === 'detect') return run.status === 'route_selected' || run.status === 'detecting';
  if (stage === 'parse') return run.status === 'parsing' || run.currentPhase?.startsWith('parsing') === true;
  if (stage === 'verify_review') return run.status === 'reviewing' && run.currentPhase !== 'detail_builder';
  if (stage === 'detail_builder') return run.status === 'reviewing' && run.currentPhase === 'detail_builder';
  return false;
}

function stageStartedAt(
  run: TranscriptAiStageTracePanelProps['run'],
  trace: StageTrace,
  traces: StageTrace[],
): number | null {
  if (!run) return null;
  const runStart = new Date(run.createdAt).getTime();
  if (Number.isFinite(runStart)) {
    const priorDuration = traces
      .slice(0, traces.findIndex((item) => item.stage === trace.stage))
      .reduce((total, item) => total + (typeof item.durationMs === 'number' ? item.durationMs : 0), 0);
    if (priorDuration > 0 || trace.stage === 'detect') return runStart + priorDuration;
  }
  const raw = run.updatedAt || run.createdAt;
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : null;
}

function formatDuration(ms: number): string {
  return `${(Math.max(0, ms) / 1000).toFixed(1)} 秒`;
}

function modelReportLabel(role: string): string {
  if (role === 'detail_builder') return '明細草稿報告';
  return role === 'review' ? '審查報告' : '解析報告';
}

function modelStartedAtMs(model: StageModel): number | null {
  if (!model.startedAt) return null;
  const time = new Date(model.startedAt).getTime();
  return Number.isFinite(time) ? time : null;
}

const DEFAULT_ACTIVE_MODEL_TARGET = 3;

function modelIsTerminal(model: StageModel): boolean {
  return model.status === 'success' ||
    model.status === 'error' ||
    model.status === 'cancelled' ||
    model.status === 'skipped' ||
    typeof model.durationMs === 'number' ||
    Boolean(model.errorMessage);
}

function inferredRunningModelStartedAt(params: {
  isActive: boolean;
  model: StageModel;
  modelIndex: number;
  models: StageModel[];
  stageStartedAtMs: number | null;
}): number | null {
  if (!params.isActive || modelIsTerminal(params.model)) return null;

  const explicitStartedAt = modelStartedAtMs(params.model);
  if (params.model.status === 'running') return explicitStartedAt ?? params.stageStartedAtMs;
  if (params.model.status && params.model.status !== 'pending') return null;
  if (params.model.role !== 'parse' && params.model.role !== 'review') return null;

  const terminalBefore = params.models
    .slice(0, params.modelIndex)
    .filter(modelIsTerminal)
    .length;
  const inferredLaunchedCount = Math.min(
    params.models.length,
    DEFAULT_ACTIVE_MODEL_TARGET + terminalBefore,
  );
  if (params.modelIndex >= inferredLaunchedCount) return null;

  if (params.modelIndex < DEFAULT_ACTIVE_MODEL_TARGET) return params.stageStartedAtMs;

  const priorTerminalDurations = params.models
    .slice(0, params.modelIndex)
    .flatMap((model) => typeof model.durationMs === 'number' ? [model.durationMs] : []);
  if (!params.stageStartedAtMs || !priorTerminalDurations.length) return params.stageStartedAtMs;
  return params.stageStartedAtMs + Math.min(...priorTerminalDurations);
}

function modelStatusLabel(model: StageModel, isActive: boolean, modelStart: number | null): string {
  if (model.status === 'error' || model.errorMessage) return '失敗';
  if (model.status === 'cancelled') return '已取消';
  if (model.status === 'skipped') return '候補未執行';
  if (model.status === 'running' || modelStart !== null) return '執行中';
  if (model.status === 'success' || typeof model.durationMs === 'number') return '已執行';
  if (model.status === 'pending' && isActive) return '候補等待';
  if (model.status === 'pending') return '候補未執行';
  if (!isActive && !model.status && typeof model.durationMs !== 'number') return '候補未執行';
  return '狀態未記錄';
}

function modelStatusClass(label: string): string {
  if (label === '執行中') return 'text-accent';
  if (label === '已執行') return 'text-green-700';
  if (label === '失敗') return 'text-yellow-700';
  if (label === '已取消') return 'text-text-muted';
  if (label === '候補未執行' || label === '候補等待') return 'text-text-muted';
  return 'text-text-secondary';
}

function displaySummary(trace: StageTrace, isActive: boolean): string[] {
  if (!isActive) return trace.summary;
  if (trace.stage === 'parse' && trace.summary.includes('等待正式解析開始')) {
    return ['Parser 正在解析上傳文件'];
  }
  if (trace.stage === 'verify_review' && trace.summary.includes('等待驗證審查開始')) {
    return ['Reviewer 正在審查 parser 報告'];
  }
  return trace.summary;
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'running') return <Loader2 size={14} className="animate-spin text-accent" />;
  if (status === 'success') return <CheckCircle2 size={14} className="text-green-600" />;
  if (status === 'fallback') return <CircleAlert size={14} className="text-yellow-600" />;
  if (status === 'failed') return <XCircle size={14} className="text-red-600" />;
  return <CircleHelp size={14} className="text-text-muted" />;
}

export function TranscriptAiStageTracePanel({ run }: TranscriptAiStageTracePanelProps) {
  const traces = useMemo(() => getTrace(run), [run]);
  const hasActiveStage = traces.some((trace) => stageIsActive(run, trace.stage));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!hasActiveStage) return;
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [hasActiveStage]);

  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary px-4 py-3">
      <div className="flex items-center gap-2">
        <Bot size={15} className="text-accent" />
        <h3 className="text-sm font-semibold text-text-primary">AI 品質追蹤</h3>
      </div>
      <p className="mt-2 text-xs text-text-muted">
        顯示 detect、parse、verify/review、detail builder 各階段使用的 AI 或本地解析器、結果摘要與修正建議。
      </p>

      {traces.length ? (
        <div className="mt-3 grid gap-2">
          {traces.map((trace) => {
            const isActive = stageIsActive(run, trace.stage);
            const startedAt = stageStartedAt(run, trace, traces);
            const elapsedMs = isActive && startedAt ? now - startedAt : null;
            const shownStatus = isActive ? 'running' : trace.status;
            const durationMs = trace.durationMs ?? null;

            return (
            <div key={trace.stage} className="rounded-md border border-border-default bg-bg-primary px-3 py-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <StatusIcon status={shownStatus} />
                    <p className="text-xs font-semibold text-text-primary">{trace.label}</p>
                  </div>
                  <p className="mt-1 text-[11px] text-text-muted">
                    {trace.agentKey ?? 'local'} / {trace.moduleKey ?? trace.engine}
                    {trace.promptSource ? ` / prompt: ${trace.promptSource}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  <span className="inline-flex w-fit rounded border border-border-default bg-bg-tertiary px-2 py-1 text-[11px] font-medium text-text-secondary">
                    {isActive ? '處理中' : statusLabel(trace.status)} · {trace.engine}
                  </span>
                  {isActive && elapsedMs !== null ? (
                    <span className="inline-flex w-fit items-center gap-1 rounded border border-accent/30 bg-accent/10 px-2 py-1 text-[11px] font-medium text-accent">
                      <Clock3 size={11} />
                      已花費 {formatDuration(elapsedMs)}
                    </span>
                  ) : durationMs !== null && trace.status !== 'skipped' ? (
                    <span className="inline-flex w-fit items-center gap-1 rounded border border-border-default bg-bg-tertiary px-2 py-1 text-[11px] font-medium text-text-secondary">
                      <Clock3 size={11} />
                      花費 {formatDuration(durationMs)}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {trace.models.length ? trace.models.map((model, modelIndex) => {
                  const modelStart = inferredRunningModelStartedAt({
                    isActive,
                    model,
                    modelIndex,
                    models: trace.models,
                    stageStartedAtMs: startedAt,
                  });
                  const modelElapsedMs = modelStart !== null ? now - modelStart : null;
                  const statusText = modelStatusLabel(model, isActive, modelStart);
                  const reportUrl = typeof model.reportUrl === 'string' ? model.reportUrl : null;
                  return (
                    <span
                      key={`${trace.stage}-${model.role}-${model.provider}-${model.model}`}
                      className="inline-flex items-center gap-1.5 rounded border border-border-default bg-bg-secondary px-2 py-1 text-[11px] text-text-secondary"
                    >
                      <span>{model.role}: {model.provider}/{model.model}</span>
                      <span className={modelStatusClass(statusText)}>{statusText}</span>
                      {modelElapsedMs !== null ? (
                        <span className="text-accent">工作中 {formatDuration(modelElapsedMs)}</span>
                      ) : typeof model.durationMs === 'number' ? (
                        <span>花費 {formatDuration(model.durationMs)}</span>
                      ) : null}
                      {typeof model.confidence === 'number' ? (
                        <span>審查信心 {Math.round(model.confidence * 100)}%</span>
                      ) : null}
                      {model.errorMessage ? (
                        <span className="text-yellow-700">錯誤：{model.errorMessage}</span>
                      ) : null}
                      {reportUrl && !isActive ? (
                        <a
                          href={reportUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 text-accent hover:underline"
                        >
                          {modelReportLabel(model.role)}
                          <ExternalLink size={10} />
                        </a>
                      ) : null}
                    </span>
                  );
                }) : (
                  <span className="rounded border border-border-default bg-bg-secondary px-2 py-1 text-[11px] text-text-muted">
                    尚無模型紀錄
                  </span>
                )}
                {typeof trace.confidence === 'number' ? (
                  <span className="rounded border border-border-default bg-bg-secondary px-2 py-1 text-[11px] text-text-secondary">
                    審查信心 {Math.round(trace.confidence * 100)}%
                  </span>
                ) : null}
              </div>

              {displaySummary(trace, isActive).length ? (
                <ul className="mt-2 space-y-1 text-[11px] text-text-secondary">
                  {displaySummary(trace, isActive).map((item) => <li key={item}>{item}</li>)}
                </ul>
              ) : null}

              {trace.corrections.length ? (
                <div className="mt-2 rounded border border-green-500/20 bg-green-500/5 px-2 py-1.5">
                  <p className="text-[11px] font-medium text-green-700">修正／建議</p>
                  <ul className="mt-1 space-y-1 text-[11px] text-green-700">
                    {trace.corrections.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              ) : null}

              {trace.warnings.length || trace.errorMessage ? (
                <div className="mt-2 rounded border border-yellow-500/20 bg-yellow-500/5 px-2 py-1.5">
                  <p className="text-[11px] font-medium text-yellow-700">警示／人工確認</p>
                  <ol className="mt-1 list-decimal space-y-1 pl-4 text-[11px] text-yellow-700">
                    {[trace.errorMessage, ...trace.warnings]
                      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
                      .map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
                  </ol>
                </div>
              ) : null}
            </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-xs text-text-muted">建立並判讀後，這裡會顯示 AI 階段品質紀錄。</p>
      )}
    </div>
  );
}
