'use client';

import { useEffect, useMemo, useRef } from 'react';
import { ExternalLink, Loader2, MapPin, Search } from 'lucide-react';
import type { LatLng } from 'leaflet';
import 'leaflet/dist/leaflet.css';

const TAIWAN_DEFAULT: [number, number] = [23.7, 121.0];
const DEFAULT_ZOOM = 7;
const PIN_ZOOM = 17;

export interface PropertyMapLocationTabProps {
  composedAddress: string;
  latInput: string;
  lngInput: string;
  onLatInputChange: (value: string) => void;
  onLngInputChange: (value: string) => void;
  isGeocoding: boolean;
  geocodeMsg: { type: 'success' | 'error'; text: string } | null;
  onGeocodeFromAddress: () => void | Promise<void>;
}

function parseCoord(
  raw: string,
  min: number,
  max: number
): number | null {
  const n = parseFloat(raw.trim());
  if (raw.trim() === '' || Number.isNaN(n) || n < min || n > max) return null;
  return n;
}

/** Single-property map: OSM tiles + draggable marker; click map or drag pin to set WGS84 coords. */
export function PropertyMapLocationTab({
  composedAddress,
  latInput,
  lngInput,
  onLatInputChange,
  onLngInputChange,
  isGeocoding,
  geocodeMsg,
  onGeocodeFromAddress,
}: PropertyMapLocationTabProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const markerRef = useRef<import('leaflet').Marker | null>(null);
  const skipNextExternalSync = useRef(false);

  const validLat = useMemo(() => parseCoord(latInput, -90, 90), [latInput]);
  const validLng = useMemo(() => parseCoord(lngInput, -180, 180), [lngInput]);

  const coordsRef = useRef<{ lat: number | null; lng: number | null }>({
    lat: validLat,
    lng: validLng,
  });
  coordsRef.current = { lat: validLat, lng: validLng };

  const googleMapsUrl = useMemo(() => {
    if (validLat !== null && validLng !== null) {
      return `https://www.google.com/maps/search/?api=1&query=${validLat},${validLng}`;
    }
    if (composedAddress.trim()) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(composedAddress.trim())}`;
    }
    return null;
  }, [validLat, validLng, composedAddress]);

  // Init map + marker once (read latest coords from coordsRef when Leaflet finishes loading)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;

    import('leaflet').then((L) => {
      if (cancelled || !containerRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const { lat: lat0, lng: lng0 } = coordsRef.current;
      const hasPin = lat0 !== null && lng0 !== null;
      const center: [number, number] = hasPin ? [lat0, lng0] : TAIWAN_DEFAULT;
      const zoom = hasPin ? PIN_ZOOM : DEFAULT_ZOOM;

      const map = L.map(el, {
        center,
        zoom,
        scrollWheelZoom: true,
      });
      mapRef.current = map;
      requestAnimationFrame(() => {
        map.invalidateSize();
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · 座標為 WGS84，可與 Google 地圖共用',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker(center, { draggable: true }).addTo(map);
      markerRef.current = marker;

      if (!hasPin) {
        marker.setOpacity(0.35);
      }

      const applyFromMarker = (latlng: LatLng) => {
        skipNextExternalSync.current = true;
        onLatInputChange(latlng.lat.toFixed(6));
        onLngInputChange(latlng.lng.toFixed(6));
        marker.setOpacity(1);
      };

      marker.on('dragend', () => {
        applyFromMarker(marker.getLatLng());
      });

      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        applyFromMarker(e.latlng);
        map.setView(e.latlng, Math.max(map.getZoom(), 16));
      });

      // Late init: if coords were set while Leaflet was loading, snap marker now
      const { lat: lat1, lng: lng1 } = coordsRef.current;
      if (lat1 !== null && lng1 !== null && (!hasPin || lat1 !== lat0 || lng1 !== lng0)) {
        const ll: [number, number] = [lat1, lng1];
        marker.setLatLng(ll);
        marker.setOpacity(1);
        map.setView(ll, PIN_ZOOM);
      }
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once; coords synced in effect below
  }, []);

  // Sync marker / view when coords change from geocode or manual inputs
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    if (skipNextExternalSync.current) {
      skipNextExternalSync.current = false;
      return;
    }

    if (validLat !== null && validLng !== null) {
      const ll: [number, number] = [validLat, validLng];
      marker.setLatLng(ll);
      marker.setOpacity(1);
      map.setView(ll, Math.max(map.getZoom(), 15));
    }
  }, [validLat, validLng]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <MapPin className="h-4 w-4 text-accent shrink-0" />
          Google 地圖／座標定位
        </h3>
        <p className="text-xs text-text-muted mt-1 leading-relaxed">
          先依<strong className="text-text-secondary">「物件基本資訊」</strong>
          填寫地址後，按下方從地址偵測座標。若標示位置有誤，可<strong className="text-text-secondary">
            拖曳紅色標記
          </strong>
          或<strong className="text-text-secondary">點擊地圖</strong>修正。圖資為 OpenStreetMap，與 Google 共用相同經緯度。
        </p>
      </div>

      <div className="rounded-lg border border-border-default bg-bg-tertiary/40 px-3 py-2 text-xs text-text-secondary">
        <span className="text-text-muted">目前地址：</span>
        {composedAddress.trim() ? composedAddress : <span className="text-amber-600">請至「物件基本資訊」填寫地址</span>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            void onGeocodeFromAddress();
          }}
          disabled={isGeocoding}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs bg-bg-primary border border-border-default rounded-md text-text-secondary hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
        >
          {isGeocoding ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          從地址自動偵測座標
        </button>
        {googleMapsUrl && (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-text-muted hover:text-accent border border-transparent rounded-md transition-colors"
          >
            <ExternalLink size={14} />
            在 Google Maps 開啟
          </a>
        )}
      </div>

      {geocodeMsg && (
        <p className={`text-xs ${geocodeMsg.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
          {geocodeMsg.text}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-text-muted mb-1">緯度 Latitude</label>
          <input
            type="text"
            value={latInput}
            onChange={(e) => {
              onLatInputChange(e.target.value);
            }}
            placeholder="25.033000"
            className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent font-mono"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">經度 Longitude</label>
          <input
            type="text"
            value={lngInput}
            onChange={(e) => {
              onLngInputChange(e.target.value);
            }}
            placeholder="121.565400"
            className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent font-mono"
          />
        </div>
      </div>

      <div
        className="relative rounded-lg overflow-hidden border border-border-default bg-bg-tertiary"
        style={{ height: 'min(55vh, 480px)', minHeight: 320 }}
      >
        <div ref={containerRef} className="absolute inset-0 z-0" />
      </div>

      <p className="text-[11px] text-text-muted">
        儲存變更後，緯度／經度會寫入物件資料。若僅調整地圖而未按儲存，離開頁面後不會保留。
      </p>
    </div>
  );
}
