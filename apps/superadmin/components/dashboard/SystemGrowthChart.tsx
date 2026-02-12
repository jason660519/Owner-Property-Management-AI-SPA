'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { TrendingUp } from 'lucide-react';

export function SystemGrowthChart() {
  // Mock data for the last 6 months
  const data = [
    { month: 'Sep', users: 120, active: 80 },
    { month: 'Oct', users: 150, active: 100 },
    { month: 'Nov', users: 180, active: 130 },
    { month: 'Dec', users: 220, active: 160 },
    { month: 'Jan', users: 280, active: 210 },
    { month: 'Feb', users: 350, active: 280 },
  ];

  const maxVal = 400;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          系統成長趨勢
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full flex items-end gap-4 p-4">
          {data.map((item, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-2 group">
              <div className="w-full flex items-end justify-center gap-1 h-full relative">
                 {/* Users Bar */}
                <div
                  className="w-1/2 bg-blue-500/50 hover:bg-blue-500 transition-all rounded-t-sm relative group-hover:scale-y-105 origin-bottom"
                  style={{ height: `${(item.users / maxVal) * 100}%` }}
                >
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-xs text-white px-2 py-1 rounded whitespace-nowrap z-10">
                        總用戶: {item.users}
                    </div>
                </div>
                {/* Active Users Bar */}
                <div
                  className="w-1/2 bg-green-500/50 hover:bg-green-500 transition-all rounded-t-sm relative group-hover:scale-y-105 origin-bottom"
                  style={{ height: `${(item.active / maxVal) * 100}%` }}
                >
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-xs text-white px-2 py-1 rounded whitespace-nowrap z-10">
                        活躍: {item.active}
                    </div>
                </div>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{item.month}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-6 mt-2">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-xs text-gray-500 dark:text-gray-400">總用戶數</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-500 dark:text-gray-400">活躍用戶</span>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
