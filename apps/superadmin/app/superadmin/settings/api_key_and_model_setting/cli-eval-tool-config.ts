/**
 * Mapping of "coding-tool CLIs" we evaluate against ollama-cloud models.
 *
 * Execution path: each row is launched via
 *   `ollama launch <tool> --model <m> --yes -- <tool-headless-args...>`
 * The actual spawn happens server-side in /api/ai-settings/cli-eval-runs;
 * this file is purely UI metadata (label, dropdown choices, status badges).
 *
 * `status` values come from real terminal TDD against ollama 0.21.1
 * (2026-05-03):
 *   - verified   : runs end-to-end with non-empty stdout
 *   - unverified : known to hang or behave oddly; surface a hint in UI
 *   - todo       : no headless path yet
 */

export type CodingTool = 'claude' | 'codex' | 'opencode' | 'copilot';

export type ToolHeadlessStatus = 'verified' | 'unverified' | 'todo';

export type CliEvalToolConfig = {
  id: CodingTool;
  label: string;
  /** Human-readable command preview shown in the UI (the API builds the real argv). */
  commandPreview: string;
  status: ToolHeadlessStatus;
  notes?: string;
};

export const TOOL_CONFIGS: CliEvalToolConfig[] = [
  {
    id: 'claude',
    label: 'Claude Code',
    commandPreview: 'ollama launch claude --model <m> --yes -- -p "<prompt>"',
    status: 'verified',
  },
  {
    id: 'codex',
    label: 'Codex CLI',
    commandPreview:
      'ollama launch codex --model <m> --yes -- exec --oss --local-provider ollama-chat -m <m> "<prompt>"',
    status: 'verified',
    notes: 'codex 走 --oss + --local-provider ollama-chat，stdout 每行被 codex 自身格式 prefix。',
  },
  {
    id: 'copilot',
    label: 'GitHub Copilot CLI',
    commandPreview: 'ollama launch copilot --model <m> --yes -- -p "<prompt>" --allow-all-tools',
    status: 'verified',
    notes: 'copilot 結尾會附 token / 時間統計，不是純粹模型輸出。',
  },
  {
    id: 'opencode',
    label: 'OpenCode',
    commandPreview: 'OPENCODE_CONFIG_CONTENT=… opencode run -m ollama/<m> "<prompt>"',
    status: 'verified',
    notes: 'opencode 不走 ollama launch wrapper（會 hang），改用 OPENCODE_CONFIG_CONTENT env 直接注入 ollama provider 後 spawn opencode run。',
  },
];

/**
 * Cloud-only ollama models confirmed available on this machine
 * (verified against `curl http://localhost:11434/api/tags` 2026-05-03).
 */
export const OLLAMA_CLOUD_MODELS: string[] = [
  'kimi-k2.6:cloud',
  'minimax-m2:cloud',
  'deepseek-v3.1:671b-cloud',
  'qwen3-coder:480b-cloud',
];

export function findToolConfig(id: CodingTool | string): CliEvalToolConfig | null {
  return TOOL_CONFIGS.find((tool) => tool.id === id) ?? null;
}

export function pickRandomOllamaModel(currentModel?: string): string {
  if (OLLAMA_CLOUD_MODELS.length === 0) return currentModel ?? '';
  if (OLLAMA_CLOUD_MODELS.length === 1) return OLLAMA_CLOUD_MODELS[0];
  const pool = currentModel
    ? OLLAMA_CLOUD_MODELS.filter((m) => m !== currentModel)
    : OLLAMA_CLOUD_MODELS;
  return pool[Math.floor(Math.random() * pool.length)] ?? OLLAMA_CLOUD_MODELS[0];
}
