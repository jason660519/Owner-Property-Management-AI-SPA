'use client';

import { useState, useCallback, useRef, useEffect, useMemo, type ReactNode } from 'react';
import {
  ExternalLink,
  MapPin,
  Loader2,
  Map as MapIcon,
  Trash2,
  Eye,
  FileText,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { formatStructuredAddress, type PropertyItem } from '@/lib/types/properties';
import {
  fetchCadastralMap,
  deleteCadastralMap,
  listCadastralMapFiles,
  getGisFileUrl,
  type FetchResult,
  type StoredGisFile,
} from '@/lib/actions/cadastral-maps';
import {
  GIS_SOURCE_LABELS,
  type MapLayerPreset,
  type GisSource,
} from '@/lib/utils/cadastral-map-fetcher';
import {
  readPendingMap,
  writePendingLayer,
  clearPendingLayer,
  pendingLayersList,
  elapsedSecondsForLayer,
} from './gis-fetch-pending-storage';
import {
  readOutcomesMap,
  writeOutcome,
  clearOutcomeForLayer,
  clearOutcomesMap,
  GIS_OUTCOME_PRESET_ORDER,
  type GisOutcomesMap,
} from './gis-fetch-outcomes-storage';

const cardCls = 'rounded-lg border border-border-default bg-bg-primary px-4 py-3';

interface FetchState {
  fetchingLayers: MapLayerPreset[];
}

const INITIAL_STATE: FetchState = { fetchingLayers: [] };

const SOURCE_OPTIONS: { value: GisSource; label: string; hint: string }[] = [
  {
    value: 'historygis',
    label: GIS_SOURCE_LABELS.historygis,
    hint: 'TWD97 座標，投影誤差較小（推薦）',
  },
  {
    value: 'epoint',
    label: GIS_SOURCE_LABELS.epoint,
    hint: 'Web Mercator 座標（預計 2026/5/31 停止服務）',
  },
];

const LAYER_LABELS: Record<MapLayerPreset, string> = {
  cadastral: '地籍圖',
  building: '建物套繪圖',
  both: '地籍圖 + 建物套繪圖',
};

function truncateMessage(s: string, max = 96): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

export function PropertyGeographicInfoTab({ property }: { property: PropertyItem }) {
  const addressLine = formatStructuredAddress(property);
  const lat = property.latitude;
  const lng = property.longitude;
  const hasCoords = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);

  const googleUrl = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : null;
  const osmUrl = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=17`
    : null;

  const [source, setSource] = useState<GisSource>('historygis');
  const [fetchState, setFetchState] = useState<FetchState>(INITIAL_STATE);
  const [outcomes, setOutcomes] = useState<GisOutcomesMap>(() => readOutcomesMap(property.id));
  const fetchingLayersRef = useRef<Set<MapLayerPreset>>(new Set());
  const mountedRef = useRef(true);

  const [elapsedTick, setElapsedTick] = useState(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setFetchState({
      fetchingLayers: pendingLayersList(property.id),
    });
    setOutcomes(readOutcomesMap(property.id));
  }, [property.id]);

  useEffect(() => {
    const sync = () => {
      const layers = pendingLayersList(property.id);
      setFetchState((prev) => {
        const same =
          prev.fetchingLayers.length === layers.length &&
          prev.fetchingLayers.every((l) => layers.includes(l)) &&
          layers.every((l) => prev.fetchingLayers.includes(l));
        if (same) return prev;
        return { fetchingLayers: layers };
      });
      setOutcomes(readOutcomesMap(property.id));
    };
    sync();
    const id = setInterval(sync, 400);
    return () => clearInterval(id);
  }, [property.id]);

  const pendingLayersKey = fetchState.fetchingLayers.join(',');

  useEffect(() => {
    if (pendingLayersKey === '') return;
    const id = setInterval(() => setElapsedTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [pendingLayersKey]);

  const layerElapsed = useMemo(
    () => ({
      cadastral: elapsedSecondsForLayer(property.id, 'cadastral'),
      building: elapsedSecondsForLayer(property.id, 'building'),
      both: elapsedSecondsForLayer(property.id, 'both'),
    }),
    [property.id, elapsedTick, pendingLayersKey],
  );

  const hasAddress = !!(property.addressDistrict && property.addressStreet && property.addressNumber);
  const canFetch = hasCoords || hasAddress;
  const fetchInFlight = fetchState.fetchingLayers.length > 0;
  const isLayerFetching = useCallback(
    (layer: MapLayerPreset) => fetchState.fetchingLayers.includes(layer),
    [fetchState.fetchingLayers],
  );

  const [cloudFiles, setCloudFiles] = useState<StoredGisFile[]>([]);

  const loadCloudFiles = useCallback(async () => {
    const { data } = await listCadastralMapFiles(property.id);
    setCloudFiles(data);
  }, [property.id]);

  const handleFetch = useCallback(
    async (layers: MapLayerPreset) => {
      if (readPendingMap(property.id)[layers] != null || fetchingLayersRef.current.has(layers)) {
        return;
      }
      fetchingLayersRef.current.add(layers);
      clearOutcomeForLayer(property.id, layers);
      writePendingLayer(property.id, layers, Date.now());
      if (mountedRef.current) {
        setOutcomes(readOutcomesMap(property.id));
        setFetchState((prev) => ({
          ...prev,
          fetchingLayers: pendingLayersList(property.id),
        }));
      }

      try {
        const result: FetchResult = await fetchCadastralMap(
          property.id,
          property.type,
          property.ownerId,
          layers,
          hasCoords ? { latitude: lat!, longitude: lng! } : null,
          hasCoords || !hasAddress
            ? null
            : {
                district: property.addressDistrict!,
                street: property.addressStreet!,
                addressNumber: property.addressNumber!,
              },
          { source },
        );

        const sec = elapsedSecondsForLayer(property.id, layers);

        if (result.success && result.url && result.documentId && result.storagePath) {
          writeOutcome(property.id, layers, { kind: 'success', seconds: sec, at: Date.now() });
          if (mountedRef.current) {
            setOutcomes(readOutcomesMap(property.id));
            await loadCloudFiles();
          }
        } else {
          writeOutcome(property.id, layers, {
            kind: 'error',
            seconds: sec,
            message: truncateMessage(result.message),
            at: Date.now(),
          });
          if (mountedRef.current) {
            setOutcomes(readOutcomesMap(property.id));
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const sec = elapsedSecondsForLayer(property.id, layers);
        writeOutcome(property.id, layers, {
          kind: 'error',
          seconds: sec,
          message: truncateMessage(`擷取失敗：${msg}`),
          at: Date.now(),
        });
        if (mountedRef.current) {
          setOutcomes(readOutcomesMap(property.id));
        }
      } finally {
        clearPendingLayer(property.id, layers);
        fetchingLayersRef.current.delete(layers);
        if (mountedRef.current) {
          setFetchState((prev) => ({
            ...prev,
            fetchingLayers: pendingLayersList(property.id),
          }));
          setOutcomes(readOutcomesMap(property.id));
        }
      }
    },
    [property, hasCoords, hasAddress, lat, lng, source, loadCloudFiles],
  );

  const handleDeleteAllCloud = useCallback(async () => {
    if (cloudFiles.length === 0) return;
    const items = [...cloudFiles];
    await Promise.all(items.map((f) => deleteCadastralMap(f.id, f.filePath)));
    setFetchState({
      fetchingLayers: pendingLayersList(property.id),
    });
    await loadCloudFiles();
  }, [cloudFiles, loadCloudFiles, property.id]);

  useEffect(() => {
    void loadCloudFiles();
  }, [loadCloudFiles]);

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

  const hasAnyOutcome = GIS_OUTCOME_PRESET_ORDER.some((k) => outcomes[k] != null);

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-start gap-2 text-sm text-text-muted">
        <MapPin size={18} className="text-accent shrink-0 mt-0.5" />
        <p>
          預計查詢地址（與「物件基本資訊」頁一致），用於自動擷取台北市地籍圖與建物套繪圖。
        </p>
      </div>

      {/* Address card — read-only; allow text selection for copy */}
      <div className={`${cardCls} select-text`}>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
          地址
        </h3>
        <p className="text-sm text-text-primary leading-relaxed select-text">{addressLine}</p>
      </div>

      {/* External links */}
      {hasCoords && googleUrl && osmUrl && (
        <div className="flex flex-wrap gap-3">
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
          >
            <ExternalLink size={14} />
            在 Google 地圖開啟
          </a>
          <a
            href={osmUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
          >
            <ExternalLink size={14} />
            在 OpenStreetMap 開啟
          </a>
        </div>
      )}

      {/* GIS Map Fetch Section */}
      <div className={`${cardCls} space-y-3`}>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1">
          台北市地籍圖 / 建物套繪圖 自動擷取
        </h3>

        {/* Source selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-secondary">圖資來源</label>
          <div className="flex gap-2">
            {SOURCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={fetchInFlight}
                onClick={() => setSource(opt.value)}
                className={`flex-1 rounded-md border px-3 py-2 text-left transition-colors ${
                  source === opt.value
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border-default bg-bg-secondary text-text-primary hover:bg-bg-tertiary'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className="block text-xs font-medium">{opt.label}</span>
                <span className="block text-[10px] text-text-muted mt-0.5">{opt.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-text-muted">
          A4 直向、1:1000 比例尺、300 DPI。結果自動儲存至物件文件。
        </p>

        {!canFetch && (
          <p className="text-xs text-warning">
            需要座標或完整結構化地址（行政區 + 道路 + 門牌號碼）才能擷取。
          </p>
        )}

        {canFetch && (
          <div className="flex flex-wrap gap-2">
            <FetchButton
              label="地籍圖"
              loading={isLayerFetching('cadastral')}
              onClick={() => void handleFetch('cadastral')}
            />
            <FetchButton
              label="建物套繪圖"
              loading={isLayerFetching('building')}
              onClick={() => void handleFetch('building')}
            />
            <FetchButton
              label="地籍圖 + 建物套繪圖"
              loading={isLayerFetching('both')}
              onClick={() => void handleFetch('both')}
            />
          </div>
        )}

        {canFetch && (
          <div className="rounded-md border border-border-default bg-bg-secondary/60 px-3 py-2 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                各項目擷取狀態（離開此頁後，未完成的項目仍會在背景繼續）
              </p>
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
            <ul className="space-y-1.5">
              {GIS_OUTCOME_PRESET_ORDER.map((layer) => {
                const pending = isLayerFetching(layer);
                const o = outcomes[layer];
                const waitSec = layerElapsed[layer];

                let line: ReactNode;
                if (pending) {
                  line = (
                    <span className="inline-flex items-center gap-1.5 text-text-secondary">
                      <Loader2 size={12} className="animate-spin shrink-0" />
                      進行中 · 已 {waitSec} 秒
                    </span>
                  );
                } else if (o?.kind === 'success') {
                  line = (
                    <span className="inline-flex items-center gap-1.5 text-accent">
                      <CheckCircle2 size={12} className="shrink-0" />
                      成功 · 耗時 {o.seconds} 秒
                    </span>
                  );
                } else if (o?.kind === 'error') {
                  line = (
                    <span className="inline-flex items-start gap-1.5 text-error">
                      <XCircle size={12} className="shrink-0 mt-0.5" />
                      <span>
                        失敗 · 耗時 {o.seconds} 秒
                        <span className="text-text-muted"> · </span>
                        {o.message}
                      </span>
                    </span>
                  );
                } else {
                  line = <span className="text-text-muted">尚未擷取</span>;
                }

                return (
                  <li
                    key={layer}
                    className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3 text-xs"
                  >
                    <span className="font-medium text-text-primary shrink-0">{LAYER_LABELS[layer]}</span>
                    <span className="min-w-0 break-words sm:text-right">{line}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Cloud GIS file list — single source of truth after upload to Supabase */}
      {cloudFiles.length > 0 && (
        <div className="border border-border-default rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h5 className="text-[11px] font-semibold text-text-primary flex items-center gap-1.5 min-w-0">
              <FileText size={13} />
              <span className="truncate">雲端 GIS 圖資紀錄（{cloudFiles.length}）</span>
            </h5>
            {cloudFiles.length > 1 && (
              <button
                type="button"
                onClick={() => void handleDeleteAllCloud()}
                className="inline-flex items-center gap-1 text-xs text-error hover:underline shrink-0"
              >
                <Trash2 size={12} />
                全部刪除
              </button>
            )}
          </div>
          <ul className="space-y-1">
            {cloudFiles.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between text-[11px] text-text-secondary py-1 px-2 rounded hover:bg-bg-secondary"
              >
                <span className="truncate mr-2">
                  {f.name}
                  {f.createdAt && (
                    <span className="text-text-muted ml-2">
                      {new Date(f.createdAt).toLocaleString('zh-TW')}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handlePreviewGisFile(f.filePath)}
                    className="p-1 rounded hover:bg-accent/10 text-accent"
                    title="預覽"
                  >
                    <Eye size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteGisFile(f)}
                    className="p-1 rounded hover:bg-red-500/10 text-red-400"
                    title="刪除"
                  >
                    <Trash2 size={13} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function FetchButton({
  label,
  loading,
  disabled = false,
  onClick,
}: {
  label: string;
  loading: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={loading || disabled}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-border-default bg-bg-secondary px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-tertiary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <MapIcon size={14} />}
      擷取{label}
    </button>
  );
}
