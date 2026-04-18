#!/usr/bin/env node
/**
 * Block newly-introduced `any` types in staged TypeScript files.
 *
 * Scans only the added lines (+) in the staged diff — existing `any`
 * in untouched code is allowed. Rule: CLAUDE.md "TypeScript strict, 禁 any".
 *
 * Escape hatch: add `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
 * or `// eslint-disable-line ...` on the same line, with a comment
 * explaining WHY (reviewer will check).
 *
 * Uses execFileSync (no shell) to avoid any injection risk even though
 * inputs come from git itself.
 */

const { execFileSync } = require('child_process');

// Patterns that match a genuinely-new `any` type annotation.
const ANY_PATTERNS = [
  /:\s*any\b/,           // foo: any
  /:\s*any\[\]/,         // foo: any[]
  /\bas\s+any\b/,        // foo as any
  /<\s*any\s*>/,         // Array<any>, Promise<any>
  /,\s*any\s*>/,         // Record<string, any>
];

function git(args) {
  return execFileSync('git', args, { encoding: 'utf-8' });
}

function getStagedTsFiles() {
  const out = git(['diff', '--cached', '--name-only', '--diff-filter=AM']);
  return out
    .split('\n')
    .map((f) => f.trim())
    .filter((f) => f && /\.(ts|tsx)$/.test(f));
}

function getStagedAdditions(file) {
  let diff;
  try {
    diff = git(['diff', '--cached', '--', file]);
  } catch {
    return [];
  }
  return diff
    .split('\n')
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .map((line) => line.slice(1));
}

function lineHasAny(line) {
  if (/eslint-disable.*no-explicit-any/.test(line)) return false;
  if (/eslint-disable-line/.test(line) || /eslint-disable-next-line/.test(line)) {
    return false;
  }
  return ANY_PATTERNS.some((re) => re.test(line));
}

function main() {
  const files = getStagedTsFiles();
  if (files.length === 0) return 0;

  const violations = [];
  for (const file of files) {
    const added = getStagedAdditions(file);
    for (const line of added) {
      if (lineHasAny(line)) {
        violations.push({ file, line: line.trim() });
      }
    }
  }

  if (violations.length === 0) return 0;

  console.error('\n❌ Newly added `any` types detected in staged changes:\n');
  for (const v of violations) {
    console.error(`  ${v.file}`);
    console.error(`    + ${v.line}`);
  }
  console.error(
    '\nCLAUDE.md policy: TypeScript strict, `any` is forbidden.\n' +
      'Fix with a proper type, or add // eslint-disable-next-line @typescript-eslint/no-explicit-any\n' +
      'on the line above with a short comment explaining why.\n',
  );
  return 1;
}

process.exit(main());
