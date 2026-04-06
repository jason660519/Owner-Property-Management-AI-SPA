// filepath: apps/superadmin/components/admin/properties/investigation-report/ReportPreview.tsx
// 物件調查報告書 — 預覽 + 列印 (忠實還原住商 Excel 格式)
'use client';

import { useCallback, useState } from 'react';
import { Printer, MapPin, Loader2 } from 'lucide-react';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { InvestigationReport } from './types';
import { sqmToPing, calcShareArea, calcBuildingTotal, hasConditionStatementContent } from './types';
import { PREDEFINED_NOTES, STANDARD_CLAUSES } from './constants';
import { GOV_CONDITION_ITEMS, renderNoteWithChecks } from './condition-statement-meta';
import type { PropertyItem } from '@/lib/types/properties';

interface Props {
  report: InvestigationReport;
  property?: PropertyItem;
}

const fullAddress = (r: InvestigationReport) =>
  [r.region, r.addressStreet, r.addressNumber].filter(Boolean).join(' ');

const tLabel = (r: InvestigationReport) => (r.transactionType === 'sale' ? '售' : '租');

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pdfSafeText(value: string | number | null | undefined): string {
  if (value == null) return '';
  return String(value).replace(/[\u0000-\u001F\u007F]/g, '');
}

function pdfLatinSafeText(value: string | number | null | undefined): string {
  if (value == null) return '';
  return String(value).replace(/[^\x20-\x7E]/g, '');
}

function wrapByCharLimit(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const cleaned = text.trim();
  if (!cleaned) return [''];
  const lines: string[] = [];
  let cursor = 0;
  while (cursor < cleaned.length && lines.length < maxLines) {
    lines.push(cleaned.slice(cursor, cursor + maxCharsPerLine));
    cursor += maxCharsPerLine;
  }
  if (cursor < cleaned.length && lines.length > 0) {
    const last = lines.length - 1;
    lines[last] = `${lines[last].slice(0, Math.max(0, maxCharsPerLine - 1))}…`;
  }
  return lines;
}

function sanitizeFileNameSegment(input: string): string {
  return input
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

// ── Print CSS ──────────────────────────────────────────────────────────────
const PRINT_CSS = `
@page { size: A4; margin: 12mm; }
body {
  font-family: "PingFang TC","Microsoft JhengHei","Noto Sans TC",sans-serif;
  font-size: 10px; color: #111; line-height: 1.5;
}
h2 { font-size: 22px; text-align: center; margin: 40px 0 12px; font-weight: bold; }
h3 { font-size: 13px; border-bottom: 1.5px solid #333; padding-bottom: 4px; margin: 18px 0 8px; font-weight: bold; }
.cover-address { font-size: 16px; font-weight: bold; text-align: center; margin: 8px 0; }
.cover-name { font-size: 20px; font-weight: bold; text-align: center; margin: 8px 0 32px; }
.cover-label { font-size: 11px; color: #555; text-align: center; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #555; padding: 2px 4px; font-size: 9.5px; vertical-align: top; }
th { background: #f0f0f0; font-weight: 600; text-align: center; }
.lbl { color: #444; font-weight: 600; white-space: nowrap; }
.vw { color: #000; }
.header-row th { font-size: 13px; padding: 4px 6px; }
.section-cell { writing-mode: vertical-rl; text-orientation: mixed; font-weight: bold;
  text-align: center; background: #e8e8e8; width: 16px; padding: 2px; font-size: 9px; }
.total-row td { font-weight: bold; background: #fafafa; }
.page-break { page-break-before: always; }
.row { display: flex; gap: 6px; padding: 1px 0; }
.row .lbl { width: 90px; flex-shrink: 0; color: #555; }
ol { margin: 4px 0 4px 16px; padding: 0; }
ol li { margin-bottom: 2px; }
.note-text { font-size: 9px; line-height: 1.6; }
`;

// ── Helpers ────────────────────────────────────────────────────────────────

function tdPair(
  label: string,
  value: string | number,
  opts?: { labelWidth?: string; valueColSpan?: number; bold?: boolean },
) {
  const v = typeof value === 'number' ? value : (value || '—');
  return `<td class="lbl" style="${opts?.labelWidth ? `width:${opts.labelWidth}` : ''}">${label}</td><td class="vw"${opts?.valueColSpan ? ` colspan="${opts.valueColSpan}"` : ''}${opts?.bold ? ' style="font-weight:bold"' : ''}>${v}</td>`;
}

function buildHtml(report: InvestigationReport, property?: PropertyItem): string {
  const b = report.buildingAreas;
  const bldgTotal = calcBuildingTotal(b);
  const addr = fullAddress(report);
  const label = tLabel(report);
  const pingTotal = sqmToPing(bldgTotal);
  const landTotalShare = report.landParcels.reduce((s, p) => s + calcShareArea(p), 0);
  const activeLandParcels = report.landParcels.filter((p) => p.lotNumber || p.baseArea > 0);
  const selectedNoteTexts = report.selectedNotes
    .map((id) => PREDEFINED_NOTES.find((n) => n.id === id)?.text)
    .filter(Boolean) as string[];
  const selectedClauses = STANDARD_CLAUSES.filter((clause) =>
    report.selectedNotes.includes(clause.id),
  );

  // ── Page 1: Cover ──
  const page1 = `
<div style="border:2px solid #333; padding: 48px 36px; min-height: 220mm; display:flex; flex-direction:column; justify-content:center; align-items:center;">
  <h2 style="font-size:28px; letter-spacing:6px;">不動產說明書</h2>
  <div class="cover-label" style="margin-top:40px;">物件名稱</div>
  <div class="cover-name">${report.caseName || '（未填）'}</div>
  <div class="cover-label" style="margin-top:24px;">地　址</div>
  <div class="cover-address">${addr || '（未填）'}</div>
</div>`;

  // ── Page 2: 物件個案調查表 (Excel-like two-column table) ──
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

  // Google Maps static map (if lat/lng available)
  const lat = property?.latitude;
  const lng = property?.longitude;
  const mapHtml = lat && lng
    ? `<div style="font-size:8px;color:#666;margin-top:2px;">${addr}</div>
       <div style="width:100%;height:80px;background:#e8f4fd;display:flex;align-items:center;justify-content:center;font-size:9px;color:#2563eb;">
         📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}
       </div>`
    : `<div style="width:100%;height:80px;display:flex;align-items:center;justify-content:center;color:#999;font-size:9px;border:1px dashed #ccc;">${addr || '（地址未填）'}</div>`;

  const page2 = `
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
      <!-- Left: Building info | Right: Areas, Land, Parking -->
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
        <!-- Building areas -->
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
          <!-- Land parcels -->
          <tr><th colspan="3" style="border-left:none;font-size:9px;">土地</th></tr>
          ${landRows}
          <tr class="total-row">
            <td class="lbl" style="border-left:none;">持分合計</td>
            <td class="vw" colspan="2" style="border-right:none;">${sqmToPing(landTotalShare)}&nbsp;坪</td>
          </tr>
          <!-- Parking -->
          <tr><th colspan="3" style="border-left:none;font-size:9px;">車位</th></tr>
          ${parkingRows}
        </table>
      </td>
    </tr>
    <!-- Features + Maps row -->
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

  // ── 屋況說明書（至少填一欄才輸出此頁） ──
  const cs = report.conditionStatement;
  const hasCond = hasConditionStatementContent(cs);
  const conditionPrintRows = GOV_CONDITION_ITEMS.map((item, idx) => {
    const row = cs.govItems.find((r) => r.itemNo === idx + 1);
    const templateRendered = renderNoteWithChecks(item.noteHint, row?.checkedBoxes ?? []);
    const customNote = row?.note?.trim() ?? '';
    return {
      itemNo: idx + 1,
      title: item.title,
      answer: row?.answer ?? '',
      note: [templateRendered, customNote].filter(Boolean).join('\n'),
    };
  });
  const firstPageRows = conditionPrintRows.slice(0, 18);
  const secondPageRows = conditionPrintRows.slice(18);
  const renderGovRows = (rows: typeof conditionPrintRows) =>
    rows
      .map(
        (row) => `
    <tr>
      <td class="vw" style="text-align:center;width:34px;">${row.itemNo}</td>
      <td class="vw">${escapeHtml(row.title)}</td>
      <td class="vw" style="text-align:center;width:30px;">${row.answer === 'yes' ? '■' : '□'}</td>
      <td class="vw" style="text-align:center;width:30px;">${row.answer === 'no' ? '■' : '□'}</td>
      <td class="vw" style="white-space:pre-wrap;">${row.note.trim() ? escapeHtml(row.note.trim()) : '—'}</td>
    </tr>`,
      )
      .join('');
  const conditionPage = !hasCond
    ? ''
    : `
<div class="page-break"></div>
<h2 style="font-size:16px;text-align:center;letter-spacing:3px;margin-bottom:4px;">標的物現況說明書（成屋）</h2>
<p style="font-size:8.5px;color:#666;text-align:center;margin:0 0 10px;">地址：${escapeHtml(cs.govAddress || addr || '—')}</p>
<table>
  <thead>
    <tr>
      <th style="width:34px;">項次</th>
      <th>內容</th>
      <th style="width:30px;">是</th>
      <th style="width:30px;">否</th>
      <th style="width:36%;">備註說明</th>
    </tr>
  </thead>
  <tbody>
    ${renderGovRows(firstPageRows)}
  </tbody>
</table>
<p style="font-size:8px;color:#666;margin-top:10px;line-height:1.5;">委託人簽章：${escapeHtml(cs.govSigner || '—')}　簽立日期：${escapeHtml(cs.govSignedDate || '—')}</p>
<p style="font-size:8px;color:#666;margin-top:4px;line-height:1.5;">※ 本表為委託人依現況填載，若有填載不實或後續變更，權利義務仍依契約與法令為準。</p>
<div class="page-break"></div>
<h2 style="font-size:16px;text-align:center;letter-spacing:3px;margin-bottom:4px;">標的物現況說明書（成屋）</h2>
<p style="font-size:8.5px;color:#666;text-align:center;margin:0 0 10px;">地址：${escapeHtml(cs.govAddress || addr || '—')}</p>
<table>
  <thead>
    <tr>
      <th style="width:34px;">項次</th>
      <th>內容</th>
      <th style="width:30px;">是</th>
      <th style="width:30px;">否</th>
      <th style="width:36%;">備註說明</th>
    </tr>
  </thead>
  <tbody>
    ${renderGovRows(secondPageRows)}
  </tbody>
</table>
<p style="font-size:8px;color:#666;margin-top:10px;line-height:1.5;">委託人簽章：${escapeHtml(cs.govSigner || '—')}　簽立日期：${escapeHtml(cs.govSignedDate || '—')}</p>
`;

  // ── Page 3: 不動產說明書（簽名頁 + 附件清單） ──
  // hasTranscript: list-page flag takes priority; fall back to structured transcript data
  // (getPropertyById doesn't compute hasTranscript, but does populate buildingTranscript/landTranscript)
  const hasTranscript = !!(property?.hasTranscript || property?.buildingTranscript || property?.landTranscript);
  const hasTitleDoc = !!property?.hasTitleDoc;
  const hasIndependentParking = !!property?.hasIndependentParking;
  const hasParkingBuildingTranscript = !!property?.parkingBuildingTranscript;
  const hasParkingLandTranscript = !!property?.parkingLandTranscript;

  function checkMark(checked: boolean) {
    return `<span style="font-size:12px;">${checked ? '■' : '□'}</span>`;
  }

  const page3 = `
<div class="page-break"></div>
<h2 style="font-size:18px;">不動產說明書</h2>
<div class="row"><span class="lbl">一、銷售案名：</span><span>${report.caseName || '—'}</span></div>
<div class="row"><span class="lbl">二、建物門牌：</span><span>${addr || '—'}</span></div>
<div class="row"><span class="lbl">三、製作單位：</span><span>${report.agency || '—'}</span></div>
<p style="font-size:9.5px; margin:8px 0 6px;">四、本說明書係依台北市地政事務所核發之謄本為準，內容及附件如下：</p>
<table>
  <thead>
    <tr><th colspan="2">主要內容</th><th colspan="2">附件內容</th><th colspan="2">其他</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>${checkMark(true)} 產權調查篇</td>
      <td>${checkMark(hasTitleDoc)} 土地權狀影本</td>
      <td>${checkMark(false)} 其他：</td>
      <td></td>
    </tr>
    <tr>
      <td>${checkMark(true)} 物件現況調查篇</td>
      <td>${checkMark(hasTitleDoc)} 建物權狀影本</td>
      <td>${checkMark(false)} 地籍圖</td>
      <td>${checkMark(false)} 海砂檢測報告</td>
    </tr>
    <tr>
      <td>${checkMark(false)} 位置與格局圖</td>
      <td>${checkMark(hasTranscript)} 土地謄本</td>
      <td>${checkMark(false)} 建物平面圖</td>
      <td>${checkMark(false)} 輻射檢測報告</td>
    </tr>
    <tr>
      <td>${checkMark(false)} 圖片說明書</td>
      <td>${checkMark(hasTranscript)} 建物謄本</td>
      <td>${checkMark(false)} 公寓大廈使用手冊</td>
      <td>${checkMark(false)} 住戶規約</td>
    </tr>
    ${hasIndependentParking ? `<tr>
      <td></td>
      <td>${checkMark(hasParkingBuildingTranscript)} 車位建物謄本</td>
      <td>${checkMark(hasParkingLandTranscript)} 車位土地謄本</td>
      <td></td>
    </tr>` : ''}
    <tr>
      <td></td>
      <td>${checkMark(false)} 都市使用分區證明</td>
      <td>${checkMark(false)} 分管協議</td>
      <td>${checkMark(false)} 單位平面圖</td>
    </tr>
    <tr>
      <td></td>
      <td>${checkMark(false)} 建築改良物使用執照</td>
      <td>${checkMark(false)} 都市計劃說明書</td>
      <td></td>
    </tr>
  </tbody>
</table>
<div style="margin-top:20px; space-y:12px;">
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
  <tbody>
    ${['','',''].map(() => '<tr><td style="height:18px;"></td><td></td><td></td></tr>').join('')}
  </tbody>
</table>`;

  // ── Page 4: 產權調查篇（建物） ──
  const areaTableRows = [
    ['主建物', b.mainBuilding],
    ['陽台', b.balcony],
    ['雨遮', b.rainCover],
    ['公設1', b.commonArea],
    ['公設2', b.basementCommon],
    ...(b.other1 > 0 ? [['其他', b.other1]] : []),
    ...(b.other2 > 0 ? [['其他', b.other2]] : []),
  ] as [string, number][];

  const page4 = `
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
  <tbody>
    ${[1,2,3].map(() => '<tr><td colspan="4" style="font-size:8.5px;color:#666;">（依市政府 地政機關 登記謄本為準）</td></tr>').join('')}
  </tbody>
</table>
<table style="margin-top:4px;">
  <tr><td class="lbl" style="width:60px;">限制登記情形</td><td class="vw" colspan="3">${report.restrictionRegistration || '無'}</td></tr>
</table>`;

  // ── Page 5: 土地標示 ──
  const page5 = `
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

  // ── Page 6: 交易條件 ──
  const priceLabel = report.transactionType === 'sale' ? '售價' : '租金';
  const ps = report.paymentSchedule;
  const page6 = `
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

  // ── Page 7: 相關費用 ──
  const page7 = `
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

  // ── Page 8: 注意事項 ──
  const page8Clauses = selectedClauses.map(
    (c) => `<li class="note-text" style="margin-bottom:5px;"><strong>${c.number}、</strong>${c.text}</li>`,
  ).join('');

  const page8Notes = selectedNoteTexts.length > 0
    ? `<ul style="list-style:disc;margin:6px 0 0 12px;">${selectedNoteTexts.map((t) => `<li class="note-text">${t}</li>`).join('')}</ul>`
    : '';

  const customNoteHtml = report.customNote?.trim()
    ? `<p class="note-text" style="margin-top:8px;">＊${report.customNote}</p>`
    : '';

  const page8 = `
<div class="page-break"></div>
<h3>注意事項</h3>
${selectedClauses.length > 0 ? `<ol>${page8Clauses}</ol>` : ''}
${page8Notes}
${customNoteHtml}`;

  const atts = report.reportAttachments ?? [];
  const supp = report.reportAttachmentSupplement?.trim() ?? '';
  const page9 =
    atts.length === 0 && !supp
      ? ''
      : `
<div class="page-break"></div>
<h3>報告附加參考</h3>
<p style="font-size:8.5px;color:#666;margin:4px 0 8px;">以下為製作單位於本報告勾選之參考文件或照片名稱；實體檔案請依物件檔案庫為準。</p>
${
  atts.length > 0
    ? `<ol class="note-text" style="margin:6px 0 0 16px;">${atts
        .map(
          (a) =>
            `<li style="margin-bottom:4px;">${escapeHtml(a.label)} <span style="color:#666;font-size:8.5px;">（${
              a.kind === 'document' ? '文件' : '照片'
            }）</span></li>`,
        )
        .join('')}</ol>`
    : ''
}
${supp ? `<p class="note-text" style="margin-top:12px;white-space:pre-wrap;">${escapeHtml(supp)}</p>` : ''}`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>物件調查報告書 - ${report.caseName || '未命名'}</title>
<style>${PRINT_CSS}</style>
</head><body>
${page1}
${page2}
${conditionPage}
${page3}
${page4}
${page5}
${page6}
${page7}
${page8}
${page9}
</body></html>`;
}

// ── React Component ─────────────────────────────────────────────────────────

export function ReportPreview({ report, property }: Props) {
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const [pdfNotice, setPdfNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const b = report.buildingAreas;
  const bldgTotal = calcBuildingTotal(b);
  const pingTotal = sqmToPing(bldgTotal);
  const activeLandParcels = report.landParcels.filter((p) => p.lotNumber || p.baseArea > 0);
  const landTotalShare = report.landParcels.reduce((s, p) => s + calcShareArea(p), 0);
  const lat = property?.latitude;
  const lng = property?.longitude;

  const selectedNoteTexts = report.selectedNotes
    .map((id) => PREDEFINED_NOTES.find((n) => n.id === id)?.text)
    .filter(Boolean) as string[];
  const selectedClauseTexts = STANDARD_CLAUSES.filter((clause) =>
    report.selectedNotes.includes(clause.id),
  ).map((clause) => `${clause.number}、${clause.text}`);
  const govRows = GOV_CONDITION_ITEMS.map((item, index) => {
    const itemNo = index + 1;
    const row = report.conditionStatement.govItems.find((it) => it.itemNo === itemNo);
    const templateRendered = renderNoteWithChecks(item.noteHint, row?.checkedBoxes ?? []);
    const customNote = row?.note?.trim() || '';
    return {
      itemNo,
      title: item.title,
      yes: row?.answer === 'yes',
      no: row?.answer === 'no',
      note: [templateRendered, customNote].filter(Boolean).join('\n'),
    };
  });
  const govPreviewPages = [govRows.slice(0, 24), govRows.slice(24)];

  const handlePrint = useCallback(() => {
    const htmlDoc = buildHtml(report, property);
    const blob = new Blob([htmlDoc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.onload = () => {
        win.print();
        URL.revokeObjectURL(url);
      };
    }
  }, [report, property]);

  const handleSavePdf = useCallback(async () => {
    if (isSavingPdf) return;
    setPdfNotice(null);
    setIsSavingPdf(true);
    try {
      const doc = await PDFDocument.create();
      doc.registerFontkit(fontkit);
      const fallbackFont = await doc.embedFont(StandardFonts.Helvetica);
      const boldFallbackFont = await doc.embedFont(StandardFonts.HelveticaBold);

      let font = fallbackFont;
      let hasCjkFont = false;
      try {
        const resp = await fetch('/fonts/noto-sans-tc-chinese-traditional-400-normal.woff');
        if (resp.ok) {
          const bytes = new Uint8Array(await resp.arrayBuffer());
          font = await doc.embedFont(bytes, { subset: true });
          hasCjkFont = true;
        }
      } catch {
        // fallback to Helvetica
      }
      const rows = GOV_CONDITION_ITEMS.map((govItem, i) => {
      const item = report.conditionStatement.govItems.find((v) => v.itemNo === i + 1);
      const ans = item?.answer === 'yes' ? 'Yes' : item?.answer === 'no' ? 'No' : '-';
      const tplRendered = renderNoteWithChecks(govItem.noteHint, item?.checkedBoxes ?? []);
      const customNote = item?.note?.trim() ?? '';
      return {
        no: String(i + 1),
        content: govItem.title,
        yes: ans === 'Yes' ? 'X' : '',
        noVal: ans === 'No' ? 'X' : '',
        note: [tplRendered, customNote].filter(Boolean).join('\n'),
      };
    });
      const estimateRowHeight = (row: (typeof rows)[number]): number => {
      const contentLines = wrapByCharLimit(
        hasCjkFont ? pdfSafeText(row.content) : pdfLatinSafeText(row.content),
        hasCjkFont ? 32 : 40,
        2,
      );
      const noteLines = wrapByCharLimit(
        hasCjkFont ? pdfSafeText(row.note) : pdfLatinSafeText(row.note),
        hasCjkFont ? 22 : 28,
        2,
      );
      const usedLines = Math.max(contentLines.length, noteLines.length);
      return Math.max(24, 12 + usedLines * 10);
    };
      const pages: typeof rows[] = [];
      let currentRows: typeof rows = [];
      let currentHeight = 0;
      const maxTableHeight = 24 * 24;
      for (const row of rows) {
        const h = estimateRowHeight(row);
        if (currentRows.length > 0 && currentHeight + h > maxTableHeight) {
          pages.push(currentRows);
          currentRows = [];
          currentHeight = 0;
        }
        currentRows.push(row);
        currentHeight += h;
      }
      if (currentRows.length > 0) pages.push(currentRows);
      const totalPages = pages.length;
      const addr = report.conditionStatement.govAddress || fullAddress(report) || '—';
      const textFont = font;
      const headerFont = hasCjkFont ? textFont : boldFallbackFont;
      const markFont = boldFallbackFont;

      pages.forEach((pageRows, pageIndex) => {
      const page = doc.addPage([595.28, 841.89]); // A4
      const xNo = 28;
      const xContent = 58;
      const xYes = 382;
      const xNoCol = 418;
      const xNote = 454;
      const tableRight = 567;
      const baseRowH = 24;

      const text = (v: string) => (hasCjkFont ? pdfSafeText(v) : pdfLatinSafeText(v));
      let y = 810;

      page.drawText(text('標 的 物 現 況 說 明 書（成屋）'), {
        x: 162,
        y,
        size: 14,
        font: headerFont,
        color: rgb(0, 0, 0),
      });
      y -= 22;

      page.drawText(text(`地址：${addr}`), {
        x: 28,
        y,
        size: 10,
        font: textFont,
        color: rgb(0, 0, 0),
      });
      y -= 16;
      page.drawText(
        text('※本表為委託人依現況填載；若有填載不實或日後變更，其權利義務仍依契約及法令為準。'),
        { x: 28, y, size: 7.5, font: textFont, color: rgb(0.2, 0.2, 0.2) },
      );
      y -= 12;
      page.drawText(text('※注意：委託人依法應負瑕疵擔保責任；現況如有變更，應如實告知買方。'), {
        x: 28,
        y,
        size: 7.5,
        font: textFont,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= 14;

      const headerTop = y;
      const headerBottom = y - baseRowH;
      page.drawRectangle({
        x: xNo,
        y: headerBottom,
        width: tableRight - xNo,
        height: baseRowH,
        borderWidth: 1,
        borderColor: rgb(0.4, 0.4, 0.4),
        color: rgb(0.94, 0.94, 0.94),
      });
      for (const x of [xContent, xYes, xNoCol, xNote]) {
        page.drawLine({
          start: { x, y: headerTop },
          end: { x, y: headerBottom },
          thickness: 1,
          color: rgb(0.4, 0.4, 0.4),
        });
      }
      page.drawText(text('項次'), { x: xNo + 6, y: y - 15, size: 9, font: headerFont });
      page.drawText(text('內容'), { x: xContent + 6, y: y - 15, size: 9, font: headerFont });
      page.drawText(text('是'), { x: xYes + 12, y: y - 15, size: 9, font: headerFont });
      page.drawText(text('否'), { x: xNoCol + 12, y: y - 15, size: 9, font: headerFont });
      page.drawText(text('備註說明'), { x: xNote + 6, y: y - 15, size: 9, font: headerFont });
      y = headerBottom;

      for (const row of pageRows) {
        const contentLines = wrapByCharLimit(text(row.content), hasCjkFont ? 32 : 40, 2);
        const noteLines = wrapByCharLimit(text(row.note), hasCjkFont ? 22 : 28, 2);
        const usedLines = Math.max(contentLines.length, noteLines.length);
        const rowH = Math.max(baseRowH, 12 + usedLines * 10);
        const top = y;
        const bottom = y - rowH;
        page.drawRectangle({
          x: xNo,
          y: bottom,
          width: tableRight - xNo,
          height: rowH,
          borderWidth: 1,
          borderColor: rgb(0.7, 0.7, 0.7),
        });
        for (const x of [xContent, xYes, xNoCol, xNote]) {
          page.drawLine({
            start: { x, y: top },
            end: { x, y: bottom },
            thickness: 1,
            color: rgb(0.7, 0.7, 0.7),
          });
        }

        const firstLineY = y - 15;
        page.drawText(text(row.no), { x: xNo + 9, y: firstLineY, size: 8.5, font: textFont });
        contentLines.forEach((line, idx) => {
          page.drawText(line, {
            x: xContent + 6,
            y: firstLineY - idx * 10,
            size: 8,
            font: textFont,
          });
        });
        if (row.yes) page.drawText('■', { x: xYes + 11, y: firstLineY, size: 10, font: markFont });
        if (row.noVal) page.drawText('■', { x: xNoCol + 11, y: firstLineY, size: 10, font: markFont });
        noteLines.forEach((line, idx) => {
          page.drawText(line, {
            x: xNote + 6,
            y: firstLineY - idx * 10,
            size: 7.5,
            font: textFont,
          });
        });
        y = bottom;
      }

      y -= 12;
      page.drawLine({
        start: { x: 86, y },
        end: { x: 220, y },
        thickness: 0.8,
        color: rgb(0.5, 0.5, 0.5),
      });
      page.drawText(text(`委託人簽章：${report.conditionStatement.govSigner || '—'}`), {
        x: 28,
        y: y + 2,
        size: 9,
        font: textFont,
      });
      page.drawLine({
        start: { x: 386, y },
        end: { x: 520, y },
        thickness: 0.8,
        color: rgb(0.5, 0.5, 0.5),
      });
      page.drawText(text(`簽立日期：${report.conditionStatement.govSignedDate || '—'}`), {
        x: 330,
        y: y + 2,
        size: 9,
        font: textFont,
      });
      page.drawText(text(`第 ${pageIndex + 1} 頁  共 ${totalPages} 頁`), {
        x: 252,
        y: 20,
        size: 9,
        font: textFont,
      });
      });

      const bytes = await doc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const datePart = new Date().toISOString().slice(0, 10);
      const casePart = sanitizeFileNameSegment(report.caseName || '未命名案件');
      const addrPart = sanitizeFileNameSegment(
        report.conditionStatement.govAddress || fullAddress(report) || '地址未填',
      );
      a.href = url;
      a.download = `標的物現況說明書_${casePart}_${addrPart}_${datePart}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setPdfNotice({ type: 'success', message: 'PDF 已開始下載，請查看瀏覽器下載清單。' });
    } catch {
      setPdfNotice({ type: 'error', message: 'PDF 產生失敗，請稍後重試。' });
    } finally {
      setIsSavingPdf(false);
    }
  }, [isSavingPdf, report]);

  const addr = fullAddress(report);

  // ── Inline preview (screen) ─────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-text-primary">報告書預覽</h4>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white text-sm rounded-md hover:bg-accent-hover transition-colors"
          >
            <Printer size={14} />
            列印報告書（A4）
          </button>
          <button
            type="button"
            onClick={handleSavePdf}
            disabled={isSavingPdf}
            className="flex items-center gap-1.5 px-4 py-2 border border-border-default text-text-primary text-sm rounded-md hover:bg-bg-tertiary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSavingPdf ? <Loader2 size={14} className="animate-spin" /> : null}
            {isSavingPdf ? 'PDF 產生中…' : '另存 PDF'}
          </button>
        </div>
      </div>
      {pdfNotice && (
        <div
          className={`px-3 py-2 rounded-md text-xs border ${
            pdfNotice.type === 'success'
              ? 'bg-green-500/10 text-green-500 border-green-500/25'
              : 'bg-red-500/10 text-red-500 border-red-500/25'
          }`}
        >
          {pdfNotice.message}
        </div>
      )}

      {/* Screen preview */}
      <div className="bg-bg-primary border border-border-default rounded-lg overflow-hidden text-text-primary text-xs">

        {/* ── 物件個案調查表（主表格） ── */}
        <div className="p-4 border-b border-border-default">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_120px_40px] border border-border-default text-[11px] font-bold">
            <div className="px-2 py-1.5 border-r border-border-default text-text-secondary">
              {report.agency || '（製作單位）'}
            </div>
            <div className="px-2 py-1.5 text-center border-r border-border-default">物件個案調查表</div>
            <div className="px-2 py-1.5 text-center">{report.transactionType === 'sale' ? '售' : '租'}</div>
          </div>

          {/* Case summary row */}
          <div className="grid grid-cols-[1fr_80px_80px_80px_80px] border-x border-b border-border-default text-[11px]">
            <div className="px-2 py-1 border-r border-border-default font-bold">{report.caseName || '—'}</div>
            <div className="px-2 py-1 text-center border-r border-border-default text-text-muted text-[10px]">坪數</div>
            <div className="px-2 py-1 text-center border-r border-border-default font-bold">{pingTotal}</div>
            <div className="px-2 py-1 text-center border-r border-border-default text-text-muted text-[10px]">售價</div>
            <div className="px-2 py-1 text-center font-bold">{report.totalPrice || '—'}萬</div>
          </div>

          {/* Address */}
          <div className="border-x border-b border-border-default px-2 py-1 text-[11px]">
            <span className="text-text-muted">地址：</span>{addr || '—'}
          </div>

          {/* Main two-column body */}
          <div className="grid grid-cols-2 border-x border-b border-border-default">
            {/* Left: Building info */}
            <div className="border-r border-border-default divide-y divide-border-default">
              {[
                ['社區/大樓名稱', report.buildingName],
                ['建築完成日', report.completionDate ? `${report.completionDate}  屋齡: ${report.buildingAge}年` : '—'],
                ['樓　　層', report.floorInfo],
                ['格　　局', report.layout],
                ['座　　向', report.orientation],
                ['管　理　費', report.hasManagementFee ? `有，${report.managementFeeAmount}元/月` : '無'],
                ['主要建材', report.mainMaterial],
                ['同層戶數', report.unitsPerFloor ? `${report.unitsPerFloor}戶` : '—'],
                ['邊間 / 中庭', `${report.isCornerUnit} / ${report.hasCourt}`],
                ['電　梯　數', report.elevatorCount || '—'],
                ['瓦　　斯', report.gasType],
                ['增建部份', report.additions || '無'],
                ['警衛管理', report.security],
                ['學　　區', report.schoolDistrict],
                ['看屋方式', report.viewingMethod],
              ].map(([label, value]) => (
                <div key={label} className="flex px-2 py-0.5">
                  <span className="w-20 text-text-muted shrink-0">{label}</span>
                  <span>{value || '—'}</span>
                </div>
              ))}
            </div>

            {/* Right: Areas + Land + Parking */}
            <div className="divide-y divide-border-default">
              {/* Building areas */}
              <div className="px-2 py-1">
                <div className="text-[10px] font-bold text-text-secondary mb-1">建 物</div>
                {[
                  ['主建物', b.mainBuilding],
                  ['陽台', b.balcony],
                  ['雨遮', b.rainCover],
                  ['公設1', b.commonArea],
                  ['公設2', b.basementCommon],
                  ...(b.other1 > 0 ? [['其他', b.other1]] as [string, number][] : []),
                  ...(b.other2 > 0 ? [['其他', b.other2]] as [string, number][] : []),
                ].map(([name, area]) => (
                  <div key={name as string} className="flex justify-between px-1">
                    <span className="text-text-muted">{name}</span>
                    <span>{sqmToPing(area as number)}&nbsp;坪</span>
                  </div>
                ))}
                <div className="flex justify-between px-1 font-bold border-t border-border-default mt-1 pt-1">
                  <span>合計</span><span>{pingTotal}&nbsp;坪</span>
                </div>
              </div>

              {/* Land */}
              <div className="px-2 py-1">
                <div className="text-[10px] font-bold text-text-secondary mb-1">土 地</div>
                {activeLandParcels.length === 0 ? (
                  <span className="text-text-muted">（未填）</span>
                ) : activeLandParcels.map((p, i) => (
                  <div key={i} className="mb-0.5">
                    <div className="flex justify-between px-1">
                      <span className="text-text-muted">地號{i + 1}</span>
                      <span className="truncate max-w-[120px]">{p.lotNumber}</span>
                    </div>
                    <div className="flex justify-between px-1">
                      <span className="text-text-muted">分區</span>
                      <span>{p.zoningType || '—'}&nbsp;持分:&nbsp;{sqmToPing(calcShareArea(p))}坪</span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between px-1 font-bold border-t border-border-default mt-1 pt-1">
                  <span>持分合計</span><span>{sqmToPing(landTotalShare)}&nbsp;坪</span>
                </div>
              </div>

              {/* Parking */}
              <div className="px-2 py-1">
                <div className="text-[10px] font-bold text-text-secondary mb-1">車 位</div>
                {report.parking.hasParking ? (
                  <>
                    <div className="flex justify-between px-1">
                      <span className="text-text-muted">有無車位</span><span>有</span>
                    </div>
                    <div className="flex justify-between px-1">
                      <span className="text-text-muted">車位價</span>
                      <span>{report.parking.parkingPrice ? `${report.parking.parkingPrice}萬` : '—'}</span>
                    </div>
                    <div className="flex justify-between px-1">
                      <span className="text-text-muted">停車方式</span>
                      <span>{report.parking.parkingMethod || '—'}</span>
                    </div>
                  </>
                ) : (
                  <div className="px-1 text-text-muted">無車位</div>
                )}
              </div>
            </div>
          </div>

          {/* Features + Map + Floor plan row */}
          <div className="grid grid-cols-3 border-x border-b border-border-default">
            <div className="p-2 border-r border-border-default">
              <div className="text-[10px] font-bold text-text-secondary mb-1">特色</div>
              {report.features.filter(Boolean).length > 0 ? (
                report.features.filter(Boolean).map((f, i) => (
                  <p key={i}>{i + 1}. {f}</p>
                ))
              ) : (
                <span className="text-text-muted">—</span>
              )}
            </div>
            <div className="p-2 border-r border-border-default">
              <div className="flex items-center gap-1 text-[10px] font-bold text-text-secondary mb-1">
                <MapPin size={10} /> 位置圖
              </div>
              {lat && lng ? (
                <div className="text-[10px] text-accent">
                  <p>{addr}</p>
                  <p className="text-text-muted mt-1">{lat.toFixed(5)}, {lng.toFixed(5)}</p>
                </div>
              ) : (
                <p className="text-text-muted text-[10px]">{addr || '—'}</p>
              )}
            </div>
            <div className="p-2">
              <div className="text-[10px] font-bold text-text-secondary mb-1">格局圖</div>
              {report.floorPlanPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={report.floorPlanPhotoUrl}
                  alt="格局圖"
                  className="max-h-24 object-contain rounded"
                />
              ) : (
                <p className="text-text-muted text-[10px]">依標的現況為準</p>
              )}
            </div>
          </div>
        </div>

        {/* ── 屋況說明書 ── */}
        {hasConditionStatementContent(report.conditionStatement) && (
          <div className="p-4 border-t border-border-default">
            <p className="text-[10px] font-bold text-text-secondary mb-1">標的物現況說明書（成屋）</p>
            <p className="text-[10px] text-text-muted mb-3">
              地址：{report.conditionStatement.govAddress || addr || '—'}
            </p>
            <div className="space-y-3">
              {govPreviewPages.map((pageRows, pageIdx) => (
                <div key={pageIdx} className="border border-border-default rounded-md overflow-hidden">
                  <div className="px-3 py-2 border-b border-border-default bg-bg-secondary">
                    <p className="text-[11px] font-semibold text-text-primary">標 的 物 現 況 說 明 書（成屋）</p>
                    <p className="text-[10px] text-text-muted mt-1">
                      ※本表為委託人依現況填載；若有填載不實或日後變更，權利義務仍依契約及法令為準。
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                      <thead>
                        <tr className="bg-bg-tertiary">
                          <th className="w-14">項次</th>
                          <th>內容</th>
                          <th className="w-12">是</th>
                          <th className="w-12">否</th>
                          <th className="w-80">備註說明</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((row) => (
                          <tr key={row.itemNo}>
                            <td className="text-center align-top py-1.5">{row.itemNo}</td>
                            <td className="align-top py-1.5 leading-5">{row.title}</td>
                            <td className="text-center align-top py-1.5">{row.yes ? '■' : '□'}</td>
                            <td className="text-center align-top py-1.5">{row.no ? '■' : '□'}</td>
                            <td className="whitespace-pre-wrap align-top py-1.5">{row.note || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-3 py-2 border-t border-border-default text-[10px] text-text-muted flex items-center justify-between">
                    <span>委託人簽章：{report.conditionStatement.govSigner || '—'}</span>
                    <span>簽立日期：{report.conditionStatement.govSignedDate || '—'}</span>
                    <span>第 {pageIdx + 1} 頁 / 共 {govPreviewPages.length} 頁</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 注意事項 ── */}
        {(selectedClauseTexts.length > 0 || selectedNoteTexts.length > 0 || report.customNote) && (
          <div className="p-4">
            <p className="text-[10px] font-bold text-red-500 mb-2">注意事項</p>
            <ul className="space-y-1">
              {selectedClauseTexts.map((t, i) => (
                <li key={`clause-${i}`} className="text-[10px] leading-relaxed">＊ {t}</li>
              ))}
              {selectedNoteTexts.map((t, i) => (
                <li key={`note-${i}`} className="text-[10px] leading-relaxed">＊ {t}</li>
              ))}
              {report.customNote && (
                <li className="text-[10px] leading-relaxed">＊ {report.customNote}</li>
              )}
            </ul>
          </div>
        )}

        {(report.reportAttachments.length > 0 || report.reportAttachmentSupplement.trim()) && (
          <div className="p-4 border-t border-border-default">
            <p className="text-[10px] font-bold text-text-secondary mb-2">報告附加參考</p>
            <p className="text-[10px] text-text-muted mb-2">
              已勾選之文件／照片將列印於報告末頁；檔案本體請於物件後台開啟。
            </p>
            {report.reportAttachments.length > 0 && (
              <ol className="list-decimal list-inside space-y-1 mb-3">
                {report.reportAttachments.map((a) => (
                  <li key={`${a.kind}-${a.id}`} className="text-[10px] text-text-primary">
                    {a.label}
                    <span className="text-text-muted ml-1">
                      （{a.kind === 'document' ? '文件' : '照片'}）
                    </span>
                  </li>
                ))}
              </ol>
            )}
            {report.reportAttachmentSupplement.trim() && (
              <p className="text-[10px] text-text-secondary whitespace-pre-wrap border border-border-default rounded-md p-2 bg-bg-secondary">
                {report.reportAttachmentSupplement}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
