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
  GitBranch,
  ClipboardCheck,
  Eye,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import EnhancedTable from '@/components/ui/EnhancedTable';
import { BottomSheetTabs } from '@/components/ui/BottomSheetTabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/Sheet';
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
  LLMTraceConsoleRow,
  LLMEvaluationRunRow,
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
  traceConsoleRows?: LLMTraceConsoleRow[];
  evaluationRuns?: LLMEvaluationRunRow[];
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
  | 'trace-console'
  | 'ai-usage-logs'
  | 'evaluation-runs'
  | 'model-comparison'
  | 'token-trends'
  | 'voice-quality'
  | 'budget-keys';

const TAB_IDS: TabId[] = [
  'overall-stats',
  'trace-console',
  'ai-usage-logs',
  'evaluation-runs',
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
    id: 'trace-console',
    label: 'Trace Console',
    zhLabel: '調用追蹤',
    icon: GitBranch,
    color: 'text-teal-500',
    activeColor: 'bg-teal-600 text-white',
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
    id: 'evaluation-runs',
    label: 'Evaluations',
    zhLabel: '評測紀錄',
    icon: ClipboardCheck,
    color: 'text-lime-500',
    activeColor: 'bg-lime-700 text-white',
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

function formatIsoDate(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('zh-TW');
}

function compactText(value: string | null | undefined, max = 90): string {
  if (!value) return '-';
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}

function statusBadge(status: string | null | undefined) {
  if (status === 'success' || status === 'pass') return <Badge variant="success">{status}</Badge>;
  if (status === 'warning' || status === 'timeout' || status === 'pending') {
    return <Badge variant="warning">{status}</Badge>;
  }
  if (status === 'error' || status === 'fail') return <Badge variant="error">{status}</Badge>;
  return <span className="text-gray-600 text-xs">-</span>;
}

function DetailBlock({ title, value }: { title: string; value: string | number | null | undefined }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-text-secondary">{title}</p>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-border-default bg-bg-tertiary p-3 text-xs leading-5 text-text-primary">
        {value == null || value === '' ? '-' : String(value)}
      </pre>
    </div>
  );
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

const traceConsoleColumns: ColumnDef<LLMTraceConsoleRow, unknown>[] = [
  {
    id: 'col-created-at',
    header: '時間',
    meta: { headerEn: 'Time', headerZh: '時間' },
    accessorFn: (row) => row.created_at,
    cell: ({ row }) => (
      <span className="text-gray-400 text-xs whitespace-nowrap">
        {new Date(row.original.created_at).toLocaleString('zh-TW')}
      </span>
    ),
  },
  {
    id: 'col-page',
    header: 'Page',
    meta: { headerEn: 'Page' },
    accessorFn: (row) => row.page_path ?? '',
    cell: ({ row }) => (
      <span className="font-mono text-[11px] text-gray-300" title={row.original.page_path ?? undefined}>
        {compactText(row.original.page_path, 48)}
      </span>
    ),
  },
  {
    id: 'col-company',
    header: 'Company',
    meta: { headerEn: 'Company' },
    accessorFn: (row) => row.company_name ?? '',
    cell: ({ row }) => <span className="text-xs text-gray-300">{row.original.company_name ?? '-'}</span>,
  },
  {
    id: 'col-invocation',
    header: 'Invocation / Execution',
    meta: { headerEn: 'Invocation / Execution' },
    accessorFn: (row) => `${row.invocation_name ?? ''} ${row.execution_name ?? ''}`,
    cell: ({ row }) => (
      <div className="text-xs">
        <div className="text-gray-200 truncate" title={row.original.invocation_name ?? undefined}>
          {row.original.invocation_name ?? '-'}
        </div>
        <div className="text-gray-500 truncate" title={row.original.execution_name ?? undefined}>
          {row.original.execution_name ?? '-'}
        </div>
      </div>
    ),
  },
  {
    id: 'col-provider-adapter',
    header: 'Provider / Adapter',
    meta: { headerEn: 'Provider / Adapter' },
    accessorFn: (row) => `${row.provider ?? ''} ${row.adapter_id ?? ''}`,
    cell: ({ row }) => (
      <div className="text-xs font-mono">
        <div className="text-white truncate">{row.original.provider ?? '-'}</div>
        <div className="text-gray-500 truncate" title={row.original.adapter_id ?? undefined}>
          {row.original.adapter_id ?? row.original.source_kind}
        </div>
      </div>
    ),
  },
  {
    id: 'col-models',
    header: 'Requested / Effective',
    meta: { headerEn: 'Requested / Effective Model' },
    accessorFn: (row) => `${row.requested_model ?? ''} ${row.effective_model ?? ''}`,
    cell: ({ row }) => (
      <div className="text-xs font-mono">
        <div className="text-gray-300 truncate" title={row.original.requested_model ?? undefined}>
          {row.original.requested_model ?? '-'}
        </div>
        <div className="text-emerald-300 truncate" title={row.original.effective_model ?? undefined}>
          {row.original.effective_model ?? '-'}
        </div>
      </div>
    ),
  },
  {
    id: 'col-status',
    header: 'Status',
    meta: { headerEn: 'Status' },
    accessorFn: (row) => row.status ?? '',
    cell: ({ row }) => statusBadge(row.original.status),
  },
  {
    id: 'col-http-status',
    header: 'HTTP',
    meta: { headerEn: 'HTTP Status' },
    accessorFn: (row) => row.http_status ?? 0,
    cell: ({ row }) => <span className="font-mono text-xs text-gray-300">{row.original.http_status ?? '-'}</span>,
  },
  {
    id: 'col-ttft',
    header: 'TTFT (ms)',
    meta: { headerEn: 'TTFT (ms)' },
    accessorFn: (row) => row.ttft_ms ?? 0,
    cell: ({ row }) => <span className="font-mono text-xs text-gray-300">{row.original.ttft_ms ?? '-'}</span>,
  },
  {
    id: 'col-e2e',
    header: 'E2E (ms)',
    meta: { headerEn: 'E2E (ms)' },
    accessorFn: (row) => row.e2e_ms ?? 0,
    cell: ({ row }) => <span className="font-mono text-xs text-gray-300">{row.original.e2e_ms ?? '-'}</span>,
  },
  {
    id: 'col-throughput',
    header: 'Throughput (tok/s)',
    meta: { headerEn: 'Throughput (tok/s)' },
    accessorFn: (row) => row.throughput_tokens_per_s ?? 0,
    cell: ({ row }) => (
      <span className="font-mono text-xs text-gray-300">
        {row.original.throughput_tokens_per_s != null ? row.original.throughput_tokens_per_s.toFixed(2) : '-'}
      </span>
    ),
  },
  {
    id: 'col-tokens',
    header: 'Tokens (in/out)',
    meta: { headerEn: 'Tokens (in/out)' },
    accessorFn: (row) => (row.tokens_input ?? 0) + (row.tokens_output ?? 0),
    cell: ({ row }) => (
      <span className="font-mono text-xs text-gray-300">
        {row.original.tokens_input ?? '-'}/{row.original.tokens_output ?? '-'}
      </span>
    ),
  },
  {
    id: 'col-evaluation',
    header: 'Evaluation',
    meta: { headerEn: 'Evaluation' },
    accessorFn: (row) => `${row.evaluation_label ?? ''} ${row.evaluation_message ?? ''}`,
    cell: ({ row }) => (
      <div className="text-xs">
        <div>{statusBadge(row.original.evaluation_label)}</div>
        <div className="text-gray-500 truncate mt-1" title={row.original.evaluation_message ?? undefined}>
          {compactText(row.original.evaluation_message, 70)}
        </div>
      </div>
    ),
  },
  {
    id: 'col-raw-rendered',
    header: 'Raw / Rendered',
    meta: { headerEn: 'Raw / Rendered Output' },
    enableSorting: false,
    cell: ({ row }) => (
      <div className="text-[11px] leading-5">
        <div className="text-gray-400" title={row.original.raw_output ?? undefined}>
          raw: {compactText(row.original.raw_output, 70)}
        </div>
        <div className="text-gray-300" title={row.original.rendered_output ?? undefined}>
          rendered: {compactText(row.original.rendered_output, 70)}
        </div>
      </div>
    ),
  },
];

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
  {
    id: 'col-official-input-price',
    header: '官方 Input $/1M',
    meta: { headerEn: 'Official Input $/1M' },
    accessorFn: (row) => row.official_input_price_per_1m ?? 0,
    cell: ({ row }) => {
      const price = row.original.official_input_price_per_1m;
      return <span className="font-mono text-xs text-cyan-300">{price == null ? '-' : price.toFixed(4)}</span>;
    },
  },
  {
    id: 'col-official-output-price',
    header: '官方 Output $/1M',
    meta: { headerEn: 'Official Output $/1M' },
    accessorFn: (row) => row.official_output_price_per_1m ?? 0,
    cell: ({ row }) => {
      const price = row.original.official_output_price_per_1m;
      return <span className="font-mono text-xs text-cyan-300">{price == null ? '-' : price.toFixed(4)}</span>;
    },
  },
  {
    id: 'col-official-researched-at',
    header: '調查日期',
    meta: { headerEn: 'Research Date', headerZh: '調查日期' },
    accessorFn: (row) => row.official_price_researched_at ?? '',
    cell: ({ row }) => (
      <span className="text-gray-300 text-xs whitespace-nowrap">{formatIsoDate(row.original.official_price_researched_at)}</span>
    ),
  },
  {
    id: 'col-official-source',
    header: '官方來源',
    meta: { headerEn: 'Official Source', headerZh: '官方來源' },
    accessorFn: (row) => row.official_price_source_url ?? '',
    enableSorting: false,
    cell: ({ row }) => {
      const url = row.original.official_price_source_url;
      if (!url) return <span className="text-gray-500 text-xs">-</span>;
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-cyan-300 underline underline-offset-2 hover:text-cyan-200"
        >
          source
        </a>
      );
    },
  },
];

const evaluationRunColumns: ColumnDef<LLMEvaluationRunRow, unknown>[] = [
  {
    id: 'col-created-at',
    header: '時間',
    meta: { headerEn: 'Time', headerZh: '時間' },
    accessorFn: (row) => row.created_at,
    cell: ({ row }) => (
      <span className="text-gray-400 text-xs whitespace-nowrap">
        {new Date(row.original.created_at).toLocaleString('zh-TW')}
      </span>
    ),
  },
  {
    id: 'col-adapter',
    header: 'Adapter',
    meta: { headerEn: 'Adapter' },
    accessorFn: (row) => `${row.adapter_id} ${row.channel}`,
    cell: ({ row }) => (
      <div className="text-xs font-mono">
        <div className="text-gray-200 truncate" title={row.original.adapter_id}>
          {row.original.adapter_id}
        </div>
        <div className="text-gray-500">{row.original.channel}</div>
      </div>
    ),
  },
  {
    id: 'col-provider',
    header: 'Provider',
    meta: { headerEn: 'Provider' },
    accessorFn: (row) => row.provider,
    cell: ({ row }) => <span className="text-xs text-gray-300">{row.original.provider}</span>,
  },
  {
    id: 'col-models',
    header: 'Requested / Effective',
    meta: { headerEn: 'Requested / Effective Model' },
    accessorFn: (row) => `${row.requested_model} ${row.effective_model}`,
    cell: ({ row }) => (
      <div className="text-xs font-mono">
        <div className="text-gray-300 truncate" title={row.original.requested_model}>
          {row.original.requested_model || '-'}
        </div>
        <div className="text-emerald-300 truncate" title={row.original.effective_model}>
          {row.original.effective_model || '-'}
        </div>
      </div>
    ),
  },
  {
    id: 'col-evaluation',
    header: 'Evaluation',
    meta: { headerEn: 'Evaluation' },
    accessorFn: (row) => `${row.evaluation_level} ${row.evaluation_message}`,
    cell: ({ row }) => (
      <div className="text-xs">
        {statusBadge(row.original.evaluation_level)}
        <div className="text-gray-500 truncate mt-1" title={row.original.evaluation_message}>
          {compactText(row.original.evaluation_message, 80)}
        </div>
      </div>
    ),
  },
  {
    id: 'col-ttft',
    header: 'TTFT (ms)',
    meta: { headerEn: 'TTFT (ms)' },
    accessorFn: (row) => row.ttft_ms ?? 0,
    cell: ({ row }) => <span className="font-mono text-xs text-gray-300">{row.original.ttft_ms ?? '-'}</span>,
  },
  {
    id: 'col-e2e',
    header: 'E2E (ms)',
    meta: { headerEn: 'E2E (ms)' },
    accessorFn: (row) => row.e2e_ms ?? 0,
    cell: ({ row }) => <span className="font-mono text-xs text-gray-300">{row.original.e2e_ms ?? '-'}</span>,
  },
  {
    id: 'col-throughput',
    header: 'Throughput (tok/s)',
    meta: { headerEn: 'Throughput (tok/s)' },
    accessorFn: (row) => row.tokens_per_sec ?? 0,
    cell: ({ row }) => (
      <span className="font-mono text-xs text-gray-300">
        {row.original.tokens_per_sec != null ? row.original.tokens_per_sec.toFixed(2) : '-'}
      </span>
    ),
  },
  {
    id: 'col-http',
    header: 'HTTP',
    meta: { headerEn: 'HTTP Status' },
    accessorFn: (row) => row.http_status ?? 0,
    cell: ({ row }) => <span className="font-mono text-xs text-gray-300">{row.original.http_status ?? '-'}</span>,
  },
  {
    id: 'col-output',
    header: 'Output',
    meta: { headerEn: 'Output' },
    enableSorting: false,
    cell: ({ row }) => (
      <div className="text-[11px] leading-5">
        <div className="text-gray-400" title={row.original.raw_output ?? undefined}>
          raw: {compactText(row.original.raw_output, 80)}
        </div>
        <div className="text-gray-300" title={row.original.rendered_output ?? undefined}>
          rendered: {compactText(row.original.rendered_output, 80)}
        </div>
      </div>
    ),
  },
];

const USAGE_LOG_WIDTHS = [13, 9, 14, 16, 8, 8, 8, 8, 16];
const MODEL_COMPARISON_WIDTHS = [8, 14, 8, 8, 9, 10, 10, 10, 9, 9, 7, 8];
const TRACE_CONSOLE_WIDTHS = [6, 9, 6, 10, 9, 10, 5, 4, 5, 5, 7, 7, 9, 5, 3];
const EVALUATION_RUN_WIDTHS = [10, 14, 8, 16, 15, 7, 7, 8, 5, 10];

export default function LLMMonitorClient({
  overallStats,
  aggregateStats,
  usageLogs,
  monitorConfig,
  dailyTokenSeries,
  weeklyTokenSeries,
  voiceQualitySeries,
  traceConsoleRows = [],
  evaluationRuns = [],
}: LLMMonitorClientPropsV2) {
  const router = useRouter();
  const [traceDetailRow, setTraceDetailRow] = useState<LLMTraceConsoleRow | null>(null);
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

  const traceConsoleColumnsWithDetail = useMemo<ColumnDef<LLMTraceConsoleRow, unknown>[]>(
    () => [
      ...traceConsoleColumns,
      {
        id: 'col-detail',
        header: '',
        meta: { headerEn: 'Detail' },
        enableSorting: false,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => setTraceDetailRow(row.original)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#3A3A3A] text-gray-300 transition hover:border-teal-400 hover:text-teal-200"
            title="查看完整 Trace"
            aria-label="查看完整 Trace"
          >
            <Eye className="h-3.5 w-3.5" aria-hidden />
          </button>
        ),
      },
    ],
    [],
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
        if (tab.id === 'trace-console') return { ...tab, badge: traceConsoleRows.length };
        if (tab.id === 'ai-usage-logs') return { ...tab, badge: usageLogs.length };
        if (tab.id === 'evaluation-runs') return { ...tab, badge: evaluationRuns.length };
        if (tab.id === 'model-comparison') return { ...tab, badge: aggregateStats.length };
        if (tab.id === 'voice-quality') return { ...tab, badge: voiceQualitySeries.length };
        return tab;
      }),
    [traceConsoleRows.length, usageLogs.length, evaluationRuns.length, aggregateStats.length, voiceQualitySeries.length],
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

        {activeTab === 'trace-console' && (
          <div className="space-y-2 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-200">LLM 調用追蹤</h2>
                <p className="text-xs text-gray-500 mt-1">
                  統一檢視 page、company、invocation、execution、model、raw/rendered output、evaluation 與 latency。
                </p>
              </div>
              <span className="text-xs text-gray-500">{traceConsoleRows.length} 筆</span>
            </div>

            <EnhancedTable<LLMTraceConsoleRow>
              tableId="llm_trace_console"
              columns={traceConsoleColumnsWithDetail}
              data={traceConsoleRows}
              initialWidths={TRACE_CONSOLE_WIDTHS}
              pageSizes={[20, 50, 100]}
              minWidth={1900}
              getCategoryValue={(row) => row.source_kind}
              getSearchValue={(row) =>
                [
                  row.page_path,
                  row.company_name,
                  row.module_key,
                  row.invocation_name,
                  row.execution_name,
                  row.provider,
                  row.adapter_id,
                  row.requested_model,
                  row.effective_model,
                  row.evaluation_label,
                  row.evaluation_message,
                  row.error_message,
                ]
                  .filter(Boolean)
                  .join(' ')
              }
            />
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

        {activeTab === 'evaluation-runs' && (
          <div className="space-y-2 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-200">Evaluation Runs</h2>
                <p className="text-xs text-gray-500 mt-1">
                  先收斂 Adapter 全域評測紀錄；後續 evaluator/judge call 會寫入同一觀測模型。
                </p>
              </div>
              <span className="text-xs text-gray-500">{evaluationRuns.length} 筆</span>
            </div>

            <EnhancedTable<LLMEvaluationRunRow>
              tableId="llm_evaluation_runs"
              columns={evaluationRunColumns}
              data={evaluationRuns}
              initialWidths={EVALUATION_RUN_WIDTHS}
              pageSizes={[20, 50, 100]}
              minWidth={1450}
              getCategoryValue={(row) => row.evaluation_level}
              getSearchValue={(row) =>
                [
                  row.adapter_id,
                  row.channel,
                  row.provider,
                  row.adapter_option_label,
                  row.requested_model,
                  row.effective_model,
                  row.evaluation_level,
                  row.evaluation_message,
                  row.result_summary,
                  row.error_type,
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
              <div>
                <h2 className="text-sm font-semibold text-gray-200">模型比較</h2>
                <p className="text-xs text-gray-500 mt-1">
                  僅統計 Evaluations Global 已測模型；官方牌價與調查日期來自 model research 快取。
                </p>
              </div>
              <span className="text-xs text-gray-500">{aggregateStats.length} 個模型</span>
            </div>

            <EnhancedTable<LLMAggregateStat>
              tableId="llm_model_comparison"
              columns={modelComparisonColumns}
              data={sortedAggregateStats}
              initialWidths={MODEL_COMPARISON_WIDTHS}
              minWidth={1100}
              getSearchValue={(row) =>
                [
                  row.provider,
                  row.model_id,
                  row.display_key,
                  row.official_price_source_url ?? '',
                  row.official_price_researched_at ?? '',
                ]
                  .filter(Boolean)
                  .join(' ')
              }
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

      <Sheet
        open={traceDetailRow != null}
        onOpenChange={(open) => {
          if (!open) setTraceDetailRow(null);
        }}
      >
        <SheetContent className="w-full sm:max-w-[min(96vw,42rem)] lg:max-w-[min(96vw,58rem)]">
          {traceDetailRow ? (
            <>
              <SheetHeader>
                <SheetTitle>Trace Detail</SheetTitle>
                <SheetDescription>
                  {traceDetailRow.page_path ?? '-'} · {traceDetailRow.provider ?? '-'} ·{' '}
                  <span className="font-mono">{traceDetailRow.effective_model ?? traceDetailRow.requested_model ?? '-'}</span>
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-6 pb-8">
                <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
                  <div>
                    <p className="text-text-muted">Status</p>
                    <div className="mt-1">{statusBadge(traceDetailRow.status)}</div>
                  </div>
                  <div>
                    <p className="text-text-muted">HTTP</p>
                    <p className="mt-1 font-mono text-text-primary">{traceDetailRow.http_status ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-text-muted">TTFT / E2E</p>
                    <p className="mt-1 font-mono text-text-primary">
                      {traceDetailRow.ttft_ms ?? '-'} / {traceDetailRow.e2e_ms ?? '-'} ms
                    </p>
                  </div>
                  <div>
                    <p className="text-text-muted">Throughput</p>
                    <p className="mt-1 font-mono text-text-primary">
                      {traceDetailRow.throughput_tokens_per_s != null
                        ? `${traceDetailRow.throughput_tokens_per_s.toFixed(2)} tok/s`
                        : '-'}
                    </p>
                  </div>
                </div>

                <DetailBlock title="Invocation / Execution" value={`${traceDetailRow.invocation_name ?? '-'} / ${traceDetailRow.execution_name ?? '-'}`} />
                <DetailBlock title="Company" value={traceDetailRow.company_name} />
                <DetailBlock title="Test File" value={traceDetailRow.test_file_name} />
                <DetailBlock title="Input Prompt" value={traceDetailRow.input_prompt ?? traceDetailRow.test_prompt} />
                <DetailBlock title="Raw Output" value={traceDetailRow.raw_output} />
                <DetailBlock title="Rendered Output" value={traceDetailRow.rendered_output} />
                <DetailBlock
                  title="Evaluation"
                  value={[
                    traceDetailRow.evaluation_label ? `label: ${traceDetailRow.evaluation_label}` : null,
                    traceDetailRow.evaluation_score != null ? `score: ${traceDetailRow.evaluation_score}` : null,
                    traceDetailRow.evaluation_message,
                  ]
                    .filter(Boolean)
                    .join('\n')}
                />
                <DetailBlock title="Error" value={traceDetailRow.error_message} />
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
