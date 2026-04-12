export type ExecutionMode = 'manual' | 'auto';

export type AutoRunPhase = 'idle' | 'running' | 'cooling_down' | 'tripped';

export type AutoRunStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'errored'
  | 'cancelled'
  | 'unknown';

export interface AutoRunPolicy {
  maxAttempts: number;
  cooldownSeconds: number;
  circuitBreakerThreshold: number;
}

export interface AutoRunState {
  phase: AutoRunPhase;
  attemptCount: number;
  consecutiveFailures: number;
  lastRunId: string | null;
  lastRunStatus: AutoRunStatus | null;
  lastFailureReason: string | null;
}

export const DEFAULT_AUTO_POLICY: AutoRunPolicy = {
  maxAttempts: 2,
  cooldownSeconds: 30,
  circuitBreakerThreshold: 3,
};

const AUTO_MODE_KEY = 'pp_prompt_execution_mode';
const AUTO_POLICY_KEY = 'pp_prompt_auto_policy';

export function buildInitialAutoRunState(): AutoRunState {
  return {
    phase: 'idle',
    attemptCount: 0,
    consecutiveFailures: 0,
    lastRunId: null,
    lastRunStatus: null,
    lastFailureReason: null,
  };
}

export function isTerminalRunStatus(status: string | null | undefined): boolean {
  return status === 'succeeded' || status === 'failed' || status === 'errored' || status === 'cancelled';
}

export function shouldRetryAutoRun(state: AutoRunState, policy: AutoRunPolicy): boolean {
  return state.attemptCount < policy.maxAttempts && state.phase !== 'tripped';
}

export function resetAutoRunStateForManualMode(_: AutoRunState): AutoRunState {
  return buildInitialAutoRunState();
}

export function nextAutoStateAfterSuccess(
  state: AutoRunState,
  args: { runId: string | null },
): AutoRunState {
  return {
    ...state,
    phase: 'idle',
    consecutiveFailures: 0,
    lastRunId: args.runId,
    lastRunStatus: 'succeeded',
    lastFailureReason: null,
  };
}

export function nextAutoStateAfterFailure(
  state: AutoRunState,
  args: {
    runId: string | null;
    runStatus: AutoRunStatus;
    reason: string;
    policy: AutoRunPolicy;
  },
): AutoRunState {
  const consecutiveFailures = state.consecutiveFailures + 1;
  const tripped = consecutiveFailures >= args.policy.circuitBreakerThreshold;
  return {
    ...state,
    phase: tripped ? 'tripped' : 'cooling_down',
    attemptCount: state.attemptCount + 1,
    consecutiveFailures,
    lastRunId: args.runId,
    lastRunStatus: args.runStatus,
    lastFailureReason: args.reason,
  };
}

export function deriveRowStatusHintFromAutoState(
  state: AutoRunState,
): 'completed' | 'in_progress' | 'on_hold' | null {
  if (state.phase === 'running' || state.phase === 'cooling_down') {
    return 'in_progress';
  }
  if (state.phase === 'tripped') {
    return 'on_hold';
  }
  if (state.lastRunStatus === 'succeeded') {
    return 'completed';
  }
  if (
    state.lastRunStatus === 'failed' ||
    state.lastRunStatus === 'errored' ||
    state.lastRunStatus === 'cancelled'
  ) {
    return 'on_hold';
  }
  return null;
}

function isValidExecutionMode(value: unknown): value is ExecutionMode {
  return value === 'manual' || value === 'auto';
}

function isFinitePositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function readStoredExecutionMode(storage: Storage | null): ExecutionMode | null {
  if (!storage) return null;
  const raw = storage.getItem(AUTO_MODE_KEY);
  if (!raw) return null;
  return isValidExecutionMode(raw) ? raw : null;
}

export function readStoredAutoPolicy(storage: Storage | null): AutoRunPolicy | null {
  if (!storage) return null;
  const raw = storage.getItem(AUTO_POLICY_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AutoRunPolicy>;
    if (
      !isFinitePositiveInt(parsed.maxAttempts) ||
      !isFinitePositiveInt(parsed.cooldownSeconds) ||
      !isFinitePositiveInt(parsed.circuitBreakerThreshold)
    ) {
      return null;
    }
    return {
      maxAttempts: Math.max(1, Math.floor(parsed.maxAttempts)),
      cooldownSeconds: Math.max(5, Math.floor(parsed.cooldownSeconds)),
      circuitBreakerThreshold: Math.max(1, Math.floor(parsed.circuitBreakerThreshold)),
    };
  } catch {
    return null;
  }
}

export function writeStoredExecutionMode(storage: Storage | null, mode: ExecutionMode): void {
  if (!storage) return;
  storage.setItem(AUTO_MODE_KEY, mode);
}

export function writeStoredAutoPolicy(storage: Storage | null, policy: AutoRunPolicy): void {
  if (!storage) return;
  storage.setItem(AUTO_POLICY_KEY, JSON.stringify(policy));
}
