// Thin Paperclip REST client. Pure function so it can be unit-tested by
// injecting a fetch mock, and reused by Next.js route handlers or any Node
// caller. Keeps all auth/error handling in one place.

import type { PaperclipIssuePayload, PaperclipIssueStatus } from './types';
import { buildPaperclipIssueUrl, normalizePaperclipBaseUrl } from './links';

export interface CreateIssueArgs {
  /** Paperclip base URL, e.g. http://localhost:3187 — trailing slash tolerated. */
  baseUrl: string;
  /** Paperclip company UUID (not the short prefix). */
  companyId: string;
  /** Long-lived agent API key (Authorization: Bearer ...). */
  apiKey: string;
  /** Issue body, produced by buildIssuePayload. */
  payload: PaperclipIssuePayload;
  /** Optional fetch implementation for injection in tests. */
  fetchImpl?: typeof fetch;
  /** Optional abort signal. */
  signal?: AbortSignal;
}

/** Shape Paperclip returns for a successfully created issue. Only the fields
 *  we care about — the API returns more but we don't touch them. */
export interface PaperclipIssueResource {
  id: string;
  /** Human-facing key like "VIS-42". */
  issueKey?: string;
  title?: string;
  status?: string;
}

export type CreateIssueResult =
  | {
      ok: true;
      issue: PaperclipIssueResource;
      /** URL to open the issue in the Paperclip UI. Derived, not from API. */
      issueUrl: string;
    }
  | {
      ok: false;
      /** HTTP status from Paperclip, or 0 for network errors. */
      status: number;
      /** Human-readable error message suitable for UI. */
      error: string;
      /** Raw body returned by Paperclip when parseable. */
      detail?: unknown;
    };

const MISSING_CONFIG_MESSAGE =
  'Paperclip client missing required config (baseUrl, companyId, apiKey).';

/**
 * Create a Paperclip issue. Catches network errors and non-2xx responses and
 * returns a discriminated union. Never throws.
 */
export async function createIssue(args: CreateIssueArgs): Promise<CreateIssueResult> {
  const { baseUrl, companyId, apiKey, payload, fetchImpl, signal } = args;

  if (!baseUrl || !companyId || !apiKey) {
    return { ok: false, status: 0, error: MISSING_CONFIG_MESSAGE };
  }

  const normalizedBase = normalizePaperclipBaseUrl(baseUrl);
  const endpoint = `${normalizedBase}/api/companies/${companyId}/issues`;
  const doFetch = fetchImpl ?? globalThis.fetch;

  let response: Response;
  try {
    response = await doFetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? `Network error: ${err.message}` : 'Network error',
    };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const errMessage =
      (isRecord(body) && typeof body.error === 'string' && body.error) ||
      (isRecord(body) && typeof body.message === 'string' && body.message) ||
      `Paperclip API error (HTTP ${response.status})`;
    return {
      ok: false,
      status: response.status,
      error: errMessage,
      detail: body,
    };
  }

  if (!isRecord(body) || typeof body.id !== 'string') {
    return {
      ok: false,
      status: response.status,
      error: 'Paperclip returned an unexpected response shape.',
      detail: body,
    };
  }

  const issue: PaperclipIssueResource = {
    id: body.id,
    issueKey: typeof body.issueKey === 'string' ? body.issueKey : undefined,
    title: typeof body.title === 'string' ? body.title : undefined,
    status: typeof body.status === 'string' ? body.status : undefined,
  };

  const slug = issue.issueKey ?? issue.id;
  const issueUrl = buildPaperclipIssueUrl(normalizedBase, slug);

  return { ok: true, issue, issueUrl };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function pickNumber(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}
function pickString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

// ── updateIssue ──────────────────────────────────────────────────────────

export interface UpdateIssueArgs {
  baseUrl: string;
  apiKey: string;
  issueId: string;
  /** Partial update — only include fields you want to change. */
  payload: { status?: PaperclipIssueStatus; assigneeAgentId?: string };
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

export type UpdateIssueResult =
  | { ok: true; issue: PaperclipIssueResource }
  | { ok: false; status: number; error: string; detail?: unknown };

/**
 * Update a Paperclip issue (status, assignee, etc.) via PATCH.
 * Same error-discipline as createIssue: never throws, always returns a
 * discriminated union.
 */
export async function updateIssue(args: UpdateIssueArgs): Promise<UpdateIssueResult> {
  const { baseUrl, apiKey, issueId, payload, fetchImpl, signal } = args;

  if (!baseUrl || !apiKey || !issueId) {
    return { ok: false, status: 0, error: 'updateIssue missing required config.' };
  }

  const normalizedBase = normalizePaperclipBaseUrl(baseUrl);
  const endpoint = `${normalizedBase}/api/issues/${encodeURIComponent(issueId)}`;
  const doFetch = fetchImpl ?? globalThis.fetch;

  let response: Response;
  try {
    response = await doFetch(endpoint, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? `Network error: ${err.message}` : 'Network error',
    };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const errMessage =
      (isRecord(body) && typeof body.error === 'string' && body.error) ||
      (isRecord(body) && typeof body.message === 'string' && body.message) ||
      `Paperclip API error (HTTP ${response.status})`;
    return { ok: false, status: response.status, error: errMessage, detail: body };
  }

  if (!isRecord(body) || typeof body.id !== 'string') {
    return {
      ok: false,
      status: response.status,
      error: 'Paperclip returned an unexpected response shape.',
      detail: body,
    };
  }

  return {
    ok: true,
    issue: {
      id: body.id,
      issueKey: typeof body.issueKey === 'string' ? body.issueKey : undefined,
      title: typeof body.title === 'string' ? body.title : undefined,
      status: typeof body.status === 'string' ? body.status : undefined,
    },
  };
}

// ── fetchIssueCost ────────────────────────────────────────────────────────

export interface FetchIssueCostArgs {
  baseUrl: string;
  apiKey: string;
  issueId: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

export interface PaperclipIssueCostSnapshot {
  issueId: string;
  /** Run ID used for cost source; undefined when no run has executed yet. */
  runId?: string;
  costUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  model?: string;
  /** Run status — useful to tell "still running" apart from "never ran". */
  runStatus?: string;
  /** ISO 8601 finish time of the run, when available. */
  finishedAt?: string;
}

export type FetchIssueCostResult =
  | { ok: true; snapshot: PaperclipIssueCostSnapshot }
  | { ok: false; status: number; error: string; detail?: unknown };

/**
 * Two-hop lookup: issue → executionRunId → heartbeat run detail.
 * Returns a flat cost snapshot. Never throws. Missing runId still returns
 * ok:true with an empty snapshot so the UI can show "(no run yet)".
 */
export async function fetchIssueCost(
  args: FetchIssueCostArgs,
): Promise<FetchIssueCostResult> {
  const { baseUrl, apiKey, issueId, fetchImpl, signal } = args;

  if (!baseUrl || !apiKey || !issueId) {
    return {
      ok: false,
      status: 0,
      error: 'fetchIssueCost missing required config (baseUrl, apiKey, issueId).',
    };
  }

  const normalizedBase = normalizePaperclipBaseUrl(baseUrl);
  const doFetch = fetchImpl ?? globalThis.fetch;
  const authHeaders = { Authorization: `Bearer ${apiKey}` };

  // ── Step 1: fetch the issue to discover executionRunId ────────────────
  const issueEndpoint = `${normalizedBase}/api/issues/${encodeURIComponent(issueId)}`;
  let issueResponse: Response;
  try {
    issueResponse = await doFetch(issueEndpoint, { method: 'GET', headers: authHeaders, signal });
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? `Network error: ${err.message}` : 'Network error',
    };
  }
  let issueBody: unknown;
  try {
    issueBody = await issueResponse.json();
  } catch {
    issueBody = null;
  }
  if (!issueResponse.ok) {
    const errMessage =
      (isRecord(issueBody) && typeof issueBody.error === 'string' && issueBody.error) ||
      `Paperclip API error (HTTP ${issueResponse.status})`;
    return { ok: false, status: issueResponse.status, error: errMessage, detail: issueBody };
  }
  if (!isRecord(issueBody)) {
    return {
      ok: false,
      status: issueResponse.status,
      error: 'Paperclip returned an unexpected issue response shape.',
      detail: issueBody,
    };
  }

  const runId = pickString(issueBody.executionRunId) ?? pickString(issueBody.checkoutRunId);
  if (!runId) {
    // No run attached — empty snapshot is a valid, informative result.
    return { ok: true, snapshot: { issueId } };
  }

  // ── Step 2: fetch the heartbeat run detail to pull cost fields ────────
  const runEndpoint = `${normalizedBase}/api/heartbeat-runs/${encodeURIComponent(runId)}`;
  let runResponse: Response;
  try {
    runResponse = await doFetch(runEndpoint, { method: 'GET', headers: authHeaders, signal });
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? `Network error: ${err.message}` : 'Network error',
    };
  }
  let runBody: unknown;
  try {
    runBody = await runResponse.json();
  } catch {
    runBody = null;
  }
  if (!runResponse.ok) {
    const errMessage =
      (isRecord(runBody) && typeof runBody.error === 'string' && runBody.error) ||
      `Paperclip API error (HTTP ${runResponse.status})`;
    return { ok: false, status: runResponse.status, error: errMessage, detail: runBody };
  }
  if (!isRecord(runBody)) {
    return {
      ok: false,
      status: runResponse.status,
      error: 'Paperclip returned an unexpected run response shape.',
      detail: runBody,
    };
  }

  const usage = isRecord(runBody.usageJson) ? runBody.usageJson : undefined;
  const snapshot: PaperclipIssueCostSnapshot = {
    issueId,
    runId,
    runStatus: pickString(runBody.status),
    finishedAt: pickString(runBody.finishedAt),
    costUsd: usage ? pickNumber(usage.costUsd) : undefined,
    inputTokens: usage ? pickNumber(usage.inputTokens) : undefined,
    outputTokens: usage ? pickNumber(usage.outputTokens) : undefined,
    cachedInputTokens: usage ? pickNumber(usage.cachedInputTokens) : undefined,
    model: usage ? pickString(usage.model) : undefined,
  };

  return { ok: true, snapshot };
}

// ── fetchIssueRunLog ──────────────────────────────────────────────────────

export interface FetchIssueRunLogArgs {
  baseUrl: string;
  apiKey: string;
  issueId: string;
  /** Optional: skip the issue→runId discovery hop and go straight to this
   *  run. Used by the Modal to keep polling after Paperclip has cleared
   *  `executionRunId` on the issue (which happens once the run is terminal). */
  runId?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

export interface PaperclipIssueRunLogSnapshot {
  issueId: string;
  /** Run ID — undefined when the issue has never had a heartbeat run. */
  runId?: string;
  /** Run status — 'queued' / 'running' / 'succeeded' / 'failed' / 'errored'. */
  runStatus?: string;
  /** ISO 8601 start time of the run, when available. */
  startedAt?: string;
  /** ISO 8601 finish time of the run (populated once the run is terminal). */
  finishedAt?: string;
  /** Human-readable excerpt of stdout — Paperclip caps length server-side. */
  stdoutExcerpt?: string;
  /** Human-readable excerpt of stderr. */
  stderrExcerpt?: string;
  /** Process exit code — 0 for success, non-zero for failure, undefined while running. */
  exitCode?: number;
}

export type FetchIssueRunLogResult =
  | { ok: true; snapshot: PaperclipIssueRunLogSnapshot }
  | { ok: false; status: number; error: string; detail?: unknown };

/**
 * Two-hop lookup: issue → executionRunId → heartbeat run detail. Pulls the
 * live stdout excerpt + status so the Modal can stream progress while the
 * agent is working. Never throws. Missing runId still returns ok:true with
 * an empty snapshot so the UI can show "(no run yet)".
 */
export async function fetchIssueRunLog(
  args: FetchIssueRunLogArgs,
): Promise<FetchIssueRunLogResult> {
  const { baseUrl, apiKey, issueId, runId: explicitRunId, fetchImpl, signal } = args;

  if (!baseUrl || !apiKey || !issueId) {
    return {
      ok: false,
      status: 0,
      error: 'fetchIssueRunLog missing required config (baseUrl, apiKey, issueId).',
    };
  }

  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const doFetch = fetchImpl ?? globalThis.fetch;
  const authHeaders = { Authorization: `Bearer ${apiKey}` };

  // Discover runId: prefer the caller-supplied one (cached from a previous
  // poll), falling back to the issue→executionRunId two-hop.
  let runId = explicitRunId;

  if (!runId) {
    // Step 1: fetch the issue to discover executionRunId.
    const issueEndpoint = `${normalizedBase}/api/issues/${encodeURIComponent(issueId)}`;
    let issueResponse: Response;
    try {
      issueResponse = await doFetch(issueEndpoint, { method: 'GET', headers: authHeaders, signal });
    } catch (err) {
      return {
        ok: false,
        status: 0,
        error: err instanceof Error ? `Network error: ${err.message}` : 'Network error',
      };
    }
    let issueBody: unknown;
    try {
      issueBody = await issueResponse.json();
    } catch {
      issueBody = null;
    }
    if (!issueResponse.ok) {
      const errMessage =
        (isRecord(issueBody) && typeof issueBody.error === 'string' && issueBody.error) ||
        `Paperclip API error (HTTP ${issueResponse.status})`;
      return { ok: false, status: issueResponse.status, error: errMessage, detail: issueBody };
    }
    if (!isRecord(issueBody)) {
      return {
        ok: false,
        status: issueResponse.status,
        error: 'Paperclip returned an unexpected issue response shape.',
        detail: issueBody,
      };
    }

    runId = pickString(issueBody.executionRunId) ?? pickString(issueBody.checkoutRunId);
    if (!runId) {
      return { ok: true, snapshot: { issueId } };
    }
  }

  // Step 2: fetch the heartbeat run detail.
  const runEndpoint = `${normalizedBase}/api/heartbeat-runs/${encodeURIComponent(runId)}`;
  let runResponse: Response;
  try {
    runResponse = await doFetch(runEndpoint, { method: 'GET', headers: authHeaders, signal });
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? `Network error: ${err.message}` : 'Network error',
    };
  }
  let runBody: unknown;
  try {
    runBody = await runResponse.json();
  } catch {
    runBody = null;
  }
  if (!runResponse.ok) {
    const errMessage =
      (isRecord(runBody) && typeof runBody.error === 'string' && runBody.error) ||
      `Paperclip API error (HTTP ${runResponse.status})`;
    return { ok: false, status: runResponse.status, error: errMessage, detail: runBody };
  }
  if (!isRecord(runBody)) {
    return {
      ok: false,
      status: runResponse.status,
      error: 'Paperclip returned an unexpected run response shape.',
      detail: runBody,
    };
  }

  const snapshot: PaperclipIssueRunLogSnapshot = {
    issueId,
    runId,
    runStatus: pickString(runBody.status),
    startedAt: pickString(runBody.startedAt),
    finishedAt: pickString(runBody.finishedAt),
    stdoutExcerpt: pickString(runBody.stdoutExcerpt),
    stderrExcerpt: pickString(runBody.stderrExcerpt),
    exitCode: pickNumber(runBody.exitCode),
  };

  return { ok: true, snapshot };
}

// ── fetchIssueStatus ──────────────────────────────────────────────────────

export interface FetchIssueStatusArgs {
  baseUrl: string;
  apiKey: string;
  issueId: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

export interface PaperclipIssueStatusSnapshot {
  id: string;
  title?: string;
  status: PaperclipIssueStatus;
  updatedAt?: string;
  issueUrl: string;
  /** True if the status is a resting / terminal state — UI should stop polling. */
  terminal: boolean;
  /** Paperclip agent ID assigned to this issue, if any. */
  assigneeAgentId?: string;
}

export type FetchIssueStatusResult =
  | { ok: true; snapshot: PaperclipIssueStatusSnapshot }
  | { ok: false; status: number; error: string; detail?: unknown };

const TERMINAL_STATUSES: ReadonlySet<PaperclipIssueStatus> = new Set([
  'done',
  'cancelled',
]);

/** Tells the UI whether to keep polling. Blocked is NOT terminal because the
 *  agent can be unblocked by a human commenting or re-dispatching. */
export function isTerminalIssueStatus(status: PaperclipIssueStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

/**
 * Read a single issue's live status. Same error-discipline as createIssue:
 * never throws, always returns a discriminated union.
 */
export async function fetchIssueStatus(
  args: FetchIssueStatusArgs,
): Promise<FetchIssueStatusResult> {
  const { baseUrl, apiKey, issueId, fetchImpl, signal } = args;

  if (!baseUrl || !apiKey || !issueId) {
    return {
      ok: false,
      status: 0,
      error: 'fetchIssueStatus missing required config (baseUrl, apiKey, issueId).',
    };
  }

  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const endpoint = `${normalizedBase}/api/issues/${encodeURIComponent(issueId)}`;
  const doFetch = fetchImpl ?? globalThis.fetch;

  let response: Response;
  try {
    response = await doFetch(endpoint, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
      signal,
    });
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? `Network error: ${err.message}` : 'Network error',
    };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const errMessage =
      (isRecord(body) && typeof body.error === 'string' && body.error) ||
      (isRecord(body) && typeof body.message === 'string' && body.message) ||
      `Paperclip API error (HTTP ${response.status})`;
    return { ok: false, status: response.status, error: errMessage, detail: body };
  }

  if (!isRecord(body) || typeof body.id !== 'string' || typeof body.status !== 'string') {
    return {
      ok: false,
      status: response.status,
      error: 'Paperclip returned an unexpected status response shape.',
      detail: body,
    };
  }

  const status = body.status as PaperclipIssueStatus;
  const issueKey = typeof body.issueKey === 'string' ? body.issueKey : body.id;
  const snapshot: PaperclipIssueStatusSnapshot = {
    id: body.id,
    title: typeof body.title === 'string' ? body.title : undefined,
    status,
    updatedAt: typeof body.updatedAt === 'string' ? body.updatedAt : undefined,
    issueUrl: buildPaperclipIssueUrl(normalizedBase, issueKey),
    terminal: isTerminalIssueStatus(status),
    assigneeAgentId: typeof body.assigneeAgentId === 'string' ? body.assigneeAgentId : undefined,
  };

  return { ok: true, snapshot };
}
