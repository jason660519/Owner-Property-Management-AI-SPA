export type AdapterProvider =
  | 'claude'
  | 'gemini'
  | 'codex'
  | 'kilo'
  | 'opencode'
  | 'ollama_cloud'
  | 'ollama_local';

export type AdapterLifecycleStatus = 'planned' | 'active' | 'deprecated';

export type AdapterConfigItem = {
  id: string;
  optionValue: string;
  optionLabel: string;
  provider: AdapterProvider;
  model: string;
  /**
   * Ordered downgrade chain tried on primary-model failure. Each fallback is attempted
   * via the same path (CLI → CLI, HTTP → HTTP) so speed/stability comparisons stay honest.
   * Values must appear in the provider's validated model list (ai_key_validation_cache) —
   * enforced offline by unit test `adapter-config-fallback-models.test.ts`.
   */
  fallbackModels: string[];
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
    fallbackModels: [
      'claude-sonnet-4-6',
      'claude-opus-4-6',
      'claude-opus-4-5-20251101',
      'claude-haiku-4-5-20251001',
      'claude-sonnet-4-5-20250929',
      'claude-opus-4-1-20250805',
      'claude-opus-4-20250514',
      'claude-sonnet-4-20250514',
    ],
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
    fallbackModels: [
      'claude-opus-4-6',
      'claude-opus-4-5-20251101',
      'claude-haiku-4-5-20251001',
      'claude-sonnet-4-5-20250929',
      'claude-opus-4-1-20250805',
      'claude-opus-4-20250514',
      'claude-sonnet-4-20250514',
    ],
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
    fallbackModels: [
      'claude-opus-4-5-20251101',
      'claude-haiku-4-5-20251001',
      'claude-sonnet-4-5-20250929',
      'claude-opus-4-1-20250805',
      'claude-opus-4-20250514',
      'claude-sonnet-4-20250514',
    ],
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
    fallbackModels: [
      'gemini-3-pro-preview',
      'gemini-3-flash-preview',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
    ],
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
    fallbackModels: [
      'gpt-5.4',
      'gpt-5.4-mini',
      'gpt-5.3-codex',
      'gpt-5.2-codex',
      'gpt-5.1-codex',
      'gpt-5-codex',
    ],
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
    fallbackModels: [
      'gpt-5.2-codex',
      'gpt-5.1-codex',
      'gpt-5-codex',
    ],
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
    fallbackModels: [
      'openrouter/minimax/minimax-m2.1',
      'openrouter/minimax/minimax-m2',
      'openrouter/minimax/minimax-m1',
    ],
    status: 'planned',
    useCases: ['cost-optimized-batch', 'automation'],
    cliCommandTemplate: 'kilo run "<prompt>"',
    docsPath: 'docs/Adapter CLIs/Kilo_CLI.md',
  },
  {
    id: 'kilo-qwen-3-6-plus',
    optionValue: 'kilo-qwen-3-6-plus',
    optionLabel: 'Kilo CLI + Qwen 3.6 Plus',
    provider: 'kilo',
    /** 見 .claude/rules/backend/ai-adapter.md：kilo 須 `openrouter/` 前綴 */
    model: 'openrouter/qwen/qwen3.6-plus',
    fallbackModels: [
      'openrouter/qwen/qwen3.5-plus-02-15',
      'openrouter/qwen/qwen3-max',
      'openrouter/qwen/qwen-plus',
    ],
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
    /** OpenRouter id `moonshotai/kimi-k2.5`；HTTP 會剝除 `openrouter/` 再呼叫 API */
    model: 'openrouter/moonshotai/kimi-k2.5',
    fallbackModels: [
      'openrouter/moonshotai/kimi-k2-thinking',
      'openrouter/moonshotai/kimi-k2',
    ],
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
    /**
     * Must use `openrouter/z-ai/glm-5.1` (not bare `z-ai/glm-5.1`) so the lint rule passes
     * and CLI routing goes through OpenRouter correctly.
     * HTTP: openCodeZenChatModelId strips `openrouter/` → `z-ai/glm-5.1` → Zen table → `glm-5.1`.
     * Confirmed available on OpenCode Zen via #keys validation (推薦: glm-5.1, 2026-04-25).
     */
    model: 'openrouter/z-ai/glm-5.1',
    fallbackModels: [
      'openrouter/z-ai/glm-5',
      'openrouter/z-ai/glm-4.7',
      'openrouter/z-ai/glm-4.6',
    ],
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
    fallbackModels: [
      'openrouter/minimax/minimax-m2.1',
    ],
    status: 'planned',
    useCases: ['cost-optimized-batch', 'tool-calling'],
    cliCommandTemplate: 'opencode run "<prompt>"',
    docsPath: 'docs/Adapter CLIs/OpenCode_CLI.md',
  },
  {
    id: 'opencode-qwen-3-5-plus',
    optionValue: 'opencode-qwen-3-5-plus',
    optionLabel: 'OpenCode CLI + Qwen 3.5 Plus',
    provider: 'opencode',
    /**
     * qwen3.6-plus is not yet available on OpenCode's OpenRouter path or Zen API (as of 2026-04-25).
     * qwen3.5-plus is the latest confirmed-working Qwen on OpenCode (fallback validated via HTTP chain).
     */
    model: 'openrouter/qwen/qwen3.5-plus',
    fallbackModels: [
      'openrouter/qwen/qwen3-max',
      'openrouter/qwen/qwen-plus',
    ],
    status: 'planned',
    useCases: ['chinese-content', 'code-assistant'],
    cliCommandTemplate: 'opencode run "<prompt>"',
    docsPath: 'docs/Adapter CLIs/OpenCode_CLI.md',
  },
  {
    id: 'ollama-kimi-k2-6-cloud',
    optionValue: 'ollama-kimi-k2-6-cloud',
    optionLabel: 'Ollama CLI + Kimi K2.6 (cloud)',
    provider: 'ollama_cloud',
    /**
     * Cloud variant: `ollama run kimi-k2.6:cloud` → hits ollama.com via local daemon signin.
     * HTTP side hits https://ollama.com/api/chat with OLLAMA_API_KEY.
     * See https://ollama.com/library/kimi-k2.6
     */
    model: 'kimi-k2.6:cloud',
    fallbackModels: ['minimax-m2:cloud', 'deepseek-v3.1:671b-cloud', 'qwen3-coder:480b-cloud'],
    status: 'planned',
    useCases: ['long-horizon-coding', 'agentic', 'multimodal'],
    cliCommandTemplate: 'ollama run kimi-k2.6:cloud',
    docsPath: 'docs/Adapter CLIs/Ollama_CLI.md',
  },
  {
    id: 'ollama-gemma4-local',
    optionValue: 'ollama-gemma4-local',
    optionLabel: 'Ollama CLI + Gemma 4 (local)',
    provider: 'ollama_local',
    /**
     * Local variant: `ollama run gemma4:latest` → runs fully on-prem via the local daemon.
     * HTTP side hits http://localhost:11434/api/chat (no auth required for default setup).
     */
    model: 'gemma4:latest',
    fallbackModels: ['minicpm-v:latest'],
    status: 'planned',
    useCases: ['on-prem-privacy', 'offline-inference'],
    cliCommandTemplate: 'ollama run gemma4:latest',
    docsPath: 'docs/Adapter CLIs/Ollama_CLI.md',
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
