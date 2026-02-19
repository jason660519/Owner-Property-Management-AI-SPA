// filepath: apps/superadmin/app/superadmin/dashboard/project-progress/components/OperationsTab.tsx
// created: 2026-02-19 | creator: Claude Opus 4.6

'use client';

import React, { useMemo, useState } from 'react';
import type { RoadmapFeature } from '@/app/data/roadmap';
import { Search } from 'lucide-react';
import { clsx } from 'clsx';

const COLUMN_HEADERS = [
  { en: 'ID', zh: '編碼', width: 5 },
  { en: 'Category', zh: '分類', width: 10 },
  { en: 'Feature', zh: '功能需求名稱', width: 20 },
  { en: 'Uptime', zh: '正常運行率 %', width: 12 },
  { en: 'Error Rate', zh: '錯誤率 %', width: 12 },
  { en: 'Avg Response', zh: '平均回應 (ms)', width: 13 },
  { en: 'Last Incident', zh: '最近事件', width: 15 },
  { en: 'Last Modified', zh: '最後修改者', width: 13 },
];

interface OperationsTabProps {
  features: RoadmapFeature[];
}

export const OperationsTab = ({ features }: OperationsTabProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    return features.filter(f =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [features, searchQuery]);

  return (
    <>
      {/* Search */}
      <div className="bg-bg-primary p-4 rounded-lg border border-border-default shadow-sm flex-none transition-colors">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
          <input type="text" placeholder="Search features..."
            className="w-full bg-bg-secondary border border-border-default rounded-md pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-text-primary placeholder-text-muted transition-all"
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-bg-primary border border-border-default rounded-lg shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 transition-colors">
        <div className="overflow-y-auto flex-1 min-h-0">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-bg-secondary border-b border-border-default flex w-full min-w-0">
            {COLUMN_HEADERS.map(h => (
              <div key={h.en} className="px-4 py-3 text-xs font-semibold text-text-secondary tracking-wider border-r border-border-default last:border-r-0 flex flex-col"
                style={{ width: `${h.width}%`, flexShrink: 0, flexGrow: 0 }}>
                <span className="uppercase">{h.en}</span>
                <span className="text-[10px] text-text-muted">{h.zh}</span>
              </div>
            ))}
          </div>
          {/* Body */}
          <div className="divide-y divide-border-light">
            {filtered.map((feature, rowIdx) => (
              <div key={feature.name} className="flex items-stretch min-h-[60px] hover:bg-bg-secondary transition-colors">
                <div className="px-2 py-3 border-r border-border-light flex items-center" style={{ width: '5%', flexShrink: 0 }}>
                  <span className="font-mono text-xs text-text-secondary">{(rowIdx + 1).toString().padStart(3, '0')}</span>
                </div>
                <div className="px-4 py-3 border-r border-border-light flex items-center" style={{ width: '10%', flexShrink: 0 }}>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-bg-tertiary text-text-primary truncate">{feature.category}</span>
                </div>
                <div className="px-4 py-3 border-r border-border-light flex items-center" style={{ width: '20%', flexShrink: 0 }}>
                  <span className="text-sm font-medium text-text-primary break-words line-clamp-2">{feature.name}</span>
                </div>
                <div className="px-4 py-3 border-r border-border-light flex items-center" style={{ width: '12%', flexShrink: 0 }}>
                  <span className={clsx('text-xs font-medium',
                    feature.uptimePercent != null && feature.uptimePercent >= 99.9 ? 'text-green-600' :
                    feature.uptimePercent != null && feature.uptimePercent >= 99 ? 'text-yellow-600' :
                    feature.uptimePercent != null ? 'text-red-600' : 'text-text-muted'
                  )}>
                    {feature.uptimePercent != null ? `${feature.uptimePercent}%` : '—'}
                  </span>
                </div>
                <div className="px-4 py-3 border-r border-border-light flex items-center" style={{ width: '12%', flexShrink: 0 }}>
                  <span className={clsx('text-xs font-medium',
                    feature.errorRate != null && feature.errorRate > 1 ? 'text-red-600' :
                    feature.errorRate != null && feature.errorRate > 0 ? 'text-yellow-600' :
                    feature.errorRate != null ? 'text-green-600' : 'text-text-muted'
                  )}>
                    {feature.errorRate != null ? `${feature.errorRate}%` : '—'}
                  </span>
                </div>
                <div className="px-4 py-3 border-r border-border-light flex items-center" style={{ width: '13%', flexShrink: 0 }}>
                  <span className="text-xs font-mono text-text-secondary">
                    {feature.avgResponseTime != null ? `${feature.avgResponseTime}ms` : '—'}
                  </span>
                </div>
                <div className="px-4 py-3 border-r border-border-light flex items-center" style={{ width: '15%', flexShrink: 0 }}>
                  <span className="text-xs text-text-secondary">{feature.lastIncident ?? <span className="text-text-muted italic">—</span>}</span>
                </div>
                <div className="px-4 py-3 flex items-center" style={{ width: '13%', flexShrink: 0 }}>
                  <div className="text-xs text-text-muted">
                    <p className="truncate">{feature.lastModifiedBy || '—'}</p>
                    <p className="font-mono mt-0.5 text-[10px]">{feature.lastModifiedDate || ''}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
