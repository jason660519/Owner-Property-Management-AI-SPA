// filepath: apps/superadmin/components/admin/properties/TranscriptTabContent.tsx
// 謄本單頁：
//   頂部 — 銷售方式五擇一（與 details.independentTitleSaleMode 同步）
//   下方 — 五個對應區塊，各含主建物／土地或獨立車位謄本上傳與 AI 解析（預設收合）
'use client';

import { useState, useEffect, useRef, useCallback, useTransition } from 'react';
import {
  FileText,
  ExternalLink,
  Trash2,
  Loader2,
  Upload,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  getPropertyDocuments,
  uploadPropertyDocument,
  deletePropertyDocument,
  savePropertyHasIndependentParking,
  savePropertyIndependentTitleSaleMode,
} from '@/lib/actions/properties';
import type { IndependentTitleSaleMode, PropertyDocumentItem, PropertyItem } from '@/lib/types/properties';
import type { BuildingTranscriptData, LandTranscriptData } from '@/lib/types/properties';
import { TranscriptParseSection } from './TranscriptParseSection';
import { BuildingTranscriptForm } from './BuildingTranscriptForm';
import { LandTranscriptForm } from './LandTranscriptForm';

const TRANSCRIPT_EXPAND_LABEL = '展開謄本';
const TRANSCRIPT_COLLAPSE_LABEL = '收合謄本';

type TranscriptKind = 'building' | 'land' | 'parking_building' | 'parking_land';

const DOC_TYPE_BY_KIND = {
  building: 'building_registry_transcript',
  land: 'land_registry_transcript',
  parking_building: 'parking_building_registry_transcript',
  parking_land: 'parking_land_registry_transcript',
} as const;

const TITLE_BY_KIND: Record<TranscriptKind, string> = {
  building: '建物全部',
  land: '土地全部',
  parking_building: '車位建物全部',
  parking_land: '車位土地全部',
};

const UPLOAD_LABEL_BY_KIND: Record<TranscriptKind, string> = {
  building: '上傳建物謄本',
  land: '上傳土地謄本',
  parking_building: '上傳車位建物謄本',
  parking_land: '上傳車位土地謄本',
};

/** 與上方 radio 五選一標籤一致 */
const INDEPENDENT_TITLE_SALE_OPTIONS: readonly (readonly [IndependentTitleSaleMode, string])[] = [
  ['building_only', '單獨銷售獨立產權建築物'],
  ['parking_only', '單獨銷售獨立產權車位'],
  ['together', '獨立產權建築物與獨立產權車位一起銷售'],
  ['common_parking_only', '單獨銷售公設產權車位'],
  ['building_common_parking_together', '獨立產權建築物與公設產權車位一起銷售'],
] as const;

const SALE_MODE_SECTION_HINT: Record<IndependentTitleSaleMode, string> = {
  building_only: '請上傳「主建物」建物／土地謄本並解析；不含獨立產權車位謄本。',
  parking_only: '請上傳「獨立產權車位」專用之車位建物／土地謄本並解析。',
  together: '請分別完成主建物與土地、以及獨立產權車位之謄本上傳與解析。',
  common_parking_only:
    '公設車位通常登載於主建物謄本之共有部分；請以主建物／土地謄本為主進行上傳與解析。',
  building_common_parking_together:
    '主建物與公設車位一併銷售時，仍以主建物／土地謄本為主；車位若見於共有部分，請於建物謄本辨識。',
};

// Maps kind to the transcript data key used in BuildingTranscriptForm / LandTranscriptForm
type BuildingKey = 'buildingTranscript' | 'parkingBuildingTranscript';
type LandKey = 'landTranscript' | 'parkingLandTranscript';

interface TranscriptColumnProps {
  kind: TranscriptKind;
  propertyId: string;
  propertyType: 'sale' | 'rental';
  ownerId: string;
  salesMode?: IndependentTitleSaleMode | null;
  documents: PropertyDocumentItem[];
  onRefresh: () => Promise<void>;
  initialBuildingData?: BuildingTranscriptData | null;
  initialLandData?: LandTranscriptData | null;
  buildingKey?: BuildingKey;
  landKey?: LandKey;
}

function TranscriptColumn({
  kind,
  propertyId,
  propertyType,
  ownerId,
  salesMode,
  documents,
  onRefresh,
  initialBuildingData,
  initialLandData,
  buildingKey = 'buildingTranscript',
  landKey = 'landTranscript',
}: TranscriptColumnProps) {
  const docType = DOC_TYPE_BY_KIND[kind];
  const title = TITLE_BY_KIND[kind];
  const uploadLabel = UPLOAD_LABEL_BY_KIND[kind];
  const [docFile, setDocFile] = useState<File | null>(null);
  const [isDocUploading, setIsDocUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [fillBuildingFromParse, setFillBuildingFromParse] = useState<BuildingTranscriptData | null>(null);
  const [fillLandFromParse, setFillLandFromParse] = useState<LandTranscriptData | null>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const onBuildingTranscribeApplied = useCallback(() => setFillBuildingFromParse(null), []);
  const onLandTranscribeApplied = useCallback(() => setFillLandFromParse(null), []);

  const isBuildingKind = kind === 'building' || kind === 'parking_building';

  async function handleDocUpload() {
    if (!docFile) return;
    setIsDocUploading(true);
    setFeedback(null);
    const fd = new FormData();
    fd.append('file', docFile);
    const result = await uploadPropertyDocument(propertyId, propertyType, ownerId, docType, fd);
    setIsDocUploading(false);
    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
      setDocFile(null);
      if (docInputRef.current) docInputRef.current.value = '';
      await onRefresh();
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  }

  async function handleDocDelete(doc: PropertyDocumentItem) {
    const result = await deletePropertyDocument(doc.id, doc.filePath);
    if (result.success) {
      setFeedback({ type: 'success', message: '文件已刪除' });
      await onRefresh();
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  }

  return (
    <div className="flex flex-col min-h-0 rounded-lg border border-border-default bg-bg-primary overflow-hidden h-full">
      <div className="shrink-0 px-4 py-3 border-b border-border-default">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      </div>
      <div className="flex-1 min-h-0 overflow-y-scroll p-4 space-y-4">
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

        {/* Upload area */}
        <div className="border border-dashed border-border-default rounded-md p-3 space-y-2.5">
          <p className="text-xs font-medium text-text-secondary">
            {uploadLabel} <span className="text-text-muted font-normal">(PDF / JPG / PNG / WebP，最大 20 MB)</span>
          </p>
          <input
            ref={docInputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
            className="w-full text-xs text-text-secondary file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-bg-tertiary file:text-text-secondary hover:file:bg-border-default cursor-pointer"
          />
          <button
            type="button"
            onClick={handleDocUpload}
            disabled={!docFile || isDocUploading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-xs rounded-md hover:bg-accent-hover transition-colors disabled:opacity-40"
          >
            {isDocUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            {isDocUploading ? '上傳中…' : uploadLabel}
          </button>
        </div>

        {/* Uploaded documents list */}
        {documents.length > 0 ? (
          <ul className="space-y-1.5">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center gap-2 px-3 py-2 rounded-md bg-bg-tertiary border border-border-default"
              >
                <FileText size={14} className="text-text-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-text-primary truncate block">{doc.documentName}</span>
                </div>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-text-muted hover:text-accent transition-colors"
                  title="開啟文件"
                >
                  <ExternalLink size={13} />
                </a>
                <button
                  type="button"
                  onClick={() => handleDocDelete(doc)}
                  className="p-1 text-text-muted hover:text-red-500 transition-colors"
                  title="刪除文件"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-text-muted text-xs">尚無{title}謄本文件</p>
        )}

        {/* AI parse section */}
        {documents.length > 0 && (
          <TranscriptParseSection
            transcriptDocs={documents}
            kind={isBuildingKind ? 'building' : 'land'}
            salesMode={salesMode ?? undefined}
            onTranscribe={(result) => {
              if (isBuildingKind) {
                setFillBuildingFromParse(result as BuildingTranscriptData);
              } else {
                setFillLandFromParse(result as LandTranscriptData);
              }
            }}
          />
        )}

        {/* Structured forms */}
        {isBuildingKind && (
          <BuildingTranscriptForm
            propertyId={propertyId}
            propertyType={propertyType}
            initialData={initialBuildingData}
            fillFromParsedTranscript={fillBuildingFromParse}
            onTranscribeApplied={onBuildingTranscribeApplied}
            transcriptKey={buildingKey}
          />
        )}
        {!isBuildingKind && (
          <LandTranscriptForm
            propertyId={propertyId}
            propertyType={propertyType}
            initialData={initialLandData}
            fillFromParsedTranscript={fillLandFromParse}
            onTranscribeApplied={onLandTranscribeApplied}
            transcriptKey={landKey}
          />
        )}
      </div>
    </div>
  );
}

interface TranscriptExpandToggleProps {
  expanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
  /** 游標提示：停用時說明為何無法展開 */
  disabledHint?: string;
  isBusy?: boolean;
}

function TranscriptExpandToggle({
  expanded,
  onToggle,
  disabled = false,
  disabledHint,
  isBusy = false,
}: TranscriptExpandToggleProps) {
  const actionLabel = expanded ? TRANSCRIPT_COLLAPSE_LABEL : TRANSCRIPT_EXPAND_LABEL;
  const title = disabled && disabledHint ? disabledHint : actionLabel;

  return (
    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
      {isBusy && <Loader2 size={12} className="animate-spin text-text-muted" aria-hidden />}
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-expanded={expanded}
        aria-label={actionLabel}
        title={title}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-text-secondary border border-border-default bg-bg-primary hover:text-text-primary hover:bg-bg-tertiary transition-colors disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-bg-primary"
      >
        <span className="text-xs font-medium whitespace-nowrap">{actionLabel}</span>
        {expanded ? (
          <ChevronUp size={16} className="shrink-0" aria-hidden />
        ) : (
          <ChevronDown size={16} className="shrink-0" aria-hidden />
        )}
      </button>
    </div>
  );
}

const MAIN_GRID_CLASS = 'grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[600px]';

interface SaleModeTranscriptGridsProps {
  mode: IndependentTitleSaleMode;
  property: PropertyItem;
  buildingDocs: PropertyDocumentItem[];
  landDocs: PropertyDocumentItem[];
  parkingBuildingDocs: PropertyDocumentItem[];
  parkingLandDocs: PropertyDocumentItem[];
  onRefresh: () => Promise<void>;
}

function SaleModeTranscriptGrids({
  mode,
  property,
  buildingDocs,
  landDocs,
  parkingBuildingDocs,
  parkingLandDocs,
  onRefresh,
}: SaleModeTranscriptGridsProps) {
  const { id, type, ownerId } = property;

  const mainPair = (
    <>
      <TranscriptColumn
        kind="building"
        propertyId={id}
        propertyType={type}
        ownerId={ownerId}
        salesMode={mode}
        documents={buildingDocs}
        onRefresh={onRefresh}
        initialBuildingData={property.buildingTranscript}
        buildingKey="buildingTranscript"
      />
      <TranscriptColumn
        kind="land"
        propertyId={id}
        propertyType={type}
        ownerId={ownerId}
        salesMode={mode}
        documents={landDocs}
        onRefresh={onRefresh}
        initialLandData={property.landTranscript}
        landKey="landTranscript"
      />
    </>
  );

  const parkingPair = (
    <>
      <TranscriptColumn
        kind="parking_building"
        propertyId={id}
        propertyType={type}
        ownerId={ownerId}
        salesMode={mode}
        documents={parkingBuildingDocs}
        onRefresh={onRefresh}
        initialBuildingData={property.parkingBuildingTranscript}
        buildingKey="parkingBuildingTranscript"
      />
      <TranscriptColumn
        kind="parking_land"
        propertyId={id}
        propertyType={type}
        ownerId={ownerId}
        salesMode={mode}
        documents={parkingLandDocs}
        onRefresh={onRefresh}
        initialLandData={property.parkingLandTranscript}
        landKey="parkingLandTranscript"
      />
    </>
  );

  switch (mode) {
    case 'building_only':
    case 'common_parking_only':
    case 'building_common_parking_together':
      return <div className={MAIN_GRID_CLASS}>{mainPair}</div>;
    case 'parking_only':
      return <div className={MAIN_GRID_CLASS}>{parkingPair}</div>;
    case 'together':
      return (
        <div className="space-y-6">
          <div>
            <p className="text-xs font-medium text-text-secondary mb-3">主建物與土地</p>
            <div className={MAIN_GRID_CLASS}>{mainPair}</div>
          </div>
          <div>
            <p className="text-xs font-medium text-text-secondary mb-3">獨立產權車位</p>
            <div className={MAIN_GRID_CLASS}>{parkingPair}</div>
          </div>
        </div>
      );
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

interface TranscriptTabContentProps {
  property: PropertyItem;
}

const INITIAL_EXPANDED_BY_MODE: Record<IndependentTitleSaleMode, boolean> = {
  building_only: false,
  parking_only: false,
  together: false,
  common_parking_only: false,
  building_common_parking_together: false,
};

export function TranscriptTabContent({ property }: TranscriptTabContentProps) {
  const [documents, setDocuments] = useState<PropertyDocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasIndependentParking, setHasIndependentParking] = useState<boolean>(
    property.hasIndependentParking ?? false
  );
  const [expandedByMode, setExpandedByMode] =
    useState<Record<IndependentTitleSaleMode, boolean>>(INITIAL_EXPANDED_BY_MODE);
  const [independentTitleSaleMode, setIndependentTitleSaleMode] = useState<IndependentTitleSaleMode | null>(
    property.independentTitleSaleMode ?? null
  );
  const [isTitleSalePending, startTitleSaleTransition] = useTransition();

  const refresh = async () => {
    const list = await getPropertyDocuments(property.id);
    setDocuments(list);
  };

  useEffect(() => {
    let cancelled = false;
    getPropertyDocuments(property.id).then((list) => {
      if (!cancelled) setDocuments(list);
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [property.id]);

  useEffect(() => {
    setHasIndependentParking(property.hasIndependentParking ?? false);
    setIndependentTitleSaleMode(property.independentTitleSaleMode ?? null);
  }, [property.id, property.hasIndependentParking, property.independentTitleSaleMode]);

  useEffect(() => {
    setExpandedByMode({ ...INITIAL_EXPANDED_BY_MODE });
  }, [property.id]);

  /** 選定銷售方式時，對應謄本區自動展開 */
  useEffect(() => {
    if (independentTitleSaleMode) {
      setExpandedByMode((prev) => ({ ...prev, [independentTitleSaleMode]: true }));
    }
  }, [independentTitleSaleMode]);

  const isMetaBusy = isTitleSalePending;

  function needsIndependentParkingForMode(mode: IndependentTitleSaleMode | null): boolean {
    return (
      mode === 'parking_only' ||
      mode === 'together' ||
      mode === 'building_common_parking_together'
    );
  }

  function handleIndependentTitleSaleModeChange(mode: IndependentTitleSaleMode) {
    if (isMetaBusy) return;
    const willEnableParking = needsIndependentParkingForMode(mode) && !hasIndependentParking;
    setIndependentTitleSaleMode(mode);
    if (willEnableParking) {
      setHasIndependentParking(true);
    }
    startTitleSaleTransition(async () => {
      if (willEnableParking) {
        await savePropertyHasIndependentParking(property.id, property.type, true);
      }
      await savePropertyIndependentTitleSaleMode(property.id, property.type, mode);
    });
  }

  const buildingDocs = documents.filter((d) => d.documentType === 'building_registry_transcript');
  const landDocs = documents.filter((d) => d.documentType === 'land_registry_transcript');
  const parkingBuildingDocs = documents.filter((d) => d.documentType === 'parking_building_registry_transcript');
  const parkingLandDocs = documents.filter((d) => d.documentType === 'parking_land_registry_transcript');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-text-muted text-sm">
        <Loader2 size={18} className="animate-spin mr-2" />
        載入中…
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-6">
      {/* 銷售方式：獨立卡片，與謄本區視覺分開 */}
      <div className="rounded-lg border border-border-default bg-bg-primary overflow-hidden">
        <div
          className="px-4 py-3 space-y-2.5"
          role="radiogroup"
          aria-label="銷售方式（擇一）"
        >
          <p className="text-xs font-medium text-text-secondary">銷售方式（擇一）</p>
          <p className="text-xs text-text-muted">
            請依所選方式進行對應的謄本上傳與解析。
          </p>
          {INDEPENDENT_TITLE_SALE_OPTIONS.map(([value, label]) => (
            <label
              key={value}
              className="flex items-center gap-2.5 cursor-pointer select-none rounded-md py-1 -my-1"
            >
              <input
                type="radio"
                name={`independent-title-sale-${property.id}`}
                value={value}
                checked={independentTitleSaleMode === value}
                onChange={() => handleIndependentTitleSaleModeChange(value)}
                disabled={isMetaBusy}
                className="w-4 h-4 border-border-default accent-accent cursor-pointer shrink-0"
              />
              <span className="text-sm text-text-primary">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <p className="text-xs font-medium text-text-secondary px-0.5">謄本上傳與 AI 解析（依銷售方式）</p>

      {independentTitleSaleMode ? (
        INDEPENDENT_TITLE_SALE_OPTIONS.filter(([mode]) => mode === independentTitleSaleMode).map(
          ([mode, title]) => (
            <div
              key={mode}
              className="rounded-lg border border-accent bg-bg-primary ring-1 ring-accent/20 overflow-hidden"
            >
              <div className="shrink-0 px-4 py-3 border-b border-border-default flex items-start justify-between gap-4">
                <div className="flex flex-1 min-w-0 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text-primary">{title}</span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-accent/10 text-accent border border-accent/20">
                      目前選定
                    </span>
                  </div>
                  <span className="text-xs text-text-muted leading-relaxed">
                    {SALE_MODE_SECTION_HINT[mode]}
                  </span>
                </div>
                <TranscriptExpandToggle
                  expanded={expandedByMode[mode]}
                  onToggle={() => setExpandedByMode((prev) => ({ ...prev, [mode]: !prev[mode] }))}
                  isBusy={isMetaBusy}
                />
              </div>

              {expandedByMode[mode] && (
                <div className="p-4 sm:p-6">
                  <SaleModeTranscriptGrids
                    mode={mode}
                    property={property}
                    buildingDocs={buildingDocs}
                    landDocs={landDocs}
                    parkingBuildingDocs={parkingBuildingDocs}
                    parkingLandDocs={parkingLandDocs}
                    onRefresh={refresh}
                  />
                </div>
              )}
            </div>
          ),
        )
      ) : (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border-default rounded-lg bg-bg-primary/50 text-text-muted">
          <FileText size={40} className="mb-4 opacity-20" />
          <p className="text-sm font-medium">請先從上方選擇銷售方式</p>
          <p className="text-xs mt-1">選擇後將自動顯示對應的謄本上傳與解析區域</p>
        </div>
      )}
    </div>
  );
}
