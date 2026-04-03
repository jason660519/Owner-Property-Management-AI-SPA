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

const NOTO_SANS_TC_FILES = [
  'noto-sans-tc-chinese-traditional-400-normal.woff2',
  'noto-sans-tc-chinese-traditional-400-normal.woff',
  'noto-sans-tc-0-400-normal.woff2',
] as const;

function resolveNotoSansTcWoff2Path(): string | null {
  // 優先使用 macOS 內建的全字元 Unicode 字體，避免使用不完整的 Noto Sans TC 子集 (Subset 0 只含拉丁)
  const macOSArialUnicode = '/System/Library/Fonts/Supplemental/Arial Unicode.ttf';
  if (existsSync(macOSArialUnicode)) return macOSArialUnicode;

  // Linux/Fallback: 尋找 Noto Sans TC (雖然分頁報表可能有子集問題，但作為次選)
  const relParts = ['node_modules', '@fontsource', 'noto-sans-tc', 'files'] as const;
  let dir = process.cwd();
  for (let depth = 0; depth < 8; depth++) {
    for (const name of NOTO_SANS_TC_FILES) {
      const p = join(dir, ...relParts, name);
      if (existsSync(p)) return p;
    }
    const parent = join(dir, '..');
    if (parent === dir) break;
    dir = parent;
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
  if (!text) return y;
  // 移除過於侵略性的截斷，避免中文字元寬度計算錯誤導致完全不顯示
  page.drawText(text, { x, y, size, font, color: rgb(0.1, 0.1, 0.12) });
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
      distanceKm?: number | null;
    }
  >;
  generatedAtLabel: string;
}

export async function buildComparableSalesPdf(input: ComparablePdfBuildInput): Promise<Uint8Array> {
  const fontPath = resolveNotoSansTcWoff2Path();
  
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  let font: PDFFont;
  if (fontPath) {
    const fontBytes = readFileSync(fontPath);
    font = await pdfDoc.embedFont(new Uint8Array(fontBytes), { subset: true });
  } else {
    // 即使找不到字體，也絕不能崩潰，退而求其次使用 Helvetica
    console.error('[PDF] Font not found, using fallback Helvetica');
    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  }

  const fontMono = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let page = pdfDoc.addPage([595.28, 841.89]);
  const pageW = page.getWidth();
  let y = page.getHeight() - MARGIN;

  // 1. 標題
  page.drawText(input.reportTitle, {
    x: MARGIN,
    y: y,
    size: 14,
    font: font,
    color: rgb(0, 0, 0)
  });
  y -= 20;

  // 2. 產製時間
  page.drawText(input.generatedAtLabel, {
    x: MARGIN,
    y: y,
    size: 8,
    font: font,
    color: rgb(0.4, 0.4, 0.4)
  });
  y -= 20;

  // 3. 物件資訊
  for (const pl of input.propertyLines) {
    page.drawText(pl, {
      x: MARGIN,
      y: y,
      size: 9,
      font: font,
      color: rgb(0.2, 0.2, 0.2)
    });
    y -= 14;
  }
  y -= 10;

  // 4. 篩選條件
  page.drawText('篩選條件 (Search Criteria):', {
    x: MARGIN,
    y: y,
    size: 10,
    font: font,
    color: rgb(0, 0, 0)
  });
  y -= 14;
  for (const cl of input.criteriaLines) {
    page.drawText(`• ${cl}`, {
      x: MARGIN + 10,
      y: y,
      size: 8,
      font: font,
      color: rgb(0.3, 0.3, 0.3)
    });
    y -= 12;
  }
  y -= 15;

  // 5. 警示訊息 (如有)
  if (input.warnings.length > 0) {
    for (const w of input.warnings) {
      page.drawText(`[!] ${w}`, {
        x: MARGIN,
        y: y,
        size: 9,
        font: font,
        color: rgb(0.8, 0, 0)
      });
      y -= 14;
    }
    y -= 10;
  }

  // 6. 表頭與列表
  page.drawText('成交案件 (Transactions):', {
    x: MARGIN,
    y: y,
    size: 10,
    font: font,
    color: rgb(0, 0, 0)
  });
  y -= 16;

  const headers = input.kind === 'nearby'
    ? ['日期', '總價(萬)', '面積㎡', '單價/㎡', '型態', '樓層', '距離', '位置']
    : ['日期', '總價(萬)', '面積㎡', '單價/㎡', '型態', '樓層', '位置'];

  const colXs = input.kind === 'nearby'
    ? [MARGIN, 100, 150, 190, 240, 290, 330, 380]
    : [MARGIN, 100, 150, 190, 240, 290, 340];

  // 畫表頭
  headers.forEach((h, i) => {
    page.drawText(h, {
      x: colXs[i],
      y: y,
      size: 8,
      font: font,
      color: rgb(0, 0, 0)
    });
  });
  y -= 14;
  page.drawLine({
    start: { x: MARGIN, y: y + 10 },
    end: { x: pageW - MARGIN, y: y + 10 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8)
  });

  const slice = input.rows.slice(0, MAX_ROWS);
  if (slice.length === 0) {
    page.drawText('(無符合條件之成交資料 / No data matches found)', {
      x: MARGIN,
      y: y,
      size: 9,
      font: font,
      color: rgb(0.5, 0.5, 0.5)
    });
  } else {
    for (const row of slice) {
      if (y < MARGIN + 20) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = page.getHeight() - MARGIN;
      }

      const vals = [
        row.transactionDate,
        formatWan(row.totalPriceTwd),
        row.buildingAreaSqm?.toString() || '-',
        row.unitPricePerSqm?.toLocaleString() || '-',
        row.buildingType || '-',
        row.floor || '-',
      ];
      if (input.kind === 'nearby') {
        vals.push(
          row.distanceKm != null ? `${row.distanceKm.toFixed(2)}km` : '—',
        );
      }
      vals.push(row.addressSnippet);

      vals.forEach((v, i) => {
        page.drawText(v, {
          x: colXs[i],
          y: y,
          size: 7,
          font: font,
          color: rgb(0.2, 0.2, 0.2)
        });
      });
      y -= ROW_H;
    }
  }

  return pdfDoc.save();
}
