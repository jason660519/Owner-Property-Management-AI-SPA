// Print template: building & land area detail table
import { escapeHtml } from './print-css';
import type { InvestigationReport, LandParcel, BuildingAreas } from '../types';
import { sqmToPing, calcShareArea, calcBuildingTotal } from '../types';

function fmt(n: number, decimals = 2): string {
  return n > 0 ? n.toFixed(decimals) : '—';
}

function buildLandTable(parcels: LandParcel[]): string {
  const active = parcels.filter((p) => p.lotNumber || p.baseArea > 0);
  if (active.length === 0) return '<p style="color:#888;font-size:9px">無土地資料</p>';

  const rows = active
    .map(
      (p, i) => `
    <tr>
      <td class="vw">${i + 1}</td>
      <td class="vw">${escapeHtml(p.lotNumber) || '—'}</td>
      <td class="vw" style="text-align:right">${fmt(p.baseArea)}</td>
      <td class="vw" style="text-align:right">${sqmToPing(p.baseArea).toFixed(2)}</td>
      <td class="vw">${p.ownershipDenom ? `${p.ownershipNumer}/${p.ownershipDenom}` : '—'}</td>
      <td class="vw" style="text-align:right">${fmt(calcShareArea(p))}</td>
      <td class="vw" style="text-align:right">${sqmToPing(calcShareArea(p)).toFixed(2)}</td>
      <td class="vw">${escapeHtml(p.zoningType) || '—'}</td>
      <td class="vw">${escapeHtml(p.buildingCoverage) || '—'}</td>
      <td class="vw">${escapeHtml(p.floorAreaRatio) || '—'}</td>
    </tr>`,
    )
    .join('');

  const totalBase = active.reduce((s, p) => s + p.baseArea, 0);
  const totalShare = active.reduce((s, p) => s + calcShareArea(p), 0);

  return `
  <table>
    <tr class="header-row">
      <th colspan="10">土地明細</th>
    </tr>
    <tr>
      <th style="width:30px">#</th>
      <th>地號</th>
      <th>基地面積(㎡)</th>
      <th>基地面積(坪)</th>
      <th>持分比例</th>
      <th>持分面積(㎡)</th>
      <th>持分面積(坪)</th>
      <th>使用分區</th>
      <th>建蔽率</th>
      <th>容積率</th>
    </tr>
    ${rows}
    <tr class="total-row">
      <td colspan="2" style="text-align:center">合計</td>
      <td style="text-align:right">${fmt(totalBase)}</td>
      <td style="text-align:right">${sqmToPing(totalBase).toFixed(2)}</td>
      <td></td>
      <td style="text-align:right">${fmt(totalShare)}</td>
      <td style="text-align:right">${sqmToPing(totalShare).toFixed(2)}</td>
      <td colspan="3"></td>
    </tr>
  </table>`;
}

function buildBuildingTable(b: BuildingAreas): string {
  const total = calcBuildingTotal(b);
  if (total <= 0) return '<p style="color:#888;font-size:9px">無建物面積資料</p>';

  const items: [string, number][] = [
    ['主建物', b.mainBuilding],
    ['陽台', b.balcony],
    ['雨遮', b.rainCover],
    ['公設', b.commonArea],
    ['地下室公設', b.basementCommon],
    ['其他(1)', b.other1],
    ['其他(2)', b.other2],
  ];

  const rows = items
    .map(
      ([label, val]) => `
    <tr>
      <td class="lbl">${label}</td>
      <td class="vw" style="text-align:right">${fmt(val)}</td>
      <td class="vw" style="text-align:right">${sqmToPing(val).toFixed(2)}</td>
      <td class="vw" style="text-align:right">${total > 0 ? ((val / total) * 100).toFixed(1) : '0.0'}%</td>
    </tr>`,
    )
    .join('');

  return `
  <table>
    <tr class="header-row">
      <th colspan="4">建物面積明細${b.buildingNumber ? `（建號：${escapeHtml(b.buildingNumber)}）` : ''}</th>
    </tr>
    <tr>
      <th style="width:100px">項目</th>
      <th>面積(㎡)</th>
      <th>面積(坪)</th>
      <th>佔比</th>
    </tr>
    ${rows}
    <tr class="total-row">
      <td style="text-align:center">合計</td>
      <td style="text-align:right">${fmt(total)}</td>
      <td style="text-align:right">${sqmToPing(total).toFixed(2)}</td>
      <td style="text-align:right">100.0%</td>
    </tr>
  </table>`;
}

export function buildAreaDetailHtml(report: InvestigationReport): string {
  return `
<div class="attachment-page">
  <h3>建物土地面積明細表</h3>
  ${buildBuildingTable(report.buildingAreas)}
  <div style="height:12px"></div>
  ${buildLandTable(report.landParcels)}
</div>`;
}
