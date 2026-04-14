'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import clsx from 'clsx';

interface HistoryEntry {
  slug: string;
  branch: string;
  status: 'pending' | 'fixing' | 'merged' | 'pr_created';
  mergeSha?: string;
  prUrl?: string;
  prNumber?: number;
  commitsMerged: number;
  agentName?: string;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  onBadgeChange?: (count: number) => void;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  merged: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Merged' },
  pr_created: { bg: 'bg-sky-500/20', text: 'text-sky-400', label: 'PR Created' },
  pending: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Pending' },
  fixing: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Fixing' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' }) +
    ' ' + d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
}

export default function MergeHistoryTab({ onBadgeChange }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/paperclip/merge-history');
      const d = await res.json() as { ok: boolean; entries: HistoryEntry[] };
      if (d.ok) {
        setEntries(d.entries);
        setError('');
        onBadgeChange?.(d.entries.length);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [onBadgeChange]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading merge history...
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

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-muted gap-2">
        <p>No merge history yet.</p>
        <p className="text-xs">Merge records will appear here after branches are merged or PRs are created.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-secondary">{entries.length} merge records</h3>
        <button onClick={fetchHistory} className="p-1.5 rounded hover:bg-bg-secondary text-text-muted">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border-default">
        <table className="w-full text-sm">
          <thead className="bg-bg-secondary text-text-secondary">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Branch</th>
              <th className="px-3 py-2 text-center font-medium">Status</th>
              <th className="px-3 py-2 text-center font-medium">Commits</th>
              <th className="px-3 py-2 text-left font-medium">Agent</th>
              <th className="px-3 py-2 text-left font-medium">PR</th>
              <th className="px-3 py-2 text-left font-medium">SHA</th>
              <th className="px-3 py-2 text-left font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {entries.map((e) => {
              const style = STATUS_STYLES[e.status] ?? STATUS_STYLES.pending;
              return (
                <tr key={`${e.slug}-${e.createdAt}`} className="hover:bg-bg-secondary/50">
                  <td className="px-3 py-2 font-mono text-xs text-accent">{e.slug}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', style.bg, style.text)}>
                      {style.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center text-xs">{e.commitsMerged}</td>
                  <td className="px-3 py-2 text-xs text-text-secondary">{e.agentName ?? '—'}</td>
                  <td className="px-3 py-2 text-xs">
                    {e.prUrl ? (
                      <a
                        href={e.prUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sky-400 hover:text-sky-300"
                      >
                        #{e.prNumber} <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-text-muted">
                    {e.mergeSha?.slice(0, 7) ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-text-muted">{formatDate(e.updatedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
