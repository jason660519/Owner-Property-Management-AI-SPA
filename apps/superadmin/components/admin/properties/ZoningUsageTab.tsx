'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Save, Loader2,
  ExternalLink, Search, CheckCircle2, AlertCircle,
} from 'lucide-react';
import type { PropertyItem } from '@/lib/types/properties';
import {
  getPropertyZoningEnv,
  savePropertyZoningEnv,
  type ZoningEnvData,
} from '@/lib/actions/properties';
import { queryTaipeiZoning, type TaipeiZoningResult } from '@/lib/actions/taipei-zoning';
import { parseLandNumber } from '@/lib/utils/taipei-land-number-parser';

// ── Shared styles ────────────────────────────────────────────────────────
const cardCls = 'rounded-lg border border-border-default bg-bg-primary overflow-hidden';
const sectionTitleCls = 'flex items-center gap-2 text-sm font-semibold text-text-primary';
const inputCls =
  'w-full rounded-md border border-border-default bg-bg-primary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent';
const checkboxCls =
  'rounded border-border-default text-accent focus:ring-accent focus:ring-offset-0';

// ── Sub-components ───────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-0.5">
      <h4 className={sectionTitleCls}>
        <Icon size={16} className="text-accent" />
        {title}
      </h4>
      {subtitle && <p className="text-xs text-text-muted pl-6">{subtitle}</p>}
    </div>
  );
}

/** Auto-query button for Taipei City zoning */
function TaipeiZoningAutoQuery({
  landNumber,
  districtHint,
  onResult,
}: {
  landNumber: string;
  districtHint: string;
  onResult: (zone: string, rawRecords: Record<string, string>[]) => void;
}) {
  const [querying, setQuerying] = useState(false);
  const [result, setResult] = useState<TaipeiZoningResult | null>(null);

  const parsed = parseLandNumber(landNumber);
  const canQuery = !!parsed;

  const handleQuery = useCallback(async () => {
    setQuerying(true);
    setResult(null);
    const res = await queryTaipeiZoning(landNumber, districtHint);
    setResult(res);
    if (res.success && res.data?.zone) {
      onResult(res.data.zone, res.data.raw);
    }
    setQuerying(false);
  }, [landNumber, districtHint, onResult]);

  return (
    <div className={cardCls}>
      <div className="px-4 pt-3 pb-2">
        <SectionHeader
          icon={Search}
          title="自動查詢台北市使用分區"
          subtitle="從土地謄本地號自動查詢台北市都市計畫使用分區，查詢結果將自動填入下方表單"
        />
      </div>

      <div className="px-4 pb-4 space-y-3">
        {/* Parsed land number preview */}
        {parsed ? (
          <div className="rounded-md bg-bg-secondary px-3 py-2 text-xs space-y-1">
            <p className="text-text-muted">來源：土地謄本解析（地號欄位）</p>
            <p className="text-text-secondary">解析地號：<span className="text-text-primary font-medium">{landNumber}</span></p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-text-muted">
              <span>行政區：<span className="text-text-primary">{parsed.district || districtHint || '—'}</span></span>
              <span>段：<span className="text-text-primary">{parsed.section}</span></span>
              {parsed.subsection && <span>小段：<span className="text-text-primary">{parsed.subsection}</span></span>}
              <span>地號：<span className="text-text-primary">{parsed.motherNo}-{parsed.childNo}</span></span>
            </div>
          </div>
        ) : (
          <div className="rounded-md bg-bg-secondary px-3 py-2 text-xs text-text-muted">
            無法解析土地謄本地號，請確認謄本已解析且地號格式正確（如「大安區仁愛段二小段 0367-0000」）。
          </div>
        )}

        {/* Query button */}
        <button
          type="button"
          onClick={handleQuery}
          disabled={!canQuery || querying}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {querying ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          {querying ? '查詢中…' : '自動查詢台北市使用分區'}
        </button>

        {/* Result display */}
        {result && (
          <div className={`rounded-md px-3 py-2.5 text-sm ${
            result.success
              ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-start gap-2">
              {result.success ? (
                <CheckCircle2 size={16} className="text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              )}
              <div className="space-y-1 min-w-0">
                {result.success && result.data ? (
                  <>
                    <p className="font-medium text-green-800 dark:text-green-300">
                      使用分區：{result.data.zone}
                    </p>
                    {result.data.note && (
                      <p className="text-xs text-green-700 dark:text-green-400">{result.data.note}</p>
                    )}
                    {result.data.raw.length > 0 && (
                      <details className="mt-1">
                        <summary className="text-xs text-green-600 dark:text-green-400 cursor-pointer hover:underline">
                          查看完整回傳資料
                        </summary>
                        <pre className="mt-1 text-xs bg-white/50 dark:bg-black/20 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                          {JSON.stringify(result.data.raw, null, 2)}
                        </pre>
                      </details>
                    )}
                    <p className="text-xs text-green-600 dark:text-green-400">
                      已自動填入「使用分區」欄位，請確認後儲存。
                    </p>
                  </>
                ) : (
                  <p className="text-red-800 dark:text-red-300">{result.message}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Manual zoning data edit form (saves to property_environment_conditions) */
function ZoningEditForm({
  propertyId,
  propertyType,
  initial,
  transcriptUseZone,
  landNumber,
  districtHint,
}: {
  propertyId: string;
  propertyType: 'sale' | 'rental';
  initial: ZoningEnvData | null;
  transcriptUseZone: string;
  landNumber: string;
  districtHint: string;
}) {
  const [form, setForm] = useState<ZoningEnvData>({
    landUseZone: initial?.landUseZone || transcriptUseZone || '',
    hasGroundVegetation: initial?.hasGroundVegetation ?? false,
    hasGroundBuilding: initial?.hasGroundBuilding ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    const result = await savePropertyZoningEnv(propertyId, propertyType, form);
    setMessage({ type: result.success ? 'success' : 'error', text: result.message });
    setSaving(false);
  }, [propertyId, propertyType, form]);

  const setField = useCallback(<K extends keyof ZoningEnvData>(key: K, val: ZoningEnvData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setMessage(null);
  }, []);

  // Callback for auto-query result
  const handleAutoQueryResult = useCallback((zone: string) => {
    setField('landUseZone', zone);
  }, [setField]);

  // Determine if Taipei auto-query is available
  const isTaipei = districtHint !== '' || landNumber !== '';
  const hasLandNumber = landNumber !== '';

  return (
    <>
      {/* Auto-query section (Taipei only) */}
      {isTaipei && hasLandNumber && (
        <TaipeiZoningAutoQuery
          landNumber={landNumber}
          districtHint={districtHint}
          onResult={handleAutoQueryResult}
        />
      )}

      <div className={cardCls}>
        <div className="px-4 pt-3 pb-2">
          <SectionHeader
            icon={FileText}
            title="編輯使用分區"
            subtitle="若上述自動查詢有誤，可手動編輯，儲存至環境條件資料表"
          />
        </div>

        <div className="px-4 pb-4 space-y-4">
          {/* Use zone */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1">使用分區</label>
              <input
                type="text"
                className={inputCls}
                placeholder="例：第三種住宅區"
                value={form.landUseZone}
                onChange={(e) => setField('landUseZone', e.target.value)}
              />
            </div>
          </div>

          {/* Save button & message */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? '儲存中…' : '儲存'}
            </button>
            {message && (
              <span className={`text-xs ${message.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                {message.text}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main component ───────────────────────────────────────────────────────

interface ZoningUsageTabProps {
  property: PropertyItem;
}

export function ZoningUsageTab({ property }: ZoningUsageTabProps) {
  const landDesc = property.landTranscript?.description;
  const useZone = landDesc?.useZone ?? '';
  const landNumber = landDesc?.landNumber ?? '';
  const districtHint = property.addressDistrict ?? '';

  // Fetch environment conditions for the editable form
  const [envData, setEnvData] = useState<ZoningEnvData | null>(null);
  const [envLoading, setEnvLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getPropertyZoningEnv(property.id, property.type).then((data) => {
      if (!cancelled) {
        setEnvData(data);
        setEnvLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [property.id, property.type]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-text-primary">使用分區與土地資訊</h3>
        <p className="text-xs text-text-muted">
          整合土地謄本解析與手動補充的使用分區資料，包含地價、他項權利及分區法規參考。
        </p>
      </div>

      {/* Editable form */}
      {envLoading ? (
        <div className="flex items-center gap-2 px-4 py-6 text-sm text-text-muted">
          <Loader2 size={16} className="animate-spin" />
          載入環境條件資料…
        </div>
      ) : (
        <ZoningEditForm
          propertyId={property.id}
          propertyType={property.type}
          initial={envData}
          transcriptUseZone={useZone}
          landNumber={landNumber}
          districtHint={districtHint}
        />
      )}

      {/* External reference */}
      <div className="rounded-lg border border-border-default bg-bg-secondary px-4 py-3 space-y-2 text-xs">
        <p className="font-medium text-text-secondary">手動查詢 使用分區</p>
        <p className="text-text-muted">
          若需官方最新的使用分區與相關規定，請使用各縣市地政局「使用分區查詢」系統查詢。
        </p>
        <div className="flex flex-wrap gap-2 mt-1">
          <a
            href="https://zone.udd.gov.taipei/ZoneSearch.aspx"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors"
          >
            臺北市使用分區查詢
            <ExternalLink size={12} />
          </a>
          <a
            href="https://landmap.tainan.gov.tw/gis/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border-default bg-bg-primary text-text-primary text-xs font-medium hover:bg-bg-secondary transition-colors"
          >
            臺南市
            <ExternalLink size={12} />
          </a>
          <a
            href="https://urban.planning.ntpc.gov.tw/NtpcURInfo/Map.aspx"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border-default bg-bg-primary text-text-primary text-xs font-medium hover:bg-bg-secondary transition-colors"
          >
            新北市
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
