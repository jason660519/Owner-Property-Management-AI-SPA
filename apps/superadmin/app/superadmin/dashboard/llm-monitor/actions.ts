'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminClient } from '@/utils/supabase/admin';

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
  const supabase = createAdminClient();
  const since = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

  const { data, error } = await supabase.rpc('superadmin_ai_usage_by_model_since', {
    p_since: since,
  });

  if (error) {
    console.error('getLLMAggregateStats rpc', error);
    return await legacyAggregateFromPerformanceMetrics();
  }

  const rows = (data ?? []) as Record<string, unknown>[];

  return rows.map((row) => {
    const provider = String(row.provider ?? '');
    const modelId = String(row.model_id ?? '');
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
    };
  });
}

/** Fallback if RPC not migrated yet */
async function legacyAggregateFromPerformanceMetrics(): Promise<LLMAggregateStat[]> {
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
    };
  });
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
