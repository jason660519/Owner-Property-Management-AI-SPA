// filepath: apps/superadmin/lib/ai-providers.ts
// AI Provider definitions, model lists, and configuration data

import { TRANSCRIPT_PARSE_PROMPT, TRANSCRIPT_JUDGE_PROMPT } from '@/lib/transcript-prompts';

export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'grok' | 'together' | 'kimi' | 'openrouter' | 'zhipu' | 'perplexity';

export interface AIProviderInfo {
  id: AIProvider;
  name: string;
  envKey: string;
  sdkPackage: string;
  docsUrl: string;
  /**
   * Direct link to the provider's API key/dashboard page
   * so users can quickly create/manage keys.
   */
  apiKeyUrl: string;
  /** SDK / quickstart documentation URL; when set, shown in card header and "SDK: ..." row is hidden. */
  sdkDocsUrl?: string;
  /** Console or API dashboard URL; when set, shown in card header. */
  dashboardUrl?: string;
  /** Link text for SDK doc (e.g. "OpenAI Agent SDK Doc"). Default: "{name} SDK Doc". */
  sdkDocsLabel?: string;
  /** Link text for dashboard (e.g. "OpenAI API Dashboard"). Default: "{name} Dashboard". */
  dashboardLabel?: string;
  baseUrl: string;
  keyPrefix: string;
  models: AIModelInfo[];
}

export interface AIModelInfo {
  id: string;
  name: string;
  contextWindow: number;
  maxOutput: number;
  inputPrice: number;   // USD per 1M tokens
  outputPrice: number;  // USD per 1M tokens
  capabilities: string[];
  recommended?: boolean;
}

export interface FeatureModule {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: 'ocr' | 'assistant' | 'generator';
  requiredCapabilities: string[];
  defaultPrompt: string;
}

// ============================================================================
// Provider Definitions
// ============================================================================

export const AI_PROVIDERS: AIProviderInfo[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    envKey: 'OPENAI_API_KEY',
    sdkPackage: 'openai',
    docsUrl: 'https://platform.openai.com/docs/api-reference',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    sdkDocsUrl: 'https://openai.github.io/openai-agents-python/quickstart/',
    dashboardUrl: 'https://platform.openai.com/chat',
    sdkDocsLabel: 'OpenAI Agent SDK Doc',
    dashboardLabel: 'OpenAI API Dashboard',
    baseUrl: 'https://api.openai.com/v1',
    keyPrefix: 'sk-',
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        contextWindow: 128000,
        maxOutput: 16384,
        inputPrice: 2.50,
        outputPrice: 10.00,
        capabilities: ['text', 'vision', 'function_calling', 'json_mode'],
        recommended: true,
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        contextWindow: 128000,
        maxOutput: 16384,
        inputPrice: 0.15,
        outputPrice: 0.60,
        capabilities: ['text', 'vision', 'function_calling', 'json_mode'],
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        contextWindow: 128000,
        maxOutput: 4096,
        inputPrice: 10.00,
        outputPrice: 30.00,
        capabilities: ['text', 'vision', 'function_calling', 'json_mode'],
      },
      {
        id: 'o1',
        name: 'o1 (Reasoning)',
        contextWindow: 200000,
        maxOutput: 100000,
        inputPrice: 15.00,
        outputPrice: 60.00,
        capabilities: ['text', 'reasoning', 'function_calling'],
      },
      {
        id: 'o1-mini',
        name: 'o1-mini',
        contextWindow: 128000,
        maxOutput: 65536,
        inputPrice: 3.00,
        outputPrice: 12.00,
        capabilities: ['text', 'reasoning'],
      },
      {
        id: 'o3-mini',
        name: 'o3-mini',
        contextWindow: 200000,
        maxOutput: 100000,
        inputPrice: 1.10,
        outputPrice: 4.40,
        capabilities: ['text', 'reasoning', 'function_calling'],
      },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    sdkPackage: 'anthropic',
    docsUrl: 'https://docs.anthropic.com/claude/docs',
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    sdkDocsUrl: 'https://docs.anthropic.com/en/docs/get-started',
    dashboardUrl: 'https://console.anthropic.com/dashboard',
    sdkDocsLabel: 'Claude SDK Doc',
    dashboardLabel: 'Anthropic Console',
    baseUrl: 'https://api.anthropic.com/v1',
    keyPrefix: 'sk-ant-',
    models: [
      {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        contextWindow: 200000,
        maxOutput: 16384,
        inputPrice: 3.00,
        outputPrice: 15.00,
        capabilities: ['text', 'vision', 'function_calling', 'extended_thinking'],
        recommended: true,
      },
      {
        id: 'claude-opus-4-20250514',
        name: 'Claude Opus 4',
        contextWindow: 200000,
        maxOutput: 32768,
        inputPrice: 15.00,
        outputPrice: 75.00,
        capabilities: ['text', 'vision', 'function_calling', 'extended_thinking', 'tool_use'],
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        contextWindow: 200000,
        maxOutput: 8192,
        inputPrice: 0.80,
        outputPrice: 4.00,
        capabilities: ['text', 'vision', 'function_calling'],
      },
    ],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    envKey: 'GEMINI_API_KEY',
    sdkPackage: 'google-generativeai',
    docsUrl: 'https://ai.google.dev/docs',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    sdkDocsUrl: 'https://ai.google.dev/gemini-api/docs/quickstart',
    dashboardUrl: 'https://aistudio.google.com/',
    sdkDocsLabel: 'Gemini SDK Doc',
    dashboardLabel: 'Google AI Studio',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    keyPrefix: 'AIza',
    models: [
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        contextWindow: 1048576,
        maxOutput: 8192,
        inputPrice: 0.10,
        outputPrice: 0.40,
        capabilities: ['text', 'vision', 'function_calling', 'grounding'],
        recommended: true,
      },
      {
        id: 'gemini-2.0-flash-lite',
        name: 'Gemini 2.0 Flash Lite',
        contextWindow: 1048576,
        maxOutput: 8192,
        inputPrice: 0.075,
        outputPrice: 0.30,
        capabilities: ['text', 'vision'],
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        contextWindow: 2097152,
        maxOutput: 8192,
        inputPrice: 1.25,
        outputPrice: 5.00,
        capabilities: ['text', 'vision', 'function_calling', 'grounding'],
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        contextWindow: 1048576,
        maxOutput: 8192,
        inputPrice: 0.075,
        outputPrice: 0.30,
        capabilities: ['text', 'vision', 'function_calling'],
      },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    envKey: 'DEEPSEEK_API_KEY',
    sdkPackage: 'openai (compatible)',
    docsUrl: 'https://platform.deepseek.com/api-docs',
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    sdkDocsUrl: 'https://api-docs.deepseek.com/',
    dashboardUrl: 'https://platform.deepseek.com/',
    sdkDocsLabel: 'DeepSeek API Doc',
    dashboardLabel: 'DeepSeek Platform',
    baseUrl: 'https://api.deepseek.com/v1',
    keyPrefix: 'sk-',
    models: [
      {
        id: 'deepseek-chat',
        name: 'DeepSeek-V3',
        contextWindow: 64000,
        maxOutput: 8192,
        inputPrice: 0.27,
        outputPrice: 1.10,
        capabilities: ['text', 'function_calling', 'json_mode'],
        recommended: true,
      },
      {
        id: 'deepseek-reasoner',
        name: 'DeepSeek-R1 (Reasoning)',
        contextWindow: 64000,
        maxOutput: 8192,
        inputPrice: 0.55,
        outputPrice: 2.19,
        capabilities: ['text', 'reasoning'],
      },
    ],
  },
  {
    id: 'together',
    name: 'Together AI',
    envKey: 'TOGETHER_AI_API_KEY',
    sdkPackage: 'openai (compatible)',
    docsUrl: 'https://docs.together.ai/',
    apiKeyUrl: 'https://api.together.ai/settings/api-keys',
    sdkDocsUrl: 'https://docs.together.ai/docs/quickstart',
    dashboardUrl: 'https://api.together.ai/',
    sdkDocsLabel: 'Together AI API Doc',
    dashboardLabel: 'Together AI Dashboard',
    baseUrl: 'https://api.together.xyz/v1',
    keyPrefix: '',
    models: [
      // ── Llama 4 ──
      {
        id: 'meta-llama/Llama-4-Scout-17B-16E-Instruct',
        name: 'Llama 4 Scout 17B',
        contextWindow: 524288,
        maxOutput: 16384,
        inputPrice: 0.18,
        outputPrice: 0.18,
        capabilities: ['text', 'vision', 'function_calling'],
        recommended: true,
      },
      {
        id: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8',
        name: 'Llama 4 Maverick 17B',
        contextWindow: 524288,
        maxOutput: 16384,
        inputPrice: 0.27,
        outputPrice: 0.27,
        capabilities: ['text', 'vision', 'function_calling'],
      },
      // ── Llama 3.3 ──
      {
        id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        name: 'Llama 3.3 70B Turbo',
        contextWindow: 131072,
        maxOutput: 8192,
        inputPrice: 0.88,
        outputPrice: 0.88,
        capabilities: ['text', 'function_calling'],
        recommended: true,
      },
      // ── Llama 3.2 Vision ──
      {
        id: 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo',
        name: 'Llama 3.2 11B Vision Turbo',
        contextWindow: 131072,
        maxOutput: 8192,
        inputPrice: 0.18,
        outputPrice: 0.18,
        capabilities: ['text', 'vision'],
      },
      {
        id: 'meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo',
        name: 'Llama 3.2 90B Vision Turbo',
        contextWindow: 131072,
        maxOutput: 8192,
        inputPrice: 0.88,
        outputPrice: 0.88,
        capabilities: ['text', 'vision'],
      },
      // ── Llama 3.1 ──
      {
        id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
        name: 'Llama 3.1 8B Turbo',
        contextWindow: 131072,
        maxOutput: 8192,
        inputPrice: 0.18,
        outputPrice: 0.18,
        capabilities: ['text'],
      },
      {
        id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
        name: 'Llama 3.1 70B Turbo',
        contextWindow: 131072,
        maxOutput: 8192,
        inputPrice: 0.88,
        outputPrice: 0.88,
        capabilities: ['text', 'function_calling'],
      },
      {
        id: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
        name: 'Llama 3.1 405B Turbo',
        contextWindow: 131072,
        maxOutput: 8192,
        inputPrice: 5.00,
        outputPrice: 15.00,
        capabilities: ['text', 'function_calling'],
      },
      // ── Qwen ──
      {
        id: 'Qwen/Qwen2.5-72B-Instruct-Turbo',
        name: 'Qwen 2.5 72B Turbo',
        contextWindow: 32768,
        maxOutput: 8192,
        inputPrice: 1.20,
        outputPrice: 1.20,
        capabilities: ['text', 'function_calling'],
      },
      {
        id: 'Qwen/Qwen2.5-7B-Instruct-Turbo',
        name: 'Qwen 2.5 7B Turbo',
        contextWindow: 32768,
        maxOutput: 8192,
        inputPrice: 0.30,
        outputPrice: 0.30,
        capabilities: ['text'],
      },
      {
        id: 'Qwen/QwQ-32B',
        name: 'QwQ 32B (Reasoning)',
        contextWindow: 131072,
        maxOutput: 16384,
        inputPrice: 1.20,
        outputPrice: 1.20,
        capabilities: ['text', 'reasoning'],
      },
      {
        id: 'Qwen/Qwen2-VL-72B-Instruct',
        name: 'Qwen2 VL 72B',
        contextWindow: 32768,
        maxOutput: 8192,
        inputPrice: 1.20,
        outputPrice: 1.20,
        capabilities: ['text', 'vision'],
      },
      // ── DeepSeek ──
      {
        id: 'deepseek-ai/DeepSeek-R1',
        name: 'DeepSeek R1 (Reasoning)',
        contextWindow: 65536,
        maxOutput: 16384,
        inputPrice: 3.00,
        outputPrice: 7.00,
        capabilities: ['text', 'reasoning'],
      },
      {
        id: 'deepseek-ai/DeepSeek-V3',
        name: 'DeepSeek V3',
        contextWindow: 65536,
        maxOutput: 8192,
        inputPrice: 0.90,
        outputPrice: 0.90,
        capabilities: ['text', 'function_calling'],
      },
      // ── Google Gemma ──
      {
        id: 'google/gemma-2-27b-it',
        name: 'Gemma 2 27B',
        contextWindow: 8192,
        maxOutput: 4096,
        inputPrice: 0.80,
        outputPrice: 0.80,
        capabilities: ['text'],
      },
      {
        id: 'google/gemma-2-9b-it',
        name: 'Gemma 2 9B',
        contextWindow: 8192,
        maxOutput: 4096,
        inputPrice: 0.30,
        outputPrice: 0.30,
        capabilities: ['text'],
      },
      // ── Mistral ──
      {
        id: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        name: 'Mixtral 8x7B',
        contextWindow: 32768,
        maxOutput: 8192,
        inputPrice: 0.60,
        outputPrice: 0.60,
        capabilities: ['text', 'function_calling'],
      },
      {
        id: 'mistralai/Mistral-Small-24B-Instruct-2501',
        name: 'Mistral Small 24B',
        contextWindow: 32768,
        maxOutput: 8192,
        inputPrice: 0.80,
        outputPrice: 0.80,
        capabilities: ['text', 'function_calling'],
      },
      // ── Llama Vision Free (免費方案) ──
      {
        id: 'meta-llama/Llama-Vision-Free',
        name: 'Llama Vision Free',
        contextWindow: 131072,
        maxOutput: 8192,
        inputPrice: 0,
        outputPrice: 0,
        capabilities: ['text', 'vision'],
      },
    ],
  },
  {
    id: 'grok',
    name: 'xAI Grok',
    envKey: 'GROK_API_KEY',
    sdkPackage: 'openai (compatible)',
    docsUrl: 'https://docs.x.ai/',
    apiKeyUrl: 'https://accounts.x.ai/sign-up?redirect=cloud-console',
    sdkDocsUrl: 'https://docs.x.ai/',
    dashboardUrl: 'https://console.x.ai',
    sdkDocsLabel: 'Grok API Doc',
    dashboardLabel: 'xAI Console',
    baseUrl: 'https://api.x.ai/v1',
    keyPrefix: 'xai-',
    models: [
      {
        id: 'grok-3',
        name: 'Grok 3',
        contextWindow: 131072,
        maxOutput: 16384,
        inputPrice: 3.00,
        outputPrice: 15.00,
        capabilities: ['text', 'function_calling', 'reasoning'],
        recommended: true,
      },
      {
        id: 'grok-3-mini',
        name: 'Grok 3 Mini',
        contextWindow: 131072,
        maxOutput: 16384,
        inputPrice: 0.30,
        outputPrice: 0.50,
        capabilities: ['text', 'function_calling', 'reasoning'],
      },
      {
        id: 'grok-2-vision',
        name: 'Grok 2 Vision',
        contextWindow: 32768,
        maxOutput: 16384,
        inputPrice: 2.00,
        outputPrice: 10.00,
        capabilities: ['text', 'vision'],
      },
    ],
  },
  {
    id: 'kimi',
    name: 'Kimi (Moonshot)',
    envKey: 'KIMI_API_KEY',
    sdkPackage: 'openai (compatible)',
    docsUrl: 'https://platform.moonshot.cn/docs',
    apiKeyUrl: 'https://platform.moonshot.cn/console/api-keys',
    sdkDocsUrl: 'https://platform.moonshot.cn/docs',
    dashboardUrl: 'https://platform.moonshot.cn/',
    sdkDocsLabel: 'Kimi API Doc',
    dashboardLabel: 'Moonshot 控制台',
    baseUrl: 'https://api.moonshot.cn/v1',
    keyPrefix: 'sk-',
    models: [
      {
        id: 'moonshot-v1-128k',
        name: 'Moonshot v1 128K',
        contextWindow: 128000,
        maxOutput: 8192,
        inputPrice: 0.12,
        outputPrice: 0.12,
        capabilities: ['text', 'vision', 'function_calling'],
        recommended: true,
      },
      {
        id: 'moonshot-v1-32k',
        name: 'Moonshot v1 32K',
        contextWindow: 32000,
        maxOutput: 8192,
        inputPrice: 0.06,
        outputPrice: 0.06,
        capabilities: ['text', 'vision'],
      },
      {
        id: 'moonshot-v1-8k',
        name: 'Moonshot v1 8K',
        contextWindow: 8192,
        maxOutput: 8192,
        inputPrice: 0.03,
        outputPrice: 0.03,
        capabilities: ['text'],
      },
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    envKey: 'OPENROUTER_API_KEY',
    sdkPackage: 'openai (compatible)',
    docsUrl: 'https://openrouter.ai/docs',
    apiKeyUrl: 'https://openrouter.ai/keys',
    sdkDocsUrl: 'https://openrouter.ai/docs',
    dashboardUrl: 'https://openrouter.ai/',
    sdkDocsLabel: 'OpenRouter API Doc',
    dashboardLabel: 'OpenRouter Dashboard',
    baseUrl: 'https://openrouter.ai/api/v1',
    keyPrefix: 'sk-or-',
    models: [
      {
        id: 'openai/gpt-4o',
        name: 'OpenAI GPT-4o (via OpenRouter)',
        contextWindow: 128000,
        maxOutput: 16384,
        inputPrice: 2.50,
        outputPrice: 10.00,
        capabilities: ['text', 'vision', 'function_calling'],
        recommended: true,
      },
      {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet (via OpenRouter)',
        contextWindow: 200000,
        maxOutput: 8192,
        inputPrice: 3.00,
        outputPrice: 15.00,
        capabilities: ['text', 'vision', 'function_calling'],
      },
      {
        id: 'google/gemini-2.0-flash-exp:free',
        name: 'Gemini 2.0 Flash (via OpenRouter, free)',
        contextWindow: 1048576,
        maxOutput: 8192,
        inputPrice: 0,
        outputPrice: 0,
        capabilities: ['text', 'vision'],
      },
    ],
  },
  {
    id: 'zhipu',
    name: '智谱 Zhipu (GLM)',
    envKey: 'ZHIPU_API_KEY',
    sdkPackage: 'openai (compatible)',
    docsUrl: 'https://open.bigmodel.cn/dev/api',
    apiKeyUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    sdkDocsUrl: 'https://open.bigmodel.cn/dev/api',
    dashboardUrl: 'https://open.bigmodel.cn/',
    sdkDocsLabel: '智谱 API Doc',
    dashboardLabel: '智谱开放平台',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    keyPrefix: '',
    models: [
      {
        id: 'glm-4-plus',
        name: 'GLM-4 Plus',
        contextWindow: 128000,
        maxOutput: 8192,
        inputPrice: 0.10,
        outputPrice: 0.10,
        capabilities: ['text', 'vision', 'function_calling'],
        recommended: true,
      },
      {
        id: 'glm-4-flash',
        name: 'GLM-4 Flash',
        contextWindow: 128000,
        maxOutput: 8192,
        inputPrice: 0.001,
        outputPrice: 0.001,
        capabilities: ['text', 'vision'],
      },
      {
        id: 'glm-4v-plus',
        name: 'GLM-4V Plus',
        contextWindow: 128000,
        maxOutput: 8192,
        inputPrice: 0.10,
        outputPrice: 0.10,
        capabilities: ['text', 'vision'],
      },
    ],
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    envKey: 'PERPLEXITY_API_KEY',
    sdkPackage: 'openai (compatible)',
    docsUrl: 'https://docs.perplexity.ai/',
    apiKeyUrl: 'https://www.perplexity.ai/settings/api',
    sdkDocsUrl: 'https://docs.perplexity.ai/api-reference/chat-completions',
    dashboardUrl: 'https://www.perplexity.ai/settings/api',
    sdkDocsLabel: 'Perplexity API Doc',
    dashboardLabel: 'Perplexity API Dashboard',
    baseUrl: 'https://api.perplexity.ai',
    keyPrefix: 'pplx-',
    models: [
      {
        id: 'sonar-pro',
        name: 'Sonar Pro',
        contextWindow: 200000,
        maxOutput: 8192,
        inputPrice: 3.00,
        outputPrice: 15.00,
        // Built-in web search; every response includes citations
        capabilities: ['text', 'web_search'],
        recommended: true,
      },
      {
        id: 'sonar',
        name: 'Sonar',
        contextWindow: 127000,
        maxOutput: 8192,
        inputPrice: 1.00,
        outputPrice: 1.00,
        capabilities: ['text', 'web_search'],
      },
      {
        id: 'sonar-reasoning-pro',
        name: 'Sonar Reasoning Pro',
        contextWindow: 127000,
        maxOutput: 8192,
        inputPrice: 2.00,
        outputPrice: 8.00,
        capabilities: ['text', 'web_search', 'reasoning'],
      },
      {
        id: 'sonar-deep-research',
        name: 'Sonar Deep Research',
        contextWindow: 127000,
        maxOutput: 8192,
        inputPrice: 2.00,
        outputPrice: 8.00,
        capabilities: ['text', 'web_search', 'reasoning'],
      },
    ],
  },
];

// ============================================================================
// Feature Modules
// ============================================================================

export const FEATURE_MODULES: FeatureModule[] = [
  {
    key: 'online_ocr_parse',
    name: '雲端OCR謄本解析（解析組）',
    description: '透過雲端 AI API 進行謄本文件的光學字元辨識與結構化解析。建議配置 2~3 個 vision 模型以啟用多模型共識模式。',
    icon: 'cloud',
    category: 'ocr',
    requiredCapabilities: ['vision'],
    defaultPrompt: TRANSCRIPT_PARSE_PROMPT,
  },
  {
    key: 'online_ocr_judge',
    name: '雲端OCR謄本裁判（審核組）',
    description: '當多模型解析結果有衝突時，由裁判模型對照原始文件判定正確值。可選配置，僅在解析結果有衝突時才會呼叫。',
    icon: 'scale',
    category: 'ocr',
    requiredCapabilities: ['vision'],
    defaultPrompt: TRANSCRIPT_JUDGE_PROMPT,
  },
  {
    key: 'web_assistant',
    name: '網頁功能解說 AI 助理',
    description: '為系統使用者提供即時的功能操作指引與解說',
    icon: 'message-circle',
    category: 'assistant',
    requiredCapabilities: ['text'],
    defaultPrompt: `你是本房產管理系統的智慧助理。你的職責是：
1. 引導使用者操作系統各項功能
2. 解答系統使用上的疑問
3. 提供操作步驟的詳細說明
請使用繁體中文回答，語氣親切專業。`,
  },
  {
    key: 'contract_assistant',
    name: '合約生成AI助理',
    description: '分析與解讀不動產相關合約條款，提供專業見解',
    icon: 'file-text',
    category: 'assistant',
    requiredCapabilities: ['text'],
    defaultPrompt: `你是台灣不動產合約法律顧問AI助理。你的專長包含：
1. 分析租賃合約、買賣合約的關鍵條款
2. 指出潛在風險與注意事項
3. 提供合約修改建議
請以繁體中文回答，引用相關法規條文時請標注出處。
注意：你的回覆僅供參考，不構成法律意見。`,
  },
  {
    key: 'blog_generator',
    name: '部落格生成器 AI 助理',
    description: '自動生成不動產相關的部落格文章與行銷內容',
    icon: 'pen-tool',
    category: 'generator',
    requiredCapabilities: ['text'],
    defaultPrompt: `你是一位專業的不動產部落格寫手。請根據提供的主題，創作：
1. 吸引人的標題（含 SEO 關鍵字）
2. 文章大綱與結構
3. 完整的繁體中文文章內容
4. 適當的 hashtag 與分享摘要
風格要求：專業但易讀，適合一般民眾理解。`,
  },
  {
    key: 'property_description',
    name: '物件介紹文案 AI 助理',
    description: '根據物件資訊生成銷售或出租用的介紹文案草稿',
    icon: 'home',
    category: 'generator',
    requiredCapabilities: ['text'],
    defaultPrompt: `你是一位台灣不動產文案企劃。請根據提供的物件事實資料，生成可直接給屋主或管理者審稿的繁體中文物件介紹文案。
要求如下：
1. 僅能使用輸入中可驗證的事實，不得自行虛構生活圈、學區、交通、景觀、投報率或裝潢細節
2. 先整理物件亮點，再寫出自然流暢且可讀性高的介紹段落
3. 語氣需專業、可信、具銷售力，但避免誇大與空泛形容詞堆砌
4. 若關鍵資訊缺漏，應改用保守表述，不要補完未知內容
5. 輸出需可直接作為物件頁描述草稿，避免多餘前言、標籤或清單符號污染正文`,
  },
  {
    key: 'ad_generator',
    name: '靜態網頁廣告生成器 AI 助理',
    description: '自動生成物件廣告頁面的 HTML/CSS 內容',
    icon: 'layout',
    category: 'generator',
    requiredCapabilities: ['text'],
    defaultPrompt: `你是一位網頁廣告設計專家。請根據提供的物件資訊，生成：
1. 響應式 HTML + CSS 廣告頁面
2. 吸引人的廣告文案
3. 物件重點特色展示
4. 聯絡資訊與行動呼籲按鈕
設計風格：現代簡潔、專業質感，符合台灣不動產市場風格。`,
  },
  {
    key: 'software_dev_engineer',
    name: 'Software Dev Engineer',
    description: '軟體開發工程師：協助撰寫與重構程式碼、架構設計與技術決策',
    icon: 'file-text',
    category: 'assistant',
    requiredCapabilities: ['text'],
    defaultPrompt: `你是軟體開發工程師 AI 助理。協助：
1. 撰寫與重構程式碼（TypeScript/React/Next.js 等）
2. 架構設計與技術決策建議
3. Code review 與最佳實踐
請以繁體中文或英文依情境回應，保持專業精準。`,
  },
  {
    key: 'ttd_engineer',
    name: 'TTD Engineer',
    description: 'TTD 測試驅動開發工程師：撰寫測試規格、測試案例與測試腳本',
    icon: 'pen-tool',
    category: 'assistant',
    requiredCapabilities: ['text'],
    defaultPrompt: `你是 TTD（測試驅動開發）工程師 AI 助理。協助：
1. 撰寫測試規格與驗收標準
2. 單元測試、整合測試與 E2E 測試案例
3. 測試腳本與自動化流程建議
請以繁體中文或英文依情境回應，保持專業精準。`,
  },
];

// ============================================================================
// Utility Functions
// ============================================================================

export function getProviderById(id: AIProvider): AIProviderInfo | undefined {
  return AI_PROVIDERS.find(p => p.id === id);
}

export function getModelsByProvider(providerId: AIProvider): AIModelInfo[] {
  return getProviderById(providerId)?.models || [];
}

export function formatContextWindow(tokens: number): string {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  return `${(tokens / 1000).toFixed(0)}K`;
}

export function formatPrice(price: number): string {
  if (price < 0.01) return `$${price.toFixed(4)}`;
  if (price < 1) return `$${price.toFixed(3)}`;
  return `$${price.toFixed(2)}`;
}
