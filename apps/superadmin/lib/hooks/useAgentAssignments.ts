'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAgentDefault } from '@/lib/ai/agent-defaults';
import type {
  AgentAssignment,
  AgentAssignmentPatch,
  AgentAssignmentsGetResponse,
  AgentAssignmentPutResponse,
  AgentAssignmentErrorResponse,
} from '@/lib/types/agent-assignment';

// ---------------------------------------------------------------------------
// Hook contract
// ---------------------------------------------------------------------------

export interface UseAgentAssignmentsDeps {
  /**
   * Current auth user id. Used as the `x-user-id` header on writes so the
   * API route can resolve `updated_by`. Reads are public-to-authenticated.
   */
  userId: string;
}

export interface UseAgentAssignmentsReturn {
  /** Keyed by agent_key for O(1) lookup in the panel. */
  assignmentsByKey: Record<string, AgentAssignment>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Upsert a single agent's config. Merges with the existing row server-side. */
  save: (patch: AgentAssignmentPatch) => Promise<AgentAssignment>;
  /**
   * Restore an agent to its factory default (defined in `lib/ai/agent-defaults.ts`).
   * Internally does an upsert to the defaults, NOT a DELETE, so the user
   * always has a working configuration after reset. Throws if no default
   * is defined for the given agent_key.
   */
  reset: (agentKey: string) => Promise<AgentAssignment>;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

const ENDPOINT = '/api/ai-settings/agent-assignments';

export function useAgentAssignments(deps: UseAgentAssignmentsDeps): UseAgentAssignmentsReturn {
  const { userId } = deps;
  const [assignments, setAssignments] = useState<AgentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(ENDPOINT, { cache: 'no-store' });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as AgentAssignmentErrorResponse;
        throw new Error(err?.error ?? `HTTP ${res.status}`);
      }
      const json = (await res.json()) as AgentAssignmentsGetResponse;
      setAssignments(Array.isArray(json.assignments) ? json.assignments : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load agent assignments');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (patch: AgentAssignmentPatch): Promise<AgentAssignment> => {
      const res = await fetch(ENDPOINT, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as AgentAssignmentErrorResponse;
        throw new Error(err?.error ?? `HTTP ${res.status}`);
      }
      const json = (await res.json()) as AgentAssignmentPutResponse;
      // Merge the updated row into local state without refetching.
      setAssignments((prev) => {
        const idx = prev.findIndex((a) => a.agent_key === json.assignment.agent_key);
        if (idx === -1) return [...prev, json.assignment];
        const next = prev.slice();
        next[idx] = json.assignment;
        return next;
      });
      return json.assignment;
    },
    [userId],
  );

  const reset = useCallback(
    async (agentKey: string): Promise<AgentAssignment> => {
      const def = getAgentDefault(agentKey);
      if (!def) {
        throw new Error(`No factory default defined for agent_key "${agentKey}"`);
      }
      // Reuse save() so the local state merge logic stays in one place.
      return save({
        agent_key: agentKey,
        is_enabled: true,
        primary_provider: def.primary_provider,
        primary_model_id: def.primary_model_id,
        primary_config: def.primary_config,
        fallbacks: def.fallbacks,
        guardrails: def.guardrails,
        notes: def.notes,
      });
    },
    [save],
  );

  const assignmentsByKey = useMemo<Record<string, AgentAssignment>>(() => {
    const out: Record<string, AgentAssignment> = {};
    for (const a of assignments) out[a.agent_key] = a;
    return out;
  }, [assignments]);

  return { assignmentsByKey, loading, error, refresh, save, reset };
}
