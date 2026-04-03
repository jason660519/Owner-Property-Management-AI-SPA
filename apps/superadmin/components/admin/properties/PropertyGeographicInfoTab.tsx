'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ExternalLink, MapPin, Download, Loader2, Map as MapIcon, Trash2 } from 'lucide-react';
import { formatStructuredAddress, type PropertyItem } from '@/lib/types/properties';
import { fetchCadastralMap, deleteCadastralMap, type FetchResult } from '@/lib/actions/cadastral-maps';
import { getPropertyDocuments } from '@/lib/actions/properties';
import {
  GIS_SOURCE_LABELS,
  GIS_SOURCE_URLS,
  type MapLayerPreset,
  type GisSource,
} from '@/lib/utils/cadastral-map-fetcher';

const cardCls = 'rounded-lg border border-border-default bg-bg-primary px-4 py-3';

interface FetchState {
  /** Which layer preset is currently being fetched; only that button shows a spinner */
  fetchingLayer: MapLayerPreset | null;
  error: string | null;
  /** Fetched results, newest first */
  results: MapResult[];
}

interface MapResult {
  url: string;
  storagePath: string;
  documentId: string;
  source: GisSource;
  sourceUrl: string;
  fetchedAt: string;
  label: string;
  deleting?: boolean;
}

const INITIAL_STATE: FetchState = { fetchingLayer: null, error: null, results: [] };

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
  /** Prevents double-submit (e.g. rapid clicks) before React state catches up */
  const fetchInFlightRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setFetchState((prev) => ({ ...prev, fetchingLayer: null, error: null }));

    getPropertyDocuments(property.id).then((docs) => {
      if (cancelled) return;
      const results: MapResult[] = docs
        .filter((d) => d.documentType === 'cadastral_map')
        .map((d) => {
          const layersTag = (d.tags ?? []).find((t) => t.startsWith('gis:'))?.split(':')[1] as MapLayerPreset | undefined;
          const sourceTag = (d.tags ?? []).find((t) => t.startsWith('source:'))?.split(':')[1] as GisSource | undefined;
          const sourceFinal = sourceTag ?? 'historygis';

          return {
            url: d.url,
            storagePath: d.filePath,
            documentId: d.id,
            source: sourceFinal,
            sourceUrl: GIS_SOURCE_URLS[sourceFinal],
            fetchedAt: d.createdAt ?? new Date().toISOString(),
            label: LAYER_LABELS[layersTag ?? 'cadastral'],
          };
        });

      setFetchState((prev) => ({
        ...prev,
        results,
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [property.id]);

  const hasAddress = !!(property.addressDistrict && property.addressStreet && property.addressNumber);
  const canFetch = hasCoords || hasAddress;
  const fetchInFlight = fetchState.fetchingLayer !== null;

  const handleFetch = useCallback(
    async (layers: MapLayerPreset) => {
      if (fetchInFlightRef.current) return;
      fetchInFlightRef.current = true;

      setFetchState((prev) => ({ ...prev, fetchingLayer: layers, error: null }));

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

        if (result.success && result.url && result.documentId && result.storagePath) {
          const newResult: MapResult = {
            url: result.url,
            storagePath: result.storagePath,
            documentId: result.documentId,
            source: result.source ?? source,
            sourceUrl: GIS_SOURCE_URLS[result.source ?? source],
            fetchedAt: result.fetchedAt ?? new Date().toISOString(),
            label: LAYER_LABELS[layers],
          };
          setFetchState((prev) => ({
            fetchingLayer: null,
            error: null,
            results: [newResult, ...prev.results],
          }));
        } else {
          setFetchState((prev) => ({
            ...prev,
            fetchingLayer: null,
            error: result.message,
          }));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setFetchState((prev) => ({
          ...prev,
          fetchingLayer: null,
          error: `擷取失敗：${msg}`,
        }));
      } finally {
        fetchInFlightRef.current = false;
      }
    },
    [property, hasCoords, hasAddress, lat, lng, source],
  );

  const handleDelete = useCallback(async (documentId: string, storagePath: string) => {
    setFetchState((prev) => ({
      ...prev,
      results: prev.results.map((r) =>
        r.documentId === documentId ? { ...r, deleting: true } : r,
      ),
    }));

    const res = await deleteCadastralMap(documentId, storagePath);

    if (res.success) {
      setFetchState((prev) => ({
        ...prev,
        results: prev.results.filter((r) => r.documentId !== documentId),
      }));
    } else {
      setFetchState((prev) => ({
        ...prev,
        error: res.message,
        results: prev.results.map((r) =>
          r.documentId === documentId ? { ...r, deleting: false } : r,
        ),
      }));
    }
  }, []);

  const handleDeleteAll = useCallback(async () => {
    let items: MapResult[] = [];
    setFetchState((prev) => {
      items = prev.results;
      if (items.length === 0) return prev;
      return {
        ...prev,
        results: prev.results.map((r) => ({ ...r, deleting: true })),
      };
    });
    if (items.length === 0) return;

    await Promise.all(items.map((r) => deleteCadastralMap(r.documentId, r.storagePath)));
    setFetchState({ fetchingLayer: null, error: null, results: [] });
  }, []);

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-start gap-2 text-sm text-text-muted">
        <MapPin size={18} className="text-accent shrink-0 mt-0.5" />
        <p>
          檢視物件結構化地址（與「物件編輯」頁一致），並可自動擷取台北市地籍圖與建物套繪圖。
        </p>
      </div>

      {/* Address card */}
      <div className={cardCls}>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
          地址
        </h3>
        <p className="text-sm text-text-primary leading-relaxed">{addressLine}</p>
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
              loading={fetchState.fetchingLayer === 'cadastral'}
              disabled={fetchInFlight && fetchState.fetchingLayer !== 'cadastral'}
              onClick={() => void handleFetch('cadastral')}
            />
            <FetchButton
              label="建物套繪圖"
              loading={fetchState.fetchingLayer === 'building'}
              disabled={fetchInFlight && fetchState.fetchingLayer !== 'building'}
              onClick={() => void handleFetch('building')}
            />
            <FetchButton
              label="地籍圖 + 建物套繪圖"
              loading={fetchState.fetchingLayer === 'both'}
              disabled={fetchInFlight && fetchState.fetchingLayer !== 'both'}
              onClick={() => void handleFetch('both')}
            />
          </div>
        )}

        {/* Error */}
        {fetchState.error && (
          <p className="text-xs text-error">{fetchState.error}</p>
        )}

        {/* Results header + delete all */}
        {fetchState.results.length > 0 && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-medium text-text-secondary">
              擷取結果（{fetchState.results.length}）
            </span>
            {fetchState.results.length > 1 && (
              <button
                type="button"
                onClick={handleDeleteAll}
                className="inline-flex items-center gap-1 text-xs text-error hover:underline"
              >
                <Trash2 size={12} />
                全部刪除
              </button>
            )}
          </div>
        )}

        {/* Result cards */}
        {fetchState.results.map((r) => (
          <MapResultCard
            key={r.storagePath}
            result={r}
            onDelete={() => handleDelete(r.documentId, r.storagePath)}
          />
        ))}
      </div>
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
  /** True while another preset is fetching (this button idle but not clickable) */
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

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function MapResultCard({ result, onDelete }: { result: MapResult; onDelete: () => void }) {
  const sourceLabel = GIS_SOURCE_LABELS[result.source];

  return (
    <div className="rounded-md border border-border-default bg-bg-secondary overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-bg-tertiary/50 border-b border-border-default">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-text-primary truncate">{result.label}</span>
          <span className="text-[10px] text-text-muted shrink-0">
            {formatTimestamp(result.fetchedAt)}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
          >
            <Download size={12} />
            下載
          </a>
          <button
            type="button"
            aria-label={`刪除此筆：${result.label}`}
            disabled={result.deleting}
            onClick={onDelete}
            className="inline-flex items-center gap-1 text-xs text-error hover:underline disabled:opacity-50"
          >
            {result.deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            刪除
          </button>
        </div>
      </div>

      {/* Source info */}
      <div className="px-3 py-1 text-[10px] text-text-muted border-b border-border-default/50">
        來源：
        <a
          href={result.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          {sourceLabel}
        </a>
        <span className="mx-1">|</span>
        {result.sourceUrl}
      </div>

      {/* Image preview */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={result.url} alt={result.label} className="w-full" />
    </div>
  );
}
