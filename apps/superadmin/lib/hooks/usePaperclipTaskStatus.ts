'use client';

// Shared polling hook for Paperclip issue status, cost, and run log.
// Used by TaskStatusChip and TaskDetailPanel so polling lives outside the modal.

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  FetchIssueStatusResult,
  IssueStatusSnapshot as PaperclipIssueStatusSnapshot,
  FetchIssueCostResult,
  IssueCostSnapshot as PaperclipIssueCostSnapshot,
  FetchIssueRunLogResult,
  IssueRunLogSnapshot as PaperclipIssueRunLogSnapshot,
} from '@/lib/agent-runtime';
import type { PaperclipIssueStatus } from '@/lib/paperclip/types';
import { getPaperclipIssuePollDelayMs, POLL_CONSECUTIVE_ERROR_LIMIT, type IssuePollDelayArgs } from '@/lib/paperclip/polling';

export interface PaperclipTaskStatusState {
  liveStatus: PaperclipIssueStatusSnapshot | null;
  cost: PaperclipIssueCostSnapshot | null;
  runLog: PaperclipIssueRunLogSnapshot | null;
  pollStopped: boolean;
}

export interface UsePaperclipTaskStatusReturn extends PaperclipTaskStatusState {
  retriggerPoll: () => void;
}

const MAX_POLL_MS = 30 * 60 * 1000;

export function usePaperclipTaskStatus(
  issueId: string | null,
  userId: string,
): UsePaperclipTaskStatusReturn {
  const [liveStatus, setLiveStatus] = useState<PaperclipIssueStatusSnapshot | null>(null);
  const [cost, setCost] = useState<PaperclipIssueCostSnapshot | null>(null);
  const [runLog, setRunLog] = useState<PaperclipIssueRunLogSnapshot | null>(null);
  const [pollStopped, setPollStopped] = useState(false);
  const retriggerRef = useRef(0);

  const retriggerPoll = useCallback(() => {
    setPollStopped(false);
    retriggerRef.current += 1;
  }, []);

  useEffect(() => {
    if (!issueId) return;
    let cancelled = false;
    const startedAt = Date.now();
    let costFetched = false;
    let consecutiveErrors = 0;
    let wakeTimer: number | null = null;
    const lastIssueStatus = { current: 'todo' as PaperclipIssueStatus };
    let cachedRunId: string | undefined;

    const clearWake = () => {
      if (wakeTimer !== null) {
        window.clearTimeout(wakeTimer);
        wakeTimer = null;
      }
    };

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        clearWake();
        wakeTimer = window.setTimeout(() => {
          wakeTimer = null;
          resolve();
        }, ms);
      });

    const computeDelay = (overrides: Partial<IssuePollDelayArgs>): number | null =>
      getPaperclipIssuePollDelayMs({
        issueStatus: lastIssueStatus.current,
        runStatus: undefined,
        elapsedMs: Date.now() - startedAt,
        consecutiveErrors,
        ...overrides,
      });

    const fetchCostOnce = async () => {
      if (costFetched || cancelled) return;
      costFetched = true;
      try {
        const res = await fetch(
          `/api/paperclip/issues/${encodeURIComponent(issueId)}/cost`,
          { headers: { 'x-user-id': userId } },
        );
        if (!res.ok) return;
        const json = (await res.json()) as FetchIssueCostResult;
        if (cancelled || !json.ok) return;
        setCost(json.snapshot);
      } catch {
        /* cost display is best-effort */
      }
    };

    const fetchRunLogSnapshot = async (): Promise<PaperclipIssueRunLogSnapshot | null> => {
      if (cancelled) return null;
      const params = new URLSearchParams();
      if (cachedRunId) params.set('runId', cachedRunId);
      try {
        const url = `/api/paperclip/issues/${encodeURIComponent(issueId)}/run-log?${params}`;
        const res = await fetch(url, { headers: { 'x-user-id': userId } });
        if (!res.ok) return null;
        const json = (await res.json()) as FetchIssueRunLogResult;
        if (cancelled || !json.ok) return null;
        setRunLog(json.snapshot);
        if (json.snapshot.runId && !cachedRunId) {
          cachedRunId = json.snapshot.runId;
        }
        return json.snapshot;
      } catch {
        return null;
      }
    };

    void (async () => {
      let nextDelayMs: number | null = 0;
      while (!cancelled) {
        if (Date.now() - startedAt > MAX_POLL_MS) break;
        if (nextDelayMs !== null && nextDelayMs > 0) {
          await sleep(nextDelayMs);
        }
        if (cancelled) break;
        try {
          const res = await fetch(
            `/api/paperclip/issues/${encodeURIComponent(issueId)}/status`,
            { headers: { 'x-user-id': userId } },
          );
          if (!res.ok) {
            consecutiveErrors += 1;
            nextDelayMs = computeDelay({});
            if (nextDelayMs === null) { setPollStopped(true); break; }
            continue;
          }
          const json = (await res.json()) as FetchIssueStatusResult;
          if (cancelled || !json.ok) {
            consecutiveErrors += 1;
            nextDelayMs = computeDelay({});
            if (nextDelayMs === null) { setPollStopped(true); break; }
            continue;
          }
          consecutiveErrors = 0;
          lastIssueStatus.current = json.snapshot.status;
          setLiveStatus(json.snapshot);
          const runSnap = await fetchRunLogSnapshot();
          if (json.snapshot.terminal) {
            void fetchCostOnce();
            break;
          }
          nextDelayMs = computeDelay({
            issueStatus: json.snapshot.status,
            runStatus: runSnap?.runStatus,
            consecutiveErrors: 0,
          });
        } catch {
          consecutiveErrors += 1;
          nextDelayMs = computeDelay({});
          if (nextDelayMs === null) { setPollStopped(true); break; }
        }
      }
    })();

    return () => {
      cancelled = true;
      clearWake();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueId, userId, retriggerRef.current]);

  return { liveStatus, cost, runLog, pollStopped, retriggerPoll };
}
