'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { TrendingUp } from 'lucide-react';

type DateRange = '30天' | '90天' | '180天';

// Mock data sets for each date range (last N days → weekly buckets)
const CHART_DATA: Record<DateRange, { label: string; users: number; active: number }[]> = {
  '30天': [
    { label: 'W1', users: 310, active: 245 },
    { label: 'W2', users: 320, active: 255 },
    { label: 'W3', users: 335, active: 268 },
    { label: 'W4', users: 350, active: 280 },
  ],
  '90天': [
    { label: 'Jan W1', users: 270, active: 200 },
    { label: 'Jan W3', users: 280, active: 210 },
    { label: 'Feb W1', users: 310, active: 240 },
    { label: 'Feb W3', users: 320, active: 255 },
    { label: 'Mar W1', users: 335, active: 268 },
    { label: 'Mar W3', users: 350, active: 280 },
  ],
  '180天': [
    { label: 'Sep', users: 120, active: 80 },
    { label: 'Oct', users: 150, active: 100 },
    { label: 'Nov', users: 180, active: 130 },
    { label: 'Dec', users: 220, active: 160 },
    { label: 'Jan', users: 280, active: 210 },
    { label: 'Feb', users: 350, active: 280 },
  ],
};

const DATE_RANGES: DateRange[] = ['30天', '90天', '180天'];

export function SystemGrowthChart() {
  const [selectedRange, setSelectedRange] = useState<DateRange>('30天');
  const data = CHART_DATA[selectedRange];
  const maxVal = Math.max(...data.map((d) => d.users), 1) * 1.2;

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            系統成長趨勢
          </CardTitle>
          {/* T-09: Date range filter */}
          <div
            data-testid="date-range-filter"
            className="flex items-center gap-1 rounded-lg border border-border-default bg-bg-secondary p-0.5"
            role="group"
            aria-label="日期篩選"
          >
            {DATE_RANGES.map((range) => {
              const isActive = range === selectedRange;
              return (
                <button
                  key={range}
                  data-active={isActive}
                  onClick={() => setSelectedRange(range)}
                  className={[
                    'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary',
                  ].join(' ')}
                  aria-pressed={isActive}
                >
                  {range}
                </button>
              );
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full flex items-end gap-2 p-4">
          {data.map((item, index) => (
            <div
              key={index}
              data-testid={`bar-${index}`}
              className="flex-1 flex flex-col items-center gap-2 group"
            >
              <div className="w-full flex items-end justify-center gap-1 h-full relative">
                {/* Users Bar */}
                <div
                  className="w-1/2 bg-blue-500/50 hover:bg-blue-500 transition-all rounded-t-sm relative group-hover:scale-y-105 origin-bottom"
                  style={{ height: `${(item.users / maxVal) * 100}%` }}
                >
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-bg-primary text-xs text-text-primary border border-border-default shadow-md px-2 py-1 rounded whitespace-nowrap z-10">
                    總用戶: {item.users}
                  </div>
                </div>
                {/* Active Users Bar */}
                <div
                  className="w-1/2 bg-green-500/50 hover:bg-green-500 transition-all rounded-t-sm relative group-hover:scale-y-105 origin-bottom"
                  style={{ height: `${(item.active / maxVal) * 100}%` }}
                >
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-bg-primary text-xs text-text-primary border border-border-default shadow-md px-2 py-1 rounded whitespace-nowrap z-10">
                    活躍: {item.active}
                  </div>
                </div>
              </div>
              <span className="text-xs text-text-secondary font-medium truncate w-full text-center">
                {item.label}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-6 mt-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-xs text-text-secondary">總用戶數</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-xs text-text-secondary">活躍用戶</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
