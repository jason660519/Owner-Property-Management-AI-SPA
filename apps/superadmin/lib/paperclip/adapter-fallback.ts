// Adapter fallback chain for Paperclip agents.
// When an agent's current adapter fails (quota exceeded, API down),
// this module switches it to the next adapter in the chain via
// PATCH /api/agents/:id.

/** Adapter types available in Paperclip, ordered by preference.
 *  Only include adapters that passed environment test in the container.
 *
 *  Rotation order:
 *    1. claude_local   — Best coding quality, subscription-based (no extra API cost)
 *    2. codex_local    — GPT-5.3 Codex, strong coding
 *    3. cursor         — Cursor Agent, multi-model via CURSOR_API_KEY
 *    4. hermes_local   — 8 providers, 30+ tools, persistent memory, skills
 *    5. opencode_local — Multi-provider (93 models: OpenAI + Google)
 *    6. pi_local       — Multi-provider (68 models: OpenAI + Google), needs model config
 */
export const ADAPTER_FALLBACK_CHAIN = [
  'claude_local',
  'codex_local',
  'cursor',
  'hermes_local',
  'opencode_local',
  'pi_local',
] as const;

export type PaperclipAdapterType = (typeof ADAPTER_FALLBACK_CHAIN)[number] | string;

/**
 * Given the current adapter type, return the next one in the fallback chain.
 * Returns `null` if we've exhausted all options (wrap back to first on next call).
 */
export function getNextAdapter(current: string): string | null {
  const idx = ADAPTER_FALLBACK_CHAIN.indexOf(current as (typeof ADAPTER_FALLBACK_CHAIN)[number]);
  if (idx === -1) {
    // Unknown adapter — start from the beginning
    return ADAPTER_FALLBACK_CHAIN[0];
  }
  const next = idx + 1;
  if (next >= ADAPTER_FALLBACK_CHAIN.length) {
    // Exhausted chain — wrap around
    return null;
  }
  return ADAPTER_FALLBACK_CHAIN[next];
}

/**
 * Switch a Paperclip agent to a different adapter via REST API.
 * Uses PATCH /api/agents/:id (discovered from Paperclip source).
 */
export async function switchAgentAdapter(args: {
  baseUrl: string;
  apiKey: string;
  agentId: string;
  newAdapterType: string;
}): Promise<{ ok: boolean; adapterType?: string; error?: string }> {
  try {
    const url = `${args.baseUrl.replace(/\/+$/, '')}/api/agents/${encodeURIComponent(args.agentId)}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${args.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ adapterType: args.newAdapterType }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, error: `PATCH agent failed: HTTP ${res.status} ${text}` };
    }

    const data = (await res.json()) as Record<string, unknown>;
    return {
      ok: true,
      adapterType: String(data.adapterType ?? args.newAdapterType),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error switching adapter',
    };
  }
}

/**
 * Detect if a run failure is an adapter/quota issue (vs a task-level failure).
 * These are the errors that should trigger adapter switching.
 */
export function isAdapterQuotaError(errorMessage: string | null | undefined): boolean {
  if (!errorMessage) return false;
  const lower = errorMessage.toLowerCase();
  return (
    lower.includes('quota exceeded') ||
    lower.includes('adapter_failed') ||
    lower.includes('rate limit') ||
    lower.includes('rate_limit') ||
    lower.includes('429') ||
    lower.includes('billing') ||
    lower.includes('insufficient_quota') ||
    lower.includes('exceeded your current quota')
  );
}
