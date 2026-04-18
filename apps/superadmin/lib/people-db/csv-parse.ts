// Minimal RFC 4180-ish CSV parser. No external deps (xlsx has had CVEs and
// adds 500kB+; CSV covers the bulk of Row 144 source files).
//
// Handles: quoted fields, escaped quotes (""), embedded commas/newlines inside
// quotes, CRLF + LF, BOM stripping.
// Does NOT handle: custom delimiters (always `,`), streaming (full buffer).

export interface ParsedCsv {
  columns: string[];
  rows: Record<string, string>[];
}

export function parseCsv(raw: string): ParsedCsv {
  const text = stripBom(raw);
  const records = tokenize(text);
  if (records.length === 0) return { columns: [], rows: [] };

  const header = records[0].map((cell, idx) => cell || `col_${idx + 1}`);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < records.length; i += 1) {
    const record = records[i];
    if (record.length === 1 && record[0] === '') continue; // skip blank lines
    const row: Record<string, string> = {};
    for (let c = 0; c < header.length; c += 1) {
      row[header[c]] = record[c] ?? '';
    }
    rows.push(row);
  }
  return { columns: header, rows };
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function tokenize(text: string): string[][] {
  const records: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (ch === '\r') {
      if (text[i + 1] === '\n') i += 1;
      row.push(field);
      records.push(row);
      field = '';
      row = [];
      i += 1;
      continue;
    }
    if (ch === '\n') {
      row.push(field);
      records.push(row);
      field = '';
      row = [];
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  // flush trailing
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }
  return records;
}
