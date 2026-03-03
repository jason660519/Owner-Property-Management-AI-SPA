// filepath: apps/superadmin/components/admin/properties/PropertyInvestigationReportSection.tsx
// 物件調查報告書 — 主容器：資料輸入 → 注意事項 → 預覽列印
'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, FileSearch, RotateCcw } from 'lucide-react';
import type { PropertyItem } from '@/lib/types/properties';
import type { InvestigationReport } from './investigation-report/types';
import { createEmptyReport } from './investigation-report/types';
import { InputForm } from './investigation-report/InputForm';
import { NotesSelector } from './investigation-report/NotesSelector';
import { ReportPreview } from './investigation-report/ReportPreview';

type SubTab = 'input' | 'notes' | 'preview';

interface Props {
  propertyId: string;
  property?: PropertyItem;
}

function prefillFromProperty(property: PropertyItem): Partial<InvestigationReport> {
  return {
    caseName: property.title || '',
    transactionType: property.type === 'sale' ? 'sale' : 'rental',
    totalPrice: (property.type === 'sale' ? property.price : property.monthlyRent) ?? 0,
    region: [property.addressCity, property.addressDistrict].filter(Boolean).join(''),
    addressStreet: property.addressStreet ?? '',
    addressNumber: [property.addressNumber, property.addressFloor, property.addressUnit].filter(Boolean).join(' '),
    layout: [property.bedrooms, property.livingRooms, property.bathrooms]
      .filter((n) => n != null && n > 0)
      .join('/') || '',
  };
}

export function PropertyInvestigationReportSection({ propertyId, property }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('input');
  const [report, setReport] = useState<InvestigationReport>(createEmptyReport);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const storageKey = `investigation-report-v2-${propertyId}`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as InvestigationReport;
        setReport(parsed);
      } else if (property) {
        const prefill = prefillFromProperty(property);
        setReport((prev) => ({ ...prev, ...prefill }));
      }
    } catch {
      if (property) {
        const prefill = prefillFromProperty(property);
        setReport((prev) => ({ ...prev, ...prefill }));
      }
    }
    setIsLoaded(true);
  }, [storageKey, property]);

  function showFeedback(type: 'success' | 'error', message: string) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  }

  function handleSave() {
    setIsSaving(true);
    try {
      localStorage.setItem(storageKey, JSON.stringify(report));
      showFeedback('success', '物件調查報告已儲存（本地端）');
    } catch {
      showFeedback('error', '儲存失敗，可能儲存空間不足');
    }
    setIsSaving(false);
  }

  function handleReset() {
    if (!window.confirm('確定要清除所有調查報告資料？此操作無法復原。')) return;
    const fresh = createEmptyReport();
    if (property) {
      const prefill = prefillFromProperty(property);
      Object.assign(fresh, prefill);
    }
    setReport(fresh);
    localStorage.removeItem(storageKey);
    showFeedback('success', '已清除調查報告資料');
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-2 text-text-muted text-sm py-3">
        <Loader2 size={14} className="animate-spin" /> 載入中…
      </div>
    );
  }

  const SUB_TABS: { key: SubTab; label: string }[] = [
    { key: 'input', label: '資料輸入' },
    { key: 'notes', label: '注意事項' },
    { key: 'preview', label: '預覽列印' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <FileSearch size={18} className="text-accent" />
        <h4 className="text-sm font-bold text-text-primary">物件調查報告書</h4>
        <span className="text-xs text-text-muted">（不動產說明書）</span>
      </div>

      {/* Sub-tab navigation */}
      <div className="flex gap-1 border-b border-border-default">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSubTab(tab.key)}
            className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
              subTab === tab.key
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`p-2.5 rounded-md text-xs ${
            feedback.type === 'success'
              ? 'bg-green-500/10 text-green-500 border border-green-500/20'
              : 'bg-red-500/10 text-red-500 border border-red-500/20'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Tab content */}
      {subTab === 'input' && <InputForm report={report} onChange={setReport} />}
      {subTab === 'notes' && <NotesSelector report={report} onChange={setReport} />}
      {subTab === 'preview' && <ReportPreview report={report} />}

      {/* Actions (always visible except in preview) */}
      {subTab !== 'preview' && (
        <div className="flex items-center gap-3 pt-2 border-t border-border-default">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white text-sm rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isSaving ? '儲存中…' : '儲存報告'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2 text-text-secondary hover:bg-bg-tertiary text-sm rounded-md transition-colors"
          >
            <RotateCcw size={14} />
            清除重填
          </button>
          <span className="text-[10px] text-text-muted ml-auto">
            * 暫存於瀏覽器本地端，後續版本將支援雲端同步
          </span>
        </div>
      )}
    </div>
  );
}
