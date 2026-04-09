// Extracted from ReportPreview.tsx — builds the main investigation report HTML for printing.
// This module is a pure function with no React dependency.
import type { InvestigationReport } from './types';
import { sqmToPing, calcShareArea, calcBuildingTotal, hasConditionStatementContent } from './types';
import { PREDEFINED_NOTES, STANDARD_CLAUSES } from './constants';
import { CONDITION_STATEMENT_META } from './condition-statement-meta';
import { SHARED_PRINT_CSS, escapeHtml } from './print-templates/print-css';
import type { PropertyItem } from '@/lib/types/properties';

const fullAddress = (r: InvestigationReport) =>
  [r.region, r.addressStreet, r.addressNumber].filter(Boolean).join(' ');

const tLabel = (r: InvestigationReport) => (r.transactionType === 'sale' ? '售' : '租');

function tdPair(
  label: string,
  value: string | number,
  opts?: { labelWidth?: string; valueColSpan?: number; bold?: boolean },
) {
  const v = typeof value === 'number' ? value : (value || '—');
  return `<td class="lbl" style="${opts?.labelWidth ? `width:${opts.labelWidth}` : ''}">${label}</td><td class="vw"${opts?.valueColSpan ? ` colspan="${opts.valueColSpan}"` : ''}${opts?.bold ? ' style="font-weight:bold"' : ''}>${v}</td>`;
}

/**
 * Build the complete investigation report HTML document (9 pages).
 * Returns a full `<!DOCTYPE html>` string ready for `window.open` + `window.print()`.
 */
export function buildReportHtml(report: InvestigationReport, property?: PropertyItem): string {
  const b = report.buildingAreas;
  const bldgTotal = calcBuildingTotal(b);
  const addr = fullAddress(report);
  const label = tLabel(report);
  const pingTotal = sqmToPing(bldgTotal);
  const landTotalShare = report.landParcels.reduce((s, p) => s + calcShareArea(p), 0);
  const activeLandParcels = report.landParcels.filter((p) => p.lotNumber || p.baseArea > 0);
  const selectedClauses = STANDARD_CLAUSES.filter((clause) =>
    report.selectedNotes.includes(clause.id),
  );
  const selectedNoteTexts = report.selectedNotes
    .map((id) => PREDEFINED_NOTES.find((n) => n.id === id)?.text)
    .filter(Boolean) as string[];

  const page1 = buildCoverPage(report, addr);
  const page2 = buildCaseTable(report, b, bldgTotal, pingTotal, addr, label, activeLandParcels, landTotalShare, property);
  const conditionPage = buildConditionPage(report, addr);
  const page3 = buildSignaturePage(report, addr, property);
  const page4 = buildBuildingPropertyPage(report, b, bldgTotal, pingTotal, addr);
  const page5 = buildLandPropertyPage(report, activeLandParcels, landTotalShare, addr);
  const page6 = buildTransactionPage(report, label);
  const page7 = buildFeesPage();
  const page8 = buildNotesPage(report, selectedClauses, selectedNoteTexts);
  const page9 = buildAttachmentRefPage(report);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>物件調查報告書 - ${report.caseName || '未命名'}</title>
<style>${SHARED_PRINT_CSS}</style>
</head><body>
${page1}${page2}${conditionPage}${page3}${page4}${page5}${page6}${page7}${page8}${page9}
</body></html>`;
}

/**
 * Build just the report body pages (without <html>/<head>/<body> wrapper).
 * Used by buildCombinedPrintHtml to embed the report inside a larger document.
 */
export function buildReportBodyPages(report: InvestigationReport, property?: PropertyItem): string {
  const b = report.buildingAreas;
  const bldgTotal = calcBuildingTotal(b);
  const addr = fullAddress(report);
  const label = tLabel(report);
  const pingTotal = sqmToPing(bldgTotal);
  const landTotalShare = report.landParcels.reduce((s, p) => s + calcShareArea(p), 0);
  const activeLandParcels = report.landParcels.filter((p) => p.lotNumber || p.baseArea > 0);
  const selectedClauses = STANDARD_CLAUSES.filter((clause) =>
    report.selectedNotes.includes(clause.id),
  );
  const selectedNoteTexts = report.selectedNotes
    .map((id) => PREDEFINED_NOTES.find((n) => n.id === id)?.text)
    .filter(Boolean) as string[];

  return [
    buildCoverPage(report, addr),
    buildCaseTable(report, b, bldgTotal, pingTotal, addr, label, activeLandParcels, landTotalShare, property),
    buildConditionPage(report, addr),
    buildSignaturePage(report, addr, property),
    buildBuildingPropertyPage(report, b, bldgTotal, pingTotal, addr),
    buildLandPropertyPage(report, activeLandParcels, landTotalShare, addr),
    buildTransactionPage(report, label),
    buildFeesPage(),
    buildNotesPage(report, selectedClauses, selectedNoteTexts),
    buildAttachmentRefPage(report),
  ].join('');
}

// ── Individual page builders ──────────────────────────────────────────────

function buildCoverPage(report: InvestigationReport, addr: string): string {
  return `
<div style="border:2px solid #333; padding: 48px 36px; min-height: 220mm; display:flex; flex-direction:column; justify-content:center; align-items:center;">
  <h2 style="font-size:28px; letter-spacing:6px;">不動產說明書</h2>
  <div class="cover-label" style="margin-top:40px;">物件名稱</div>
  <div class="cover-name">${report.caseName || '（未填）'}</div>
  <div class="cover-label" style="margin-top:24px;">地　址</div>
  <div class="cover-address">${addr || '（未填）'}</div>
</div>`;
}

function buildCaseTable(
  report: InvestigationReport,
  b: InvestigationReport['buildingAreas'],
  bldgTotal: number,
  pingTotal: number,
  addr: string,
  label: string,
  activeLandParcels: InvestigationReport['landParcels'][number][],
  landTotalShare: number,
  property?: PropertyItem,
): string {
  const areaRows = [
    ['主建物', b.mainBuilding],
    ['陽台', b.balcony],
    ['雨遮', b.rainCover],
    ['公設1', b.commonArea],
    ['公設2', b.basementCommon],
    ...(b.other1 > 0 ? [['其他', b.other1]] : []),
    ...(b.other2 > 0 ? [['其他', b.other2]] : []),
  ] as [string, number][];

  const landRows = activeLandParcels.length > 0
    ? activeLandParcels.map((p, i) => `
        <tr>
          <td class="lbl">地號${i + 1}</td>
          <td class="vw" colspan="2">${p.lotNumber || '—'}&nbsp;基地面積:&nbsp;${sqmToPing(p.baseArea)}坪</td>
        </tr>
        <tr>
          <td class="lbl">分區</td>
          <td class="vw">${p.zoningType || '—'}</td>
          <td class="vw">持分:&nbsp;${sqmToPing(calcShareArea(p))}坪</td>
        </tr>`).join('')
    : `<tr><td class="lbl">地號</td><td class="vw" colspan="2">—</td></tr>`;

  const parkingRows = report.parking.hasParking ? `
    <tr><td class="lbl">有無車位</td><td class="vw">有</td><td class="vw">單位價:&nbsp;${report.parking.parkingPrice ? report.parking.parkingPrice + '萬' : '—'}</td></tr>
    <tr><td class="lbl">可否另租</td><td class="vw">${report.parking.canRent || '—'}</td><td class="vw">租金:&nbsp;${report.parking.rentPrice ? report.parking.rentPrice + '元/月' : '無'}</td></tr>
    <tr><td class="lbl">車位編號</td><td class="vw">${report.parking.spotNumber || '無'}</td><td class="vw">停管費:&nbsp;${report.parking.managementFee ? report.parking.managementFee + '元/月' : '依規定'}</td></tr>
    <tr><td class="lbl">使用方式</td><td class="vw">${report.parking.usageType || '—'}</td><td class="vw">停車方式:&nbsp;${report.parking.parkingMethod || '—'}</td></tr>
    <tr><td class="lbl">獨立登記</td><td class="vw" colspan="2">${report.parking.hasIndependentRegistration || '—'}</td></tr>
  ` : `<tr><td class="lbl">有無車位</td><td class="vw" colspan="2">無</td></tr>`;

  const featuresHtml = report.features.filter(Boolean).length > 0
    ? report.features.filter(Boolean).map((f, i) => `${i + 1}. ${f}`).join('<br>')
    : '—';

  const floorPlanHtml = report.floorPlanPhotoUrl
    ? `<img src="${report.floorPlanPhotoUrl}" style="max-width:100%; max-height:120px; object-fit:contain;" alt="格局圖" />`
    : '<div style="width:100%;height:80px;display:flex;align-items:center;justify-content:center;color:#999;font-size:9px;border:1px dashed #ccc;">依標的現況為準</div>';

  const lat = property?.latitude;
  const lng = property?.longitude;
  const mapHtml = lat && lng
    ? `<div style="font-size:8px;color:#666;margin-top:2px;">${addr}</div>
       <div style="width:100%;height:80px;background:#e8f4fd;display:flex;align-items:center;justify-content:center;font-size:9px;color:#2563eb;">
         📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}
       </div>`
    : `<div style="width:100%;height:80px;display:flex;align-items:center;justify-content:center;color:#999;font-size:9px;border:1px dashed #ccc;">${addr || '（地址未填）'}</div>`;

  return `
<div class="page-break"></div>
<table>
  <thead>
    <tr class="header-row">
      <th colspan="2" style="text-align:left;">${report.agency || '（製作單位）'}　☎ ${report.agentName || ''}</th>
      <th colspan="3">物件個案調查表</th>
      <th style="width:32px;">${label}</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="lbl">案&nbsp;名</td>
      <td class="vw" style="font-weight:bold;">${report.caseName || '—'}</td>
      <td class="lbl">坪數</td>
      <td class="vw" style="font-weight:bold;">${pingTotal}</td>
      <td class="lbl">售&nbsp;價</td>
      <td class="vw" style="font-weight:bold;">${report.totalPrice || '—'}萬</td>
    </tr>
    <tr>
      <td class="lbl">地址</td>
      <td class="vw" colspan="5">${addr || '—'}</td>
    </tr>
    <tr>
      <td colspan="3" style="vertical-align:top; padding:0;">
        <table style="width:100%; border:none;">
          <tr><td class="lbl" style="border-top:none;border-left:none;">社區/大樓名稱</td><td class="vw" style="border-top:none;border-right:none;">${report.buildingName || '—'}</td></tr>
          <tr><td class="lbl" style="border-left:none;">建築完成日</td><td class="vw" style="border-right:none;">${report.completionDate || '—'}&nbsp;&nbsp;屋齡:&nbsp;${report.buildingAge || '—'}年</td></tr>
          <tr><td class="lbl" style="border-left:none;">樓層</td><td class="vw" style="border-right:none;">${report.floorInfo || '—'}</td></tr>
          <tr><td class="lbl" style="border-left:none;">格局</td><td class="vw" style="border-right:none;">${report.layout || '—'}</td></tr>
          <tr><td class="lbl" style="border-left:none;">座向</td><td class="vw" style="border-right:none;">${report.orientation || '—'}</td></tr>
          <tr><td class="lbl" style="border-left:none;">建管費</td><td class="vw" style="border-right:none;">${report.hasManagementFee ? `有&nbsp;${report.managementFeeAmount}元/月` : '無'}</td></tr>
          <tr><td class="lbl" style="border-left:none;">主要建材</td><td class="vw" style="border-right:none;">${report.mainMaterial || '—'}</td></tr>
          <tr><td class="lbl" style="border-left:none;">同層戶數</td><td class="vw" style="border-right:none;">${report.unitsPerFloor || '—'}戶</td></tr>
          <tr><td class="lbl" style="border-left:none;">邊間</td><td class="vw" style="border-right:none;">${report.isCornerUnit}&nbsp;&nbsp;中庭:&nbsp;${report.hasCourt}</td></tr>
          <tr><td class="lbl" style="border-left:none;">電梯數</td><td class="vw" style="border-right:none;">${report.elevatorCount || '—'}</td></tr>
          <tr><td class="lbl" style="border-left:none;">瓦斯</td><td class="vw" style="border-right:none;">${report.gasType || '—'}</td></tr>
          <tr><td class="lbl" style="border-left:none;">增建部份</td><td class="vw" style="border-right:none;">${report.additions || '無'}</td></tr>
          <tr><td class="lbl" style="border-left:none;">警衛管理</td><td class="vw" style="border-right:none;">${report.security || '—'}</td></tr>
          <tr><td class="lbl" style="border-left:none;">學區</td><td class="vw" style="border-right:none;">${report.schoolDistrict || '—'}</td></tr>
          <tr><td class="lbl" style="border-left:none;border-bottom:none;">看屋方式</td><td class="vw" style="border-right:none;border-bottom:none;">${report.viewingMethod || '—'}</td></tr>
        </table>
      </td>
      <td colspan="3" style="vertical-align:top; padding:0;">
        <table style="width:100%; border:none;">
          <tr><th colspan="3" style="border-top:none;font-size:9px;">建物</th></tr>
          ${areaRows.map(([name, area]) => `
            <tr>
              <td class="lbl" style="border-left:none;">${name}</td>
              <td class="vw" style="text-align:right;">${sqmToPing(area)}</td>
              <td style="width:20px;border-right:none;">坪</td>
            </tr>`).join('')}
          <tr class="total-row">
            <td class="lbl" style="border-left:none;">合計</td>
            <td class="vw" style="text-align:right;font-weight:bold;">${pingTotal}</td>
            <td style="width:20px;border-right:none;">坪</td>
          </tr>
          <tr><th colspan="3" style="border-left:none;font-size:9px;">土地</th></tr>
          ${landRows}
          <tr class="total-row">
            <td class="lbl" style="border-left:none;">持分合計</td>
            <td class="vw" colspan="2" style="border-right:none;">${sqmToPing(landTotalShare)}&nbsp;坪</td>
          </tr>
          <tr><th colspan="3" style="border-left:none;font-size:9px;">車位</th></tr>
          ${parkingRows}
        </table>
      </td>
    </tr>
    <tr>
      <td colspan="3" style="vertical-align:top;">
        <div style="font-weight:600;font-size:9px;margin-bottom:3px;">特色</div>
        <div style="font-size:9px; line-height:1.7;">${featuresHtml}</div>
      </td>
      <td style="vertical-align:top;">
        <div style="font-weight:600;font-size:9px;margin-bottom:2px;">位置圖</div>
        ${mapHtml}
      </td>
      <td colspan="2" style="vertical-align:top;">
        <div style="font-weight:600;font-size:9px;margin-bottom:2px;">格局圖</div>
        ${floorPlanHtml}
      </td>
    </tr>
  </tbody>
</table>`;
}

function buildConditionPage(report: InvestigationReport, addr: string): string {
  const cs = report.conditionStatement;
  if (!hasConditionStatementContent(cs)) return '';

  const rows = CONDITION_STATEMENT_META.map((row) =>
    `<tr><td class="lbl" style="width:30%;vertical-align:top;">${escapeHtml(row.title)}</td><td class="vw" style="white-space:pre-wrap;">${
      cs[row.key].trim() ? escapeHtml(cs[row.key].trim()) : '—'
    }</td></tr>`,
  ).join('');

  return `
<div class="page-break"></div>
<h2 style="font-size:16px;text-align:center;letter-spacing:3px;margin-bottom:4px;">屋況說明書</h2>
<p style="font-size:8.5px;color:#666;text-align:center;margin:0 0 14px;">${escapeHtml(addr)}　·　案名：${escapeHtml(report.caseName || '—')}</p>
<table>${rows}</table>
<p style="font-size:8px;color:#666;margin-top:12px;line-height:1.5;">※ 本說明係依賣方／屋主揭露及現場看屋情形填寫，買方仍應自行詳查；欄位為「—」不代表無該等情事。</p>`;
}

function buildSignaturePage(report: InvestigationReport, addr: string, property?: PropertyItem): string {
  const hasTranscript = !!(property?.hasTranscript || property?.buildingTranscript || property?.landTranscript);
  const hasTitleDoc = !!property?.hasTitleDoc;
  const hasIndependentParking = !!property?.hasIndependentParking;
  const hasParkingBuildingTranscript = !!property?.parkingBuildingTranscript;
  const hasParkingLandTranscript = !!property?.parkingLandTranscript;
  const cm = (checked: boolean) => `<span style="font-size:12px;">${checked ? '■' : '□'}</span>`;

  return `
<div class="page-break"></div>
<h2 style="font-size:18px;">不動產說明書</h2>
<div class="row"><span class="lbl">一、銷售案名：</span><span>${report.caseName || '—'}</span></div>
<div class="row"><span class="lbl">二、建物門牌：</span><span>${addr || '—'}</span></div>
<div class="row"><span class="lbl">三、製作單位：</span><span>${report.agency || '—'}</span></div>
<p style="font-size:9.5px; margin:8px 0 6px;">四、本說明書係依台北市地政事務所核發之謄本為準，內容及附件如下：</p>
<table>
  <thead><tr><th colspan="2">主要內容</th><th colspan="2">附件內容</th><th colspan="2">其他</th></tr></thead>
  <tbody>
    <tr><td>${cm(true)} 產權調查篇</td><td>${cm(hasTitleDoc)} 土地權狀影本</td><td>${cm(false)} 其他：</td><td></td></tr>
    <tr><td>${cm(true)} 物件現況調查篇</td><td>${cm(hasTitleDoc)} 建物權狀影本</td><td>${cm(false)} 地籍圖</td><td>${cm(false)} 海砂檢測報告</td></tr>
    <tr><td>${cm(false)} 位置與格局圖</td><td>${cm(hasTranscript)} 土地謄本</td><td>${cm(false)} 建物平面圖</td><td>${cm(false)} 輻射檢測報告</td></tr>
    <tr><td>${cm(false)} 圖片說明書</td><td>${cm(hasTranscript)} 建物謄本</td><td>${cm(false)} 公寓大廈使用手冊</td><td>${cm(false)} 住戶規約</td></tr>
    ${hasIndependentParking ? `<tr><td></td><td>${cm(hasParkingBuildingTranscript)} 車位建物謄本</td><td>${cm(hasParkingLandTranscript)} 車位土地謄本</td><td></td></tr>` : ''}
    <tr><td></td><td>${cm(false)} 都市使用分區證明</td><td>${cm(false)} 分管協議</td><td>${cm(false)} 單位平面圖</td></tr>
    <tr><td></td><td>${cm(false)} 建築改良物使用執照</td><td>${cm(false)} 都市計劃說明書</td><td></td></tr>
  </tbody>
</table>
<div style="margin-top:20px;">
  <div style="display:flex;gap:8px;align-items:flex-end;margin-bottom:10px;">
    <span style="width:120px;font-size:9.5px;">所有權人(賣方)：</span>
    <span style="flex:1;border-bottom:1px solid #333;height:20px;display:inline-block;"></span>
    <span style="font-size:9.5px;margin-left:6px;">（簽章）住址：</span>
    <span style="flex:2;border-bottom:1px solid #333;height:20px;display:inline-block;"></span>
  </div>
  <div style="display:flex;gap:8px;align-items:flex-end;margin-bottom:10px;">
    <span style="width:120px;font-size:9.5px;">買　　　方：</span>
    <span style="flex:1;border-bottom:1px solid #333;height:20px;display:inline-block;"></span>
    <span style="font-size:9.5px;margin-left:6px;">（簽章）住址：</span>
    <span style="flex:2;border-bottom:1px solid #333;height:20px;display:inline-block;"></span>
  </div>
  <div style="display:flex;gap:8px;align-items:flex-end;margin-bottom:10px;">
    <span style="width:120px;font-size:9.5px;">經　紀　人：</span>
    <span style="flex:1;border-bottom:1px solid #333;height:20px;display:inline-block;"></span>
    <span style="font-size:9.5px;margin-left:6px;">營業員：</span>
    <span style="flex:1;border-bottom:1px solid #333;height:20px;display:inline-block;"></span>
  </div>
</div>
<p style="font-size:9px;margin-top:12px;">買方客戶已詳閱本不動產說明書，並確實瞭解其內容無誤</p>
<table style="margin-top:6px;">
  <thead><tr><th>日期</th><th>買方客戶簽名</th><th>經紀人員</th></tr></thead>
  <tbody>${['','',''].map(() => '<tr><td style="height:18px;"></td><td></td><td></td></tr>').join('')}</tbody>
</table>`;
}

function buildBuildingPropertyPage(
  report: InvestigationReport,
  b: InvestigationReport['buildingAreas'],
  bldgTotal: number,
  pingTotal: number,
  addr: string,
): string {
  const areaTableRows = [
    ['主建物', b.mainBuilding],
    ['陽台', b.balcony],
    ['雨遮', b.rainCover],
    ['公設1', b.commonArea],
    ['公設2', b.basementCommon],
    ...(b.other1 > 0 ? [['其他', b.other1]] : []),
    ...(b.other2 > 0 ? [['其他', b.other2]] : []),
  ] as [string, number][];

  return `
<div class="page-break"></div>
<h2 style="font-size:16px;">產權調查篇（建物）</h2>
<h3>二、建物標示</h3>
<table><tr><td class="lbl" style="width:60px;">地　址</td><td class="vw" colspan="3">${addr}</td></tr></table>
<table style="margin-top:8px;">
  <thead>
    <tr><th>建號</th><th colspan="3">${b.buildingNumber || '—'}</th></tr>
    <tr><th>項目</th><th>面積（㎡）</th><th>約</th><th>面積（坪）</th></tr>
  </thead>
  <tbody>
    ${areaTableRows.map(([name, area]) => `
      <tr>
        <td class="lbl">${name}</td>
        <td class="vw" style="text-align:right;">${(area).toFixed(2)}</td>
        <td style="text-align:center;">平方公尺，約</td>
        <td class="vw" style="text-align:right;">${sqmToPing(area)}</td>
      </tr>`).join('')}
    <tr class="total-row">
      <td>合計</td>
      <td style="text-align:right;">${bldgTotal.toFixed(2)}</td>
      <td style="text-align:center;">平方公尺，約</td>
      <td style="text-align:right;">${pingTotal}</td>
    </tr>
  </tbody>
</table>
<h3>車位</h3>
<table>
  <tbody>
    <tr>${tdPair('有無車位', report.parking.hasParking ? '有' : '無')}${tdPair('單位價', report.parking.parkingPrice ? report.parking.parkingPrice + '萬' : '—')}</tr>
    <tr>${tdPair('可否另租', report.parking.canRent || '—')}${tdPair('租金約', report.parking.rentPrice ? report.parking.rentPrice + '元/月' : '無')}</tr>
    <tr>${tdPair('車位編號', report.parking.spotNumber || '無')}${tdPair('停車管理費', report.parking.managementFee ? report.parking.managementFee + '元/月' : '依規定')}</tr>
    <tr>${tdPair('使用方式', report.parking.usageType || '—')}${tdPair('停車方式', report.parking.parkingMethod || '—')}</tr>
    <tr><td class="lbl" colspan="2">車位是否辦理獨立區分所有建物登記</td><td class="vw" colspan="2">${report.parking.hasIndependentRegistration || '—'}</td></tr>
  </tbody>
</table>
<h3>他項權利</h3>
<table>
  <thead><tr><th>權利種類</th><th>順位</th><th>內容</th><th>權利人</th></tr></thead>
  <tbody>${[1,2,3].map(() => '<tr><td colspan="4" style="font-size:8.5px;color:#666;">（依市政府 地政機關 登記謄本為準）</td></tr>').join('')}</tbody>
</table>
<table style="margin-top:4px;">
  <tr><td class="lbl" style="width:60px;">限制登記情形</td><td class="vw" colspan="3">${report.restrictionRegistration || '無'}</td></tr>
</table>`;
}

function buildLandPropertyPage(
  report: InvestigationReport,
  activeLandParcels: InvestigationReport['landParcels'][number][],
  landTotalShare: number,
  addr: string,
): string {
  return `
<div class="page-break"></div>
<h2 style="font-size:16px;">產權調查篇（土地）</h2>
<h3>一、土地標示</h3>
${activeLandParcels.length === 0 ? '<p>（尚未填入土地資料）</p>' : activeLandParcels.map((p, i) => `
<div style="${i > 0 ? 'margin-top:12px;border-top:1px dashed #ccc;padding-top:8px;' : ''}">
  <table>
    <tr>${tdPair('座落', `${report.region} ${p.lotNumber}`)}</tr>
    <tr>${tdPair('基地面積', `${p.baseArea.toFixed(2)} ㎡，約 ${sqmToPing(p.baseArea)} 坪`)}</tr>
    <tr>${tdPair('權利範圍', `${p.ownershipDenom} 分之 ${p.ownershipNumer}`)}</tr>
    <tr>${tdPair('持分面積', `${calcShareArea(p).toFixed(4)} ㎡，約 ${sqmToPing(calcShareArea(p))} 坪`)}</tr>
    <tr>${tdPair('使用分區', p.zoningType || '—')}${tdPair('建蔽率', p.buildingCoverage || '—')}</tr>
    <tr>${tdPair('容積率', p.floorAreaRatio || '—')}</tr>
  </table>
</div>`).join('')}
<table style="margin-top:8px;">
  <tr class="total-row">
    <td class="lbl">土地持分合計</td>
    <td class="vw">${landTotalShare.toFixed(4)} ㎡，約 ${sqmToPing(landTotalShare)} 坪</td>
  </tr>
</table>
<table style="margin-top:4px;">
  <tr><td class="lbl" style="width:60px;">限制登記情形</td><td class="vw">${report.restrictionRegistration || '無'}</td></tr>
</table>`;
}

function buildTransactionPage(report: InvestigationReport, label: string): string {
  const ps = report.paymentSchedule;
  const priceLabel = report.transactionType === 'sale' ? '售價' : '租金';
  return `
<div class="page-break"></div>
<h3>其他交易條件</h3>
<table>
  <tr>${tdPair('交易種類', label)}${tdPair('委託總價金', `${report.totalPrice} 萬`)}</tr>
  <tr>${tdPair(priceLabel, `${report.totalPrice} 萬`)}</tr>
</table>
<h3 style="margin-top:12px;">付款方式</h3>
<table>
  <thead><tr><th>期別</th><th>比例</th><th>金額（萬）</th></tr></thead>
  <tbody>
    <tr><td>第一期款（簽約款）</td><td style="text-align:center;">${(ps.firstRatio * 100).toFixed(0)}%</td><td style="text-align:right;">${(report.totalPrice * ps.firstRatio).toFixed(1)}</td></tr>
    <tr><td>第二期款（備證用印款）</td><td style="text-align:center;">${(ps.secondRatio * 100).toFixed(0)}%</td><td style="text-align:right;">${(report.totalPrice * ps.secondRatio).toFixed(1)}</td></tr>
    <tr><td>第三期款（完稅款）</td><td style="text-align:center;">${(ps.thirdRatio * 100).toFixed(0)}%</td><td style="text-align:right;">${(report.totalPrice * ps.thirdRatio).toFixed(1)}</td></tr>
    <tr><td>第四期款（交屋款，含貸款）</td><td style="text-align:center;">${(ps.fourthRatio * 100).toFixed(0)}%</td><td style="text-align:right;">${(report.totalPrice * ps.fourthRatio).toFixed(1)}</td></tr>
  </tbody>
</table>
<table style="margin-top:8px;">
  <tr>${tdPair('賣方附贈設備', report.sellerEquipment || '無。依固定物交屋')}</tr>
  <tr>${tdPair('交屋情形', report.deliveryCondition || '—')}</tr>
  <tr>${tdPair('主要用途', report.mainPurpose || '—')}</tr>
  <tr>${tdPair('交通條件', report.transportation || '—')}</tr>
</table>`;
}

function buildFeesPage(): string {
  return `
<div class="page-break"></div>
<h3>相關費用說明</h3>
<p style="font-size:9.5px;font-weight:600;margin:8px 0 4px;">【賣方支付項目】</p>
<ol class="note-text">
  <li>土地增值稅：依稅捐機關核定</li>
  <li>工程受益費：簽約日前已開徵者由賣方負擔</li>
  <li>地價稅：交屋日依實際使用比例分算</li>
  <li>房屋稅：交屋日依實際使用比例分算</li>
  <li>水、電、瓦斯費、管理費等雜項費用（依實際使用比例分算）</li>
  <li>抵押權塗銷代書費</li>
  <li>財產交易所得稅（併入綜合所得申報）</li>
  <li>仲介服務費：按實際成交價格的百分之四</li>
</ol>
<p style="font-size:9.5px;font-weight:600;margin:10px 0 4px;">【買方支付項目】</p>
<ol class="note-text">
  <li>契稅：按核定契價 × 6%</li>
  <li>印花稅：按核定契價 + (土地公告現值 × 面積 × 持份) × 0.1%</li>
  <li>過戶代書費：約新台幣 18,000 元</li>
  <li>地價稅：交屋日依實際使用比例分算</li>
  <li>房屋稅：交屋日依實際使用比例分算</li>
  <li>水、電、瓦斯費、管理費等雜項費用（依實際使用比例分算）</li>
  <li>工程受益費：視公告狀況由雙方分擔</li>
  <li>登記規費：依核定</li>
  <li>仲介服務費：按實際成交價格的百分之二</li>
</ol>
<p style="font-size:8.5px;color:#666;margin-top:8px;">附註：以上買賣雙方支付項目為一般原則，若雙方另以契約約定從其約定。</p>`;
}

function buildNotesPage(
  report: InvestigationReport,
  selectedClauses: typeof STANDARD_CLAUSES,
  selectedNoteTexts: string[],
): string {
  const clausesHtml = selectedClauses.map(
    (c) => `<li class="note-text" style="margin-bottom:5px;"><strong>${c.number}、</strong>${c.text}</li>`,
  ).join('');

  const notesHtml = selectedNoteTexts.length > 0
    ? `<ul style="list-style:disc;margin:6px 0 0 12px;">${selectedNoteTexts.map((t) => `<li class="note-text">${t}</li>`).join('')}</ul>`
    : '';

  const customNoteHtml = report.customNote?.trim()
    ? `<p class="note-text" style="margin-top:8px;">＊${report.customNote}</p>`
    : '';

  return `
<div class="page-break"></div>
<h3>注意事項</h3>
${selectedClauses.length > 0 ? `<ol>${clausesHtml}</ol>` : ''}
${notesHtml}
${customNoteHtml}`;
}

function buildAttachmentRefPage(report: InvestigationReport): string {
  const atts = report.reportAttachments ?? [];
  const supp = report.reportAttachmentSupplement?.trim() ?? '';
  if (atts.length === 0 && !supp) return '';

  return `
<div class="page-break"></div>
<h3>報告附加參考</h3>
<p style="font-size:8.5px;color:#666;margin:4px 0 8px;">以下為製作單位於本報告勾選之參考文件或照片名稱；實體檔案請依物件檔案庫為準。</p>
${atts.length > 0
  ? `<ol class="note-text" style="margin:6px 0 0 16px;">${atts.map(
      (a) => `<li style="margin-bottom:4px;">${escapeHtml(a.label)} <span style="color:#666;font-size:8.5px;">（${a.kind === 'document' ? '文件' : '照片'}）</span></li>`,
    ).join('')}</ol>`
  : ''}
${supp ? `<p class="note-text" style="margin-top:12px;white-space:pre-wrap;">${escapeHtml(supp)}</p>` : ''}`;
}
