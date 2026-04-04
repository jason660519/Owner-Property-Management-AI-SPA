'use server';

import { createAdminClient } from '@/utils/supabase/admin';

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
  model_id: string;
  total_requests: number;
  avg_latency_ms: number;
  avg_prompt_tokens: number;
  avg_completion_tokens: number;
  total_cost: number;
  avg_feedback: number;
}

export interface LLMOverallStats {
  total_requests: number;
  avg_latency_ms: number;
  total_cost: number;
  avg_feedback: number;
  models_count: number;
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

/** Fetch recent LLM metrics (last 200 rows) */
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

/** Aggregate stats per model */
export async function getLLMAggregateStats(): Promise<LLMAggregateStat[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('ai_performance_metrics')
    .select('model_id, latency_ms, prompt_tokens, completion_tokens, total_cost, user_feedback_score')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  if (error || !data) {
    console.error('Error fetching LLM aggregate stats:', error);
    return [];
  }

  // Group by model_id
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
    const feedbackRows = rows.filter(r => r.user_feedback_score !== null);
    const avgFeedback =
      feedbackRows.length > 0
        ? feedbackRows.reduce((s, r) => s + (r.user_feedback_score ?? 0), 0) / feedbackRows.length
        : 0;

    return {
      model_id,
      total_requests: count,
      avg_latency_ms: Math.round(avgLatency),
      avg_prompt_tokens: Math.round(avgPrompt),
      avg_completion_tokens: Math.round(avgCompletion),
      total_cost: Math.round(totalCost * 1000) / 1000,
      avg_feedback: Math.round(avgFeedback * 10) / 10,
    };
  });
}

/** Overall stats */
export async function getLLMOverallStats(): Promise<LLMOverallStats> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('ai_performance_metrics')
    .select('latency_ms, total_cost, user_feedback_score, model_id')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  if (error || !data) {
    return { total_requests: 0, avg_latency_ms: 0, total_cost: 0, avg_feedback: 0, models_count: 0 };
  }

  const count = data.length;
  const avgLatency = count > 0 ? data.reduce((s, r) => s + (r.latency_ms ?? 0), 0) / count : 0;
  const totalCost = data.reduce((s, r) => s + (r.total_cost ?? 0), 0);
  const feedbackRows = data.filter(r => r.user_feedback_score !== null);
  const avgFeedback =
    feedbackRows.length > 0
      ? feedbackRows.reduce((s, r) => s + (r.user_feedback_score ?? 0), 0) / feedbackRows.length
      : 0;
  const uniqueModels = new Set(data.map(r => r.model_id).filter(Boolean)).size;

  return {
    total_requests: count,
    avg_latency_ms: Math.round(avgLatency),
    total_cost: Math.round(totalCost * 1000) / 1000,
    avg_feedback: Math.round(avgFeedback * 10) / 10,
    models_count: uniqueModels,
  };
}
