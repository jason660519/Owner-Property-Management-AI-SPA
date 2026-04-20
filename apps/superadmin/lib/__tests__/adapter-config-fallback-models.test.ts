/**
 * Offline drift check for adapter-config fallbackModels.
 *
 * Each adapter row declares a fallback chain used by both CLI and HTTP modes on the
 * Api Key & Model Setting page. Every primary and fallback slug must appear in the
 * provider's validated model list (`ai_key_validation_cache.available_models`).
 *
 * CACHE_SNAPSHOT below is a hand-maintained copy of the latest validation output,
 * trimmed to the slugs that adapter-config actually references. Refresh it whenever
 * fallback chains change or keys are re-validated with new model catalogs.
 *
 * Snapshot captured: 2026-04-21 (validated_at 2026-04-20T08:02:xx)
 */

import {
  ADAPTER_CONFIG_ITEMS,
  type AdapterConfigItem,
  type AdapterProvider,
} from '@/lib/adapter-config';
import { openCodeZenChatModelId } from '@/lib/ai-key-validation/kilo-opencode-zen';

type CacheProvider = 'anthropic' | 'gemini' | 'openai' | 'kilo' | 'opencode';

const CACHE_SNAPSHOT: Record<CacheProvider, readonly string[]> = {
  anthropic: [
    'claude-opus-4-7',
    'claude-sonnet-4-6',
    'claude-opus-4-6',
    'claude-opus-4-5-20251101',
    'claude-haiku-4-5-20251001',
    'claude-sonnet-4-5-20250929',
    'claude-opus-4-1-20250805',
    'claude-opus-4-20250514',
    'claude-sonnet-4-20250514',
    'claude-3-haiku-20240307',
  ],
  gemini: [
    'gemini-3.1-pro-preview',
    'gemini-3-pro-preview',
    'gemini-3-flash-preview',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
  ],
  openai: [
    'gpt-5.4-pro-2026-03-05',
    'gpt-5.4',
    'gpt-5.4-mini',
    'gpt-5.3-codex',
    'gpt-5.2-codex',
    'gpt-5.1-codex',
    'gpt-5-codex',
    'gpt-4o-mini',
  ],
  kilo: [
    'minimax/minimax-m2.5',
    'minimax/minimax-m2.1',
    'minimax/minimax-m2',
    'minimax/minimax-m1',
    'qwen/qwen3.6-plus',
    'qwen/qwen3.5-plus-02-15',
    'qwen/qwen3-max',
    'qwen/qwen-plus',
  ],
  opencode: [
    'glm-5.1',
    'glm-5',
    'glm-4.7',
    'glm-4.6',
    'minimax-m2.5',
    'minimax-m2.1',
    'kimi-k2.5',
    'kimi-k2-thinking',
    'kimi-k2',
    'qwen3.6-plus',
    'qwen3.5-plus',
  ],
};

/**
 * Mirror the runtime translation that adapter-runs/route.ts applies before hitting the
 * provider's API: strip `openrouter/` for kilo, use openCodeZenChatModelId for opencode.
 * Anthropic/gemini/openai pass through untouched.
 */
function translateForCache(
  provider: AdapterProvider,
  model: string,
): { cacheProvider: CacheProvider; cacheId: string } {
  switch (provider) {
    case 'claude':
      return { cacheProvider: 'anthropic', cacheId: model };
    case 'gemini':
      return { cacheProvider: 'gemini', cacheId: model };
    case 'codex':
      return { cacheProvider: 'openai', cacheId: model };
    case 'kilo': {
      const stripped = model.startsWith('openrouter/')
        ? model.slice('openrouter/'.length)
        : model;
      return { cacheProvider: 'kilo', cacheId: stripped };
    }
    case 'opencode':
      return { cacheProvider: 'opencode', cacheId: openCodeZenChatModelId(model) };
  }
}

describe('adapter-config fallbackModels (offline drift check)', () => {
  it('defines fallbackModels on every adapter row', () => {
    for (const item of ADAPTER_CONFIG_ITEMS) {
      expect(Array.isArray(item.fallbackModels)).toBe(true);
    }
  });

  it('never lists a primary model as its own fallback', () => {
    for (const item of ADAPTER_CONFIG_ITEMS) {
      expect(item.fallbackModels).not.toContain(item.model);
    }
  });

  it('keeps fallback chains free of duplicates', () => {
    for (const item of ADAPTER_CONFIG_ITEMS) {
      const set = new Set(item.fallbackModels);
      expect(set.size).toBe(item.fallbackModels.length);
    }
  });

  describe.each(ADAPTER_CONFIG_ITEMS)(
    '$id ($provider)',
    (item: AdapterConfigItem) => {
      it('primary model appears in cache snapshot', () => {
        const { cacheProvider, cacheId } = translateForCache(item.provider, item.model);
        expect(CACHE_SNAPSHOT[cacheProvider]).toContain(cacheId);
      });

      it.each(item.fallbackModels)(
        'fallback %s appears in cache snapshot',
        (fallback: string) => {
          const { cacheProvider, cacheId } = translateForCache(item.provider, fallback);
          expect(CACHE_SNAPSHOT[cacheProvider]).toContain(cacheId);
        },
      );
    },
  );
});
