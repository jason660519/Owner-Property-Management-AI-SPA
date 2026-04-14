'use client';

// Expandable detail panel for a Paperclip task — shows run log, worktree
// info, copy-able git commands, and worktree cleanup. Designed to be rendered
// inline below a table row or in a side drawer.

import { useState, useCallback } from 'react';
import {
  ExternalLink, GitBranch, Copy, Trash2, Loader2,
  Terminal, ChevronDown, ChevronUp, CheckCircle2,
  Play, Pause, Activity, RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';
import type { WorktreePaths } from '@/lib/paperclip/worktree';
import type { UsePaperclipTaskStatusReturn } from '@/lib/hooks/usePaperclipTaskStatus';
import { formatPaperclipErrorWithHint } from '@/lib/paperclip/api-error-meta';
import TaskStatusChip from './TaskStatusChip';

interface TaskDetailPanelProps {
  issueId: string;
  issueUrl: string;
  userId: string;
  worktree?: WorktreePaths;
  taskStatus: UsePaperclipTaskStatusReturn;
  agentId?: string;
  adapterType?: string;
  model?: string;
  onClose: () => void;
}

type CleanupPhase = 'idle' | 'sending' | 'done' | 'error';

export default function TaskDetailPanel({
  issueId, issueUrl, userId, worktree, taskStatus, agentId, adapterType, model, onClose,
}: TaskDetailPanelProps) {
  const { runLog } = taskStatus;
  const [showRunLog, setShowRunLog] = useState(true);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [cleanupPhase, setCleanupPhase] = useState<CleanupPhase>('idle');
  const [cleanupError, setCleanupError] = useState<string | null>(null);
  const [opsAction, setOpsAction] = useState<'idle' | 'resuming' | 'pausing' | 'heartbeat'>('idle');

  const handleResume = useCallback(async () => {
    if (!agentId) return;
    setOpsAction('resuming');
    try {
      await fetch(`/api/paperclip/agents/${encodeURIComponent(agentId)}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify(adapterType ? { adapterType } : {}),
      });
    } catch { /* ignore */ }
    setOpsAction('idle');
  }, [agentId, adapterType, userId]);

  const handlePause = useCallback(async () => {
    if (!agentId) return;
    setOpsAction('pausing');
    try {
      await fetch(`/api/paperclip/agents/${encodeURIComponent(agentId)}/pause`, {
        method: 'POST',
        headers: { 'x-user-id': userId },
      });
    } catch { /* ignore */ }
    setOpsAction('idle');
  }, [agentId, userId]);

  const handleHeartbeat = useCallback(async () => {
    setOpsAction('heartbeat');
    try {
      await fetch('/api/paperclip/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      });
    } catch { /* ignore */ }
    setOpsAction('idle');
  }, [userId]);

  const handleCopy = useCallback(async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCmd(key);
      window.setTimeout(() => setCopiedCmd(null), 1500);
    } catch { /* no clipboard */ }
  }, []);

  const handleCleanup = useCallback(async () => {
    if (!worktree) return;
    const confirmed = window.confirm(
      `確定要刪除 worktree + branch？\n\nslug: ${worktree.slug}\nbranch: ${worktree.branchName}\n\n⚠️ 未 merge 的 commit 會遺失。`,
    );
    if (!confirmed) return;

    setCleanupPhase('sending');
    setCleanupError(null);
    try {
      const res = await fetch('/api/paperclip/worktrees/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ slug: worktree.slug, deleteBranch: true }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) {
        setCleanupPhase('done');
      } else {
        setCleanupPhase('error');
        setCleanupError(formatPaperclipErrorWithHint({
          httpStatus: res.status,
          message: json.error ?? `HTTP ${res.status}`,
        }));
      }
    } catch (err) {
      setCleanupPhase('error');
      setCleanupError(formatPaperclipErrorWithHint({
        httpStatus: 0,
        message: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  }, [worktree, userId]);

  return (
    <div className="rounded-md border border-border-default bg-bg-primary p-3 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <p className="text-xs font-medium text-text-primary">Paperclip Issue</p>
          <TaskStatusChip taskStatus={taskStatus} />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[10px] text-text-muted hover:text-text-primary"
        >
          收起
        </button>
      </div>

      {/* Issue link */}
      <div className="text-[10px] text-text-secondary">
        <span className="font-mono">{issueId.slice(0, 12)}</span>
        <a
          href={issueUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 inline-flex items-center gap-0.5 text-emerald-700 hover:underline dark:text-emerald-400"
        >
          在 Paperclip 開啟 <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Agent / adapter info + ops buttons */}
      {agentId && (
        <div className="flex flex-wrap items-center gap-2 rounded border border-sky-500/30 bg-bg-primary/60 p-2">
          <div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
            <Activity className="h-3 w-3 text-sky-600 dark:text-sky-400" />
            <span>Agent: <span className="font-mono">{agentId.slice(0, 12)}</span></span>
            {adapterType && <span className="rounded bg-bg-tertiary px-1">{adapterType}</span>}
            {model && <span className="font-mono text-text-muted">{model}</span>}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            {opsAction !== 'idle' ? (
              <Loader2 className="h-3 w-3 animate-spin text-text-muted" />
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleResume}
                  className="inline-flex items-center gap-0.5 rounded border border-emerald-500/40 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                >
                  <Play className="h-2.5 w-2.5" /> Resume
                </button>
                <button
                  type="button"
                  onClick={handlePause}
                  className="inline-flex items-center gap-0.5 rounded border border-amber-500/40 px-1.5 py-0.5 text-[9px] font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40"
                >
                  <Pause className="h-2.5 w-2.5" /> Pause
                </button>
                <button
                  type="button"
                  onClick={handleHeartbeat}
                  className="inline-flex items-center gap-0.5 rounded border border-sky-500/40 px-1.5 py-0.5 text-[9px] font-medium text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/40"
                >
                  <RefreshCw className="h-2.5 w-2.5" /> Heartbeat
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Run log */}
      {runLog && (runLog.stdoutExcerpt || runLog.runStatus) && (
        <div className="rounded border border-indigo-500/30 bg-bg-primary/60 p-2">
          <button
            type="button"
            onClick={() => setShowRunLog(s => !s)}
            className="flex w-full items-center justify-between text-left"
            aria-expanded={showRunLog}
          >
            <div className="flex items-center gap-1 text-[10px] font-medium text-text-secondary">
              <Terminal className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
              <span>Run log</span>
              {runLog.runStatus && (
                <span className="font-mono text-[9px] text-text-muted">· {runLog.runStatus}</span>
              )}
            </div>
            {showRunLog
              ? <ChevronUp className="h-3 w-3 text-text-muted" />
              : <ChevronDown className="h-3 w-3 text-text-muted" />
            }
          </button>
          {showRunLog && (
            <>
              {runLog.stdoutExcerpt ? (
                <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-bg-secondary p-1.5 text-[9px] font-mono leading-snug text-text-secondary">
                  {runLog.stdoutExcerpt}
                </pre>
              ) : (
                <p className="mt-1 text-[10px] italic text-text-muted">(等待 agent 產生輸出…)</p>
              )}
              {runLog.stderrExcerpt && (
                <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap rounded bg-red-500/10 p-1.5 text-[9px] font-mono leading-snug text-red-700 dark:text-red-400">
                  {runLog.stderrExcerpt}
                </pre>
              )}
              {runLog.exitCode !== undefined && (
                <p className="mt-1 text-[9px] text-text-muted">
                  exit code: <span className="font-mono">{runLog.exitCode}</span>
                  {runLog.startedAt && runLog.finishedAt && (
                    <span> · duration: {Math.round((Date.parse(runLog.finishedAt) - Date.parse(runLog.startedAt)) / 1000)}s</span>
                  )}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Worktree info */}
      {worktree && (
        <div className="rounded border border-emerald-500/30 bg-bg-primary/60 p-2">
          <div className="flex items-center gap-1 text-[10px] font-medium text-text-secondary">
            <GitBranch className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            <span>Git Worktree</span>
          </div>
          <dl className="mt-1 space-y-0.5 text-[10px] text-text-secondary">
            <div className="flex gap-1">
              <dt className="shrink-0 text-text-muted">branch:</dt>
              <dd className="truncate font-mono" title={worktree.branchName}>{worktree.branchName}</dd>
            </div>
            <div className="flex gap-1">
              <dt className="shrink-0 text-text-muted">cwd:</dt>
              <dd className="truncate font-mono" title={worktree.containerPath}>{worktree.containerPath}</dd>
            </div>
          </dl>

          {/* Git commands */}
          <div className="mt-1.5 space-y-1">
            {[
              { key: 'log', label: 'git log', cmd: `git log ${worktree.branchName}` },
              { key: 'diff', label: 'diff vs main', cmd: `git diff main..${worktree.branchName}` },
              { key: 'checkout', label: 'checkout', cmd: `git checkout ${worktree.branchName}` },
            ].map(({ key, label, cmd }) => (
              <div key={key} className="flex items-center gap-1.5">
                <code className="flex-1 truncate rounded bg-bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-text-secondary" title={cmd}>{cmd}</code>
                <button
                  type="button"
                  onClick={() => handleCopy(key, cmd)}
                  className="inline-flex items-center gap-0.5 rounded border border-border-default px-1.5 py-0.5 text-[9px] text-text-muted hover:bg-bg-secondary hover:text-text-primary"
                >
                  <Copy className="h-2.5 w-2.5" />
                  {copiedCmd === key ? '已複製' : '複製'}
                </button>
              </div>
            ))}
          </div>

          {/* Cleanup */}
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-emerald-500/20 pt-1.5">
            {cleanupPhase === 'done' ? (
              <p className="text-[10px] text-text-muted">Worktree + branch 已刪除。</p>
            ) : cleanupPhase === 'error' ? (
              <p className="max-h-24 overflow-y-auto whitespace-pre-wrap break-words text-[10px] text-red-600 dark:text-red-400">
                刪除失敗：{cleanupError}
              </p>
            ) : (
              <p className="text-[10px] text-text-muted">審核後一鍵清除 worktree + branch：</p>
            )}
            <button
              type="button"
              onClick={handleCleanup}
              disabled={cleanupPhase === 'sending' || cleanupPhase === 'done'}
              className={clsx(
                'inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors',
                cleanupPhase === 'sending' || cleanupPhase === 'done'
                  ? 'cursor-not-allowed border-border-default text-text-muted'
                  : 'border-red-500/50 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40',
              )}
            >
              {cleanupPhase === 'sending' ? (
                <><Loader2 className="h-3 w-3 animate-spin" />刪除中</>
              ) : (
                <><Trash2 className="h-3 w-3" />刪除 worktree</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
