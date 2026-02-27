import { Suspense } from 'react';
import { getPerformanceOverview, getPageVitalsSummary, getRecentVitals } from './actions';
import PerformanceMonitorClient from './PerformanceMonitorClient';
import { Gauge } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PerformancePage() {
  const [overview, pageSummaries, recentVitals] = await Promise.all([
    getPerformanceOverview(),
    getPageVitalsSummary(),
    getRecentVitals(50),
  ]);

  return (
    <Suspense
      fallback={
        <div className="p-8 min-h-screen bg-[#1A1A1A] flex items-center justify-center">
          <div className="flex items-center gap-3 text-gray-400">
            <Gauge className="w-5 h-5 animate-pulse" />
            載入效能監控資料...
          </div>
        </div>
      }
    >
      <PerformanceMonitorClient
        overview={overview}
        pageSummaries={pageSummaries}
        recentVitals={recentVitals}
      />
    </Suspense>
  );
}
