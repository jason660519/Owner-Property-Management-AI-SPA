// filepath: apps/superadmin/lib/docs-config.ts
// created: 2026-02-14 | creator: Claude Opus 4.6
// Resolves project docs directory for tree/content/search/watch APIs.

import path from 'path';
import fs from 'fs';

const LOG_PREFIX = '[docs-api]';

/**
 * Resolves the absolute path to the project docs directory (monorepo root /docs).
 * Order: env DOCS_PATH > cwd/../../docs (when in apps/superadmin) > cwd/docs (monorepo root).
 * Prefers repo-level docs over apps/superadmin/docs so the UI shows the full project docs.
 */
export function getDocsRoot(): string {
  const envPath = process.env.DOCS_PATH;
  if (envPath) {
    const resolved = path.isAbsolute(envPath) ? envPath : path.resolve(process.cwd(), envPath);
    if (fs.existsSync(resolved)) {
      return path.resolve(resolved);
    }
    console.warn(`${LOG_PREFIX} DOCS_PATH="${envPath}" resolved to ${resolved} but path not found; trying fallbacks.`);
  }

  const cwd = process.cwd();
  const fromSuperadmin = path.resolve(cwd, '../../docs');
  if (fs.existsSync(fromSuperadmin)) {
    return fromSuperadmin;
  }

  const fromCwdDocs = path.resolve(cwd, 'docs');
  if (fs.existsSync(fromCwdDocs)) {
    return fromCwdDocs;
  }

  const fallback = path.resolve(cwd, 'docs');
  console.warn(`${LOG_PREFIX} Docs directory not found (tried DOCS_PATH, cwd/../../docs, cwd/docs). Using fallback: ${fallback}`);
  return fallback;
}

/**
 * Resolves the monorepo / project root directory.
 * Order: env PROJECT_ROOT > cwd/../.. (when in apps/superadmin) > process.cwd().
 */
export function getProjectRoot(): string {
  const envPath = process.env.PROJECT_ROOT;
  if (envPath) {
    const resolved = path.isAbsolute(envPath) ? envPath : path.resolve(process.cwd(), envPath);
    if (fs.existsSync(resolved)) {
      return path.resolve(resolved);
    }
    console.warn(`${LOG_PREFIX} PROJECT_ROOT="${envPath}" resolved to ${resolved} but path not found; trying fallbacks.`);
  }

  const cwd = process.cwd();
  const fromSuperadmin = path.resolve(cwd, '../..');
  if (fs.existsSync(fromSuperadmin)) {
    return fromSuperadmin;
  }

  return cwd;
}

export type DocsScope = 'docs' | 'project';

export function getRoot(scope: DocsScope): string {
  return scope === 'project' ? getProjectRoot() : getDocsRoot();
}

/** Directories to skip when building tree or searching (node_modules, .git, etc.) */
export const SKIP_DIRS = new Set([
  'node_modules',
  '__pycache__',
  'local_replica',
  'local_project',
  'crawled_data',
  'playwright_data',
  '.git',
  '.next',
  'dist',
  'build',
]);

/** File extensions allowed in docs scope (tree, content, search). */
export const DOCS_EXTENSIONS = new Set(['.md', '.txt', '.json']);

/** File extensions allowed in project scope (text-like files). */
export const PROJECT_EXTENSIONS = new Set([
  '.md', '.txt', '.json', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.yml', '.yaml', '.css', '.scss', '.html', '.sh', '.sql',
  '.graphql', '.gql', '.xml', '.mdx', '.lock',
]);

/** In project scope, include files named .env or .env.* (no extension). */
export function isProjectScopeFile(entryName: string, ext: string, scope: DocsScope): boolean {
  if (scope === 'docs') {
    return DOCS_EXTENSIONS.has(ext);
  }
  return PROJECT_EXTENSIONS.has(ext) || entryName === '.env' || entryName.startsWith('.env.');
}

export function logDocsError(api: string, message: string, error?: unknown): void {
  console.error(`${LOG_PREFIX} [${api}] ${message}`, error !== undefined ? error : '');
}

export function logDocsInfo(api: string, message: string): void {
  console.info(`${LOG_PREFIX} [${api}] ${message}`);
}
