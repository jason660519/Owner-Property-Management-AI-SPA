'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle, Loader2, Rocket, Eye, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

interface DispatchResult {
  rowId: string;
  featureName: string;
  agentName: string;
  agentRole: string;
  issueIdentifier?: string;
  worktreeSlug?: string;
  error?: string;
}

interface DispatchResponse {
  ok: boolean;
  dryRun: boolean;
  timestamp: string;
  dispatched: number;
  idleAgents: number;
  candidateFeatures: number;
  results: DispatchResult[];
  error?: string;
  message?: string;
}

interface Props {
  onBadgeChange?: (count: number) => void;
}

export default function AutoDispatchTab({ onBadgeChange }: Props) {
  const [preview, setPreview] = useState<DispatchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<DispatchResponse | null>(null);
  const [limit, setLimit] = useState(3);
  const [error, setError] = useState('');

  const fetchPreview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/paperclip/auto-dispatch?dryRun=true&limit=${limit}`, {
        method: 'POST',
      });
      const d = await res.json() as DispatchResponse;
      if (d.ok) {
        setPreview(d);
        onBadgeChange?.(d.idleAgents);
      } else {
        setError(d.error ?? 'Failed to fetch preview');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [limit, onBadgeChange]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  const handleDispatch = async () => {
    if (!confirm(`確定要派出 ${preview?.dispatched ?? 0} 個任務嗎？`)) return;
    setDispatching(true);
    setError('');
    try {
      const res = await fetch(`/api/paperclip/auto-dispatch?limit=${limit}`, {
        method: 'POST',
      });
      const d = await res.json() as DispatchResponse;
      if (d.ok) {
        setDispatchResult(d);
        // Save to history
        const history = JSON.parse(localStorage.getItem('dispatch-history') ?? '[]');
        history.unshift({ ...d, _savedAt: new Date().toISOString() });
        localStorage.setItem('dispatch-history', JSON.stringify(history.slice(0, 10)));
        // Refresh preview
        setTimeout(fetchPreview, 3000);
      } else {
        setError(d.error ?? 'Dispatch failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            Limit:
            <input
              type="range"
              min={1}
              max={5}
              value={limit}
              onChange={e => setLimit(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-text-primary font-medium w-4">{limit}</span>
          </label>
          {preview && (
            <span className="text-xs text-text-muted">
              {preview.idleAgents} idle agents, {preview.candidateFeatures} candidates
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchPreview}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-bg-secondary hover:bg-bg-tertiary text-text-primary border border-border-default disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
            Preview
          </button>
          <button
            onClick={handleDispatch}
            disabled={dispatching || !preview || preview.dispatched === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50"
          >
            {dispatching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
            Dispatch ({preview?.dispatched ?? 0})
          </button>
          <button onClick={fetchPreview} className="p-1.5 rounded hover:bg-bg-secondary text-text-muted">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded bg-red-500/10 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Dispatch result banner */}
      {dispatchResult && !dispatching && (
        <div className="flex items-center gap-2 p-3 rounded bg-emerald-500/10 text-emerald-400 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Dispatched {dispatchResult.dispatched} tasks at {new Date(dispatchResult.timestamp).toLocaleTimeString()}
        </div>
      )}

      {/* Preview table */}
      {preview && preview.results.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border-default">
          <table className="w-full text-sm">
            <thead className="bg-bg-secondary text-text-secondary">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Row</th>
                <th className="px-3 py-2 text-left font-medium">Feature</th>
                <th className="px-3 py-2 text-left font-medium">Agent</th>
                <th className="px-3 py-2 text-left font-medium">Role</th>
                <th className="px-3 py-2 text-center font-medium">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {preview.results.map(r => (
                <tr key={r.rowId} className="hover:bg-bg-secondary/50">
                  <td className="px-3 py-2 font-mono text-xs text-accent">{r.rowId}</td>
                  <td className="px-3 py-2 text-text-primary max-w-[250px] truncate">{r.featureName}</td>
                  <td className="px-3 py-2 text-text-secondary">{r.agentName}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 rounded bg-bg-tertiary text-text-secondary text-xs">
                      {r.agentRole}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center text-xs">
                    {r.error ? (
                      <span className="text-red-400">{r.error.slice(0, 30)}</span>
                    ) : r.worktreeSlug ? (
                      <span className="text-emerald-400">{r.issueIdentifier}</span>
                    ) : preview.dryRun ? (
                      <span className="text-text-muted">preview</span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {preview && preview.results.length === 0 && (
        <div className="text-center py-10 text-text-muted text-sm">
          {preview.message ?? 'No tasks to dispatch. All agents are busy or no candidate features.'}
        </div>
      )}
    </div>
  );
}
