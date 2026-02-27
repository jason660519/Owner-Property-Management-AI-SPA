'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

export interface BehaviorLog {
  id: string;
  user_id: string | null;
  page_path: string;
  action_type: 'PAGE_VIEW' | 'CLICK' | 'FORM_SUBMIT' | 'API_CALL';
  ip_address: string | null;
  user_agent: string | null;
  is_anomaly: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface BehaviorStats {
  total_events: number;
  unique_users: number;
  unique_ips: number;
  anomaly_count: number;
  page_views: number;
  api_calls: number;
}

export interface DailyStatRow {
  stat_date: string;
  total_events: number;
  unique_users: number;
  unique_ips: number;
  anomaly_count: number;
  page_views: number;
  api_calls: number;
}

export interface BehaviorLogsFilter {
  search?: string;
  actionType?: string;
  isAnomaly?: boolean;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

/** Fetch paginated behavior logs with optional filters */
export async function getBehaviorLogs(filter: BehaviorLogsFilter = {}): Promise<{
  logs: BehaviorLog[];
  total: number;
}> {
  const supabase = createAdminClient();
  const {
    search,
    actionType,
    isAnomaly,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = filter;

  let query = supabase
    .from('behavior_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (actionType && actionType !== 'ALL') {
    query = query.eq('action_type', actionType);
  }
  if (isAnomaly !== undefined) {
    query = query.eq('is_anomaly', isAnomaly);
  }
  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }
  if (search) {
    query = query.or(`page_path.ilike.%${search}%,ip_address::text.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching behavior logs:', error);
    return { logs: [], total: 0 };
  }

  return {
    logs: (data as BehaviorLog[]) ?? [],
    total: count ?? 0,
  };
}

/** Fetch aggregate stats for the last 30 days */
export async function getBehaviorStats(): Promise<BehaviorStats> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('behavior_logs')
    .select('action_type, is_anomaly, user_id, ip_address')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  if (error || !data) {
    console.error('Error fetching behavior stats:', error);
    return {
      total_events: 0,
      unique_users: 0,
      unique_ips: 0,
      anomaly_count: 0,
      page_views: 0,
      api_calls: 0,
    };
  }

  const uniqueUsers = new Set(data.map(r => r.user_id).filter(Boolean)).size;
  const uniqueIps = new Set(data.map(r => r.ip_address).filter(Boolean)).size;

  return {
    total_events: data.length,
    unique_users: uniqueUsers,
    unique_ips: uniqueIps,
    anomaly_count: data.filter(r => r.is_anomaly).length,
    page_views: data.filter(r => r.action_type === 'PAGE_VIEW').length,
    api_calls: data.filter(r => r.action_type === 'API_CALL').length,
  };
}

/** Fetch daily stats for chart (last 30 days) */
export async function getDailyStats(): Promise<DailyStatRow[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('behavior_daily_stats')
    .select('*')
    .order('stat_date', { ascending: true });

  if (error) {
    console.error('Error fetching daily stats:', error);
    return [];
  }

  return (data as DailyStatRow[]) ?? [];
}

/** Fetch recent anomaly logs */
export async function getAnomalies(limit = 20): Promise<BehaviorLog[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('behavior_logs')
    .select('*')
    .eq('is_anomaly', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching anomalies:', error);
    return [];
  }

  return (data as BehaviorLog[]) ?? [];
}

/** Trigger anomaly detection on recent logs */
export async function runAnomalyDetection(): Promise<{ success: boolean; message: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase.rpc('detect_behavior_anomalies');

  if (error) {
    console.error('Error running anomaly detection:', error);
    return { success: false, message: error.message };
  }

  revalidatePath('/superadmin/dashboard/behavior-monitoring');
  return { success: true, message: 'Anomaly detection completed' };
}
