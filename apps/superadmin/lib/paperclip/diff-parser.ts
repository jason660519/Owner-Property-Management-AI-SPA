// Pure git-diff parser: splits a unified-diff blob into one record per file
// with classified lines ready for per-row colouring in React.
// No regex-heavy magic — the grammar of `git diff --unified` is stable enough
// for line-prefix matching to work well.

export type DiffLineKind =
  | 'header'      // `diff --git a/... b/...`
  | 'meta'        // `index abc..def 100644`, `new file mode ...`, `similarity index ...`
  | 'fromFile'    // `--- a/foo.ts` or `--- /dev/null`
  | 'toFile'      // `+++ b/foo.ts` or `+++ /dev/null`
  | 'hunk'        // `@@ -1,3 +1,5 @@ optional section header`
  | 'add'         // `+something`
  | 'del'         // `-something`
  | 'context';    // ` unchanged line`

export interface DiffLine {
  kind: DiffLineKind;
  text: string;
}

export interface DiffFile {
  /** The path we display — b-side (destination) when available, falls back to a-side. */
  path: string;
  /** Old path — for renames, this differs from `path`; undefined for new files. */
  oldPath?: string;
  status: 'added' | 'deleted' | 'modified' | 'renamed';
  /** Count of `+` lines (additions). */
  additions: number;
  /** Count of `-` lines (deletions). */
  deletions: number;
  /** All lines in order, starting from the `diff --git` header. */
  lines: DiffLine[];
}

/**
 * Parse a git-diff string (from `git diff baseBranch..branch`) into per-file
 * records. Handles new files, deletions, renames, and regular modifications.
 *
 * Not intended to handle binary diffs as structured content — a binary file
 * note like `Binary files a/foo and b/foo differ` lives as a meta line on
 * that file's record and additions/deletions stay 0.
 */
export function parseDiffFiles(diff: string): DiffFile[] {
  if (!diff) return [];
  const lines = diff.split('\n');

  const files: DiffFile[] = [];
  let current: DiffFile | null = null;
  // Tracks whether we're currently in a hunk (lines starting with +/- are
  // real changes). Outside a hunk, +++ / --- are file markers, not adds/dels.
  let inHunk = false;

  const pushLine = (kind: DiffLineKind, text: string) => {
    if (!current) return;
    current.lines.push({ kind, text });
  };

  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      // Start a new file record. Derive a preliminary path from the header;
      // later `+++` / `---` lines can refine it.
      if (current) files.push(current);
      const pathsMatch = line.match(/^diff --git a\/(.*) b\/(.*)$/);
      const a = pathsMatch?.[1] ?? '';
      const b = pathsMatch?.[2] ?? '';
      current = {
        path: b || a || '(unknown)',
        oldPath: a && a !== b ? a : undefined,
        status: 'modified',
        additions: 0,
        deletions: 0,
        lines: [{ kind: 'header', text: line }],
      };
      inHunk = false;
      continue;
    }

    if (!current) {
      // Skip lines before the first `diff --git` — git never emits these in
      // practice but be defensive.
      continue;
    }

    if (line.startsWith('@@')) {
      inHunk = true;
      pushLine('hunk', line);
      continue;
    }

    if (!inHunk) {
      // Still in the file header section. Classify as meta / fromFile / toFile.
      if (line.startsWith('--- ')) {
        pushLine('fromFile', line);
        if (line === '--- /dev/null') current.status = 'added';
        continue;
      }
      if (line.startsWith('+++ ')) {
        pushLine('toFile', line);
        if (line === '+++ /dev/null') current.status = 'deleted';
        // Refine the path from `+++ b/<path>` when available — some tools emit
        // different paths here than the header (e.g. renames).
        const m = line.match(/^\+\+\+ b\/(.*)$/);
        if (m) current.path = m[1];
        continue;
      }
      if (line.startsWith('rename from ')) {
        current.status = 'renamed';
        current.oldPath = line.slice('rename from '.length);
        pushLine('meta', line);
        continue;
      }
      if (line.startsWith('rename to ')) {
        current.path = line.slice('rename to '.length);
        pushLine('meta', line);
        continue;
      }
      if (line.startsWith('new file mode')) {
        current.status = 'added';
        pushLine('meta', line);
        continue;
      }
      if (line.startsWith('deleted file mode')) {
        current.status = 'deleted';
        pushLine('meta', line);
        continue;
      }
      // Catch-all for other header lines like `index ...`, `similarity ...`, binary notes.
      pushLine('meta', line);
      continue;
    }

    // Inside a hunk — classify by first char.
    if (line.startsWith('+')) {
      current.additions++;
      pushLine('add', line);
      continue;
    }
    if (line.startsWith('-')) {
      current.deletions++;
      pushLine('del', line);
      continue;
    }
    if (line.startsWith('\\')) {
      // `\ No newline at end of file` — context-ish, no count.
      pushLine('meta', line);
      continue;
    }
    // Context line (starts with space, or empty)
    pushLine('context', line);
  }

  if (current) files.push(current);

  // For files that didn't have explicit add/delete markers, rely on the
  // fromFile / toFile heuristics already set.
  return files;
}
