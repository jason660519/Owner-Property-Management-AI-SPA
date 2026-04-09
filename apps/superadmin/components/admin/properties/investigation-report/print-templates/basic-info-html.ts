// Print template: property basic info page
import { escapeHtml } from './print-css';
import type { InvestigationReport } from '../types';
import type { PropertyItem } from '@/lib/types/properties';

function row(label: string, value: string | number | null | undefined): string {
  const v = value != null && value !== '' && value !== 0 ? escapeHtml(String(value)) : '—';
  return `<tr><td class="lbl" style="width:120px">${label}</td><td class="vw">${v}</td></tr>`;
}

export function buildBasicInfoHtml(
  report: InvestigationReport,
  property?: PropertyItem,
): string {
  const addr = [report.region, report.addressStreet, report.addressNumber]
    .filter(Boolean)
    .join(' ');
  const typeLabel = report.transactionType === 'sale' ? '出售' : '出租';
  const priceLabel = report.transactionType === 'sale' ? '售價' : '月租金';
  const priceValue = report.totalPrice
    ? `NT$ ${report.totalPrice.toLocaleString()} ${report.transactionType === 'sale' ? '萬' : '元'}`
    : '—';

  return `
<div class="attachment-page">
  <h3>物件基本資訊</h3>
  <table>
    ${row('物件名稱', report.caseName)}
    ${row('交易類型', typeLabel)}
    ${row('地　　址', addr)}
    ${row(priceLabel, priceValue)}
    ${row('物件類型', property?.propertyType)}
    ${row('格　　局', report.layout)}
    ${row('總面積', property?.area ? `${property.area} 坪` : null)}
    ${row('社區名稱', report.buildingName)}
    ${row('樓　　層', report.floorInfo)}
    ${row('座　　向', report.orientation)}
    ${row('建築完成日', report.completionDate)}
    ${row('屋　　齡', report.buildingAge ? `${report.buildingAge} 年` : null)}
    ${row('主要建材', report.mainMaterial)}
    ${row('同層戶數', report.unitsPerFloor ? `${report.unitsPerFloor} 戶` : null)}
    ${row('邊間', report.isCornerUnit)}
    ${row('中　　庭', report.hasCourt)}
    ${row('電　　梯', report.elevatorCount ? `${report.elevatorCount} 部` : null)}
    ${row('管 理 費', report.hasManagementFee ? `${report.managementFeeAmount} 元/月` : '無')}
    ${row('保　　全', report.security)}
    ${row('學　　區', report.schoolDistrict)}
    ${row('瓦　　斯', report.gasType)}
    ${row('交通資訊', report.transportation)}
    ${row('冷　　氣', report.airConditioning)}
    ${row('增　　建', report.additions)}
  </table>
  ${report.features.some(Boolean) ? `
  <h3 style="margin-top:12px">物件特色</h3>
  <ol>
    ${report.features.filter(Boolean).map((f) => `<li>${escapeHtml(f)}</li>`).join('')}
  </ol>` : ''}
</div>`;
}
