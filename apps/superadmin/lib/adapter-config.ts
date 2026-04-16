export type AdapterProvider = 'claude' | 'gemini' | 'codex' | 'kilo' | 'opencode';

export type AdapterLifecycleStatus = 'planned' | 'active' | 'deprecated';

export type AdapterConfigItem = {
  id: string;
  optionValue: string;
  optionLabel: string;
  provider: AdapterProvider;
  model: string;
  status: AdapterLifecycleStatus;
  useCases: string[];
  cliCommandTemplate: string;
  docsPath: string;
};

export const ADAPTER_CONFIG_ITEMS: AdapterConfigItem[] = [
  {
    id: 'claude-sonnet-4-6',
    optionValue: 'claude-sonnet-4-6',
    optionLabel: 'Claude CLI + Sonnet 4.6',
    provider: 'claude',
    model: 'sonnet-4.6',
    status: 'planned',
    useCases: ['general-dev', 'reasoning', 'spec-writing'],
    cliCommandTemplate: 'claude -p "<prompt>"',
    docsPath: 'docs/Adapter CLIs/Claude_Code_CLI.md',
  },
  {
    id: 'claude-opus-4-6',
    optionValue: 'claude-opus-4-6',
    optionLabel: 'Claude CLI + Opus 4.6',
    provider: 'claude',
    model: 'opus-4.6',
    status: 'planned',
    useCases: ['complex-architecture', 'deep-review'],
    cliCommandTemplate: 'claude -p "<prompt>"',
    docsPath: 'docs/Adapter CLIs/Claude_Code_CLI.md',
  },
  {
    id: 'claude-haiku-4-5',
    optionValue: 'claude-haiku-4-5',
    optionLabel: 'Claude CLI + Haiku 4.5',
    provider: 'claude',
    model: 'haiku-4.5',
    status: 'planned',
    useCases: ['fast-iteration', 'low-latency-tasks'],
    cliCommandTemplate: 'claude -p "<prompt>"',
    docsPath: 'docs/Adapter CLIs/Claude_Code_CLI.md',
  },
  {
    id: 'gemini-3-1-pro-preview',
    optionValue: 'gemini-3-1-pro-preview',
    optionLabel: 'Gemini CLI + Gemini 3.1 Pro Preview',
    provider: 'gemini',
    model: 'gemini-3.1-pro-preview',
    status: 'planned',
    useCases: ['multimodal', 'large-context'],
    cliCommandTemplate: 'agent -p "<prompt>"',
    docsPath: 'docs/Adapter CLIs/Cursor_CLI.md',
  },
  {
    id: 'codex-gpt-5-4-xhigh',
    optionValue: 'codex-gpt-5-4-xhigh',
    optionLabel: 'Codex CLI + GPT-5.4 (xhigh)',
    provider: 'codex',
    model: 'gpt-5.4-xhigh',
    status: 'planned',
    useCases: ['code-generation', 'large-refactor'],
    cliCommandTemplate: 'codex exec "<prompt>"',
    docsPath: 'docs/Adapter CLIs/CodeX_CLI.md',
  },
  {
    id: 'codex-gpt-5-3-xhigh',
    optionValue: 'codex-gpt-5-3-xhigh',
    optionLabel: 'Codex CLI + GPT-5.3 Codex-xhigh',
    provider: 'codex',
    model: 'gpt-5.3-codex-xhigh',
    status: 'planned',
    useCases: ['code-fix', 'test-authoring'],
    cliCommandTemplate: 'codex exec "<prompt>"',
    docsPath: 'docs/Adapter CLIs/CodeX_CLI.md',
  },
  {
    id: 'kilo-minimax-m2-6',
    optionValue: 'kilo-minimax-m2-6',
    optionLabel: 'Kilo CLI + MiniMax M2.6',
    provider: 'kilo',
    model: 'minimax-m2.6',
    status: 'planned',
    useCases: ['cost-optimized-batch', 'automation'],
    cliCommandTemplate: 'kilo run "<prompt>"',
    docsPath: 'docs/Adapter CLIs/Kilo_CLI.md',
  },
  {
    id: 'kilo-dola-seed-2-0-pro',
    optionValue: 'kilo-dola-seed-2-0-pro',
    optionLabel: 'Kilo CLI + Dola Seed 2.0 Pro',
    provider: 'kilo',
    model: 'dola-seed-2.0-pro',
    status: 'planned',
    useCases: ['analysis', 'batch-planning'],
    cliCommandTemplate: 'kilo run "<prompt>"',
    docsPath: 'docs/Adapter CLIs/Kilo_CLI.md',
  },
  {
    id: 'kilo-qwen-3-6-plus',
    optionValue: 'kilo-qwen-3-6-plus',
    optionLabel: 'Kilo CLI + Qwen 3.6 Plus',
    provider: 'kilo',
    model: 'qwen-3.6-plus',
    status: 'planned',
    useCases: ['chinese-content', 'cost-balanced'],
    cliCommandTemplate: 'kilo run "<prompt>"',
    docsPath: 'docs/Adapter CLIs/Kilo_CLI.md',
  },
  {
    id: 'opencode-kimi-k2-5',
    optionValue: 'opencode-kimi-k2-5',
    optionLabel: 'OpenCode CLI + Kimi K2.5',
    provider: 'opencode',
    model: 'kimi-k2.5',
    status: 'planned',
    useCases: ['long-context', 'code-assistant'],
    cliCommandTemplate: 'opencode run "<prompt>"',
    docsPath: 'docs/Adapter CLIs/OpenCode_CLI.md',
  },
  {
    id: 'opencode-glm-5-1',
    optionValue: 'opencode-glm-5-1',
    optionLabel: 'OpenCode CLI + GLM 5.1',
    provider: 'opencode',
    model: 'glm5.1',
    status: 'planned',
    useCases: ['multilingual', 'code-assistant'],
    cliCommandTemplate: 'opencode run "<prompt>"',
    docsPath: 'docs/Adapter CLIs/OpenCode_CLI.md',
  },
  {
    id: 'opencode-minimax-m2-7',
    optionValue: 'opencode-minimax-m2-7',
    optionLabel: 'OpenCode CLI + MiniMax M2.7',
    provider: 'opencode',
    model: 'minimax-m2.7',
    status: 'planned',
    useCases: ['cost-optimized-batch', 'tool-calling'],
    cliCommandTemplate: 'opencode run "<prompt>"',
    docsPath: 'docs/Adapter CLIs/OpenCode_CLI.md',
  },
  {
    id: 'opencode-qwen-3-6-plus',
    optionValue: 'opencode-qwen-3-6-plus',
    optionLabel: 'OpenCode CLI + Qwen 3.6 Plus',
    provider: 'opencode',
    model: 'qwen3.6-plus',
    status: 'planned',
    useCases: ['chinese-content', 'code-assistant'],
    cliCommandTemplate: 'opencode run "<prompt>"',
    docsPath: 'docs/Adapter CLIs/OpenCode_CLI.md',
  },
];

export const ADAPTER_SELECT_OPTIONS = ADAPTER_CONFIG_ITEMS.map((item) => ({
  value: item.optionValue,
  label: item.optionLabel,
  adapterType: item.provider,
  model: item.model,
}));
