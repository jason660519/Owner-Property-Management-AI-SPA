import { Suspense } from 'react';
import { getBehaviorStats, getDailyStats, getBehaviorLogs } from './actions';
import BehaviorMonitoringClient from './components/BehaviorMonitoringClient';
import { Activity } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function BehaviorMonitoringPage() {
  const [stats, dailyStats, logsResult] = await Promise.all([
    getBehaviorStats(),
    getDailyStats(),
    getBehaviorLogs({ limit: 50 }),
  ]);

  return (
    <Suspense
      fallback={
        <div className="p-8 min-h-screen bg-[#1A1A1A] flex items-center justify-center">
          <div className="flex items-center gap-3 text-gray-400">
            <Activity className="w-5 h-5 animate-pulse" />
            載入行為監控資料...
          </div>
        </div>
      }
    >
      <BehaviorMonitoringClient
        stats={stats}
        dailyStats={dailyStats}
        initialLogs={logsResult.logs}
        initialTotal={logsResult.total}
      />
    </Suspense>
  );
}
