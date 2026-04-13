'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle, Loader2, Activity, RotateCcw } from 'lucide-react';
import clsx from 'clsx';

interface AgentInfo {
  id: string;
  name: string;
  status: string;
  adapterType: string;
  model: string;
  lastHeartbeatAt: string | null;
  budgetMonthlyCents: number;
  spentMonthlyCents: number;
}

const ADAPTERS = ['opencode_local', 'cursor', 'codex_local', 'claude_local'] as const;
const ADAPTER_MODELS: Record<string, string> = {
  claude_local: 'sonnet',
  codex_local: 'gpt-5.3-codex',
  cursor: 'auto',
  opencode_local: 'google/gemini-2.5-flash',
};
const ADAPTER_LABELS: Record<string, string> = {
  claude_local: 'Claude (Anthropic)',
  codex_local: 'Codex (OpenAI)',
  cursor: 'Cursor',
  opencode_local: 'OpenCode (Gemini)',
};

const STATUS_COLORS: Record<string, string> = {
  idle: 'bg-gray-500/20 text-gray-400',
  running: 'bg-emerald-500/20 text-emerald-400',
  error: 'bg-red-500/20 text-red-400',
};

interface Props {
  onBadgeChange?: (count: number) => void;
}

function formatRelative(iso?: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - Date.parse(iso);
  if (diff < 0) return 'just now';
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

export default function AgentsTab({ onBadgeChange }: Props) {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionState, setActionState] = useState<Record<string, string>>({});

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/paperclip/agent-health');
      const d = await res.json();
      if (d.ok && d.results) {
        const mapped: AgentInfo[] = d.results.map((r: Record<string, unknown>) => ({
          id: '', // agent-health doesn't return id, but we can work with name
          name: String(r.name ?? ''),
          status: String(r.status ?? ''),
          adapterType: String(r.adapter ?? ''),
          model: String(r.model ?? ''),
          lastHeartbeatAt: null,
          budgetMonthlyCents: 0,
          spentMonthlyCents: 0,
        }));
        setAgents(mapped);
        setError('');
        const errorCount = mapped.filter(a => a.status === 'error').length;
        onBadgeChange?.(errorCount);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [onBadgeChange]);

  // Also fetch full agent data directly from the agents API for IDs and heartbeats
  const fetchFullAgents = useCallback(async () => {
    try {
      const configRes = await fetch('/api/paperclip/agent-health');
      const configData = await configRes.json();
      if (!configData.ok) return;

      // Use the Paperclip proxy — agent-health already fetches from Paperclip
      // For full data with IDs, we need to go through a different approach
      // For now, agent-health results are sufficient for display
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchAgents();
    const iv = setInterval(fetchAgents, 15_000);
    return () => clearInterval(iv);
  }, [fetchAgents]);

  const handleReset = async (agentName: string) => {
    setActionState(prev => ({ ...prev, [agentName]: 'resetting' }));
    try {
      // Call agent-health which resets error agents
      const res = await fetch('/api/paperclip/agent-health');
      const d = await res.json();
      setActionState(prev => ({ ...prev, [agentName]: 'done' }));
      setTimeout(fetchAgents, 1000);
    } catch {
      setActionState(prev => ({ ...prev, [agentName]: 'error' }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading agents...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20 text-red-400">
        <AlertTriangle className="w-5 h-5 mr-2" /> {error}
      </div>
    );
  }

  const errorCount = agents.filter(a => a.status === 'error').length;
  const runningCount = agents.filter(a => a.status === 'running').length;
  const idleCount = agents.filter(a => a.status === 'idle').length;

  return (
    <div className="p-4 space-y-4">
      {/* Header stats */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1 text-emerald-400">
            <Activity className="w-4 h-4" /> {runningCount} running
          </span>
          <span className="text-text-muted">{idleCount} idle</span>
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <AlertTriangle className="w-4 h-4" /> {errorCount} error
            </span>
          )}
        </div>
        <button onClick={fetchAgents} className="p-1.5 rounded hover:bg-bg-secondary text-text-muted">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border-default">
        <table className="w-full text-sm">
          <thead className="bg-bg-secondary text-text-secondary">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Agent</th>
              <th className="px-3 py-2 text-left font-medium">Adapter</th>
              <th className="px-3 py-2 text-left font-medium">Model</th>
              <th className="px-3 py-2 text-center font-medium">Status</th>
              <th className="px-3 py-2 text-center font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {agents.map(a => (
              <tr key={a.name} className="hover:bg-bg-secondary/50">
                <td className="px-3 py-2 font-medium text-text-primary">{a.name}</td>
                <td className="px-3 py-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-bg-tertiary text-text-secondary">
                    {ADAPTER_LABELS[a.adapterType] ?? a.adapterType}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-xs text-text-muted">{a.model}</td>
                <td className="px-3 py-2 text-center">
                  <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[a.status] ?? 'bg-gray-500/20 text-gray-400')}>
                    {a.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  {a.status === 'error' && (
                    <button
                      onClick={() => handleReset(a.name)}
                      disabled={actionState[a.name] === 'resetting'}
                      className="flex items-center gap-1 mx-auto px-2 py-1 text-xs rounded bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-50"
                    >
                      {actionState[a.name] === 'resetting' ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3 h-3" />
                      )}
                      Reset
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
