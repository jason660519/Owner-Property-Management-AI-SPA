'use server';

import { createAdminClient } from '@/utils/supabase/admin';

export interface WebVital {
  id: string;
  page_path: string;
  lcp_ms: number | null;
  fid_ms: number | null;
  cls_score: number | null;
  ttfb_ms: number | null;
  fcp_ms: number | null;
  inp_ms: number | null;
  connection_type: string | null;
  device_type: 'desktop' | 'mobile' | 'tablet' | null;
  session_id: string | null;
  created_at: string;
}

export interface PageVitalSummary {
  page_path: string;
  sample_count: number;
  avg_lcp_ms: number | null;
  avg_fid_ms: number | null;
  avg_cls: number | null;
  avg_ttfb_ms: number | null;
  avg_fcp_ms: number | null;
  p75_lcp_ms: number | null;
}

export interface PerformanceOverview {
  total_samples: number;
  avg_lcp_ms: number;
  avg_cls: number;
  avg_ttfb_ms: number;
  good_lcp_pct: number;    // LCP < 2500ms
  needs_improvement_lcp_pct: number;
  poor_lcp_pct: number;
}

/** Fetch per-page summary from view */
export async function getPageVitalsSummary(): Promise<PageVitalSummary[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('web_vitals_page_summary')
    .select('*')
    .limit(50);

  if (error) {
    console.error('Error fetching page vitals summary:', error);
    return [];
  }

  return (data as PageVitalSummary[]) ?? [];
}

/** Fetch overall performance stats */
export async function getPerformanceOverview(): Promise<PerformanceOverview> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('web_vitals')
    .select('lcp_ms, cls_score, ttfb_ms')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  if (error || !data || data.length === 0) {
    return {
      total_samples: 0,
      avg_lcp_ms: 0,
      avg_cls: 0,
      avg_ttfb_ms: 0,
      good_lcp_pct: 0,
      needs_improvement_lcp_pct: 0,
      poor_lcp_pct: 0,
    };
  }

  const count = data.length;
  const avgLCP = data.reduce((s, r) => s + (r.lcp_ms ?? 0), 0) / count;
  const avgCLS = data.reduce((s, r) => s + (r.cls_score ?? 0), 0) / count;
  const avgTTFB = data.reduce((s, r) => s + (r.ttfb_ms ?? 0), 0) / count;

  const withLCP = data.filter(r => r.lcp_ms != null);
  const goodLCP = withLCP.filter(r => (r.lcp_ms ?? 0) < 2500).length;
  const niLCP = withLCP.filter(r => (r.lcp_ms ?? 0) >= 2500 && (r.lcp_ms ?? 0) < 4000).length;
  const poorLCP = withLCP.filter(r => (r.lcp_ms ?? 0) >= 4000).length;
  const lcpTotal = withLCP.length || 1;

  return {
    total_samples: count,
    avg_lcp_ms: Math.round(avgLCP),
    avg_cls: Math.round(avgCLS * 1000) / 1000,
    avg_ttfb_ms: Math.round(avgTTFB),
    good_lcp_pct: Math.round((goodLCP / lcpTotal) * 100),
    needs_improvement_lcp_pct: Math.round((niLCP / lcpTotal) * 100),
    poor_lcp_pct: Math.round((poorLCP / lcpTotal) * 100),
  };
}

/** Fetch recent vitals records */
export async function getRecentVitals(limit = 50): Promise<WebVital[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('web_vitals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent vitals:', error);
    return [];
  }

  return (data as WebVital[]) ?? [];
}

export interface ApiLatency {
  endpoint: string;
  method: string;
  avg_latency: number;
  max_latency: number;
  p95_latency: number;
  call_count: number;
}

/** Fetch Top 10 slowest API endpoints */
export async function getTopApiLatencies(): Promise<ApiLatency[]> {
  const supabase = createAdminClient();

  // We query perf_metrics and group by endpoint/method
  // In a real scenario, we might use a View or a more complex SQL query via RPC.
  // For now, we'll fetch the raw metrics and group in JS (or use a simple select if volume is low).
  const { data, error } = await supabase
    .from('perf_metrics')
    .select('*')
    .eq('metric_type', 'api_response_time')
    .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('value', { ascending: false });

  if (error || !data) {
    console.error('Error fetching API latencies:', error);
    return [];
  }

  interface LatencyGroup {
    endpoint: string;
    method: string;
    values: number[];
  }
  const groups: Record<string, LatencyGroup> = {};
  data.forEach((m) => {
    const endpoint = m.tags?.endpoint || m.metric_name;
    const method = m.tags?.method || 'UNKNOWN';
    const key = `${method} ${endpoint}`;

    if (!groups[key]) {
      groups[key] = {
        endpoint,
        method,
        values: [],
      };
    }
    groups[key].values.push(Number(m.value));
  });

  const result: ApiLatency[] = Object.values(groups).map((g) => {
    const sorted = [...g.values].sort((a, b) => a - b);
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const p95Idx = Math.floor(sorted.length * 0.95);
    
    return {
      endpoint: g.endpoint,
      method: g.method,
      avg_latency: Math.round(avg),
      max_latency: sorted[sorted.length - 1],
      p95_latency: sorted[p95Idx],
      call_count: sorted.length,
    };
  });

  return result.sort((a, b) => b.avg_latency - a.avg_latency).slice(0, 10);
}

export interface DbSlowQuery {
  query: string;
  calls: number;
  total_time: number;
  avg_time: number;
}

/** Fetch Top 10 slowest DB queries via pg_stat_statements */
export async function getSlowQueries(): Promise<DbSlowQuery[]> {
  const supabase = createAdminClient();

  // In Supabase, we usually need an RPC to query pg_stat_statements because it's in the 'extensions' or 'pg_catalog' schema
  // and not directly accessible via PostgREST unless exposed.
  // For now, we'll try to use a simple query or fallback to empty.
  const { data, error } = await supabase.rpc('get_slow_queries');

  if (error) {
    // If RPC doesn't exist, return empty or mock for now
    console.warn('RPC get_slow_queries not found, using empty result.');
    return [];
  }

  return (data as DbSlowQuery[]) ?? [];
}
