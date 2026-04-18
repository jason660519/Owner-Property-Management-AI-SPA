// PDF text extraction for people-database imports. Built on the project's
// existing `pdfjs-dist` dep (no new packages). Two-tier strategy:
//
//   1. extractPdfText() pulls the raw text streams page-by-page. Useful for
//      small previews and as the input to the tabular parser.
//   2. parsePdfTabular() takes those page strings and applies a *very*
//      conservative line/column heuristic to recover a CSV-shaped table.
//      Returns warnings so the UI can flag rows that don't split cleanly.
//
// Scanned-only PDFs (image-based) come back with effectively zero glyph
// strings; we surface a `likelyScanned` flag so the route handler can short-
// circuit and direct users to the OCR queue (Sprint 5b OpenClaw integration).

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
  // Disable worker spawning entirely - all parsing happens on the main thread
  // inside the route handler. This avoids needing a worker entry file shipped
  // with the Next.js server bundle.
  if (mod.GlobalWorkerOptions) mod.GlobalWorkerOptions.workerSrc = '';
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

function stitchTextItems(items: PdfTextItem[]): string {
  // pdfjs returns items in reading order but does not insert newlines between
  // text runs on different baselines. We approximate line breaks by tracking
  // the y-coordinate (transform[5]) and inserting `\n` when it changes.
  const lines: string[] = [];
  let currentLine = '';
  let lastY: number | null = null;
  for (const item of items) {
    const str = item.str ?? '';
    const y = item.transform ? item.transform[5] : null;
    if (lastY !== null && y !== null && Math.abs(y - lastY) > 1) {
      lines.push(currentLine);
      currentLine = '';
    }
    currentLine += str;
    if (y !== null) lastY = y;
  }
  if (currentLine.length > 0) lines.push(currentLine);
  return lines.join('\n');
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
