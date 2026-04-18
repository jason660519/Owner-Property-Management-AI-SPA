#!/usr/bin/env node
/**
 * Critical dependency guard.
 *
 * Enforces major-version pins for libraries where a downgrade would
 * silently break the app (SWC compilation, peer deps, runtime APIs).
 * Scans every package.json in the monorepo; exits non-zero on violation.
 *
 * Run in pre-commit and in CI. Update the CRITICAL map below when the
 * project deliberately bumps a major — do NOT bypass this check.
 */

const fs = require('fs');
const path = require('path');

// Each entry: package-name -> minimum-allowed-major.
// A range like "^19.2.4" satisfies major 19; "^18.2.0" does NOT.
const CRITICAL = {
  react: 19,
  'react-dom': 19,
  'react-leaflet': 5,
  next: 16,
  typescript: 5,
};

// Directories to skip (never scan these).
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  'out',
  '.paperclip-worktrees',
  'playwright-report',
  'test-results',
]);

/** Walk the workspace and collect all package.json paths (excluding node_modules). */
function findPackageJsons(root) {
  const results = [];
  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.') continue;
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name === 'package.json') {
        results.push(full);
      }
    }
  }
  walk(root);
  return results;
}

/** Extract the first major version digit from an npm range string. */
function extractMajor(range) {
  if (typeof range !== 'string') return null;
  // Handles ^19.2.4, ~19.2, 19.x, 19, >=19.0.0, etc.
  const match = range.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

function checkPackage(filePath) {
  const violations = [];
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    return [{ filePath, error: `Invalid JSON: ${err.message}` }];
  }

  const allDeps = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
    ...(pkg.peerDependencies ?? {}),
  };

  for (const [name, minMajor] of Object.entries(CRITICAL)) {
    if (!(name in allDeps)) continue;
    const range = allDeps[name];
    const major = extractMajor(range);
    if (major === null) {
      violations.push({ filePath, name, range, reason: 'unparseable version' });
      continue;
    }
    if (major < minMajor) {
      violations.push({
        filePath,
        name,
        range,
        reason: `requires major >= ${minMajor}, got ${major}`,
      });
    }
  }

  return violations;
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const files = findPackageJsons(repoRoot);
  const allViolations = [];

  for (const file of files) {
    allViolations.push(...checkPackage(file));
  }

  if (allViolations.length === 0) {
    return 0;
  }

  console.error('\n❌ Critical dependency check failed:\n');
  for (const v of allViolations) {
    const rel = path.relative(repoRoot, v.filePath);
    if (v.error) {
      console.error(`  ${rel}: ${v.error}`);
    } else {
      console.error(`  ${rel}`);
      console.error(`    ${v.name}@${v.range} — ${v.reason}`);
    }
  }
  console.error('\nThese packages are version-pinned by project policy.');
  console.error('Do NOT downgrade without updating scripts/check-critical-deps.js\n');
  console.error('If this is a deliberate major bump, edit the CRITICAL map and');
  console.error('explain the change in the commit message.\n');
  return 1;
}

process.exit(main());
