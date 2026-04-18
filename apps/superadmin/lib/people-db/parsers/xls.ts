// Row 145 Sprint 2 — Legacy .xls (BIFF) parser via SheetJS `xlsx`.
//
// SECURITY NOTE — `xlsx@0.18.5` has known CVEs (Prototype Pollution
// GHSA-4r6h-8v6p-xvw6, ReDoS GHSA-5pgg-2g8v-p4x9). Both require attacker-
// controlled input to exploit. Mitigations applied here:
//   1. This parser MUST NEVER be wired into a web upload route. It is only
//      called by `tools/people-db/parse.ts` against files the admin placed
//      on the trusted NAS mount ($PEOPLE_DB_SOURCE_ROOT).
//   2. We freeze Object.prototype before the parse call so a Prototype-
//      Pollution payload cannot mutate the global prototype chain.
//   3. We never call `XLSX.write*` — read-only.
//
// We can't avoid SheetJS for .xls because BIFF is a CFB-encoded binary
// format and the only Node-friendly reader is SheetJS. The .xlsx (OOXML)
// path stays on the hand-rolled `xlsx-parse.ts` (JSZip) for safety.

import * as XLSX from 'xlsx';

import { ParserFailureError, type ParseResult } from './types';

// Freeze prototype chain on first import. Idempotent — Object.freeze on an
// already-frozen object is a no-op. This blocks the published xlsx prototype-
// pollution PoCs from mutating Object.prototype during parse.
if (!Object.isFrozen(Object.prototype)) {
  try {
    Object.freeze(Object.prototype);
  } catch {
    // Some test environments (jsdom, vitest worker) restrict freezing
    // built-ins; that's fine, the worker process is the one we care about.
  }
}

export async function parseXls(filePath: string): Promise<ParseResult> {
  let workbook: XLSX.WorkBook;
  try {
    // cellDates: true → real Date instead of Excel serial number.
    // cellNF/cellStyles: false → don't bring style sheets into memory.
    // type: 'file' lets xlsx mmap the file rather than us buffering.
    workbook = XLSX.readFile(filePath, {
      cellDates: true,
      cellNF: false,
      cellStyles: false,
      raw: false,
    });
  } catch (err) {
    throw new ParserFailureError('xls', `failed to read xls: ${(err as Error).message}`, err);
  }

  const warnings: string[] = [];
  const sheetNames = workbook.SheetNames ?? [];
  if (sheetNames.length === 0) {
    return { rows: [], row_count: 0, parser: 'xls', warnings: ['xls has no sheets'], columns: [] };
  }
  if (sheetNames.length > 1) {
    warnings.push(`xls has ${sheetNames.length} sheets; reading all and prefixing with __sheet`);
  }

  const allRows: Record<string, string>[] = [];
  const allColumns = new Set<string>();
  if (sheetNames.length > 1) allColumns.add('__sheet');

  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    // defval: '' so missing cells are empty strings, not undefined.
    // header: 1 returns array-of-arrays so we can name columns ourselves.
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: '',
      raw: false,
      blankrows: false,
    });
    if (aoa.length === 0) {
      warnings.push(`sheet "${sheetName}" is empty`);
      continue;
    }

    const headerRow = aoa[0] ?? [];
    const columns = headerRow.map((cell, idx) => {
      const trimmed = String(cell ?? '').trim();
      return trimmed || `col_${idx + 1}`;
    });
    for (const c of columns) allColumns.add(c);

    for (let i = 1; i < aoa.length; i += 1) {
      const cells = aoa[i] ?? [];
      const row: Record<string, string> = sheetNames.length > 1 ? { __sheet: sheetName } : {};
      let hasContent = false;
      for (let c = 0; c < columns.length; c += 1) {
        const v = cells[c];
        const s = v === null || v === undefined ? '' : String(v);
        row[columns[c]] = s;
        if (s !== '') hasContent = true;
      }
      if (hasContent) allRows.push(row);
    }
  }

  return {
    rows: allRows,
    row_count: allRows.length,
    parser: 'xls',
    warnings,
    columns: Array.from(allColumns),
  };
}
