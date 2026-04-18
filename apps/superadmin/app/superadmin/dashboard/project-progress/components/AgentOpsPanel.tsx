'use client';

// Unified Agent Operations Panel for the project-progress dashboard.
// Displays all Paperclip agents with status, adapter, model, heartbeat,
// and inline actions (resume, pause, switch adapter).

import { useState, useCallback } from 'react';
import {
  Activity, Pause, Play, RefreshCw, Loader2,
  ChevronDown, ChevronUp, Wifi, WifiOff, Zap,
} from 'lucide-react';
import clsx from 'clsx';
import type { AgentHeartbeat } from '@/app/api/paperclip/heartbeat/route';
import { ADAPTER_OPTIONS } from '@/lib/paperclip/adapter-models';

interface AgentOpsPanelProps {
  agents: AgentHeartbeat[];
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  onResume: (agentId: string, adapterType?: string) => Promise<boolean>;
  onPause: (agentId: string) => Promise<boolean>;
  onSwitchAdapter: (agentId: string, adapterType: string) => Promise<boolean>;
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'N/A';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  return `${Math.round(ms / 3_600_000)}h ago`;
}

export default function AgentOpsPanel({
  agents, loading, error, onRefresh, onResume, onPause, onSwitchAdapter,
}: AgentOpsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [actionAgent, setActionAgent] = useState<string | null>(null);

  const handleAction = useCallback(async (fn: () => Promise<boolean>, agentId: string) => {
    setActionAgent(agentId);
    await fn();
    setActionAgent(null);
  }, []);

  const onlineCount = agents.filter(a => a.isOnline).length;

  return (
    <div className="rounded-lg border border-border-default bg-bg-primary">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-semibold text-text-primary">
            Agents ({onlineCount}/{agents.length} online)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRefresh(); }}
            className="rounded border border-border-default p-1 text-text-muted hover:text-text-primary hover:bg-bg-secondary"
            title="Refresh heartbeat"
          >
            <RefreshCw className={clsx('h-3 w-3', loading && 'animate-spin')} />
          </button>
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-text-muted" /> : <ChevronDown className="h-3.5 w-3.5 text-text-muted" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border-light px-3 pb-3 pt-2 max-h-64 overflow-y-auto">
          {error && (
            <p className="mb-2 text-[10px] text-red-600 dark:text-red-400">{error}</p>
          )}

          {agents.length === 0 && !loading && (
            <p className="text-[10px] text-text-muted">No agents found. Check Paperclip config.</p>
          )}

          <div className="space-y-1.5">
            {agents.map(agent => (
              <AgentRow
                key={agent.id}
                agent={agent}
                busy={actionAgent === agent.id}
                onResume={(adapterType) => handleAction(() => onResume(agent.id, adapterType), agent.id)}
                onPause={() => handleAction(() => onPause(agent.id), agent.id)}
                onSwitchAdapter={(adapterType) => handleAction(() => onSwitchAdapter(agent.id, adapterType), agent.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AgentRow({ agent, busy, onResume, onPause, onSwitchAdapter }: {
  agent: AgentHeartbeat;
  busy: boolean;
  onResume: (adapterType?: string) => void;
  onPause: () => void;
  onSwitchAdapter: (adapterType: string) => void;
}) {
  const [showAdapterPicker, setShowAdapterPicker] = useState(false);
  const isPaused = Boolean(agent.pauseReason);
  const isError = agent.status === 'error';
  const canResume = isPaused || isError;

  const statusColor = isPaused
    ? 'text-amber-600 dark:text-amber-400'
    : isError
      ? 'text-red-600 dark:text-red-400'
      : agent.isOnline
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-text-muted';

  return (
    <div className="flex items-center gap-2 rounded-md border border-border-light bg-bg-secondary/40 px-2 py-1.5">
      {/* Online indicator */}
      <div className="flex-shrink-0" title={agent.isOnline ? 'Online' : 'Offline'}>
        {agent.isOnline
          ? <Wifi className="h-3.5 w-3.5 text-emerald-500" />
          : <WifiOff className="h-3.5 w-3.5 text-text-muted" />
        }
      </div>

      {/* Name + status */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[11px] font-medium text-text-primary">{agent.name}</span>
          <span className={clsx('text-[9px] font-mono', statusColor)}>
            {isPaused ? 'paused' : agent.status}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-text-muted">
          <span>{agent.adapterType}</span>
          <span className="font-mono">{agent.model}</span>
          <span title={agent.lastHeartbeatAt ?? ''}>
            <Zap className="inline h-2.5 w-2.5" /> {timeAgo(agent.lastHeartbeatAt)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-text-muted" />
        ) : (
          <>
            {canResume && (
              <button
                type="button"
                onClick={() => onResume()}
                className="rounded border border-emerald-500/40 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                title="Resume agent"
              >
                <Play className="inline h-2.5 w-2.5" /> Resume
              </button>
            )}
            {!isPaused && agent.status !== 'error' && (
              <button
                type="button"
                onClick={onPause}
                className="rounded border border-amber-500/40 px-1.5 py-0.5 text-[9px] font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40"
                title="Pause agent"
              >
                <Pause className="inline h-2.5 w-2.5" /> Pause
              </button>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAdapterPicker(p => !p)}
                className="rounded border border-border-default px-1.5 py-0.5 text-[9px] text-text-secondary hover:bg-bg-secondary"
                title="Switch adapter"
              >
                Adapter
              </button>
              {showAdapterPicker && (
                <div className="absolute right-0 top-full z-30 mt-1 w-44 rounded-md border border-border-default bg-bg-primary shadow-lg">
                  {ADAPTER_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => { onSwitchAdapter(opt.id); setShowAdapterPicker(false); }}
                      className={clsx(
                        'flex w-full items-center justify-between px-2 py-1.5 text-left text-[10px] hover:bg-bg-secondary',
                        opt.id === agent.adapterType && 'bg-emerald-50 dark:bg-emerald-950/30',
                      )}
                    >
                      <span className="text-text-primary">{opt.label}</span>
                      <span className="font-mono text-text-muted">{opt.model}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
