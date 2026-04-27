// filepath: apps/superadmin/components/admin/properties/TranscriptTabContent.tsx
// 謄本單頁：
//   頂部 — 標的建築物建號筆數(單選)／標的建築物地號筆數(單選)；其餘銷售方式可複選；車位產權複選（details.parkingTitleRights）
//   下方 — 依銷售方式與勾選顯示主建物／土地、獨立車位謄本、公設車位說明（各選項可獨立收合／展開）
'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useTransition,
  type ReactNode,
} from 'react';
import {
  FileText,
  ExternalLink,
  Trash2,
  Loader2,
  Upload,
  ChevronDown,
  ChevronUp,
  ScanSearch,
  X,
} from 'lucide-react';
import {
  getPropertyDocuments,
  uploadPropertyDocument,
  deletePropertyDocument,
  savePropertyHasIndependentParking,
  savePropertyIndependentTitleSaleModes,
  savePropertyParkingTitleRights,
  savePropertyIndependentBuildingNumberCount,
  savePropertySubjectLandParcelSettings,
} from '@/lib/actions/properties';
import type {
  BuildingTranscriptData,
  IndependentTitleSaleMode,
  LandTranscriptData,
  ParkingTitleRight,
  PropertyDocumentItem,
  PropertyItem,
  SubjectLandParcelScope,
} from '@/lib/types/properties';
import {
  clampIndependentBuildingNumberCount,
  INDEPENDENT_BUILDING_NUMBER_COUNT_MAX,
  INDEPENDENT_BUILDING_NUMBER_COUNT_MIN,
} from '@/lib/types/properties';
import { useAISettings } from '@/lib/hooks/useAISettings';
import { TranscriptParseSection } from './TranscriptParseSection';
import { BuildingTranscriptForm } from './BuildingTranscriptForm';
import { LandTranscriptForm } from './LandTranscriptForm';
import { TranscriptIntakeWorkbench } from './TranscriptIntakeWorkbench';
import { resolveParsePromptScenario } from '@/lib/transcript-parse-scenario-prompts';
import { filterDocumentsForMultiBuildingSlot } from '@/lib/utils/multi-building-doc-tags';

const TRANSCRIPT_EXPAND_LABEL = '展開謄本';
const TRANSCRIPT_COLLAPSE_LABEL = '收合謄本';
const TRANSCRIPT_TOGGLE_MAIN_HINT = '主建物與土地';
const TRANSCRIPT_TOGGLE_PARKING_HINT = '獨立產權車位謄本';
const TRANSCRIPT_TOGGLE_SHARED_HINT = '公設產權車位說明';

type TranscriptKind = 'building' | 'land' | 'parking_building' | 'parking_land';

const DOC_TYPE_BY_KIND = {
  building: 'building_registry_transcript',
  land: 'land_registry_transcript',
  parking_building: 'parking_building_registry_transcript',
  parking_land: 'parking_land_registry_transcript',
} as const;

const TITLE_BY_KIND: Record<TranscriptKind, string> = {
  building: '建築物－建物全部謄本',
  land: '建築物－土地全部／持分謄本',
  parking_building: '車位建物全部',
  parking_land: '車位土地全部',
};

const UPLOAD_LABEL_BY_KIND: Record<TranscriptKind, string> = {
  building: '上傳建築物－建物謄本．',
  land: '上傳建築物－土地謄本',
  parking_building: '上傳車位建物謄本',
  parking_land: '上傳車位土地謄本',
};

/** 各銷售方式顯示名稱（含已自勾選移除之項目，供舊資料顯示） */
const INDEPENDENT_TITLE_SALE_MODE_LABELS: Record<IndependentTitleSaleMode, string> = {
  building_only: '單一筆建築物（單一建號）',
  parking_only: '車位－獨立產權',
  together: '獨立產權建築物與獨立產權車位一起銷售',
  common_parking_only: '車位－公設產權',
  building_common_parking_together: '獨立產權建築物與公設產權車位一起銷售',
};

/**
 * 獨立標的銷售方式可勾選項（僅主建物；車位獨立／公設請用下方「車位產權類型」）。
 * parking_only、common_parking_only 已自本區移除，標籤仍保留於 INDEPENDENT_TITLE_SALE_MODE_LABELS 供舊資料顯示。
 */
const INDEPENDENT_TITLE_SALE_OPTIONS: readonly (readonly [IndependentTitleSaleMode, string])[] = [
  ['building_only', INDEPENDENT_TITLE_SALE_MODE_LABELS.building_only],
] as const;

const SALE_MODE_SECTION_HINT: Record<IndependentTitleSaleMode, string> = {
  building_only: '請上傳「主建物」建物／土地謄本並解析；不含獨立產權車位謄本。',
  parking_only: '請上傳「獨立產權車位」專用之車位建物／土地謄本並解析。',
  together: '請分別完成主建物與土地、以及獨立產權車位之謄本上傳與解析。',
  common_parking_only:
    '注意：公設車位持分附屬於主要建築物之共有部分，通常只能售予同棟或同社區之住戶。',
  building_common_parking_together:
    '主建物與公設車位一併銷售時，仍以主建物／土地謄本為主；車位若見於共有部分，請於建物謄本辨識。',
};

/** 車位產權複選（與銷售方式並存；可同時勾選） */
const PARKING_RIGHT_OPTIONS: readonly (readonly [ParkingTitleRight, string])[] = [
  ['independent', '獨立產權車位（獨立建物／土地謄本）'],
  ['shared_facility', '公設產權車位（共有持分／登載於主建物謄本之停車空間）'],
] as const;

const PARKING_RIGHT_HINTS: Record<ParkingTitleRight, string> = {
  independent: SALE_MODE_SECTION_HINT.parking_only,
  shared_facility: SALE_MODE_SECTION_HINT.common_parking_only,
};

const BUILDING_NUMBER_COUNT_OPTIONS = Array.from(
  { length: INDEPENDENT_BUILDING_NUMBER_COUNT_MAX - INDEPENDENT_BUILDING_NUMBER_COUNT_MIN + 1 },
  (_, i) => INDEPENDENT_BUILDING_NUMBER_COUNT_MIN + i
);

interface DetectBuildingCountResult {
  count: number;
  buildingNumbers: string[];
}

interface DetectLandCountResult {
  count: number;
  landParcelNumbers: string[];
}

// ─── Panel visibility helpers ─────────────────────────────────────────────────

interface TranscriptPanelVis {
  main: boolean;
  parking: boolean;
  shared: boolean;
}

/** Derive which transcript panel sections are relevant given the current selections. */
function computeTranscriptPanelVisibility(
  modes: IndependentTitleSaleMode[],
  rights: ParkingTitleRight[],
): TranscriptPanelVis {
  const wantShared = rights.includes('shared_facility');
  const wantIndependent = rights.includes('independent');
  const needMain = modes.some((m) => m !== 'parking_only');
  const needInd = modes.some((m) => m === 'parking_only' || m === 'together');
  return {
    main: needMain || wantShared,
    parking: needInd || wantIndependent,
    shared: wantShared,
  };
}

/** Which expand-toggles to show in the header row for a given sale mode. */
function togglesForSaleMode(
  mode: IndependentTitleSaleMode,
  vis: TranscriptPanelVis,
): TranscriptPanelVis {
  const perMode: Record<IndependentTitleSaleMode, TranscriptPanelVis> = {
    building_only: { main: true, parking: false, shared: false },
    parking_only: { main: false, parking: true, shared: false },
    together: { main: true, parking: true, shared: false },
    common_parking_only: { main: true, parking: false, shared: false },
    building_common_parking_together: { main: true, parking: false, shared: false },
  };
  const row = perMode[mode];
  return {
    main: row.main && vis.main,
    parking: row.parking && vis.parking,
    shared: row.shared && vis.shared,
  };
}

/** Which expand-toggles to show in the header row for a given parking right. */
function togglesForParkingRight(
  right: ParkingTitleRight,
  vis: TranscriptPanelVis,
): TranscriptPanelVis {
  const perRight: Record<ParkingTitleRight, TranscriptPanelVis> = {
    independent: { main: false, parking: true, shared: false },
    // Shared-facility parking is parsed from main building/land transcripts,
    // so its row toggle should control the main section.
    shared_facility: { main: true, parking: false, shared: false },
  };
  const row = perRight[right];
  return {
    main: row.main && vis.main,
    parking: row.parking && vis.parking,
    shared: row.shared && vis.shared,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

function SharedFacilityParkingCallout() {
  return (
    <div className="rounded-md border border-border-default bg-bg-secondary px-4 py-3">
      <p className="text-xs font-medium text-text-secondary mb-1">公設產權車位</p>
      <p className="text-xs text-text-muted leading-relaxed">
        {SALE_MODE_SECTION_HINT.common_parking_only}
      </p>
    </div>
  );
}

// Maps kind to the transcript data key used in BuildingTranscriptForm / LandTranscriptForm
type BuildingKey = 'buildingTranscript' | 'parkingBuildingTranscript';
type LandKey = 'landTranscript' | 'parkingLandTranscript';

interface TranscriptColumnProps {
  kind: TranscriptKind;
  titleOverride?: string;
  propertyId: string;
  propertyType: 'sale' | 'rental';
  ownerId: string;
  salesMode?: IndependentTitleSaleMode | null;
  /** 謄本解析 Prompt 自動套用鍵（優先於 salesMode），對應 saved_prompt 名稱內 (key) */
  parsePromptScenario?: string;
  /** 多建號分筆：第 index 筆、共 total 筆；上傳帶 mbi 標籤。第 1 筆才顯示結構化謄本表單 */
  multiBuildingSlot?: { index: number; total: number };
  /** 主建物／土地欄：依是否多建號顯示說明（車位欄勿傳） */
  mainBuildingListHint?: 'single' | 'multi';
  documents: PropertyDocumentItem[];
  onRefresh: () => Promise<void>;
  initialBuildingData?: BuildingTranscriptData | null;
  initialLandData?: LandTranscriptData | null;
  buildingKey?: BuildingKey;
  landKey?: LandKey;
}

function TranscriptColumn({
  kind,
  titleOverride,
  propertyId,
  propertyType,
  ownerId,
  salesMode,
  parsePromptScenario,
  multiBuildingSlot,
  mainBuildingListHint,
  documents,
  onRefresh,
  initialBuildingData,
  initialLandData,
  buildingKey = 'buildingTranscript',
  landKey = 'landTranscript',
}: TranscriptColumnProps) {
  const docType = DOC_TYPE_BY_KIND[kind];
  const baseTitle = titleOverride ?? TITLE_BY_KIND[kind];
  const title =
    multiBuildingSlot &&
    (kind === 'building' || kind === 'land')
      ? `${baseTitle}（第 ${multiBuildingSlot.index} 筆，共 ${multiBuildingSlot.total} 筆）`
      : baseTitle;
  const uploadLabel = UPLOAD_LABEL_BY_KIND[kind];
  const slotFilteredDocs =
    multiBuildingSlot && (kind === 'building' || kind === 'land')
      ? filterDocumentsForMultiBuildingSlot(documents, multiBuildingSlot.index)
      : documents;
  const showStructuredTranscriptForm =
    !multiBuildingSlot || multiBuildingSlot.index === 1;
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
    if (
      multiBuildingSlot &&
      (kind === 'building' || kind === 'land')
    ) {
      fd.append('multiBuildingIndex', String(multiBuildingSlot.index));
    }
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
            className={`p-2.5 rounded-md text-xs relative group ${
              feedback.type === 'success'
                ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                : 'bg-red-500/10 text-red-500 border border-red-500/20'
            }`}
          >
            <div className="pr-6">{feedback.message}</div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="absolute top-2 right-2 p-1 rounded-md hover:bg-black/5 transition-colors opacity-60 hover:opacity-100"
              title="關閉提示"
            >
              <X size={14} />
            </button>
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
        {slotFilteredDocs.length > 0 ? (
          <ul className="space-y-1.5">
            {slotFilteredDocs.map((doc) => (
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
        {slotFilteredDocs.length > 0 && (
          <TranscriptParseSection
            transcriptDocs={slotFilteredDocs}
            kind={isBuildingKind ? 'building' : 'land'}
            salesMode={salesMode ?? undefined}
            parseScenarioKey={parsePromptScenario}
            onTranscribe={(result) => {
              if (isBuildingKind) {
                setFillBuildingFromParse(result as BuildingTranscriptData);
              } else {
                setFillLandFromParse(result as LandTranscriptData);
              }
            }}
          />
        )}

        {/* Structured forms（多建號時僅第 1 筆寫入主謄本欄位，其餘筆僅上傳／解析） */}
        {showStructuredTranscriptForm && isBuildingKind && (
          <BuildingTranscriptForm
            propertyId={propertyId}
            propertyType={propertyType}
            initialData={initialBuildingData}
            fillFromParsedTranscript={fillBuildingFromParse}
            onTranscribeApplied={onBuildingTranscribeApplied}
            transcriptKey={buildingKey}
          />
        )}
        {showStructuredTranscriptForm && !isBuildingKind && (
          <LandTranscriptForm
            propertyId={propertyId}
            propertyType={propertyType}
            initialData={initialLandData}
            fillFromParsedTranscript={fillLandFromParse}
            onTranscribeApplied={onLandTranscribeApplied}
            transcriptKey={landKey}
          />
        )}
        {!showStructuredTranscriptForm && (kind === 'building' || kind === 'land') && (
          <p className="text-[11px] text-text-muted leading-relaxed border border-dashed border-border-default rounded-md px-3 py-2 bg-bg-secondary">
            此為第 {multiBuildingSlot?.index} 筆建號；結構化謄本表單請至「第 1 筆建號」區塊編輯。
          </p>
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
  /** 無障礙／title 用：區塊說明（例如「主建物與土地」） */
  sectionHint?: string;
}

function TranscriptExpandToggle({
  expanded,
  onToggle,
  disabled = false,
  disabledHint,
  isBusy = false,
  sectionHint,
}: TranscriptExpandToggleProps) {
  const actionLabel = expanded ? TRANSCRIPT_COLLAPSE_LABEL : TRANSCRIPT_EXPAND_LABEL;
  const title =
    disabled && disabledHint
      ? disabledHint
      : sectionHint
        ? `${actionLabel}：${sectionHint}`
        : actionLabel;
  const ariaLabel = sectionHint ? `${actionLabel}（${sectionHint}）` : actionLabel;

  return (
    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
      {isBusy && <Loader2 size={12} className="animate-spin text-text-muted" aria-hidden />}
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-expanded={expanded}
        aria-label={ariaLabel}
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
  modes: IndependentTitleSaleMode[];
  parkingTitleRights: ParkingTitleRight[];
  property: PropertyItem;
  buildingDocs: PropertyDocumentItem[];
  landDocs: PropertyDocumentItem[];
  parkingBuildingDocs: PropertyDocumentItem[];
  parkingLandDocs: PropertyDocumentItem[];
  onRefresh: () => Promise<void>;
  expandedMain: boolean;
  expandedParking: boolean;
  expandedShared: boolean;
  /** 與表單「建號筆數」同步，避免僅 property 尚未回寫時與摘要／列表筆數不一致 */
  independentBuildingNumberCountLive: number;
}

function SaleModeTranscriptGrids({
  modes,
  parkingTitleRights,
  property,
  buildingDocs,
  landDocs,
  parkingBuildingDocs,
  parkingLandDocs,
  onRefresh,
  expandedMain,
  expandedParking,
  expandedShared,
  independentBuildingNumberCountLive,
}: SaleModeTranscriptGridsProps) {
  const { id, type, ownerId } = property;

  const salesModeForPrompt = modes[0] ?? 'building_only';

  const wantIndependent = parkingTitleRights.includes('independent');
  const wantShared = parkingTitleRights.includes('shared_facility');
  const needMain = modes.some((m) => m !== 'parking_only');
  const needInd = modes.some((m) => m === 'parking_only' || m === 'together');
  const baseShowsIndependent = modes.some((m) => m === 'parking_only' || m === 'together');
  const baseShowsSharedScenario = modes.some(
    (m) => m === 'common_parking_only' || m === 'building_common_parking_together'
  );

  const onlyParkingLayout = needInd && !needMain;
  /** 主建物／土地謄本：銷售方式要求，或勾選公設車位（停車空間見於主建物謄本） */
  const showMainBuildingLand = needMain || wantShared;
  const useSharedFacilityMainTitles = wantShared && !wantIndependent && !needInd;
  const mainBuildingTitle = useSharedFacilityMainTitles ? '公設車位－建物全部謄本' : undefined;
  const mainLandTitle = useSharedFacilityMainTitles ? '公設車位－土地全部／持分謄本' : undefined;

  const multiBuildingCount = clampIndependentBuildingNumberCount(
    modes.includes('building_only')
      ? independentBuildingNumberCountLive
      : (property.independentBuildingNumberCount ?? 1)
  );
  const isMultiMainBuilding = modes.includes('building_only') && multiBuildingCount >= 2;

  const parseScenarioOpts = useMemo(
    () => ({
      independentTitleSaleModes: modes,
      parkingTitleRights,
      independentBuildingNumberCount: multiBuildingCount,
    }),
    [modes, parkingTitleRights, multiBuildingCount],
  );

  const scenarioMainBuilding = String(resolveParsePromptScenario('building', parseScenarioOpts));
  const scenarioMainLand = String(resolveParsePromptScenario('land', parseScenarioOpts));
  const scenarioParkingBuilding = String(resolveParsePromptScenario('parking_building', parseScenarioOpts));
  const scenarioParkingLand = String(resolveParsePromptScenario('parking_land', parseScenarioOpts));

  const [multiMainSlotExpanded, setMultiMainSlotExpanded] = useState<boolean[]>(() =>
    Array.from({ length: multiBuildingCount }, () => true)
  );

  useEffect(() => {
    setMultiMainSlotExpanded(Array.from({ length: multiBuildingCount }, () => true));
  }, [property.id, multiBuildingCount]);

  const mainPair = isMultiMainBuilding ? (
    <div className="space-y-8">
      {Array.from({ length: multiBuildingCount }, (_, i) => i + 1).map((slotIdx) => {
        const slotOpen = multiMainSlotExpanded[slotIdx - 1] ?? true;
        const slotHint = `第 ${slotIdx} 筆建號（共 ${multiBuildingCount} 筆）`;
        return (
          <div key={slotIdx} className="space-y-2 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-text-secondary px-0.5 flex-1 min-w-0">
                {slotHint}
              </p>
              <div className="relative z-10 flex shrink-0 flex-col items-end gap-1 sm:flex-row">
                <TranscriptExpandToggle
                  expanded={slotOpen}
                  onToggle={() => {
                    setMultiMainSlotExpanded((prev) => {
                      const next = Array.from({ length: multiBuildingCount }, (_, j) => prev[j] ?? true);
                      next[slotIdx - 1] = !next[slotIdx - 1];
                      return next;
                    });
                  }}
                  sectionHint={slotHint}
                />
              </div>
            </div>
            {slotOpen ? (
              <div className={MAIN_GRID_CLASS}>
                <TranscriptColumn
                  kind="building"
                  titleOverride={mainBuildingTitle}
                  propertyId={id}
                  propertyType={type}
                  ownerId={ownerId}
                  salesMode={salesModeForPrompt}
                  parsePromptScenario={scenarioMainBuilding}
                  multiBuildingSlot={{ index: slotIdx, total: multiBuildingCount }}
                  mainBuildingListHint="multi"
                  documents={buildingDocs}
                  onRefresh={onRefresh}
                  initialBuildingData={property.buildingTranscript}
                  buildingKey="buildingTranscript"
                />
                <TranscriptColumn
                  kind="land"
                  titleOverride={mainLandTitle}
                  propertyId={id}
                  propertyType={type}
                  ownerId={ownerId}
                  salesMode={salesModeForPrompt}
                  parsePromptScenario={scenarioMainLand}
                  multiBuildingSlot={{ index: slotIdx, total: multiBuildingCount }}
                  mainBuildingListHint="multi"
                  documents={landDocs}
                  onRefresh={onRefresh}
                  initialLandData={property.landTranscript}
                  landKey="landTranscript"
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  ) : (
    <>
      <TranscriptColumn
        kind="building"
        titleOverride={mainBuildingTitle}
        propertyId={id}
        propertyType={type}
        ownerId={ownerId}
        salesMode={salesModeForPrompt}
        parsePromptScenario={scenarioMainBuilding}
        mainBuildingListHint="single"
        documents={buildingDocs}
        onRefresh={onRefresh}
        initialBuildingData={property.buildingTranscript}
        buildingKey="buildingTranscript"
      />
      <TranscriptColumn
        kind="land"
        titleOverride={mainLandTitle}
        propertyId={id}
        propertyType={type}
        ownerId={ownerId}
        salesMode={salesModeForPrompt}
        parsePromptScenario={scenarioMainLand}
        mainBuildingListHint="single"
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
        salesMode={salesModeForPrompt}
        parsePromptScenario={scenarioParkingBuilding}
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
        salesMode={salesModeForPrompt}
        parsePromptScenario={scenarioParkingLand}
        documents={parkingLandDocs}
        onRefresh={onRefresh}
        initialLandData={property.parkingLandTranscript}
        landKey="parkingLandTranscript"
      />
    </>
  );

  const showExtraIndependent = wantIndependent && !baseShowsIndependent;
  const showSharedCallout =
    wantShared &&
    (modes.includes('together') || !baseShowsSharedScenario) &&
    !showMainBuildingLand;

  let core: ReactNode = null;
  if (onlyParkingLayout) {
    core = expandedParking ? <div className={MAIN_GRID_CLASS}>{parkingPair}</div> : null;
  } else if (needMain && needInd) {
    if (!expandedMain && !expandedParking) {
      core = null;
    } else {
      core = (
        <div className="space-y-6">
          {expandedMain ? (
            <div>
              <p className="text-xs font-medium text-text-secondary mb-3">主建物與土地</p>
              {isMultiMainBuilding ? (
                <div className="min-w-0">{mainPair}</div>
              ) : (
                <div className={MAIN_GRID_CLASS}>{mainPair}</div>
              )}
            </div>
          ) : null}
          {expandedParking ? (
            <div>
              <p className="text-xs font-medium text-text-secondary mb-3">獨立產權車位</p>
              <div className={MAIN_GRID_CLASS}>{parkingPair}</div>
            </div>
          ) : null}
        </div>
      );
    }
  } else if (showMainBuildingLand) {
    core = expandedMain ? (
      isMultiMainBuilding ? (
        <div className="min-w-0">{mainPair}</div>
      ) : (
        <div className={MAIN_GRID_CLASS}>{mainPair}</div>
      )
    ) : null;
  }

  return (
    <div className="space-y-6">
      {core}
      {showExtraIndependent && expandedParking ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-text-secondary">獨立產權車位（依勾選顯示）</p>
          <div className={MAIN_GRID_CLASS}>{parkingPair}</div>
        </div>
      ) : null}
      {showSharedCallout && expandedShared ? <SharedFacilityParkingCallout /> : null}
    </div>
  );
}

interface TranscriptTabContentProps {
  property: PropertyItem;
}

export function TranscriptTabContent({ property }: TranscriptTabContentProps) {
  const { userId: aiUserId } = useAISettings();
  const transcriptUploadSectionRef = useRef<HTMLParagraphElement>(null);
  const [documents, setDocuments] = useState<PropertyDocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasIndependentParking, setHasIndependentParking] = useState<boolean>(
    property.hasIndependentParking ?? false
  );
  const [transcriptPanelsExpanded, setTranscriptPanelsExpanded] = useState({
    main: true,
    parking: true,
    shared: true,
  });
  const [independentTitleSaleModes, setIndependentTitleSaleModes] = useState<IndependentTitleSaleMode[]>(
    () => property.independentTitleSaleModes ?? (property.independentTitleSaleMode ? [property.independentTitleSaleMode] : [])
  );
  const [parkingTitleRights, setParkingTitleRights] = useState<ParkingTitleRight[]>(
    () => property.parkingTitleRights ?? []
  );
  const [buildingNumberCount, setBuildingNumberCount] = useState(() =>
    clampIndependentBuildingNumberCount(property.independentBuildingNumberCount ?? 1)
  );
  const [isTitleSalePending, startTitleSaleTransition] = useTransition();
  const [isRightsPending, startRightsTransition] = useTransition();
  const [isBuildingCountPending, startBuildingCountTransition] = useTransition();
  const [isLandParcelPending, startLandParcelTransition] = useTransition();
  // AI detect building count state
  const [isDetectingBuildingCount, setIsDetectingBuildingCount] = useState(false);
  const [detectResult, setDetectResult] = useState<DetectBuildingCountResult | null>(null);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [subjectLandParcelScope, setSubjectLandParcelScope] = useState<SubjectLandParcelScope>(
    () => property.subjectLandParcelScope ?? 'single'
  );
  const [landParcelNumberCount, setLandParcelNumberCount] = useState(() => {
    if (property.subjectLandParcelScope === 'multi') {
      return clampIndependentBuildingNumberCount(
        Math.max(2, property.independentLandParcelNumberCount ?? 2)
      );
    }
    return 1;
  });
  const [isDetectingLandCount, setIsDetectingLandCount] = useState(false);
  const [landDetectResult, setLandDetectResult] = useState<DetectLandCountResult | null>(null);
  const [landDetectError, setLandDetectError] = useState<string | null>(null);
  const [selectedBuildingDetectDocId, setSelectedBuildingDetectDocId] = useState<string | null>(null);
  const [selectedLandDetectDocId, setSelectedLandDetectDocId] = useState<string | null>(null);

  const refresh = async () => {
    const list = await getPropertyDocuments(property.id);
    setDocuments(list);
  };

  useEffect(() => {
    let cancelled = false;
    getPropertyDocuments(property.id)
      .then((list) => {
        if (!cancelled) setDocuments(list);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [property.id]);

  useEffect(() => {
    setHasIndependentParking(property.hasIndependentParking ?? false);
    setIndependentTitleSaleModes(
      property.independentTitleSaleModes ??
        (property.independentTitleSaleMode ? [property.independentTitleSaleMode] : [])
    );
    setParkingTitleRights(property.parkingTitleRights ?? []);
    setBuildingNumberCount(
      clampIndependentBuildingNumberCount(property.independentBuildingNumberCount ?? 1)
    );
    setSubjectLandParcelScope(property.subjectLandParcelScope ?? 'single');
    setLandParcelNumberCount(
      property.subjectLandParcelScope === 'multi'
        ? clampIndependentBuildingNumberCount(
            Math.max(2, property.independentLandParcelNumberCount ?? 2)
          )
        : 1
    );
    setLandDetectResult(null);
    setLandDetectError(null);
    setSelectedBuildingDetectDocId(null);
    setSelectedLandDetectDocId(null);
  }, [
    property.id,
    property.hasIndependentParking,
    property.independentTitleSaleModes,
    property.independentTitleSaleMode,
    property.parkingTitleRights,
    property.independentBuildingNumberCount,
    property.subjectLandParcelScope,
    property.independentLandParcelNumberCount,
  ]);

  useEffect(() => {
    setTranscriptPanelsExpanded({ main: true, parking: true, shared: true });
  }, [property.id]);

  const isMetaBusy =
    isTitleSalePending ||
    isRightsPending ||
    isBuildingCountPending ||
    isLandParcelPending;

  const transcriptPanelVis = useMemo(
    () => computeTranscriptPanelVisibility(independentTitleSaleModes, parkingTitleRights),
    [independentTitleSaleModes, parkingTitleRights]
  );

  const toggleTranscriptPanel = useCallback((key: 'main' | 'parking' | 'shared') => {
    setTranscriptPanelsExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  function needsIndependentParkingForModes(modes: IndependentTitleSaleMode[]): boolean {
    return modes.some(
      (m) =>
        m === 'parking_only' || m === 'together' || m === 'building_common_parking_together'
    );
  }

  function handleBuildingNumberSelect(next: number) {
    if (isMetaBusy) return;
    const v = clampIndependentBuildingNumberCount(next);
    setBuildingNumberCount(v);
    startBuildingCountTransition(async () => {
      await savePropertyIndependentBuildingNumberCount(property.id, property.type, v);
    });
  }

  function scrollToUploadSection() {
    transcriptUploadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleDetectBuildingCount() {
    const buildingDocsForDetect = documents.filter(
      (d) => d.documentType === 'building_registry_transcript',
    );
    if (!buildingDocsForDetect.length || isMetaBusy || isDetectingBuildingCount) return;
    const targetId =
      selectedBuildingDetectDocId &&
      buildingDocsForDetect.some((d) => d.id === selectedBuildingDetectDocId)
        ? selectedBuildingDetectDocId
        : buildingDocsForDetect[0]?.id;
    if (!targetId) return;
    setIsDetectingBuildingCount(true);
    setDetectResult(null);
    setDetectError(null);
    try {
      const res = await fetch('/api/transcript-parse/detect-building-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: targetId, userId: aiUserId }),
      });
      const data = (await res.json().catch(() => ({}))) as { count?: number; buildingNumbers?: string[]; error?: string };
      if (!res.ok) {
        setDetectError(data.error ?? `偵測失敗（HTTP ${res.status}）`);
        return;
      }
      const detectedCount = typeof data.count === 'number' ? data.count : 0;
      const detectedNumbers = Array.isArray(data.buildingNumbers) ? data.buildingNumbers : [];
      if (detectedCount < 1) {
        setDetectError('AI 未能識別建號，請手動確認後重試');
        return;
      }
      setDetectResult({ count: detectedCount, buildingNumbers: detectedNumbers });
    } catch (e) {
      setDetectError(e instanceof Error ? e.message : '偵測失敗，請重試');
    } finally {
      setIsDetectingBuildingCount(false);
    }
  }

  function applyDetectedBuildingCount() {
    if (!detectResult) return;
    const detected = clampIndependentBuildingNumberCount(detectResult.count);
    if (detected <= 1) {
      selectBuildingScopeSingle();
      return;
    }
    handleBuildingNumberSelect(detected);
  }

  function handleLandParcelNumberSelect(next: number) {
    if (isMetaBusy) return;
    const v = clampIndependentBuildingNumberCount(next);
    setLandParcelNumberCount(v);
    if (subjectLandParcelScope === 'multi') {
      startLandParcelTransition(async () => {
        await savePropertySubjectLandParcelSettings(property.id, property.type, 'multi', v);
      });
    }
  }

  async function handleDetectLandCount() {
    const landDocsForDetect = documents.filter(
      (d) => d.documentType === 'land_registry_transcript',
    );
    if (!landDocsForDetect.length || isMetaBusy || isDetectingLandCount) return;
    const targetId =
      selectedLandDetectDocId && landDocsForDetect.some((d) => d.id === selectedLandDetectDocId)
        ? selectedLandDetectDocId
        : landDocsForDetect[0]?.id;
    if (!targetId) return;
    setIsDetectingLandCount(true);
    setLandDetectResult(null);
    setLandDetectError(null);
    try {
      const res = await fetch('/api/transcript-parse/detect-land-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: targetId, userId: aiUserId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        count?: number;
        landParcelNumbers?: string[];
        error?: string;
      };
      if (!res.ok) {
        setLandDetectError(data.error ?? `偵測失敗（HTTP ${res.status}）`);
        return;
      }
      const detectedCount = typeof data.count === 'number' ? data.count : 0;
      const detectedNumbers = Array.isArray(data.landParcelNumbers) ? data.landParcelNumbers : [];
      if (detectedCount < 1) {
        setLandDetectError('AI 未能識別地號，請手動確認後重試');
        return;
      }
      setLandDetectResult({ count: detectedCount, landParcelNumbers: detectedNumbers });
    } catch (e) {
      setLandDetectError(e instanceof Error ? e.message : '偵測失敗，請重試');
    } finally {
      setIsDetectingLandCount(false);
    }
  }

  function applyDetectedLandCount() {
    if (!landDetectResult) return;
    if (landDetectResult.count <= 1) {
      selectLandScopeSingle();
      return;
    }
    const c = clampIndependentBuildingNumberCount(landDetectResult.count);
    const stored = Math.max(2, c);
    if (subjectLandParcelScope !== 'multi') {
      setSubjectLandParcelScope('multi');
      setLandParcelNumberCount(stored);
      startLandParcelTransition(async () => {
        await savePropertySubjectLandParcelSettings(property.id, property.type, 'multi', stored);
      });
      return;
    }
    handleLandParcelNumberSelect(stored);
  }

  function selectLandScopeNotApplicable() {
    if (isMetaBusy) return;
    if (subjectLandParcelScope === 'not_applicable') return;
    setLandDetectResult(null);
    setLandDetectError(null);
    setSubjectLandParcelScope('not_applicable');
    setLandParcelNumberCount(1);
    startLandParcelTransition(async () => {
      await savePropertySubjectLandParcelSettings(property.id, property.type, 'not_applicable', null);
    });
  }

  function selectLandScopeSingle() {
    if (isMetaBusy) return;
    if (subjectLandParcelScope === 'single') return;
    setLandDetectResult(null);
    setLandDetectError(null);
    setSubjectLandParcelScope('single');
    setLandParcelNumberCount(1);
    startLandParcelTransition(async () => {
      await savePropertySubjectLandParcelSettings(property.id, property.type, 'single', null);
    });
  }

  function selectLandScopeMulti() {
    if (isMetaBusy) return;
    if (subjectLandParcelScope === 'multi') return;
    setLandDetectResult(null);
    setLandDetectError(null);
    const targetCount = landParcelNumberCount >= 2 ? landParcelNumberCount : 2;
    setSubjectLandParcelScope('multi');
    setLandParcelNumberCount(targetCount);
    startLandParcelTransition(async () => {
      await savePropertySubjectLandParcelSettings(property.id, property.type, 'multi', targetCount);
    });
  }

  const hasBuildingOnly = independentTitleSaleModes.includes('building_only');
  const isSingleBuildingNumber = hasBuildingOnly && buildingNumberCount === 1;
  const isMultiBuildingNumber = hasBuildingOnly && buildingNumberCount >= 2;

  const isLandScopeNotApplicable = subjectLandParcelScope === 'not_applicable';
  const isLandScopeSingle = subjectLandParcelScope === 'single';
  const isLandScopeMulti = subjectLandParcelScope === 'multi';

  function selectBuildingScopeSingle() {
    if (isMetaBusy) return;
    if (isSingleBuildingNumber) return;
    setDetectResult(null);
    setDetectError(null);
    const next: IndependentTitleSaleMode[] = hasBuildingOnly
      ? independentTitleSaleModes
      : [...independentTitleSaleModes, 'building_only'];
    const willEnableParking = needsIndependentParkingForModes(next) && !hasIndependentParking;
    setIndependentTitleSaleModes(next);
    setBuildingNumberCount(1);
    if (willEnableParking) setHasIndependentParking(true);
    startTitleSaleTransition(async () => {
      if (willEnableParking) {
        await savePropertyHasIndependentParking(property.id, property.type, true);
      }
      await savePropertyIndependentTitleSaleModes(property.id, property.type, next);
      await savePropertyIndependentBuildingNumberCount(property.id, property.type, 1);
    });
  }

  function selectBuildingScopeMulti() {
    if (isMetaBusy) return;
    if (isMultiBuildingNumber) return;
    setDetectResult(null);
    setDetectError(null);
    const next: IndependentTitleSaleMode[] = hasBuildingOnly
      ? independentTitleSaleModes
      : [...independentTitleSaleModes, 'building_only'];
    const targetCount = buildingNumberCount >= 2 ? buildingNumberCount : 2;
    const willEnableParking = needsIndependentParkingForModes(next) && !hasIndependentParking;
    setIndependentTitleSaleModes(next);
    setBuildingNumberCount(targetCount);
    if (willEnableParking) setHasIndependentParking(true);
    startTitleSaleTransition(async () => {
      if (willEnableParking) {
        await savePropertyHasIndependentParking(property.id, property.type, true);
      }
      await savePropertyIndependentTitleSaleModes(property.id, property.type, next);
      await savePropertyIndependentBuildingNumberCount(property.id, property.type, targetCount);
    });
  }

  function selectBuildingScopeNone() {
    if (isMetaBusy) return;
    if (!hasBuildingOnly) return;
    setDetectResult(null);
    setDetectError(null);
    const next = independentTitleSaleModes.filter((m) => m !== 'building_only');
    setIndependentTitleSaleModes(next);
    startTitleSaleTransition(async () => {
      await savePropertyIndependentTitleSaleModes(property.id, property.type, next);
      await savePropertyIndependentBuildingNumberCount(property.id, property.type, null);
      setBuildingNumberCount(1);
    });
  }

  function handleParkingRightToggle(right: ParkingTitleRight) {
    if (isRightsPending) return;
    const next = parkingTitleRights.includes(right)
      ? parkingTitleRights.filter((r) => r !== right)
      : [...parkingTitleRights, right];
    setParkingTitleRights(next);
    startRightsTransition(async () => {
      await savePropertyParkingTitleRights(property.id, property.type, next);
    });
  }

  function handleSaleModeToggle(mode: IndependentTitleSaleMode) {
    if (isMetaBusy) return;
    const next = independentTitleSaleModes.includes(mode)
      ? independentTitleSaleModes.filter((m) => m !== mode)
      : [...independentTitleSaleModes, mode];
    const willEnableParking = needsIndependentParkingForModes(next) && !hasIndependentParking;
    setIndependentTitleSaleModes(next);
    if (willEnableParking) {
      setHasIndependentParking(true);
    }
    startTitleSaleTransition(async () => {
      if (willEnableParking) {
        await savePropertyHasIndependentParking(property.id, property.type, true);
      }
      await savePropertyIndependentTitleSaleModes(property.id, property.type, next);
      if (!next.includes('building_only')) {
        await savePropertyIndependentBuildingNumberCount(property.id, property.type, null);
        setBuildingNumberCount(1);
      }
    });
  }

  const buildingDocs = documents.filter((d) => d.documentType === 'building_registry_transcript');
  const landDocs = documents.filter((d) => d.documentType === 'land_registry_transcript');
  const parkingBuildingDocs = documents.filter((d) => d.documentType === 'parking_building_registry_transcript');
  const parkingLandDocs = documents.filter((d) => d.documentType === 'parking_land_registry_transcript');

  const hasTranscriptSelection =
    independentTitleSaleModes.length > 0 || parkingTitleRights.length > 0;
  const transcriptSelectionCount =
    independentTitleSaleModes.length + parkingTitleRights.length;

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
      <TranscriptIntakeWorkbench property={property} documents={documents} />

      {/* 銷售方式：獨立卡片，與謄本區視覺分開 */}
      <div className="rounded-lg border border-border-default bg-bg-primary overflow-hidden">
        <div
          className="px-4 py-3 space-y-2.5"
          role="radiogroup"
          aria-labelledby={`transcript-building-scope-label-${property.id}`}
        >
          <p
            id={`transcript-building-scope-label-${property.id}`}
            className="text-xs font-medium text-text-secondary"
          >
            標的建築物建號筆數(單選)
          </p>
          <p className="text-xs text-text-muted">本步驟將依謄本檔案協助你設定建號/地號筆數</p>
          <div className="rounded-md border border-border-default bg-bg-secondary px-3 py-2 space-y-2">
            <div className="flex items-start gap-2 text-xs text-text-secondary">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border-default bg-bg-primary text-[11px] font-semibold">
                1
              </span>
              <div className="flex-1">
                <p>上傳謄本</p>
                {!documents.some((d) => d.documentType === 'building_registry_transcript') ? (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-red-500">尚未上傳建物謄本，無法進行 AI 偵測</span>
                    <button
                      type="button"
                      onClick={scrollToUploadSection}
                      aria-label="捲動到上傳謄本區塊"
                      className="inline-flex items-center rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-500 hover:bg-red-500/15 transition-colors"
                    >
                      捲動到上傳區
                    </button>
                  </div>
                ) : (
                  <p className="mt-1 text-text-muted">已上傳建物謄本，可繼續下一步。</p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2 text-xs text-text-secondary">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border-default bg-bg-primary text-[11px] font-semibold">
                2
              </span>
              <p className="pt-0.5">選擇要偵測的謄本（可先從下拉清單挑檔案）</p>
            </div>
            <div className="flex items-start gap-2 text-xs text-text-secondary">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border-default bg-bg-primary text-[11px] font-semibold">
                3
              </span>
              <p className="pt-0.5">執行 AI 偵測，確認結果後再套用筆數</p>
            </div>
          </div>
          {isTitleSalePending && (
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Loader2 size={14} className="animate-spin shrink-0" aria-hidden />
              儲存銷售方式…
            </div>
          )}
          <label className="flex items-center gap-2.5 cursor-pointer select-none rounded-md py-1 -my-1">
            <input
              type="radio"
              name={`transcript-building-scope-${property.id}`}
              checked={!hasBuildingOnly}
              onChange={selectBuildingScopeNone}
              disabled={isMetaBusy}
              className="w-4 h-4 rounded-full border border-border-default accent-accent cursor-pointer shrink-0"
            />
            <span className="text-sm text-text-primary">無</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer select-none rounded-md py-1 -my-1">
            <input
              type="radio"
              name={`transcript-building-scope-${property.id}`}
              checked={isSingleBuildingNumber}
              onChange={selectBuildingScopeSingle}
              disabled={isMetaBusy}
              className="w-4 h-4 rounded-full border border-border-default accent-accent cursor-pointer shrink-0"
            />
            <span className="text-sm text-text-primary">
              {INDEPENDENT_TITLE_SALE_MODE_LABELS.building_only}
            </span>
          </label>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md py-1 -my-1">
            <label className="flex items-center gap-2.5 cursor-pointer select-none shrink-0">
              <input
                type="radio"
                name={`transcript-building-scope-${property.id}`}
                checked={isMultiBuildingNumber}
                onChange={selectBuildingScopeMulti}
                disabled={isMetaBusy}
                className="w-4 h-4 rounded-full border border-border-default accent-accent cursor-pointer shrink-0"
              />
              <span className="text-sm text-text-primary">多筆建築物（多建號）</span>
            </label>
            {isMultiBuildingNumber ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md py-1 -my-1">
                {(() => {
                  const buildingDocsForDetect = documents.filter(
                    (d) => d.documentType === 'building_registry_transcript',
                  );
                  return buildingDocsForDetect.length > 0 ? (
                    <select
                      value={
                        selectedBuildingDetectDocId ??
                        buildingDocsForDetect[0]?.id ??
                        ''
                      }
                      onChange={(e) =>
                        setSelectedBuildingDetectDocId(
                          e.target.value || null,
                        )
                      }
                      disabled={isMetaBusy}
                      aria-label="要用來偵測建號數的建物謄本"
                      className="h-8 min-w-[8rem] rounded-md border border-border-default bg-bg-primary px-2 text-xs text-text-primary cursor-pointer disabled:opacity-50"
                    >
                      {buildingDocsForDetect.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.documentName}
                        </option>
                      ))}
                    </select>
                  ) : null;
                })()}
                <select
                  value={buildingNumberCount}
                  onChange={(e) => handleBuildingNumberSelect(Number(e.target.value))}
                  disabled={isMetaBusy}
                  aria-label="建號筆數（2–10）"
                  className="h-8 min-w-[3rem] rounded-md border border-border-default bg-bg-primary px-2 text-xs text-text-primary cursor-pointer disabled:opacity-50"
                >
                  {BUILDING_NUMBER_COUNT_OPTIONS.filter((n) => n >= 2).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                {/* AI detect button */}
                {(() => {
                  const hasBuildingDoc = documents.some(
                    (d) => d.documentType === 'building_registry_transcript',
                  );
                  return (
                    <button
                      type="button"
                      onClick={handleDetectBuildingCount}
                      disabled={isMetaBusy || isDetectingBuildingCount || !hasBuildingDoc}
                      className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md border border-border-default bg-bg-primary text-xs text-text-primary hover:bg-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title={hasBuildingDoc ? 'AI 自動掃描建物謄本並計算建號數量' : '請先上傳建物謄本'}
                    >
                      {isDetectingBuildingCount ? (
                        <Loader2 size={13} className="animate-spin shrink-0" aria-hidden />
                      ) : (
                        <ScanSearch size={13} className="shrink-0" aria-hidden />
                      )}
                      {isDetectingBuildingCount ? 'AI 偵測中…' : 'AI 偵測建號數'}
                    </button>
                  );
                })()}
                {/* Detect result */}
                {detectResult && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-text-secondary">
                      AI 偵測：<span className="font-medium text-text-primary">{detectResult.count}</span> 筆
                      ／目前設定：<span className="font-medium text-text-primary">{buildingNumberCount}</span> 筆
                    </span>
                    {detectResult.buildingNumbers.length > 0 && (
                      <span className="text-text-muted">（{detectResult.buildingNumbers.join('、')}）</span>
                    )}
                    <button
                      type="button"
                      onClick={applyDetectedBuildingCount}
                      disabled={isMetaBusy}
                      className="inline-flex items-center h-7 px-3 rounded-md border border-accent/30 bg-accent/10 text-xs font-medium text-accent hover:bg-accent/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      套用 AI 筆數
                    </button>
                  </div>
                )}
                {!detectResult && !detectError && (
                  <span className="text-xs text-text-muted">
                    {documents.some((d) => d.documentType === 'building_registry_transcript')
                      ? `目前已儲存：${buildingNumberCount} 筆`
                      : '請先上傳建物謄本，再點擊 AI 偵測'}
                  </span>
                )}
                {/* Detect error */}
                {detectError && (
                  <span className="text-xs text-red-500">{detectError}</span>
                )}
              </div>
            ) : null}
          </div>
          {INDEPENDENT_TITLE_SALE_OPTIONS.filter(([v]) => v !== 'building_only').map(([value, label]) => (
            <label
              key={value}
              className="flex items-center gap-2.5 cursor-pointer select-none rounded-md py-1 -my-1"
            >
              <input
                type="checkbox"
                checked={independentTitleSaleModes.includes(value)}
                onChange={() => handleSaleModeToggle(value)}
                disabled={isMetaBusy}
                className="w-4 h-4 rounded border-border-default accent-accent cursor-pointer shrink-0"
              />
              <span className="text-sm text-text-primary">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border-default bg-bg-primary overflow-hidden">
        <div
          className="px-4 py-3 space-y-2.5"
          role="radiogroup"
          aria-labelledby={`transcript-land-scope-label-${property.id}`}
        >
          <p
            id={`transcript-land-scope-label-${property.id}`}
            className="text-xs font-medium text-text-secondary"
          >
            標的建築物地號筆數（單選）
          </p>
          <p className="text-xs text-text-muted">本步驟將依謄本檔案協助你設定建號/地號筆數</p>
          <div className="rounded-md border border-border-default bg-bg-secondary px-3 py-2 space-y-2">
            <div className="flex items-start gap-2 text-xs text-text-secondary">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border-default bg-bg-primary text-[11px] font-semibold">
                1
              </span>
              <div className="flex-1">
                <p>上傳謄本</p>
                {!documents.some((d) => d.documentType === 'land_registry_transcript') ? (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-red-500">尚未上傳土地謄本，無法進行 AI 偵測</span>
                    <button
                      type="button"
                      onClick={scrollToUploadSection}
                      aria-label="捲動到上傳謄本區塊"
                      className="inline-flex items-center rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-500 hover:bg-red-500/15 transition-colors"
                    >
                      捲動到上傳區
                    </button>
                  </div>
                ) : (
                  <p className="mt-1 text-text-muted">已上傳土地謄本，可繼續下一步。</p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2 text-xs text-text-secondary">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border-default bg-bg-primary text-[11px] font-semibold">
                2
              </span>
              <p className="pt-0.5">選擇要偵測的謄本（可先從下拉清單挑檔案）</p>
            </div>
            <div className="flex items-start gap-2 text-xs text-text-secondary">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border-default bg-bg-primary text-[11px] font-semibold">
                3
              </span>
              <p className="pt-0.5">執行 AI 偵測，確認結果後再套用筆數</p>
            </div>
          </div>
          {isLandParcelPending && (
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Loader2 size={14} className="animate-spin shrink-0" aria-hidden />
              儲存地號筆數設定…
            </div>
          )}
          <label className="flex items-center gap-2.5 cursor-pointer select-none rounded-md py-1 -my-1">
            <input
              type="radio"
              name={`transcript-land-scope-${property.id}`}
              checked={isLandScopeNotApplicable}
              onChange={selectLandScopeNotApplicable}
              disabled={isMetaBusy}
              className="w-4 h-4 rounded-full border border-border-default accent-accent cursor-pointer shrink-0"
            />
            <span className="text-sm text-text-primary">不適用（可能為地上權或違建）</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer select-none rounded-md py-1 -my-1">
            <input
              type="radio"
              name={`transcript-land-scope-${property.id}`}
              checked={isLandScopeSingle}
              onChange={selectLandScopeSingle}
              disabled={isMetaBusy}
              className="w-4 h-4 rounded-full border border-border-default accent-accent cursor-pointer shrink-0"
            />
            <span className="text-sm text-text-primary">單一筆土地地號</span>
          </label>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md py-1 -my-1">
            <label className="flex items-center gap-2.5 cursor-pointer select-none shrink-0">
              <input
                type="radio"
                name={`transcript-land-scope-${property.id}`}
                checked={isLandScopeMulti}
                onChange={selectLandScopeMulti}
                disabled={isMetaBusy}
                className="w-4 h-4 rounded-full border border-border-default accent-accent cursor-pointer shrink-0"
              />
              <span className="text-sm text-text-primary">多筆土地地號（多地號）</span>
            </label>
            {isLandScopeMulti ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md py-1 -my-1">
                {(() => {
                  const landDocsForDetect = documents.filter(
                    (d) => d.documentType === 'land_registry_transcript',
                  );
                  return landDocsForDetect.length > 0 ? (
                    <select
                      value={
                        selectedLandDetectDocId ??
                        landDocsForDetect[0]?.id ??
                        ''
                      }
                      onChange={(e) =>
                        setSelectedLandDetectDocId(
                          e.target.value || null,
                        )
                      }
                      disabled={isMetaBusy}
                      aria-label="要用來偵測地號數的土地謄本"
                      className="h-8 min-w-[8rem] rounded-md border border-border-default bg-bg-primary px-2 text-xs text-text-primary cursor-pointer disabled:opacity-50"
                    >
                      {landDocsForDetect.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.documentName}
                        </option>
                      ))}
                    </select>
                  ) : null;
                })()}
                <select
                  value={landParcelNumberCount}
                  onChange={(e) => handleLandParcelNumberSelect(Number(e.target.value))}
                  disabled={isMetaBusy}
                  aria-label="地號筆數（2–10）"
                  className="h-8 min-w-[3rem] rounded-md border border-border-default bg-bg-primary px-2 text-xs text-text-primary cursor-pointer disabled:opacity-50"
                >
                  {BUILDING_NUMBER_COUNT_OPTIONS.filter((n) => n >= 2).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                {(() => {
                  const hasLandDoc = documents.some(
                    (d) => d.documentType === 'land_registry_transcript',
                  );
                  return (
                    <button
                      type="button"
                      onClick={handleDetectLandCount}
                      disabled={isMetaBusy || isDetectingLandCount || !hasLandDoc}
                      className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md border border-border-default bg-bg-primary text-xs text-text-primary hover:bg-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title={hasLandDoc ? 'AI 自動掃描土地謄本並計算地號數量' : '請先上傳土地謄本'}
                    >
                      {isDetectingLandCount ? (
                        <Loader2 size={13} className="animate-spin shrink-0" aria-hidden />
                      ) : (
                        <ScanSearch size={13} className="shrink-0" aria-hidden />
                      )}
                      {isDetectingLandCount ? 'AI 偵測中…' : 'AI 偵測地號數'}
                    </button>
                  );
                })()}
                {landDetectResult && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-text-secondary">
                      AI 偵測：<span className="font-medium text-text-primary">{landDetectResult.count}</span> 筆
                      ／目前設定：<span className="font-medium text-text-primary">{landParcelNumberCount}</span> 筆
                    </span>
                    {landDetectResult.landParcelNumbers.length > 0 && (
                      <span className="text-text-muted">（{landDetectResult.landParcelNumbers.join('、')}）</span>
                    )}
                    <button
                      type="button"
                      onClick={applyDetectedLandCount}
                      disabled={isMetaBusy}
                      className="inline-flex items-center h-7 px-3 rounded-md border border-accent/30 bg-accent/10 text-xs font-medium text-accent hover:bg-accent/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      套用 AI 筆數
                    </button>
                  </div>
                )}
                {!landDetectResult && !landDetectError && (
                  <span className="text-xs text-text-muted">
                    {documents.some((d) => d.documentType === 'land_registry_transcript')
                      ? `目前已儲存：${landParcelNumberCount} 筆`
                      : '請先上傳土地謄本，再點擊 AI 偵測'}
                  </span>
                )}
                {landDetectError && (
                  <span className="text-xs text-red-500">{landDetectError}</span>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border-default bg-bg-primary overflow-hidden">
        <div className="px-4 py-3 space-y-2.5" role="group" aria-label="車位產權類型（可複選）">
          <p className="text-xs font-medium text-text-secondary">車位產權類型（可複選）</p>
          {isRightsPending && (
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Loader2 size={14} className="animate-spin shrink-0" aria-hidden />
              儲存勾選…
            </div>
          )}
          {PARKING_RIGHT_OPTIONS.map(([value, label]) => (
            <label
              key={value}
              className="flex items-center gap-2.5 cursor-pointer select-none rounded-md py-1 -my-1"
            >
              <input
                type="checkbox"
                checked={parkingTitleRights.includes(value)}
                onChange={() => handleParkingRightToggle(value)}
                disabled={isRightsPending}
                className="w-4 h-4 rounded border-border-default accent-accent cursor-pointer shrink-0"
              />
              <span className="text-sm text-text-primary">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <p ref={transcriptUploadSectionRef} className="text-xs font-medium text-text-secondary px-0.5">
        上傳謄本&gt;選擇解析方式&gt;謄寫
      </p>

      {hasTranscriptSelection ? (
        <div className="rounded-lg border border-accent bg-bg-primary ring-1 ring-accent/20 overflow-hidden">
          <div className="shrink-0 px-4 py-3 border-b border-border-default">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-text-primary">謄本與解析</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-accent/10 text-accent border border-accent/20">
                  已選 {transcriptSelectionCount} 項
                </span>
              </div>
              <div className="space-y-2">
                {independentTitleSaleModes.map((m) => {
                  const rowToggles = togglesForSaleMode(m, transcriptPanelVis);
                  if (m === 'building_only' && buildingNumberCount >= 2) {
                    return (
                      <div
                        key={`${m}-multi`}
                        className="flex items-start justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0 text-xs text-text-muted leading-relaxed border-l-2 border-accent/25 pl-2">
                          <span className="font-medium text-text-secondary">
                            多筆建號（共 {buildingNumberCount} 筆）
                          </span>
                          <ul className="mt-1.5 space-y-1 text-[11px] text-text-muted">
                            {Array.from({ length: buildingNumberCount }, (_, i) => (
                              <li key={i}>
                                第 {i + 1} 筆建號（共 {buildingNumberCount} 筆）— 請於下方對應區塊上傳建物／土地謄本並解析
                              </li>
                            ))}
                          </ul>
                          <span className="block mt-1">{SALE_MODE_SECTION_HINT[m]}</span>
                        </div>
                        <div className="relative z-10 flex flex-col items-end gap-1 sm:flex-row sm:flex-wrap sm:justify-end shrink-0 gap-x-1">
                          {rowToggles.main ? (
                            <TranscriptExpandToggle
                              expanded={transcriptPanelsExpanded.main}
                              onToggle={() => toggleTranscriptPanel('main')}
                              isBusy={isMetaBusy}
                              sectionHint={TRANSCRIPT_TOGGLE_MAIN_HINT}
                            />
                          ) : null}
                          {rowToggles.parking ? (
                            <TranscriptExpandToggle
                              expanded={transcriptPanelsExpanded.parking}
                              onToggle={() => toggleTranscriptPanel('parking')}
                              isBusy={isMetaBusy}
                              sectionHint={TRANSCRIPT_TOGGLE_PARKING_HINT}
                            />
                          ) : null}
                          {rowToggles.shared ? (
                            <TranscriptExpandToggle
                              expanded={transcriptPanelsExpanded.shared}
                              onToggle={() => toggleTranscriptPanel('shared')}
                              isBusy={isMetaBusy}
                              sectionHint={TRANSCRIPT_TOGGLE_SHARED_HINT}
                            />
                          ) : null}
                        </div>
                      </div>
                    );
                  }
                  const title = INDEPENDENT_TITLE_SALE_MODE_LABELS[m];
                  return (
                    <div key={m} className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 text-xs text-text-muted leading-relaxed border-l-2 border-accent/25 pl-2">
                        <span className="font-medium text-text-secondary">{title}</span>
                        <span className="block mt-0.5">{SALE_MODE_SECTION_HINT[m]}</span>
                      </div>
                      <div className="relative z-10 flex flex-col items-end gap-1 sm:flex-row sm:flex-wrap sm:justify-end shrink-0 gap-x-1">
                        {rowToggles.main ? (
                          <TranscriptExpandToggle
                            expanded={transcriptPanelsExpanded.main}
                            onToggle={() => toggleTranscriptPanel('main')}
                            isBusy={isMetaBusy}
                            sectionHint={TRANSCRIPT_TOGGLE_MAIN_HINT}
                          />
                        ) : null}
                        {rowToggles.parking ? (
                          <TranscriptExpandToggle
                            expanded={transcriptPanelsExpanded.parking}
                            onToggle={() => toggleTranscriptPanel('parking')}
                            isBusy={isMetaBusy}
                            sectionHint={TRANSCRIPT_TOGGLE_PARKING_HINT}
                          />
                        ) : null}
                        {rowToggles.shared ? (
                          <TranscriptExpandToggle
                            expanded={transcriptPanelsExpanded.shared}
                            onToggle={() => toggleTranscriptPanel('shared')}
                            isBusy={isMetaBusy}
                            sectionHint={TRANSCRIPT_TOGGLE_SHARED_HINT}
                          />
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                {parkingTitleRights.map((r) => {
                  const title = PARKING_RIGHT_OPTIONS.find(([v]) => v === r)?.[1] ?? r;
                  const rowToggles = togglesForParkingRight(r, transcriptPanelVis);
                  return (
                    <div key={r} className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 text-xs text-text-muted leading-relaxed border-l-2 border-accent/25 pl-2">
                        <span className="font-medium text-text-secondary">{title}</span>
                        <span className="block mt-0.5">{PARKING_RIGHT_HINTS[r]}</span>
                      </div>
                      <div className="relative z-10 flex flex-col items-end gap-1 sm:flex-row sm:flex-wrap sm:justify-end shrink-0 gap-x-1">
                        {rowToggles.main ? (
                          <TranscriptExpandToggle
                            expanded={transcriptPanelsExpanded.main}
                            onToggle={() => toggleTranscriptPanel('main')}
                            isBusy={isMetaBusy}
                            sectionHint={TRANSCRIPT_TOGGLE_MAIN_HINT}
                          />
                        ) : null}
                        {rowToggles.parking ? (
                          <TranscriptExpandToggle
                            expanded={transcriptPanelsExpanded.parking}
                            onToggle={() => toggleTranscriptPanel('parking')}
                            isBusy={isMetaBusy}
                            sectionHint={TRANSCRIPT_TOGGLE_PARKING_HINT}
                          />
                        ) : null}
                        {rowToggles.shared ? (
                          <TranscriptExpandToggle
                            expanded={transcriptPanelsExpanded.shared}
                            onToggle={() => toggleTranscriptPanel('shared')}
                            isBusy={isMetaBusy}
                            sectionHint={TRANSCRIPT_TOGGLE_SHARED_HINT}
                          />
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <SaleModeTranscriptGrids
              modes={independentTitleSaleModes}
              parkingTitleRights={parkingTitleRights}
              property={property}
              buildingDocs={buildingDocs}
              landDocs={landDocs}
              parkingBuildingDocs={parkingBuildingDocs}
              parkingLandDocs={parkingLandDocs}
              onRefresh={refresh}
              expandedMain={transcriptPanelsExpanded.main}
              expandedParking={transcriptPanelsExpanded.parking}
              expandedShared={transcriptPanelsExpanded.shared}
              independentBuildingNumberCountLive={buildingNumberCount}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border-default rounded-lg bg-bg-primary/50 text-text-muted">
          <FileText size={40} className="mb-4 opacity-20" />
          <p className="text-sm font-medium">請先勾選標的建築物建號筆數或車位產權類型至少一項</p>
          <p className="text-xs mt-1">勾選後將顯示合併後的謄本上傳與 AI 解析區域</p>
        </div>
      )}
    </div>
  );
}
