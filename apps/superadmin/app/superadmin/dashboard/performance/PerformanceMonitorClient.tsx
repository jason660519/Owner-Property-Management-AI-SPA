'use client';

import { Gauge, Clock, BarChart2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getLCPRating, getCLSRating, getTTFBRating } from './vitals-utils';
import type { PerformanceOverview, PageVitalSummary, WebVital } from './actions';

interface PerformanceMonitorClientProps {
  overview: PerformanceOverview;
  pageSummaries: PageVitalSummary[];
  recentVitals: WebVital[];
}

const RATING_COLORS = {
  good: 'text-emerald-400',
  'needs-improvement': 'text-yellow-400',
  poor: 'text-red-400',
  'no-data': 'text-gray-500',
};

const RATING_BG = {
  good: 'bg-emerald-500/10',
  'needs-improvement': 'bg-yellow-500/10',
  poor: 'bg-red-500/10',
  'no-data': 'bg-gray-500/10',
};

function RatingBadge({ rating }: { rating: 'good' | 'needs-improvement' | 'poor' | 'no-data' }) {
  const labels = {
    good: '良好',
    'needs-improvement': '需改善',
    poor: '差',
    'no-data': '-',
  };
  return (
    <Badge
      variant={
        rating === 'good' ? 'success' : rating === 'needs-improvement' ? 'warning' : rating === 'poor' ? 'error' : 'default'
      }
    >
      {labels[rating]}
    </Badge>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  rating: 'good' | 'needs-improvement' | 'poor' | 'no-data';
  threshold: string;
}

function MetricCard({ label, value, rating, threshold }: MetricCardProps) {
  const Icon = rating === 'good' ? CheckCircle : AlertCircle;
  return (
    <Card className="bg-[#2A2A2A] border-[#333333]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${RATING_COLORS[rating]}`}>{value}</p>
            <p className="text-xs text-gray-600 mt-1">{threshold}</p>
          </div>
          <div className={`p-2 rounded-lg ${RATING_BG[rating]}`}>
            <Icon className={`w-4 h-4 ${RATING_COLORS[rating]}`} />
          </div>
        </div>
        <div className="mt-3">
          <RatingBadge rating={rating} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function PerformanceMonitorClient({
  overview,
  pageSummaries,
  recentVitals,
}: PerformanceMonitorClientProps) {
  const lcpRating = getLCPRating(overview.avg_lcp_ms);
  const clsRating = getCLSRating(overview.avg_cls);
  const ttfbRating = getTTFBRating(overview.avg_ttfb_ms);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-[#1A1A1A] min-h-screen text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Gauge className="h-7 w-7 text-cyan-400" />
            網站效能監控
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Core Web Vitals · 近 7 天 · {overview.total_samples.toLocaleString()} 筆樣本</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-3 py-2 rounded-md border border-[#333333] text-gray-400 hover:text-white text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          刷新
        </button>
      </div>

      {/* Core Web Vitals overview */}
      {overview.total_samples === 0 ? (
        <Card className="bg-[#2A2A2A] border-[#333333]">
          <CardContent className="p-10 text-center text-gray-500">
            <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>尚無效能資料</p>
            <p className="text-xs mt-1 text-gray-600">在前端埋入 Web Vitals 上報後此處將顯示資料</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              label="LCP · Largest Contentful Paint"
              value={`${overview.avg_lcp_ms}ms`}
              rating={lcpRating}
              threshold="良好 <2500ms · 差 ≥4000ms"
            />
            <MetricCard
              label="CLS · Cumulative Layout Shift"
              value={overview.avg_cls.toFixed(3)}
              rating={clsRating}
              threshold="良好 <0.1 · 差 ≥0.25"
            />
            <MetricCard
              label="TTFB · Time to First Byte"
              value={`${overview.avg_ttfb_ms}ms`}
              rating={ttfbRating}
              threshold="良好 <800ms · 差 ≥1800ms"
            />
          </div>

          {/* LCP Distribution */}
          <Card className="bg-[#2A2A2A] border-[#333333]">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">LCP 評分分佈</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-[#1A1A1A] rounded-full h-4 overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all"
                    style={{ width: `${overview.good_lcp_pct}%` }}
                    title={`良好: ${overview.good_lcp_pct}%`}
                  />
                  <div
                    className="bg-yellow-500 h-full transition-all"
                    style={{ width: `${overview.needs_improvement_lcp_pct}%` }}
                    title={`需改善: ${overview.needs_improvement_lcp_pct}%`}
                  />
                  <div
                    className="bg-red-500 h-full transition-all"
                    style={{ width: `${overview.poor_lcp_pct}%` }}
                    title={`差: ${overview.poor_lcp_pct}%`}
                  />
                </div>
                <div className="flex gap-4 text-xs whitespace-nowrap">
                  <span className="text-emerald-400">良好 {overview.good_lcp_pct}%</span>
                  <span className="text-yellow-400">改善 {overview.needs_improvement_lcp_pct}%</span>
                  <span className="text-red-400">差 {overview.poor_lcp_pct}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Per-page Summary */}
      {pageSummaries.length > 0 && (
        <Card className="bg-[#2A2A2A] border-[#333333]">
          <CardHeader className="border-b border-[#333333] pb-4">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              各頁面效能摘要
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="border-b border-[#333333] text-gray-400 text-xs">
                  <tr>
                    <th className="px-4 py-3">頁面路徑</th>
                    <th className="px-4 py-3 text-right">樣本數</th>
                    <th className="px-4 py-3 text-right">avg LCP</th>
                    <th className="px-4 py-3 text-right">p75 LCP</th>
                    <th className="px-4 py-3 text-right">avg CLS</th>
                    <th className="px-4 py-3 text-right">avg TTFB</th>
                    <th className="px-4 py-3 text-center">LCP 評級</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#333333]">
                  {pageSummaries.map(p => {
                    const rating = getLCPRating(p.avg_lcp_ms);
                    return (
                      <tr key={p.page_path} className="hover:bg-[#333333]/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-white max-w-[200px] truncate" title={p.page_path}>
                          {p.page_path}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300">{p.sample_count}</td>
                        <td className={`px-4 py-3 text-right ${RATING_COLORS[rating]}`}>
                          {p.avg_lcp_ms != null ? `${p.avg_lcp_ms}ms` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-400">
                          {p.p75_lcp_ms != null ? `${p.p75_lcp_ms}ms` : '-'}
                        </td>
                        <td className={`px-4 py-3 text-right ${getCLSRating(p.avg_cls) === 'good' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                          {p.avg_cls != null ? p.avg_cls.toFixed(3) : '-'}
                        </td>
                        <td className={`px-4 py-3 text-right ${getTTFBRating(p.avg_ttfb_ms) === 'good' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                          {p.avg_ttfb_ms != null ? `${p.avg_ttfb_ms}ms` : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <RatingBadge rating={rating} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Vitals */}
      {recentVitals.length > 0 && (
        <Card className="bg-[#2A2A2A] border-[#333333]">
          <CardHeader className="border-b border-[#333333] pb-4">
            <CardTitle className="text-white text-base">
              最新記錄
              <span className="text-gray-400 text-sm font-normal ml-2">最新 50 筆</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="border-b border-[#333333] text-gray-400 text-xs">
                  <tr>
                    <th className="px-4 py-3">時間</th>
                    <th className="px-4 py-3">頁面</th>
                    <th className="px-4 py-3 text-right">LCP</th>
                    <th className="px-4 py-3 text-right">CLS</th>
                    <th className="px-4 py-3 text-right">TTFB</th>
                    <th className="px-4 py-3 text-right">FCP</th>
                    <th className="px-4 py-3">裝置</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#333333]">
                  {recentVitals.map(v => (
                    <tr key={v.id} className="hover:bg-[#333333]/50 transition-colors">
                      <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">
                        {new Date(v.created_at).toLocaleString('zh-TW')}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-white max-w-[160px] truncate" title={v.page_path}>
                        {v.page_path}
                      </td>
                      <td className={`px-4 py-2.5 text-right text-xs ${RATING_COLORS[getLCPRating(v.lcp_ms)]}`}>
                        {v.lcp_ms != null ? `${v.lcp_ms}ms` : '-'}
                      </td>
                      <td className={`px-4 py-2.5 text-right text-xs ${RATING_COLORS[getCLSRating(v.cls_score)]}`}>
                        {v.cls_score != null ? v.cls_score.toFixed(3) : '-'}
                      </td>
                      <td className={`px-4 py-2.5 text-right text-xs ${RATING_COLORS[getTTFBRating(v.ttfb_ms)]}`}>
                        {v.ttfb_ms != null ? `${v.ttfb_ms}ms` : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-gray-400">
                        {v.fcp_ms != null ? `${v.fcp_ms}ms` : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">
                        {v.device_type ?? '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
