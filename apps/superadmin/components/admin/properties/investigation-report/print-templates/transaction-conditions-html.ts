// Print template: transaction conditions (payment schedule, equipment, delivery)
import { escapeHtml } from './print-css';
import type { InvestigationReport } from '../types';

function pct(n: number): string {
  return n > 0 ? `${(n * 100).toFixed(0)}%` : '—';
}

export function buildTransactionConditionsHtml(
  report: InvestigationReport,
): string {
  const ps = report.paymentSchedule;
  const isSale = report.transactionType === 'sale';

  return `
<div class="attachment-page">
  <h3>交易條件</h3>
  <table>
    <tr class="header-row">
      <th colspan="2">付款比例</th>
    </tr>
    <tr>
      <td class="lbl" style="width:140px">簽約款（第一期）</td>
      <td class="vw">${pct(ps.firstRatio)}</td>
    </tr>
    <tr>
      <td class="lbl">備證款（第二期）</td>
      <td class="vw">${pct(ps.secondRatio)}</td>
    </tr>
    <tr>
      <td class="lbl">完稅款（第三期）</td>
      <td class="vw">${pct(ps.thirdRatio)}</td>
    </tr>
    <tr>
      <td class="lbl">交屋款（第四期）</td>
      <td class="vw">${pct(ps.fourthRatio)}</td>
    </tr>
    <tr class="total-row">
      <td>合計</td>
      <td>${pct(ps.firstRatio + ps.secondRatio + ps.thirdRatio + ps.fourthRatio)}</td>
    </tr>
  </table>

  <table style="margin-top:12px">
    <tr class="header-row">
      <th colspan="2">其他交易條件</th>
    </tr>
    <tr>
      <td class="lbl" style="width:140px">總價</td>
      <td class="vw">${report.totalPrice ? `NT$ ${report.totalPrice.toLocaleString()} ${isSale ? '萬' : '元/月'}` : '—'}</td>
    </tr>
    <tr>
      <td class="lbl">附贈設備</td>
      <td class="vw">${escapeHtml(report.sellerEquipment) || '—'}</td>
    </tr>
    <tr>
      <td class="lbl">交屋條件</td>
      <td class="vw">${escapeHtml(report.deliveryCondition) || '—'}</td>
    </tr>
    <tr>
      <td class="lbl">帶看方式</td>
      <td class="vw">${escapeHtml(report.viewingMethod) || '—'}</td>
    </tr>
  </table>

  ${report.parking.hasParking ? `
  <table style="margin-top:12px">
    <tr class="header-row">
      <th colspan="2">車位資訊</th>
    </tr>
    <tr>
      <td class="lbl" style="width:140px">車位編號</td>
      <td class="vw">${escapeHtml(report.parking.spotNumber) || '—'}</td>
    </tr>
    <tr>
      <td class="lbl">車位價格</td>
      <td class="vw">${escapeHtml(report.parking.parkingPrice) || '—'}</td>
    </tr>
    <tr>
      <td class="lbl">停車方式</td>
      <td class="vw">${escapeHtml(report.parking.parkingMethod) || '—'}</td>
    </tr>
    <tr>
      <td class="lbl">使用類型</td>
      <td class="vw">${escapeHtml(report.parking.usageType) || '—'}</td>
    </tr>
    <tr>
      <td class="lbl">管理費</td>
      <td class="vw">${escapeHtml(report.parking.managementFee) || '—'}</td>
    </tr>
    <tr>
      <td class="lbl">可否出租</td>
      <td class="vw">${escapeHtml(report.parking.canRent) || '—'}</td>
    </tr>
    <tr>
      <td class="lbl">獨立產權</td>
      <td class="vw">${escapeHtml(report.parking.hasIndependentRegistration) || '—'}</td>
    </tr>
  </table>` : ''}
</div>`;
}
