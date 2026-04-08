'use client';

import { useEffect, useState, useMemo } from 'react';
import { Brain, Clock, DollarSign, Star, Layers, RefreshCw, Zap, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import EnhancedTable from '@/components/ui/EnhancedTable';
import type { MouseEvent } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { AIUsageLog, LLMOverallStats, LLMAggregateStat } from './actions';

interface LLMMonitorClientPropsV2 {
  overallStats: LLMOverallStats;
  aggregateStats: LLMAggregateStat[];
  usageLogs: AIUsageLog[];
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  unit?: string;
}

type SectionId = 'ai-usage-logs' | 'overall-stats' | 'model-comparison';

const SECTION_IDS: SectionId[] = ['ai-usage-logs', 'overall-stats', 'model-comparison'];

function isSectionId(value: string): value is SectionId {
  return SECTION_IDS.includes(value as SectionId);
}

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
  if (latency < 500) return <Badge variant="success">&lt;500ms</Badge>;
  if (latency < 1500) return <Badge variant="warning">{latency}ms</Badge>;
  return <Badge variant="error">{latency}ms</Badge>;
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

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
    id: 'latency',
    header: '延遲',
    meta: { headerEn: 'Latency', headerZh: '延遲' },
    accessorFn: (row) => row.duration_ms ?? 0,
    cell: ({ row }) => (
      <span className="text-gray-300 text-xs whitespace-nowrap">
        {row.original.duration_ms != null ? `${row.original.duration_ms}ms` : '-'}
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
    id: 'avg_latency',
    header: '平均延遲',
    meta: { headerEn: 'Avg Latency', headerZh: '平均延遲' },
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
    id: 'total_cost',
    header: '總花費',
    meta: { headerEn: 'Total Cost', headerZh: '總花費' },
    accessorKey: 'total_cost',
    cell: ({ row }) => (
      <span className="text-yellow-400">${row.original.total_cost}</span>
    ),
  },
  {
    id: 'avg_feedback',
    header: '平均評分',
    meta: { headerEn: 'Avg Feedback', headerZh: '平均評分' },
    accessorKey: 'avg_feedback',
    cell: ({ row }) => {
      const fb = row.original.avg_feedback;
      if (fb > 0) {
        return (
          <span className="flex items-center justify-end gap-1 text-orange-400">
            <Star className="w-3 h-3" />
            {fb}
          </span>
        );
      }
      return <span className="text-gray-600">-</span>;
    },
  },
];

// Column width percentages (must roughly sum to 100)
const USAGE_LOG_WIDTHS = [13, 9, 14, 16, 8, 8, 8, 8, 16];
const MODEL_COMPARISON_WIDTHS = [22, 12, 14, 14, 14, 12, 12];

export default function LLMMonitorClient({
  overallStats,
  aggregateStats,
  usageLogs,
}: LLMMonitorClientPropsV2) {
  const [activeSection, setActiveSection] = useState<SectionId>(() => {
    if (typeof window === 'undefined') return 'ai-usage-logs';
    const hashSection = window.location.hash.replace('#', '');
    return isSectionId(hashSection) ? hashSection : 'ai-usage-logs';
  });
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Pre-sort model comparison data by total_requests desc
  const sortedAggregateStats = useMemo(
    () => [...aggregateStats].sort((a, b) => b.total_requests - a.total_requests),
    [aggregateStats],
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    const sectionElements = SECTION_IDS
      .map(id => document.getElementById(id))
      .filter((el): el is HTMLElement => el instanceof HTMLElement);

    if (sectionElements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        const visibleEntries = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        const topVisible = visibleEntries[0];
        if (topVisible?.target?.id) {
          setActiveSection(topVisible.target.id as SectionId);
        }
      },
      {
        rootMargin: '-20% 0px -60% 0px',
        threshold: [0.1, 0.3, 0.6],
      },
    );

    sectionElements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const nextHash = `#${activeSection}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash);
    }
  }, [activeSection]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const updateVisibility = () => {
      setShowBackToTop(window.scrollY > 360);
    };

    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });
    return () => window.removeEventListener('scroll', updateVisibility);
  }, []);

  const getQuickNavClassName = (sectionId: SectionId) => {
    const isActive = activeSection === sectionId;
    return isActive
      ? 'px-3 py-1.5 text-xs rounded-full border border-blue-400/60 bg-blue-500/10 text-blue-300 transition-colors'
      : 'px-3 py-1.5 text-xs rounded-full border border-[#3A3A3A] text-gray-300 hover:text-white hover:border-[#5A5A5A] transition-colors';
  };

  const handleQuickNavClick = (event: MouseEvent<HTMLAnchorElement>, sectionId: SectionId) => {
    event.preventDefault();

    const target = document.getElementById(sectionId);
    if (!target) {
      return;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
    setActiveSection(sectionId);
  };

  const handleBackToTop = () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    setActiveSection('ai-usage-logs');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-[#1A1A1A] min-h-screen text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Brain className="h-7 w-7 text-purple-400" />
            AI LLM API 效能監控
          </h1>
          <p className="text-gray-400 mt-1 text-sm">近 30 天 API 呼叫效能統計</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-3 py-2 rounded-md border border-[#333333] text-gray-400 hover:text-white text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          刷新
        </button>
      </div>

      <div className="sticky top-3 z-20 -mx-2 px-2 py-2 rounded-xl border border-[#2F2F2F] bg-[#1A1A1A]/85 backdrop-blur supports-[backdrop-filter]:bg-[#1A1A1A]/70">
        <div className="flex flex-wrap items-center gap-2">
        <a
          href="#ai-usage-logs"
          className={getQuickNavClassName('ai-usage-logs')}
          onClick={event => handleQuickNavClick(event, 'ai-usage-logs')}
        >
          AI 使用紀錄
        </a>
        <a
          href="#overall-stats"
          className={getQuickNavClassName('overall-stats')}
          onClick={event => handleQuickNavClick(event, 'overall-stats')}
        >
          總覽 KPI
        </a>
        <a
          href="#model-comparison"
          className={getQuickNavClassName('model-comparison')}
          onClick={event => handleQuickNavClick(event, 'model-comparison')}
        >
          模型比較
        </a>
        </div>
      </div>

      {/* AI Usage Logs */}
      <section id="ai-usage-logs" className="space-y-2 scroll-mt-32">
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
      </section>

      {/* Overall Stats */}
      <section id="overall-stats" className="space-y-2 scroll-mt-32">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-200">總覽 KPI</h2>
          <span className="text-xs text-gray-500">近 30 天</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
            title="總花費"
            value={`$${overallStats.total_cost}`}
            icon={DollarSign}
            color="text-yellow-400"
            bgColor="bg-yellow-500/10"
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
      </section>

      {/* Model Comparison */}
      <section id="model-comparison" className="space-y-2 scroll-mt-32">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-200">模型比較</h2>
          <span className="text-xs text-gray-500">{aggregateStats.length} 個模型</span>
        </div>

        <EnhancedTable<LLMAggregateStat>
          tableId="llm_model_comparison"
          columns={modelComparisonColumns}
          data={sortedAggregateStats}
          initialWidths={MODEL_COMPARISON_WIDTHS}
          minWidth={900}
          getSearchValue={(row) => row.model_id}
        />
      </section>

      {showBackToTop ? (
        <button
          type="button"
          onClick={handleBackToTop}
          className="fixed bottom-5 right-4 z-30 inline-flex items-center justify-center rounded-full border border-[#3F3F3F] bg-[#222222]/95 p-3 text-gray-200 shadow-lg shadow-black/30 transition-colors hover:border-blue-400/60 hover:text-white md:bottom-6 md:right-6 md:gap-2 md:px-3 md:py-2 md:text-xs"
          aria-label="回到頁面頂部"
        >
          <ChevronUp className="h-4 w-4" />
          <span className="hidden md:inline">回到頂部</span>
        </button>
      ) : null}
    </div>
  );
}
