// Thin Paperclip REST client. Pure function so it can be unit-tested by
// injecting a fetch mock, and reused by Next.js route handlers or any Node
// caller. Keeps all auth/error handling in one place.

import type { PaperclipIssuePayload, PaperclipIssueStatus } from './types';

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

  const normalizedBase = baseUrl.replace(/\/+$/, '');
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
  const issueUrl = `${normalizedBase}/VIS/issues/${slug}`;

  return { ok: true, issue, issueUrl };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
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
    issueUrl: `${normalizedBase}/VIS/issues/${issueKey}`,
    terminal: isTerminalIssueStatus(status),
  };

  return { ok: true, snapshot };
}
