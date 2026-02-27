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
