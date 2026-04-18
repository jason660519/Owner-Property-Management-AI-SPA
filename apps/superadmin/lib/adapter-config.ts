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
    id: 'claude-opus-4-7',
    optionValue: 'claude-opus-4-7',
    optionLabel: 'Claude CLI + Opus 4.7',
    provider: 'claude',
    model: 'claude-opus-4-7',
    status: 'planned',
    useCases: ['complex-architecture', 'deep-review'],
    cliCommandTemplate: 'claude -p "<prompt>"',
    docsPath: 'docs/Adapter CLIs/Claude_Code_CLI.md',
  },
  {
    id: 'claude-sonnet-4-6',
    optionValue: 'claude-sonnet-4-6',
    optionLabel: 'Claude CLI + Sonnet 4.6',
    provider: 'claude',
    model: 'claude-sonnet-4-6',
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
    model: 'claude-opus-4-6',
    status: 'planned',
    useCases: ['complex-architecture', 'deep-review'],
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
    /** OpenAI 帳號可用模型須與驗證快取一致；codex CLI 不支援舊版 xhigh slug */
    model: 'gpt-5.4-pro-2026-03-05',
    status: 'planned',
    useCases: ['code-generation', 'large-refactor'],
    cliCommandTemplate: 'codex exec "<prompt>"',
    docsPath: 'docs/Adapter CLIs/CodeX_CLI.md',
  },
  {
    id: 'codex-gpt-5-3-xhigh',
    optionValue: 'codex-gpt-5-3-xhigh',
    optionLabel: 'Codex CLI + GPT-5.3 Codex (xhigh reasoning)',
    provider: 'codex',
    /**
     * Bugfix 2026/04/19: previously duplicated the 5.4 model slug, making
     * this row indistinguishable from the one above. codex CLI accepts the
     * base slug `gpt-5.3-codex`; "xhigh" controls reasoning effort (passed
     * via --reasoning-effort), not the model slug itself. Matches CLAUDE.md
     * adapter table row "codex_local".
     */
    model: 'gpt-5.3-codex',
    status: 'planned',
    useCases: ['code-fix', 'test-authoring'],
    cliCommandTemplate: 'codex exec "<prompt>"',
    docsPath: 'docs/Adapter CLIs/CodeX_CLI.md',
  },
  {
    id: 'kilo-minimax-m2-6',
    optionValue: 'kilo-minimax-m2-6',
    /**
     * Label keeps "M2.7" for cross-row consistency, but the actual id resolves to M2.5.
     * OpenRouter's `minimax/minimax-m2.7` endpoint silently routes to M2.1 (provider does
     * not yet expose a real M2.7); M2.5 is the highest version that actually returns itself.
     */
    optionLabel: 'Kilo CLI + MiniMax M2.7（實際 M2.5）',
    provider: 'kilo',
    model: 'openrouter/minimax/minimax-m2.5',
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
    model: 'qwen/qwen3.6-plus',
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
    model: 'moonshotai/kimi-k2.5',
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
    model: 'z-ai/glm-5.1',
    status: 'planned',
    useCases: ['multilingual', 'code-assistant'],
    cliCommandTemplate: 'opencode run "<prompt>"',
    docsPath: 'docs/Adapter CLIs/OpenCode_CLI.md',
  },
  {
    id: 'opencode-minimax-m2-7',
    optionValue: 'opencode-minimax-m2-7',
    /**
     * Label keeps "M2.7" for catalog continuity, but the id resolves to M2.5.
     * `opencode models` lists `openrouter/minimax/minimax-m2.7`, but that endpoint silently
     * routes to M2.1 (verified via the model's self-introduction). M2.5 is the highest
     * version that actually identifies itself correctly.
     */
    optionLabel: 'OpenCode CLI + MiniMax M2.7（實際 M2.5）',
    provider: 'opencode',
    model: 'openrouter/minimax/minimax-m2.5',
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
    model: 'qwen/qwen3.6-plus',
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

/** 適配器設定表格「測試 Prompt」欄位與後端啟動 CLI 時的預設內容 */
export const DEFAULT_ADAPTER_TEST_PROMPT = '你是哪一家的模型？型號是？你的專長是？';
