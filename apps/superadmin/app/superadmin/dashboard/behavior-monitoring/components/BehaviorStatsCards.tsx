'use client';

import { Activity, Users, Globe, AlertTriangle, Eye, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import type { BehaviorStats } from '../actions';

interface BehaviorStatsCardsProps {
  stats: BehaviorStats;
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  description?: string;
}

function StatCard({ title, value, icon: Icon, color, bgColor, description }: StatCardProps) {
  return (
    <Card className="bg-[#2A2A2A] border-[#333333]">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>
              {value.toLocaleString()}
            </p>
            {description && (
              <p className="text-xs text-gray-500 mt-1">{description}</p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${bgColor}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BehaviorStatsCards({ stats }: BehaviorStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <StatCard
        title="總事件數"
        value={stats.total_events}
        icon={Activity}
        color="text-blue-400"
        bgColor="bg-blue-500/10"
        description="近 30 天"
      />
      <StatCard
        title="活躍用戶"
        value={stats.unique_users}
        icon={Users}
        color="text-emerald-400"
        bgColor="bg-emerald-500/10"
        description="不重複用戶"
      />
      <StatCard
        title="不重複 IP"
        value={stats.unique_ips}
        icon={Globe}
        color="text-cyan-400"
        bgColor="bg-cyan-500/10"
        description="來源地址"
      />
      <StatCard
        title="異常事件"
        value={stats.anomaly_count}
        icon={AlertTriangle}
        color={stats.anomaly_count > 0 ? 'text-red-400' : 'text-gray-400'}
        bgColor={stats.anomaly_count > 0 ? 'bg-red-500/10' : 'bg-gray-500/10'}
        description=">100 次/分鐘"
      />
      <StatCard
        title="頁面瀏覽"
        value={stats.page_views}
        icon={Eye}
        color="text-purple-400"
        bgColor="bg-purple-500/10"
        description="PAGE_VIEW"
      />
      <StatCard
        title="API 呼叫"
        value={stats.api_calls}
        icon={Zap}
        color="text-yellow-400"
        bgColor="bg-yellow-500/10"
        description="API_CALL"
      />
    </div>
  );
}
