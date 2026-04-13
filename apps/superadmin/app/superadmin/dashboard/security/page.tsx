import { Suspense } from 'react';
import { Shield } from 'lucide-react';
import {
  getSecuritySummary,
  getRecentAuditLogs,
  getLoginAnomalies,
  getSslCertificates,
  getIpWhitelist,
  getIpBlacklist,
} from './actions';
import SecurityDashboardClient from './components/SecurityDashboardClient';

export const dynamic = 'force-dynamic';

export default async function SecurityDashboardPage() {
  const [summary, auditLogs, anomalies, sslCerts, whitelist, blacklist] = await Promise.all([
    getSecuritySummary(),
    getRecentAuditLogs(50),
    getLoginAnomalies(false),
    getSslCertificates(),
    getIpWhitelist(),
    getIpBlacklist(),
  ]);

  return (
    <Suspense
      fallback={
        <div className="p-8 min-h-screen bg-[#1A1A1A] flex items-center justify-center">
          <div className="flex items-center gap-3 text-gray-400">
            <Shield className="w-5 h-5 animate-pulse" />
            載入安全儀表板...
          </div>
        </div>
      }
    >
      <SecurityDashboardClient
        summary={summary}
        auditLogs={auditLogs}
        anomalies={anomalies}
        sslCerts={sslCerts}
        whitelist={whitelist}
        blacklist={blacklist}
      />
    </Suspense>
  );
}
