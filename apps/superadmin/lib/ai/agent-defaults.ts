/**
 * Factory-shipped defaults for the "模型選擇與設定" feature.
 *
 * Each AI Agent listed in `agent-registry.ts` gets a pre-configured
 * strategy here: Primary model + 3 Fallbacks (one per trigger type) +
 * a $5 USD monthly cap guardrail. Used as:
 *
 *   1. Initial seed when an admin first opens the panel (the DB can be
 *      populated by POSTing these rows to the API — see the seed script
 *      in `scripts/seed-agent-defaults.sh` or the inline hook reset).
 *   2. The "重設為預設" button's target — `useAgentAssignments.reset()`
 *      now PUTs the defaults back rather than deleting the row.
 *
 * Model IDs referenced here MUST exist in `lib/ai-providers.ts`
 * AI_PROVIDERS so that `getAvailableModelsListWithStaticFallback` will
 * surface them in the dropdown even if the corresponding provider key
 * hasn't been validated yet.
 *
 * Design rules:
 *  - Each agent has exactly 3 fallbacks, one per trigger
 *    (`rate_limit` → `error` → `cost_over`).
 *  - Temperature bias: legal/OCR=0.1~0.2, general=0.3, creative=0.5~0.6,
 *    dev=0.2.
 *  - Max tokens: long form (blog/contract)=8192, default=4096, audit=2048.
 *  - guardrails.max_monthly_usd is hard-coded to 5 — cheap to test, easy
 *    to raise later without a schema change.
 */

import type {
  AgentFallbackEntry,
  AgentGuardrails,
  AgentModelConfig,
} from '@/lib/types/agent-assignment';

export interface AgentAssignmentDefault {
  primary_provider: string;
  primary_model_id: string;
  primary_config: AgentModelConfig;
  fallbacks: AgentFallbackEntry[];
  guardrails: AgentGuardrails;
  notes: string;
}

/** $5 USD/month — applied uniformly per the product decision. */
const DEFAULT_MAX_MONTHLY_USD = 5;

/** Reusable shorthand so each entry stays readable. */
function defaults(
  primary_provider: string,
  primary_model_id: string,
  primary_config: AgentModelConfig,
  fallbacks: AgentFallbackEntry[],
  notes: string,
): AgentAssignmentDefault {
  return {
    primary_provider,
    primary_model_id,
    primary_config,
    fallbacks,
    guardrails: { max_monthly_usd: DEFAULT_MAX_MONTHLY_USD },
    notes,
  };
}

function fb(
  provider: string,
  model_id: string,
  trigger: AgentFallbackEntry['trigger'],
): AgentFallbackEntry {
  return { provider, model_id, trigger, config: {} };
}

// ---------------------------------------------------------------------------
// Per-agent defaults
// ---------------------------------------------------------------------------

export const AGENT_DEFAULTS: Record<string, AgentAssignmentDefault> = {
  // ───────── Content ─────────
  contract_assistant: defaults(
    'anthropic',
    'claude-opus-4-20250514',
    { temperature: 0.2, max_tokens: 8192 },
    [
      fb('openai', 'gpt-4o', 'rate_limit'),
      fb('gemini', 'gemini-1.5-pro', 'error'),
      fb('anthropic', 'claude-sonnet-4-20250514', 'cost_over'),
    ],
    '合約條款精度優先：Opus 4 為主，速率超限切 GPT-4o，錯誤時切 Gemini 1.5 Pro，成本超標時降到 Sonnet。',
  ),

  property_description: defaults(
    'anthropic',
    'claude-sonnet-4-20250514',
    { temperature: 0.4, max_tokens: 4096 },
    [
      fb('openai', 'gpt-4o', 'rate_limit'),
      fb('gemini', 'gemini-2.0-flash', 'error'),
      fb('openai', 'gpt-4o-mini', 'cost_over'),
    ],
    '房源描述重視可讀性 + 成本：Sonnet 4 為主，短 fallback 鏈以控制單次呼叫成本。',
  ),

  blog_generator: defaults(
    'openai',
    'gpt-4o',
    { temperature: 0.6, max_tokens: 8192 },
    [
      fb('anthropic', 'claude-sonnet-4-20250514', 'rate_limit'),
      fb('gemini', 'gemini-1.5-pro', 'error'),
      fb('gemini', 'gemini-2.0-flash', 'cost_over'),
    ],
    '長文部落格：GPT-4o 主力，Sonnet / Gemini Pro fallback 維持創意水準。',
  ),

  ad_generator: defaults(
    'anthropic',
    'claude-sonnet-4-20250514',
    { temperature: 0.6, max_tokens: 4096 },
    [
      fb('openai', 'gpt-4o', 'rate_limit'),
      fb('gemini', 'gemini-2.0-flash', 'error'),
      fb('openai', 'gpt-4o-mini', 'cost_over'),
    ],
    '廣告短文案：Sonnet 風格穩定，cost fallback 改 mini 進一步壓成本。',
  ),

  // ───────── Transcript ─────────
  transcript_detection: defaults(
    'gemini',
    'gemini-3.1-pro-preview',
    { temperature: 0, max_tokens: 4096, reasoning_effort: 'high' },
    [
      {
        ...fb('anthropic', 'claude-opus-4-5-20251101', 'rate_limit'),
        config: { temperature: 0, max_tokens: 4096 },
      },
      {
        ...fb('openai', 'gpt-5.5', 'error'),
        config: { temperature: 0, max_tokens: 4096, reasoning_effort: 'high' },
      },
      {
        ...fb('gemini', 'gemini-2.0-flash', 'cost_over'),
        config: { temperature: 0, max_tokens: 4096, reasoning_effort: 'high' },
      },
    ],
    '謄本與權狀初判：Gemini 3.1 Pro Preview 為主，temperature 0、thinking level high；權狀需優先判為 land_title / building_title，沒有明確車位證據不得推測車位。',
  ),

  transcript_review: defaults(
    'anthropic',
    'claude-opus-4-20250514',
    { temperature: 0.1, max_tokens: 2048 },
    [
      fb('openai', 'gpt-4o', 'rate_limit'),
      fb('gemini', 'gemini-1.5-pro', 'error'),
      fb('anthropic', 'claude-sonnet-4-20250514', 'cost_over'),
    ],
    '筆數審核要保守：Opus 4 為主，精度優先、cost fallback 也仍用 Sonnet。',
  ),

  transcript_visual_parse: defaults(
    'gemini',
    'gemini-3.1-pro-preview',
    { temperature: 0, max_tokens: 8192, reasoning_effort: 'high' },
    [
      {
        ...fb('anthropic', 'claude-opus-4-5-20251101', 'rate_limit'),
        config: { temperature: 0, max_tokens: 8192 },
      },
      {
        ...fb('openai', 'gpt-5.5', 'error'),
        config: { temperature: 0, max_tokens: 8192, reasoning_effort: 'high' },
      },
      {
        ...fb('gemini', 'gemini-1.5-pro', 'cost_over'),
        config: { temperature: 0, max_tokens: 8192 },
      },
    ],
    '謄本與權狀視覺解析：Gemini 3.1 Pro Preview 為主，temperature 0、thinking level high；移除 Kimi/DeepSeek/Gemini Flash，備援保留 GPT-5.5、Claude Opus 與 Gemini Pro。',
  ),

  transcript_audit: defaults(
    'anthropic',
    'claude-opus-4-5-20251101',
    { temperature: 0, max_tokens: 8192 },
    [
      {
        ...fb('gemini', 'gemini-3.1-pro-preview', 'rate_limit'),
        config: { temperature: 0, max_tokens: 8192, reasoning_effort: 'high' },
      },
      {
        ...fb('grok', 'grok-4.20-reasoning', 'error'),
        config: { temperature: 0, max_tokens: 8192 },
      },
      {
        ...fb('openai', 'gpt-5.3-chat-latest', 'cost_over'),
        config: { temperature: 0, max_tokens: 8192 },
      },
    ],
    '解析結果審核：移除持續輸出不完整 JSON 的 GPT-5.5；預設由 Claude Opus 4.5、Gemini 3.1 Pro Preview、Grok 4.20 三家 reviewer 交叉審查，OpenAI GPT-5.3 作為補位。',
  ),

  transcript_detail_builder: defaults(
    'gemini',
    'gemini-3.1-pro-preview',
    { temperature: 0, max_tokens: 8192, reasoning_effort: 'high' },
    [
      {
        ...fb('anthropic', 'claude-opus-4-5-20251101', 'rate_limit'),
        config: { temperature: 0, max_tokens: 8192 },
      },
      {
        ...fb('openai', 'gpt-5.5', 'error'),
        config: { temperature: 0, max_tokens: 8192, reasoning_effort: 'high' },
      },
      {
        ...fb('gemini', 'gemini-1.5-pro', 'cost_over'),
        config: { temperature: 0, max_tokens: 8192 },
      },
    ],
    '明細草稿產生：單一 Gemini 3.1 Pro Preview VLM 依 parse + review + 原始文件填入可編輯面積明細，有爭議才標記人工確認。',
  ),

  // ───────── Media ─────────
  photo_generation: defaults(
    'openai',
    'gpt-4o',
    { temperature: 0.3, max_tokens: 4096 },
    [
      fb('gemini', 'gemini-1.5-pro', 'rate_limit'),
      fb('anthropic', 'claude-opus-4-20250514', 'error'),
      fb('grok', 'grok-2-vision', 'cost_over'),
    ],
    '照片編輯需要視覺模型理解原圖：GPT-4o 主，Grok Vision 做成本 fallback。',
  ),

  video_generation: defaults(
    'gemini',
    'gemini-1.5-pro',
    { temperature: 0.3, max_tokens: 4096 },
    [
      fb('openai', 'gpt-4o', 'rate_limit'),
      fb('anthropic', 'claude-opus-4-20250514', 'error'),
      fb('grok', 'grok-2-vision', 'cost_over'),
    ],
    'P2V 腳本需要 long context 視覺 — Gemini 1.5 Pro 的 2M window 為主力。',
  ),

  voice_generation: defaults(
    'openai',
    'gpt-4o',
    { temperature: 0.4, max_tokens: 2048 },
    [
      fb('anthropic', 'claude-sonnet-4-20250514', 'rate_limit'),
      fb('gemini', 'gemini-2.0-flash', 'error'),
      fb('openai', 'gpt-4o-mini', 'cost_over'),
    ],
    'TTS 文稿生成：短 context 即可，cost fallback 到 mini 是為了批次量大時壓成本。',
  ),

  // ───────── Dev ─────────
  software_dev_engineer: defaults(
    'anthropic',
    'claude-opus-4-20250514',
    { temperature: 0.2, max_tokens: 8192 },
    [
      fb('openai', 'gpt-4o', 'rate_limit'),
      fb('deepseek', 'deepseek-chat', 'error'),
      fb('anthropic', 'claude-sonnet-4-20250514', 'cost_over'),
    ],
    '軟體開發助理：Opus 4 強推理為主，DeepSeek 作 error fallback（不同廠商降低共振風險）。',
  ),

  ttd_engineer: defaults(
    'anthropic',
    'claude-sonnet-4-20250514',
    { temperature: 0.2, max_tokens: 4096 },
    [
      fb('openai', 'gpt-4o', 'rate_limit'),
      fb('deepseek', 'deepseek-chat', 'error'),
      fb('gemini', 'gemini-2.0-flash', 'cost_over'),
    ],
    'TDD 測試產生器：Sonnet 對測試骨架準度夠，成本 fallback 改 Gemini Flash 避免多花錢。',
  ),

  // ───────── Support ─────────
  web_assistant: defaults(
    'anthropic',
    'claude-sonnet-4-20250514',
    { temperature: 0.3, max_tokens: 2048 },
    [
      fb('openai', 'gpt-4o', 'rate_limit'),
      fb('gemini', 'gemini-2.0-flash', 'error'),
      fb('openai', 'gpt-4o-mini', 'cost_over'),
    ],
    '客服聊天成本敏感：Sonnet 為主，cost fallback 直接切 mini 壓成本。',
  ),
};

/**
 * Returns the default for an agent_key, or `null` if none is defined.
 * Callers should treat null as "cannot reset — user must configure manually".
 */
export function getAgentDefault(agentKey: string): AgentAssignmentDefault | null {
  return AGENT_DEFAULTS[agentKey] ?? null;
}
