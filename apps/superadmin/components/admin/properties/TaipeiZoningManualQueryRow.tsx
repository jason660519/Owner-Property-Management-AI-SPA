'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, Loader2, Search, Trash2 } from 'lucide-react';
import type { PropertyDocumentItem } from '@/lib/types/properties';
import {
  getTaipeiZoningDistrictOptions,
  getTaipeiZoningLotOptions,
  getTaipeiZoningSectionOptions,
  getTaipeiZoningSubsectionOptions,
  queryTaipeiZoningOfficialInput,
  type TaipeiZoningLotOption,
  type TaipeiZoningOption,
  type TaipeiZoningResult,
} from '@/lib/actions/taipei-zoning';

interface TaipeiZoningManualQueryRowProps {
  rowNumber: number;
  districtHint: string;
  disabled: boolean;
  onQueryResult: (label: string, result: TaipeiZoningResult) => {
    result: TaipeiZoningResult;
    previewHtml: string;
    saveStatus?: 'saved' | 'failed';
    saveMessage?: string;
    savedDocument?: PropertyDocumentItem;
  } | Promise<{
    result: TaipeiZoningResult;
    previewHtml: string;
    saveStatus?: 'saved' | 'failed';
    saveMessage?: string;
    savedDocument?: PropertyDocumentItem;
  }>;
  onDeleteQueryFile: (queryFile: {
    savedDocument?: PropertyDocumentItem;
  }) => Promise<void>;
  onPreview: (html: string) => void;
}

function withSuffix(value: string, suffix: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.endsWith(suffix) ? trimmed : `${trimmed}${suffix}`;
}

function padLot(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits ? digits.padStart(4, '0') : '';
}

function buildLandNumber(
  district: TaipeiZoningOption | undefined,
  section: TaipeiZoningOption | undefined,
  subsection: TaipeiZoningOption | undefined,
  lot: TaipeiZoningLotOption | undefined,
): string {
  if (!district || !section || !subsection || !lot) return '';
  const sectionLabel = withSuffix(section.label, '段');
  const subsectionLabel = withSuffix(subsection.label, '小段');
  const motherNo = padLot(lot.motherNo);
  const childNo = padLot(lot.childNo || '0');
  if (!motherNo || !childNo) return '';
  return `${district.label}${sectionLabel}${subsectionLabel} ${motherNo}-${childNo}地號`;
}

function buildRangeLabel(
  district: TaipeiZoningOption | undefined,
  section: TaipeiZoningOption | undefined,
  subsection: TaipeiZoningOption | undefined,
  startNo: string,
  endNo: string,
): string {
  if (!district || !section || !subsection || !startNo || !endNo) return '';
  const sectionLabel = withSuffix(section.label, '段');
  const subsectionLabel = withSuffix(subsection.label, '小段');
  return `${district.label}${sectionLabel}${subsectionLabel} ${startNo}~${endNo}地號`;
}

export function TaipeiZoningManualQueryRow({
  rowNumber,
  districtHint,
  disabled,
  onQueryResult,
  onDeleteQueryFile,
  onPreview,
}: TaipeiZoningManualQueryRowProps) {
  const [districtOptions, setDistrictOptions] = useState<TaipeiZoningOption[]>([]);
  const [sectionOptions, setSectionOptions] = useState<TaipeiZoningOption[]>([]);
  const [subsectionOptions, setSubsectionOptions] = useState<TaipeiZoningOption[]>([]);
  const [lotOptions, setLotOptions] = useState<TaipeiZoningLotOption[]>([]);
  const [districtId, setDistrictId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [subsectionId, setSubsectionId] = useState('');
  const [lotId, setLotId] = useState('');
  const [queryMode, setQueryMode] = useState<'single' | 'range'>('single');
  const [rangeStartNo, setRangeStartNo] = useState('');
  const [rangeEndNo, setRangeEndNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [queryFile, setQueryFile] = useState<{
    result: TaipeiZoningResult;
    previewHtml: string;
    saveStatus?: 'saved' | 'failed';
    saveMessage?: string;
    savedDocument?: PropertyDocumentItem;
  } | null>(null);

  const clearQueryFile = useCallback(() => {
    setQueryFile(null);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!queryFile) return;
    await onDeleteQueryFile(queryFile);
    setQueryFile(null);
  }, [onDeleteQueryFile, queryFile]);

  useEffect(() => {
    let active = true;
    void getTaipeiZoningDistrictOptions().then((options) => {
      if (!active) return;
      setDistrictOptions(options);
      const matched = options.find((item) => item.label === districtHint);
      setDistrictId((matched ?? options[0])?.id ?? '');
    });
    return () => {
      active = false;
    };
  }, [districtHint]);

  useEffect(() => {
    let active = true;
    setSectionOptions([]);
    setSubsectionOptions([]);
    setLotOptions([]);
    setSectionId('');
    setSubsectionId('');
    setLotId('');
    if (!districtId) return () => {
      active = false;
    };
    void getTaipeiZoningSectionOptions(districtId).then((options) => {
      if (!active) return;
      setSectionOptions(options);
    });
    return () => {
      active = false;
    };
  }, [districtId]);

  useEffect(() => {
    let active = true;
    setSubsectionOptions([]);
    setLotOptions([]);
    setSubsectionId('');
    setLotId('');
    if (!districtId || !sectionId) return () => {
      active = false;
    };
    void getTaipeiZoningSubsectionOptions(districtId, sectionId).then((options) => {
      if (!active) return;
      setSubsectionOptions(options);
    });
    return () => {
      active = false;
    };
  }, [districtId, sectionId]);

  useEffect(() => {
    let active = true;
    setLotOptions([]);
    setLotId('');
    if (!districtId || !sectionId || !subsectionId) return () => {
      active = false;
    };
    void getTaipeiZoningLotOptions(districtId, sectionId, subsectionId).then((options) => {
      if (!active) return;
      setLotOptions(options);
    });
    return () => {
      active = false;
    };
  }, [districtId, sectionId, subsectionId]);

  const selectedDistrict = useMemo(
    () => districtOptions.find((item) => item.id === districtId),
    [districtId, districtOptions],
  );
  const selectedSection = useMemo(
    () => sectionOptions.find((item) => item.id === sectionId),
    [sectionId, sectionOptions],
  );
  const selectedSubsection = useMemo(
    () => subsectionOptions.find((item) => item.id === subsectionId),
    [subsectionId, subsectionOptions],
  );
  const selectedLot = useMemo(
    () => lotOptions.find((item) => item.id === lotId),
    [lotId, lotOptions],
  );

  const singleLandNumber = useMemo(
    () => buildLandNumber(selectedDistrict, selectedSection, selectedSubsection, selectedLot),
    [selectedDistrict, selectedLot, selectedSection, selectedSubsection],
  );
  const canQuery = queryMode === 'single'
    ? singleLandNumber !== ''
    : Boolean(selectedDistrict && selectedSection && selectedSubsection && rangeStartNo && rangeEndNo);

  const handleQuery = useCallback(async () => {
    if (!canQuery) return;
    setLoading(true);
    try {
      const label = queryMode === 'single'
        ? singleLandNumber
        : buildRangeLabel(selectedDistrict, selectedSection, selectedSubsection, rangeStartNo, rangeEndNo);
      const result = await queryTaipeiZoningOfficialInput({
        label,
        mode: queryMode,
        secId: districtId,
        sectionId,
        subsectionId,
        motherNo: selectedLot?.motherNo,
        childNo: selectedLot?.childNo,
        rangeStartNo: queryMode === 'range' ? rangeStartNo : undefined,
        rangeEndNo: queryMode === 'range' ? rangeEndNo : undefined,
      });
      setQueryFile(await onQueryResult(label, result));
    } finally {
      setLoading(false);
    }
  }, [
    canQuery,
    districtId,
    onQueryResult,
    queryMode,
    rangeEndNo,
    rangeStartNo,
    sectionId,
    selectedDistrict,
    selectedLot,
    selectedSection,
    selectedSubsection,
    singleLandNumber,
    subsectionId,
  ]);

  return (
    <div className="grid gap-2 px-3 py-3 lg:grid-cols-[56px_minmax(92px,0.85fr)_minmax(120px,1fr)_minmax(96px,0.85fr)_minmax(170px,1.15fr)_minmax(150px,1fr)_minmax(170px,1.15fr)_auto] lg:items-center lg:gap-3">
      <div className="min-w-0">
        <p className="text-[11px] text-text-muted lg:hidden">編號</p>
        <input
          aria-label="新增地號編號"
          value={rowNumber}
          readOnly
          className="w-12 rounded-md border border-border-default bg-bg-primary px-2 py-2 text-center text-xs text-text-primary"
        />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-text-muted lg:hidden">行政區</p>
        <select
          aria-label="新增地號行政區"
          value={districtId}
          onChange={(event) => {
            clearQueryFile();
            setDistrictId(event.target.value);
          }}
          disabled={disabled || loading || districtOptions.length === 0}
          className="w-full rounded-md border border-border-default bg-bg-primary px-2 py-2 text-xs text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-70"
        >
          <option value="">請選擇</option>
          {districtOptions.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-text-muted lg:hidden">地段</p>
        <select
          aria-label="新增地號地段"
          value={sectionId}
          onChange={(event) => {
            clearQueryFile();
            setSectionId(event.target.value);
          }}
          disabled={disabled || loading || !districtId || sectionOptions.length === 0}
          className="w-full rounded-md border border-border-default bg-bg-primary px-2 py-2 text-xs text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-70"
        >
          <option value="">請選擇地段</option>
          {sectionOptions.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-text-muted lg:hidden">小段</p>
        <select
          aria-label="新增地號小段"
          value={subsectionId}
          onChange={(event) => {
            clearQueryFile();
            setSubsectionId(event.target.value);
          }}
          disabled={disabled || loading || !sectionId || subsectionOptions.length === 0}
          className="w-full rounded-md border border-border-default bg-bg-primary px-2 py-2 text-xs text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-70"
        >
          <option value="">請選擇小段</option>
          {subsectionOptions.map((item) => (
            <option key={item.id} value={item.id}>{withSuffix(item.label, '小段')}</option>
          ))}
        </select>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-text-muted lg:hidden">查詢方式</p>
        <select
          aria-label="新增地號查詢方式"
          value={queryMode}
          onChange={(event) => {
            clearQueryFile();
            setQueryMode(event.target.value as 'single' | 'range');
          }}
          className="w-full rounded-md border border-border-default bg-bg-primary px-2 py-2 text-xs text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="single">單筆地號(母號-子號)</option>
          <option value="range">連續地號起訖(母號~母號)</option>
        </select>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-text-muted lg:hidden">地號</p>
        {queryMode === 'single' ? (
          <select
            aria-label="新增地號地號"
            value={lotId}
            onChange={(event) => {
              clearQueryFile();
              setLotId(event.target.value);
            }}
            disabled={disabled || loading || !subsectionId || lotOptions.length === 0}
            className="w-full rounded-md border border-border-default bg-bg-primary px-2 py-2 text-xs text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-70"
          >
            <option value="">請選擇地號</option>
            {lotOptions.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        ) : (
          <div className="flex items-center gap-1">
            <input
              aria-label="新增地號起號"
              value={rangeStartNo}
              onChange={(event) => {
                clearQueryFile();
                setRangeStartNo(event.target.value.replace(/\D/g, '').slice(0, 4));
              }}
              disabled={disabled || loading || !subsectionId}
              placeholder="起號"
              className="min-w-0 flex-1 rounded-md border border-border-default bg-bg-primary px-2 py-2 text-center text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-70"
            />
            <span className="text-text-muted">-</span>
            <input
              aria-label="新增地號迄號"
              value={rangeEndNo}
              onChange={(event) => {
                clearQueryFile();
                setRangeEndNo(event.target.value.replace(/\D/g, '').slice(0, 4));
              }}
              disabled={disabled || loading || !subsectionId}
              placeholder="迄號"
              className="min-w-0 flex-1 rounded-md border border-border-default bg-bg-primary px-2 py-2 text-center text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-70"
            />
          </div>
        )}
      </div>
      <div className="min-w-0 text-text-muted">
        <p className="text-[11px] text-text-muted lg:hidden">查詢結果與預覽</p>
        {!queryFile && (
          <p>{queryMode === 'single' ? '查詢後顯示於同一筆地號列' : '輸入起迄母號後即可連號查詢'}</p>
        )}
        {queryFile && queryFile.result.success && queryFile.result.data && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-green-500">
              <CheckCircle2 size={14} className="shrink-0" />
              <span className="truncate">{queryFile.result.data.zone || '查無使用分區'}</span>
            </div>
            <button
              type="button"
              onClick={() => onPreview(queryFile.previewHtml)}
              className="inline-flex max-w-full items-center gap-1.5 text-accent hover:underline"
            >
              <Eye size={13} className="shrink-0" />
              預覽檔案
            </button>
            {queryFile.saveStatus === 'failed' && (
              <p className="text-red-400">{queryFile.saveMessage}</p>
            )}
          </div>
        )}
        {queryFile && !queryFile.result.success && (
          <div className="flex items-start gap-1.5 text-red-400">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{queryFile.result.message}</span>
          </div>
        )}
      </div>
      <div className="flex justify-start lg:justify-end">
        <div className="flex flex-wrap justify-start gap-1.5 lg:justify-end">
          <button
            type="button"
            onClick={() => void handleQuery()}
            disabled={!canQuery || disabled || loading}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
            {loading ? '查詢中…' : '查詢'}
          </button>
          {queryFile && (
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
            >
              <Trash2 size={13} />
              刪除
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
