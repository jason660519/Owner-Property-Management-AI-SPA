const PATH_SCHEME_PATTERN = /^[a-zA-Z]+:/;

function normalizePath(path: string): string {
  return path.replace(/\/+$/, '');
}

function hasUnsafeSegments(path: string): boolean {
  const segments = path.split('/');
  return segments.some((segment) => segment === '' || segment === '.' || segment === '..');
}

export function isSafeProjectRelativePath(path: string): boolean {
  if (!path) return false;
  const normalized = normalizePath(path);
  if (!normalized) return false;
  if (normalized.startsWith('/') || normalized.startsWith('~')) return false;
  if (normalized.includes('\\')) return false;
  if (PATH_SCHEME_PATTERN.test(normalized)) return false;
  if (hasUnsafeSegments(normalized)) return false;
  return true;
}

export function isPathAllowedByPrefixes(path: string, allowedPrefixes: readonly string[]): boolean {
  const normalized = normalizePath(path);
  return allowedPrefixes.some((prefix) => normalized.startsWith(prefix));
}

export function canUseProjectFilePath(path: string, allowedPrefixes: readonly string[]): boolean {
  return isSafeProjectRelativePath(path) && isPathAllowedByPrefixes(path, allowedPrefixes);
}

export function buildProjectFileHref(path: string, allowedPrefixes: readonly string[]): string | null {
  if (!canUseProjectFilePath(path, allowedPrefixes)) return null;
  return `/superadmin/project-file?path=${encodeURIComponent(path)}`;
}
