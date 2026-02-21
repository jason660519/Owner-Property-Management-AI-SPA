'use client';

import { useState, useTransition } from 'react';
import { Activity, Clock, RefreshCw, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import BehaviorStatsCards from './BehaviorStatsCards';
import BehaviorChart from './BehaviorChart';
import BehaviorLogsTable from './BehaviorLogsTable';
import { runAnomalyDetection } from '../actions';
import type { BehaviorStats, DailyStatRow, BehaviorLog } from '../actions';

interface BehaviorMonitoringClientProps {
  stats: BehaviorStats;
  dailyStats: DailyStatRow[];
  initialLogs: BehaviorLog[];
  initialTotal: number;
}

export default function BehaviorMonitoringClient({
  stats,
  dailyStats,
  initialLogs,
  initialTotal,
}: BehaviorMonitoringClientProps) {
  const [lastUpdated] = useState(new Date());
  const [isPending, startTransition] = useTransition();
  const [detectionMessage, setDetectionMessage] = useState<string | null>(null);

  const handleRunDetection = () => {
    startTransition(async () => {
      const result = await runAnomalyDetection();
      setDetectionMessage(result.message);
      setTimeout(() => setDetectionMessage(null), 4000);
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-[#1A1A1A] min-h-screen text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Activity className="h-7 w-7 text-blue-400" />
            網站行為監控
          </h1>
          <p className="text-gray-400 mt-1 flex items-center gap-2 text-sm">
            <Clock className="h-3.5 w-3.5" />
            最後更新: {lastUpdated.toLocaleTimeString('zh-TW')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {detectionMessage && (
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              {detectionMessage}
            </span>
          )}
          <Button
            variant="outline"
            onClick={handleRunDetection}
            disabled={isPending}
            className="border-[#333333] text-gray-300 hover:text-white"
          >
            <Shield className={`h-4 w-4 mr-2 ${isPending ? 'animate-pulse' : ''}`} />
            執行異常偵測
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="border-[#333333] text-gray-300 hover:text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <BehaviorStatsCards stats={stats} />

      {/* Chart */}
      <BehaviorChart dailyStats={dailyStats} />

      {/* Logs Table */}
      <BehaviorLogsTable initialLogs={initialLogs} initialTotal={initialTotal} />
    </div>
  );
}
