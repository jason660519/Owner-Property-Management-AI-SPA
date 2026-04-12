import {
  DEFAULT_AUTO_POLICY,
  buildInitialAutoRunState,
  isTerminalRunStatus,
  nextAutoStateAfterSuccess,
  nextAutoStateAfterFailure,
  deriveRowStatusHintFromAutoState,
  shouldRetryAutoRun,
  resetAutoRunStateForManualMode,
  readStoredExecutionMode,
  readStoredAutoPolicy,
  writeStoredExecutionMode,
  writeStoredAutoPolicy,
} from './prompt-auto-loop';

describe('prompt-auto-loop', () => {
  it('builds initial state with defaults', () => {
    const state = buildInitialAutoRunState();
    expect(state.phase).toBe('idle');
    expect(state.attemptCount).toBe(0);
    expect(state.consecutiveFailures).toBe(0);
    expect(state.lastRunStatus).toBeNull();
    expect(DEFAULT_AUTO_POLICY.maxAttempts).toBe(2);
  });

  it('identifies terminal run statuses', () => {
    expect(isTerminalRunStatus('succeeded')).toBe(true);
    expect(isTerminalRunStatus('failed')).toBe(true);
    expect(isTerminalRunStatus('errored')).toBe(true);
    expect(isTerminalRunStatus('cancelled')).toBe(true);
    expect(isTerminalRunStatus('running')).toBe(false);
    expect(isTerminalRunStatus('queued')).toBe(false);
  });

  it('increments attempt count on failure', () => {
    const initial = buildInitialAutoRunState();
    const next = nextAutoStateAfterFailure(initial, {
      runId: 'run-1',
      runStatus: 'failed',
      reason: 'Adapter failed',
      policy: DEFAULT_AUTO_POLICY,
    });
    expect(next.attemptCount).toBe(1);
    expect(next.consecutiveFailures).toBe(1);
    expect(next.lastRunId).toBe('run-1');
    expect(next.lastFailureReason).toBe('Adapter failed');
  });

  it('sets cooling_down before tripping threshold', () => {
    const initial = buildInitialAutoRunState();
    const next = nextAutoStateAfterFailure(initial, {
      runId: 'run-2',
      runStatus: 'failed',
      reason: 'temporary',
      policy: { ...DEFAULT_AUTO_POLICY, circuitBreakerThreshold: 3 },
    });
    expect(next.phase).toBe('cooling_down');
  });

  it('trips circuit breaker after threshold reached', () => {
    const initial = {
      ...buildInitialAutoRunState(),
      consecutiveFailures: 2,
      attemptCount: 2,
    };
    const next = nextAutoStateAfterFailure(initial, {
      runId: 'run-3',
      runStatus: 'failed',
      reason: 'still failing',
      policy: { ...DEFAULT_AUTO_POLICY, circuitBreakerThreshold: 3 },
    });
    expect(next.phase).toBe('tripped');
    expect(next.consecutiveFailures).toBe(3);
  });

  it('stops retrying when max attempts reached', () => {
    const state = {
      ...buildInitialAutoRunState(),
      attemptCount: 2,
      consecutiveFailures: 1,
    };
    const canRetry = shouldRetryAutoRun(state, { ...DEFAULT_AUTO_POLICY, maxAttempts: 2 });
    expect(canRetry).toBe(false);
  });

  it('allows retry after first failure when max attempts is two', () => {
    const failedOnce = nextAutoStateAfterFailure(buildInitialAutoRunState(), {
      runId: 'run-1',
      runStatus: 'failed',
      reason: 'first failure',
      policy: { ...DEFAULT_AUTO_POLICY, maxAttempts: 2 },
    });
    const canRetry = shouldRetryAutoRun(failedOnce, { ...DEFAULT_AUTO_POLICY, maxAttempts: 2 });
    expect(canRetry).toBe(true);
  });

  it('resets execution state for manual mode', () => {
    const state = {
      ...buildInitialAutoRunState(),
      phase: 'running' as const,
      attemptCount: 2,
      consecutiveFailures: 1,
      lastRunId: 'run-99',
      lastRunStatus: 'failed',
      lastFailureReason: 'x',
    };
    const reset = resetAutoRunStateForManualMode(state);
    expect(reset.phase).toBe('idle');
    expect(reset.attemptCount).toBe(0);
    expect(reset.consecutiveFailures).toBe(0);
    expect(reset.lastRunId).toBeNull();
  });

  it('clears failures after success', () => {
    const state = {
      ...buildInitialAutoRunState(),
      phase: 'running' as const,
      attemptCount: 2,
      consecutiveFailures: 2,
      lastFailureReason: 'previous fail',
    };
    const next = nextAutoStateAfterSuccess(state, { runId: 'run-ok' });
    expect(next.phase).toBe('idle');
    expect(next.lastRunStatus).toBe('succeeded');
    expect(next.consecutiveFailures).toBe(0);
    expect(next.lastFailureReason).toBeNull();
  });

  it('persists and reads execution mode', () => {
    const storage = window.localStorage;
    storage.removeItem('pp_prompt_execution_mode');
    writeStoredExecutionMode(storage, 'auto');
    expect(readStoredExecutionMode(storage)).toBe('auto');
  });

  it('persists and reads auto policy', () => {
    const storage = window.localStorage;
    storage.removeItem('pp_prompt_auto_policy');
    const policy = {
      maxAttempts: 4,
      cooldownSeconds: 20,
      circuitBreakerThreshold: 2,
    };
    writeStoredAutoPolicy(storage, policy);
    expect(readStoredAutoPolicy(storage)).toEqual(policy);
  });

  it('maps failed idle auto state to on_hold hint', () => {
    const state = {
      ...buildInitialAutoRunState(),
      phase: 'idle' as const,
      lastRunStatus: 'failed' as const,
    };
    expect(deriveRowStatusHintFromAutoState(state)).toBe('on_hold');
  });
});
