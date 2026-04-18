/**
 * @jest-environment node
 */
// Row 145 Sprint 2 — mdb parser tests. We mock child_process.spawn so the
// suite runs without requiring `brew install mdbtools` on every dev box and
// in CI. Two integration-style cases (real fixture under /Volumes) live in
// `mdb.integration.test.ts` and are skipped by jest's testPathIgnorePatterns.

import { EventEmitter } from 'node:events';

const spawnMock = jest.fn();
jest.mock('node:child_process', () => ({
  spawn: (...args: unknown[]) => spawnMock(...args),
}));

import { parseMdb } from '../mdb';
import { ParserFailureError } from '../types';

interface FakeChildOpts {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  spawnError?: NodeJS.ErrnoException;
}

// Builds a minimal ChildProcess-shaped object that emits the configured
// stdout/stderr then closes with the given code on next tick.
function makeFakeChild({ stdout = '', stderr = '', exitCode = 0, spawnError }: FakeChildOpts) {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter & { setEncoding: (e: string) => void };
    stderr: EventEmitter & { setEncoding: (e: string) => void };
    kill: (sig: string) => void;
  };
  child.stdout = Object.assign(new EventEmitter(), { setEncoding: () => undefined });
  child.stderr = Object.assign(new EventEmitter(), { setEncoding: () => undefined });
  child.kill = () => undefined;

  setImmediate(() => {
    if (spawnError) {
      child.emit('error', spawnError);
      return;
    }
    if (stdout) child.stdout.emit('data', stdout);
    if (stderr) child.stderr.emit('data', stderr);
    child.emit('close', exitCode);
  });
  return child;
}

beforeEach(() => {
  spawnMock.mockReset();
});

describe('parseMdb', () => {
  it('lists tables then exports each as CSV', async () => {
    spawnMock
      // mdb-tables -1 file.mdb  -> two tables
      .mockImplementationOnce(() => makeFakeChild({ stdout: 'people\naddresses\n' }))
      // mdb-export file.mdb people
      .mockImplementationOnce(() =>
        makeFakeChild({ stdout: 'name,phone\n王小明,0912\n李大華,0922\n' }),
      )
      // mdb-export file.mdb addresses
      .mockImplementationOnce(() =>
        makeFakeChild({ stdout: 'street,city\n南港路 212 號 2 樓,台北\n' }),
      );

    const result = await parseMdb('/fake/file.mdb');

    expect(result.parser).toBe('mdb');
    expect(result.row_count).toBe(3);
    expect(result.warnings).toEqual([]);
    expect(result.rows).toEqual([
      { __table: 'people', name: '王小明', phone: '0912' },
      { __table: 'people', name: '李大華', phone: '0922' },
      { __table: 'addresses', street: '南港路 212 號 2 樓', city: '台北' },
    ]);
    expect(result.columns).toEqual(
      expect.arrayContaining(['__table', 'name', 'phone', 'street', 'city']),
    );
  });

  it('raises ParserFailureError with install hint when mdbtools is missing', async () => {
    const enoent = Object.assign(new Error('spawn mdb-tables ENOENT'), {
      code: 'ENOENT',
    }) as NodeJS.ErrnoException;
    // mockImplementation (not -Once) so both expect().rejects calls below
    // get the same child, since each .rejects awaits a fresh parseMdb call.
    spawnMock.mockImplementation(() => makeFakeChild({ spawnError: enoent }));

    await expect(parseMdb('/fake/file.mdb')).rejects.toBeInstanceOf(ParserFailureError);
    await expect(parseMdb('/fake/file.mdb')).rejects.toThrow(/brew install mdbtools/);
  });

  it('raises ParserFailureError when mdb-tables exits non-zero', async () => {
    spawnMock.mockImplementationOnce(() =>
      makeFakeChild({ stdout: '', stderr: 'corrupt header', exitCode: 1 }),
    );
    await expect(parseMdb('/fake/file.mdb')).rejects.toThrow(/mdb-tables exited with code 1/);
  });

  it('warns and continues when one table export fails (other tables ingest)', async () => {
    spawnMock
      .mockImplementationOnce(() => makeFakeChild({ stdout: 'good\nbad\n' }))
      .mockImplementationOnce(() => makeFakeChild({ stdout: 'a,b\n1,2\n' }))
      .mockImplementationOnce(() =>
        makeFakeChild({ stdout: '', stderr: 'memo file missing', exitCode: 2 }),
      );

    const result = await parseMdb('/fake/file.mdb');
    expect(result.row_count).toBe(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/failed to export table "bad"/);
  });

  it('returns empty result with warning when mdb has no user tables', async () => {
    spawnMock.mockImplementationOnce(() => makeFakeChild({ stdout: '\n  \n' }));
    const result = await parseMdb('/fake/file.mdb');
    expect(result.row_count).toBe(0);
    expect(result.rows).toEqual([]);
    expect(result.warnings).toEqual(['mdb file contains no user tables']);
  });

  // Regression guard: mdbtools' `-H` flag means **suppress** header, not
  // include. Earlier code incorrectly passed `-H`, causing the first data row
  // to be treated as the CSV header. The parser must NOT pass `-H`.
  it('regression: never passes -H to mdb-export (that flag suppresses header)', async () => {
    spawnMock
      .mockImplementationOnce(() => makeFakeChild({ stdout: 'T\n' }))
      .mockImplementationOnce(() => makeFakeChild({ stdout: 'col1,col2\nv1,v2\n' }));
    await parseMdb('/fake/file.mdb');
    // Second call is the mdb-export invocation
    const exportCall = spawnMock.mock.calls[1];
    const exportArgs = exportCall[1] as string[];
    expect(exportArgs).not.toContain('-H');
    expect(exportArgs).not.toContain('--no-header');
  });

  it('warns when a table is empty (header but no rows)', async () => {
    spawnMock
      .mockImplementationOnce(() => makeFakeChild({ stdout: 'empty\n' }))
      .mockImplementationOnce(() => makeFakeChild({ stdout: '   \n' }));
    const result = await parseMdb('/fake/file.mdb');
    expect(result.row_count).toBe(0);
    expect(result.warnings).toEqual(['table "empty" is empty']);
  });
});
