'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Search,
  Trash2,
  Eye,
} from 'lucide-react';
import type { PropertyDocumentItem } from '@/lib/types/properties';
import { deletePropertyDocument } from '@/lib/actions/properties';
import { queryTaipeiZoning, type TaipeiZoningResult } from '@/lib/actions/taipei-zoning';
import { saveZoningQueryDocument } from '@/lib/actions/zoning-documents';
import { parseLandNumber } from '@/lib/utils/taipei-land-number-parser';
import {
  formatZoningQuerySummary,
  type ZoningLandParcelOption,
} from '@/lib/utils/zoning-land-parcels';
import { TaipeiZoningManualQueryRow } from './TaipeiZoningManualQueryRow';

const cardCls = 'rounded-lg border border-border-default bg-bg-primary overflow-hidden';
const sectionTitleCls = 'flex items-center gap-2 text-sm font-semibold text-text-primary';
const TAIPEI_ZONING_SOURCE_NAME = '臺北市政府都市發展局使用分區查詢系統';
const TAIPEI_ZONING_SOURCE_URL = 'https://zone.udd.gov.taipei/ZoneSearch.aspx';

interface TaipeiZoningAutoQueryProps {
  landParcels: ZoningLandParcelOption[];
  districtHint: string;
  propertyId: string;
  propertyType: 'sale' | 'rental';
  ownerId: string;
  onResult?: (zoneSummary: string, rawRecords: Record<string, string>[]) => void;
  onSavedDocument?: () => Promise<void> | void;
}

interface ZoningQueryFile {
  result: TaipeiZoningResult;
  previewHtml: string;
  saveStatus?: 'saved' | 'failed';
  saveMessage?: string;
  savedDocument?: PropertyDocumentItem;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function makeResultPreviewFile(landNumber: string, result: TaipeiZoningResult): ZoningQueryFile {
  const zone = result.success && result.data?.zone ? result.data.zone : '查無使用分區';
  const raw = result.success && result.data ? result.data.raw : [];
  const queriedAt = new Date().toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    hour12: false,
  });
  const html = `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <title>使用分區查詢結果 - ${escapeHtml(landNumber)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif; margin: 32px; color: #111827; }
    h1 { font-size: 20px; margin: 0 0 16px; }
    dl { display: grid; grid-template-columns: 120px 1fr; gap: 8px 16px; }
    dt { color: #6b7280; }
    dd { margin: 0; }
    a { color: #6d28d9; }
    pre { margin-top: 20px; padding: 16px; background: #f3f4f6; border-radius: 8px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>使用分區查詢結果</h1>
  <dl>
    <dt>土地地號</dt><dd>${escapeHtml(landNumber)}</dd>
    <dt>查詢來源</dt><dd><a href="${TAIPEI_ZONING_SOURCE_URL}" target="_blank" rel="noopener noreferrer">${escapeHtml(TAIPEI_ZONING_SOURCE_NAME)}</a></dd>
    <dt>查詢日期</dt><dd>${escapeHtml(queriedAt)}</dd>
    <dt>查詢狀態</dt><dd>${result.success ? '成功' : '失敗'}</dd>
    <dt>使用分區</dt><dd>${escapeHtml(zone)}</dd>
    <dt>訊息</dt><dd>${escapeHtml(result.message)}</dd>
  </dl>
  <pre>${escapeHtml(JSON.stringify(raw, null, 2))}</pre>
</body>
</html>`;
  return {
    result,
    previewHtml: html,
  };
}

function openPreviewHtml(html: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, '_blank');
  if (!opened) {
    URL.revokeObjectURL(url);
    alert('瀏覽器阻擋了新分頁，請允許彈出視窗後再試一次。');
    return;
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function TaipeiZoningAutoQuery({
  landParcels,
  districtHint,
  propertyId,
  propertyType,
  ownerId,
  onResult,
  onSavedDocument,
}: TaipeiZoningAutoQueryProps) {
  const landParcelKey = landParcels.map((parcel) => parcel.value.replace(/\s+/g, '')).join('|');
  const [queryingKey, setQueryingKey] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ZoningQueryFile>>({});
  const [queryRowCount, setQueryRowCount] = useState(Math.max(landParcels.length, 1));

  useEffect(() => {
    setResults({});
    setQueryRowCount(Math.max(landParcels.length, 1));
  }, [landParcelKey, landParcels.length]);

  const allParcels = landParcels.filter((parcel, index, self) =>
    index === self.findIndex((item) => item.value.replace(/\s+/g, '') === parcel.value.replace(/\s+/g, ''))
  );
  const rows = allParcels.map((parcel) => ({
    parcel,
    parsed: parseLandNumber(parcel.value),
    result: results[parcel.value],
  }));
  const canBatchQuery = rows.some((row) => row.parsed);
  const visibleRowCount = Math.max(queryRowCount, rows.length, 1);
  const queryCountOptions = Array.from({ length: 100 }, (_, index) => index + 1);

  const persistQueryFile = useCallback(async (landNumber: string, queryFile: ZoningQueryFile): Promise<{
    saveStatus?: 'saved' | 'failed';
    saveMessage?: string;
    savedDocument?: PropertyDocumentItem;
  }> => {
    if (!queryFile.result.success || !queryFile.result.data?.zone) return {};
    const saved = await saveZoningQueryDocument({
      propertyId,
      propertyType,
      ownerId,
      landNumber,
      html: queryFile.previewHtml,
    });
    return saved.success && saved.document
      ? { saveStatus: 'saved', saveMessage: saved.message, savedDocument: saved.document }
      : { saveStatus: 'failed', saveMessage: saved.message };
  }, [ownerId, propertyId, propertyType]);

  const handleQuery = useCallback(async (parcel: ZoningLandParcelOption) => {
    setQueryingKey(parcel.value);
    try {
      const res = await queryTaipeiZoning(parcel.value, districtHint);
      let queryFile = makeResultPreviewFile(parcel.value, res);
      if (res.success && res.data?.zone) {
        onResult?.(res.data.zone, res.data.raw);
        const saveResult = await persistQueryFile(parcel.value, queryFile);
        queryFile = { ...queryFile, ...saveResult };
        if (saveResult.saveStatus === 'saved') await onSavedDocument?.();
      }
      setResults((prev) => ({ ...prev, [parcel.value]: queryFile }));
    } finally {
      setQueryingKey(null);
    }
  }, [districtHint, onResult, onSavedDocument, persistQueryFile]);

  const handleManualQueryResult = useCallback(async (label: string, result: TaipeiZoningResult): Promise<ZoningQueryFile> => {
    const queryFile = makeResultPreviewFile(label, result);
    if (result.success && result.data?.zone) {
      onResult?.(result.data.zone, result.data.raw);
      const saveResult = await persistQueryFile(label, queryFile);
      if (saveResult.saveStatus === 'saved') await onSavedDocument?.();
      return { ...queryFile, ...saveResult };
    }
    return queryFile;
  }, [onResult, onSavedDocument, persistQueryFile]);

  const handleBatchQuery = useCallback(async () => {
    setQueryingKey('all');
    try {
      const nextResults: Record<string, ZoningQueryFile> = {};
      const successfulZones: Array<{ landNumber: string; zone: string }> = [];
      const rawRecords: Record<string, string>[] = [];
      let savedAnyDocument = false;

      for (const parcel of allParcels.filter((item) => parseLandNumber(item.value))) {
        const res = await queryTaipeiZoning(parcel.value, districtHint);
        let queryFile = makeResultPreviewFile(parcel.value, res);
        nextResults[parcel.value] = queryFile;
        if (res.success && res.data?.zone) {
          successfulZones.push({ landNumber: parcel.value, zone: res.data.zone });
          rawRecords.push(...res.data.raw);
          const saveResult = await persistQueryFile(parcel.value, queryFile);
          queryFile = { ...queryFile, ...saveResult };
          nextResults[parcel.value] = queryFile;
          savedAnyDocument = saveResult.saveStatus === 'saved' || savedAnyDocument;
        }
        setResults({ ...nextResults });
      }

      if (successfulZones.length > 0) {
        onResult?.(formatZoningQuerySummary(successfulZones), rawRecords);
      }
      if (savedAnyDocument) await onSavedDocument?.();
    } finally {
      setQueryingKey(null);
    }
  }, [districtHint, allParcels, onResult, onSavedDocument, persistQueryFile]);

  const deleteQueryFile = useCallback(async (queryFile: { savedDocument?: PropertyDocumentItem }) => {
    if (!queryFile.savedDocument) return;
    const result = await deletePropertyDocument(queryFile.savedDocument.id, queryFile.savedDocument.filePath);
    if (result.success) await onSavedDocument?.();
  }, [onSavedDocument]);

  const deleteResult = useCallback(async (parcel: ZoningLandParcelOption) => {
    const queryFile = results[parcel.value];
    if (queryFile) await deleteQueryFile(queryFile);
    setResults((prev) => {
      const next = { ...prev };
      delete next[parcel.value];
      return next;
    });
  }, [deleteQueryFile, results]);

  return (
    <div className={cardCls}>
      <div className="flex flex-col gap-3 px-4 pt-3 pb-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5">
          <h4 className={sectionTitleCls}>
            <Search size={16} className="text-accent" />
            自動查詢臺北市使用分區
          </h4>
          <p className="text-xs text-text-muted pl-6">從土地謄本地號自動查詢臺北市都市計畫使用分區</p>
        </div>
        <button
          type="button"
          onClick={handleBatchQuery}
          disabled={!canBatchQuery || queryingKey !== null}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {queryingKey === 'all' ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          {queryingKey === 'all' ? '查詢中…' : '查詢全部地號'}
        </button>
      </div>

      <div className="px-4 pb-4">
        <div className="overflow-hidden rounded-md border border-border-default bg-bg-secondary text-xs">
          <div className="border-b border-border-default px-3 py-3">
            <label className="inline-flex items-center gap-2 text-text-primary">
              <span className="font-medium">查詢筆數</span>
              <select
                aria-label="查詢筆數"
                value={visibleRowCount}
                onChange={(event) => setQueryRowCount(Number(event.target.value))}
                className="rounded-md border border-border-default bg-bg-primary px-3 py-2 text-xs text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {queryCountOptions.map((count) => (
                  <option key={count} value={count}>{count}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="hidden grid-cols-[56px_minmax(92px,0.85fr)_minmax(120px,1fr)_minmax(96px,0.85fr)_minmax(170px,1.15fr)_minmax(150px,1fr)_minmax(170px,1.15fr)_auto] gap-3 border-b border-border-default px-3 py-2 text-text-muted lg:grid">
            <span>編號</span>
            <span>行政區</span>
            <span>地段</span>
            <span>小段</span>
            <span>查詢方式</span>
            <span>地號</span>
            <span>查詢結果與預覽</span>
            <span className="text-right">動作</span>
          </div>
          {rows.map(({ parcel, parsed, result }, index) => {
            const isRowQuerying = queryingKey === parcel.value || queryingKey === 'all';
            const queryResult = result?.result;
            return (
              <div
                key={parcel.value}
                className="grid gap-2 border-b border-border-default px-3 py-3 last:border-0 lg:grid-cols-[56px_minmax(92px,0.85fr)_minmax(120px,1fr)_minmax(96px,0.85fr)_minmax(170px,1.15fr)_minmax(150px,1fr)_minmax(170px,1.15fr)_auto] lg:items-center lg:gap-3"
              >
                <div className="min-w-0">
                  <p className="text-[11px] text-text-muted lg:hidden">編號</p>
                  <input
                    aria-label={`第${index + 1}筆編號`}
                    value={index + 1}
                    readOnly
                    className="w-12 rounded-md border border-border-default bg-bg-primary px-2 py-2 text-center text-xs text-text-primary"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-text-muted lg:hidden">行政區</p>
                  <select
                    aria-label={`第${index + 1}筆行政區`}
                    value={parsed?.district || districtHint || ''}
                    disabled
                    className="w-full rounded-md border border-border-default bg-bg-primary px-2 py-2 text-xs text-text-primary disabled:opacity-100"
                  >
                    <option value={parsed?.district || districtHint || ''}>{parsed?.district || districtHint || '請選擇'}</option>
                  </select>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-text-muted lg:hidden">地段</p>
                  <select
                    aria-label={`第${index + 1}筆地段`}
                    value={parsed?.section || ''}
                    disabled
                    className="w-full rounded-md border border-border-default bg-bg-primary px-2 py-2 text-xs text-text-primary disabled:opacity-100"
                  >
                    <option value={parsed?.section || ''}>{parsed?.section || '—'}</option>
                  </select>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-text-muted lg:hidden">小段</p>
                  <select
                    aria-label={`第${index + 1}筆小段`}
                    value={parsed?.subsection || ''}
                    disabled
                    className="w-full rounded-md border border-border-default bg-bg-primary px-2 py-2 text-xs text-text-primary disabled:opacity-100"
                  >
                    <option value={parsed?.subsection || ''}>{parsed?.subsection || '—'}</option>
                  </select>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-text-muted lg:hidden">查詢方式</p>
                  <select
                    aria-label={`第${index + 1}筆查詢方式`}
                    value="single"
                    disabled
                    className="w-full rounded-md border border-border-default bg-bg-primary px-2 py-2 text-xs text-text-primary disabled:opacity-100"
                  >
                    <option value="single">單筆地號(母號-子號)</option>
                    <option value="range">連續地號起訖(母號-母號)</option>
                  </select>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-text-muted lg:hidden">地號</p>
                  {parsed ? (
                    <div className="flex items-center gap-1">
                      <input
                        aria-label={`第${index + 1}筆母號`}
                        value={parsed.motherNo.padStart(4, '0')}
                        readOnly
                        className="min-w-0 flex-1 rounded-md border border-border-default bg-bg-primary px-2 py-2 text-center text-xs font-medium text-text-primary"
                      />
                      <span className="text-text-muted">-</span>
                      <input
                        aria-label={`第${index + 1}筆子號`}
                        value={parsed.childNo.padStart(4, '0')}
                        readOnly
                        className="min-w-0 flex-1 rounded-md border border-border-default bg-bg-primary px-2 py-2 text-center text-xs font-medium text-text-primary"
                      />
                    </div>
                  ) : (
                    <p className="truncate text-red-400">{parcel.value}</p>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-text-muted sm:hidden">查詢結果與預覽</p>
                  {!queryResult && <p className="text-text-muted">尚未查詢</p>}
                  {queryResult && queryResult.success && queryResult.data && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-green-500">
                        <CheckCircle2 size={14} className="shrink-0" />
                        <span className="truncate">{queryResult.data.zone || '查無使用分區'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openPreviewHtml(result.previewHtml)}
                        className="inline-flex max-w-full items-center gap-1.5 text-accent hover:underline"
                      >
                        <Eye size={13} className="shrink-0" />
                        預覽檔案
                      </button>
                      {result.saveStatus === 'failed' && (
                        <p className="text-red-400">{result.saveMessage}</p>
                      )}
                    </div>
                  )}
                  {queryResult && !queryResult.success && (
                    <div className="space-y-1">
                      <div className="flex items-start gap-1.5 text-red-400">
                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                        <span>{queryResult.message}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openPreviewHtml(result.previewHtml)}
                        className="inline-flex max-w-full items-center gap-1.5 text-accent hover:underline"
                      >
                        <Eye size={13} className="shrink-0" />
                        預覽檔案
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap justify-start gap-1.5 lg:justify-end">
                  <button
                    type="button"
                    onClick={() => void handleQuery(parcel)}
                    disabled={!parsed || queryingKey !== null}
                    className="inline-flex items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isRowQuerying ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                    {isRowQuerying ? '查詢中…' : '查詢'}
                  </button>
                  {result && (
                    <button
                      type="button"
                      onClick={() => void deleteResult(parcel)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                    >
                      <Trash2 size={13} />
                      刪除
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {Array.from({ length: Math.max(0, visibleRowCount - rows.length) }, (_, index) => (
            <TaipeiZoningManualQueryRow
              key={`manual-${rows.length + index + 1}`}
              rowNumber={rows.length + index + 1}
              districtHint={districtHint}
              disabled={queryingKey !== null}
              onQueryResult={handleManualQueryResult}
              onDeleteQueryFile={deleteQueryFile}
              onPreview={openPreviewHtml}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
