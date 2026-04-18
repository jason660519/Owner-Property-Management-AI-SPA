// Row 145 Sprint 2 — MDB / ACCDB parser via mdbtools shell-out.
//
// Microsoft Access stores tables in a proprietary Jet engine format. There
// is no pure-JS reader; the de-facto standard is the `mdbtools` CLI suite
// (mdb-tables, mdb-export). On macOS:    brew install mdbtools
//                                  Linux: apt install mdbtools
//
// Strategy:
//   1. `mdb-tables -1 <file>`   → list user tables one per line
//   2. for each table:
//        `mdb-export -d , -q '"' <file> <table>` → CSV (RFC 4180-ish)
//   3. parse CSV, accumulate rows. Each row gets a synthetic `__table` key
//      so the import-mapper can dispatch per-table (e.g. addresses vs people).
//
// Failure modes:
//   - mdbtools not installed → ParserFailureError with install hint
//   - corrupt mdb / new .accdb format → mdb-tables exits non-zero
//   - ACCDB (Jet 4 / ACE) is partially supported by mdbtools 1.0+; we let
//     it try and surface the stderr if it fails. The worker dead-letters.

import { spawn } from 'node:child_process';
import { parseCsv } from '../csv-parse';

import { ParserFailureError, type ParseResult } from './types';

// Bound the subprocess so a hung mdb-export does not stall the whole worker.
const SUBPROCESS_TIMEOUT_MS = 5 * 60 * 1000;

interface SpawnResult {
  stdout: string;
  stderr: string;
  code: number;
}

/**
 * Runs a command to completion and collects stdout/stderr. Rejects only on
 * spawn failure (e.g. ENOENT). Non-zero exit codes resolve so the caller can
 * surface stderr in the error message.
 */
// V8 has a ~512 MB hard cap on string length; unbounded concat of stdout/
// stderr on a corrupt mdb (mdb-tools spams "Page X is not a ..." per block)
// can blow past it and take the whole worker down with a RangeError. Cap
// both streams well below that — we only ever read the tail for error
// messages and the head/first-few-tables' worth for CSV.
const STDOUT_CAP_BYTES = 256 * 1024 * 1024; // 256 MB — fits the biggest legit mdb we've seen (~380k rows)
const STDERR_CAP_BYTES = 2 * 1024 * 1024; // 2 MB — error text; anything beyond is just noise

function runCommand(
  cmd: string,
  args: string[],
  opts: { timeoutMs?: number } = {},
): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    let stdoutLen = 0;
    let stderrLen = 0;
    let stdoutOverflow = false;
    let stderrOverflow = false;
    let killedByTimeout = false;
    let killedByOverflow = false;

    const timer = setTimeout(() => {
      killedByTimeout = true;
      child.kill('SIGKILL');
    }, opts.timeoutMs ?? SUBPROCESS_TIMEOUT_MS);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      if (stdoutOverflow) return;
      if (stdoutLen + chunk.length > STDOUT_CAP_BYTES) {
        stdoutOverflow = true;
        killedByOverflow = true;
        child.kill('SIGKILL');
        return;
      }
      stdoutChunks.push(chunk);
      stdoutLen += chunk.length;
    });
    child.stderr.on('data', (chunk: string) => {
      if (stderrOverflow) return;
      if (stderrLen + chunk.length > STDERR_CAP_BYTES) {
        stderrOverflow = true;
        // Stderr alone shouldn't kill the process — mdb-tools keeps writing
        // to stdout even when stderr is noisy. We just stop collecting.
        return;
      }
      stderrChunks.push(chunk);
      stderrLen += chunk.length;
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (killedByTimeout) {
        reject(new Error(`${cmd} timed out after ${SUBPROCESS_TIMEOUT_MS}ms`));
        return;
      }
      if (killedByOverflow) {
        reject(
          new Error(
            `${cmd} produced > ${STDOUT_CAP_BYTES >> 20} MB of output — aborted to avoid OOM`,
          ),
        );
        return;
      }
      const stdout = stdoutChunks.join('');
      let stderr = stderrChunks.join('');
      if (stderrOverflow) stderr += `\n...[stderr truncated at ${STDERR_CAP_BYTES} bytes]`;
      resolve({ stdout, stderr, code: code ?? -1 });
    });
  });
}

async function listTables(filePath: string): Promise<string[]> {
  let result: SpawnResult;
  try {
    result = await runCommand('mdb-tables', ['-1', filePath]);
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === 'ENOENT') {
      throw new ParserFailureError(
        'mdb',
        'mdbtools not installed. Run: brew install mdbtools (macOS) or apt install mdbtools (Linux).',
        err,
      );
    }
    throw new ParserFailureError('mdb', `mdb-tables spawn failed: ${e.message}`, err);
  }
  if (result.code !== 0) {
    throw new ParserFailureError(
      'mdb',
      `mdb-tables exited with code ${result.code}: ${result.stderr.trim() || '(no stderr)'}`,
    );
  }
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

async function exportTable(filePath: string, table: string): Promise<string> {
  // -d , : comma delimiter
  // -q " : quote char (so embedded commas survive CSV reparse)
  //
  // NOTE: mdbtools' `-H` flag is **suppress** header, not include. We want
  // the header row so parseCsv can name the columns correctly; default
  // behavior (no flag) includes it.
  const result = await runCommand('mdb-export', ['-d', ',', '-q', '"', filePath, table]);
  if (result.code !== 0) {
    throw new ParserFailureError(
      'mdb',
      `mdb-export "${table}" exited with code ${result.code}: ${result.stderr.trim() || '(no stderr)'}`,
    );
  }
  return result.stdout;
}

/**
 * Parses every user table in the given .mdb / .accdb file and returns a flat
 * row list. Each row has an extra `__table` key so downstream consumers can
 * distinguish records that originated from different tables in the same DB.
 */
export async function parseMdb(filePath: string): Promise<ParseResult> {
  const tables = await listTables(filePath);
  if (tables.length === 0) {
    return {
      rows: [],
      row_count: 0,
      parser: 'mdb',
      warnings: ['mdb file contains no user tables'],
      columns: [],
    };
  }

  const allRows: Record<string, string>[] = [];
  const warnings: string[] = [];
  const allColumns = new Set<string>();
  allColumns.add('__table');

  for (const table of tables) {
    let csv: string;
    try {
      csv = await exportTable(filePath, table);
    } catch (err) {
      // One bad table should not poison the whole DB; warn and continue so
      // the worker can ingest what it can. The dead-letter row will surface
      // any tables that failed for an admin to inspect.
      warnings.push(
        `failed to export table "${table}": ${(err as Error).message}`,
      );
      continue;
    }
    if (!csv.trim()) {
      warnings.push(`table "${table}" is empty`);
      continue;
    }
    const parsed = parseCsv(csv);
    for (const col of parsed.columns) allColumns.add(col);
    for (const row of parsed.rows) {
      allRows.push({ __table: table, ...row });
    }
  }

  return {
    rows: allRows,
    row_count: allRows.length,
    parser: 'mdb',
    warnings,
    columns: Array.from(allColumns),
  };
}
