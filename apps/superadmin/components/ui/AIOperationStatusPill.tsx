'use client';

import { CheckCircle2, Clock3, Loader2, XCircle } from 'lucide-react';

export type AIOperationStatus = 'idle' | 'running' | 'success' | 'error';

type TokenUsage = {
  inputTokens?: number | null;
  outputTokens?: number | null;
};

export type AIOperationSummary = {
  durationSeconds?: number | null;
  responseStatus?: number | null;
  provider?: string | null;
  model?: string | null;
  usage?: TokenUsage | null;
};

type AIOperationStatusPillProps = {
  status: AIOperationStatus;
  elapsedSeconds?: number;
  summary?: AIOperationSummary | null;
  runningLabel?: string;
  successLabel?: string;
  errorLabel?: string;
};

export function AIOperationStatusPill({
  status,
  elapsedSeconds,
  summary,
  runningLabel = 'AI 正在生成中',
  successLabel = '本次生成完成',
  errorLabel = '本次生成失敗',
}: AIOperationStatusPillProps) {
  if (status === 'idle') return null;

  const inputTokens = summary?.usage?.inputTokens ?? null;
  const outputTokens = summary?.usage?.outputTokens ?? null;
  const hasTokens = Boolean(inputTokens) || Boolean(outputTokens);
  const totalTokens = hasTokens ? (inputTokens ?? 0) + (outputTokens ?? 0) : null;

  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex flex-wrap items-center gap-2 rounded-full border border-border-default bg-bg-secondary px-3 py-1 text-xs text-text-secondary"
    >
      {status === 'running' ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>{runningLabel}</span>
          {typeof elapsedSeconds === 'number' ? (
            <span className="inline-flex items-center gap-1 text-text-muted">
              <Clock3 className="h-3.5 w-3.5" />
              已經過 {elapsedSeconds.toFixed(1)}s
            </span>
          ) : null}
        </>
      ) : (
        <>
          {status === 'success' ? (
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              {successLabel}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5 text-red-500" />
              {errorLabel}
            </span>
          )}

          {summary?.durationSeconds != null ? (
            <span className="inline-flex items-center gap-1 text-text-muted">
              <Clock3 className="h-3.5 w-3.5" />
              {summary.durationSeconds.toFixed(1)}s
            </span>
          ) : null}

          {totalTokens != null ? (
            <span className="text-text-muted">
              Tokens {totalTokens.toLocaleString()}（in {(inputTokens ?? 0).toLocaleString()} / out{' '}
              {(outputTokens ?? 0).toLocaleString()}）
            </span>
          ) : null}

          {summary?.provider && summary?.model ? (
            <span className="text-text-muted">
              {summary.provider}/{summary.model}
            </span>
          ) : null}

          {summary?.responseStatus != null ? <span className="text-text-muted">HTTP {summary.responseStatus}</span> : null}
        </>
      )}
    </span>
  );
}

