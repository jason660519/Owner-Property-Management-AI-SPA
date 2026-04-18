// Minimal .xlsx reader built on top of `jszip` (already a project dep). We
// only need to read the FIRST worksheet of OOXML SpreadsheetML files, the
// way users export from Excel/Google Sheets/Numbers. Skipping `xlsx`/`exceljs`
// keeps the attack surface small (no historical CVEs to chase) and avoids a
// 500kB+ dependency for what amounts to an unzip + two XML scans.
//
// Supported:
//   - shared strings (`<c t="s"><v>idx</v></c>`)
//   - inline strings (`<c t="inlineStr"><is><t>...</t></is></c>` and
//     `<c t="str"><v>...</v></c>`)
//   - numbers / booleans / dates (treated as their text representation)
//   - cell-letter -> column index (handles gaps like A,C,E)
//
// NOT supported (intentional - Sprint 5 scope):
//   - Multi-sheet picking (always first sheet via workbook.xml)
//   - Style/format-aware date parsing (returns the raw serial number string)
//   - Streaming (whole file is unzipped into memory)
//   - .xls (legacy binary BIFF - would need a separate parser)

import JSZip from 'jszip';

export interface ParsedXlsx {
  columns: string[];
  rows: Record<string, string>[];
}

export async function parseXlsx(buffer: ArrayBuffer | Uint8Array | Buffer): Promise<ParsedXlsx> {
  const zip = await JSZip.loadAsync(buffer);

  // Resolve which sheet file to read. The default Excel layout points to
  // xl/worksheets/sheet1.xml; we honor workbook.xml.rels when present so
  // files exported from Numbers/LibreOffice with non-standard ordering still
  // work.
  const sheetPath = await resolveFirstSheetPath(zip);
  const sheetXml = await readZipText(zip, sheetPath);
  if (!sheetXml) return { columns: [], rows: [] };

  const sharedStrings = await readSharedStrings(zip);
  const records = parseSheetXml(sheetXml, sharedStrings);
  return recordsToTable(records);
}

// ---------------------------------------------------------------------------
// File resolution
// ---------------------------------------------------------------------------

async function resolveFirstSheetPath(zip: JSZip): Promise<string> {
  // Try to read the workbook to pick the first <sheet> entry, then map via
  // workbook.xml.rels. Fall back to the canonical sheet1.xml when those files
  // are missing (some minimal generators skip the rels file).
  const workbookXml = await readZipText(zip, 'xl/workbook.xml');
  const relsXml = await readZipText(zip, 'xl/_rels/workbook.xml.rels');
  if (workbookXml && relsXml) {
    const sheetMatch = workbookXml.match(/<sheet[^/]*r:id="([^"]+)"/);
    if (sheetMatch) {
      const rid = sheetMatch[1];
      const relMatch = relsXml.match(
        new RegExp(`<Relationship[^>]*Id="${rid}"[^>]*Target="([^"]+)"`),
      );
      if (relMatch) {
        const target = relMatch[1];
        const normalized = target.startsWith('/')
          ? target.slice(1)
          : target.startsWith('xl/')
            ? target
            : `xl/${target}`;
        if (zip.file(normalized)) return normalized;
      }
    }
  }
  return 'xl/worksheets/sheet1.xml';
}

async function readZipText(zip: JSZip, path: string): Promise<string | null> {
  const file = zip.file(path);
  if (!file) return null;
  return file.async('string');
}

async function readSharedStrings(zip: JSZip): Promise<string[]> {
  const xml = await readZipText(zip, 'xl/sharedStrings.xml');
  if (!xml) return [];
  // Each <si> can hold a single <t> (plain) or rich-text runs (<r><t>...).
  // We concatenate all <t> text inside the <si> to recover the displayed value.
  const result: string[] = [];
  for (const siMatch of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    const inner = siMatch[1];
    const parts: string[] = [];
    for (const tMatch of inner.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)) {
      parts.push(decodeXmlEntities(tMatch[1]));
    }
    result.push(parts.join(''));
  }
  return result;
}

// ---------------------------------------------------------------------------
// Sheet parsing
// ---------------------------------------------------------------------------

interface CellEntry {
  col: number; // 0-based column index
  value: string;
}

function parseSheetXml(xml: string, sharedStrings: string[]): CellEntry[][] {
  const records: CellEntry[][] = [];
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: CellEntry[] = [];
    const cellPattern = /<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^/]*)\/>/g;
    for (const cellMatch of rowMatch[1].matchAll(cellPattern)) {
      const attrs = cellMatch[1] ?? cellMatch[3] ?? '';
      const inner = cellMatch[2] ?? '';
      const ref = /r="([A-Z]+)\d+"/.exec(attrs);
      const type = /t="([^"]+)"/.exec(attrs);
      const col = ref ? columnLetterToIndex(ref[1]) : cells.length;
      const value = readCellValue(type?.[1] ?? '', inner, sharedStrings);
      if (value !== '') cells.push({ col, value });
    }
    records.push(cells);
  }
  return records;
}

function readCellValue(type: string, inner: string, sharedStrings: string[]): string {
  if (type === 's') {
    const v = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(inner);
    if (!v) return '';
    const idx = Number.parseInt(v[1], 10);
    return sharedStrings[idx] ?? '';
  }
  if (type === 'inlineStr') {
    const parts: string[] = [];
    for (const m of inner.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)) {
      parts.push(decodeXmlEntities(m[1]));
    }
    return parts.join('');
  }
  // 'str' (formula string), 'b' (boolean), 'n' (number, default), or no type
  // -> take whatever is inside <v>.
  const v = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(inner);
  return v ? decodeXmlEntities(v[1]) : '';
}

function columnLetterToIndex(letters: string): number {
  let result = 0;
  for (let i = 0; i < letters.length; i += 1) {
    result = result * 26 + (letters.charCodeAt(i) - 64);
  }
  return result - 1;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&amp;/g, '&'); // last so we don't double-decode &amp;lt;
}

// ---------------------------------------------------------------------------
// Records -> tabular shape (header row + named-rows)
// ---------------------------------------------------------------------------

function recordsToTable(records: CellEntry[][]): ParsedXlsx {
  if (records.length === 0) return { columns: [], rows: [] };

  // Compute the widest row so columns align even when xlsx omits trailing
  // empty cells (which it almost always does).
  let width = 0;
  for (const cells of records) {
    for (const cell of cells) if (cell.col + 1 > width) width = cell.col + 1;
  }

  const headerCells = expandRow(records[0], width);
  const columns = headerCells.map((cell, idx) => cell.trim() || `col_${idx + 1}`);

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < records.length; i += 1) {
    const cells = expandRow(records[i], width);
    if (cells.every((c) => c === '')) continue; // skip empty rows
    const row: Record<string, string> = {};
    for (let c = 0; c < columns.length; c += 1) {
      row[columns[c]] = cells[c] ?? '';
    }
    rows.push(row);
  }
  return { columns, rows };
}

function expandRow(cells: CellEntry[], width: number): string[] {
  const out: string[] = new Array(width).fill('');
  for (const cell of cells) {
    if (cell.col >= 0 && cell.col < width) out[cell.col] = cell.value;
  }
  return out;
}
