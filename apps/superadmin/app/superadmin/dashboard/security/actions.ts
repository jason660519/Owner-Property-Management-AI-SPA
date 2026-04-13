'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  resource_table: string | null;
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  severity: string | null;
  status: string | null;
  created_at: string;
}

export interface AuditStats {
  total_events: number;
  failed_events: number;
  blocked_events: number;
  high_severity_events: number;
}

export interface LoginAnomaly {
  id: string;
  user_id: string | null;
  email: string | null;
  ip_address: string | null;
  anomaly_type: string;
  severity: string;
  details: Record<string, unknown>;
  is_resolved: boolean;
  created_at: string;
}

export interface SslCertificate {
  id: string;
  domain: string;
  subject: string | null;
  issuer: string | null;
  valid_from: string | null;
  valid_until: string | null;
  days_remaining: number | null;
  status: string;
  error_message: string | null;
  last_checked_at: string;
}

export interface IpWhitelistEntry {
  id: string;
  ip_value: string;
  label: string | null;
  created_at: string;
}

export interface IpBlacklistEntry {
  id: string;
  type: string;
  value: string;
  reason: string | null;
  created_at: string;
}

export interface SecuritySummary {
  totalAuditEvents: number;
  failedLoginAttempts: number;
  openAnomalies: number;
  expiringCerts: number;
  blacklistedEntries: number;
  whitelistedIps: number;
}

// ── Audit Logs ────────────────────────────────────────────────────────────────

export async function getAuditStats(): Promise<AuditStats> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('audit_logs')
    .select('status, severity')
    .gte('created_at', since);

  if (error || !data) {
    return { total_events: 0, failed_events: 0, blocked_events: 0, high_severity_events: 0 };
  }

  return {
    total_events: data.length,
    failed_events: data.filter((r) => r.status === 'failed').length,
    blocked_events: data.filter((r) => r.status === 'blocked').length,
    high_severity_events: data.filter((r) =>
      ['warning', 'error', 'critical'].includes(r.severity ?? '')
    ).length,
  };
}

export async function getRecentAuditLogs(limit = 50): Promise<AuditLogEntry[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, user_id, action, resource_table, resource_id, ip_address, user_agent, severity, status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as AuditLogEntry[];
}

// ── Login Anomalies ───────────────────────────────────────────────────────────

export async function getLoginAnomalies(resolvedOnly = false): Promise<LoginAnomaly[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from('login_anomalies')
    .select('id, user_id, email, ip_address, anomaly_type, severity, details, is_resolved, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (!resolvedOnly) {
    query = query.eq('is_resolved', false);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as LoginAnomaly[];
}

export async function runAnomalyDetection(): Promise<{ message: string; count: number }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('detect_login_anomalies');
  if (error) {
    return { message: `偵測失敗: ${error.message}`, count: 0 };
  }
  const count = Number(data ?? 0);
  revalidatePath('/superadmin/dashboard/security');
  return {
    message: count > 0 ? `偵測到 ${count} 個異常登入事件` : '未發現新的異常登入',
    count,
  };
}

export async function resolveAnomaly(id: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from('login_anomalies')
    .update({ is_resolved: true, resolved_at: new Date().toISOString() })
    .eq('id', id);
  revalidatePath('/superadmin/dashboard/security');
}

// ── SSL Certificates ──────────────────────────────────────────────────────────

export async function getSslCertificates(): Promise<SslCertificate[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ssl_certificates')
    .select('*')
    .order('status', { ascending: true })
    .order('valid_until', { ascending: true });

  if (error || !data) return [];
  return data as SslCertificate[];
}

// ── IP Whitelist ──────────────────────────────────────────────────────────────

export async function getIpWhitelist(): Promise<IpWhitelistEntry[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ip_whitelist')
    .select('id, ip_value, label, created_at')
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as IpWhitelistEntry[];
}

export async function addIpToWhitelist(ip: string, label?: string): Promise<{ error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('ip_whitelist')
    .insert({ ip_value: ip.trim(), label: label?.trim() || null });
  if (error) return { error: error.message };
  revalidatePath('/superadmin/dashboard/security');
  return {};
}

export async function removeIpFromWhitelist(id: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from('ip_whitelist').delete().eq('id', id);
  revalidatePath('/superadmin/dashboard/security');
}

// ── IP Blacklist ──────────────────────────────────────────────────────────────

export async function getIpBlacklist(): Promise<IpBlacklistEntry[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('superadmin_blacklist')
    .select('id, type, value, reason, created_at')
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as IpBlacklistEntry[];
}

export async function addToBlacklist(
  type: 'ip' | 'user_agent',
  value: string,
  reason?: string
): Promise<{ error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('superadmin_blacklist')
    .insert({ type, value: value.trim(), reason: reason?.trim() || null });
  if (error) return { error: error.message };
  revalidatePath('/superadmin/dashboard/security');
  return {};
}

export async function removeFromBlacklist(id: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from('superadmin_blacklist').delete().eq('id', id);
  revalidatePath('/superadmin/dashboard/security');
}

// ── Security Summary ──────────────────────────────────────────────────────────

export async function getSecuritySummary(): Promise<SecuritySummary> {
  const supabase = createAdminClient();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [auditRes, anomalyRes, certRes, blacklistRes, whitelistRes] = await Promise.all([
    supabase
      .from('audit_logs')
      .select('status', { count: 'exact', head: false })
      .gte('created_at', since7d),
    supabase
      .from('login_anomalies')
      .select('id', { count: 'exact', head: true })
      .eq('is_resolved', false),
    supabase
      .from('ssl_certificates')
      .select('id', { count: 'exact', head: true })
      .in('status', ['expiring_soon', 'expired']),
    supabase
      .from('superadmin_blacklist')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('ip_whitelist')
      .select('id', { count: 'exact', head: true }),
  ]);

  const auditData = auditRes.data ?? [];
  const failedLogins = auditData.filter((r) => r.status === 'failed').length;

  return {
    totalAuditEvents: auditData.length,
    failedLoginAttempts: failedLogins,
    openAnomalies: anomalyRes.count ?? 0,
    expiringCerts: certRes.count ?? 0,
    blacklistedEntries: blacklistRes.count ?? 0,
    whitelistedIps: whitelistRes.count ?? 0,
  };
}
