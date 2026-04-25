export interface ModelPricing {
  inputCostPerToken: number;
  outputCostPerToken: number;
  maxTokens?: number;
  provider?: string;
}

const BUNDLED_PRICE_MAP: Record<string, ModelPricing> = {
  'claude-opus-4-7': { inputCostPerToken: 15e-6, outputCostPerToken: 75e-6, maxTokens: 200000, provider: 'anthropic' },
  'claude-sonnet-4-6': { inputCostPerToken: 3e-6, outputCostPerToken: 15e-6, maxTokens: 200000, provider: 'anthropic' },
  'claude-haiku-4-5': { inputCostPerToken: 0.8e-6, outputCostPerToken: 4e-6, maxTokens: 200000, provider: 'anthropic' },
  'claude-opus-4-5': { inputCostPerToken: 15e-6, outputCostPerToken: 75e-6, maxTokens: 200000, provider: 'anthropic' },
  'claude-sonnet-4-5': { inputCostPerToken: 3e-6, outputCostPerToken: 15e-6, maxTokens: 200000, provider: 'anthropic' },
  'claude-3-5-sonnet-20241022': { inputCostPerToken: 3e-6, outputCostPerToken: 15e-6, maxTokens: 200000, provider: 'anthropic' },
  'claude-3-5-haiku-20241022': { inputCostPerToken: 0.8e-6, outputCostPerToken: 4e-6, maxTokens: 200000, provider: 'anthropic' },
  'claude-3-opus-20240229': { inputCostPerToken: 15e-6, outputCostPerToken: 75e-6, maxTokens: 200000, provider: 'anthropic' },

  'gpt-4o': { inputCostPerToken: 2.5e-6, outputCostPerToken: 10e-6, maxTokens: 128000, provider: 'openai' },
  'gpt-4o-mini': { inputCostPerToken: 0.15e-6, outputCostPerToken: 0.6e-6, maxTokens: 128000, provider: 'openai' },
  'gpt-4o-2024-11-20': { inputCostPerToken: 2.5e-6, outputCostPerToken: 10e-6, maxTokens: 128000, provider: 'openai' },
  'gpt-4.1': { inputCostPerToken: 2e-6, outputCostPerToken: 8e-6, maxTokens: 1047576, provider: 'openai' },
  'gpt-4.1-mini': { inputCostPerToken: 0.4e-6, outputCostPerToken: 1.6e-6, maxTokens: 1047576, provider: 'openai' },
  'o1': { inputCostPerToken: 15e-6, outputCostPerToken: 60e-6, maxTokens: 200000, provider: 'openai' },
  'o1-mini': { inputCostPerToken: 3e-6, outputCostPerToken: 12e-6, maxTokens: 128000, provider: 'openai' },
  'o3': { inputCostPerToken: 10e-6, outputCostPerToken: 40e-6, maxTokens: 200000, provider: 'openai' },
  'o3-mini': { inputCostPerToken: 1.1e-6, outputCostPerToken: 4.4e-6, maxTokens: 200000, provider: 'openai' },
  'gpt-5.3-codex': { inputCostPerToken: 3e-6, outputCostPerToken: 12e-6, maxTokens: 200000, provider: 'openai' },

  'gemini-2.5-flash': { inputCostPerToken: 0.15e-6, outputCostPerToken: 0.6e-6, maxTokens: 1048576, provider: 'google' },
  'gemini-2.5-pro': { inputCostPerToken: 1.25e-6, outputCostPerToken: 5e-6, maxTokens: 2097152, provider: 'google' },
  'gemini-2.0-flash': { inputCostPerToken: 0.1e-6, outputCostPerToken: 0.4e-6, maxTokens: 1048576, provider: 'google' },
  'gemini-1.5-flash': { inputCostPerToken: 0.075e-6, outputCostPerToken: 0.3e-6, maxTokens: 1048576, provider: 'google' },
  'gemini-1.5-pro': { inputCostPerToken: 1.25e-6, outputCostPerToken: 5e-6, maxTokens: 2097152, provider: 'google' },
  'gemini-3.1-pro-preview': { inputCostPerToken: 1.25e-6, outputCostPerToken: 5e-6, maxTokens: 2097152, provider: 'google' },

  'grok-3': { inputCostPerToken: 3e-6, outputCostPerToken: 15e-6, maxTokens: 131072, provider: 'xai' },
  'grok-3-mini': { inputCostPerToken: 0.3e-6, outputCostPerToken: 0.5e-6, maxTokens: 131072, provider: 'xai' },
  'grok-2': { inputCostPerToken: 2e-6, outputCostPerToken: 10e-6, maxTokens: 131072, provider: 'xai' },

  'sonar-pro': { inputCostPerToken: 3e-6, outputCostPerToken: 15e-6, maxTokens: 200000, provider: 'perplexity' },
  'sonar': { inputCostPerToken: 1e-6, outputCostPerToken: 1e-6, maxTokens: 127072, provider: 'perplexity' },

  'deepseek-chat': { inputCostPerToken: 0.27e-6, outputCostPerToken: 1.1e-6, maxTokens: 65536, provider: 'deepseek' },
  'deepseek-reasoner': { inputCostPerToken: 0.55e-6, outputCostPerToken: 2.19e-6, maxTokens: 65536, provider: 'deepseek' },

  'qwen-max': { inputCostPerToken: 0.4e-6, outputCostPerToken: 1.2e-6, maxTokens: 32768, provider: 'qwen' },
  'qwen-plus': { inputCostPerToken: 0.07e-6, outputCostPerToken: 0.21e-6, maxTokens: 131072, provider: 'qwen' },
  'qwen-turbo': { inputCostPerToken: 0.02e-6, outputCostPerToken: 0.06e-6, maxTokens: 131072, provider: 'qwen' },
  'qwq-32b-preview': { inputCostPerToken: 0.07e-6, outputCostPerToken: 0.21e-6, maxTokens: 131072, provider: 'qwen' },

  'minimax/minimax-m2.5': { inputCostPerToken: 0.4e-6, outputCostPerToken: 1.6e-6, maxTokens: 200000, provider: 'openrouter' },
  'minimax/minimax-m2.7': { inputCostPerToken: 0.4e-6, outputCostPerToken: 1.6e-6, maxTokens: 200000, provider: 'openrouter' },
  'grok-code-fast-1': { inputCostPerToken: 0.3e-6, outputCostPerToken: 0.5e-6, maxTokens: 131072, provider: 'openrouter' },
};

const PROVIDER_PREFIXES_TO_STRIP = [
  'anthropic/',
  'openai/',
  'google/',
  'xai/',
  'perplexity/',
  'deepseek/',
  'qwen/',
  'opencode/',
  'openrouter/',
  'kilo/',
];

export function normalizeModelId(rawModelId: string): string {
  let id = rawModelId.trim().toLowerCase();
  for (const prefix of PROVIDER_PREFIXES_TO_STRIP) {
    if (id.startsWith(prefix)) {
      id = id.slice(prefix.length);
      break;
    }
  }
  return id;
}

export function getModelPricing(modelId: string): ModelPricing | null {
  const normalized = normalizeModelId(modelId);
  return BUNDLED_PRICE_MAP[normalized] ?? null;
}

export function calculateCostUsd(
  modelId: string,
  tokensInput: number,
  tokensOutput: number,
): number | null {
  const pricing = getModelPricing(modelId);
  if (!pricing) return null;
  return pricing.inputCostPerToken * tokensInput + pricing.outputCostPerToken * tokensOutput;
}

export function estimateCostUsd(
  modelId: string,
  tokensInput: number,
  tokensOutput: number,
): number | null {
  try {
    return calculateCostUsd(modelId, tokensInput, tokensOutput);
  } catch {
    return null;
  }
}

export function listKnownModelIds(): string[] {
  return Object.keys(BUNDLED_PRICE_MAP);
}

export function inferProvider(modelId: string): string | null {
  const normalized = normalizeModelId(modelId);
  const pricing = BUNDLED_PRICE_MAP[normalized];
  if (pricing?.provider) return pricing.provider;

  if (normalized.startsWith('claude')) return 'anthropic';
  if (normalized.startsWith('gpt-') || normalized.startsWith('o1') || normalized.startsWith('o3')) return 'openai';
  if (normalized.startsWith('gemini')) return 'google';
  if (normalized.startsWith('grok')) return 'xai';
  if (normalized.startsWith('sonar')) return 'perplexity';
  if (normalized.startsWith('deepseek')) return 'deepseek';
  if (normalized.startsWith('qwen') || normalized.startsWith('qwq')) return 'qwen';

  return null;
}
