// filepath: apps/superadmin/lib/parse-env-keys.ts
// Parse .env-style text and extract only AI provider API keys (system-recognized).
// Filter mechanism: only keys in the allow-list (see SUPPORTED_AI_ENV_KEYS) are accepted.

import { AI_PROVIDERS, type AIProvider } from './ai-providers';

/** 系統僅辨識這五個 AI 金鑰變數名（大小寫不敏感），其餘一律忽略 */
const SUPPORTED_AI_ENV_KEYS = new Set(
  AI_PROVIDERS.map((p) => p.envKey.toUpperCase())
);
/** 大寫變數名 -> provider id，用於大小寫不敏感比對 */
const UPPER_ENV_KEY_TO_PROVIDER: Record<string, AIProvider> = Object.fromEntries(
  AI_PROVIDERS.map((p) => [p.envKey.toUpperCase(), p.id])
);
/** 大寫變數名 -> 標準 envKey（用於回傳與顯示） */
const UPPER_TO_CANONICAL: Record<string, string> = Object.fromEntries(
  AI_PROVIDERS.map((p) => [p.envKey.toUpperCase(), p.envKey])
);

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

export interface ParsedAIKey {
  provider: AIProvider;
  envKey: string;
  value: string;
}

/** 辨識用的金鑰名稱列表（供 UI 顯示） */
export const SUPPORTED_AI_ENV_KEY_NAMES = AI_PROVIDERS.map((p) => p.envKey);

/**
 * 過濾機制：
 * 1. 只接受「變數名」在 allow-list 的項目：OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, DEEPSEEK_API_KEY, GROK_API_KEY
 * 2. 變數名比對為「大小寫不敏感」（OPENAI_API_KEY / openai_api_key 皆可）
 * 3. 支援 export KEY=value 寫法
 * 4. 每種 provider 只取第一次出現且 value 非空的那一行
 * 其餘（GITHUB_TOKEN、SUPABASE_*、FIGMA_* 等）一律不導入
 */
export function parseEnvForAIKeys(content: string): ParsedAIKey[] {
  const results: ParsedAIKey[] = [];
  const seen = new Set<AIProvider>();
  const normalized = content.replace(/^\uFEFF/, ''); // strip BOM

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
