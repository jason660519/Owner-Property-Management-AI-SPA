import type { AIProvider } from '@/lib/ai-providers';

// Global provider fallback order requested by operations.
export const PREFERRED_PROVIDER_ORDER: readonly AIProvider[] = [
  'openai',
  'gemini',
  'anthropic',
  'grok',
  'deepseek',
  'openrouter',
  'together',
  'kimi',
  'perplexity',
  'qwen',
  'zhipu',
] as const;

const ORDER_RANK = new Map<string, number>(
  PREFERRED_PROVIDER_ORDER.map((provider, index) => [provider, index]),
);

export function sortByProviderPriority<T extends { provider: string }>(items: readonly T[]): T[] {
  return items
    .map((item, index) => ({
      item,
      index,
      rank: ORDER_RANK.get(item.provider) ?? Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ item }) => item);
}
