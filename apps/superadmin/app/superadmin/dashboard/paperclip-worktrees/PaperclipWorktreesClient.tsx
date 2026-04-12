'use client';

// Mission-control page for all active Paperclip worktrees.
// - Polls GET /api/paperclip/worktrees every 10s
// - Shows one row per worktree with branch, commits, last activity, prunable flag
// - Per-row "刪除 worktree" calls POST /api/paperclip/worktrees/cleanup
// - Empty state + error state + manual refresh button

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GitBranch,
  GitMerge,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Loader2,
  Inbox,
  Copy,
  ExternalLink,
  Eye,
  X,
  CheckCircle2,
} from 'lucide-react';
import clsx from 'clsx';
import type { WorktreeSummary, WorktreeDiffResult } from '@/lib/paperclip/worktree';
import DiffViewer from '@/components/paperclip/DiffViewer';
import { getPaperclipConfig } from '@/lib/paperclip/config';
import { buildPaperclipIssueSearchUrl } from '@/lib/paperclip/links';

type DiffViewerState =
  | { phase: 'closed' }
  | { phase: 'loading'; slug: string }
  | { phase: 'ok'; slug: string; snapshot: WorktreeDiffResult }
  | { phase: 'error'; slug: string; message: string };

type MergeState =
  | { phase: 'idle' }
  | { phase: 'sending'; dryRun: boolean }
  | {
      phase: 'done';
      dryRun: boolean;
      mergeSha: string;
      mergedBranch: string;
      commitsMerged: number;
      cleanupOk: boolean | null;
    }
  | {
      phase: 'error';
      dryRun: boolean;
      reason: string;
      message: string;
      offendingPaths?: string[];
      stderr?: string;
    };

type FetchState =
  | { phase: 'loading' }
  | { phase: 'ok'; worktrees: WorktreeSummary[]; fetchedAt: number }
  | { phase: 'error'; message: string };

type CleanupState = Record<
  string,
  { phase: 'sending' } | { phase: 'done' } | { phase: 'error'; message: string }
>;

type FilterMode = 'all' | 'with-commits' | 'prunable' | 'mapped-issues';
type SortMode = 'recent' | 'commits-desc' | 'branch-asc' | 'cost-desc';
type CostState = Record<
  string,
  | { phase: 'loading' }
  | {
      phase: 'ok';
      issueId: string;
      costUsd?: number;
      runStatus?: string;
      inputTokens?: number;
      outputTokens?: number;
    }
  | { phase: 'error'; message: string }
>;

function formatRelative(iso?: string): string {
  if (!iso) return '—';
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return iso;
  const diff = Date.now() - then;
  if (diff < 0) return 'just now';
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export default function PaperclipWorktreesClient() {
  const paperclipBaseUrl = useMemo(
    () => getPaperclipConfig().baseUrl.replace(/\/+$/, ''),
    [],
  );
  const [state, setState] = useState<FetchState>({ phase: 'loading' });
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [cleanupState, setCleanupState] = useState<CleanupState>({});
  const [costState, setCostState] = useState<CostState>({});
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [diffViewer, setDiffViewer] = useState<DiffViewerState>({ phase: 'closed' });
  const [mergeState, setMergeState] = useState<MergeState>({ phase: 'idle' });
  const abortRef = useRef<AbortController | null>(null);
  const diffAbortRef = useRef<AbortController | null>(null);
  const costAbortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch('/api/paperclip/worktrees', { signal: ctrl.signal });
      const json = (await res.json()) as
        | { ok: true; worktrees: WorktreeSummary[] }
        | { ok: false; error: string };
      if (!json.ok) {
        setState({ phase: 'error', message: json.error });
        return;
      }
      setState({ phase: 'ok', worktrees: json.worktrees, fetchedAt: Date.now() });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setState({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      void refresh();
    }, 10_000);
    return () => {
      window.clearInterval(interval);
      abortRef.current?.abort();
      costAbortRef.current?.abort();
    };
  }, [refresh]);

  const refreshCosts = useCallback(async (worktrees: WorktreeSummary[]) => {
    costAbortRef.current?.abort();
    const ctrl = new AbortController();
    costAbortRef.current = ctrl;
    const targets = worktrees.filter((w) => !!w.issueId);
    if (targets.length === 0) {
      setCostState({});
      return;
    }
    setCostState((prev) => {
      const next = { ...prev };
      for (const w of targets) {
        if (!next[w.slug] || next[w.slug]?.phase === 'error') {
          next[w.slug] = { phase: 'loading' };
        }
      }
      return next;
    });

    await Promise.all(
      targets.map(async (w) => {
        try {
          const res = await fetch(
            `/api/paperclip/issues/${encodeURIComponent(w.issueId as string)}/cost`,
            { signal: ctrl.signal },
          );
          const json = (await res.json()) as
            | {
                ok: true;
                snapshot: {
                  issueId: string;
                  costUsd?: number;
                  runStatus?: string;
                  inputTokens?: number;
                  outputTokens?: number;
                };
              }
            | { ok: false; error?: string };
          if (!json.ok) {
            setCostState((prev) => ({
              ...prev,
              [w.slug]: { phase: 'error', message: json.error ?? `HTTP ${res.status}` },
            }));
            return;
          }
          setCostState((prev) => ({
            ...prev,
            [w.slug]: {
              phase: 'ok',
              issueId: json.snapshot.issueId,
              costUsd: json.snapshot.costUsd,
              runStatus: json.snapshot.runStatus,
              inputTokens: json.snapshot.inputTokens,
              outputTokens: json.snapshot.outputTokens,
            },
          }));
        } catch (err) {
          if ((err as Error).name === 'AbortError') return;
          setCostState((prev) => ({
            ...prev,
            [w.slug]: {
              phase: 'error',
              message: err instanceof Error ? err.message : 'Unknown error',
            },
          }));
        }
      }),
    );
  }, []);

  useEffect(() => {
    if (state.phase !== 'ok') return;
    void refreshCosts(state.worktrees);
  }, [state, refreshCosts]);

  const handleDelete = useCallback(async (slug: string) => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        `確定要刪除 worktree + branch？\n\nslug: ${slug}\n\n⚠️ 這會執行 git worktree remove + git branch -D，未 merge 的 commit 都會遺失。`,
      )
    ) {
      return;
    }
    setCleanupState((prev) => ({ ...prev, [slug]: { phase: 'sending' } }));
    try {
      const res = await fetch('/api/paperclip/worktrees/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, deleteBranch: true }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        setCleanupState((prev) => ({
          ...prev,
          [slug]: { phase: 'error', message: json.error ?? `HTTP ${res.status}` },
        }));
        return;
      }
      setCleanupState((prev) => ({ ...prev, [slug]: { phase: 'done' } }));
      // Refresh list so the row disappears
      void refresh();
    } catch (err) {
      setCleanupState((prev) => ({
        ...prev,
        [slug]: {
          phase: 'error',
          message: err instanceof Error ? err.message : 'Unknown error',
        },
      }));
    }
  }, [refresh]);

  const handleCopy = useCallback(async (slug: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSlug(slug);
      window.setTimeout(() => setCopiedSlug((cur) => (cur === slug ? null : cur)), 1500);
    } catch {
      /* no-op */
    }
  }, []);

  const handleInspect = useCallback(async (slug: string) => {
    diffAbortRef.current?.abort();
    const ctrl = new AbortController();
    diffAbortRef.current = ctrl;
    setDiffViewer({ phase: 'loading', slug });
    try {
      const res = await fetch(`/api/paperclip/worktrees/${encodeURIComponent(slug)}/diff`, {
        signal: ctrl.signal,
      });
      const json = (await res.json()) as
        | ({ ok: true } & WorktreeDiffResult)
        | { ok: false; error: string; status?: number };
      if (!json.ok) {
        setDiffViewer({ phase: 'error', slug, message: json.error });
        return;
      }
      // Strip `ok: true` into the snapshot shape
      const { ok: _ok, ...snapshot } = json;
      void _ok;
      setDiffViewer({ phase: 'ok', slug, snapshot: snapshot as WorktreeDiffResult });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setDiffViewer({
        phase: 'error',
        slug,
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, []);

  const handleCloseDiff = useCallback(() => {
    diffAbortRef.current?.abort();
    setDiffViewer({ phase: 'closed' });
    setMergeState({ phase: 'idle' });
  }, []);

  const handleMerge = useCallback(
    async (slug: string, baseBranch: string, cleanupAfter: boolean, dryRun: boolean) => {
      // Dry-run needs no scary confirm — it doesn't modify state.
      if (
        !dryRun &&
        typeof window !== 'undefined' &&
        !window.confirm(
          `確定要 merge 這個 branch 到 ${baseBranch}？\n\n` +
            `slug  : ${slug}\n` +
            `branch: feature/paperclip-${slug}\n` +
            `cleanup after: ${cleanupAfter ? 'yes (刪除 worktree + branch)' : 'no'}\n\n` +
            `⚠️ 會執行 git merge --no-ff 到 ${baseBranch}。` +
            (cleanupAfter ? ' merge 成功後會自動刪除 worktree + branch。' : ''),
        )
      ) {
        return;
      }

      setMergeState({ phase: 'sending', dryRun });
      try {
        const res = await fetch(`/api/paperclip/worktrees/${encodeURIComponent(slug)}/merge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baseBranch, cleanup: cleanupAfter, dryRun }),
        });
        const json = (await res.json()) as
          | {
              ok: true;
              dryRun?: boolean;
              mergeSha: string;
              mergedBranch: string;
              commitsMerged: number;
              cleanup: { requested: boolean; ok: boolean | null; error?: string };
            }
          | {
              ok: false;
              reason: string;
              message: string;
              offendingPaths?: string[];
              stderr?: string;
            };
        if (json.ok) {
          setMergeState({
            phase: 'done',
            dryRun,
            mergeSha: json.mergeSha,
            mergedBranch: json.mergedBranch,
            commitsMerged: json.commitsMerged,
            cleanupOk: json.cleanup?.ok ?? null,
          });
          // Real merge may have removed the row via cleanup — refresh.
          // Dry-run doesn't change state, but refreshing is harmless.
          void refresh();
        } else {
          setMergeState({
            phase: 'error',
            dryRun,
            reason: json.reason,
            message: json.message,
            offendingPaths: json.offendingPaths,
            stderr: json.stderr,
          });
        }
      } catch (err) {
        setMergeState({
          phase: 'error',
          dryRun,
          reason: 'network',
          message: err instanceof Error ? err.message : 'Unknown network error',
        });
      }
    },
    [refresh],
  );

  // Close diff viewer on Escape
  useEffect(() => {
    if (diffViewer.phase === 'closed') return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleCloseDiff(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [diffViewer.phase, handleCloseDiff]);

  const displayedWorktrees = useMemo(() => {
    if (state.phase !== 'ok') return [];
    const search = searchQuery.trim().toLowerCase();
    const filtered = state.worktrees.filter((w) => {
      if (filterMode === 'with-commits' && w.commitCount === 0) return false;
      if (filterMode === 'prunable' && !w.prunable) return false;
      if (filterMode === 'mapped-issues' && !w.issueId) return false;
      if (!search) return true;
      return [w.slug, w.branchName, w.lastCommitSubject ?? '', w.issueKey ?? '']
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
    const ranked = [...filtered];
    ranked.sort((a, b) => {
      if (sortMode === 'branch-asc') return a.branchName.localeCompare(b.branchName);
      if (sortMode === 'commits-desc') return b.commitCount - a.commitCount;
      if (sortMode === 'cost-desc') {
        const aCost = costState[a.slug]?.phase === 'ok' ? (costState[a.slug] as { costUsd?: number }).costUsd ?? -1 : -1;
        const bCost = costState[b.slug]?.phase === 'ok' ? (costState[b.slug] as { costUsd?: number }).costUsd ?? -1 : -1;
        return bCost - aCost;
      }
      return (b.lastCommitAt ?? '').localeCompare(a.lastCommitAt ?? '');
    });
    return ranked;
  }, [state, searchQuery, filterMode, sortMode, costState]);

  const summary = useMemo(() => {
    if (state.phase !== 'ok') return null;
    const total = state.worktrees.length;
    const withCommits = state.worktrees.filter((w) => w.commitCount > 0).length;
    const prunable = state.worktrees.filter((w) => w.prunable).length;
    return { total, withCommits, prunable, showing: displayedWorktrees.length };
  }, [state, displayedWorktrees.length]);

  const renderCost = useCallback(
    (slug: string, issueId?: string) => {
      if (!issueId) return <span className="text-text-muted">—</span>;
      const c = costState[slug];
      if (!c || c.phase === 'loading') {
        return (
          <span className="inline-flex items-center gap-1 text-text-muted">
            <Loader2 className="h-3 w-3 animate-spin" />
            ...
          </span>
        );
      }
      if (c.phase === 'error') return <span className="text-red-500">error</span>;
      if (typeof c.costUsd === 'number') {
        return (
          <span
            className="font-mono text-text-primary"
            title={`${c.runStatus ?? 'unknown'} · ${c.inputTokens ?? 0}→${c.outputTokens ?? 0} tokens`}
          >
            ${c.costUsd.toFixed(3)}
          </span>
        );
      }
      return <span className="text-text-muted">n/a</span>;
    },
    [costState],
  );

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Paperclip Worktrees</h1>
          <p className="text-xs text-text-muted">
            每 10 秒自動刷新。列出所有 <code className="font-mono">feature/paperclip-*</code> 分支對應的 git worktrees。
          </p>
        </div>
        <div className="flex items-center gap-2">
          {summary && (
            <div className="flex items-center gap-3 text-[11px] text-text-muted">
              <span>
                total: <span className="font-semibold text-text-primary">{summary.total}</span>
              </span>
              <span>
                with commits: <span className="font-semibold text-text-primary">{summary.withCommits}</span>
              </span>
              {summary.prunable > 0 && (
                <span className="text-amber-600 dark:text-amber-400">prunable: {summary.prunable}</span>
              )}
              <span>
                showing: <span className="font-semibold text-text-primary">{summary.showing}</span>
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-1.5 rounded-md border border-border-default bg-bg-secondary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-primary hover:text-text-primary"
          >
            <RefreshCw className={clsx('h-3.5 w-3.5', state.phase === 'loading' && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {state.phase === 'loading' && (
        <div className="flex items-center gap-2 rounded-md border border-border-default bg-bg-secondary p-4 text-xs text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          載入中...
        </div>
      )}

      {state.phase === 'error' && (
        <div className="flex items-start gap-2 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">載入失敗</p>
            <p className="mt-0.5 opacity-80">{state.message}</p>
          </div>
        </div>
      )}

      {state.phase === 'ok' && state.worktrees.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border-default bg-bg-secondary/40 p-12 text-center text-text-muted">
          <Inbox className="h-10 w-10 opacity-40" />
          <p className="text-sm font-medium">目前沒有活躍的 Paperclip worktree</p>
          <p className="text-[11px]">
            從 <code className="font-mono">project-progress</code> 的 Row 設定送出 task，會自動建立對應 worktree，這裡就會列出來。
          </p>
        </div>
      )}

      {diffViewer.phase !== 'closed' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={handleCloseDiff}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative flex h-[85vh] w-full max-w-5xl flex-col rounded-lg border border-border-default bg-bg-primary shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-light px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Worktree diff
                </p>
                <p className="mt-0.5 truncate text-xs text-text-muted" title={diffViewer.slug}>
                  feature/paperclip-{diffViewer.slug}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseDiff}
                className="rounded-md border border-border-default p-1 text-text-muted hover:bg-bg-secondary hover:text-text-primary"
                aria-label="Close diff viewer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              {diffViewer.phase === 'loading' && (
                <div className="flex h-full items-center justify-center gap-2 text-xs text-text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Fetching diff…
                </div>
              )}
              {diffViewer.phase === 'error' && (
                <div className="m-4 flex items-start gap-2 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">無法取得 diff</p>
                    <p className="mt-0.5 opacity-80">{diffViewer.message}</p>
                  </div>
                </div>
              )}
              {diffViewer.phase === 'ok' && (
                <div className="space-y-3 p-4">
                  {/* Commits */}
                  <div>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                      Commits ({diffViewer.snapshot.commits.length})
                    </h3>
                    <ul className="mt-1 space-y-1">
                      {diffViewer.snapshot.commits.map((c) => (
                        <li key={c.sha} className="flex items-center gap-2 text-[11px]">
                          <code className="font-mono text-text-muted">{c.shortSha}</code>
                          <span className="truncate text-text-primary" title={c.subject}>
                            {c.subject}
                          </span>
                          <span className="shrink-0 text-text-muted">· {c.author}</span>
                          <span className="shrink-0 text-text-muted" title={c.at}>
                            · {new Date(c.at).toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Stat */}
                  <div>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                      Stat
                    </h3>
                    <pre className="mt-1 max-h-40 overflow-auto rounded border border-border-default bg-bg-secondary p-2 text-[11px] font-mono text-text-primary">
                      {diffViewer.snapshot.stat || '(no changes)'}
                    </pre>
                  </div>

                  {/* Full diff — colored + per-file collapsible */}
                  <div>
                    <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                      Diff (vs {diffViewer.snapshot.baseBranch})
                    </h3>
                    <DiffViewer
                      diff={diffViewer.snapshot.diff}
                      truncated={diffViewer.snapshot.truncated}
                      diffTotalBytes={diffViewer.snapshot.diffTotalBytes}
                    />
                  </div>
                </div>
              )}
            </div>

            {diffViewer.phase === 'ok' && (
              <div className="space-y-2 border-t border-border-light px-4 py-2">
                {/* Merge result / error banner */}
                {mergeState.phase === 'done' && (
                  <div
                    className={clsx(
                      'flex items-start gap-2 rounded border p-2 text-[11px]',
                      mergeState.dryRun
                        ? 'border-sky-500/50 bg-sky-500/10 text-sky-700 dark:text-sky-300'
                        : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
                    )}
                  >
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium">
                        {mergeState.dryRun ? 'Dry run 通過 · ' : 'Merge 成功 · '}
                        {mergeState.commitsMerged} commit(s){' '}
                        {mergeState.dryRun ? 'would merge cleanly' : 'merged'}
                      </p>
                      {!mergeState.dryRun && (
                        <p className="mt-0.5 font-mono text-[10px] opacity-80">
                          {mergeState.mergedBranch} → {diffViewer.snapshot.baseBranch} @{' '}
                          {mergeState.mergeSha.slice(0, 7)}
                        </p>
                      )}
                      {mergeState.dryRun && (
                        <p className="mt-0.5 text-[10px] opacity-80">
                          All safety checks passed. Click 「Merge →」 for real when ready.
                        </p>
                      )}
                      {!mergeState.dryRun && mergeState.cleanupOk === true && (
                        <p className="mt-0.5 text-[10px] opacity-80">
                          Cleanup: worktree + branch 已刪除
                        </p>
                      )}
                      {!mergeState.dryRun && mergeState.cleanupOk === false && (
                        <p className="mt-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                          Cleanup 失敗（merge 已成功，worktree 請手動清除）
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {mergeState.phase === 'error' && (
                  <div className="flex items-start gap-2 rounded border border-red-500/50 bg-red-500/10 p-2 text-[11px] text-red-700 dark:text-red-300">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium">
                        {mergeState.dryRun ? 'Dry run 失敗 · ' : 'Merge 失敗 · '}
                        {mergeState.reason}
                      </p>
                      <p className="mt-0.5 opacity-80">{mergeState.message}</p>
                      {mergeState.offendingPaths && mergeState.offendingPaths.length > 0 && (
                        <ul className="mt-1 space-y-0.5 font-mono text-[10px] opacity-80">
                          {mergeState.offendingPaths.map((p) => (
                            <li key={p}>· {p}</li>
                          ))}
                        </ul>
                      )}
                      {mergeState.stderr && (
                        <pre className="mt-1 max-h-20 overflow-auto whitespace-pre-wrap rounded bg-red-500/10 p-1 font-mono text-[9px]">
                          {mergeState.stderr}
                        </pre>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  {diffViewer.snapshot.commits.length === 0 ? (
                    <p className="text-[10px] text-text-muted">
                      (no commits ahead — nothing to merge)
                    </p>
                  ) : (
                    <p className="text-[10px] text-text-muted">
                      Review OK？可在此直接 merge（會走 forbidden-path 防線）
                    </p>
                  )}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        void handleCopy(
                          diffViewer.snapshot.slug,
                          diffViewer.snapshot.diff,
                        )
                      }
                      className="inline-flex items-center gap-1 rounded border border-border-default px-2 py-0.5 text-[10px] text-text-muted hover:bg-bg-secondary hover:text-text-primary"
                    >
                      <Copy className="h-3 w-3" />
                      {copiedSlug === diffViewer.snapshot.slug ? '已複製' : '複製 diff'}
                    </button>
                    {/* Dry-run — same safety checks but no actual merge */}
                    <button
                      type="button"
                      onClick={() =>
                        void handleMerge(
                          diffViewer.snapshot.slug,
                          diffViewer.snapshot.baseBranch,
                          false,
                          true,
                        )
                      }
                      disabled={
                        mergeState.phase === 'sending' ||
                        mergeState.phase === 'done' ||
                        diffViewer.snapshot.commits.length === 0
                      }
                      className={clsx(
                        'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-medium transition-colors',
                        mergeState.phase === 'sending' ||
                          mergeState.phase === 'done' ||
                          diffViewer.snapshot.commits.length === 0
                          ? 'cursor-not-allowed border-border-default text-text-muted'
                          : 'border-sky-500/50 text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/40',
                      )}
                      title={
                        diffViewer.snapshot.commits.length === 0
                          ? '此 branch 沒有新 commit，無可模擬的 merge'
                          : 'Dry run — 跑所有 safety 檢查（branch、commits、forbidden paths、base-dirty）但不實際 merge'
                      }
                    >
                      <Eye className="h-3 w-3" />
                      Dry run
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void handleMerge(
                          diffViewer.snapshot.slug,
                          diffViewer.snapshot.baseBranch,
                          false,
                          false,
                        )
                      }
                      disabled={
                        mergeState.phase === 'sending' ||
                        mergeState.phase === 'done' ||
                        diffViewer.snapshot.commits.length === 0
                      }
                      className={clsx(
                        'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-medium transition-colors',
                        mergeState.phase === 'sending' ||
                          mergeState.phase === 'done' ||
                          diffViewer.snapshot.commits.length === 0
                          ? 'cursor-not-allowed border-border-default text-text-muted'
                          : 'border-amber-500/50 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40',
                      )}
                      title={
                        diffViewer.snapshot.commits.length === 0
                          ? '此 branch 沒有新 commit，無可 merge 的內容'
                          : `git merge --no-ff feature/paperclip-${diffViewer.snapshot.slug} → ${diffViewer.snapshot.baseBranch}`
                      }
                    >
                      {mergeState.phase === 'sending' ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Merging…
                        </>
                      ) : mergeState.phase === 'done' ? (
                        'Merged'
                      ) : (
                        <>
                          <GitMerge className="h-3 w-3" />
                          Merge → {diffViewer.snapshot.baseBranch}
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void handleMerge(
                          diffViewer.snapshot.slug,
                          diffViewer.snapshot.baseBranch,
                          true,
                          false,
                        )
                      }
                      disabled={
                        mergeState.phase === 'sending' ||
                        mergeState.phase === 'done' ||
                        diffViewer.snapshot.commits.length === 0
                      }
                      className={clsx(
                        'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-medium transition-colors',
                        mergeState.phase === 'sending' ||
                          mergeState.phase === 'done' ||
                          diffViewer.snapshot.commits.length === 0
                          ? 'cursor-not-allowed border-border-default text-text-muted'
                          : 'border-amber-500/50 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40',
                      )}
                      title={
                        diffViewer.snapshot.commits.length === 0
                          ? '此 branch 沒有新 commit，無可 merge 的內容'
                          : `Merge ${diffViewer.snapshot.baseBranch}，merge 後自動刪除 worktree + branch`
                      }
                    >
                      <GitMerge className="h-3 w-3" />
                      Merge + cleanup
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {state.phase === 'ok' && state.worktrees.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search slug / branch / commit / issueKey"
              className="h-8 min-w-64 rounded-md border border-border-default bg-bg-primary px-2 text-xs text-text-primary"
            />
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as FilterMode)}
              className="h-8 rounded-md border border-border-default bg-bg-primary px-2 text-xs text-text-primary"
            >
              <option value="all">Filter: all</option>
              <option value="with-commits">Filter: with commits</option>
              <option value="prunable">Filter: prunable</option>
              <option value="mapped-issues">Filter: mapped issues</option>
            </select>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="h-8 rounded-md border border-border-default bg-bg-primary px-2 text-xs text-text-primary"
            >
              <option value="recent">Sort: latest commit</option>
              <option value="commits-desc">Sort: commits desc</option>
              <option value="cost-desc">Sort: cost desc</option>
              <option value="branch-asc">Sort: branch asc</option>
            </select>
          </div>
          <div className="overflow-x-auto rounded-md border border-border-default bg-bg-secondary/40">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border-light text-left text-text-muted">
                <th className="px-3 py-2 font-medium">Branch</th>
                <th className="px-3 py-2 font-medium">Cost</th>
                <th className="px-3 py-2 font-medium">Commits</th>
                <th className="px-3 py-2 font-medium">Last commit</th>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Repo path</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedWorktrees.map((w) => {
                const cs = cleanupState[w.slug];
                const isDeleting = cs?.phase === 'sending';
                const isDone = cs?.phase === 'done';
                const cleanupCmd = `git diff ${w.baseBranch}..${w.branchName}`;
                return (
                  <tr
                    key={w.slug}
                    className={clsx(
                      'border-b border-border-light last:border-b-0 hover:bg-bg-primary/40',
                      isDone && 'opacity-50',
                    )}
                  >
                    <td className="px-3 py-2 font-mono text-text-primary">
                      <div className="flex items-center gap-1.5">
                        <GitBranch className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        <span className="truncate" title={w.branchName}>{w.branchName}</span>
                        {w.prunable && (
                          <span
                            title="git reports this worktree as prunable — usually a cross-container path quirk; branches + commits are still safe"
                            className="rounded border border-amber-500/40 bg-amber-500/10 px-1 text-[9px] text-amber-700 dark:text-amber-400"
                          >
                            prunable
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-text-secondary">{renderCost(w.slug, w.issueId)}</td>
                    <td className="px-3 py-2 text-text-secondary">
                      <span
                        className={clsx(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          w.commitCount > 0
                            ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
                            : 'bg-bg-secondary text-text-muted',
                        )}
                      >
                        {w.commitCount} ahead
                      </span>
                    </td>
                    <td className="px-3 py-2 text-text-secondary">
                      {w.lastCommitSubject ? (
                        <div className="flex items-center gap-1.5">
                          <code className="font-mono text-text-muted">{w.lastCommitShortSha}</code>
                          <span className="max-w-xs truncate" title={w.lastCommitSubject}>
                            {w.lastCommitSubject}
                          </span>
                        </div>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-text-muted" title={w.lastCommitAt ?? undefined}>
                      {formatRelative(w.lastCommitAt)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <code className="truncate font-mono text-[10px] text-text-secondary" title={w.path}>
                          {w.path}
                        </code>
                        <button
                          type="button"
                          onClick={() => void handleCopy(w.slug, cleanupCmd)}
                          title={`複製：${cleanupCmd}`}
                          className="shrink-0 rounded border border-border-default p-0.5 text-text-muted hover:bg-bg-primary hover:text-text-primary"
                        >
                          {copiedSlug === w.slug ? (
                            <span className="text-[9px]">已複製</span>
                          ) : (
                            <Copy className="h-2.5 w-2.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => void handleInspect(w.slug)}
                          disabled={w.commitCount === 0}
                          className={clsx(
                            'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-medium transition-colors',
                            w.commitCount === 0
                              ? 'cursor-not-allowed border-border-default text-text-muted'
                              : 'border-sky-500/40 text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/40',
                          )}
                          title={
                            w.commitCount === 0
                              ? '此 branch 沒有新 commit，無可檢視的 diff'
                              : `查看 ${w.branchName} 相對於 ${w.baseBranch} 的 diff`
                          }
                        >
                          <Eye className="h-2.5 w-2.5" />
                          Diff
                        </button>
                        <a
                          href={buildPaperclipIssueSearchUrl(paperclipBaseUrl, w.branchName)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 rounded border border-border-default px-1.5 py-0.5 text-[9px] text-text-muted hover:bg-bg-primary hover:text-text-primary"
                          title="在 Paperclip 搜尋相關 issues"
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                          Paperclip
                        </a>
                        <button
                          type="button"
                          onClick={() => void handleDelete(w.slug)}
                          disabled={isDeleting || isDone}
                          className={clsx(
                            'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-medium transition-colors',
                            isDeleting || isDone
                              ? 'cursor-not-allowed border-border-default text-text-muted'
                              : 'border-red-500/40 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40',
                          )}
                        >
                          {isDeleting ? (
                            <>
                              <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              刪除中
                            </>
                          ) : isDone ? (
                            '已刪除'
                          ) : (
                            <>
                              <Trash2 className="h-2.5 w-2.5" />
                              刪除
                            </>
                          )}
                        </button>
                      </div>
                      {cs?.phase === 'error' && (
                        <p
                          className="mt-1 max-w-xs truncate text-[9px] text-red-600 dark:text-red-400"
                          title={cs.message}
                        >
                          {cs.message}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>
      )}
    </div>
  );
}
