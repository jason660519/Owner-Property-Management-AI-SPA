import type { PaperclipIssueStatus } from './types';

/** Heartbeat run statuses that mean no more LLM work for this run. */
export function isTerminalPaperclipRunStatus(status: string | null | undefined): boolean {
  return (
    status === 'succeeded' ||
    status === 'failed' ||
    status === 'errored' ||
    status === 'cancelled'
  );
}

export interface IssuePollDelayArgs {
  issueStatus: PaperclipIssueStatus;
  /** Latest heartbeat run status when known. */
  runStatus?: string | null;
  /** Time since polling started (ms). */
  elapsedMs: number;
  /** Consecutive failed status fetches or thrown errors. */
  consecutiveErrors: number;
}

const ACTIVE_FAST_MS = 5_000;
const ACTIVE_MID_MS = 10_000;
const ACTIVE_SLOW_MS = 15_000;
const BLOCKED_MS = 30_000;
const IDLE_QUEUE_MS = 8_000;

/**
 * Consecutive error threshold: after this many failures in a row the caller
 * should stop automatic polling and show a manual-retry prompt instead.
 */
export const POLL_CONSECUTIVE_ERROR_LIMIT = 5;

/**
 * Next delay before polling Paperclip issue status again.
 * Keeps UI responsive early in a run, then backs off to reduce API traffic.
 *
 * Returns `null` when `consecutiveErrors >= POLL_CONSECUTIVE_ERROR_LIMIT`,
 * signalling the caller to **stop automatic polling** and offer manual retry.
 */
export function getPaperclipIssuePollDelayMs(args: IssuePollDelayArgs): number | null {
  const { issueStatus, runStatus, elapsedMs, consecutiveErrors } = args;

  if (consecutiveErrors >= POLL_CONSECUTIVE_ERROR_LIMIT) {
    return null; // caller should stop and show manual retry
  }

  if (consecutiveErrors > 0) {
    const backoff = Math.min(120_000, ACTIVE_FAST_MS * 2 ** Math.min(consecutiveErrors, 4));
    return backoff;
  }

  if (issueStatus === 'blocked') {
    return BLOCKED_MS;
  }

  if (issueStatus === 'backlog' || issueStatus === 'todo') {
    if (runStatus && !isTerminalPaperclipRunStatus(runStatus)) {
      return elapsedMs < 5 * 60 * 1000 ? ACTIVE_FAST_MS : ACTIVE_MID_MS;
    }
    return IDLE_QUEUE_MS;
  }

  if (issueStatus === 'in_progress' || issueStatus === 'in_review') {
    if (elapsedMs < 5 * 60 * 1000) return ACTIVE_FAST_MS;
    if (elapsedMs < 15 * 60 * 1000) return ACTIVE_MID_MS;
    return ACTIVE_SLOW_MS;
  }

  return ACTIVE_MID_MS;
}

/** Minimal cost row shape for worktrees table polling. */
export interface WorktreeCostPollPhase {
  phase: 'loading' | 'ok' | 'error';
  runStatus?: string;
}

/** Max time (ms) a cost entry can stay in "loading" before we stop treating it as "hot". */
const COST_LOADING_TIMEOUT_MS = 3 * 60 * 1000;

/**
 * List refresh interval for the worktrees dashboard.
 * Slows down when there is nothing "hot" to reduce load on Next + Paperclip proxies.
 *
 * @param costLoadingSinceBySlug - optional map of slug → timestamp when cost
 *   entered "loading" phase. If a cost entry has been loading for longer than
 *   {@link COST_LOADING_TIMEOUT_MS}, it is no longer considered "hot" to avoid
 *   keeping the table at fast poll speed indefinitely when a cost fetch is stuck.
 */
export function getWorktreesTablePollIntervalMs(
  fetchPhase: 'loading' | 'error' | 'ok',
  worktrees: readonly { slug: string; issueId?: string; commitCount: number }[],
  costBySlug: Readonly<Record<string, WorktreeCostPollPhase | undefined>>,
  costLoadingSinceBySlug?: Readonly<Record<string, number | undefined>>,
): number {
  if (fetchPhase === 'loading') return 10_000;
  if (fetchPhase === 'error') return 30_000;

  if (worktrees.length === 0) return 45_000;

  const now = Date.now();
  let anyHot = false;
  for (const w of worktrees) {
    if (w.commitCount > 0) {
      anyHot = true;
      break;
    }
    if (!w.issueId) continue;
    const c = costBySlug[w.slug];
    if (!c || c.phase === 'loading') {
      // Check if loading has been stuck too long
      const since = costLoadingSinceBySlug?.[w.slug];
      if (since && now - since > COST_LOADING_TIMEOUT_MS) {
        continue; // stale loading — not hot
      }
      anyHot = true;
      break;
    }
    if (c.phase === 'ok' && c.runStatus && !isTerminalPaperclipRunStatus(c.runStatus)) {
      anyHot = true;
      break;
    }
  }

  return anyHot ? 10_000 : 35_000;
}
