// filepath: apps/superadmin/lib/ai-providers.ts
// AI Provider definitions, model lists, and configuration data

export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'grok';

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
    defaultPrompt: `你是台灣不動產謄本分析專家。請仔細分析上傳的謄本圖片，提取所有關鍵資訊，包含：
1. 土地/建物標示部：地號、建號、面積、用途
2. 所有權部：所有權人、權利範圍、取得日期
3. 他項權利部：抵押權、地上權等設定
請以結構化 JSON 格式輸出結果。`,
  },
  {
    key: 'online_ocr_judge',
    name: '雲端OCR謄本裁判（審核組）',
    description: '當多模型解析結果有衝突時，由裁判模型對照原始文件判定正確值。可選配置，僅在解析結果有衝突時才會呼叫。',
    icon: 'scale',
    category: 'ocr',
    requiredCapabilities: ['vision'],
    defaultPrompt: `你是台灣不動產謄本解析的品質審核專家。\n你收到一份謄本原始文件，以及多個 AI 模型對同一文件的解析結果。\n\n你的任務是：\n1. 審查每個「有爭議的欄位」\n2. 對照原始文件，判斷哪個模型的解析最正確\n3. 若所有模型都錯，提供你自己的正確解析\n\n回傳格式（僅輸出有爭議的欄位，格式為嚴格 JSON）：\n{\n  "resolutions": [\n    {\n      "field_path": "建物標示部.總面積",\n      "correct_value": "125.67平方公尺",\n      "chosen_from": "model_a",\n      "reason": "模型 A 的面積數值與原始文件第 3 行的記載一致"\n    }\n  ]\n}\n\n注意事項：\n- 面積請保留原始單位（平方公尺），精確到小數點後兩位\n- 日期格式統一為「民國 YYY 年 MM 月 DD 日」\n- 地號/建號格式為「XXXX-XXXX」\n- 若原始文件模糊無法辨識，在 reason 中說明，correct_value 設為 null`,
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
    name: '合約解說 AI 助理',
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
