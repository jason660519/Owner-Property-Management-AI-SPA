'use client';

import { useState, useTransition, useEffect } from 'react';
import { Activity, Clock, RefreshCw, Shield, Server } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import BehaviorStatsCards from './BehaviorStatsCards';
import BehaviorChart from './BehaviorChart';
import BehaviorLogsTable from './BehaviorLogsTable';
import { runAnomalyDetection } from '../actions';
import type { BehaviorStats, DailyStatRow, BehaviorLog } from '../actions';
import type { SystemHealthResponse } from '@/app/api/system-health/route';

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
  const [systemHealth, setSystemHealth] = useState<SystemHealthResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/system-health');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setSystemHealth(data);
        }
      } catch (err) {
        console.error('Failed to fetch system health in monitoring page', err);
      }
    };
    fetchHealth();
    const timer = setInterval(fetchHealth, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {/* Stats Cards */}
          <BehaviorStatsCards stats={stats} />

          {/* Chart */}
          <BehaviorChart dailyStats={dailyStats} />
        </div>

        <div className="lg:col-span-1">
          <Card className="bg-[#2A2A2A] border-[#333333] h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-100 italic">
                <Server className="w-5 h-5 text-blue-400" />
                開發服務連線狀態
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!systemHealth ? (
                <div className="text-sm text-gray-500 py-4 text-center">連線狀態載入中...</div>
              ) : (
                <div className="space-y-3">
                  {systemHealth.devServices.map((svc) => (
                    <div key={svc.name} className="flex items-center justify-between rounded-lg bg-[#1E1E1E] border border-[#333333] px-3 py-2.5">
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-gray-200">{svc.name}</span>
                        <span className="text-[10px] text-gray-500 truncate" title={svc.url}>{svc.url}</span>
                      </div>
                      <span
                        className={`text-xs font-semibold flex items-center gap-1.5 shrink-0 ml-2 ${svc.status === 'up' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${svc.status === 'up' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                            }`}
                        />
                        {svc.status === 'up' ? '正常' : '無法連線'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Logs Table */}
      <BehaviorLogsTable initialLogs={initialLogs} initialTotal={initialTotal} />
    </div>
  );
}
