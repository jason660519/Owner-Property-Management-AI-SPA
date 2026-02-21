'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import type { DailyStatRow } from '../actions';

interface BehaviorChartProps {
  dailyStats: DailyStatRow[];
}

export default function BehaviorChart({ dailyStats }: BehaviorChartProps) {
  if (dailyStats.length === 0) {
    return (
      <Card className="bg-[#2A2A2A] border-[#333333]">
        <CardHeader>
          <CardTitle className="text-white text-base">近 30 天流量趨勢</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
            暫無資料
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxEvents = Math.max(...dailyStats.map(d => d.total_events), 1);
  const chartHeight = 140;
  const chartWidth = 100; // percentage-based points
  const points = dailyStats.slice(-30);
  const pointCount = points.length;

  // Build SVG polyline points for total_events
  const buildPolyline = (data: DailyStatRow[], key: keyof DailyStatRow) => {
    return data
      .map((d, i) => {
        const x = pointCount > 1 ? (i / (pointCount - 1)) * chartWidth : chartWidth / 2;
        const val = Number(d[key]) || 0;
        const y = chartHeight - (val / maxEvents) * chartHeight;
        return `${x},${y}`;
      })
      .join(' ');
  };

  const totalPoints = buildPolyline(points, 'total_events');
  const anomalyPoints = buildPolyline(points, 'anomaly_count');

  // Format date labels (show first, middle, last)
  const labelIndices = [0, Math.floor(pointCount / 2), pointCount - 1];
  const getLabel = (idx: number) => {
    const d = points[idx];
    if (!d) return '';
    const date = new Date(d.stat_date);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <Card className="bg-[#2A2A2A] border-[#333333]">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-base flex items-center justify-between">
          <span>近 30 天流量趨勢</span>
          <div className="flex items-center gap-4 text-xs font-normal">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-blue-400 inline-block" />
              總事件
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-red-400 inline-block" />
              異常
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 h-[140px] flex flex-col justify-between text-xs text-gray-500 w-10">
            <span>{maxEvents.toLocaleString()}</span>
            <span>{Math.round(maxEvents / 2).toLocaleString()}</span>
            <span>0</span>
          </div>

          {/* Chart area */}
          <div className="ml-12">
            <svg
              viewBox={`0 0 100 ${chartHeight}`}
              preserveAspectRatio="none"
              className="w-full"
              style={{ height: `${chartHeight}px` }}
            >
              {/* Grid lines */}
              {[0, 0.5, 1].map((ratio, i) => (
                <line
                  key={i}
                  x1="0"
                  y1={chartHeight * ratio}
                  x2="100"
                  y2={chartHeight * ratio}
                  stroke="#333"
                  strokeWidth="0.5"
                />
              ))}

              {/* Total events line */}
              <polyline
                points={totalPoints}
                fill="none"
                stroke="#60A5FA"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Anomaly line */}
              <polyline
                points={anomalyPoints}
                fill="none"
                stroke="#F87171"
                strokeWidth="1"
                strokeDasharray="2,2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {/* X-axis labels */}
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              {labelIndices.map(idx => (
                <span key={idx}>{getLabel(idx)}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-[#333333]">
          {points.slice(-3).reverse().map(d => (
            <div key={d.stat_date} className="text-center">
              <div className="text-xs text-gray-400">
                {new Date(d.stat_date).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })}
              </div>
              <div className="text-sm font-medium text-white">{Number(d.total_events).toLocaleString()}</div>
              {Number(d.anomaly_count) > 0 && (
                <div className="text-xs text-red-400">{d.anomaly_count} 異常</div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
