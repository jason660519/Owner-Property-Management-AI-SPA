'use client';

import { useState, useTransition } from 'react';
import {
  Shield,
  AlertTriangle,
  Lock,
  Unlock,
  Globe,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  FileDown,
} from 'lucide-react';
import {
  runAnomalyDetection,
  resolveAnomaly,
  addIpToWhitelist,
  removeIpFromWhitelist,
  addToBlacklist,
  removeFromBlacklist,
  type SecuritySummary,
  type AuditLogEntry,
  type LoginAnomaly,
  type SslCertificate,
  type IpWhitelistEntry,
  type IpBlacklistEntry,
} from '../actions';

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-[#242424] rounded-xl p-5 border border-white/5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400">{title}</span>
        <span className={`${color}`}>{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</p>
    </div>
  );
}

// ── Severity badge ────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    info: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  const cls = map[severity] ?? 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${cls} font-medium`}>
      {severity}
    </span>
  );
}

// ── SSL status badge ──────────────────────────────────────────────────────────

function SslStatusBadge({ status, days }: { status: string; days: number | null }) {
  const map: Record<string, string> = {
    valid: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    expiring_soon: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    expired: 'bg-red-500/20 text-red-400 border-red-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
    unknown: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  const cls = map[status] ?? 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${cls} font-medium`}>
      {status === 'valid' && days !== null ? `有效 (${days}天)` : status}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  summary: SecuritySummary;
  auditLogs: AuditLogEntry[];
  anomalies: LoginAnomaly[];
  sslCerts: SslCertificate[];
  whitelist: IpWhitelistEntry[];
  blacklist: IpBlacklistEntry[];
}

type Tab = 'audit' | 'anomalies' | 'ssl' | 'iplist';

export default function SecurityDashboardClient({
  summary: initialSummary,
  auditLogs,
  anomalies: initialAnomalies,
  sslCerts,
  whitelist: initialWhitelist,
  blacklist: initialBlacklist,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('audit');
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [anomalies, setAnomalies] = useState(initialAnomalies);
  const [whitelist, setWhitelist] = useState(initialWhitelist);
  const [blacklist, setBlacklist] = useState(initialBlacklist);

  // Whitelist form
  const [wlIp, setWlIp] = useState('');
  const [wlLabel, setWlLabel] = useState('');
  // Blacklist form
  const [blType, setBlType] = useState<'ip' | 'user_agent'>('ip');
  const [blValue, setBlValue] = useState('');
  const [blReason, setBlReason] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleRunDetection = () => {
    startTransition(() => {
      void runAnomalyDetection().then((result) => {
        showToast(result.message);
      });
    });
  };

  const handleGenerateComplianceReport = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
    const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><title>個資保護合規報告 ${dateStr}</title>
<style>
  body{font-family:sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#333}
  h1{color:#1a1a1a;border-bottom:2px solid #7C3AED;padding-bottom:8px}
  h2{color:#4a4a4a;margin-top:32px;border-left:4px solid #7C3AED;padding-left:12px}
  table{border-collapse:collapse;width:100%;margin:16px 0}
  th,td{text-align:left;padding:8px 12px;border:1px solid #ddd}
  th{background:#f5f5f5}
  .badge-ok{color:#16a34a;font-weight:bold}
  .badge-warn{color:#d97706;font-weight:bold}
  .footer{margin-top:48px;color:#999;font-size:12px;border-top:1px solid #eee;padding-top:16px}
</style></head>
<body>
<h1>🔒 個資保護合規報告（PDPA / GDPR）</h1>
<p><strong>產生日期：</strong>${dateStr}</p>
<p><strong>平台名稱：</strong>Owner AI 不動產管理平台</p>

<h2>1. 資料收集範疇</h2>
<table>
  <tr><th>資料類別</th><th>用途</th><th>保護機制</th></tr>
  <tr><td>姓名、Email、電話</td><td>帳號管理、聯絡</td><td>RLS 使用者隔離</td></tr>
  <tr><td>物件資訊、地址</td><td>物件管理、媒合</td><td>RLS 擁有者隔離</td></tr>
  <tr><td>租賃/買賣合約資料</td><td>交易協作</td><td>加密儲存、RLS 多角色</td></tr>
  <tr><td>登入記錄、稽核日誌</td><td>安全審計</td><td>唯讀，30天保留</td></tr>
</table>

<h2>2. 存取控制現況</h2>
<table>
  <tr><th>項目</th><th>狀態</th><th>數量</th></tr>
  <tr><td>稽核事件（7天）</td><td class="badge-ok">✅ 啟用</td><td>${initialSummary.totalAuditEvents}</td></tr>
  <tr><td>失敗登入嘗試（7天）</td><td class="badge-ok">✅ 記錄中</td><td>${initialSummary.failedLoginAttempts} 筆</td></tr>
  <tr><td>未解決異常</td><td class="${initialSummary.openAnomalies > 0 ? 'badge-warn' : 'badge-ok'}">${initialSummary.openAnomalies > 0 ? '⚠️ 待處理' : '✅ 無異常'}</td><td>${initialSummary.openAnomalies} 筆</td></tr>
  <tr><td>IP 白名單</td><td class="${whitelist.length > 0 ? 'badge-ok' : 'badge-warn'}">${whitelist.length > 0 ? '✅ 已設定' : '⚠️ 未設定'}</td><td>${whitelist.length} 筆</td></tr>
  <tr><td>IP 黑名單</td><td class="badge-ok">✅ 啟用</td><td>${blacklist.length} 筆封鎖</td></tr>
  <tr><td>SSL 憑證監控</td><td class="badge-ok">✅ 啟用</td><td>${sslCerts.length} 份憑證（即將到期：${initialSummary.expiringCerts}）</td></tr>
</table>

<h2>3. 安全事件摘要（最近 7 天）</h2>
<table>
  <tr><th>分類</th><th>數量</th></tr>
  <tr><td>失敗登入嘗試</td><td>${initialSummary.failedLoginAttempts}</td></tr>
  <tr><td>未解決異常</td><td>${initialSummary.openAnomalies}</td></tr>
  <tr><td>SSL 即將到期</td><td>${initialSummary.expiringCerts}</td></tr>
  <tr><td>IP 黑名單</td><td>${initialSummary.blacklistedEntries}</td></tr>
</table>

<h2>4. 法規遵循聲明</h2>
<ul>
  <li>所有資料表已啟用 Row Level Security（RLS），確保使用者僅能存取授權範圍內的資料。</li>
  <li>管理員操作均透過 Service Role 執行並留有稽核紀錄。</li>
  <li>使用者密碼由 Supabase Auth 以業界標準加密儲存，平台端無法讀取明文密碼。</li>
  <li>個資資料存放於台灣/澳洲地區資料中心，符合在地化要求。</li>
  <li>使用者可依 PDPA 第 10 條申請資料查閱、修正或刪除，聯絡窗口：support@ownerai.com.tw</li>
</ul>

<h2>5. 待改善項目</h2>
<ul>
  ${initialSummary.openAnomalies > 0 ? `<li>⚠️ 有 ${initialSummary.openAnomalies} 筆未解決異常需跟進</li>` : '<li>✅ 無待處理異常</li>'}
  ${whitelist.length === 0 ? '<li>⚠️ 建議設定 IP 白名單以限制管理員存取來源</li>' : ''}
  ${sslCerts.some(c => c.status === 'expiring_soon') ? '<li>⚠️ 部分 SSL 憑證即將到期，請儘速更新</li>' : ''}
</ul>

<div class="footer">
  此報告由 Owner AI 超級管理員安全儀表板自動產生，供內部合規審查使用。<br/>
  產生時間：${now.toISOString()}
</div>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${now.toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('合規報告已下載');
  };

  const handleResolveAnomaly = (id: string) => {
    startTransition(() => {
      void resolveAnomaly(id).then(() => {
        setAnomalies((prev) => prev.filter((a) => a.id !== id));
        showToast('已標記為已處理');
      });
    });
  };

  const handleAddWhitelist = () => {
    if (!wlIp.trim()) return;
    const ip = wlIp.trim();
    const label = wlLabel;
    startTransition(() => {
      void addIpToWhitelist(ip, label).then((res) => {
        if (res.error) {
          showToast(`錯誤: ${res.error}`);
          return;
        }
        setWlIp('');
        setWlLabel('');
        showToast(`已加入白名單: ${ip}`);
      });
    });
  };

  const handleRemoveWhitelist = (id: string, ip: string) => {
    startTransition(() => {
      void removeIpFromWhitelist(id).then(() => {
        setWhitelist((prev) => prev.filter((e) => e.id !== id));
        showToast(`已移除白名單: ${ip}`);
      });
    });
  };

  const handleAddBlacklist = () => {
    if (!blValue.trim()) return;
    const type = blType;
    const value = blValue.trim();
    const reason = blReason;
    startTransition(() => {
      void addToBlacklist(type, value, reason).then((res) => {
        if (res.error) {
          showToast(`錯誤: ${res.error}`);
          return;
        }
        setBlValue('');
        setBlReason('');
        showToast(`已加入黑名單: ${value}`);
      });
    });
  };

  const handleRemoveBlacklist = (id: string, value: string) => {
    startTransition(() => {
      void removeFromBlacklist(id).then(() => {
        setBlacklist((prev) => prev.filter((e) => e.id !== id));
        showToast(`已移除黑名單: ${value}`);
      });
    });
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'audit', label: '稽核日誌' },
    { id: 'anomalies', label: `異常登入 (${anomalies.length})` },
    { id: 'ssl', label: `SSL 憑證 (${sslCerts.length})` },
    { id: 'iplist', label: 'IP 白/黑名單' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-[#1A1A1A] min-h-screen text-white">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500/90 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Shield className="h-7 w-7 text-blue-400" />
            網路安全 ／ 隱私審計管理
          </h1>
          <p className="text-gray-400 mt-1 text-sm">資料存取稽核・異常偵測・IP 管控・SSL 監控</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateComplianceReport}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-sm font-medium transition-colors"
          >
            <FileDown className="h-4 w-4" />
            生成合規報告
          </button>
          <button
            onClick={handleRunDetection}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
            執行異常偵測
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="稽核事件 (7天)"
          value={initialSummary.totalAuditEvents}
          icon={<Eye className="h-5 w-5" />}
          color="text-blue-400"
        />
        <StatCard
          title="登入失敗"
          value={initialSummary.failedLoginAttempts}
          icon={<XCircle className="h-5 w-5" />}
          color="text-red-400"
        />
        <StatCard
          title="未處理異常"
          value={initialSummary.openAnomalies}
          icon={<AlertTriangle className="h-5 w-5" />}
          color={initialSummary.openAnomalies > 0 ? 'text-orange-400' : 'text-gray-400'}
        />
        <StatCard
          title="即將到期 SSL"
          value={initialSummary.expiringCerts}
          icon={<Lock className="h-5 w-5" />}
          color={initialSummary.expiringCerts > 0 ? 'text-yellow-400' : 'text-gray-400'}
        />
        <StatCard
          title="黑名單項目"
          value={initialSummary.blacklistedEntries}
          icon={<Unlock className="h-5 w-5" />}
          color="text-red-400"
        />
        <StatCard
          title="白名單 IP"
          value={initialSummary.whitelistedIps}
          icon={<Globe className="h-5 w-5" />}
          color="text-emerald-400"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-[#242424] rounded-xl border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/5 flex justify-between items-center">
            <h2 className="font-semibold">資料存取稽核日誌（最近 50 筆）</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-gray-400">
                  <th className="text-left px-4 py-3">時間</th>
                  <th className="text-left px-4 py-3">動作</th>
                  <th className="text-left px-4 py-3">資源</th>
                  <th className="text-left px-4 py-3">IP</th>
                  <th className="text-left px-4 py-3">嚴重程度</th>
                  <th className="text-left px-4 py-3">狀態</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      尚無稽核記錄
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="border-b border-white/5 hover:bg-white/3">
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('zh-TW')}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{log.action}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {log.resource_table}
                        {log.resource_id ? ` #${log.resource_id.slice(0, 8)}` : ''}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">
                        {log.ip_address ?? '–'}
                      </td>
                      <td className="px-4 py-3">
                        <SeverityBadge severity={log.severity ?? 'info'} />
                      </td>
                      <td className="px-4 py-3">
                        <SeverityBadge severity={log.status ?? 'success'} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Login Anomalies */}
      {activeTab === 'anomalies' && (
        <div className="bg-[#242424] rounded-xl border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/5 flex justify-between items-center">
            <h2 className="font-semibold">自動偵測異常登入行為</h2>
            <button
              onClick={handleRunDetection}
              disabled={isPending}
              className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
              重新偵測
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-gray-400">
                  <th className="text-left px-4 py-3">時間</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">IP</th>
                  <th className="text-left px-4 py-3">異常類型</th>
                  <th className="text-left px-4 py-3">嚴重程度</th>
                  <th className="text-left px-4 py-3">細節</th>
                  <th className="text-left px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500/50" />
                      目前無未處理的異常登入事件
                    </td>
                  </tr>
                ) : (
                  anomalies.map((a) => (
                    <tr key={a.id} className="border-b border-white/5 hover:bg-white/3">
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                        {new Date(a.created_at).toLocaleString('zh-TW')}
                      </td>
                      <td className="px-4 py-3 text-xs">{a.email ?? '–'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">
                        {a.ip_address ?? '–'}
                      </td>
                      <td className="px-4 py-3 text-xs text-orange-300">{a.anomaly_type}</td>
                      <td className="px-4 py-3">
                        <SeverityBadge severity={a.severity} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 max-w-[200px] truncate">
                        {JSON.stringify(a.details)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleResolveAnomaly(a.id)}
                          disabled={isPending}
                          className="text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                        >
                          標記處理
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: SSL Certificates */}
      {activeTab === 'ssl' && (
        <div className="space-y-4">
          <div className="bg-[#242424] rounded-xl border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5 flex justify-between items-center">
              <h2 className="font-semibold">SSL 憑證到期監控</h2>
              <span className="text-xs text-gray-500">由 scripts/ssl-cert-monitor.js 每日更新</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-gray-400">
                    <th className="text-left px-4 py-3">網域</th>
                    <th className="text-left px-4 py-3">狀態</th>
                    <th className="text-left px-4 py-3">到期日</th>
                    <th className="text-left px-4 py-3">頒發機構</th>
                    <th className="text-left px-4 py-3">最後檢查</th>
                  </tr>
                </thead>
                <tbody>
                  {sslCerts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-500">
                        尚無 SSL 憑證記錄。請設定 SSL_MONITOR_DOMAINS 環境變數後執行 cron job。
                      </td>
                    </tr>
                  ) : (
                    sslCerts.map((cert) => (
                      <tr key={cert.id} className="border-b border-white/5 hover:bg-white/3">
                        <td className="px-4 py-3 font-mono text-sm">{cert.domain}</td>
                        <td className="px-4 py-3">
                          <SslStatusBadge status={cert.status} days={cert.days_remaining} />
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {cert.valid_until
                            ? new Date(cert.valid_until).toLocaleDateString('zh-TW')
                            : '–'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 max-w-[200px] truncate">
                          {cert.issuer ?? '–'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(cert.last_checked_at).toLocaleString('zh-TW')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Alert box for expiring */}
          {sslCerts.some((c) => c.status === 'expiring_soon' || c.status === 'expired') && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-400 font-medium text-sm">SSL 憑證即將到期警示</p>
                <p className="text-gray-400 text-sm mt-1">
                  請盡快更新以下憑證：{' '}
                  {sslCerts
                    .filter((c) => c.status === 'expiring_soon' || c.status === 'expired')
                    .map((c) => c.domain)
                    .join(', ')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: IP Whitelist + Blacklist */}
      {activeTab === 'iplist' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Whitelist */}
          <div className="bg-[#242424] rounded-xl border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <h2 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                IP 白名單
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                非空時，僅白名單內的 IP 可存取 superadmin
              </p>
            </div>

            {/* Add form */}
            <div className="p-4 border-b border-white/5 space-y-2">
              <input
                type="text"
                value={wlIp}
                onChange={(e) => setWlIp(e.target.value)}
                placeholder="IP 位址或 CIDR（如 192.168.1.0/24）"
                className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={wlLabel}
                  onChange={(e) => setWlLabel(e.target.value)}
                  placeholder="標籤（選填，如 Office）"
                  className="flex-1 bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
                />
                <button
                  onClick={handleAddWhitelist}
                  disabled={isPending || !wlIp.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg text-sm font-medium"
                >
                  <Plus className="h-4 w-4" />
                  加入
                </button>
              </div>
            </div>

            {/* List */}
            <ul className="divide-y divide-white/5 max-h-80 overflow-y-auto">
              {whitelist.length === 0 ? (
                <li className="text-center py-6 text-gray-500 text-sm">白名單為空（所有 IP 均允許）</li>
              ) : (
                whitelist.map((e) => (
                  <li key={e.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <span className="font-mono text-sm">{e.ip_value}</span>
                      {e.label && <span className="ml-2 text-xs text-gray-500">{e.label}</span>}
                    </div>
                    <button
                      onClick={() => handleRemoveWhitelist(e.id, e.ip_value)}
                      disabled={isPending}
                      className="text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Blacklist */}
          <div className="bg-[#242424] rounded-xl border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <h2 className="font-semibold flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-400" />
                IP / User-Agent 黑名單
              </h2>
              <p className="text-xs text-gray-500 mt-1">黑名單中的 IP 或 UA 直接返回 403</p>
            </div>

            {/* Add form */}
            <div className="p-4 border-b border-white/5 space-y-2">
              <div className="flex gap-2">
                <select
                  value={blType}
                  onChange={(e) => setBlType(e.target.value as 'ip' | 'user_agent')}
                  className="bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                >
                  <option value="ip">IP</option>
                  <option value="user_agent">User-Agent</option>
                </select>
                <input
                  type="text"
                  value={blValue}
                  onChange={(e) => setBlValue(e.target.value)}
                  placeholder="值（IP/CIDR 或 UA 子字串）"
                  className="flex-1 bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={blReason}
                  onChange={(e) => setBlReason(e.target.value)}
                  placeholder="封鎖原因（選填）"
                  className="flex-1 bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50"
                />
                <button
                  onClick={handleAddBlacklist}
                  disabled={isPending || !blValue.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-sm font-medium"
                >
                  <Plus className="h-4 w-4" />
                  加入
                </button>
              </div>
            </div>

            {/* List */}
            <ul className="divide-y divide-white/5 max-h-80 overflow-y-auto">
              {blacklist.length === 0 ? (
                <li className="text-center py-6 text-gray-500 text-sm">黑名單為空</li>
              ) : (
                blacklist.map((e) => (
                  <li key={e.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <span className="text-xs text-gray-500 mr-1.5">[{e.type}]</span>
                      <span className="font-mono text-sm">{e.value}</span>
                      {e.reason && (
                        <span className="ml-2 text-xs text-gray-500">{e.reason}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveBlacklist(e.id, e.value)}
                      disabled={isPending}
                      className="text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
