'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AgentHeartbeat } from '@/app/api/paperclip/heartbeat/route';

interface UsePaperclipAgentsReturn {
  agents: AgentHeartbeat[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  resumeAgent: (agentId: string, adapterType?: string) => Promise<boolean>;
  pauseAgent: (agentId: string) => Promise<boolean>;
  switchAdapter: (agentId: string, adapterType: string) => Promise<boolean>;
}

export function usePaperclipAgents(userId: string, pollIntervalMs = 15_000): UsePaperclipAgentsReturn {
  const [agents, setAgents] = useState<AgentHeartbeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/paperclip/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      });
      const json = await res.json();
      if (!mounted.current) return;
      if (json.ok) {
        setAgents(json.agents);
        setError(null);
      } else {
        setError(json.error ?? 'Unknown error');
      }
    } catch (err) {
      if (mounted.current) {
        setError(err instanceof Error ? err.message : 'Network error');
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    mounted.current = true;
    refresh();
    const timer = setInterval(refresh, pollIntervalMs);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, [refresh, pollIntervalMs]);

  const resumeAgent = useCallback(async (agentId: string, adapterType?: string) => {
    try {
      const res = await fetch(`/api/paperclip/agents/${encodeURIComponent(agentId)}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify(adapterType ? { adapterType } : {}),
      });
      const json = await res.json();
      if (json.ok) {
        await refresh();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [userId, refresh]);

  const pauseAgent = useCallback(async (agentId: string) => {
    try {
      const res = await fetch(`/api/paperclip/agents/${encodeURIComponent(agentId)}/pause`, {
        method: 'POST',
        headers: { 'x-user-id': userId },
      });
      const json = await res.json();
      if (json.ok) {
        await refresh();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [userId, refresh]);

  const switchAdapter = useCallback(async (agentId: string, adapterType: string) => {
    try {
      const res = await fetch(`/api/paperclip/agents/${encodeURIComponent(agentId)}/adapter`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ adapterType }),
      });
      const json = await res.json();
      if (json.ok) {
        await refresh();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [userId, refresh]);

  return { agents, loading, error, refresh, resumeAgent, pauseAgent, switchAdapter };
}
