'use client';

import { CheckCircle2, Clock3, Loader2, XCircle } from 'lucide-react';

export type AIOperationStatus = 'idle' | 'running' | 'success' | 'error';

export type AIOperationSummary = {
  durationSeconds?: number | null;
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
  runningLabel = 'AI 解析中',
  successLabel = '本次解析完成',
  errorLabel = '本次解析失敗',
}: AIOperationStatusPillProps) {
  if (status === 'idle') return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="inline-flex flex-wrap items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700"
    >
      {status === 'running' ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
          <span>{runningLabel}</span>
          {typeof elapsedSeconds === 'number' ? (
            <span className="inline-flex items-center gap-1 text-gray-500">
              <Clock3 className="h-3.5 w-3.5" />
              已經過 {elapsedSeconds.toFixed(1)}s
            </span>
          ) : null}
        </>
      ) : (
        <>
          {status === 'success' ? (
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              {successLabel}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5 text-red-600" />
              {errorLabel}
            </span>
          )}
          {summary?.durationSeconds != null ? (
            <span className="inline-flex items-center gap-1 text-gray-500">
              <Clock3 className="h-3.5 w-3.5" />
              {summary.durationSeconds.toFixed(1)}s
            </span>
          ) : null}
        </>
      )}
    </div>
  );
}

