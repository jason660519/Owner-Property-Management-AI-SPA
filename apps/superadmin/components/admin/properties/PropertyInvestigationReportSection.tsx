// filepath: apps/superadmin/components/admin/properties/PropertyInvestigationReportSection.tsx
// 物件調查報告書 — 主容器：資料輸入 → 注意事項 → 預覽列印
'use client';

import { useState, useEffect, useRef } from 'react';
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      showFeedback('success', '物件調查報告已儲存到雲端（目前暫存於本地瀏覽器）');
    } catch {
      showFeedback('error', '儲存失敗，可能儲存空間不足');
    }
    setIsSaving(false);
  }

  function handleExportToLocal() {
    if (typeof window === 'undefined') return;

    const formatInput = window.prompt(
      '請輸入要匯出的格式（json / csv / excel / pdf）',
      'json',
    );
    if (!formatInput) return;
    const format = formatInput.toLowerCase();

    const buildKeyValueRows = () => {
      const rows: { key: string; value: string }[] = [];
      const r = report;
      rows.push({ key: 'caseName', value: r.caseName });
      rows.push({ key: 'transactionType', value: r.transactionType });
      rows.push({ key: 'createdBy', value: r.createdBy });
      rows.push({ key: 'createdDate', value: r.createdDate });
      rows.push({ key: 'reviewer', value: r.reviewer });
      rows.push({ key: 'region', value: r.region });
      rows.push({ key: 'addressStreet', value: r.addressStreet });
      rows.push({ key: 'addressNumber', value: r.addressNumber });
      rows.push({ key: 'agency', value: r.agency });
      rows.push({ key: 'agentName', value: r.agentName });
      rows.push({ key: 'mainPurpose', value: r.mainPurpose });
      rows.push({ key: 'currentCondition', value: r.currentCondition });
      rows.push({ key: 'buildingName', value: r.buildingName });
      rows.push({ key: 'totalPrice', value: String(r.totalPrice) });
      rows.push({ key: 'completionDate', value: r.completionDate });
      rows.push({ key: 'buildingAge', value: String(r.buildingAge) });
      rows.push({ key: 'mainMaterial', value: r.mainMaterial });
      rows.push({ key: 'floorInfo', value: r.floorInfo });
      rows.push({ key: 'floorShort', value: r.floorShort });
      rows.push({ key: 'layout', value: r.layout });
      rows.push({ key: 'orientation', value: r.orientation });
      rows.push({ key: 'unitsPerFloor', value: String(r.unitsPerFloor) });
      rows.push({ key: 'isCornerUnit', value: r.isCornerUnit });
      rows.push({ key: 'hasCourt', value: r.hasCourt });
      rows.push({ key: 'elevatorCount', value: String(r.elevatorCount) });
      rows.push({ key: 'hasManagementFee', value: String(r.hasManagementFee) });
      rows.push({ key: 'managementFeeAmount', value: String(r.managementFeeAmount) });
      rows.push({ key: 'security', value: r.security });
      rows.push({ key: 'schoolDistrict', value: r.schoolDistrict });
      rows.push({ key: 'viewingMethod', value: r.viewingMethod });
      rows.push({ key: 'gasType', value: r.gasType });
      rows.push({ key: 'additions', value: r.additions });
      rows.push({ key: 'transportation', value: r.transportation });
      rows.push({ key: 'airConditioning', value: r.airConditioning });
      rows.push({ key: 'propertyNumber', value: r.propertyNumber });
      rows.push({ key: 'restrictionRegistration', value: r.restrictionRegistration });
      rows.push({ key: 'sellerEquipment', value: r.sellerEquipment });
      rows.push({ key: 'deliveryCondition', value: r.deliveryCondition });
      rows.push({ key: 'selectedNotes', value: JSON.stringify(r.selectedNotes) });
      rows.push({ key: 'customNote', value: r.customNote });
      rows.push({ key: 'landParcels', value: JSON.stringify(r.landParcels) });
      rows.push({ key: 'buildingAreas', value: JSON.stringify(r.buildingAreas) });
      rows.push({ key: 'parking', value: JSON.stringify(r.parking) });
      rows.push({ key: 'features', value: JSON.stringify(r.features) });
      rows.push({ key: 'paymentSchedule', value: JSON.stringify(r.paymentSchedule) });
      return rows;
    };

    const downloadBlob = (blob: Blob, filename: string) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    };

    const date = new Date().toISOString().slice(0, 10);

    try {
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(report, null, 2)], {
          type: 'application/json',
        });
        downloadBlob(blob, `investigation-report-${propertyId}-${date}.json`);
        showFeedback('success', '已另存新檔至本地（JSON 檔）');
        return;
      }

      if (format === 'csv') {
        const rows = buildKeyValueRows();
        const escapeCsv = (value: string) =>
          /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        const header = ['欄位', '值'];
        const lines = [
          header,
          ...rows.map((r) => [r.key, r.value]),
        ]
          .map((cols) => cols.map(escapeCsv).join(','))
          .join('\r\n');
        const blob = new Blob([lines], {
          type: 'text/csv;charset=utf-8;',
        });
        downloadBlob(blob, `investigation-report-${propertyId}-${date}.csv`);
        showFeedback('success', '已另存新檔至本地（CSV 檔）');
        return;
      }

      if (format === 'excel' || format === 'xls' || format === 'xlsx') {
        const rows = buildKeyValueRows();
        const escapeHtml = (value: string) =>
          value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        const tableRows = rows
          .map(
            (r) =>
              `<tr><td>${escapeHtml(r.key)}</td><td>${escapeHtml(r.value)}</td></tr>`,
          )
          .join('');
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body><table border="1"><thead><tr><th>欄位</th><th>值</th></tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
        const blob = new Blob([html], {
          type: 'application/vnd.ms-excel',
        });
        downloadBlob(blob, `investigation-report-${propertyId}-${date}.xls`);
        showFeedback('success', '已另存新檔至本地（Excel 檔 .xls）');
        return;
      }

      if (format === 'pdf') {
        const rows = buildKeyValueRows();
        const win = window.open('', '_blank');
        if (!win) {
          showFeedback('error', '瀏覽器阻擋了新視窗，無法預覽 PDF');
          return;
        }
        const doc = win.document;
        win.document.title = '物件調查報告';
        const body = doc.body;
        while (body.firstChild) {
          body.removeChild(body.firstChild);
        }
        const h1 = doc.createElement('h1');
        h1.textContent = '物件調查報告';
        body.appendChild(h1);
        const table = doc.createElement('table');
        table.border = '1';
        table.cellPadding = '4';
        const thead = doc.createElement('thead');
        const headerRow = doc.createElement('tr');
        const th1 = doc.createElement('th');
        th1.textContent = '欄位';
        const th2 = doc.createElement('th');
        th2.textContent = '值';
        headerRow.appendChild(th1);
        headerRow.appendChild(th2);
        thead.appendChild(headerRow);
        table.appendChild(thead);
        const tbody = doc.createElement('tbody');
        rows.forEach((r) => {
          const tr = doc.createElement('tr');
          const tdKey = doc.createElement('td');
          tdKey.textContent = r.key;
          const tdVal = doc.createElement('td');
          tdVal.textContent = r.value;
          tr.appendChild(tdKey);
          tr.appendChild(tdVal);
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        body.appendChild(table);
        win.focus();
        win.print();
        showFeedback('success', '已開啟列印視窗，可選擇「另存為 PDF」');
        return;
      }

      showFeedback('error', '不支援的匯出格式，請輸入 json / csv / excel / pdf');
    } catch {
      showFeedback('error', '匯出失敗，請稍後再試');
    }
  }

  function handleImportFromLocal(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '');
        const parsed = JSON.parse(text) as InvestigationReport;
        setReport(parsed);
        try {
          localStorage.setItem(storageKey, JSON.stringify(parsed));
        } catch {
          // ignore localStorage failure; primary path is state update
        }
        showFeedback('success', '已從本地報告載入內容');
      } catch {
        showFeedback('error', '載入失敗：檔案格式須為有效的 JSON 報告檔');
      }
    };
    reader.onerror = () => {
      showFeedback('error', '載入失敗，請確認檔案是否可讀取');
    };
    reader.readAsText(file);
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
            {isSaving ? '儲存中…' : '儲存到雲端'}
          </button>
          <button
            type="button"
            onClick={handleExportToLocal}
            className="flex items-center gap-1.5 px-4 py-2 text-text-secondary hover:bg-bg-tertiary text-sm rounded-md transition-colors"
          >
            <Save size={14} />
            另存新檔至本地
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-4 py-2 text-text-secondary hover:bg-bg-tertiary text-sm rounded-md transition-colors"
          >
            <FileSearch size={14} />
            載入報告
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2 text-text-secondary hover:bg-bg-tertiary text-sm rounded-md transition-colors"
          >
            <RotateCcw size={14} />
            清除重填
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFromLocal(file);
              if (e.target) {
                // reset so the same file can be chosen again if needed
                // eslint-disable-next-line no-param-reassign
                e.target.value = '';
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
