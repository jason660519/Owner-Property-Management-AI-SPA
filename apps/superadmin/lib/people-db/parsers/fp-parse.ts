// Row 145 Sprint 2 — FinePrint .fp parser.
//
// Pipeline:
//   .fp file  ─►  python3 tools/fp-converter/convert_fp.py --format json
//             ─►  FpDocument JSON (header + sections with labeled fields)
//             ─►  extractPeopleFromFpDoc()
//             ─►  PeopleRow[]   (one row per 所有權人 / 設定權利人 / 設定義務人)
//
// Each land-registry transcript carries two to five people-db rows:
//   • one per 所有權人 in 建物所有權部 / 土地所有權部 (1..N co-owners)
//   • one per 設定權利人 / 設定義務人 in 他項權利部 (mortgage counterparties)
//
// The pure `extractPeopleFromFpDoc` is the testable core. `parseFpFile`
// shells out to Python and is a thin wrapper around it; integration tests
// exercise it against real .fp fixtures on the dev drive.

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Document shape — mirrors convert_fp.py build_json() output
// ---------------------------------------------------------------------------

export interface FpField {
  label: string;
  value: string;
}

export interface FpSection {
  name: string;
  fields: FpField[];
}

export interface FpDocument {
  source_file: string;
  header: string[];
  sections: FpSection[];
}

// ---------------------------------------------------------------------------
// Output shape — aligned with import-mapper FIELD_KEYS so the rows drop into
// the same bulk-index path as CSV/XLSX rows.
// ---------------------------------------------------------------------------

export interface PeopleRow {
  full_name: string;
  address: string | null;
  title_position: '所有權人' | '設定權利人' | '設定義務人';
  note: string | null;
  // Audit breadcrumb — which section inside the transcript this row came from.
  // Not written to ES; useful for debugging during dev / monitoring UI.
  source_section: string;
}

// Label -> title_position mapping. Order matters: we check fields in the
// section in order; each owner/party label opens a new "person group" whose
// subsequent 住址 / 權狀字號 / 登記日期 fields attach to that person.
const PARTY_LABELS: Record<string, PeopleRow['title_position']> = {
  所有權人: '所有權人',
  設定權利人: '設定權利人',
  設定義務人: '設定義務人',
};

// Ownership-part section names — we only attach 權狀字號 provenance to
// owner rows (not mortgage parties, since that doesn't apply).
const OWNERSHIP_SECTIONS = new Set([
  '建物所有權部',
  '土地所有權部',
]);

/**
 * Walks a parsed .fp document and emits one PeopleRow per named party
 * (owner, creditor, debtor). Fields that belong to a party — their 住址,
 * their 權狀字號, the transcript's 登記日期 — are attached via simple
 * forward-scan within each section.
 */
export function extractPeopleFromFpDoc(doc: FpDocument): PeopleRow[] {
  const rows: PeopleRow[] = [];

  for (const section of doc.sections) {
    // Per-section scan: each occurrence of a party label starts a new row.
    // Until the next party label, subsequent labeled fields populate the
    // current row's attributes.
    let current: PeopleRow | null = null;
    let pendingDate: string | null = null;
    let pendingDeed: string | null = null;
    const isOwnershipSection = OWNERSHIP_SECTIONS.has(section.name);

    const flushCurrent = (): void => {
      if (!current) return;
      const name = current.full_name.trim();
      if (!name) {
        current = null;
        return;
      }
      const noteParts: string[] = [];
      if (pendingDeed) noteParts.push(pendingDeed);
      if (pendingDate) noteParts.push(pendingDate);
      current.note = noteParts.length > 0 ? noteParts.join(' ｜ ') : null;
      rows.push({ ...current, full_name: name });
      current = null;
    };

    for (const field of section.fields) {
      const partyType = PARTY_LABELS[field.label];

      if (partyType) {
        flushCurrent();
        current = {
          full_name: field.value,
          address: null,
          title_position: partyType,
          note: null,
          source_section: section.name,
        };
        continue;
      }

      // Field belongs to the most recently opened person (if any).
      if (!current) {
        // Collect top-level date / deed info so we can attach it to the
        // first party we see in this section. `登記日期` appears both at
        // the section top and alongside 登記次序 for each row; we grab
        // whichever comes before the first party.
        if (field.label === '登記日期') pendingDate = field.value;
        if (field.label === '權狀字號' && isOwnershipSection) pendingDeed = field.value;
        continue;
      }

      switch (field.label) {
        case '住址':
          if (!current.address) current.address = field.value;
          break;
        case '登記日期':
          pendingDate = field.value;
          break;
        case '權狀字號':
          if (isOwnershipSection) pendingDeed = field.value;
          break;
        default:
          // Non-person labels (權利範圍, 登記原因, etc) don't become people
          // row attributes; they stay in the document but aren't indexed here.
          break;
      }
    }

    flushCurrent();
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Python bridge — spawn convert_fp.py and read JSON from disk. We use file
// output (not stdout) because the Python CLI was designed file-first; stdout
// would require refactoring the Python side more than it's worth.
// ---------------------------------------------------------------------------

const DEFAULT_PYTHON = process.env.PEOPLE_DB_PYTHON ?? 'python3';
// Resolved relative to this file so it works regardless of cwd.
const FP_SCRIPT = resolve(__dirname, '../../../../../tools/fp-converter/convert_fp.py');

export interface ParseFpResult {
  document: FpDocument;
  rows: PeopleRow[];
  warnings: string[];
}

export class FpConverterError extends Error {
  exitCode: number | null;
  stderr: string;
  constructor(message: string, exitCode: number | null, stderr: string) {
    super(message);
    this.name = 'FpConverterError';
    this.exitCode = exitCode;
    this.stderr = stderr;
  }
}

/**
 * Runs convert_fp.py on a single .fp file and returns both the structured
 * document and the extracted people rows. Throws FpConverterError if the
 * Python script fails or if no JSON output is produced.
 *
 * Writes the JSON to a caller-provided scratch dir so concurrent workers
 * don't stomp on each other. Delete the dir after processing if cleanup
 * matters to the caller.
 */
export async function parseFpFile(
  inputPath: string,
  scratchDir: string,
): Promise<ParseFpResult> {
  await new Promise<void>((resolveSpawn, reject) => {
    const proc = spawn(
      DEFAULT_PYTHON,
      [FP_SCRIPT, inputPath, '--format', 'json', '--output', scratchDir],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let stderr = '';
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolveSpawn();
      else reject(new FpConverterError(`convert_fp.py exited ${code}`, code, stderr));
    });
  });

  // convert_fp.py names its output after the input stem.
  const { basename, extname, join } = await import('node:path');
  const { readFile } = await import('node:fs/promises');
  const stem = basename(inputPath, extname(inputPath));
  const jsonPath = join(scratchDir, `${stem}.json`);

  let raw: string;
  try {
    raw = await readFile(jsonPath, 'utf8');
  } catch (err) {
    throw new FpConverterError(
      `convert_fp.py produced no JSON at ${jsonPath}`,
      0,
      (err as Error).message,
    );
  }

  const document = JSON.parse(raw) as FpDocument;
  const rows = extractPeopleFromFpDoc(document);
  const warnings: string[] = [];
  if (rows.length === 0) {
    warnings.push(
      'No party labels (所有權人 / 設定權利人 / 設定義務人) found — transcript may be '
        + 'a 標示部-only extract or a damaged file.',
    );
  }
  return { document, rows, warnings };
}
