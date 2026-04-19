// PDF text extraction for people-database imports. Built on the project's
// existing `pdfjs-dist` dep (no new packages). Two-tier strategy:
//
//   1. extractPdfText() pulls the raw text streams page-by-page. Useful for
//      small previews and as the input to the tabular parser.
//   2. parsePdfTabular() takes those page strings and applies a *very*
//      conservative line/column heuristic to recover a CSV-shaped table.
//      Returns warnings so the UI can flag rows that don't split cleanly.
//
// Sprint 3: before building the header from line 0, parsePdfTabular now
// checks for transposed tables (field labels in the first *column*, each
// person as a subsequent column) — common in 台北市里長 PDFs. See
// parsers/pdf-transposed.ts for the heuristic.
//
// Scanned-only PDFs (image-based) come back with effectively zero glyph
// strings; we surface a `likelyScanned` flag so the route handler can short-
// circuit and direct users to the OCR queue (Sprint 3 OpenClaw integration).

import { detectTransposedTable, linesToMatrix, transposeTable } from './parsers/pdf-transposed';

// pdfjs-dist v4 ships an ESM build with a Node-friendly entry point under
// `legacy/build/pdf.mjs`. The default export's loader expects a worker URL,
// but `disableWorker` short-circuits that for server-side usage.
type PdfTextItem = { str?: string; transform?: number[] };
type PdfTextContent = { items: PdfTextItem[] };
type PdfPage = { getTextContent: () => Promise<PdfTextContent> };
type PdfDocument = { numPages: number; getPage: (n: number) => Promise<PdfPage> };
type PdfLib = {
  getDocument: (params: {
    data: Uint8Array;
    disableWorker?: boolean;
    isEvalSupported?: boolean;
    useSystemFonts?: boolean;
  }) => { promise: Promise<PdfDocument> };
  GlobalWorkerOptions?: { workerSrc: string };
};

let cachedPdfLib: PdfLib | null = null;
async function loadPdfLib(): Promise<PdfLib> {
  if (cachedPdfLib) return cachedPdfLib;
  // Use the legacy build so this works in Node without bundler magic.
  const mod = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfLib;
  // Disable worker spawning entirely — all parsing happens on the main thread.
  // pdfjs-dist v4 still validates that GlobalWorkerOptions.workerSrc is a
  // truthy string even when getDocument({ disableWorker: true }) is passed;
  // an empty string triggers "No 'GlobalWorkerOptions.workerSrc' specified"
  // on the first call in batch / CLI contexts. Pointing it at the shipped
  // worker file (which we never actually spawn) satisfies the check.
  if (mod.GlobalWorkerOptions) {
    try {
      // Use Node's synchronous `require.resolve` directly. Works under both:
      //   (a) Next.js Webpack/Turbopack (injects a `require` runtime helper)
      //   (b) Plain Node commonjs CLI workers built via tools/people-db/tsconfig.cli.json
      // The earlier `createRequire(import.meta.url)` form broke the CLI build
      // because `import.meta` is only valid under ESM tsconfig module targets.
      // See .claude/rules/critical-deps.md § Node 25 + tsx 已知陷阱.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      mod.GlobalWorkerOptions.workerSrc = require.resolve(
        'pdfjs-dist/legacy/build/pdf.worker.mjs',
      );
    } catch {
      // Non-Node environment (e.g. edge runtime) — fall back to a sentinel
      // string so the internal check passes without resolving a real file.
      mod.GlobalWorkerOptions.workerSrc = 'data:,';
    }
  }
  cachedPdfLib = mod;
  return mod;
}

export interface ExtractedPdf {
  pages: string[];
  totalChars: number;
  likelyScanned: boolean;
}

/**
 * Extracts plain text from each PDF page. Pages with no recoverable text
 * become empty strings (not omitted) so callers can keep page numbering.
 */
export async function extractPdfText(buffer: ArrayBuffer | Uint8Array | Buffer): Promise<ExtractedPdf> {
  const pdfLib = await loadPdfLib();
  const data = toUint8Array(buffer);
  const loadingTask = pdfLib.getDocument({
    data,
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: true,
  });
  const doc = await loadingTask.promise;

  const pages: string[] = [];
  let totalChars = 0;
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = stitchTextItems(content.items);
    pages.push(text);
    totalChars += text.length;
  }

  // Heuristic: zero recoverable text means the PDF is image-only (scanned).
  // We deliberately don't flag short text-PDFs (e.g. a 1-page summary) as
  // scanned just because they're brief - that produced false positives in
  // testing. Routing low-density PDFs to OCR is a Sprint 5b decision, not a
  // hard block here.
  const likelyScanned = doc.numPages > 0 && totalChars === 0;

  return { pages, totalChars, likelyScanned };
}

// Tolerance (in PDF units) for treating two glyphs as living on the same
// visual line. The pre-Sprint-3 stitcher used 1px which broke on PDFs that
// render each CJK glyph as its own text item with sub-pixel baseline drift
// (e.g. 台北市里長). 3px handles that without merging genuinely adjacent
// rows (typical line-height in these PDFs is ≥ 8px).
const ROW_TOLERANCE_PX = 3;

function stitchTextItems(items: PdfTextItem[]): string {
  // Strategy: bucket tokens by y with ROW_TOLERANCE_PX, then sort each
  // bucket by x ascending so reading order within a row is restored even
  // when pdfjs emits glyphs out of left-to-right sequence.
  type Tok = { x: number; y: number; str: string };
  const tokens: Tok[] = [];
  for (const item of items) {
    const str = item.str ?? '';
    if (str === '') continue;
    const x = item.transform ? item.transform[4] : 0;
    const y = item.transform ? item.transform[5] : 0;
    tokens.push({ x, y, str });
  }
  if (tokens.length === 0) return '';

  // Sort by y descending (PDF y grows upwards → larger y = earlier in
  // reading order), then group consecutive tokens within tolerance.
  const sortedByY = [...tokens].sort((a, b) => b.y - a.y);
  const rows: Tok[][] = [];
  for (const tok of sortedByY) {
    const lastRow = rows[rows.length - 1];
    if (lastRow && Math.abs(lastRow[0].y - tok.y) <= ROW_TOLERANCE_PX) {
      lastRow.push(tok);
    } else {
      rows.push([tok]);
    }
  }

  return rows
    .map((row) =>
      [...row]
        .sort((a, b) => a.x - b.x)
        .map((t) => t.str)
        .join(''),
    )
    .join('\n');
}

function toUint8Array(buffer: ArrayBuffer | Uint8Array | Buffer): Uint8Array {
  // Buffer extends Uint8Array, so the Uint8Array branch already covers it —
  // we just make sure we return a view into the same bytes rather than the
  // Buffer subclass, since pdfjs-dist sometimes rejects non-plain typed arrays.
  if (buffer instanceof Uint8Array) {
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }
  return new Uint8Array(buffer);
}

// ---------------------------------------------------------------------------
// Tabular extraction (best-effort)
// ---------------------------------------------------------------------------

export interface ParsedPdfTable {
  columns: string[];
  rows: Record<string, string>[];
  warnings: string[];
  pageCount: number;
  likelyScanned: boolean;
}

/**
 * Heuristic CSV-from-PDF. Splits on the most-frequent whitespace delimiter:
 *   - tab (\t) wins if any line contains one
 *   - otherwise 2+ consecutive spaces
 *   - otherwise single-space (least reliable; pushes a warning)
 *
 * The first non-empty line is treated as the header. Subsequent lines must
 * have the same column count to be accepted; mismatched lines are recorded
 * as warnings rather than silently dropped.
 */
export async function parsePdfTabular(
  buffer: ArrayBuffer | Uint8Array | Buffer,
): Promise<ParsedPdfTable> {
  const extracted = await extractPdfText(buffer);
  const warnings: string[] = [];

  if (extracted.likelyScanned) {
    return {
      columns: [],
      rows: [],
      warnings: ['PDF 看起來是掃描影像（純圖片），需走 OCR 流程。'],
      pageCount: extracted.pages.length,
      likelyScanned: true,
    };
  }

  // Collapse all pages into a single line list.
  const lines: string[] = [];
  for (const page of extracted.pages) {
    for (const line of page.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed.length > 0) lines.push(trimmed);
    }
  }
  if (lines.length === 0) {
    return { columns: [], rows: [], warnings, pageCount: extracted.pages.length, likelyScanned: false };
  }

  const delimiter = pickDelimiter(lines);
  if (delimiter === ' ') {
    warnings.push('未偵測到 Tab 或多空白分隔，改用單一空白；欄位推斷可能不準確。');
  }

  const splitLine = (line: string): string[] => {
    if (delimiter === '\t') return line.split('\t').map((c) => c.trim());
    if (delimiter === '  ') return line.split(/\s{2,}/).map((c) => c.trim());
    return line.split(/\s+/).map((c) => c.trim());
  };

  // Transposed table check: some legacy PDFs (e.g. 台北市里長) place field
  // names in the first column instead of the first row. Detect and rotate
  // before the standard header/row binding runs.
  if (detectTransposedTable(lines)) {
    warnings.push('偵測到轉置表（欄位名在首欄），已自動旋轉。');
    const matrix = linesToMatrix(lines);
    const { columns, rows } = transposeTable(matrix);
    const finalColumns = columns.map((cell, idx) => cell || `col_${idx + 1}`);
    // Re-key rows in case empty column names collided.
    const remapped = rows.map((row) => {
      const next: Record<string, string> = {};
      for (let i = 0; i < columns.length; i += 1) {
        next[finalColumns[i]] = row[columns[i]] ?? '';
      }
      return next;
    });
    return {
      columns: finalColumns,
      rows: remapped,
      warnings,
      pageCount: extracted.pages.length,
      likelyScanned: false,
    };
  }

  const header = splitLine(lines[0]).map((cell, idx) => cell || `col_${idx + 1}`);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitLine(lines[i]);
    if (cells.length !== header.length) {
      warnings.push(`第 ${i + 1} 行欄位數不一致（${cells.length} vs ${header.length}），已略過。`);
      continue;
    }
    const row: Record<string, string> = {};
    for (let c = 0; c < header.length; c += 1) row[header[c]] = cells[c];
    rows.push(row);
  }

  return {
    columns: header,
    rows,
    warnings,
    pageCount: extracted.pages.length,
    likelyScanned: false,
  };
}

function pickDelimiter(lines: string[]): '\t' | '  ' | ' ' {
  const sampleSize = Math.min(lines.length, 10);
  let tabHits = 0;
  let multiSpaceHits = 0;
  for (let i = 0; i < sampleSize; i += 1) {
    if (lines[i].includes('\t')) tabHits += 1;
    if (/\s{2,}/.test(lines[i])) multiSpaceHits += 1;
  }
  if (tabHits >= sampleSize / 2) return '\t';
  if (multiSpaceHits >= sampleSize / 2) return '  ';
  return ' ';
}
