import { Suspense } from 'react';
import {
  getAIUsageLogs,
  getLLMOverallStats,
  getLLMAggregateStats,
  getLLMMonitorConfig,
  getDailyTokenSeries,
  getWeeklyTokenSeries,
  getVoiceQualityDaily,
} from './actions';
import LLMMonitorClient from './LLMMonitorClient';
import { Brain } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function LLMMonitorPage() {
  const [
    overallStats,
    aggregateStats,
    usageLogs,
    monitorConfig,
    dailyTokenSeries,
    weeklyTokenSeries,
    voiceQualitySeries,
  ] = await Promise.all([
    getLLMOverallStats(),
    getLLMAggregateStats(),
    getAIUsageLogs(100),
    getLLMMonitorConfig(),
    getDailyTokenSeries(14),
    getWeeklyTokenSeries(8),
    getVoiceQualityDaily(14),
  ]);

  return (
    <Suspense
      fallback={
        <div className="p-8 min-h-screen bg-[#1A1A1A] flex items-center justify-center">
          <div className="flex items-center gap-3 text-gray-400">
            <Brain className="w-5 h-5 animate-pulse" />
            載入 AI LLM 效能資料...
          </div>
        </div>
      }
    >
      <LLMMonitorClient
        overallStats={overallStats}
        aggregateStats={aggregateStats}
        usageLogs={usageLogs}
        monitorConfig={monitorConfig}
        dailyTokenSeries={dailyTokenSeries}
        weeklyTokenSeries={weeklyTokenSeries}
        voiceQualitySeries={voiceQualitySeries}
      />
    </Suspense>
  );
}
