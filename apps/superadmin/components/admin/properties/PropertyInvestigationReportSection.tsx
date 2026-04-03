// filepath: apps/superadmin/components/admin/properties/PropertyInvestigationReportSection.tsx
// 物件調查報告書 — 主容器：DB 儲存 + 謄本自動填入 + 版本歷史 + 完整度指示
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Save,
  Loader2,
  FileSearch,
  RotateCcw,
  Download,
  History,
  ChevronDown,
  Wand2,
  CheckCircle,
} from 'lucide-react';
import type { PropertyDocumentItem, PropertyItem, PropertyPhotoItem } from '@/lib/types/properties';
import type { InvestigationReport, LandParcel } from './investigation-report/types';
import {
  createEmptyReport,
  EMPTY_LAND_PARCEL,
  normalizeConditionStatement,
} from './investigation-report/types';
import { InputForm } from './investigation-report/InputForm';
import { NotesSelector } from './investigation-report/NotesSelector';
import { AttachmentPicker } from './investigation-report/AttachmentPicker';
import { ConditionStatementForm } from './investigation-report/ConditionStatementForm';
import { ReportPreview } from './investigation-report/ReportPreview';
import {
  loadInvestigationReport,
  saveInvestigationReport,
  listInvestigationVersions,
  loadInvestigationVersion,
  type InvestigationReportVersion,
} from '@/lib/actions/investigationReport';
import { getPropertyDocuments, getPropertyPhotos } from '@/lib/actions/properties';
import type {
  BuildingTranscriptData,
  LandTranscriptData,
} from '@/lib/types/properties';

type SubTab = 'condition' | 'input' | 'notes' | 'attachments' | 'preview';

/** 舊版 JSON 可能缺少附件／屋況欄位 */
function normalizeReportPayload(r: InvestigationReport): InvestigationReport {
  return {
    ...r,
    reportAttachments: Array.isArray(r.reportAttachments) ? r.reportAttachments : [],
    reportAttachmentSupplement:
      typeof r.reportAttachmentSupplement === 'string' ? r.reportAttachmentSupplement : '',
    conditionStatement: normalizeConditionStatement(r.conditionStatement),
  };
}

interface Props {
  propertyId: string;
  property?: PropertyItem;
}

// ── Transcript helpers ──────────────────────────────────────────────────────

/** Parse 民國 date string (民國90年08月31日) to ISO (2001-08-31) */
function parseTaiwanDate(raw: string): string {
  const m = raw.match(/民國\s*(\d+)\s*年\s*(\d+)\s*月\s*(\d+)\s*日/);
  if (!m) return '';
  const year = parseInt(m[1], 10) + 1911;
  const month = m[2].padStart(2, '0');
  const day = m[3].padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parse "10000分之477" → { numer: 477, denom: 10000 } */
function parseOwnershipRatio(raw: string): { numer: number; denom: number } {
  const m = raw.match(/(\d+)\s*分之\s*(\d+)/);
  if (!m) return { numer: 0, denom: 0 };
  return { numer: parseInt(m[2], 10), denom: parseInt(m[1], 10) };
}

/** Parse area string "99.22 平方公尺" or "99.22" → 99.22 */
function parseArea(raw: string): number {
  const m = raw.match(/[\d.]+/);
  return m ? parseFloat(m[0]) : 0;
}

/** Extract floor level number from "第013層" → 13 */
function parseFloorLevel(raw: string): number {
  const m = raw.match(/第(\d+)層/);
  return m ? parseInt(m[1], 10) : 0;
}

/** Build floor info string from transcript totalFloors + floorLevel */
function buildFloorInfo(totalFloors: string, floorLevel: string): string {
  const level = parseFloorLevel(floorLevel);
  // Normalize totalFloors: "地上共14層 地下共5層" → "地上共14層/地下共5層"
  const normalized = totalFloors.replace(/\s+/g, '/').replace(/\/+/g, '/');
  return level > 0 ? `${normalized};本建物在第${level}層` : normalized;
}

/** Auto-fill report fields from building + land transcripts */
function prefillFromTranscript(
  base: Partial<InvestigationReport>,
  building: BuildingTranscriptData | null | undefined,
  land: LandTranscriptData | null | undefined,
): Partial<InvestigationReport> {
  const patch: Partial<InvestigationReport> = { ...base };

  if (building?.description) {
    const d = building.description;

    if (d.buildingNumber && !patch.buildingAreas?.buildingNumber) {
      patch.buildingAreas = {
        ...(patch.buildingAreas ?? {
          buildingNumber: '',
          mainBuilding: 0,
          balcony: 0,
          rainCover: 0,
          commonArea: 0,
          basementCommon: 0,
          other1: 0,
          other2: 0,
        }),
        buildingNumber: d.buildingNumber,
      };
    }

    if (d.completionDate && !patch.completionDate) {
      const iso = parseTaiwanDate(d.completionDate);
      if (iso) {
        patch.completionDate = iso;
        // Calculate building age
        const yearBuilt = new Date(iso).getFullYear();
        const currentYear = new Date().getFullYear();
        patch.buildingAge = currentYear - yearBuilt;
      }
    }

    if (d.mainUse && !patch.mainPurpose) {
      patch.mainPurpose = d.mainUse;
    }

    if (d.mainMaterial && !patch.mainMaterial) {
      patch.mainMaterial = d.mainMaterial;
    }

    // Floor info
    if ((d.totalFloors || d.floorLevel) && !patch.floorInfo) {
      patch.floorInfo = buildFloorInfo(d.totalFloors ?? '', d.floorLevel ?? '');
      const level = parseFloorLevel(d.floorLevel ?? '');
      if (level > 0) patch.floorShort = `${level}F`;
    }

    // Building areas from floor area
    if (d.floorArea) {
      const mainSqm = parseArea(d.floorArea);
      if (mainSqm > 0) {
        patch.buildingAreas = {
          ...(patch.buildingAreas ?? {
            buildingNumber: '',
            mainBuilding: 0,
            balcony: 0,
            rainCover: 0,
            commonArea: 0,
            basementCommon: 0,
            other1: 0,
            other2: 0,
          }),
          mainBuilding: mainSqm,
        };
      }
    }

    // Annexed buildings → balcony / rainCover
    if (d.annexedBuildings?.length) {
      let balcony = 0;
      let rainCover = 0;
      for (const ab of d.annexedBuildings) {
        const area = parseArea(ab.area);
        if (/陽台|平台|露台/.test(ab.use)) balcony += area;
        else if (/雨遮|花台/.test(ab.use)) rainCover += area;
      }
      if (balcony > 0 || rainCover > 0) {
        patch.buildingAreas = {
          ...(patch.buildingAreas ?? {
            buildingNumber: '',
            mainBuilding: 0,
            balcony: 0,
            rainCover: 0,
            commonArea: 0,
            basementCommon: 0,
            other1: 0,
            other2: 0,
          }),
          balcony,
          rainCover,
        };
      }
    }

    // Common areas
    if (d.commonAreas?.length) {
      const totalCommon = d.commonAreas.reduce((sum, ca) => sum + parseArea(ca.area), 0);
      if (totalCommon > 0) {
        patch.buildingAreas = {
          ...(patch.buildingAreas ?? {
            buildingNumber: '',
            mainBuilding: 0,
            balcony: 0,
            rainCover: 0,
            commonArea: 0,
            basementCommon: 0,
            other1: 0,
            other2: 0,
          }),
          commonArea: totalCommon,
        };
      }
    }

    // Encumbrances → restrictionRegistration
    if (building.encumbrances !== undefined && !patch.restrictionRegistration) {
      if (building.encumbrances.length === 0) {
        patch.restrictionRegistration = '無';
      } else {
        const types = [...new Set(building.encumbrances.map((e) => e.encumbranceType))].join('、');
        patch.restrictionRegistration = types || '有（見謄本）';
      }
    }
  }

  if (land?.description) {
    const d = land.description;
    const parcels: [LandParcel, LandParcel, LandParcel] = [
      { ...EMPTY_LAND_PARCEL },
      { ...EMPTY_LAND_PARCEL },
      { ...EMPTY_LAND_PARCEL },
    ];

    if (d.landNumber) parcels[0].lotNumber = d.landNumber;
    if (d.area) parcels[0].baseArea = parseArea(d.area);
    if (d.useZone) parcels[0].zoningType = d.useZone;

    // Ownership ratio from land ownership
    if (land.ownership?.length) {
      const ratio = parseOwnershipRatio(land.ownership[0]?.ownershipRatio ?? '');
      parcels[0].ownershipNumer = ratio.numer;
      parcels[0].ownershipDenom = ratio.denom;
    }

    patch.landParcels = parcels;
  }

  return patch;
}

/** Auto-fill from property object (basic fields) */
function prefillFromProperty(property: PropertyItem): Partial<InvestigationReport> {
  const base: Partial<InvestigationReport> = {
    caseName: property.title || '',
    transactionType: property.type === 'sale' ? 'sale' : 'rental',
    totalPrice: (property.type === 'sale' ? property.price : property.monthlyRent) ?? 0,
    region: [property.addressCity, property.addressDistrict].filter(Boolean).join(''),
    addressStreet: property.addressStreet ?? '',
    addressNumber: [property.addressNumber, property.addressFloor, property.addressUnit]
      .filter(Boolean)
      .join(' '),
    layout: [property.bedrooms, property.livingRooms, property.bathrooms]
      .filter((n) => n != null && n > 0)
      .join('/') || '',
  };

  return prefillFromTranscript(base, property.buildingTranscript, property.landTranscript);
}

// ── Completeness ────────────────────────────────────────────────────────────

const REQUIRED_FIELDS: (keyof InvestigationReport)[] = [
  'caseName',
  'totalPrice',
  'region',
  'addressStreet',
  'addressNumber',
  'buildingName',
  'completionDate',
  'mainMaterial',
  'layout',
  'floorInfo',
  'orientation',
  'gasType',
  'schoolDistrict',
];

function getCompletionStats(report: InvestigationReport): { filled: number; total: number } {
  let filled = REQUIRED_FIELDS.filter((k) => {
    const v = report[k];
    return v !== '' && v !== 0 && v != null;
  }).length;

  // Land parcel check
  if (report.landParcels[0]?.lotNumber) filled += 1;
  if (report.buildingAreas.buildingNumber) filled += 1;
  if (report.buildingAreas.mainBuilding > 0) filled += 1;
  if (report.features[0]) filled += 1;

  const total = REQUIRED_FIELDS.length + 4;
  return { filled, total };
}

// ── Main Component ──────────────────────────────────────────────────────────

export function PropertyInvestigationReportSection({ propertyId, property }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('input');
  const [report, setReport] = useState<InvestigationReport>(createEmptyReport);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [versions, setVersions] = useState<InvestigationReportVersion[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoadingVersion, setIsLoadingVersion] = useState(false);
  const [photos, setPhotos] = useState<PropertyPhotoItem[]>([]);
  const [documents, setDocuments] = useState<PropertyDocumentItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const propertyType: 'sales' | 'rentals' = property?.type === 'sale' ? 'sales' : 'rentals';
  const storageKey = `investigation-report-v2-${propertyId}`;

  // Load report: DB first, fallback to localStorage, then property prefill
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data: dbData } = await loadInvestigationReport(propertyId, propertyType);
        if (cancelled) return;

        if (dbData) {
          setReport(normalizeReportPayload(dbData));
        } else {
          // Try localStorage fallback
          try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
              const parsed = JSON.parse(stored) as InvestigationReport;
              setReport(normalizeReportPayload(parsed));
            } else if (property) {
              const prefill = prefillFromProperty(property);
              setReport((prev) => ({ ...prev, ...prefill }));
            }
          } catch {
            if (property) {
              setReport((prev) => ({ ...prev, ...prefillFromProperty(property) }));
            }
          }
        }
      } catch {
        if (property) {
          setReport((prev) => ({ ...prev, ...prefillFromProperty(property) }));
        }
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  // Load photos for floor plan picker + 附件勾選
  useEffect(() => {
    getPropertyPhotos(propertyId)
      .then(setPhotos)
      .catch(() => {});
  }, [propertyId]);

  useEffect(() => {
    getPropertyDocuments(propertyId)
      .then(setDocuments)
      .catch(() => {});
  }, [propertyId]);

  function showFeedback(type: 'success' | 'error', message: string) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const { error } = await saveInvestigationReport(propertyId, propertyType, report);
      if (error) {
        showFeedback('error', `儲存失敗：${error}`);
      } else {
        // Also update localStorage as cache
        try { localStorage.setItem(storageKey, JSON.stringify(report)); } catch { /* ignore */ }
        showFeedback('success', '已儲存至雲端');
        // Refresh version list
        if (showHistory) refreshVersions();
      }
    } finally {
      setIsSaving(false);
    }
  }

  const refreshVersions = useCallback(async () => {
    const { data } = await listInvestigationVersions(propertyId, propertyType);
    setVersions(data);
  }, [propertyId, propertyType]);

  async function handleToggleHistory() {
    if (!showHistory && versions.length === 0) {
      await refreshVersions();
    }
    setShowHistory((v) => !v);
  }

  async function handleLoadVersion(versionId: string) {
    setIsLoadingVersion(true);
    try {
      const { data, error } = await loadInvestigationVersion(versionId);
      if (error || !data) {
        showFeedback('error', '載入版本失敗');
      } else {
        setReport(normalizeReportPayload(data));
        showFeedback('success', '已載入指定版本');
        setShowHistory(false);
      }
    } finally {
      setIsLoadingVersion(false);
    }
  }

  function handleReset() {
    if (!window.confirm('確定要清除所有調查報告資料？此操作無法復原。')) return;
    const fresh = createEmptyReport();
    if (property) Object.assign(fresh, prefillFromProperty(property));
    setReport(fresh);
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    showFeedback('success', '已清除調查報告資料');
  }

  function handleReApplyTranscript() {
    if (!property) return;
    if (!window.confirm('重新從謄本自動填入資料？目前已填的謄本相關欄位將被覆蓋。')) return;
    const patch = prefillFromTranscript({}, property.buildingTranscript, property.landTranscript);
    setReport((prev) => ({ ...prev, ...patch }));
    showFeedback('success', '已從謄本重新填入資料');
  }

  function handleExportJson() {
    const date = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investigation-report-${propertyId}-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showFeedback('success', '已下載 JSON 備份');
  }

  function handleImportFromLocal(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result ?? '')) as InvestigationReport;
        setReport(normalizeReportPayload(parsed));
        try { localStorage.setItem(storageKey, JSON.stringify(parsed)); } catch { /* ignore */ }
        showFeedback('success', '已從本地報告載入內容');
      } catch {
        showFeedback('error', '載入失敗：檔案格式須為有效的 JSON 報告檔');
      }
    };
    reader.onerror = () => showFeedback('error', '載入失敗，請確認檔案是否可讀取');
    reader.readAsText(file);
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-2 text-text-muted text-sm py-6">
        <Loader2 size={14} className="animate-spin" /> 載入中…
      </div>
    );
  }

  const { filled, total } = getCompletionStats(report);
  const completionPct = Math.round((filled / total) * 100);
  const completionColor =
    completionPct >= 80 ? 'text-green-500' : completionPct >= 50 ? 'text-amber-500' : 'text-red-500';

  const SUB_TABS: { key: SubTab; label: string }[] = [
    { key: 'condition', label: '屋況說明書' },
    { key: 'input', label: '資料輸入' },
    { key: 'notes', label: '注意事項' },
    { key: 'attachments', label: '選取附件' },
    { key: 'preview', label: '預覽列印' },
  ];

  const actionButtons = (
    <>
      {/* Primary: Save */}
      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-xs rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50"
      >
        {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
        {isSaving ? '儲存中…' : '儲存到雲端'}
      </button>

      {(property?.buildingTranscript || property?.landTranscript) && (
        <button
          type="button"
          onClick={handleReApplyTranscript}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-text-secondary hover:bg-bg-tertiary text-xs rounded-md transition-colors border border-border-default"
        >
          <Wand2 size={12} />
          從謄本重新填入
        </button>
      )}

      <button
        type="button"
        onClick={handleExportJson}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-text-secondary hover:bg-bg-tertiary text-xs rounded-md transition-colors"
      >
        <Download size={12} />
        下載 JSON
      </button>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-text-secondary hover:bg-bg-tertiary text-xs rounded-md transition-colors"
      >
        <FileSearch size={12} />
        載入 JSON
      </button>

      <button
        type="button"
        onClick={handleToggleHistory}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-colors ${
          showHistory
            ? 'bg-bg-tertiary text-text-primary'
            : 'text-text-secondary hover:bg-bg-tertiary'
        }`}
      >
        <History size={12} />
        版本歷史
        <ChevronDown
          size={11}
          className={`transition-transform ${showHistory ? 'rotate-180' : ''}`}
        />
      </button>

      <button
        type="button"
        onClick={handleReset}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-red-500/70 hover:text-red-500 hover:bg-red-500/5 text-xs rounded-md transition-colors"
      >
        <RotateCcw size={12} />
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
          if (e.target) e.target.value = '';
        }}
      />
    </>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <FileSearch size={18} className="text-accent" />
          <h4 className="text-sm font-bold text-text-primary">物件調查報告書</h4>
          <span className="text-xs text-text-muted">（不動產說明書）</span>
          <div className="flex flex-wrap items-center gap-1.5 ml-2">
            {actionButtons}
          </div>
        </div>
        {/* Completeness badge */}
        <div className={`flex items-center gap-1.5 text-xs font-medium ${completionColor}`}>
          <CheckCircle size={13} />
          <span>{filled}/{total} 欄位已填（{completionPct}%）</span>
        </div>
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
      {subTab === 'condition' && (
        <ConditionStatementForm report={report} onChange={setReport} />
      )}
      {subTab === 'input' && (
        <InputForm report={report} onChange={setReport} photos={photos} />
      )}
      {subTab === 'notes' && (
        <NotesSelector report={report} onChange={setReport} property={property} />
      )}
      {subTab === 'attachments' && (
        <AttachmentPicker
          report={report}
          onChange={setReport}
          documents={documents}
          photos={photos}
        />
      )}
      {subTab === 'preview' && (
        <ReportPreview report={report} property={property} />
      )}

      {/* Version History Panel */}
      {showHistory && (
        <div className="border border-border-default rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 bg-bg-tertiary border-b border-border-default">
            <span className="text-xs font-medium text-text-primary">雲端儲存版本</span>
          </div>
          {isLoadingVersion ? (
            <div className="flex items-center gap-2 p-4 text-xs text-text-muted">
              <Loader2 size={12} className="animate-spin" /> 載入中…
            </div>
          ) : versions.length === 0 ? (
            <p className="p-4 text-xs text-text-muted">尚無儲存版本。</p>
          ) : (
            <div className="divide-y divide-border-default">
              {versions.map((v) => (
                <div key={v.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-bg-secondary">
                  <div>
                    <span className="text-xs font-medium text-text-primary">
                      版本 {v.version}
                    </span>
                    {v.caseName && (
                      <span className="text-xs text-text-muted ml-2">— {v.caseName}</span>
                    )}
                    <p className="text-[10px] text-text-muted mt-0.5">
                      {new Date(v.createdAt).toLocaleString('zh-TW')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLoadVersion(v.id)}
                    className="text-xs text-accent hover:underline"
                  >
                    載入此版本
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
