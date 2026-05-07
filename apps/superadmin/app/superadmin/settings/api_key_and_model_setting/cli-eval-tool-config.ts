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
export type InvocationPath = 'ollama_launch' | 'native_vendor_cli' | 'openai_compatible' | 'direct_tool_config';

export type CliEvalToolConfig = {
  id: CodingTool;
  label: string;
  /** Human-readable command preview shown in the UI (the API builds the real argv). */
  commandPreview: string;
  status: ToolHeadlessStatus;
  notes?: string;
};

export type InvocationPathConfig = {
  id: InvocationPath;
  label: string;
  shortLabel: string;
  description: string;
};

export const TOOL_CONFIGS: CliEvalToolConfig[] = [
  {
    id: 'claude',
    label: 'Claude Code CLI',
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
    label: 'OpenCode CLI',
    commandPreview: 'OPENCODE_CONFIG_CONTENT=… opencode run -m ollama/<m> "<prompt>"',
    status: 'verified',
    notes: 'opencode 不走 ollama launch wrapper（會 hang），改用 OPENCODE_CONFIG_CONTENT env 直接注入 ollama provider 後 spawn opencode run。',
  },
];

export const INVOCATION_PATH_OPTIONS: InvocationPathConfig[] = [
  {
    id: 'ollama_launch',
    label: 'Ollama Launch',
    shortLabel: 'ollama launch',
    description: '透過 ollama launch 包裝本機 CLI，可接 ollama cloud / local model。',
  },
  {
    id: 'native_vendor_cli',
    label: 'Native Vendor CLI',
    shortLabel: 'vendor CLI',
    description: '直接走 Claude / OpenAI / GitHub 等工具原生帳號與設定。',
  },
  {
    id: 'openai_compatible',
    label: 'OpenAI Compatible',
    shortLabel: 'OpenAI compatible',
    description: '走 Ollama / LiteLLM / LM Studio / OpenRouter 類 OpenAI-compatible endpoint。',
  },
  {
    id: 'direct_tool_config',
    label: 'Direct Tool Config',
    shortLabel: 'direct config',
    description: '直接注入 tool-specific provider config，不經 ollama launch wrapper。',
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

export function findInvocationPathConfig(id: InvocationPath | string): InvocationPathConfig | null {
  return INVOCATION_PATH_OPTIONS.find((path) => path.id === id) ?? null;
}

export function defaultInvocationPathForTool(tool: CodingTool): InvocationPath {
  return tool === 'opencode' ? 'direct_tool_config' : 'ollama_launch';
}

export function isValidInvocationPath(value: unknown): value is InvocationPath {
  return typeof value === 'string' && INVOCATION_PATH_OPTIONS.some((path) => path.id === value);
}

export function getInvocationPathAvailability(
  tool: CodingTool,
  invocationPath: InvocationPath,
): { status: ToolHeadlessStatus; notes?: string } {
  if (invocationPath === 'ollama_launch') {
    if (tool === 'opencode') {
      return {
        status: 'todo',
        notes: 'OpenCode CLI 的 ollama launch headless path 已知會 hang，請改用 Direct Tool Config。',
      };
    }
    return { status: 'verified' };
  }
  if (invocationPath === 'direct_tool_config') {
    if (tool === 'opencode') return { status: 'verified' };
    return {
      status: 'todo',
      notes: '此 CLI 尚未實作 direct provider config 注入，請複製成實驗列後改走已支援路徑。',
    };
  }
  if (invocationPath === 'openai_compatible') {
    if (tool === 'codex' || tool === 'opencode') return { status: 'verified' };
    return {
      status: 'todo',
      notes: '此 CLI 尚未接上 OpenAI-compatible endpoint 的 headless 執行器。',
    };
  }
  return {
    status: 'todo',
    notes: 'Native vendor CLI 需要先接各公司原生模型清單與帳號設定，尚未開放執行。',
  };
}

export function pickRandomOllamaModel(currentModel?: string): string {
  if (OLLAMA_CLOUD_MODELS.length === 0) return currentModel ?? '';
  if (OLLAMA_CLOUD_MODELS.length === 1) return OLLAMA_CLOUD_MODELS[0];
  const pool = currentModel
    ? OLLAMA_CLOUD_MODELS.filter((m) => m !== currentModel)
    : OLLAMA_CLOUD_MODELS;
  return pool[Math.floor(Math.random() * pool.length)] ?? OLLAMA_CLOUD_MODELS[0];
}
