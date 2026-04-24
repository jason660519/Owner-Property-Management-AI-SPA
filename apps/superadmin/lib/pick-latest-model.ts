// filepath: apps/superadmin/lib/pick-latest-model.ts
// Pick a "recommended" chat/reasoning model from a provider's /v1/models list.
//
// This used to be a hand-coded predicate list that picked whichever id matched
// a regex first. That was always wrong the moment a new model shipped, and
// produced obviously stale picks (e.g. "latest" = gpt-5.4-mini while
// gpt-5.4-pro-2026-03-05 sat in the same list).
//
// The current algorithm:
//   1. Drop clearly non-chat models (embeddings, TTS, image/video gen, audio,
//      moderation, realtime, transcribe, …) via a keyword blocklist.
//   2. For each remaining id, extract:
//      - the latest embedded date (YYYY-MM-DD / YYYYMMDD / MM-YYYY)
//      - a version vector (dotted "3.5" preferred over dash-separated "4-6"
//        preferred over a single leading digit). MMDD month-day codes are
//        treated as date signals, not version numbers, so "kimi-k2-0905"
//        does NOT become v=[2, 905].
//   3. Sort DESC by (version, date, fewer digits, shorter name). The winner
//      is the "cleanest newest" id.
//   4. Apply a provider-specific tiebreaker keyword list when version+date
//      don't differentiate (e.g. deepseek-reasoner > deepseek-chat).
//
// This is still a heuristic — model ID schemes are a mess across providers
// and we don't store provider-side `created` timestamps yet. The UI labels
// the result as "推薦" ("recommended"), not "最新" ("latest"), to avoid
// over-claiming.

import type { AIProvider } from '@/lib/ai-providers';

// ---------------------------------------------------------------------------
// Chat-model filter
// ---------------------------------------------------------------------------

/** Substrings that mark a model as NOT a text/chat/reasoning model. */
const NON_CHAT_KEYWORDS: readonly string[] = [
  // Embeddings & reranking
  'embed', 'rerank',
  // Audio in/out
  'whisper', 'tts', 'transcribe', 'speech', 'audio-preview', 'realtime',
  'omni-plus', 'omni-flash', 'omni-turbo', '-tts-', 'tts-flash', '-asr',
  's2s-', 'livetranslate', 'native-audio', 'gpt-audio', 'gpt-realtime',
  // Image gen / edit
  'dall-e', 'imagen', 'flux', 'seedream', 'seedance', 'stable-diffusion',
  'hidream', 'pixverse', 'nano-banana', 'z-image', 'gpt-image',
  'chatgpt-image', 'qwen-image', 'qwen-vl-ocr', 'wan2', 'image-preview',
  // Video gen
  'veo-', 'sora-', 'kling-', 'vidu-', 'hailuo',
  // Music
  'lyria',
  // Moderation / specialized / legacy
  'moderation', 'robotics', 'computer-use', 'gpt-4o-search', '-search-preview',
  'babbage', 'davinci', 'aqa', 'ccai-', 'tongyi-tingwu', '-diarize',
  'kokoro', 'orpheus', 'parakeet', 'deepgram', 'rime-', 'cwm',
  // Translation-only (generally not conversational)
  '-mt-lite', '-mt-flash', '-mt-turbo', '-mt-plus',
];

function isLikelyChatModel(id: string): boolean {
  const lower = id.toLowerCase();
  for (const kw of NON_CHAT_KEYWORDS) {
    if (lower.includes(kw)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Date extraction
// ---------------------------------------------------------------------------

function tryDate(y: number, mo: number, d: number): number {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return 0;
  return Date.UTC(y, mo - 1, d);
}

/**
 * Extract the newest ISO-ish date from an id and return a version of the id
 * with all recognised date tokens stripped so they don't pollute version
 * parsing downstream.
 */
function extractAndStripDates(id: string): { dateMs: number; stripped: string } {
  let dateMs = 0;
  let stripped = id;

  // YYYY-MM-DD / YYYY_MM_DD
  stripped = stripped.replace(/(20\d{2})[-_](\d{2})[-_](\d{2})/g, (_m, y, mo, d) => {
    const t = tryDate(+y, +mo, +d);
    if (t > dateMs) dateMs = t;
    return t > 0 ? '' : _m;
  });

  // Compact YYYYMMDD (no separators; require non-digit boundary)
  stripped = stripped.replace(/(?<!\d)(20\d{2})(\d{2})(\d{2})(?!\d)/g, (_m, y, mo, d) => {
    const t = tryDate(+y, +mo, +d);
    if (t > dateMs) dateMs = t;
    return t > 0 ? '' : _m;
  });

  // MM-YYYY (e.g. "-12-2025"). Record as the 1st of that month.
  stripped = stripped.replace(/(?<!\d)(0?[1-9]|1[0-2])-(20\d{2})(?!\d)/g, (_m, mo, y) => {
    const t = tryDate(+y, +mo, 1);
    if (t > dateMs) dateMs = t;
    return t > 0 ? '' : _m;
  });

  // Standalone MMDD (no year), as seen in "kimi-k2-0905" or "grok-4-0709".
  // These aren't full dates (no year), so we can't compare them across
  // calendar years, but they are NOT version numbers either — drop them so
  // the version parser doesn't inflate kimi-k2 to v=[2, 905].
  stripped = stripped.replace(
    /(?<!\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?!\d)/g,
    '',
  );

  return { dateMs, stripped };
}

// ---------------------------------------------------------------------------
// Version extraction
// ---------------------------------------------------------------------------

function compareVersionArrays(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const va = a[i] ?? 0;
    const vb = b[i] ?? 0;
    if (va !== vb) return va - vb;
  }
  return 0;
}

/**
 * Parse a version vector from a model id (with dates already stripped).
 * Priority:
 *   1. Dotted "X.Y(.Z)" (e.g. "gpt-5.4", "qwen3.6-plus", "deepseek-v3.2")
 *   2. Dash-separated small-int pair "N-M" where both are < 100
 *      (e.g. "claude-opus-4-6", "claude-sonnet-4-5")
 *   3. A single small leading digit right after a letter (e.g. "qwen3-max",
 *      "grok-4-fast", "gpt-5")
 *
 * **Parameter counts are rejected**: a digit run immediately followed by
 * `b` / `B` / `m` / `M` is a model size (e.g. "32b" = 32 billion params,
 * "120m" = 120 million params) and must never flow into the version vector.
 * Without this guard "qwen3-32b" would parse as v=[3, 32] and dominate
 * "qwen3.6-plus" (v=[3, 6]) which is a later product.
 *
 * Values >= 100 in the dash-pair case are also rejected to avoid treating
 * year fragments like "12-2025" as v=[12, 2025].
 */
function parseVersion(id: string): number[] {
  // Priority 1: highest dotted version. Reject if either segment is an
  // obvious parameter count (trailing 'b'/'B'/'m'/'M').
  const dotted = [
    ...id.matchAll(/(?<![\d.])(\d+)\.(\d+)(?:\.(\d+))?(?![\d])(?![bBmM])/g),
  ];
  if (dotted.length > 0) {
    const versions = dotted.map((m) =>
      m.slice(1).filter((s): s is string => !!s).map(Number),
    );
    versions.sort((a, b) => compareVersionArrays(b, a));
    return versions[0];
  }

  // Priority 2: dash-separated small-int pair. Reject parameter counts and
  // year fragments; require both parts < 100.
  const dashPairs = [...id.matchAll(/(?<!\d)(\d+)-(\d+)(?![\dbBmM])/g)];
  const small = dashPairs
    .filter((m) => +m[1] < 100 && +m[2] < 100)
    .map((m) => [+m[1], +m[2]]);
  if (small.length > 0) {
    small.sort((a, b) => compareVersionArrays(b, a));
    return small[0];
  }

  // Priority 3: leading single-or-double digit. The digit must be followed
  // by a "clean" delimiter — dash, dot, underscore, or end-of-string. This
  // rejects parameter counts (`32b`, `120m`), MoE notation (`8x7b`,
  // `4x22B`), and anything attached to an alpha character.
  const leadingMatches = [...id.matchAll(/(?:^|[^0-9])(\d{1,2})(?=[\-._]|$)/g)];
  if (leadingMatches.length > 0) return [parseInt(leadingMatches[0][1], 10)];

  return [];
}

// ---------------------------------------------------------------------------
// Tier scoring (flagship > mid > budget)
// ---------------------------------------------------------------------------

/**
 * Score a model id by its tier keyword. Positive = flagship tier, negative
 * = budget tier, 0 = mid tier or no keyword. Tier breaks the tie when two
 * models share the same version and date (e.g. gpt-5.4-pro-2026-03-05 beats
 * gpt-5.4-mini-2026-03-17 even though mini has a newer date).
 */
function tierScore(id: string): number {
  const lower = id.toLowerCase();
  // Flagship (+3 / +2)
  if (/\bopus\b/.test(lower) || /-ultra(?:[-._]|$)/.test(lower)) return 3;
  if (
    /-max(?:[-._]|$)/.test(lower) ||
    /-pro(?:[-._]|$)/.test(lower) ||
    /-large(?:[-._]|$)/.test(lower) ||
    /-xl(?:[-._]|$)/.test(lower)
  ) {
    return 2;
  }
  // Mid (+1)
  if (
    /\bsonnet\b/.test(lower) ||
    /-plus(?:[-._]|$)/.test(lower) ||
    /-medium(?:[-._]|$)/.test(lower) ||
    /-reasoner(?:[-._]|$)/.test(lower)
  ) {
    return 1;
  }
  // Budget (-1 / -2)
  if (
    /-mini(?:[-._]|$)/.test(lower) ||
    /-small(?:[-._]|$)/.test(lower) ||
    /-lite(?:[-._]|$)/.test(lower) ||
    /-turbo(?:[-._]|$)/.test(lower) ||
    /-flash(?:[-._]|$)/.test(lower) ||
    /\bhaiku\b/.test(lower)
  ) {
    return -1;
  }
  if (/-nano(?:[-._]|$)/.test(lower) || /-tiny(?:[-._]|$)/.test(lower)) {
    return -2;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Provider prefix filter
// ---------------------------------------------------------------------------

/**
 * When a provider's `/v1/models` mixes multiple product lines (e.g. Google
 * returns both `gemini-*` and `gemma-*`), restrict the ranking pool to ids
 * starting with one of the configured prefixes. Without this filter a
 * gemma-4-* model can beat gemini-3.1-* purely because `4 > 3`, even though
 * the two families are separate and shouldn't be compared by version.
 *
 * Providers not listed here use pure ranking over the full chat-model pool.
 */
const REQUIRED_PREFIXES: Partial<Record<AIProvider, readonly string[]>> = {
  gemini: ['gemini-'],
  deepseek: ['deepseek-'],
  grok: ['grok-'],
  qwen: ['qwen', 'qwq'],
  kimi: ['kimi', 'moonshot'],
  zhipu: ['glm-'],
  perplexity: ['sonar'],
  kilo: ['minimax', 'dola', 'qwen'],
  opencode: ['kimi', 'glm', 'minimax', 'qwen'],
};

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

interface RankKey {
  dateMs: number;
  version: number[];
  tier: number;
  digitCount: number;
  length: number;
}

/**
 * Providers whose product names contain strings that look like generic tier
 * keywords but aren't (e.g. Perplexity's `sonar-pro` / `sonar-reasoning-pro`
 * — the `-pro` is part of the product name, not a capability tier). For
 * these providers we disable generic tier scoring and rely entirely on the
 * provider-specific TIEBREAKER_KEYWORDS list to order them.
 */
const SKIP_GENERIC_TIER = new Set<AIProvider>(['perplexity', 'deepseek']);

function rankKey(id: string, provider: AIProvider): RankKey {
  const { dateMs, stripped } = extractAndStripDates(id);
  const version = parseVersion(stripped);
  return {
    dateMs,
    version,
    tier: SKIP_GENERIC_TIER.has(provider) ? 0 : tierScore(id),
    digitCount: (id.match(/\d/g) ?? []).length,
    length: id.length,
  };
}

function compareIds(a: string, b: string, provider: AIProvider): number {
  const ka = rankKey(a, provider);
  const kb = rankKey(b, provider);

  // 1. Higher version wins first — the strongest "newness" signal in most
  //    provider id schemes (gpt-5.4 > gpt-5, qwen3.6 > qwen3, …).
  const v = compareVersionArrays(kb.version, ka.version);
  if (v !== 0) return v;

  // 2. Same version → flagship tier beats budget tier. This ensures e.g.
  //    gpt-5.4-pro-2026-03-05 wins over gpt-5.4-mini-2026-03-17 even though
  //    the mini has a newer date. Skipped for providers in SKIP_GENERIC_TIER.
  if (ka.tier !== kb.tier) return kb.tier - ka.tier;

  // 3. Provider-specific product priority. For providers like Perplexity or
  //    DeepSeek whose version fields are always empty and whose generic tier
  //    matching is unreliable, TIEBREAKER_KEYWORDS carries the real ordering
  //    (e.g. sonar-deep-research > sonar-reasoning-pro > sonar-pro > sonar).
  //    Apply it here (not only at the very end) so it takes precedence over
  //    date/length/alphabetical tiebreakers.
  const providerKeywords = TIEBREAKER_KEYWORDS[provider];
  if (providerKeywords && providerKeywords.length > 0) {
    const sa = tiebreakerScore(a, providerKeywords);
    const sb = tiebreakerScore(b, providerKeywords);
    if (sa !== sb) return sb - sa;
  }

  // 4. Same tier → newer date wins.
  if (ka.dateMs !== kb.dateMs) return kb.dateMs - ka.dateMs;

  // 5. Prefer the cleaner alias (fewer digits, shorter id). This pushes
  //    "gpt-5.4-pro" above "gpt-5.4-pro-2026-03-05" when the date is already
  //    tied, and similarly prefers bare aliases over dated snapshots.
  if (ka.digitCount !== kb.digitCount) return ka.digitCount - kb.digitCount;
  if (ka.length !== kb.length) return ka.length - kb.length;

  return a < b ? -1 : a > b ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Provider-specific tiebreaker keywords
// ---------------------------------------------------------------------------

/**
 * When version+date rank ties (e.g. provider has no version numbers at all,
 * like DeepSeek), fall back to these keyword priorities. An id containing
 * an earlier keyword wins. Empty array = no tiebreaker for that provider.
 */
const TIEBREAKER_KEYWORDS: Record<AIProvider, readonly string[]> = {
  openai: ['gpt-5', 'gpt-4o', 'gpt-4'],
  anthropic: ['opus', 'sonnet', 'haiku'],
  gemini: ['gemini-3', 'gemini-2', 'gemini-1'],
  deepseek: ['reasoner', 'chat'],
  grok: ['grok-4', 'grok-3'],
  together: ['llama-4', 'llama-3.3', 'qwen3', 'deepseek-v3'],
  kimi: ['kimi-k2', 'moonshot-v1-128k', 'moonshot-v1-32k', 'moonshot-v1'],
  openrouter: [
    'anthropic/claude-opus',
    'openai/gpt-5',
    'anthropic/claude-sonnet',
    'google/gemini-3',
    'x-ai/grok',
  ],
  zhipu: ['glm-4-plus', 'glm-4v', 'glm-4'],
  perplexity: ['sonar-deep-research', 'sonar-reasoning-pro', 'sonar-pro', 'sonar'],
  qwen: ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-vl'],
  kilo: ['dola-seed', 'minimax', 'qwen'],
  opencode: ['kimi', 'glm', 'minimax', 'qwen'],
  ollama_cloud: ['gpt-oss'],
  ollama_local: ['llama', 'qwen'],
};

function tiebreakerScore(id: string, keywords: readonly string[]): number {
  const lower = id.toLowerCase();
  for (let i = 0; i < keywords.length; i++) {
    if (lower.includes(keywords[i])) return keywords.length - i;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Pick the best-ranked chat/reasoning model for a provider from its
 * availableModels list. Returns null when the list is empty or contains
 * only non-chat models (e.g. an embeddings-only key).
 *
 * The result is a *recommendation* computed from the model id alone — it
 * is the correct "newest usable chat model" ~90% of the time but should
 * not be presented to users as an authoritative "latest" claim.
 */
export function pickRecommendedModelByProvider(
  provider: AIProvider,
  models: string[],
): string | null {
  if (!Array.isArray(models) || models.length === 0) return null;

  // 1. Filter to likely chat/reasoning models.
  let pool = models.filter(isLikelyChatModel);
  if (pool.length === 0) return null; // everything was filtered out (e.g. embed-only)

  // 1a. Apply provider-specific family prefix filter so unrelated product
  //     lines (e.g. gemma-* in Google's /v1/models) don't pollute the
  //     ranking. If the filter removes everything, fall back to the
  //     unfiltered pool rather than returning null — the provider may
  //     have renamed its prefix and we don't want to silently produce no
  //     recommendation.
  const requiredPrefixes = REQUIRED_PREFIXES[provider];
  if (requiredPrefixes) {
    const restricted = pool.filter((id) => {
      const lower = id.toLowerCase();
      // Strip provider/ prefix (e.g. "openai/gpt-5" → "gpt-5") so gateway
      // ids are compared on their model portion. Gateways like OpenRouter
      // don't have REQUIRED_PREFIXES anyway, so this is mostly defensive.
      const slashIdx = lower.indexOf('/');
      const model = slashIdx >= 0 ? lower.slice(slashIdx + 1) : lower;
      return requiredPrefixes.some((p) => model.startsWith(p));
    });
    if (restricted.length > 0) pool = restricted;
  }

  // 2. Sort by (version DESC, tier DESC, provider-keyword DESC, date DESC,
  //    digit count ASC, length ASC). compareIds already applies the
  //    provider-specific tiebreaker keywords inline, so a single sort pass
  //    is enough.
  const sorted = [...pool].sort((a, b) => compareIds(a, b, provider));
  return sorted[0] ?? null;
}

/** @deprecated Use pickRecommendedModelByProvider instead. Kept as an alias for callers that haven't migrated. */
export const pickLatestModelByProvider = pickRecommendedModelByProvider;
