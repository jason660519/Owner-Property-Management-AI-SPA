// filepath: apps/superadmin/lib/utils/real-price-comparable-pdf.ts
// 產出繁中 PDF（內政部實價登錄 style 摘要表，供列印）

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { NormalizedComparableSale } from '@/lib/utils/real-price-comparables';

const MAX_ROWS = 60;
const MARGIN = 44;
const ROW_H = 13;
const FONT_SIZE = 8;

export type ComparablePdfKind = 'nearby' | 'street_section' | 'village';

function resolveNotoSansTcWoff2Path(): string | null {
  const rel = join(
    'node_modules',
    '@fontsource',
    'noto-sans-tc',
    'files',
    'noto-sans-tc-chinese-traditional-400-normal.woff2',
  );
  const roots = [process.cwd(), join(process.cwd(), '..'), join(process.cwd(), '..', '..')];
  for (const r of roots) {
    const p = join(r, rel);
    if (existsSync(p)) return p;
  }
  return null;
}

function ellipsize(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

function formatWan(twd: number): string {
  const wan = twd / 10_000;
  return wan.toLocaleString('zh-TW', { maximumFractionDigits: 1 });
}

function drawLine(
  page: PDFPage,
  font: PDFFont,
  x: number,
  y: number,
  size: number,
  text: string,
  maxWidth?: number,
): number {
  const line = maxWidth != null ? ellipsize(text, Math.floor(maxWidth / (size * 0.55))) : text;
  page.drawText(line, { x, y, size, font, color: rgb(0.1, 0.1, 0.12) });
  return y - ROW_H;
}

export interface ComparablePdfBuildInput {
  kind: ComparablePdfKind;
  reportTitle: string;
  criteriaLines: string[];
  propertyLines: string[];
  warnings: string[];
  rows: Array<
    NormalizedComparableSale & {
      distanceKm?: number;
    }
  >;
  generatedAtLabel: string;
}

export async function buildComparableSalesPdf(input: ComparablePdfBuildInput): Promise<Uint8Array> {
  const fontPath = resolveNotoSansTcWoff2Path();
  if (!fontPath) {
    throw new Error(
      '找不到 Noto Sans TC 字型（@fontsource/noto-sans-tc）。請在專案根目錄執行 npm install。',
    );
  }

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const fontBytes = readFileSync(fontPath);
  const font = await pdfDoc.embedFont(fontBytes, { subset: true });
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

  let page = pdfDoc.addPage([595.28, 841.89]);
  const pageW = page.getWidth();
  let y = page.getHeight() - MARGIN;

  y = drawLine(page, font, MARGIN, y, 14, input.reportTitle);
  y -= 4;
  y = drawLine(page, fontMono, MARGIN, y, 8, input.generatedAtLabel);
  y -= 8;

  for (const pl of input.propertyLines) {
    y = drawLine(page, font, MARGIN, y, FONT_SIZE, pl, pageW - 2 * MARGIN);
  }
  y -= 4;

  y = drawLine(page, font, MARGIN, y, 9, '篩選條件');
  for (const cl of input.criteriaLines) {
    y = drawLine(page, font, MARGIN, y, FONT_SIZE, `· ${cl}`, pageW - 2 * MARGIN);
  }
  y -= 4;

  for (const w of input.warnings) {
    y = drawLine(page, font, MARGIN, y, FONT_SIZE, `※ ${w}`, pageW - 2 * MARGIN);
  }
  if (input.warnings.length > 0) y -= 4;

  const slice = input.rows.slice(0, MAX_ROWS);
  const headers =
    input.kind === 'nearby'
      ? ['交易日', '總價(萬)', '建物㎡', '單價/㎡', '型態', '樓層', '距離km', '位置摘要']
      : ['交易日', '總價(萬)', '建物㎡', '單價/㎡', '型態', '樓層', '位置摘要'];

  const colXs =
    input.kind === 'nearby'
      ? [MARGIN, 92, 138, 178, 228, 278, 318, 368]
      : [MARGIN, 92, 138, 178, 228, 278, 328];

  y = drawLine(page, font, MARGIN, y, 9, `成交案件（近一年，最多 ${MAX_ROWS} 筆；資料來源：貴單位匯入之開放資料）`);
  y -= 2;

  const headerBaselineY = y;
  for (let i = 0; i < headers.length; i++) {
    page.drawText(headers[i], {
      x: colXs[i],
      y: headerBaselineY,
      size: 7,
      font,
      color: rgb(0.2, 0.2, 0.25),
    });
  }
  y = headerBaselineY - ROW_H;
  page.drawLine({
    start: { x: MARGIN, y: y + 10 },
    end: { x: pageW - MARGIN, y: y + 10 },
    thickness: 0.4,
    color: rgb(0.75, 0.75, 0.78),
  });

  if (slice.length === 0) {
    y = drawLine(page, font, MARGIN, y, FONT_SIZE, '（無符合條件之成交資料）');
  } else {
    for (const r of slice) {
      if (y < MARGIN + 48) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = page.getHeight() - MARGIN;
      }
      const row: string[] = [
        r.transactionDate,
        formatWan(r.totalPriceTwd),
        r.buildingAreaSqm != null ? String(r.buildingAreaSqm) : '—',
        r.unitPricePerSqm != null ? String(Math.round(r.unitPricePerSqm)) : '—',
        ellipsize(r.buildingType ?? '—', 8),
        ellipsize(r.floor ?? '—', 6),
      ];
      if (input.kind === 'nearby') {
        row.push(r.distanceKm != null ? r.distanceKm.toFixed(3) : '—');
        row.push(ellipsize(r.addressSnippet, 28));
      } else {
        row.push(ellipsize(r.addressSnippet, 34));
      }
      for (let i = 0; i < row.length; i++) {
        page.drawText(row[i], {
          x: colXs[i],
          y,
          size: 7,
          font: i === 1 ? fontMono : font,
          color: rgb(0.12, 0.12, 0.14),
        });
      }
      y -= ROW_H;
    }
  }

  y -= 8;
  if (y < MARGIN + 72) {
    page = pdfDoc.addPage([595.28, 841.89]);
    y = page.getHeight() - MARGIN;
  }

  const foot = [
    '聲明：本表由系統依貴單位提供之成交資料與上述條件自動篩選產出，僅供參考。',
    '正式揭露仍應以內政部不動產交易實價查詢服務網（https://lvr.land.moi.gov.tw/）及政府開放資料為準。',
  ];
  for (const f of foot) {
    y = drawLine(page, font, MARGIN, y, 7, f, pageW - 2 * MARGIN);
  }

  return pdfDoc.save();
}
