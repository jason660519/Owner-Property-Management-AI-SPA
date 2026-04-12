import { parseDiffFiles } from '../diff-parser';

describe('parseDiffFiles', () => {
  it('returns empty array for empty input', () => {
    expect(parseDiffFiles('')).toEqual([]);
  });

  it('parses a simple single-file modification', () => {
    const diff = [
      'diff --git a/foo.ts b/foo.ts',
      'index abc..def 100644',
      '--- a/foo.ts',
      '+++ b/foo.ts',
      '@@ -1,3 +1,3 @@',
      ' context line',
      '-old line',
      '+new line',
      ' context line 2',
    ].join('\n');

    const files = parseDiffFiles(diff);
    expect(files).toHaveLength(1);
    const [f] = files;
    expect(f.path).toBe('foo.ts');
    expect(f.status).toBe('modified');
    expect(f.additions).toBe(1);
    expect(f.deletions).toBe(1);
    expect(f.oldPath).toBeUndefined();

    const kinds = f.lines.map((l) => l.kind);
    expect(kinds).toContain('header');
    expect(kinds).toContain('fromFile');
    expect(kinds).toContain('toFile');
    expect(kinds).toContain('hunk');
    expect(kinds).toContain('context');
    expect(kinds.filter((k) => k === 'add')).toHaveLength(1);
    expect(kinds.filter((k) => k === 'del')).toHaveLength(1);
  });

  it('parses multiple files in sequence', () => {
    const diff = [
      'diff --git a/a.ts b/a.ts',
      'index 111..222 100644',
      '--- a/a.ts',
      '+++ b/a.ts',
      '@@ -1 +1 @@',
      '-old',
      '+new',
      'diff --git a/b.ts b/b.ts',
      'index 333..444 100644',
      '--- a/b.ts',
      '+++ b/b.ts',
      '@@ -1,2 +1,3 @@',
      ' keep',
      '+added',
      ' keep2',
    ].join('\n');

    const files = parseDiffFiles(diff);
    expect(files).toHaveLength(2);
    expect(files[0].path).toBe('a.ts');
    expect(files[0].additions).toBe(1);
    expect(files[0].deletions).toBe(1);
    expect(files[1].path).toBe('b.ts');
    expect(files[1].additions).toBe(1);
    expect(files[1].deletions).toBe(0);
  });

  it('recognises new files via `new file mode` or `--- /dev/null`', () => {
    const diff1 = [
      'diff --git a/newfile.ts b/newfile.ts',
      'new file mode 100644',
      'index 0000000..abc1234',
      '--- /dev/null',
      '+++ b/newfile.ts',
      '@@ -0,0 +1,2 @@',
      '+line 1',
      '+line 2',
    ].join('\n');

    const [f] = parseDiffFiles(diff1);
    expect(f.status).toBe('added');
    expect(f.path).toBe('newfile.ts');
    expect(f.additions).toBe(2);
    expect(f.deletions).toBe(0);
  });

  it('recognises deleted files via `deleted file mode` or `+++ /dev/null`', () => {
    const diff = [
      'diff --git a/gone.ts b/gone.ts',
      'deleted file mode 100644',
      'index abc..000 100644',
      '--- a/gone.ts',
      '+++ /dev/null',
      '@@ -1,2 +0,0 @@',
      '-line 1',
      '-line 2',
    ].join('\n');

    const [f] = parseDiffFiles(diff);
    expect(f.status).toBe('deleted');
    expect(f.path).toBe('gone.ts');
    expect(f.additions).toBe(0);
    expect(f.deletions).toBe(2);
  });

  it('recognises renamed files and captures both paths', () => {
    const diff = [
      'diff --git a/old/path.ts b/new/path.ts',
      'similarity index 95%',
      'rename from old/path.ts',
      'rename to new/path.ts',
      'index abc..def 100644',
      '--- a/old/path.ts',
      '+++ b/new/path.ts',
      '@@ -1 +1 @@',
      '-old',
      '+new',
    ].join('\n');

    const [f] = parseDiffFiles(diff);
    expect(f.status).toBe('renamed');
    expect(f.path).toBe('new/path.ts');
    expect(f.oldPath).toBe('old/path.ts');
  });

  it('does NOT count +++/--- file headers as additions/deletions', () => {
    const diff = [
      'diff --git a/foo.ts b/foo.ts',
      'index abc..def 100644',
      '--- a/foo.ts',
      '+++ b/foo.ts',
      '@@ -1 +1 @@',
      '-old',
      '+new',
    ].join('\n');

    const [f] = parseDiffFiles(diff);
    expect(f.additions).toBe(1);
    expect(f.deletions).toBe(1);
    const kinds = f.lines.map((l) => l.kind);
    expect(kinds.filter((k) => k === 'fromFile')).toHaveLength(1);
    expect(kinds.filter((k) => k === 'toFile')).toHaveLength(1);
  });

  it('handles multiple hunks in one file', () => {
    const diff = [
      'diff --git a/foo.ts b/foo.ts',
      'index abc..def 100644',
      '--- a/foo.ts',
      '+++ b/foo.ts',
      '@@ -1,3 +1,3 @@',
      '-a',
      '+A',
      ' b',
      '@@ -10,3 +10,4 @@',
      ' x',
      '+y',
      ' z',
    ].join('\n');

    const [f] = parseDiffFiles(diff);
    expect(f.additions).toBe(2);
    expect(f.deletions).toBe(1);
    expect(f.lines.filter((l) => l.kind === 'hunk')).toHaveLength(2);
  });

  it('tolerates "\\ No newline at end of file" markers', () => {
    const diff = [
      'diff --git a/foo.ts b/foo.ts',
      'index abc..def 100644',
      '--- a/foo.ts',
      '+++ b/foo.ts',
      '@@ -1 +1 @@',
      '-old',
      '\\ No newline at end of file',
      '+new',
      '\\ No newline at end of file',
    ].join('\n');

    const [f] = parseDiffFiles(diff);
    expect(f.additions).toBe(1);
    expect(f.deletions).toBe(1);
    expect(f.lines.some((l) => l.kind === 'meta' && l.text.startsWith('\\'))).toBe(true);
  });

  it('refines path from +++ b/<path> when header is malformed', () => {
    const diff = 'diff --git malformed\n--- a/x\n+++ b/x\n@@ -1 +1 @@\n+new\n-old\n';
    const [f] = parseDiffFiles(diff);
    expect(f.path).toBe('x');
  });
});
