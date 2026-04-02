'use client';

import type { AdvertisementSectionDefinition } from '@/lib/types/advertisement';

interface AdvertisementReadinessSummaryProps {
  sections: AdvertisementSectionDefinition[];
}

export function AdvertisementReadinessSummary({ sections }: AdvertisementReadinessSummaryProps) {
  const availableCount = sections.filter((section) => section.status !== 'unavailable').length;
  const unavailableSections = sections.filter((section) => section.status === 'unavailable');

  return (
    <div className="space-y-3 rounded-xl border border-border-default bg-bg-primary p-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Readiness Summary</p>
          <p className="mt-1 text-sm font-semibold text-text-primary">可用內容 {availableCount}/{sections.length}</p>
        </div>
        <p className="text-xs text-text-secondary">內容可用性已根據物件欄位、文件旗標與謄本解析資料動態判斷。</p>
      </div>

      {unavailableSections.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {unavailableSections.map((section) => (
            <span key={section.id} className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-700">
              缺：{section.title}
              {section.fixTargetLabel ? <span className="text-amber-600/80">{section.fixTargetLabel}</span> : null}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}