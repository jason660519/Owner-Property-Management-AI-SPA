// filepath: apps/superadmin/app/superadmin/dashboard/project-progress/components/TestingTab.tsx
// created: 2026-02-19 | creator: Claude Opus 4.6

'use client';

import React, { useMemo, useState } from 'react';
import type { RoadmapFeature } from '@/app/data/roadmap';
import { Search } from 'lucide-react';
import { clsx } from 'clsx';
import { ProgressBar } from './ProgressBar';

const COLUMN_HEADERS = [
  { en: 'ID', zh: '編碼', width: 5 },
  { en: 'Category', zh: '分類', width: 10 },
  { en: 'Feature', zh: '功能需求名稱', width: 18 },
  { en: 'Test Status', zh: '測試狀態', width: 10 },
  { en: 'Test Coverage', zh: '測試覆蓋率', width: 10 },
  { en: 'Unit Test', zh: '單元測試 %', width: 10 },
  { en: 'E2E Acceptance Test', zh: '端到端驗收標準', width: 10 },
  { en: 'Defect Count', zh: '缺陷數', width: 7 },
  { en: 'TTD Spec URL', zh: 'TTD 規格 URL', width: 10 },
  { en: 'Test Log', zh: '測試日誌', width: 10 },
];

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: '待測試', cls: 'bg-gray-100 text-gray-600' },
  in_progress: { label: '測試中', cls: 'bg-blue-50 text-blue-600' },
  passed: { label: '通過', cls: 'bg-green-50 text-green-600' },
  failed: { label: '失敗', cls: 'bg-red-50 text-red-600' },
};

interface TestingTabProps {
  features: RoadmapFeature[];
}

export const TestingTab = ({ features }: TestingTabProps) => {
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
            {filtered.map((feature, rowIdx) => {
              const status = feature.testStatus ?? 'pending';
              const badge = STATUS_BADGE[status] ?? STATUS_BADGE.pending;
              return (
                <div key={feature.name} className="flex items-stretch min-h-[60px] hover:bg-bg-secondary transition-colors">
                  {/* ID */}
                  <div className="px-2 py-3 border-r border-border-light flex items-center" style={{ width: '5%', flexShrink: 0 }}>
                    <span className="font-mono text-xs text-text-secondary">{(rowIdx + 1).toString().padStart(3, '0')}</span>
                  </div>
                  {/* Category */}
                  <div className="px-4 py-3 border-r border-border-light flex items-center" style={{ width: '10%', flexShrink: 0 }}>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-bg-tertiary text-text-primary truncate">{feature.category}</span>
                  </div>
                  {/* Feature */}
                  <div className="px-4 py-3 border-r border-border-light flex items-center" style={{ width: '18%', flexShrink: 0 }}>
                    <span className="text-sm font-medium text-text-primary break-words line-clamp-2">{feature.name}</span>
                  </div>
                  {/* Test Status */}
                  <div className="px-4 py-3 border-r border-border-light flex items-center" style={{ width: '10%', flexShrink: 0 }}>
                    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium', badge.cls)}>{badge.label}</span>
                  </div>
                  {/* Test Coverage */}
                  <div className="px-4 py-3 border-r border-border-light flex items-center" style={{ width: '10%', flexShrink: 0 }}>
                    <div className="w-full"><ProgressBar percentage={feature.testCoverage ?? 0} /></div>
                  </div>
                  {/* Unit Test */}
                  <div className="px-4 py-3 border-r border-border-light flex items-center" style={{ width: '10%', flexShrink: 0 }}>
                    <div className="w-full"><ProgressBar percentage={feature.unitTestCoverage ?? 0} /></div>
                  </div>
                  {/* E2E Acceptance Test */}
                  <div className="px-4 py-3 border-r border-border-light flex items-center" style={{ width: '10%', flexShrink: 0 }}>
                    <div className="w-full"><ProgressBar percentage={feature.e2eTestCoverage ?? 0} /></div>
                  </div>
                  {/* Defect Count */}
                  <div className="px-4 py-3 border-r border-border-light flex items-center" style={{ width: '7%', flexShrink: 0 }}>
                    <span className={clsx('text-xs font-medium', (feature.defectCount ?? 0) > 0 ? 'text-red-500' : 'text-text-muted')}>
                      {feature.defectCount ?? 0}
                    </span>
                  </div>
                  {/* TTD Spec URL */}
                  <div className="px-4 py-3 border-r border-border-light flex items-center overflow-hidden" style={{ width: '10%', flexShrink: 0 }}>
                    <div className="text-xs text-text-secondary line-clamp-2">
                      {feature.testProgress ?? <span className="text-text-muted italic">—</span>}
                    </div>
                  </div>
                  {/* Test Log */}
                  <div className="px-4 py-3 flex items-center overflow-hidden" style={{ width: '10%', flexShrink: 0 }}>
                    <div className="text-xs text-text-secondary line-clamp-2">
                      {feature.testLog ?? <span className="text-text-muted italic">—</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};
