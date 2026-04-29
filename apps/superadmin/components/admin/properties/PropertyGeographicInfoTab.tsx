'use client';

import { useState, useCallback, useRef, useEffect, useMemo, type ReactNode } from 'react';
import {
  ExternalLink,
  MapPin,
  Loader2,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  Upload,
  X,
} from 'lucide-react';
import { formatStructuredAddress, type PropertyItem } from '@/lib/types/properties';
import {
  deleteCadastralMap,
  listCadastralMapFiles,
  getGisFileUrl,
  uploadManualCadastralMapFile,
  type StoredGisFile,
} from '@/lib/actions/cadastral-maps';
import {
  GIS_SOURCE_LABELS,
  GIS_SOURCE_URLS,
  type MapLayerPreset,
} from '@/lib/utils/cadastral-map-fetcher';
import {
  pendingLayersList,
  elapsedSecondsForLayer,
} from './gis-fetch-pending-storage';
import {
  readOutcomesMap,
  clearOutcomesMap,
  GIS_OUTCOME_PRESET_ORDER,
  type GisOutcomesMap,
} from './gis-fetch-outcomes-storage';

const cardCls = 'rounded-lg border border-border-default bg-bg-primary px-4 py-3';

const LAYER_LABELS: Record<MapLayerPreset, string> = {
  cadastral: '地籍圖',
  building: '建物套繪圖',
  both: '地籍圖 + 建物套繪圖',
};

const MANUAL_UPLOAD_OPTIONS: MapLayerPreset[] = ['cadastral', 'building', 'both'];
const LAYER_PRESET_ORDER: MapLayerPreset[] = ['cadastral', 'building', 'both'];

function fileLayer(file: StoredGisFile): MapLayerPreset | null {
  const tag = file.tags.find((item) => item.startsWith('gis:'));
  const tagLayer = tag?.replace('gis:', '');
  if (tagLayer === 'cadastral' || tagLayer === 'building' || tagLayer === 'both') {
    return tagLayer;
  }
  if (file.name.includes('地籍圖+建物套繪圖') || file.name.includes('地籍圖 + 建物套繪圖')) {
    return 'both';
  }
  if (file.name.includes('建物套繪圖')) return 'building';
  if (file.name.includes('地籍圖')) return 'cadastral';
  return null;
}

export function PropertyGeographicInfoTab({ property }: { property: PropertyItem }) {
  const addressLine = formatStructuredAddress(property);
  const lat = property.latitude;
  const lng = property.longitude;
  const hasCoords = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
  const hasAddress = !!(property.addressDistrict && property.addressStreet && property.addressNumber);
  const canAutoGenerate = hasCoords || hasAddress;

  const googleUrl = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : null;
  const osmUrl = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=17`
    : null;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cloudFiles, setCloudFiles] = useState<StoredGisFile[]>([]);
  const [pendingLayers, setPendingLayers] = useState<MapLayerPreset[]>([]);
  const [outcomes, setOutcomes] = useState<GisOutcomesMap>(() => readOutcomesMap(property.id));
  const [elapsedTick, setElapsedTick] = useState(0);
  const [manualLayer, setManualLayer] = useState<MapLayerPreset>('cadastral');
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadCloudFiles = useCallback(async () => {
    const { data } = await listCadastralMapFiles(property.id);
    setCloudFiles(data);
  }, [property.id]);

  useEffect(() => {
    void loadCloudFiles();
  }, [loadCloudFiles]);

  useEffect(() => {
    const sync = () => {
      setPendingLayers(pendingLayersList(property.id));
      setOutcomes(readOutcomesMap(property.id));
    };
    sync();
    const id = setInterval(sync, 500);
    return () => clearInterval(id);
  }, [property.id]);

  useEffect(() => {
    if (pendingLayers.length === 0) return;
    const id = setInterval(() => setElapsedTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [pendingLayers.length]);

  const layerElapsed = useMemo(
    () => ({
      cadastral: elapsedSecondsForLayer(property.id, 'cadastral'),
      building: elapsedSecondsForLayer(property.id, 'building'),
      both: elapsedSecondsForLayer(property.id, 'both'),
    }),
    [property.id, elapsedTick, pendingLayers.length],
  );

  const isLayerPending = useCallback(
    (layer: MapLayerPreset) => pendingLayers.includes(layer),
    [pendingLayers],
  );

  const handlePreviewGisFile = async (filePath: string) => {
    const { url, error } = await getGisFileUrl(filePath);
    if (error || !url) return alert(`無法取得連結：${error}`);
    window.open(url, '_blank');
  };

  const handleDeleteGisFile = async (file: StoredGisFile) => {
    if (!confirm(`確定要刪除「${file.name}」？`)) return;
    const { success, message } = await deleteCadastralMap(file.id, file.filePath);
    if (!success) return alert(message);
    await loadCloudFiles();
  };

  const handleClearOutcomes = () => {
    clearOutcomesMap(property.id);
    setOutcomes({});
  };

  const handleManualUpload = async () => {
    if (!manualFile) return;
    setIsUploading(true);
    setFeedback(null);
    const fd = new FormData();
    fd.append('file', manualFile);
    const result = await uploadManualCadastralMapFile(
      property.id,
      property.type,
      property.ownerId,
      manualLayer,
      fd,
    );
    setIsUploading(false);
    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
      setManualFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadCloudFiles();
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  const hasAnyOutcome = GIS_OUTCOME_PRESET_ORDER.some((k) => outcomes[k] != null);
  const latestFilesByLayer = useMemo(() => {
    const grouped: Partial<Record<MapLayerPreset, StoredGisFile>> = {};
    for (const file of cloudFiles) {
      const layer = fileLayer(file);
      if (!layer || grouped[layer]) continue;
      grouped[layer] = file;
    }
    return grouped;
  }, [cloudFiles]);

  return (
    <div className="space-y-4 max-w-full">
      <div className="flex items-start gap-2 text-sm text-text-muted">
        <MapPin size={18} className="text-accent shrink-0 mt-0.5" />
        <p>
          儲存「物件基本資訊」後，系統會自動產出地籍圖、建物套繪圖、地籍圖 + 建物套繪圖三份 GIS 文件。
        </p>
      </div>

      <div className={`${cardCls} space-y-3`}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            GIS 圖資查詢與檔案
          </h3>
          {hasAnyOutcome && (
            <button
              type="button"
              onClick={handleClearOutcomes}
              className="text-[10px] text-text-muted hover:text-text-primary underline shrink-0"
            >
              清除擷取紀錄
            </button>
          )}
        </div>
        <div className="overflow-hidden rounded-md border border-border-default bg-bg-secondary text-xs">
          <div className="hidden grid-cols-[minmax(220px,1.15fr)_minmax(150px,0.95fr)_minmax(150px,0.95fr)_minmax(170px,1.05fr)] gap-3 border-b border-border-default px-3 py-2 text-text-muted lg:grid">
            <span>地址</span>
            {LAYER_PRESET_ORDER.map((layer) => (
              <span key={layer}>{LAYER_LABELS[layer]}</span>
            ))}
          </div>
          <div className="grid gap-3 px-3 py-3 lg:grid-cols-[minmax(220px,1.15fr)_minmax(150px,0.95fr)_minmax(150px,0.95fr)_minmax(170px,1.05fr)] lg:items-start">
            <div className="min-w-0 select-text">
              <p className="text-[11px] text-text-muted lg:hidden">地址</p>
              <p className="font-medium leading-relaxed text-text-primary">{addressLine}</p>
              {hasCoords && googleUrl && osmUrl && (
                <div className="mt-2 flex flex-wrap gap-3">
                  <ExternalMapLink href={googleUrl} label="Google 地圖" />
                  <ExternalMapLink href={osmUrl} label="OpenStreetMap" />
                </div>
              )}
              {!canAutoGenerate && (
                <p className="mt-2 text-xs text-warning">
                  需要座標或完整結構化地址（行政區 + 道路 + 門牌號碼）才能自動產圖。
                </p>
              )}
            </div>
            {LAYER_PRESET_ORDER.map((layer) => (
              <GisFileCell
                key={layer}
                label={LAYER_LABELS[layer]}
                file={latestFilesByLayer[layer]}
                pending={isLayerPending(layer)}
                elapsed={layerElapsed[layer]}
                outcome={outcomes[layer]}
                onPreview={handlePreviewGisFile}
                onDelete={handleDeleteGisFile}
              />
            ))}
          </div>
        </div>
      </div>

      <div className={`${cardCls} space-y-3`}>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          手動查詢後上傳
        </h3>
        <div className="flex flex-wrap gap-3">
          <ExternalMapLink href={GIS_SOURCE_URLS.historygis} label={GIS_SOURCE_LABELS.historygis} />
          <ExternalMapLink href={GIS_SOURCE_URLS.epoint} label={GIS_SOURCE_LABELS.epoint} />
        </div>

        {feedback && (
          <div
            className={`p-2.5 rounded-md text-xs relative ${
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

        <div className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)]">
          <select
            aria-label="GIS 圖資類型"
            value={manualLayer}
            onChange={(e) => setManualLayer(e.target.value as MapLayerPreset)}
            className="w-full border border-border-default rounded-md px-2 py-1.5 bg-bg-primary text-text-primary text-xs focus:outline-none focus:border-accent"
          >
            {MANUAL_UPLOAD_OPTIONS.map((layer) => (
              <option key={layer} value={layer}>
                {LAYER_LABELS[layer]}
              </option>
            ))}
          </select>
          <input
            ref={fileInputRef}
            type="file"
            aria-label="上傳 GIS 圖資檔案"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/tiff,image/bmp,image/gif"
            onChange={(e) => setManualFile(e.target.files?.[0] ?? null)}
            className="w-full text-xs text-text-secondary file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-bg-tertiary file:text-text-secondary hover:file:bg-border-default cursor-pointer"
          />
        </div>
        {manualFile && (
          <p className="text-xs text-text-muted">
            已選取 {manualFile.name}（{(manualFile.size / 1024 / 1024).toFixed(1)} MB）
          </p>
        )}
        <button
          type="button"
          onClick={() => void handleManualUpload()}
          disabled={!manualFile || isUploading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-xs rounded-md hover:bg-accent-hover transition-colors disabled:opacity-40"
        >
          {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          {isUploading ? '上傳中…' : '上傳 GIS 圖資'}
        </button>
      </div>
    </div>
  );
}

function ExternalMapLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
    >
      <ExternalLink size={14} />
      {label}
    </a>
  );
}

function FileStatusLine({
  label,
  pending,
  elapsed,
  outcome,
  hasFile,
}: {
  label: string;
  pending: boolean;
  elapsed: number;
  outcome?: GisOutcomesMap[MapLayerPreset];
  hasFile?: boolean;
}) {
  let line: ReactNode;
  if (pending) {
    line = (
      <span className="inline-flex items-center gap-1.5 text-text-secondary">
        <Loader2 size={12} className="animate-spin shrink-0" />
        產出中 · 已 {elapsed} 秒
      </span>
    );
  } else if (outcome?.kind === 'success') {
    line = (
      <span className="inline-flex items-center gap-1.5 text-accent">
        <CheckCircle2 size={12} className="shrink-0" />
        已產出 · 耗時 {outcome.seconds} 秒
      </span>
    );
  } else if (outcome?.kind === 'error') {
    line = (
      <span className="inline-flex items-start gap-1.5 text-error">
        <XCircle size={12} className="shrink-0 mt-0.5" />
        <span>
          失敗 · 耗時 {outcome.seconds} 秒
          <span className="text-text-muted"> · </span>
          {outcome.message}
        </span>
      </span>
    );
  } else if (hasFile) {
    line = (
      <span className="inline-flex items-center gap-1.5 text-green-500">
        <CheckCircle2 size={12} className="shrink-0" />
        已儲存檔案
      </span>
    );
  } else {
    line = <span className="text-text-muted">等待下次儲存基本資訊</span>;
  }

  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-medium text-text-primary">{label}</p>
      <div className="min-w-0 break-words">{line}</div>
    </div>
  );
}

function GisFileCell({
  label,
  file,
  pending,
  elapsed,
  outcome,
  onPreview,
  onDelete,
}: {
  label: string;
  file?: StoredGisFile;
  pending: boolean;
  elapsed: number;
  outcome?: GisOutcomesMap[MapLayerPreset];
  onPreview: (filePath: string) => Promise<void>;
  onDelete: (file: StoredGisFile) => Promise<void>;
}) {
  return (
    <div className="min-w-0 rounded-md border border-border-default bg-bg-primary p-2.5">
      <p className="mb-1 text-[11px] text-text-muted lg:hidden">{label}</p>
      <FileStatusLine
        label="狀態"
        pending={pending}
        elapsed={elapsed}
        outcome={outcome}
        hasFile={file != null}
      />
      {file ? (
        <div className="mt-2 flex items-start justify-between gap-2 rounded-md bg-bg-secondary px-2 py-2">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-text-secondary">{file.name}</p>
            {file.createdAt && (
              <p className="mt-0.5 text-[10px] text-text-muted">
                {new Date(file.createdAt).toLocaleString('zh-TW')}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => void onPreview(file.filePath)}
              className="rounded p-1 text-accent hover:bg-accent/10"
              title="預覽"
            >
              <Eye size={13} />
            </button>
            <button
              type="button"
              onClick={() => void onDelete(file)}
              className="rounded p-1 text-red-400 hover:bg-red-500/10"
              title="刪除"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-text-muted">尚無檔案</p>
      )}
    </div>
  );
}
