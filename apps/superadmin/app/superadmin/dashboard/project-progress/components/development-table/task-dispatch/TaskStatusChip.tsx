'use client';

// Inline badge for a table row showing Paperclip issue live status + cost.
// Clicking opens TaskDetailPanel (handled by parent via onClick).

import { Loader2, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { STATUS_BADGE_STYLE } from './status-styles';
import { POLL_CONSECUTIVE_ERROR_LIMIT } from '@/lib/paperclip/polling';
import type { UsePaperclipTaskStatusReturn } from '@/lib/hooks/usePaperclipTaskStatus';

interface TaskStatusChipProps {
  taskStatus: UsePaperclipTaskStatusReturn;
  onClick?: () => void;
}

export default function TaskStatusChip({ taskStatus, onClick }: TaskStatusChipProps) {
  const { liveStatus, cost, pollStopped, retriggerPoll } = taskStatus;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {/* Cost chip */}
      {cost && (cost.costUsd !== undefined || cost.inputTokens !== undefined) && (
        <span
          className="inline-flex items-center gap-1 rounded-full border border-border-default bg-bg-secondary px-2 py-0.5 text-[9px] font-mono text-text-secondary"
          title={
            `model: ${cost.model ?? 'unknown'}\n` +
            `input tokens: ${cost.inputTokens?.toLocaleString() ?? '?'}\n` +
            `output tokens: ${cost.outputTokens?.toLocaleString() ?? '?'}\n` +
            `cached input: ${cost.cachedInputTokens?.toLocaleString() ?? '?'}`
          }
        >
          {cost.costUsd !== undefined ? `$${cost.costUsd.toFixed(4)}` : '$—'}
          {cost.inputTokens !== undefined && cost.outputTokens !== undefined && (
            <span className="text-text-muted">
              · {cost.inputTokens.toLocaleString()}→{cost.outputTokens.toLocaleString()}
            </span>
          )}
        </span>
      )}

      {/* Status badge */}
      {liveStatus && (
        <button
          type="button"
          onClick={onClick}
          className={clsx(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-medium cursor-pointer hover:opacity-80',
            STATUS_BADGE_STYLE[liveStatus.status].className,
          )}
          title={`Paperclip status · 最後更新 ${liveStatus.updatedAt ?? ''}`}
        >
          {!liveStatus.terminal && (
            <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden="true" />
          )}
          {STATUS_BADGE_STYLE[liveStatus.status].label}
        </button>
      )}

      {/* Poll stopped warning */}
      {pollStopped && (
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-amber-500/50 bg-amber-50 px-2 py-0.5 text-[9px] font-medium text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50"
          title={`連續 ${POLL_CONSECUTIVE_ERROR_LIMIT} 次輪詢失敗，已停止自動更新`}
          onClick={(e) => {
            e.stopPropagation();
            retriggerPoll();
          }}
        >
          <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
          連線中斷 · 重試
        </button>
      )}

      {/* Loading state — no status yet */}
      {!liveStatus && !pollStopped && (
        <span className="inline-flex items-center gap-1 rounded-full border border-border-default bg-bg-secondary px-2 py-0.5 text-[9px] text-text-muted">
          <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden="true" />
          載入中
        </span>
      )}
    </div>
  );
}
