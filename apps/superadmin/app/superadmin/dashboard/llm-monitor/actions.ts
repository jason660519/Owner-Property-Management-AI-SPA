'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { getModelPricing, inferProvider } from '@/lib/ai/llm-price-map';

const SETTINGS_KEY = 'llm_monitor';
const REVALIDATE_PATH = '/superadmin/dashboard/llm-monitor';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const ProviderKeySchema = z.object({
  id: z.string(),
  label: z.string(),
  expiresAt: z.string().nullable(),
});

const LLMMonitorConfigSchema = z.object({
  monthlyBudgetUsd: z.number().nonnegative(),
  alertThresholdPercent: z.number().min(1).max(100),
  providerApiKeys: z.array(ProviderKeySchema),
});

export type LLMMonitorConfig = z.infer<typeof LLMMonitorConfigSchema>;

export interface LLMMetric {
  id: string;
  model_id: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_cost: number | null;
  latency_ms: number | null;
  user_feedback_score: number | null;
  request_id: string | null;
  created_at: string;
}

export interface LLMAggregateStat {
  provider: string;
  model_id: string;
  display_key: string;
  total_requests: number;
  avg_latency_ms: number;
  avg_prompt_tokens: number;
  avg_completion_tokens: number;
  total_cost: number;
  avg_feedback: number;
  error_rate: number;
  error_count: number;
  timeout_count: number;
  official_input_price_per_1m: number | null;
  official_output_price_per_1m: number | null;
  official_price_researched_at: string | null;
  official_price_source_url: string | null;
}

export interface LLMOverallStats {
  total_requests: number;
  avg_latency_ms: number;
  total_cost: number;
  avg_feedback: number;
  models_count: number;
  error_rate: number;
  month_spend_usd: number;
}

export interface AIUsageLog {
  id: string;
  provider: string;
  model_id: string;
  module_key: string | null;
  prompt_name: string | null;
  prompt_source: string | null;
  prompt_module_key: string | null;
  prompt_version: number | null;
  final_prompt_hash: string | null;
  request_path: string | null;
  response_status: number | null;
  tokens_input: number | null;
  tokens_output: number | null;
  cost_usd: number | null;
  duration_ms: number | null;
  status: 'success' | 'error' | 'timeout' | null;
  error_message: string | null;
  created_at: string;
}

export interface LLMTraceConsoleRow {
  id: string;
  created_at: string;
  source_kind: 'native_trace' | 'adapter_run' | 'legacy_usage';
  page_path: string | null;
  company_name: string | null;
  module_key: string | null;
  invocation_name: string | null;
  execution_name: string | null;
  provider: string | null;
  adapter_id: string | null;
  adapter_model: string | null;
  requested_model: string | null;
  effective_model: string | null;
  input_prompt: string | null;
  test_prompt: string | null;
  test_file_name: string | null;
  raw_output: string | null;
  rendered_output: string | null;
  evaluation_label: string | null;
  evaluation_score: number | null;
  evaluation_message: string | null;
  ttft_ms: number | null;
  e2e_ms: number | null;
  throughput_tokens_per_s: number | null;
  http_status: number | null;
  tokens_input: number | null;
  tokens_output: number | null;
  cost_usd: number | null;
  status: string | null;
  error_message: string | null;
}

export interface LLMEvaluationRunRow {
  id: string;
  created_at: string;
  adapter_id: string;
  channel: string;
  provider: string;
  adapter_option_label: string;
  requested_model: string;
  effective_model: string;
  model_source: string;
  evaluation_level: string;
  evaluation_message: string;
  result_summary: string;
  ttft_ms: number | null;
  e2e_ms: number | null;
  tokens_per_sec: number | null;
  http_status: number | null;
  error_type: string | null;
  raw_output: string | null;
  rendered_output: string | null;
}

export interface DailyTokenPoint {
  bucket_date: string;
  total_tokens: number;
  total_cost_usd: number;
}

export interface WeeklyTokenPoint {
  week_start: string;
  total_tokens: number;
  total_cost_usd: number;
}

export interface VoiceQualityPoint {
  bucket_date: string;
  avg_latency_ms: number;
  break_proxy_rate: number;
  sample_count: number;
}

function defaultConfig(): LLMMonitorConfig {
  return {
    monthlyBudgetUsd: 500,
    alertThresholdPercent: 80,
    providerApiKeys: [],
  };
}

function monthUtcRangeIso(): { from: string; to: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return { from: start.toISOString(), to: end.toISOString() };
}

function num(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

function bigintish(v: unknown): number {
  if (typeof v === 'bigint') return Number(v);
  return Math.trunc(num(v));
}

type EvaluationsGlobalModelScope = {
  displayKeys: Set<string>;
  modelIds: Set<string>;
};

type OfficialPricingRow = {
  provider: string;
  model_id: string;
  input_price_per_1m: number | null;
  output_price_per_1m: number | null;
  generated_at: string | null;
  source_urls: string[] | null;
};

function normalizeModel(provider: string, requested: string | null, effective: string | null): {
  provider: string;
  modelId: string;
} | null {
  const normalizedProvider = provider.trim().toLowerCase();
  const selectedModel = (effective?.trim() || requested?.trim() || '').trim();
  if (!normalizedProvider || !selectedModel) return null;
  return {
    provider: normalizedProvider,
    modelId: selectedModel,
  };
}

async function resolveCurrentSuperadminUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return process.env.SUPERADMIN_DEFAULT_USER_ID ?? null;
  }

  const { data: roleRows } = await supabase.rpc('get_user_roles', {
    lookup_user_id: user.id,
  });

  const roles = Array.isArray(roleRows)
    ? roleRows.map((r: { role_name: string }) => r.role_name)
    : [];

  const isSuperAdmin = roles.includes('super_admin') || user.user_metadata?.role === 'super_admin';
  if (!isSuperAdmin) return null;
  return user.id;
}

async function getEvaluationsGlobalModelScope(userId: string): Promise<EvaluationsGlobalModelScope> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('adapter_evaluation_runs')
    .select('provider, requested_model, effective_model')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5000);

  if (error || !data) {
    return {
      displayKeys: new Set<string>(),
      modelIds: new Set<string>(),
    };
  }

  const displayKeys = new Set<string>();
  const modelIds = new Set<string>();
  for (const row of data as Array<{ provider: string; requested_model: string | null; effective_model: string | null }>) {
    const normalized = normalizeModel(row.provider, row.requested_model, row.effective_model);
    if (!normalized) continue;
    displayKeys.add(`${normalized.provider}/${normalized.modelId}`);
    modelIds.add(normalized.modelId);
  }

  return { displayKeys, modelIds };
}

async function getOfficialPricingMap(
  userId: string,
  scope: EvaluationsGlobalModelScope,
): Promise<Map<string, OfficialPricingRow>> {
  if (scope.displayKeys.size === 0) return new Map<string, OfficialPricingRow>();

  const providers = Array.from(
    new Set(Array.from(scope.displayKeys).map((key) => key.split('/')[0]).filter(Boolean)),
  );
  const modelIds = Array.from(scope.modelIds);
  if (providers.length === 0 || modelIds.length === 0) return new Map<string, OfficialPricingRow>();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ai_model_research_reports')
    .select('provider, model_id, input_price_per_1m, output_price_per_1m, generated_at, source_urls, generation_status')
    .eq('user_id', userId)
    .eq('generation_status', 'done')
    .in('provider', providers)
    .in('model_id', modelIds)
    .order('generated_at', { ascending: false });

  if (error || !data) return new Map<string, OfficialPricingRow>();

  const byKey = new Map<string, OfficialPricingRow>();
  for (const row of data as Array<OfficialPricingRow & { generation_status: string }>) {
    const normalized = normalizeModel(row.provider, row.model_id, row.model_id);
    if (!normalized) continue;
    const key = `${normalized.provider}/${normalized.modelId}`;
    if (byKey.has(key)) continue;
    byKey.set(key, {
      provider: normalized.provider,
      model_id: normalized.modelId,
      input_price_per_1m: row.input_price_per_1m,
      output_price_per_1m: row.output_price_per_1m,
      generated_at: row.generated_at,
      source_urls: row.source_urls,
    });
  }

  // Fallback: for display keys not covered by research reports, use bundled LiteLLM price map.
  for (const displayKey of scope.displayKeys) {
    if (byKey.has(displayKey)) continue;
    const [rawProvider, ...modelParts] = displayKey.split('/');
    const rawModelId = modelParts.join('/');
    if (!rawModelId) continue;
    const bundled = getModelPricing(rawModelId);
    if (!bundled) continue;
    const resolvedProvider = bundled.provider ?? rawProvider ?? inferProvider(rawModelId) ?? rawProvider;
    byKey.set(displayKey, {
      provider: resolvedProvider,
      model_id: rawModelId,
      // Convert from per-token to per-1M-tokens for UI display
      input_price_per_1m: bundled.inputCostPerToken * 1_000_000,
      output_price_per_1m: bundled.outputCostPerToken * 1_000_000,
      generated_at: '2026-04-25T00:00:00Z',
      source_urls: ['https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json'],
    });
  }

  return byKey;
}

export async function getLLMMonitorConfig(): Promise<LLMMonitorConfig> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .maybeSingle();

  if (error || data?.value == null) {
    return defaultConfig();
  }
  const parsed = LLMMonitorConfigSchema.safeParse(data.value);
  return parsed.success ? parsed.data : defaultConfig();
}

export async function saveLLMMonitorConfig(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = LLMMonitorConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid configuration' };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from('platform_settings').upsert(
    {
      key: SETTINGS_KEY,
      value: parsed.data,
      description: 'Superadmin LLM monitor: budget, alerts, API key rotation dates',
      is_public: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' },
  );

  if (error) {
    console.error('saveLLMMonitorConfig', error);
    return { ok: false, error: error.message };
  }

  revalidatePath(REVALIDATE_PATH);
  return { ok: true };
}

/** Fetch recent LLM metrics (last N rows) */
export async function getLLMMetrics(limit = 100): Promise<LLMMetric[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('ai_performance_metrics')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching LLM metrics:', error);
    return [];
  }

  return (data as LLMMetric[]) ?? [];
}

export async function getAIUsageLogs(limit = 100): Promise<AIUsageLog[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('ai_usage_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching AI usage logs:', error);
    return [];
  }

  return (data as AIUsageLog[]) ?? [];
}

interface NativeInvocationRow {
  id: string;
  source_kind: string | null;
  provider: string | null;
  adapter_id: string | null;
  adapter_model: string | null;
  requested_model: string | null;
  effective_model: string | null;
  input_prompt: string | null;
  test_prompt: string | null;
  test_file_name: string | null;
  raw_output: string | null;
  rendered_output: string | null;
  evaluation_label: string | null;
  evaluation_score: number | string | null;
  evaluation_message: string | null;
  ttft_ms: number | null;
  e2e_ms: number | null;
  throughput_tokens_per_s: number | string | null;
  http_status: number | null;
  tokens_input: number | null;
  tokens_output: number | null;
  cost_usd: number | string | null;
  status: string | null;
  error_message: string | null;
  started_at: string | null;
  created_at: string;
  llm_observability_traces?: {
    page_path: string | null;
    company_name: string | null;
    module_key: string | null;
    invocation_name: string | null;
    execution_name: string | null;
  } | null;
}

interface AdapterEvaluationRunRaw {
  id: string;
  adapter_id: string;
  channel: string;
  provider: string;
  adapter_option_label: string;
  requested_model: string;
  effective_model: string;
  model_source: string;
  evaluation_level: string;
  evaluation_message: string;
  result_summary: string;
  ttft_ms: number | null;
  e2e_ms: number | null;
  tokens_per_sec: number | string | null;
  http_status: number | null;
  error_type: string | null;
  rendered_output: string | null;
  raw_output: string | null;
  created_at: string;
}

function toNullableNumber(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

async function getNativeTraceRows(limit: number): Promise<LLMTraceConsoleRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('llm_observability_invocations')
    .select(`
      id,
      source_kind,
      provider,
      adapter_id,
      adapter_model,
      requested_model,
      effective_model,
      input_prompt,
      test_prompt,
      test_file_name,
      raw_output,
      rendered_output,
      evaluation_label,
      evaluation_score,
      evaluation_message,
      ttft_ms,
      e2e_ms,
      throughput_tokens_per_s,
      http_status,
      tokens_input,
      tokens_output,
      cost_usd,
      status,
      error_message,
      started_at,
      created_at,
      llm_observability_traces (
        page_path,
        company_name,
        module_key,
        invocation_name,
        execution_name
      )
    `)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    return [];
  }

  return ((data as unknown as NativeInvocationRow[]) ?? []).map((row) => ({
    id: row.id,
    created_at: row.started_at ?? row.created_at,
    source_kind: 'native_trace',
    page_path: row.llm_observability_traces?.page_path ?? null,
    company_name: row.llm_observability_traces?.company_name ?? null,
    module_key: row.llm_observability_traces?.module_key ?? null,
    invocation_name: row.llm_observability_traces?.invocation_name ?? null,
    execution_name: row.llm_observability_traces?.execution_name ?? null,
    provider: row.provider,
    adapter_id: row.adapter_id,
    adapter_model: row.adapter_model,
    requested_model: row.requested_model,
    effective_model: row.effective_model,
    input_prompt: row.input_prompt,
    test_prompt: row.test_prompt,
    test_file_name: row.test_file_name,
    raw_output: row.raw_output,
    rendered_output: row.rendered_output,
    evaluation_label: row.evaluation_label,
    evaluation_score: toNullableNumber(row.evaluation_score),
    evaluation_message: row.evaluation_message,
    ttft_ms: row.ttft_ms,
    e2e_ms: row.e2e_ms,
    throughput_tokens_per_s: toNullableNumber(row.throughput_tokens_per_s),
    http_status: row.http_status,
    tokens_input: row.tokens_input,
    tokens_output: row.tokens_output,
    cost_usd: toNullableNumber(row.cost_usd),
    status: row.status,
    error_message: row.error_message,
  }));
}

async function getAdapterEvaluationRows(limit: number): Promise<LLMEvaluationRunRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('adapter_evaluation_runs')
    .select(`
      id,
      adapter_id,
      channel,
      provider,
      adapter_option_label,
      requested_model,
      effective_model,
      model_source,
      evaluation_level,
      evaluation_message,
      result_summary,
      ttft_ms,
      e2e_ms,
      tokens_per_sec,
      http_status,
      error_type,
      rendered_output,
      raw_output,
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getAdapterEvaluationRows', error);
    return [];
  }

  return ((data as unknown as AdapterEvaluationRunRaw[]) ?? []).map((row) => ({
    ...row,
    tokens_per_sec: toNullableNumber(row.tokens_per_sec),
  }));
}

async function getAdapterTraceRows(limit: number): Promise<LLMTraceConsoleRow[]> {
  const rows = await getAdapterEvaluationRows(limit);
  return rows.map((row) => ({
    id: `adapter:${row.id}`,
    created_at: row.created_at,
    source_kind: 'adapter_run',
    page_path: 'superadmin/settings/api_key_and_model_setting#evaluations-global',
    company_name: null,
    module_key: 'ai_model_global_evaluation',
    invocation_name: row.adapter_id,
    execution_name: row.channel,
    provider: row.provider,
    adapter_id: row.adapter_id,
    adapter_model: row.adapter_option_label,
    requested_model: row.requested_model,
    effective_model: row.effective_model,
    input_prompt: null,
    test_prompt: null,
    test_file_name: null,
    raw_output: row.raw_output,
    rendered_output: row.rendered_output,
    evaluation_label: row.evaluation_level,
    evaluation_score: row.evaluation_level === 'pass' ? 1 : row.evaluation_level === 'fail' ? 0 : null,
    evaluation_message: row.evaluation_message || row.result_summary,
    ttft_ms: row.ttft_ms,
    e2e_ms: row.e2e_ms,
    throughput_tokens_per_s: row.tokens_per_sec,
    http_status: row.http_status,
    tokens_input: null,
    tokens_output: null,
    cost_usd: null,
    status: row.evaluation_level,
    error_message: row.error_type,
  }));
}

async function getUsageTraceRows(limit: number): Promise<LLMTraceConsoleRow[]> {
  const usageLogs = await getAIUsageLogs(limit);
  return usageLogs.map((row) => ({
    id: `usage:${row.id}`,
    created_at: row.created_at,
    source_kind: 'legacy_usage',
    page_path: row.request_path,
    company_name: null,
    module_key: row.module_key,
    invocation_name: row.prompt_name ?? row.module_key,
    execution_name: row.prompt_source ?? null,
    provider: row.provider,
    adapter_id: null,
    adapter_model: null,
    requested_model: row.model_id,
    effective_model: row.model_id,
    input_prompt: null,
    test_prompt: null,
    test_file_name: null,
    raw_output: null,
    rendered_output: null,
    evaluation_label: null,
    evaluation_score: null,
    evaluation_message: null,
    ttft_ms: null,
    e2e_ms: row.duration_ms,
    throughput_tokens_per_s:
      row.duration_ms && row.tokens_output
        ? Number(((row.tokens_output / row.duration_ms) * 1000).toFixed(2))
        : null,
    http_status: row.response_status,
    tokens_input: row.tokens_input,
    tokens_output: row.tokens_output,
    cost_usd: toNullableNumber(row.cost_usd),
    status: row.status,
    error_message: row.error_message,
  }));
}

export async function getLLMTraceConsoleRows(limit = 100): Promise<LLMTraceConsoleRow[]> {
  const [nativeRows, adapterRows, usageRows] = await Promise.all([
    getNativeTraceRows(limit),
    getAdapterTraceRows(limit),
    getUsageTraceRows(limit),
  ]);

  return [...nativeRows, ...adapterRows, ...usageRows]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

export async function getLLMEvaluationRuns(limit = 100): Promise<LLMEvaluationRunRow[]> {
  return getAdapterEvaluationRows(limit);
}

async function avgFeedbackLast30Days(): Promise<number> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
  const { data, error } = await supabase
    .from('ai_performance_metrics')
    .select('user_feedback_score')
    .gte('created_at', since)
    .not('user_feedback_score', 'is', null);

  if (error || !data?.length) {
    return 0;
  }
  const sum = data.reduce((s, r) => s + (r.user_feedback_score ?? 0), 0);
  return Math.round((sum / data.length) * 10) / 10;
}

/** Aggregate stats per provider/model from ai_usage_logs (30d) */
export async function getLLMAggregateStats(): Promise<LLMAggregateStat[]> {
  const userId = await resolveCurrentSuperadminUserId();
  if (!userId) return [];

  const scope = await getEvaluationsGlobalModelScope(userId);
  if (scope.displayKeys.size === 0) return [];

  const officialPricingByKey = await getOfficialPricingMap(userId, scope);

  const supabase = createAdminClient();
  const since = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

  const { data, error } = await supabase.rpc('superadmin_ai_usage_by_model_since', {
    p_since: since,
  });

  if (error) {
    console.error('getLLMAggregateStats rpc', error);
    return await legacyAggregateFromPerformanceMetrics(scope, officialPricingByKey);
  }

  const rows = (data ?? []) as Record<string, unknown>[];

  return rows
    .map((row) => {
    const provider = String(row.provider ?? '');
    const modelId = String(row.model_id ?? '');
      const normalized = normalizeModel(provider, modelId, modelId);
      const key = normalized ? `${normalized.provider}/${normalized.modelId}` : '';
      const pricing = key ? officialPricingByKey.get(key) : undefined;

    return {
      provider,
      model_id: modelId,
      display_key: `${provider}/${modelId}`,
      total_requests: bigintish(row.total_requests),
      avg_latency_ms: Math.round(num(row.avg_latency_ms)),
      avg_prompt_tokens: Math.round(num(row.avg_prompt_tokens)),
      avg_completion_tokens: Math.round(num(row.avg_completion_tokens)),
      total_cost: Math.round(num(row.total_cost_usd) * 1000) / 1000,
      avg_feedback: 0,
      error_rate: num(row.error_rate),
      error_count: bigintish(row.error_count),
      timeout_count: bigintish(row.timeout_count),
        official_input_price_per_1m: pricing?.input_price_per_1m ?? null,
        official_output_price_per_1m: pricing?.output_price_per_1m ?? null,
        official_price_researched_at: pricing?.generated_at ?? null,
        official_price_source_url: pricing?.source_urls?.[0] ?? null,
    };
    })
    .filter((row) => scope.displayKeys.has(`${row.provider.toLowerCase()}/${row.model_id}`));
}

/** Fallback if RPC not migrated yet */
async function legacyAggregateFromPerformanceMetrics(
  scope: EvaluationsGlobalModelScope,
  officialPricingByKey: Map<string, OfficialPricingRow>,
): Promise<LLMAggregateStat[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ai_performance_metrics')
    .select('model_id, latency_ms, prompt_tokens, completion_tokens, total_cost, user_feedback_score')
    .gte('created_at', new Date(Date.now() - THIRTY_DAYS_MS).toISOString());

  if (error || !data) {
    return [];
  }

  const grouped = data.reduce<Record<string, LLMMetric[]>>((acc, row) => {
    const key = row.model_id ?? 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(row as LLMMetric);
    return acc;
  }, {});

  return Object.entries(grouped).map(([model_id, rows]) => {
    const count = rows.length;
    const avgLatency = rows.reduce((s, r) => s + (r.latency_ms ?? 0), 0) / count;
    const avgPrompt = rows.reduce((s, r) => s + (r.prompt_tokens ?? 0), 0) / count;
    const avgCompletion = rows.reduce((s, r) => s + (r.completion_tokens ?? 0), 0) / count;
    const totalCost = rows.reduce((s, r) => s + (r.total_cost ?? 0), 0);
    const feedbackRows = rows.filter((r) => r.user_feedback_score !== null);
    const avgFeedback =
      feedbackRows.length > 0
        ? feedbackRows.reduce((s, r) => s + (r.user_feedback_score ?? 0), 0) / feedbackRows.length
        : 0;

    return {
      provider: '—',
      model_id,
      display_key: model_id,
      total_requests: count,
      avg_latency_ms: Math.round(avgLatency),
      avg_prompt_tokens: Math.round(avgPrompt),
      avg_completion_tokens: Math.round(avgCompletion),
      total_cost: Math.round(totalCost * 1000) / 1000,
      avg_feedback: Math.round(avgFeedback * 10) / 10,
      error_rate: 0,
      error_count: 0,
      timeout_count: 0,
      official_input_price_per_1m: null,
      official_output_price_per_1m: null,
      official_price_researched_at: null,
      official_price_source_url: null,
    };
  }).filter((row) => scope.modelIds.has(row.model_id));
}

/** Overall stats (30d) + month spend + feedback */
export async function getLLMOverallStats(): Promise<LLMOverallStats> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
  const { from, to } = monthUtcRangeIso();

  const [overallRpc, costRpc, feedback] = await Promise.all([
    supabase.rpc('superadmin_ai_usage_overall_since', { p_since: since }),
    supabase.rpc('superadmin_ai_usage_cost_between', { p_from: from, p_to: to }),
    avgFeedbackLast30Days(),
  ]);

  if (overallRpc.error || !overallRpc.data?.[0]) {
    console.error('getLLMOverallStats rpc', overallRpc.error);
    return legacyOverallStats(feedback);
  }

  const row = overallRpc.data[0] as Record<string, unknown>;
  const monthSpend = costRpc.error != null ? 0 : num(costRpc.data);

  return {
    total_requests: bigintish(row.total_requests),
    avg_latency_ms: Math.round(num(row.avg_latency_ms)),
    total_cost: Math.round(num(row.total_cost_usd) * 1000) / 1000,
    avg_feedback: feedback,
    models_count: bigintish(row.distinct_models),
    error_rate: num(row.error_rate),
    month_spend_usd: Math.round(monthSpend * 1000000) / 1000000,
  };
}

async function legacyOverallStats(avgFeedback: number): Promise<LLMOverallStats> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ai_performance_metrics')
    .select('latency_ms, total_cost, user_feedback_score, model_id')
    .gte('created_at', new Date(Date.now() - THIRTY_DAYS_MS).toISOString());

  if (error || !data) {
    return {
      total_requests: 0,
      avg_latency_ms: 0,
      total_cost: 0,
      avg_feedback: avgFeedback,
      models_count: 0,
      error_rate: 0,
      month_spend_usd: 0,
    };
  }

  const count = data.length;
  const avgLatency = count > 0 ? data.reduce((s, r) => s + (r.latency_ms ?? 0), 0) / count : 0;
  const totalCost = data.reduce((s, r) => s + (r.total_cost ?? 0), 0);
  const uniqueModels = new Set(data.map((r) => r.model_id).filter(Boolean)).size;

  return {
    total_requests: count,
    avg_latency_ms: Math.round(avgLatency),
    total_cost: Math.round(totalCost * 1000) / 1000,
    avg_feedback: avgFeedback,
    models_count: uniqueModels,
    error_rate: 0,
    month_spend_usd: 0,
  };
}

export async function getDailyTokenSeries(days = 14): Promise<DailyTokenPoint[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('superadmin_ai_usage_daily_series', {
    p_days: days,
  });

  if (error) {
    console.error('getDailyTokenSeries', error);
    return [];
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  return rows.map((r) => ({
    bucket_date: String(r.bucket_date ?? ''),
    total_tokens: bigintish(r.total_tokens),
    total_cost_usd: num(r.total_cost_usd),
  }));
}

export async function getWeeklyTokenSeries(weeks = 8): Promise<WeeklyTokenPoint[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('superadmin_ai_usage_weekly_series', {
    p_weeks: weeks,
  });

  if (error) {
    console.error('getWeeklyTokenSeries', error);
    return [];
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  return rows.map((r) => ({
    week_start: String(r.week_start ?? ''),
    total_tokens: bigintish(r.total_tokens),
    total_cost_usd: num(r.total_cost_usd),
  }));
}

export async function getVoiceQualityDaily(days = 14): Promise<VoiceQualityPoint[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('superadmin_voice_quality_daily', {
    p_days: days,
  });

  if (error) {
    console.error('getVoiceQualityDaily', error);
    return [];
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  return rows.map((r) => ({
    bucket_date: String(r.bucket_date ?? ''),
    avg_latency_ms: num(r.avg_latency_ms),
    break_proxy_rate: num(r.break_proxy_rate),
    sample_count: bigintish(r.sample_count),
  }));
}
