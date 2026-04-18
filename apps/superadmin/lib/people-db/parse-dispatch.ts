// Dispatches a user-uploaded file to the correct tabular parser based on its
// extension. Returns a normalized `{ columns, rows }` shape plus optional
// warnings so the import routes can treat CSV / XLSX / PDF uniformly.
//
// This is the single source of truth for "what formats are supported" — the
// preview and submit routes both delegate here so the supported list cannot
// drift between endpoints.

import { parseCsv } from './csv-parse';
import { parseXlsx } from './xlsx-parse';
import { parsePdfTabular } from './pdf-parse';

export interface DispatchedParse {
  columns: string[];
  rows: Record<string, string>[];
  warnings: string[];
  // Populated when the parser detects a scanned / image-only PDF. Callers use
  // this to short-circuit with a 415 pointing the user at the OCR queue.
  likelyScanned?: boolean;
  // The normalized extension used for parsing (e.g. `.csv`). Handy for
  // logging/telemetry without re-deriving it at the call site.
  ext: SupportedExt;
}

export type SupportedExt = '.csv' | '.txt' | '.xlsx' | '.pdf';

const SUPPORTED_EXTS: readonly SupportedExt[] = ['.csv', '.txt', '.xlsx', '.pdf'] as const;

export function isSupportedExt(ext: string): ext is SupportedExt {
  return (SUPPORTED_EXTS as readonly string[]).includes(ext);
}

export function extOf(filename: string): string {
  const lower = filename.toLowerCase();
  const dot = lower.lastIndexOf('.');
  return dot === -1 ? '' : lower.slice(dot);
}

export class UnsupportedFormatError extends Error {
  ext: string;
  constructor(ext: string) {
    super(`目前支援 CSV / TXT / XLSX / PDF；${ext || '(無副檔名)'} 尚未支援`);
    this.ext = ext;
    this.name = 'UnsupportedFormatError';
  }
}

/**
 * Parses a File into a normalized tabular shape. The caller is responsible for
 * enforcing size limits; this function will happily parse whatever it gets.
 */
export async function dispatchParse(file: File): Promise<DispatchedParse> {
  const ext = extOf(file.name);
  if (!isSupportedExt(ext)) throw new UnsupportedFormatError(ext);

  if (ext === '.csv' || ext === '.txt') {
    const text = await file.text();
    const parsed = parseCsv(text);
    return { ...parsed, warnings: [], ext };
  }

  if (ext === '.xlsx') {
    const buffer = new Uint8Array(await file.arrayBuffer());
    const parsed = await parseXlsx(buffer);
    return { ...parsed, warnings: [], ext };
  }

  // .pdf
  const buffer = new Uint8Array(await file.arrayBuffer());
  const parsed = await parsePdfTabular(buffer);
  return {
    columns: parsed.columns,
    rows: parsed.rows,
    warnings: parsed.warnings,
    likelyScanned: parsed.likelyScanned,
    ext,
  };
}
