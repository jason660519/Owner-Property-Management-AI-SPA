'use client';

import { Brain, Clock, DollarSign, Star, Layers, RefreshCw, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { AIUsageLog, LLMOverallStats, LLMAggregateStat, LLMMetric } from './actions';

interface LLMMonitorClientPropsV2 {
  overallStats: LLMOverallStats;
  aggregateStats: LLMAggregateStat[];
  recentMetrics: LLMMetric[];
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

export default function LLMMonitorClient({
  overallStats,
  aggregateStats,
  recentMetrics,
  usageLogs,
}: LLMMonitorClientPropsV2) {
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

      {/* Overall Stats */}
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

      {/* Per-Model Stats */}
      <Card className="bg-[#2A2A2A] border-[#333333]">
        <CardHeader className="border-b border-[#333333] pb-4">
          <CardTitle className="text-white text-base">各模型效能比較</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-[#333333] text-gray-400 text-xs">
                <tr>
                  <th className="px-4 py-3">模型 ID</th>
                  <th className="px-4 py-3 text-right">請求數</th>
                  <th className="px-4 py-3 text-right">平均延遲</th>
                  <th className="px-4 py-3 text-right">Prompt Tokens</th>
                  <th className="px-4 py-3 text-right">Completion Tokens</th>
                  <th className="px-4 py-3 text-right">總花費</th>
                  <th className="px-4 py-3 text-right">平均評分</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333333]">
                {aggregateStats.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      暫無資料
                    </td>
                  </tr>
                ) : (
                  aggregateStats
                    .sort((a, b) => b.total_requests - a.total_requests)
                    .map(stat => (
                      <tr key={stat.model_id} className="hover:bg-[#333333]/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-white font-mono text-xs">
                          {stat.model_id}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300">
                          {stat.total_requests.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {getLatencyBadge(stat.avg_latency_ms)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300">
                          {stat.avg_prompt_tokens.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300">
                          {stat.avg_completion_tokens.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-yellow-400">
                          ${stat.total_cost}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {stat.avg_feedback > 0 ? (
                            <span className="flex items-center justify-end gap-1 text-orange-400">
                              <Star className="w-3 h-3" />
                              {stat.avg_feedback}
                            </span>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Requests */}
      <Card className="bg-[#2A2A2A] border-[#333333]">
        <CardHeader className="border-b border-[#333333] pb-4">
          <CardTitle className="text-white text-base">
            最近請求記錄
            <span className="text-gray-400 text-sm font-normal ml-2">最新 50 筆</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-[#333333] text-gray-400 text-xs">
                <tr>
                  <th className="px-4 py-3">時間</th>
                  <th className="px-4 py-3">模型</th>
                  <th className="px-4 py-3 text-right">延遲</th>
                  <th className="px-4 py-3 text-right">Prompt</th>
                  <th className="px-4 py-3 text-right">Completion</th>
                  <th className="px-4 py-3 text-right">花費</th>
                  <th className="px-4 py-3 text-center">評分</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333333]">
                {recentMetrics.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      暫無資料
                    </td>
                  </tr>
                ) : (
                  recentMetrics.map(metric => (
                    <tr key={metric.id} className="hover:bg-[#333333]/50 transition-colors">
                      <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">
                        {new Date(metric.created_at).toLocaleString('zh-TW')}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-white">
                        {metric.model_id ?? '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {metric.latency_ms != null ? (
                          <span
                            className={
                              metric.latency_ms > 1500
                                ? 'text-red-400'
                                : metric.latency_ms > 500
                                ? 'text-yellow-400'
                                : 'text-emerald-400'
                            }
                          >
                            {metric.latency_ms}ms
                          </span>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-300 text-xs">
                        {metric.prompt_tokens?.toLocaleString() ?? '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-300 text-xs">
                        {metric.completion_tokens?.toLocaleString() ?? '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-yellow-400 text-xs">
                        {metric.total_cost != null ? `$${metric.total_cost}` : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {metric.user_feedback_score != null ? (
                          <span className="flex items-center justify-center gap-1 text-orange-400 text-xs">
                            <Star className="w-3 h-3" />
                            {metric.user_feedback_score}
                          </span>
                        ) : (
                          <span className="text-gray-600 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#2A2A2A] border-[#333333]">
        <CardHeader className="border-b border-[#333333] pb-4">
          <CardTitle className="text-white text-base">
            AI 使用紀錄（含 Prompt / 模組 / 狀態）
            <span className="text-gray-400 text-sm font-normal ml-2">最新 100 筆</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-[#333333] text-gray-400 text-xs">
                <tr>
                  <th className="px-4 py-3">時間</th>
                  <th className="px-4 py-3">模組</th>
                  <th className="px-4 py-3">Provider / Model</th>
                  <th className="px-4 py-3">Prompt</th>
                  <th className="px-4 py-3 text-center">狀態</th>
                  <th className="px-4 py-3 text-right">延遲</th>
                  <th className="px-4 py-3 text-right">Input</th>
                  <th className="px-4 py-3 text-right">Output</th>
                  <th className="px-4 py-3">錯誤</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333333]">
                {usageLogs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      暫無資料
                    </td>
                  </tr>
                ) : (
                  usageLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#333333]/50 transition-colors">
                      <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('zh-TW')}
                      </td>
                      <td className="px-4 py-2.5 text-gray-200 text-xs whitespace-nowrap">
                        {log.module_key ?? '-'}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-white whitespace-nowrap">
                        {log.provider}/{log.model_id}
                      </td>
                      <td className="px-4 py-2.5 text-gray-300 text-xs">
                        <div className="whitespace-nowrap">
                          {log.prompt_name ?? '-'}
                          {log.prompt_source ? <span className="text-gray-500"> ({log.prompt_source})</span> : null}
                          {log.prompt_version != null ? <span className="text-gray-500"> v{log.prompt_version}</span> : null}
                        </div>
                        {log.final_prompt_hash ? (
                          <div className="text-gray-500 font-mono text-[10px]">hash:{log.final_prompt_hash.slice(0, 12)}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {log.status === 'success' ? (
                          <Badge variant="success">success</Badge>
                        ) : log.status === 'timeout' ? (
                          <Badge variant="warning">timeout</Badge>
                        ) : log.status === 'error' ? (
                          <Badge variant="error">error</Badge>
                        ) : (
                          <span className="text-gray-600 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-300 text-xs whitespace-nowrap">
                        {log.duration_ms != null ? `${log.duration_ms}ms` : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-300 text-xs whitespace-nowrap">
                        {log.tokens_input?.toLocaleString() ?? '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-300 text-xs whitespace-nowrap">
                        {log.tokens_output?.toLocaleString() ?? '-'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">
                        {log.error_message ?? '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
