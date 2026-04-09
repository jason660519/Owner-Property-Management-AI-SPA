// Print template: map location (coordinates + address text, no API key needed)
import { escapeHtml } from './print-css';
import type { InvestigationReport } from '../types';
import type { PropertyItem } from '@/lib/types/properties';

export function buildMapLocationHtml(
  report: InvestigationReport,
  property?: PropertyItem,
): string {
  const addr = [report.region, report.addressStreet, report.addressNumber]
    .filter(Boolean)
    .join(' ');
  const lat = property?.latitude;
  const lng = property?.longitude;

  const hasCoords = lat != null && lng != null;
  const googleMapsUrl = hasCoords
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : '';

  return `
<div class="attachment-page">
  <h3>Google 地圖定位</h3>
  <table>
    <tr>
      <td class="lbl" style="width:100px">物件地址</td>
      <td class="vw">${escapeHtml(addr) || '—'}</td>
    </tr>
    ${hasCoords ? `
    <tr>
      <td class="lbl">緯度 (Lat)</td>
      <td class="vw">${lat!.toFixed(6)}</td>
    </tr>
    <tr>
      <td class="lbl">經度 (Lng)</td>
      <td class="vw">${lng!.toFixed(6)}</td>
    </tr>
    <tr>
      <td class="lbl">Google Maps</td>
      <td class="vw"><a href="${googleMapsUrl}" style="color:#0066cc">${googleMapsUrl}</a></td>
    </tr>` : `
    <tr>
      <td class="lbl">座標</td>
      <td class="vw" style="color:#888">尚未設定座標</td>
    </tr>`}
  </table>
  ${hasCoords ? `
  <p style="margin-top:12px;font-size:9px;color:#555">
    ※ 列印後可掃描上方連結或輸入座標至 Google Maps 查看實際位置
  </p>` : ''}
</div>`;
}
