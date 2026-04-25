// filepath: apps/superadmin/components/admin/properties/PropertyMapView.tsx
// Map view for the properties list — renders all geo-coded properties as
// interactive Leaflet markers; properties without coords are listed below.
'use client';

import 'leaflet/dist/leaflet.css';

import { useEffect, useRef } from 'react';
import { MapPin, AlertTriangle, ExternalLink } from 'lucide-react';
import type { PropertyItem } from '@/lib/types/properties';

interface Props {
  properties: PropertyItem[];
}

const statusLabelMap: Record<string, string> = {
  for_sale: '出售中',
  for_rent: '出租中',
  collecting_rent: '收租中',
  sold: '賀成交（出售）',
  rented: '賀成交（出租）',
  pending: '待审',
  expired: '逾期案',
  invalid: '無效案',
};

function formatPrice(p: PropertyItem): string {
  if (p.type === 'sale' && p.price != null) {
    if (p.price >= 100_000_000) return `NT$ ${(p.price / 100_000_000).toFixed(1)}億`;
    if (p.price >= 10_000) return `NT$ ${(p.price / 10_000).toFixed(0)}萬`;
    return `NT$ ${p.price.toLocaleString()}`;
  }
  if (p.type === 'rental' && p.monthlyRent != null) {
    return `NT$ ${p.monthlyRent.toLocaleString()}/月`;
  }
  return '—';
}

export function PropertyMapView({ properties }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // Keep a ref to the Leaflet map instance so we can destroy it on unmount
  const mapInstanceRef = useRef<import('leaflet').Map | null>(null);

  const withCoords = properties.filter((p) => p.latitude != null && p.longitude != null);
  const withoutCoords = properties.filter((p) => p.latitude == null || p.longitude == null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    // Leaflet must be imported dynamically — it accesses `window` on import
    let destroyed = false;

    import('leaflet').then((L) => {
      if (destroyed || !mapContainerRef.current) return;

      const iconProto = L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown };
      delete iconProto._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Default center: Taiwan
      const defaultCenter: [number, number] = [23.9, 121.0];
      const defaultZoom = withCoords.length > 0 ? 10 : 7;

      const map = L.map(mapContainerRef.current!, {
        center: defaultCenter,
        zoom: defaultZoom,
      });
      mapInstanceRef.current = map;

      // OpenStreetMap tile layer (free, no API key)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Add markers
      const bounds: [number, number][] = [];
      withCoords.forEach((p) => {
        const lat = p.latitude!;
        const lng = p.longitude!;
        bounds.push([lat, lng]);

        const address = [p.addressCity, p.addressDistrict, p.addressStreet, p.addressNumber]
          .filter(Boolean).join('');
        const statusLabel = statusLabelMap[p.status] ?? p.status;
        const price = formatPrice(p);

        const mapsUrl = address
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
          : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

        const popup = L.popup({ maxWidth: 260 }).setContent(`
          <div style="font-family:sans-serif;font-size:13px;line-height:1.5">
            <p style="font-weight:600;margin:0 0 4px">${p.title || '—'}</p>
            <p style="margin:0 0 2px;color:#6b7280;font-size:11px">${address || p.address || '—'}</p>
            <p style="margin:0 0 6px;font-size:11px">${statusLabel} &middot; ${price}</p>
            <div style="display:flex;gap:12px">
              <a href="/superadmin/properties/${p.id}/edit"
                 target="_blank"
                 style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#6366f1;text-decoration:none"
              >編輯物件 ↗</a>
              <a href="${mapsUrl}"
                 target="_blank"
                 rel="noopener noreferrer"
                 style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#6b7280;text-decoration:none"
              >Google Maps ↗</a>
            </div>
          </div>
        `);

        L.marker([lat, lng]).addTo(map).bindPopup(popup);
      });

      // Fit map to markers if we have any
      if (bounds.length > 0) {
        if (bounds.length === 1) {
          map.setView(bounds[0], 15);
        } else {
          map.fitBounds(bounds, { padding: [40, 40] });
        }
      }
    });

    return () => {
      destroyed = true;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only mount/unmount — markers are static for this render

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      {/* Map */}
      <div className="relative rounded-lg overflow-hidden border border-border-default flex-1 min-h-0" style={{ minHeight: 420 }}>
        <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />
        {/* Badge: coords count */}
        <div className="absolute top-3 left-3 z-[1000] bg-bg-primary/90 border border-border-default rounded-lg px-3 py-1.5 text-xs text-text-secondary shadow flex items-center gap-1.5">
          <MapPin size={12} className="text-green-500" />
          {withCoords.length} 件已定位
          {withoutCoords.length > 0 && (
            <span className="ml-1 text-text-muted">/ {withoutCoords.length} 件未設定</span>
          )}
        </div>
      </div>

      {/* Properties without coordinates */}
      {withoutCoords.length > 0 && (
        <div className="shrink-0 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-xs font-semibold text-amber-600 flex items-center gap-1.5 mb-2">
            <AlertTriangle size={13} />
            以下 {withoutCoords.length} 件物件尚未設定座標，無法顯示於地圖
          </p>
          <div className="flex flex-wrap gap-2">
            {withoutCoords.map((p) => (
              <a
                key={p.id}
                href={`/superadmin/properties/${p.id}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-bg-primary border border-border-default text-text-secondary hover:text-accent hover:border-accent transition-colors"
              >
                {p.title || p.address || p.id.slice(0, 8)}
                <ExternalLink size={10} />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
