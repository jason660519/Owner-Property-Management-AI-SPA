// Pure-function tests for the async import queue. The storage/db/ES side of
// `enqueueImportJob` and `processImportJob` is covered by an end-to-end smoke
// test (manual for now) — here we lock down the bits that don't need Supabase.

import { buildStoragePath, ASYNC_THRESHOLD_BYTES, MAX_ASYNC_FILE_BYTES, STORAGE_BUCKET } from '../import-jobs';

describe('buildStoragePath', () => {
  it('shapes the key as YYYY/MM/DD/<jobId>/<file>', () => {
    const path = buildStoragePath('abc-123', 'people.csv');
    // Regex matches the year portion being 4 digits (stable for the foreseeable
    // future) and the rest of the skeleton.
    expect(path).toMatch(/^\d{4}\/\d{2}\/\d{2}\/abc-123\/people\.csv$/);
  });

  it('strips directory prefixes from the filename', () => {
    const path = buildStoragePath('job-1', 'dir/subdir/file.xlsx');
    expect(path.endsWith('/job-1/file.xlsx')).toBe(true);
  });

  it('sanitises weird characters but keeps CJK + extension', () => {
    const path = buildStoragePath('job-2', '客戶 名單 v2!@#.pdf');
    // Spaces/symbols collapse to underscore; CJK kept; extension preserved.
    expect(path).toMatch(/job-2\/客戶_名單_v2___\.pdf$/);
  });

  it('handles filenames without an extension', () => {
    const path = buildStoragePath('job-3', 'noextension');
    expect(path.endsWith('/job-3/noextension')).toBe(true);
  });

  it('neutralises parent-dir traversal attempts', () => {
    // Even though split() already drops the leading '..' segments, we also
    // strip leading dots from whatever remains so a literal `..` filename
    // can't produce a './..'-style key.
    const sneaky = buildStoragePath('job-4', '../../etc/passwd');
    expect(sneaky.endsWith('/job-4/passwd')).toBe(true);

    const dotDot = buildStoragePath('job-5', '..');
    expect(dotDot.endsWith('/job-5/file')).toBe(true);
  });

  it('preserves broader CJK (Hiragana / Katakana / Hangul)', () => {
    const jp = buildStoragePath('job-6', 'さくら名簿.xlsx');
    expect(jp.endsWith('/job-6/さくら名簿.xlsx')).toBe(true);

    const kr = buildStoragePath('job-7', '주민명부.csv');
    expect(kr.endsWith('/job-7/주민명부.csv')).toBe(true);
  });
});

describe('threshold constants', () => {
  it('async threshold is 5 MiB to match the UI + docs', () => {
    expect(ASYNC_THRESHOLD_BYTES).toBe(5 * 1024 * 1024);
  });

  it('max async file size is well above the threshold', () => {
    expect(MAX_ASYNC_FILE_BYTES).toBeGreaterThan(ASYNC_THRESHOLD_BYTES * 10);
  });

  it('storage bucket name matches the migration', () => {
    expect(STORAGE_BUCKET).toBe('people-imports');
  });
});
