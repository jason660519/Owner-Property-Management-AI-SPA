'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle, Loader2, Activity, RotateCcw, Save } from 'lucide-react';
import clsx from 'clsx';

interface AgentInfo {
  id: string;
  name: string;
  status: string;
  adapterType: string;
  model: string;
  lastHeartbeatAt: string | null;
}

// Available adapters and their default + available models
const ADAPTER_OPTIONS: { value: string; label: string; models: { value: string; label: string }[] }[] = [
  {
    value: 'claude_local',
    label: 'Claude (Anthropic)',
    models: [
      { value: 'sonnet', label: 'Sonnet' },
      { value: 'opus', label: 'Opus' },
      { value: 'haiku', label: 'Haiku' },
    ],
  },
  {
    value: 'codex_local',
    label: 'Codex (OpenAI)',
    models: [
      { value: 'gpt-5.3-codex', label: 'GPT-5.3 Codex' },
      { value: 'gpt-5.2-codex', label: 'GPT-5.2 Codex' },
      { value: 'o3-mini', label: 'o3-mini' },
    ],
  },
  {
    value: 'cursor',
    label: 'Cursor',
    models: [
      { value: 'auto', label: 'Auto' },
      { value: 'composer-1.5', label: 'Composer 1.5' },
      { value: 'sonnet-4.6', label: 'Sonnet 4.6' },
      { value: 'gpt-5.3-codex', label: 'GPT-5.3 Codex' },
    ],
  },
  {
    value: 'opencode_local',
    label: 'OpenCode (Gemini)',
    models: [
      { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { value: 'google/gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    ],
  },
];

// Default model for each adapter
const ADAPTER_DEFAULT_MODEL: Record<string, string> = {
  claude_local: 'sonnet',
  codex_local: 'gpt-5.3-codex',
  cursor: 'auto',
  opencode_local: 'google/gemini-2.5-flash',
};

const STATUS_COLORS: Record<string, string> = {
  idle: 'bg-gray-500/20 text-gray-400',
  running: 'bg-emerald-500/20 text-emerald-400',
  error: 'bg-red-500/20 text-red-400',
};

interface Props {
  onBadgeChange?: (count: number) => void;
}

// Track pending adapter/model changes per agent
type PendingChange = { adapter: string; model: string };

function formatRelative(iso?: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - Date.parse(iso);
  if (diff < 0) return 'just now';
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export default function AgentsTab({ onBadgeChange }: Props) {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<Record<string, PendingChange>>({});
  const [toast, setToast] = useState('');

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/paperclip/agent-health');
      const d = await res.json();
      if (d.ok && d.results) {
        const mapped: AgentInfo[] = d.results.map((r: Record<string, unknown>) => ({
          id: String(r.id ?? ''),
          name: String(r.name ?? ''),
          status: String(r.status ?? ''),
          adapterType: String(r.adapter ?? ''),
          model: String(r.model ?? ''),
          lastHeartbeatAt: (r.lastHeartbeatAt as string) ?? null,
        }));
        setAgents(mapped);
        setError('');
        onBadgeChange?.(mapped.filter(a => a.status === 'error').length);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [onBadgeChange]);

  useEffect(() => {
    fetchAgents();
    const iv = setInterval(fetchAgents, 15_000);
    return () => clearInterval(iv);
  }, [fetchAgents]);

  // Get the pending or current adapter/model for an agent
  const getEffective = (a: AgentInfo): PendingChange => {
    if (pending[a.id]) return pending[a.id];
    return { adapter: a.adapterType, model: a.model };
  };

  const hasPendingChange = (a: AgentInfo): boolean => {
    const p = pending[a.id];
    if (!p) return false;
    return p.adapter !== a.adapterType || p.model !== a.model;
  };

  const handleAdapterChange = (agentId: string, currentModel: string, newAdapter: string) => {
    const defaultModel = ADAPTER_DEFAULT_MODEL[newAdapter] ?? 'auto';
    setPending(prev => ({
      ...prev,
      [agentId]: { adapter: newAdapter, model: defaultModel },
    }));
  };

  const handleModelChange = (agentId: string, currentAdapter: string, newModel: string) => {
    const p = pending[agentId];
    setPending(prev => ({
      ...prev,
      [agentId]: { adapter: p?.adapter ?? currentAdapter, model: newModel },
    }));
  };

  const handleSave = async (agent: AgentInfo) => {
    const p = pending[agent.id];
    if (!p) return;

    setSaving(prev => ({ ...prev, [agent.id]: true }));
    try {
      const res = await fetch(`/api/paperclip/agents/${agent.id}/adapter`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adapterType: p.adapter, model: p.model }),
      });
      const d = await res.json();
      if (d.ok) {
        setPending(prev => { const n = { ...prev }; delete n[agent.id]; return n; });
        setToast(`${agent.name}: ${p.adapter} / ${p.model}`);
        setTimeout(() => setToast(''), 3000);
        setTimeout(fetchAgents, 500);
      } else {
        setToast(`Error: ${d.error?.slice(0, 60)}`);
        setTimeout(() => setToast(''), 5000);
      }
    } catch {
      setToast('Network error');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setSaving(prev => ({ ...prev, [agent.id]: false }));
    }
  };

  const handleReset = async (agent: AgentInfo) => {
    setSaving(prev => ({ ...prev, [agent.id]: true }));
    try {
      const res = await fetch(`/api/paperclip/agents/${agent.id}/adapter`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adapterType: agent.adapterType, model: agent.model }),
      });
      const d = await res.json();
      if (d.ok) {
        setToast(`${agent.name} reset to idle`);
        setTimeout(() => setToast(''), 3000);
        setTimeout(fetchAgents, 500);
      }
    } catch { /* ignore */ }
    finally {
      setSaving(prev => ({ ...prev, [agent.id]: false }));
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
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-lg bg-bg-secondary border border-border-default text-sm text-text-primary shadow-lg">
          {toast}
        </div>
      )}

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
              <th className="px-3 py-2 text-center font-medium">Heartbeat</th>
              <th className="px-3 py-2 text-center font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {agents.map(a => {
              const eff = getEffective(a);
              const changed = hasPendingChange(a);
              const adapterModels = ADAPTER_OPTIONS.find(o => o.value === eff.adapter)?.models ?? [];
              const isSaving = saving[a.id];

              return (
                <tr key={a.id || a.name} className={clsx('hover:bg-bg-secondary/50', changed && 'bg-amber-500/5')}>
                  <td className="px-3 py-2 font-medium text-text-primary">{a.name}</td>
                  <td className="px-3 py-2">
                    <select
                      value={eff.adapter}
                      onChange={e => handleAdapterChange(a.id, a.model, e.target.value)}
                      disabled={a.status === 'running' || isSaving}
                      className="text-xs px-2 py-1 rounded bg-bg-tertiary border border-border-default text-text-primary disabled:opacity-50 cursor-pointer"
                    >
                      {ADAPTER_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={eff.model}
                      onChange={e => handleModelChange(a.id, a.adapterType, e.target.value)}
                      disabled={a.status === 'running' || isSaving}
                      className="text-xs px-2 py-1 rounded bg-bg-tertiary border border-border-default text-text-primary disabled:opacity-50 cursor-pointer font-mono"
                    >
                      {adapterModels.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                      {/* Show current model if not in the list */}
                      {!adapterModels.some(m => m.value === eff.model) && (
                        <option value={eff.model}>{eff.model}</option>
                      )}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[a.status] ?? 'bg-gray-500/20 text-gray-400')}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center text-xs text-text-muted">
                    {formatRelative(a.lastHeartbeatAt)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {changed && (
                        <button
                          onClick={() => handleSave(a)}
                          disabled={isSaving}
                          className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
                        >
                          {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          Apply
                        </button>
                      )}
                      {a.status === 'error' && !changed && (
                        <button
                          onClick={() => handleReset(a)}
                          disabled={isSaving}
                          className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-50"
                        >
                          {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                          Reset
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="text-xs text-text-muted">
        Tip: Select an adapter and model, then click Apply to switch. Running agents cannot be changed.
      </div>
    </div>
  );
}
