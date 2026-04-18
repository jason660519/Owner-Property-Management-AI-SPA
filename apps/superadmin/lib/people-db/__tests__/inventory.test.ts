// Row 145 Sprint 1 — File Inventory pure functions.
// TDD: these tests are written before the implementation per
// project-process/features/people-db-bulk-ingestion-tdd-spec-20260418.md.

import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import {
  classifyStatus,
  computeSha256Stream,
  deriveDatasetRoot,
  detectMimeByExt,
  planFileAction,
  reclassifyIfStale,
  shouldReparse,
} from '../inventory';

describe('computeSha256Stream', () => {
  it('matches crypto.createHash for a 1 KB buffer', async () => {
    const buf = Buffer.alloc(1024, 'a');
    const expected = createHash('sha256').update(buf).digest('hex');
    const got = await computeSha256Stream(Readable.from([buf]));
    expect(got).toBe(expected);
  });

  it('handles multi-chunk streams correctly', async () => {
    const chunks = [Buffer.from('hello '), Buffer.from('world'), Buffer.from('!')];
    const expected = createHash('sha256').update(Buffer.concat(chunks)).digest('hex');
    const got = await computeSha256Stream(Readable.from(chunks));
    expect(got).toBe(expected);
  });

  it('keeps memory bounded for large streams (> 256 MB synthetic)', async () => {
    // Simulate 512 chunks of 1 MB each via a generator; we never hold the full
    // stream in memory. We sanity-check peak heap stays under 100 MB above the
    // pre-test baseline — enough to catch accidental buffering.
    const chunkCount = 512;
    const chunkSize = 1024 * 1024;
    async function* gen(): AsyncGenerator<Buffer> {
      for (let i = 0; i < chunkCount; i += 1) {
        yield Buffer.alloc(chunkSize, i % 256);
      }
    }
    const baseline = process.memoryUsage().heapUsed;
    const hash = await computeSha256Stream(Readable.from(gen()));
    const peak = process.memoryUsage().heapUsed;
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(peak - baseline).toBeLessThan(100 * 1024 * 1024);
  }, 30_000);
});

describe('deriveDatasetRoot', () => {
  const ROOT = '/Volumes/KLEVV-4T-2/台灣尋人資料庫';

  it('extracts top-level folder as dataset_root, no subpath for single-depth file', () => {
    const result = deriveDatasetRoot(`${ROOT}/台北市里長/11051723680.pdf`, ROOT);
    expect(result).toEqual({ dataset_root: '台北市里長', dataset_subpath: null });
  });

  it('extracts subpath for nested folders', () => {
    const result = deriveDatasetRoot(`${ROOT}/企業名錄/2012/三萬/a.xls`, ROOT);
    expect(result).toEqual({ dataset_root: '企業名錄', dataset_subpath: '2012/三萬' });
  });

  it('normalises trailing slashes in root argument', () => {
    const result = deriveDatasetRoot(`${ROOT}/謄本資料18G/2013/a.mdb`, `${ROOT}/`);
    expect(result).toEqual({ dataset_root: '謄本資料18G', dataset_subpath: '2013' });
  });

  it('throws if path is not under root', () => {
    expect(() => deriveDatasetRoot('/tmp/foo.pdf', ROOT)).toThrow(/not under source root/i);
  });

  it('throws if path equals root (no dataset folder)', () => {
    expect(() => deriveDatasetRoot(ROOT, ROOT)).toThrow(/dataset root/i);
  });
});

describe('detectMimeByExt', () => {
  it('maps common extensions case-insensitively', () => {
    expect(detectMimeByExt('.pdf')).toBe('application/pdf');
    expect(detectMimeByExt('.PDF')).toBe('application/pdf');
    expect(detectMimeByExt('.mdb')).toBe('application/x-msaccess');
    expect(detectMimeByExt('.MDB')).toBe('application/x-msaccess');
    expect(detectMimeByExt('.accdb')).toBe('application/x-msaccess');
    expect(detectMimeByExt('.dbf')).toBe('application/x-dbf');
    expect(detectMimeByExt('.xls')).toBe('application/vnd.ms-excel');
    expect(detectMimeByExt('.xlsx')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(detectMimeByExt('.csv')).toBe('text/csv');
    expect(detectMimeByExt('.txt')).toBe('text/plain');
    // .fp — FinePrint land-registry transcript; custom MIME since no IANA type.
    expect(detectMimeByExt('.fp')).toBe('application/x-fineprint');
    expect(detectMimeByExt('.FP')).toBe('application/x-fineprint');
  });

  it('returns application/octet-stream for unknown extensions', () => {
    expect(detectMimeByExt('.zip')).toBe('application/octet-stream');
    expect(detectMimeByExt('')).toBe('application/octet-stream');
  });
});

describe('shouldReparse', () => {
  const existing = {
    sha256: 'aaa',
    size_bytes: 1000,
    mtime: new Date('2026-01-01'),
  };

  it('returns false when sha256 matches and nothing relevant changed', () => {
    const result = shouldReparse(existing, {
      sha256: 'aaa',
      size_bytes: 1000,
      mtime: new Date('2026-02-01'),
    });
    expect(result).toEqual({ reparse: false });
  });

  it('returns false with warning when sha256 matches but size differs (should not happen)', () => {
    const result = shouldReparse(existing, {
      sha256: 'aaa',
      size_bytes: 2000,
      mtime: new Date('2026-02-01'),
    });
    expect(result.reparse).toBe(false);
    expect(result.warning).toMatch(/sha256 matches but size differs/i);
  });

  it('returns true with reason=content_changed when sha256 differs', () => {
    const result = shouldReparse(existing, {
      sha256: 'bbb',
      size_bytes: 1000,
      mtime: new Date('2026-02-01'),
    });
    expect(result).toEqual({ reparse: true, reason: 'content_changed' });
  });
});

describe('classifyStatus', () => {
  it('returns pending for supported extensions', () => {
    const supported = ['.pdf', '.xlsx', '.xls', '.mdb', '.accdb', '.dbf', '.csv', '.txt', '.fp'];
    for (const ext of supported) {
      expect(classifyStatus(ext)).toBe('pending');
    }
  });

  it('returns skipped_unsupported for unknown extensions', () => {
    expect(classifyStatus('.zip')).toBe('skipped_unsupported');
    expect(classifyStatus('.jpg')).toBe('skipped_unsupported');
    expect(classifyStatus('')).toBe('skipped_unsupported');
  });

  it('is case-insensitive', () => {
    expect(classifyStatus('.PDF')).toBe('pending');
    expect(classifyStatus('.MDB')).toBe('pending');
  });
});

describe('planFileAction', () => {
  // Single source of truth for "what does a scan-encounter produce?". Tested
  // in isolation so scan.ts counters stay correct when we later add actions
  // (e.g., verify-mtime) without regressing dry-run or double-count bugs.

  const baseIncoming = {
    sha256: 'aaa',
    size_bytes: 100,
    mtime: new Date('2026-04-19T00:00:00Z'),
    source_path: '/root/folder/file.fp',
    ext: '.fp',
  };

  it('returns [insert] for a brand-new file (no existing row)', () => {
    expect(planFileAction(null, baseIncoming)).toEqual([{ type: 'insert' }]);
  });

  it('returns [] (unchanged) when existing row matches fully', () => {
    const existing = {
      sha256: 'aaa',
      size_bytes: 100,
      mtime: new Date('2026-04-19T00:00:00Z'),
      source_path: '/root/folder/file.fp',
      status: 'pending' as const,
    };
    expect(planFileAction(existing, baseIncoming)).toEqual([]);
  });

  it('returns [update_path] when only source_path differs (moved copy)', () => {
    const existing = {
      sha256: 'aaa',
      size_bytes: 100,
      mtime: new Date('2026-04-19T00:00:00Z'),
      source_path: '/root/OLD/file.fp',
      status: 'pending' as const,
    };
    const actions = planFileAction(existing, baseIncoming);
    expect(actions).toEqual([{ type: 'update_path', to: '/root/folder/file.fp' }]);
  });

  it('returns [reset_content] when sha256 differs (content changed)', () => {
    const existing = {
      sha256: 'bbb',
      size_bytes: 100,
      mtime: new Date('2026-01-01'),
      source_path: '/root/folder/file.fp',
      status: 'indexed' as const,
    };
    const actions = planFileAction(existing, baseIncoming);
    expect(actions).toEqual([{ type: 'reset_content' }]);
  });

  it('combines update_path + reset_content when both path AND content changed', () => {
    const existing = {
      sha256: 'bbb',
      size_bytes: 100,
      mtime: new Date('2026-01-01'),
      source_path: '/root/OLD/file.fp',
      status: 'indexed' as const,
    };
    const actions = planFileAction(existing, baseIncoming);
    expect(actions).toContainEqual({ type: 'update_path', to: '/root/folder/file.fp' });
    expect(actions).toContainEqual({ type: 'reset_content' });
    expect(actions).toHaveLength(2);
  });

  it('returns [reclassify] when status was skipped_unsupported but ext now supported', () => {
    const existing = {
      sha256: 'aaa',
      size_bytes: 100,
      mtime: new Date('2026-04-19T00:00:00Z'),
      source_path: '/root/folder/file.fp',
      status: 'skipped_unsupported' as const,
    };
    const actions = planFileAction(existing, baseIncoming);
    expect(actions).toEqual([{ type: 'reclassify', to: 'pending' }]);
  });

  it('does not emit reclassify for terminal statuses (indexed / failed / missing)', () => {
    for (const status of ['indexed', 'failed', 'missing'] as const) {
      const existing = {
        sha256: 'aaa',
        size_bytes: 100,
        mtime: new Date('2026-04-19T00:00:00Z'),
        source_path: '/root/folder/file.fp',
        status,
      };
      expect(planFileAction(existing, baseIncoming)).toEqual([]);
    }
  });
});

describe('reclassifyIfStale', () => {
  // Handles the case where support for an extension is added later: a row
  // scanned before as `skipped_unsupported` should flip to `pending` on rescan.
  // The inverse is NOT allowed — a file already `parsed / indexed / failed`
  // must keep its current status; dropping support is an operational concern
  // handled manually.
  it('flips skipped_unsupported -> pending when extension is now supported', () => {
    expect(reclassifyIfStale('skipped_unsupported', '.fp')).toBe('pending');
  });

  it('keeps skipped_unsupported when extension is still unsupported', () => {
    expect(reclassifyIfStale('skipped_unsupported', '.zip')).toBeNull();
  });

  it('never touches in-flight or terminal statuses', () => {
    for (const status of [
      'parsing',
      'parsed',
      'ocr_queued',
      'normalized',
      'resolved',
      'indexed',
      'failed',
      'missing',
    ] as const) {
      expect(reclassifyIfStale(status, '.fp')).toBeNull();
    }
  });

  it('keeps pending as pending (no-op)', () => {
    expect(reclassifyIfStale('pending', '.pdf')).toBeNull();
  });
});
