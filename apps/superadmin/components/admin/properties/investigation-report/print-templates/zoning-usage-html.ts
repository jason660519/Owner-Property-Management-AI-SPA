// Print template: zoning usage (land use zone, building coverage, floor area ratio)
import { escapeHtml } from './print-css';
import type { InvestigationReport } from '../types';

export function buildZoningUsageHtml(report: InvestigationReport): string {
  const active = report.landParcels.filter(
    (p) => p.lotNumber || p.zoningType || p.buildingCoverage || p.floorAreaRatio,
  );

  if (active.length === 0) {
    return `
<div class="attachment-page">
  <h3>使用分區</h3>
  <p style="color:#888;font-size:9px">尚無使用分區資料。</p>
</div>`;
  }

  const rows = active
    .map(
      (p, i) => `
    <tr>
      <td class="vw">${i + 1}</td>
      <td class="vw">${escapeHtml(p.lotNumber) || '—'}</td>
      <td class="vw">${escapeHtml(p.zoningType) || '—'}</td>
      <td class="vw">${escapeHtml(p.buildingCoverage) || '—'}</td>
      <td class="vw">${escapeHtml(p.floorAreaRatio) || '—'}</td>
    </tr>`,
    )
    .join('');

  return `
<div class="attachment-page">
  <h3>使用分區</h3>
  <table>
    <tr>
      <th style="width:30px">#</th>
      <th>地號</th>
      <th>使用分區</th>
      <th>建蔽率</th>
      <th>容積率</th>
    </tr>
    ${rows}
  </table>
  <p style="margin-top:8px;font-size:8px;color:#888">
    ※ 使用分區資料來源：謄本登記或地方政府都市計畫查詢系統
  </p>
</div>`;
}
