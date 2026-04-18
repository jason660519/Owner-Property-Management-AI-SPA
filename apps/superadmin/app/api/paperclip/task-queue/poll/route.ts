// GET /api/paperclip/task-queue/poll
//
// Server-side poller: checks all active paperclip_tasks against Paperclip API,
// updates status/cost, and handles retry logic + adapter fallback.
//
// When an agent hits "adapter_failed" / "Quota exceeded", this route
// automatically switches the agent to the next adapter in the fallback
// chain (claude_local → codex_local → gemini_local) via PATCH /api/agents/:id.

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getAgentRuntime } from '@/lib/agent-runtime';
import {
  getNextAdapter,
  switchAgentAdapter,
  isAdapterQuotaError,
} from '@/lib/paperclip/adapter-fallback';
import { runCreditGuardCycle, type CreditGuardReader } from '@/lib/ai/anthropic-credit-guard';

// adapter-fallback + credit-guard modules still take explicit baseUrl/apiKey
// arguments (Phase 1 will fold them into runtime). For now read directly.
const PAPERCLIP_BASE_URL =
  process.env.NEXT_PUBLIC_PAPERCLIP_BASE_URL ?? 'http://localhost:3187';
const PAPERCLIP_API_KEY = process.env.PAPERCLIP_API_KEY ?? '';

interface TaskRow {
  id: string;
  row_id: string;
  issue_id: string;
  assigned_agent: string | null;
  claimed_by: string | null;
  status: string;
  attempt_count: number;
  consecutive_failures: number;
  max_attempts: number;
  last_error: string | null;
  cost_usd: number | null;
}

interface PollResult {
  taskId: string;
  rowId: string;
  previousStatus: string;
  newStatus: string;
  costUsd?: number;
  adapterSwitch?: { from: string; to: string };
  error?: string;
}

/** Fetch the current adapter type for an agent from Paperclip API. */
async function getAgentAdapter(agentId: string): Promise<string | null> {
  try {
    const url = `${PAPERCLIP_BASE_URL.replace(/\/+$/, '')}/api/agents/${encodeURIComponent(agentId)}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${PAPERCLIP_API_KEY}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    return typeof data.adapterType === 'string' ? data.adapterType : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const runtimeResult = getAgentRuntime();
  if (!runtimeResult.ok) {
    return NextResponse.json(runtimeResult, { status: runtimeResult.status });
  }
  const runtime = runtimeResult.runtime;

  const supabase = createAdminClient();

  const { data: tasks, error: fetchError } = await supabase
    .from('paperclip_tasks')
    .select('id, row_id, issue_id, assigned_agent, claimed_by, status, attempt_count, consecutive_failures, max_attempts, last_error, cost_usd')
    .in('status', ['submitted', 'running'])
    .order('created_at', { ascending: true });

  if (fetchError) {
    return NextResponse.json(
      { ok: false, error: fetchError.message },
      { status: 500 },
    );
  }

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ ok: true, polled: 0, results: [] });
  }

  const results: PollResult[] = [];

  for (const task of tasks as TaskRow[]) {
    const result: PollResult = {
      taskId: task.id,
      rowId: task.row_id,
      previousStatus: task.status,
      newStatus: task.status,
    };

    try {
      const statusResult = await runtime.fetchIssueStatus({
        issueId: task.issue_id,
      });

      if (!statusResult.ok) {
        const newFailures = task.consecutive_failures + 1;
        const tripped = newFailures >= task.max_attempts;
        await supabase
          .from('paperclip_tasks')
          .update({
            consecutive_failures: newFailures,
            last_error: 'Paperclip API unreachable',
            status: tripped ? 'tripped' : task.status,
          })
          .eq('id', task.id);
        result.newStatus = tripped ? 'tripped' : task.status;
        result.error = 'Paperclip API unreachable';
        results.push(result);
        continue;
      }

      const snapshot = statusResult.snapshot;

      let newTaskStatus = task.status;
      if (snapshot.status === 'done') {
        newTaskStatus = 'succeeded';
      } else if (snapshot.status === 'in_progress' || snapshot.status === 'in_review') {
        newTaskStatus = 'running';
      } else if (snapshot.status === 'cancelled') {
        newTaskStatus = 'cancelled';
      } else if (snapshot.status === 'blocked') {
        const newFailures = task.consecutive_failures + 1;
        const tripped = newFailures >= task.max_attempts;
        newTaskStatus = tripped ? 'tripped' : 'failed';
        await supabase
          .from('paperclip_tasks')
          .update({
            status: newTaskStatus,
            consecutive_failures: newFailures,
            attempt_count: task.attempt_count + (tripped ? 0 : 1),
            last_error: 'Issue blocked in Paperclip',
          })
          .eq('id', task.id);
        result.newStatus = newTaskStatus;
        results.push(result);
        continue;
      }

      // ── Adapter fallback: detect quota/adapter errors from last_error ──
      // Check if the latest run failed with an adapter error
      if (
        task.assigned_agent &&
        task.last_error &&
        isAdapterQuotaError(task.last_error)
      ) {
        const currentAdapter = await getAgentAdapter(task.assigned_agent);
        if (currentAdapter) {
          const nextAdapter = getNextAdapter(currentAdapter);
          if (nextAdapter) {
            const switchResult = await switchAgentAdapter({
              baseUrl: PAPERCLIP_BASE_URL,
              apiKey: PAPERCLIP_API_KEY,
              agentId: task.assigned_agent,
              newAdapterType: nextAdapter,
            });
            if (switchResult.ok) {
              result.adapterSwitch = { from: currentAdapter, to: nextAdapter };
              // eslint-disable-next-line no-console
              console.log(
                `[task-queue/poll] Switched agent ${task.assigned_agent} from ${currentAdapter} → ${nextAdapter} (quota error)`,
              );
              // Clear the error so the next heartbeat uses the new adapter
              await supabase
                .from('paperclip_tasks')
                .update({ last_error: `Adapter switched: ${currentAdapter} → ${nextAdapter}` })
                .eq('id', task.id);
            }
          }
        }
      }

      // Fetch cost if terminal
      let costUsd = task.cost_usd;
      if (snapshot.terminal && !costUsd) {
        try {
          const costResult = await runtime.fetchIssueCost({
            issueId: task.issue_id,
          });
          if (costResult.ok && costResult.snapshot.costUsd !== undefined) {
            costUsd = costResult.snapshot.costUsd;
          }
        } catch {
          // cost fetch is best-effort
        }
      }

      // Sync assignee from Paperclip → local DB if local has no claim
      const assigneeSync: Record<string, string> = {};
      if (snapshot.assigneeAgentId && !task.claimed_by) {
        assigneeSync.assigned_agent = snapshot.assigneeAgentId;
      }

      await supabase
        .from('paperclip_tasks')
        .update({
          status: newTaskStatus,
          consecutive_failures: newTaskStatus === 'running' ? 0 : task.consecutive_failures,
          ...(costUsd !== null && costUsd !== undefined ? { cost_usd: costUsd } : {}),
          ...(newTaskStatus !== task.status ? { last_error: null } : {}),
          ...assigneeSync,
        })
        .eq('id', task.id);

      result.newStatus = newTaskStatus;
      result.costUsd = costUsd ?? undefined;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown poll error';
      result.error = errorMsg;

      // Check if this error is adapter-related → trigger fallback
      if (task.assigned_agent && isAdapterQuotaError(errorMsg)) {
        const currentAdapter = await getAgentAdapter(task.assigned_agent);
        if (currentAdapter) {
          const nextAdapter = getNextAdapter(currentAdapter);
          if (nextAdapter) {
            await switchAgentAdapter({
              baseUrl: PAPERCLIP_BASE_URL,
              apiKey: PAPERCLIP_API_KEY,
              agentId: task.assigned_agent,
              newAdapterType: nextAdapter,
            });
            result.adapterSwitch = { from: currentAdapter, to: nextAdapter };
          }
        }
      }

      await supabase
        .from('paperclip_tasks')
        .update({
          consecutive_failures: task.consecutive_failures + 1,
          last_error: errorMsg,
        })
        .eq('id', task.id);
    }

    results.push(result);
  }

  // ── Credit guard cycle (fire-and-forget, rate-limited to every 5 min) ──
  // Runs after every poll pass so monitoring happens without a dedicated cron.
  // Errors are swallowed — poll health is independent of credit guard health.
  const paperclipCompanyId = process.env.NEXT_PUBLIC_PAPERCLIP_COMPANY_ID ?? '';
  if (PAPERCLIP_API_KEY && paperclipCompanyId) {
    runCreditGuardCycle(supabase as unknown as CreditGuardReader, {
      baseUrl: PAPERCLIP_BASE_URL,
      companyId: paperclipCompanyId,
      apiKey: PAPERCLIP_API_KEY,
      projectId: process.env.PAPERCLIP_PROJECT_ID,
    }).catch((err) =>
      console.warn(
        '[task-queue/poll] credit guard cycle error:',
        err instanceof Error ? err.message : err,
      ),
    );
  }

  return NextResponse.json({
    ok: true,
    polled: results.length,
    results,
  });
}
