// Row 145 Sprint 3 — transposed-table detection for PDFs.
//
// 台北市里長 PDFs (and similar legacy exports) are laid out with field
// names in the first *column* and each person occupying a subsequent
// column, e.g.:
//
//     編號    305              306              307
//     姓名    闕貴卿           詹坤隆           王大明
//     地址    南港路212號2樓   中南街123號      重陽路504巷1弄9號
//
// parsePdfTabular() would otherwise treat row 0 as the header (so the
// column names become "編號" / "305" / "306" / "307") and every field
// gets attributed to the wrong person, binding 闕貴卿's address to the
// next neighbour (the classic "address shift" bug).
//
// Detection heuristic: if the first column of the split matrix contains
// ≥3 cells that match a known field-label dictionary (編號/姓名/地址 …),
// treat the table as transposed. Transposition then rotates the matrix so
// that the first column becomes the header row.

const FIELD_LABEL_DICTIONARY: ReadonlySet<string> = new Set([
  '編號',
  '姓名',
  '身分證',
  '身分證字號',
  '電話',
  '行動電話',
  '地址',
  '戶籍地址',
  '性別',
  '出生',
  '出生日期',
  '戶籍',
  '年齡',
  '備註',
  '職業',
  '里別',
  '鄰別',
]);

const DETECTION_THRESHOLD = 3;

/**
 * Splits a line into cells using the same precedence as parsePdfTabular:
 *   1. tab (\t) wins if present
 *   2. otherwise 2+ consecutive spaces
 *   3. otherwise single whitespace (least reliable)
 */
function splitLine(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map((c) => c.trim());
  if (/\s{2,}/.test(line)) return line.split(/\s{2,}/).map((c) => c.trim());
  return line.split(/\s+/).map((c) => c.trim());
}

/**
 * Returns true if `lines` look like a transposed table — i.e. the first
 * cell of each line is drawn from the known field-label dictionary, for
 * at least DETECTION_THRESHOLD lines.
 */
export function detectTransposedTable(lines: string[]): boolean {
  if (lines.length === 0) return false;
  let hits = 0;
  for (const line of lines) {
    const cells = splitLine(line);
    const first = cells[0];
    if (first && FIELD_LABEL_DICTIONARY.has(first)) hits += 1;
    if (hits >= DETECTION_THRESHOLD) return true;
  }
  return hits >= DETECTION_THRESHOLD;
}

export interface TransposedTable {
  columns: string[];
  rows: Record<string, string>[];
}

/**
 * Rotates a matrix so the first column becomes the header row. Short
 * rows (missing trailing cells) are padded with empty strings rather
 * than throwing, so ragged PDFs still yield partial data.
 */
export function transposeTable(matrix: string[][]): TransposedTable {
  if (matrix.length === 0) return { columns: [], rows: [] };

  const columns = matrix.map((row) => row[0] ?? '');
  // Record count = max(row.length) - 1. If every row has length 1 we
  // emit zero rows (the caller got column names but no data values).
  const maxCells = matrix.reduce((acc, row) => Math.max(acc, row.length), 0);
  const recordCount = Math.max(0, maxCells - 1);

  const rows: Record<string, string>[] = [];
  for (let r = 0; r < recordCount; r += 1) {
    const record: Record<string, string> = {};
    for (let c = 0; c < matrix.length; c += 1) {
      const column = columns[c];
      const value = matrix[c][r + 1] ?? '';
      record[column] = value;
    }
    rows.push(record);
  }

  return { columns, rows };
}

/**
 * Convenience: splits raw `lines` into a matrix using the same heuristic
 * as detectTransposedTable, so callers that already decided to transpose
 * don't have to duplicate the split logic.
 */
export function linesToMatrix(lines: string[]): string[][] {
  return lines.map(splitLine);
}
