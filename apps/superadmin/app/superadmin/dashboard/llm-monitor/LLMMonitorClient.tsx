'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Brain,
  Clock,
  DollarSign,
  Star,
  Layers,
  RefreshCw,
  Zap,
  Activity,
  FileText,
  BarChart3,
  TrendingUp,
  Mic,
  SlidersHorizontal,
  Percent,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import EnhancedTable from '@/components/ui/EnhancedTable';
import { BottomSheetTabs } from '@/components/ui/BottomSheetTabs';
import type { SheetTabDef } from '@/components/ui/BottomSheetTabs';
import type { ColumnDef } from '@tanstack/react-table';
import type {
  AIUsageLog,
  LLMOverallStats,
  LLMAggregateStat,
  DailyTokenPoint,
  WeeklyTokenPoint,
  VoiceQualityPoint,
  LLMMonitorConfig,
} from './actions';
import LLMMonitorBudgetPanel from './LLMMonitorBudgetPanel';

interface LLMMonitorClientPropsV2 {
  overallStats: LLMOverallStats;
  aggregateStats: LLMAggregateStat[];
  usageLogs: AIUsageLog[];
  monitorConfig: LLMMonitorConfig;
  dailyTokenSeries: DailyTokenPoint[];
  weeklyTokenSeries: WeeklyTokenPoint[];
  voiceQualitySeries: VoiceQualityPoint[];
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  unit?: string;
}

type TabId =
  | 'overall-stats'
  | 'ai-usage-logs'
  | 'model-comparison'
  | 'token-trends'
  | 'voice-quality'
  | 'budget-keys';

const TAB_IDS: TabId[] = [
  'overall-stats',
  'ai-usage-logs',
  'model-comparison',
  'token-trends',
  'voice-quality',
  'budget-keys',
];

function isTabId(value: string): value is TabId {
  return TAB_IDS.includes(value as TabId);
}

const SHEET_TABS: SheetTabDef[] = [
  {
    id: 'overall-stats',
    label: 'Stats',
    zhLabel: '總覽',
    icon: Activity,
    color: 'text-emerald-500',
    activeColor: 'bg-emerald-600 text-white',
  },
  {
    id: 'ai-usage-logs',
    label: 'AI Usage Logs',
    zhLabel: '使用紀錄',
    icon: FileText,
    color: 'text-blue-500',
    activeColor: 'bg-blue-600 text-white',
  },
  {
    id: 'model-comparison',
    label: 'Model Comparison',
    zhLabel: '模型比較',
    icon: BarChart3,
    color: 'text-purple-500',
    activeColor: 'bg-purple-600 text-white',
  },
  {
    id: 'token-trends',
    label: 'Tokens',
    zhLabel: 'Token 趨勢',
    icon: TrendingUp,
    color: 'text-amber-500',
    activeColor: 'bg-amber-600 text-white',
  },
  {
    id: 'voice-quality',
    label: 'Voice',
    zhLabel: '語音品質',
    icon: Mic,
    color: 'text-pink-500',
    activeColor: 'bg-pink-600 text-white',
  },
  {
    id: 'budget-keys',
    label: 'Budget',
    zhLabel: '預算與密鑰',
    icon: SlidersHorizontal,
    color: 'text-cyan-500',
    activeColor: 'bg-cyan-600 text-white',
  },
];

function StatCard({ title, value, icon: Icon, color, bgColor, unit }: StatCardProps) {
  return (
    <Card className="bg-[#2A2A2A] border-[#333333]">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>
              {typeof value === 'number' ? value.toLocaleString() : value}
              {unit && <span className="text-sm ml-1 text-gray-400">{unit}</span>}
            </p>
          </div>
          <div className={`p-3 rounded-lg ${bgColor}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getLatencyBadge(latency: number) {
  if (latency < 500) return <Badge variant="success">&lt;500</Badge>;
  if (latency < 1500) return <Badge variant="warning">{latency}</Badge>;
  return <Badge variant="error">{latency}</Badge>;
}

function formatPct01(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

function MiniBarChart({
  title,
  subtitle,
  points,
  valueLabel,
}: {
  title: string;
  subtitle?: string;
  points: { label: string; value: number }[];
  valueLabel: (v: number) => string;
}) {
  const max = useMemo(() => Math.max(1, ...points.map((p) => p.value)), [points]);

  return (
    <div className="rounded-lg border border-[#333333] bg-[#2A2A2A] p-4">
      <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
      {subtitle ? <p className="text-xs text-gray-500 mt-1 mb-3">{subtitle}</p> : <div className="mb-3" />}
      <div className="space-y-2">
        {points.length === 0 ? (
          <p className="text-sm text-gray-500">尚無資料。</p>
        ) : (
          points.map((p) => (
            <div key={p.label} className="flex items-center gap-2 text-xs">
              <span className="w-24 shrink-0 text-gray-500 truncate" title={p.label}>
                {p.label}
              </span>
              <div className="flex-1 h-6 bg-[#1A1A1A] rounded overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-600/80 to-purple-500/90"
                  style={{ width: `${(p.value / max) * 100}%` }}
                />
              </div>
              <span className="w-20 text-right font-mono text-gray-300">{valueLabel(p.value)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const usageLogColumns: ColumnDef<AIUsageLog, unknown>[] = [
  {
    id: 'timestamp',
    header: '時間',
    meta: { headerEn: 'Timestamp', headerZh: '時間' },
    accessorFn: (row) => row.created_at,
    cell: ({ row }) => (
      <span className="text-gray-400 text-xs whitespace-nowrap">
        {new Date(row.original.created_at).toLocaleString('zh-TW')}
      </span>
    ),
  },
  {
    id: 'module_key',
    header: '模組',
    meta: { headerEn: 'Module', headerZh: '模組' },
    accessorFn: (row) => row.module_key,
    cell: ({ row }) => (
      <span className="text-gray-200 text-xs whitespace-nowrap">
        {row.original.module_key ?? '-'}
      </span>
    ),
  },
  {
    id: 'provider_model',
    header: 'Provider / Model',
    meta: { headerEn: 'Provider / Model' },
    accessorFn: (row) => `${row.provider}/${row.model_id}`,
    cell: ({ row }) => (
      <span className="font-mono text-xs text-white whitespace-nowrap">
        {row.original.provider}/{row.original.model_id}
      </span>
    ),
  },
  {
    id: 'prompt_info',
    header: 'Prompt',
    meta: { headerEn: 'Prompt' },
    enableSorting: false,
    cell: ({ row }) => {
      const log = row.original;
      return (
        <div>
          <div className="whitespace-nowrap text-gray-300 text-xs">
            {log.prompt_name ?? '-'}
            {log.prompt_source ? <span className="text-gray-500"> ({log.prompt_source})</span> : null}
            {log.prompt_version != null ? <span className="text-gray-500"> v{log.prompt_version}</span> : null}
          </div>
          {log.final_prompt_hash ? (
            <div className="text-gray-500 font-mono text-[10px]">hash:{log.final_prompt_hash.slice(0, 12)}</div>
          ) : null}
        </div>
      );
    },
  },
  {
    id: 'status',
    header: '狀態',
    meta: { headerEn: 'Status', headerZh: '狀態' },
    accessorFn: (row) => row.status,
    cell: ({ row }) => {
      const status = row.original.status;
      if (status === 'success') return <Badge variant="success">success</Badge>;
      if (status === 'timeout') return <Badge variant="warning">timeout</Badge>;
      if (status === 'error') return <Badge variant="error">error</Badge>;
      return <span className="text-gray-600 text-xs">-</span>;
    },
  },
  {
    id: 'col-latency',
    header: '延遲 (ms)',
    meta: { headerEn: 'Latency (ms)', headerZh: '延遲 (ms)' },
    accessorFn: (row) => row.duration_ms ?? null,
    cell: ({ row }) => (
      <span className="text-gray-300 text-xs whitespace-nowrap">
        {row.original.duration_ms != null ? row.original.duration_ms.toLocaleString() : '-'}
      </span>
    ),
  },
  {
    id: 'input_tokens',
    header: 'Input',
    meta: { headerEn: 'Input Tokens', headerZh: 'Input' },
    accessorFn: (row) => row.tokens_input ?? 0,
    cell: ({ row }) => (
      <span className="text-gray-300 text-xs whitespace-nowrap">
        {row.original.tokens_input?.toLocaleString() ?? '-'}
      </span>
    ),
  },
  {
    id: 'output_tokens',
    header: 'Output',
    meta: { headerEn: 'Output Tokens', headerZh: 'Output' },
    accessorFn: (row) => row.tokens_output ?? 0,
    cell: ({ row }) => (
      <span className="text-gray-300 text-xs whitespace-nowrap">
        {row.original.tokens_output?.toLocaleString() ?? '-'}
      </span>
    ),
  },
  {
    id: 'error_message',
    header: '錯誤',
    meta: { headerEn: 'Error', headerZh: '錯誤' },
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-gray-400 text-xs">
        {row.original.error_message ?? '-'}
      </span>
    ),
  },
];

const modelComparisonColumns: ColumnDef<LLMAggregateStat, unknown>[] = [
  {
    id: 'provider',
    header: 'Provider',
    meta: { headerEn: 'Provider' },
    accessorKey: 'provider',
    cell: ({ row }) => (
      <span className="text-gray-300 text-xs">{row.original.provider}</span>
    ),
  },
  {
    id: 'model_id',
    header: '模型 ID',
    meta: { headerEn: 'Model ID', headerZh: '模型 ID' },
    accessorKey: 'model_id',
    cell: ({ row }) => (
      <span className="font-medium text-white font-mono text-xs">
        {row.original.model_id}
      </span>
    ),
  },
  {
    id: 'total_requests',
    header: '請求數',
    meta: { headerEn: 'Requests', headerZh: '請求數' },
    accessorKey: 'total_requests',
    cell: ({ row }) => (
      <span className="text-gray-300">
        {row.original.total_requests.toLocaleString()}
      </span>
    ),
  },
  {
    id: 'error_rate',
    header: '錯誤率',
    meta: { headerEn: 'Error rate', headerZh: '錯誤率' },
    accessorKey: 'error_rate',
    cell: ({ row }) => (
      <span className="text-rose-300 font-mono text-xs">{formatPct01(row.original.error_rate)}</span>
    ),
  },
  {
    id: 'col-avg_latency',
    header: '平均延遲 (ms)',
    meta: { headerEn: 'Avg Latency (ms)', headerZh: '平均延遲 (ms)' },
    accessorKey: 'avg_latency_ms',
    cell: ({ row }) => getLatencyBadge(row.original.avg_latency_ms),
  },
  {
    id: 'avg_prompt_tokens',
    header: 'Prompt Tokens',
    meta: { headerEn: 'Prompt Tokens' },
    accessorKey: 'avg_prompt_tokens',
    cell: ({ row }) => (
      <span className="text-gray-300">
        {row.original.avg_prompt_tokens.toLocaleString()}
      </span>
    ),
  },
  {
    id: 'avg_completion_tokens',
    header: 'Completion Tokens',
    meta: { headerEn: 'Completion Tokens' },
    accessorKey: 'avg_completion_tokens',
    cell: ({ row }) => (
      <span className="text-gray-300">
        {row.original.avg_completion_tokens.toLocaleString()}
      </span>
    ),
  },
  {
    id: 'col-total_cost',
    header: '總花費 (USD)',
    meta: { headerEn: 'Total Cost (USD)', headerZh: '總花費 (USD)' },
    accessorKey: 'total_cost',
    cell: ({ row }) => {
      const v = row.original.total_cost;
      return (
        <span className="text-yellow-400 font-mono">
          {typeof v === 'number' ? v.toFixed(4) : String(v ?? '—')}
        </span>
      );
    },
  },
];

const USAGE_LOG_WIDTHS = [13, 9, 14, 16, 8, 8, 8, 8, 16];
const MODEL_COMPARISON_WIDTHS = [12, 14, 10, 10, 12, 12, 12, 14];

export default function LLMMonitorClient({
  overallStats,
  aggregateStats,
  usageLogs,
  monitorConfig,
  dailyTokenSeries,
  weeklyTokenSeries,
  voiceQualitySeries,
}: LLMMonitorClientPropsV2) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (typeof window === 'undefined') return 'overall-stats';
    const hashTab = window.location.hash.replace('#', '');
    return isTabId(hashTab) ? hashTab : 'overall-stats';
  });

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    const t = window.setInterval(() => {
      router.refresh();
    }, 60_000);
    return () => window.clearInterval(t);
  }, [router]);

  const sortedAggregateStats = useMemo(
    () => [...aggregateStats].sort((a, b) => b.total_requests - a.total_requests),
    [aggregateStats],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const nextHash = `#${activeTab}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash);
    }
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleHashChange = () => {
      const hashTab = window.location.hash.replace('#', '');
      if (isTabId(hashTab)) {
        setActiveTab(hashTab);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabChange = useCallback((tabId: string) => {
    if (isTabId(tabId)) {
      setActiveTab(tabId);
    }
  }, []);

  const dailyBars = useMemo(
    () =>
      dailyTokenSeries.map((d) => ({
        label: d.bucket_date,
        value: d.total_tokens,
      })),
    [dailyTokenSeries],
  );

  const weeklyBars = useMemo(
    () =>
      weeklyTokenSeries.map((w) => ({
        label: w.week_start,
        value: w.total_tokens,
      })),
    [weeklyTokenSeries],
  );

  const dailyCostBars = useMemo(
    () =>
      dailyTokenSeries.map((d) => ({
        label: d.bucket_date,
        value: d.total_cost_usd,
      })),
    [dailyTokenSeries],
  );

  const voiceLatencyBars = useMemo(
    () =>
      voiceQualitySeries.map((v) => ({
        label: v.bucket_date,
        value: v.avg_latency_ms,
      })),
    [voiceQualitySeries],
  );

  const voiceBreakBars = useMemo(
    () =>
      voiceQualitySeries.map((v) => ({
        label: v.bucket_date,
        value: v.break_proxy_rate,
      })),
    [voiceQualitySeries],
  );

  const tabsWithBadges: SheetTabDef[] = useMemo(
    () =>
      SHEET_TABS.map((tab) => {
        if (tab.id === 'ai-usage-logs') return { ...tab, badge: usageLogs.length };
        if (tab.id === 'model-comparison') return { ...tab, badge: aggregateStats.length };
        if (tab.id === 'voice-quality') return { ...tab, badge: voiceQualitySeries.length };
        return tab;
      }),
    [usageLogs.length, aggregateStats.length, voiceQualitySeries.length],
  );

  return (
    <div className="flex flex-col h-full bg-[#1A1A1A] text-white">
      <div className="flex-none p-6 pb-4 space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Brain className="h-7 w-7 text-purple-400" />
              AI LLM API 效能監控
            </h1>
            <p className="text-gray-400 mt-1 text-sm">
              近 30 天 API 呼叫效能統計 · 每 60 秒自動刷新 · 本月 UTC 花費 ${overallStats.month_spend_usd.toFixed(4)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="flex items-center gap-2 px-3 py-2 rounded-md border border-[#333333] text-gray-400 hover:text-white text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-4">
        {activeTab === 'overall-stats' && (
          <div className="space-y-4 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-200">總覽 KPI</h2>
              <span className="text-xs text-gray-500">近 30 天（錯誤率含 error + timeout）</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="總請求數"
                value={overallStats.total_requests}
                icon={Zap}
                color="text-blue-400"
                bgColor="bg-blue-500/10"
              />
              <StatCard
                title="平均延遲"
                value={overallStats.avg_latency_ms}
                icon={Clock}
                color={overallStats.avg_latency_ms > 1500 ? 'text-red-400' : 'text-emerald-400'}
                bgColor={overallStats.avg_latency_ms > 1500 ? 'bg-red-500/10' : 'bg-emerald-500/10'}
                unit="ms"
              />
              <StatCard
                title="錯誤率"
                value={formatPct01(overallStats.error_rate)}
                icon={Percent}
                color={overallStats.error_rate > 0.05 ? 'text-rose-400' : 'text-emerald-400'}
                bgColor={overallStats.error_rate > 0.05 ? 'bg-rose-500/10' : 'bg-emerald-500/10'}
              />
              <StatCard
                title="總花費 (30d)"
                value={`$${overallStats.total_cost}`}
                icon={DollarSign}
                color="text-yellow-400"
                bgColor="bg-yellow-500/10"
              />
              <StatCard
                title="本月花費 (UTC)"
                value={`$${overallStats.month_spend_usd.toFixed(4)}`}
                icon={DollarSign}
                color="text-amber-300"
                bgColor="bg-amber-500/10"
              />
              <StatCard
                title="平均評分"
                value={overallStats.avg_feedback || '-'}
                icon={Star}
                color="text-orange-400"
                bgColor="bg-orange-500/10"
                unit={overallStats.avg_feedback ? '/ 5' : ''}
              />
              <StatCard
                title="模型數"
                value={overallStats.models_count}
                icon={Layers}
                color="text-cyan-400"
                bgColor="bg-cyan-500/10"
              />
            </div>
          </div>
        )}

        {activeTab === 'ai-usage-logs' && (
          <div className="space-y-2 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-200">AI 使用紀錄</h2>
              <span className="text-xs text-gray-500">{usageLogs.length} 筆</span>
            </div>

            <EnhancedTable<AIUsageLog>
              tableId="llm_usage_logs"
              columns={usageLogColumns}
              data={usageLogs}
              initialWidths={USAGE_LOG_WIDTHS}
              pageSizes={[20, 50, 100]}
              minWidth={1100}
              getCategoryValue={(row) => row.module_key ?? '(none)'}
              getSearchValue={(row) =>
                [
                  row.module_key,
                  row.provider,
                  row.model_id,
                  row.prompt_name,
                  row.error_message,
                ]
                  .filter(Boolean)
                  .join(' ')
              }
            />
          </div>
        )}

        {activeTab === 'model-comparison' && (
          <div className="space-y-2 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-200">模型比較</h2>
              <span className="text-xs text-gray-500">{aggregateStats.length} 個模型</span>
            </div>

            <EnhancedTable<LLMAggregateStat>
              tableId="llm_model_comparison"
              columns={modelComparisonColumns}
              data={sortedAggregateStats}
              initialWidths={MODEL_COMPARISON_WIDTHS}
              minWidth={1100}
              getSearchValue={(row) => `${row.provider} ${row.model_id} ${row.display_key}`}
            />
          </div>
        )}

        {activeTab === 'token-trends' && (
          <div className="space-y-4 max-w-7xl mx-auto">
            <h2 className="text-sm font-semibold text-gray-200">每日 / 每週 Token 與費用</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <MiniBarChart
                title="每日 Token（input+output）"
                subtitle="過去 14 天"
                points={dailyBars}
                valueLabel={(v) => v.toLocaleString()}
              />
              <MiniBarChart
                title="每日費用 (USD)"
                subtitle="過去 14 天 · 估算自 usage logs"
                points={dailyCostBars}
                valueLabel={(v) => `$${v.toFixed(4)}`}
              />
              <MiniBarChart
                title="每週 Token"
                subtitle="過去 8 週"
                points={weeklyBars}
                valueLabel={(v) => v.toLocaleString()}
              />
            </div>
          </div>
        )}

        {activeTab === 'voice-quality' && (
          <div className="space-y-4 max-w-7xl mx-auto">
            <h2 className="text-sm font-semibold text-gray-200">語音 / TTS 品質</h2>
            <p className="text-xs text-gray-500 max-w-3xl">
              篩選條件：<span className="font-mono">module_key</span> 為 voice_generation / 含 voice，或路徑含 voice、tts。
              「斷句代理率」= 該日 (error+timeout) / 總請求；正式斷句率需由 TTS pipeline 寫入專用欄位後替換。
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <MiniBarChart
                title="平均語音延遲 (ms)"
                points={voiceLatencyBars}
                valueLabel={(v) => `${Math.round(v)} ms`}
              />
              <MiniBarChart
                title="斷句代理率（失敗+逾時）"
                points={voiceBreakBars}
                valueLabel={(v) => formatPct01(v)}
              />
            </div>
          </div>
        )}

        {activeTab === 'budget-keys' && (
          <LLMMonitorBudgetPanel initialConfig={monitorConfig} monthSpendUsd={overallStats.month_spend_usd} />
        )}
      </div>

      <BottomSheetTabs
        tabs={tabsWithBadges}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
    </div>
  );
}
