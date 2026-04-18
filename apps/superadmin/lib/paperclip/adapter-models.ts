// Single source of truth for Paperclip adapter ↔ model mapping.
// Both API routes and UI components should import from here.

export const ADAPTER_MODEL_MAP: Record<string, string> = {
  claude_local: 'sonnet',
  codex_local: 'gpt-5.3-codex',
  cursor: 'auto',
  opencode_local: 'google/gemini-2.5-flash',
  hermes_local: 'auto',
  pi_local: 'auto',
} as const;

export type AdapterType = keyof typeof ADAPTER_MODEL_MAP;

export interface AdapterOption {
  id: string;
  label: string;
  model: string;
  billing: string;
}

export const ADAPTER_OPTIONS: AdapterOption[] = [
  { id: 'claude_local',   label: 'Claude (Anthropic)',     model: 'sonnet',              billing: 'Anthropic' },
  { id: 'codex_local',    label: 'Codex (OpenAI)',         model: 'gpt-5.3-codex',       billing: 'OpenAI' },
  { id: 'cursor',         label: 'Cursor (Agent)',         model: 'auto',                billing: 'Cursor' },
  { id: 'opencode_local', label: 'OpenCode (Google)',      model: 'google/gemini-2.5-flash', billing: 'Google' },
  { id: 'hermes_local',   label: 'Hermes (Multi-provider)', model: 'auto',               billing: 'Multi' },
  { id: 'pi_local',       label: 'Pi (Multi-provider)',    model: 'auto',                billing: 'Multi' },
];

export function getModelForAdapter(adapter: string): string {
  return ADAPTER_MODEL_MAP[adapter] ?? 'auto';
}

export function isValidAdapter(adapter: string): adapter is AdapterType {
  return adapter in ADAPTER_MODEL_MAP;
}

export type CronJobType = 'agent_health' | 'work_summary' | 'auto_dispatch';

export const CRON_JOB_OPTIONS: { id: CronJobType; label: string; description: string }[] = [
  { id: 'agent_health',  label: 'Agent Health Check', description: 'Check agent status, auto-switch adapter on failure' },
  { id: 'work_summary',  label: 'Work Summary',       description: 'Scan worktree branches for completed tasks' },
  { id: 'auto_dispatch', label: 'Auto Dispatch',       description: 'Auto-assign idle agents to pending roadmap tasks' },
];
