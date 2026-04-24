// filepath: apps/superadmin/lib/parse-env-keys.ts
// Parse .env-style or JSON object text and extract only AI provider API keys (system-recognized).
// Filter mechanism: only keys in the allow-list (see SUPPORTED_AI_ENV_KEYS) are accepted.

import { AI_PROVIDERS, type AIProvider } from './ai-providers';

/** Additional accepted env-key aliases for import compatibility. */
const ENV_KEY_ALIASES: Record<string, { provider: AIProvider; canonicalEnvKey: string }> = {
  OLLAMA_CLOUD_API_KEY: {
    provider: 'ollama_cloud',
    canonicalEnvKey: 'OLLAMA_API_KEY',
  },
};

const BASE_ENV_KEY_TO_PROVIDER: Record<string, AIProvider> = Object.fromEntries(
  AI_PROVIDERS.map((p) => [p.envKey.toUpperCase(), p.id])
);

const BASE_UPPER_TO_CANONICAL: Record<string, string> = Object.fromEntries(
  AI_PROVIDERS.map((p) => [p.envKey.toUpperCase(), p.envKey])
);

const ALL_ENV_KEY_TO_PROVIDER: Record<string, AIProvider> = {
  ...BASE_ENV_KEY_TO_PROVIDER,
  ...Object.fromEntries(
    Object.entries(ENV_KEY_ALIASES).map(([alias, meta]) => [alias.toUpperCase(), meta.provider])
  ),
};

const ALL_UPPER_TO_CANONICAL: Record<string, string> = {
  ...BASE_UPPER_TO_CANONICAL,
  ...Object.fromEntries(
    Object.entries(ENV_KEY_ALIASES).map(([alias, meta]) => [alias.toUpperCase(), meta.canonicalEnvKey])
  ),
};

/** 系統僅辨識這五個 AI 金鑰變數名（大小寫不敏感），其餘一律忽略 */
const SUPPORTED_AI_ENV_KEYS = new Set(Object.keys(ALL_ENV_KEY_TO_PROVIDER));
/** 大寫變數名 -> provider id，用於大小寫不敏感比對 */
const UPPER_ENV_KEY_TO_PROVIDER: Record<string, AIProvider> = ALL_ENV_KEY_TO_PROVIDER;
/** 大寫變數名 -> 標準 envKey（用於回傳與顯示） */
const UPPER_TO_CANONICAL: Record<string, string> = ALL_UPPER_TO_CANONICAL;

/**
 * Parse KEY=VALUE lines. Handles:
 * - KEY=value, KEY="value", KEY='value'
 * - export KEY=value (strip "export " prefix)
 * - # comment and empty lines ignored
 */
function parseEnvLine(line: string): { key: string; value: string } | null {
  let trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  if (/^export\s+/i.test(trimmed)) trimmed = trimmed.replace(/^export\s+/i, '').trim();
  const eq = trimmed.indexOf('=');
  if (eq <= 0) return null;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return { key, value };
}

/**
 * 從 JSON 物件中擷取 AI 金鑰。僅處理頂層 key，且 key 須在 allow-list、value 為非空字串。
 * 變數名比對為大小寫不敏感。
 */
function parseJsonForAIKeys(content: string): ParsedAIKey[] {
  const obj = JSON.parse(content) as Record<string, unknown>;
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return [];
  const results: ParsedAIKey[] = [];
  const seen = new Set<AIProvider>();
  for (const [key, raw] of Object.entries(obj)) {
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (!value) continue;
    const keyUpper = key.toUpperCase();
    if (!SUPPORTED_AI_ENV_KEYS.has(keyUpper)) continue;
    const provider = UPPER_ENV_KEY_TO_PROVIDER[keyUpper];
    const canonicalKey = UPPER_TO_CANONICAL[keyUpper];
    if (!provider || !canonicalKey || seen.has(provider)) continue;
    seen.add(provider);
    results.push({ provider, envKey: canonicalKey, value });
  }
  return results;
}

export interface ParsedAIKey {
  provider: AIProvider;
  envKey: string;
  value: string;
}

/** 辨識用的金鑰名稱列表（供 UI 顯示） */
export const SUPPORTED_AI_ENV_KEY_NAMES = [
  ...AI_PROVIDERS.map((p) => p.envKey),
  ...Object.keys(ENV_KEY_ALIASES),
];

/**
 * 過濾機制：
 * 1. 只接受「變數名」在 allow-list 的項目：OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, DEEPSEEK_API_KEY, GROK_API_KEY
 * 2. 變數名比對為「大小寫不敏感」（OPENAI_API_KEY / openai_api_key 皆可）
 * 3. 支援 .env 格式（KEY=value、export KEY=value）與 JSON 物件格式（{"OPENAI_API_KEY":"sk-..."}）
 * 4. 每種 provider 只取第一次出現且 value 非空的那一筆
 * 其餘（GITHUB_TOKEN、SUPABASE_*、FIGMA_* 等）一律不導入
 */
export function parseEnvForAIKeys(content: string): ParsedAIKey[] {
  const normalized = content.replace(/^\uFEFF/, '').trim();
  if (normalized.startsWith('{')) {
    try {
      const fromJson = parseJsonForAIKeys(normalized);
      if (fromJson.length > 0) return fromJson;
    } catch {
      // JSON 解析失敗，改為 .env 解析
    }
  }

  const results: ParsedAIKey[] = [];
  const seen = new Set<AIProvider>();
  for (const line of normalized.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    const { key, value } = parsed;
    const keyUpper = key.toUpperCase();
    if (!SUPPORTED_AI_ENV_KEYS.has(keyUpper) || !value) continue;
    const provider = UPPER_ENV_KEY_TO_PROVIDER[keyUpper];
    const canonicalKey = UPPER_TO_CANONICAL[keyUpper];
    if (!provider || !canonicalKey || seen.has(provider)) continue;
    seen.add(provider);
    results.push({ provider, envKey: canonicalKey, value });
  }

  return results;
}
