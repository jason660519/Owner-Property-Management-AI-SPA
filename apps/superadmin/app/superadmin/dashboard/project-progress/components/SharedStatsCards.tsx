// filepath: apps/superadmin/app/superadmin/dashboard/project-progress/components/SharedStatsCards.tsx
// created: 2026-02-19 | creator: Claude Opus 4.6

'use client';

import { useMemo } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  Layers,
  TestTube2,
  AlertTriangle,
  Rocket,
  Server,
  Shield,
  Zap,
} from 'lucide-react';
import type { PhaseType, RoadmapFeature } from '@/app/data/roadmap';
import { StatCard } from './StatCard';

interface SharedStatsCardsProps {
  phase: PhaseType;
  features: RoadmapFeature[];
}

export const SharedStatsCards = ({ phase, features }: SharedStatsCardsProps) => {
  const devStats = useMemo(() => {
    const totalPoints = features.reduce((sum, f) => sum + (f.points || 1), 0);
    const completedWeighted = features.reduce(
      (sum, f) => sum + (f.points || 1) * f.percentage,
      0
    );
    const overallProgress = totalPoints ? completedWeighted / totalPoints : 0;
    return {
      totalFeatures: features.length,
      overallProgress: Math.round(overallProgress),
      completedCount: features.filter(f => f.percentage === 100).length,
      inProgressCount: features.filter(
        f => f.percentage > 0 && f.percentage < 100
      ).length,
      pendingCount: features.filter(f => f.percentage === 0).length,
      totalPoints,
    };
  }, [features]);

  const testStats = useMemo(() => {
    const withCoverage = features.filter(f => f.testCoverage != null);
    const avgCoverage =
      withCoverage.length > 0
        ? Math.round(
            withCoverage.reduce((s, f) => s + (f.testCoverage ?? 0), 0) /
              withCoverage.length
          )
        : 0;
    return {
      avgCoverage,
      passedCount: features.filter(f => f.testStatus === 'passed').length,
      failedCount: features.filter(f => f.testStatus === 'failed').length,
      pendingCount: features.filter(
        f => !f.testStatus || f.testStatus === 'pending'
      ).length,
    };
  }, [features]);

  const deployStats = useMemo(() => {
    return {
      productionCount: features.filter(f => f.deployStatus === 'production').length,
      stagingCount: features.filter(f => f.deployStatus === 'staging').length,
      notDeployedCount: features.filter(
        f => !f.deployStatus || f.deployStatus === 'not_deployed'
      ).length,
      latestDeploy:
        features
          .filter(f => f.deployDate)
          .sort((a, b) => (b.deployDate ?? '').localeCompare(a.deployDate ?? ''))[0]
          ?.deployDate ?? '—',
    };
  }, [features]);

  const opsStats = useMemo(() => {
    const withUptime = features.filter(f => f.uptimePercent != null);
    const withError = features.filter(f => f.errorRate != null);
    const withResponse = features.filter(f => f.avgResponseTime != null);
    return {
      avgUptime:
        withUptime.length > 0
          ? (
              withUptime.reduce((s, f) => s + (f.uptimePercent ?? 0), 0) /
              withUptime.length
            ).toFixed(1)
          : '—',
      avgErrorRate:
        withError.length > 0
          ? (
              withError.reduce((s, f) => s + (f.errorRate ?? 0), 0) /
              withError.length
            ).toFixed(2)
          : '—',
      avgResponseTime:
        withResponse.length > 0
          ? Math.round(
              withResponse.reduce((s, f) => s + (f.avgResponseTime ?? 0), 0) /
                withResponse.length
            )
          : '—',
      incidentCount: features.filter(f => f.lastIncident).length,
    };
  }, [features]);

  if (phase === 'development') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-none">
        {/* Overall Progress Circular */}
        <div className="bg-bg-primary p-4 rounded-xl border border-border-default shadow-sm flex items-center gap-4 col-span-1 md:col-span-2 lg:col-span-1 transition-colors">
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg
              className="w-full h-full transform -rotate-90"
              viewBox="0 0 36 36"
            >
              <path
                className="text-bg-tertiary"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="text-blue-600 transition-all duration-1000 ease-out"
                strokeDasharray={`${devStats.overallProgress}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-text-primary">
                {devStats.overallProgress}%
              </span>
            </div>
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary">總體開發進度</h2>
            <p className="text-xs text-text-secondary">Weighted by Story Points</p>
            <p className="text-xs text-text-muted mt-1">
              {devStats.totalFeatures} Features
            </p>
          </div>
        </div>
        <StatCard
          label="已完成 (Completed)"
          value={devStats.completedCount}
          icon={CheckCircle2}
          bgClass="bg-green-50"
          colorClass="text-green-600"
        />
        <StatCard
          label="進行中 (In Progress)"
          value={devStats.inProgressCount}
          icon={Clock}
          bgClass="bg-blue-50"
          colorClass="text-blue-600"
        />
        <StatCard
          label="未開始 (Pending)"
          value={devStats.pendingCount}
          subValue={`/ ${devStats.totalPoints} SP`}
          icon={Layers}
          bgClass="bg-gray-100"
          colorClass="text-gray-600"
        />
      </div>
    );
  }

  if (phase === 'testing') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-none">
        <StatCard
          label="平均測試覆蓋率"
          value={`${testStats.avgCoverage}%`}
          icon={TestTube2}
          bgClass="bg-purple-50"
          colorClass="text-purple-600"
        />
        <StatCard
          label="通過 (Passed)"
          value={testStats.passedCount}
          icon={CheckCircle2}
          bgClass="bg-green-50"
          colorClass="text-green-600"
        />
        <StatCard
          label="失敗 (Failed)"
          value={testStats.failedCount}
          icon={AlertTriangle}
          bgClass="bg-red-50"
          colorClass="text-red-600"
        />
        <StatCard
          label="待測試 (Pending)"
          value={testStats.pendingCount}
          icon={Clock}
          bgClass="bg-gray-100"
          colorClass="text-gray-600"
        />
      </div>
    );
  }

  if (phase === 'deployment') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-none">
        <StatCard
          label="已上線 (Production)"
          value={deployStats.productionCount}
          icon={Rocket}
          bgClass="bg-green-50"
          colorClass="text-green-600"
        />
        <StatCard
          label="Staging 中"
          value={deployStats.stagingCount}
          icon={Server}
          bgClass="bg-yellow-50"
          colorClass="text-yellow-600"
        />
        <StatCard
          label="未部署"
          value={deployStats.notDeployedCount}
          icon={Layers}
          bgClass="bg-gray-100"
          colorClass="text-gray-600"
        />
        <StatCard
          label="最近部署日期"
          value={deployStats.latestDeploy}
          icon={Activity}
          bgClass="bg-blue-50"
          colorClass="text-blue-600"
        />
      </div>
    );
  }

  // operations
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-none">
      <StatCard
        label="平均正常運行率"
        value={typeof opsStats.avgUptime === 'string' ? opsStats.avgUptime : `${opsStats.avgUptime}%`}
        icon={Shield}
        bgClass="bg-green-50"
        colorClass="text-green-600"
      />
      <StatCard
        label="平均錯誤率"
        value={typeof opsStats.avgErrorRate === 'string' ? opsStats.avgErrorRate : `${opsStats.avgErrorRate}%`}
        icon={AlertTriangle}
        bgClass="bg-red-50"
        colorClass="text-red-600"
      />
      <StatCard
        label="平均回應時間"
        value={typeof opsStats.avgResponseTime === 'number' ? `${opsStats.avgResponseTime}ms` : opsStats.avgResponseTime}
        icon={Zap}
        bgClass="bg-blue-50"
        colorClass="text-blue-600"
      />
      <StatCard
        label="近期事件數"
        value={opsStats.incidentCount}
        icon={Activity}
        bgClass="bg-yellow-50"
        colorClass="text-yellow-600"
      />
    </div>
  );
};
