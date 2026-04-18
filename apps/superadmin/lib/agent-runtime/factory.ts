// AgentRuntime factory — single point for route handlers to acquire the
// active runtime. Route handlers should never call new PaperclipRuntime()
// directly — use getAgentRuntime() so swapping backends is a one-line change.
//
// Backend selection (env var AGENT_RUNTIME):
//   - 'paperclip' (default): Paperclip HTTP service (Phase 0)
//   - 'local'   (future):   Supabase + child_process runtime (Phase 1)
//
// Required env for 'paperclip' backend:
//   - NEXT_PUBLIC_PAPERCLIP_BASE_URL
//   - PAPERCLIP_API_KEY
//   - NEXT_PUBLIC_PAPERCLIP_COMPANY_ID

import { PaperclipRuntime } from './paperclip-runtime';
import type { AgentRuntime, GetRuntimeResult } from './interface';

type BackendName = 'paperclip' | 'local';

function resolveBackend(): BackendName {
  const raw = process.env.AGENT_RUNTIME?.trim().toLowerCase();
  if (raw === 'local') return 'local';
  return 'paperclip';
}

/**
 * Returns the active AgentRuntime. Never throws — missing config is returned
 * as { ok: false } so route handlers can emit a structured 500 with a
 * human-readable message (same pattern as the rest of lib/paperclip/*).
 */
export function getAgentRuntime(): GetRuntimeResult {
  const backend = resolveBackend();

  if (backend === 'local') {
    return {
      ok: false,
      status: 501,
      error:
        "AGENT_RUNTIME=local is reserved for Phase 1. LocalRuntime is not yet implemented.",
    };
  }

  // backend === 'paperclip'
  //
  // Only baseUrl and apiKey are required at factory time — they are needed
  // by every method on the interface. companyId is only consumed by
  // createIssue, so it's validated lazily inside PaperclipRuntime.createIssue
  // to avoid breaking read-only routes (status / cost / run-log) that never
  // supplied it historically.
  const baseUrl = process.env.NEXT_PUBLIC_PAPERCLIP_BASE_URL;
  const apiKey = process.env.PAPERCLIP_API_KEY;
  const companyId = process.env.NEXT_PUBLIC_PAPERCLIP_COMPANY_ID;

  if (!baseUrl) {
    return {
      ok: false,
      status: 500,
      error: 'NEXT_PUBLIC_PAPERCLIP_BASE_URL not set.',
    };
  }
  if (!apiKey) {
    return { ok: false, status: 500, error: 'PAPERCLIP_API_KEY not set.' };
  }

  const runtime: AgentRuntime = new PaperclipRuntime({
    baseUrl,
    apiKey,
    companyId,
  });
  return { ok: true, runtime };
}

/**
 * Convenience for tests / server utilities that already validated config
 * and just want to inject a runtime. Production code should prefer
 * getAgentRuntime() so env var discipline is centralized.
 */
export function getAgentRuntimeOrThrow(): AgentRuntime {
  const result = getAgentRuntime();
  if (!result.ok) {
    throw new Error(`getAgentRuntimeOrThrow: ${result.error}`);
  }
  return result.runtime;
}
