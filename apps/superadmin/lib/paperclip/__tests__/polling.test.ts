import {
  getPaperclipIssuePollDelayMs,
  getWorktreesTablePollIntervalMs,
  isTerminalPaperclipRunStatus,
  POLL_CONSECUTIVE_ERROR_LIMIT,
} from '../polling';

describe('isTerminalPaperclipRunStatus', () => {
  it('treats terminal run statuses', () => {
    expect(isTerminalPaperclipRunStatus('succeeded')).toBe(true);
    expect(isTerminalPaperclipRunStatus('failed')).toBe(true);
    expect(isTerminalPaperclipRunStatus('errored')).toBe(true);
    expect(isTerminalPaperclipRunStatus('cancelled')).toBe(true);
  });

  it('treats queued/running as non-terminal', () => {
    expect(isTerminalPaperclipRunStatus('queued')).toBe(false);
    expect(isTerminalPaperclipRunStatus('running')).toBe(false);
    expect(isTerminalPaperclipRunStatus(undefined)).toBe(false);
  });
});

describe('getPaperclipIssuePollDelayMs', () => {
  it('uses slow interval when issue is blocked', () => {
    expect(
      getPaperclipIssuePollDelayMs({
        issueStatus: 'blocked',
        runStatus: undefined,
        elapsedMs: 0,
        consecutiveErrors: 0,
      }),
    ).toBe(30_000);
  });

  it('backs off on consecutive errors', () => {
    expect(
      getPaperclipIssuePollDelayMs({
        issueStatus: 'in_progress',
        runStatus: 'running',
        elapsedMs: 0,
        consecutiveErrors: 1,
      }),
    ).toBe(10_000);
    expect(
      getPaperclipIssuePollDelayMs({
        issueStatus: 'in_progress',
        runStatus: 'running',
        elapsedMs: 0,
        consecutiveErrors: 3,
      }),
    ).toBe(40_000);
  });

  it('returns null when consecutive errors hit the limit', () => {
    expect(
      getPaperclipIssuePollDelayMs({
        issueStatus: 'in_progress',
        runStatus: 'running',
        elapsedMs: 0,
        consecutiveErrors: POLL_CONSECUTIVE_ERROR_LIMIT,
      }),
    ).toBeNull();
  });

  it('returns null for errors beyond the limit', () => {
    expect(
      getPaperclipIssuePollDelayMs({
        issueStatus: 'in_progress',
        runStatus: 'running',
        elapsedMs: 0,
        consecutiveErrors: POLL_CONSECUTIVE_ERROR_LIMIT + 3,
      }),
    ).toBeNull();
  });

  it('speeds up in_progress early then slows', () => {
    expect(
      getPaperclipIssuePollDelayMs({
        issueStatus: 'in_progress',
        runStatus: 'running',
        elapsedMs: 60_000,
        consecutiveErrors: 0,
      }),
    ).toBe(5_000);
    expect(
      getPaperclipIssuePollDelayMs({
        issueStatus: 'in_progress',
        runStatus: 'running',
        elapsedMs: 6 * 60_000,
        consecutiveErrors: 0,
      }),
    ).toBe(10_000);
    expect(
      getPaperclipIssuePollDelayMs({
        issueStatus: 'in_progress',
        runStatus: 'running',
        elapsedMs: 20 * 60_000,
        consecutiveErrors: 0,
      }),
    ).toBe(15_000);
  });

  it('caps backoff at 120s for errors below the limit', () => {
    const result = getPaperclipIssuePollDelayMs({
      issueStatus: 'in_progress',
      runStatus: 'running',
      elapsedMs: 0,
      consecutiveErrors: 4, // 5000 * 16 = 80_000, below 120_000 cap
    });
    expect(result).toBe(80_000);
  });
});

describe('getWorktreesTablePollIntervalMs', () => {
  it('slows when list empty', () => {
    expect(getWorktreesTablePollIntervalMs('ok', [], {})).toBe(45_000);
  });

  it('stays fast when cost still loading for mapped issue', () => {
    expect(
      getWorktreesTablePollIntervalMs(
        'ok',
        [{ slug: 'a', issueId: 'x', commitCount: 0 }],
        { a: { phase: 'loading' } },
      ),
    ).toBe(10_000);
  });

  it('slows down when cost loading is stuck beyond timeout', () => {
    const threeMinutesAgo = Date.now() - 4 * 60 * 1000;
    expect(
      getWorktreesTablePollIntervalMs(
        'ok',
        [{ slug: 'a', issueId: 'x', commitCount: 0 }],
        { a: { phase: 'loading' } },
        { a: threeMinutesAgo },
      ),
    ).toBe(35_000);
  });

  it('stays fast when cost loading is recent even with timestamp', () => {
    const recentlyStarted = Date.now() - 30_000; // 30s ago
    expect(
      getWorktreesTablePollIntervalMs(
        'ok',
        [{ slug: 'a', issueId: 'x', commitCount: 0 }],
        { a: { phase: 'loading' } },
        { a: recentlyStarted },
      ),
    ).toBe(10_000);
  });

  it('slows when all mapped costs terminal and no commits', () => {
    expect(
      getWorktreesTablePollIntervalMs(
        'ok',
        [{ slug: 'a', issueId: 'x', commitCount: 0 }],
        { a: { phase: 'ok', runStatus: 'succeeded' } },
      ),
    ).toBe(35_000);
  });

  it('stays fast when commits present', () => {
    expect(
      getWorktreesTablePollIntervalMs(
        'ok',
        [{ slug: 'a', issueId: undefined, commitCount: 2 }],
        {},
      ),
    ).toBe(10_000);
  });

  it('uses slower interval on fetch error', () => {
    expect(getWorktreesTablePollIntervalMs('error', [], {})).toBe(30_000);
  });
});
