'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, Loader2, GitMerge, Wrench } from 'lucide-react';
import clsx from 'clsx';

interface BranchInfo {
  slug: string;
  branch: string;
  commitsAhead: number;
  lastCommit: { sha: string; subject: string; author: string; date: string } | null;
  diffStat: { insertions: number; deletions: number; filesChanged: number };
  issues: string[];
  mergeReady: boolean;
}

interface SummaryData {
  ok: boolean;
  timestamp: string;
  readyToMerge: number;
  inProgress: number;
  hasIssues: number;
  branches: BranchInfo[];
}

interface Props {
  onBadgeChange?: (count: number) => void;
}

type MergeRowState = Record<string, 'idle' | 'merging' | 'done' | 'error'>;

export default function WorkSummaryTab({ onBadgeChange }: Props) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mergeState, setMergeState] = useState<MergeRowState>({});
  const [fixingAll, setFixingAll] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/paperclip/work-summary');
      const d = await res.json() as SummaryData;
      if (d.ok) {
        setData(d);
        setError('');
        onBadgeChange?.(d.readyToMerge + d.hasIssues);
      } else {
        setError('Failed to fetch summary');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [onBadgeChange]);

  useEffect(() => {
    fetchSummary();
    const iv = setInterval(fetchSummary, 30_000);
    return () => clearInterval(iv);
  }, [fetchSummary]);

  const handleMerge = async (slug: string) => {
    setMergeState(prev => ({ ...prev, [slug]: 'merging' }));
    try {
      const res = await fetch(`/api/paperclip/worktrees/${slug}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cleanup: true }),
      });
      const d = await res.json();
      setMergeState(prev => ({ ...prev, [slug]: d.ok ? 'done' : 'error' }));
      if (d.ok) setTimeout(fetchSummary, 2000);
    } catch {
      setMergeState(prev => ({ ...prev, [slug]: 'error' }));
    }
  };

  const handleMergeAllReady = async () => {
    if (!data) return;
    const readyBranches = data.branches.filter(b => b.mergeReady && mergeState[b.slug] !== 'done');
    for (const b of readyBranches) {
      await handleMerge(b.slug);
    }
  };

  const handleFixAll = async () => {
    setFixingAll(true);
    try {
      // Call work-summary to get branches with issues, then we'll need
      // the user to run /review-agent-work for the actual fix (requires docker exec)
      alert('請在 Claude Code 中執行 /review-agent-work 來修復所有問題。');
    } finally {
      setFixingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading work summary...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20 text-red-400">
        <AlertTriangle className="w-5 h-5 mr-2" />
        {error}
      </div>
    );
  }

  if (!data || data.branches.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted">
        No branches with work found.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header stats */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" /> {data.readyToMerge} ready
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <AlertTriangle className="w-4 h-4" /> {data.hasIssues} issues
          </span>
          <span className="text-text-muted">{data.branches.length} total</span>
        </div>
        <div className="flex gap-2">
          {data.hasIssues > 0 && (
            <button
              onClick={handleFixAll}
              disabled={fixingAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50"
            >
              <Wrench className="w-3.5 h-3.5" /> Fix All Issues
            </button>
          )}
          {data.readyToMerge > 0 && (
            <button
              onClick={handleMergeAllReady}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <GitMerge className="w-3.5 h-3.5" /> Merge All Ready ({data.readyToMerge})
            </button>
          )}
          <button onClick={fetchSummary} className="p-1.5 rounded hover:bg-bg-secondary text-text-muted">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border-default">
        <table className="w-full text-sm">
          <thead className="bg-bg-secondary text-text-secondary">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Branch</th>
              <th className="px-3 py-2 text-center font-medium">Commits</th>
              <th className="px-3 py-2 text-right font-medium">+/-</th>
              <th className="px-3 py-2 text-left font-medium">Last Commit</th>
              <th className="px-3 py-2 text-left font-medium">Issues</th>
              <th className="px-3 py-2 text-center font-medium">Status</th>
              <th className="px-3 py-2 text-center font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {data.branches.map(b => {
              const ms = mergeState[b.slug] ?? 'idle';
              return (
                <tr key={b.slug} className="hover:bg-bg-secondary/50">
                  <td className="px-3 py-2 font-mono text-xs text-accent">{b.slug}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 text-xs font-medium">
                      {b.commitsAhead}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-xs">
                    <span className="text-emerald-400">+{b.diffStat.insertions}</span>
                    <span className="text-text-muted">/</span>
                    <span className="text-red-400">-{b.diffStat.deletions}</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-text-secondary max-w-[250px] truncate">
                    {b.lastCommit?.subject ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {b.issues.length > 0 ? (
                      <span className="text-amber-400">{b.issues[0].split(':')[0]}</span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {ms === 'done' ? (
                      <span className="text-emerald-400 text-xs">Merged</span>
                    ) : b.mergeReady ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">Ready</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs">Fix needed</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {ms === 'done' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                    ) : ms === 'merging' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-sky-400 mx-auto" />
                    ) : b.mergeReady ? (
                      <button
                        onClick={() => handleMerge(b.slug)}
                        className="px-2 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                      >
                        Merge
                      </button>
                    ) : (
                      <span className="text-text-muted text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
