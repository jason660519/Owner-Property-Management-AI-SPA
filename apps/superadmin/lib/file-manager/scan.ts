import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { SKIP_DIRS, getProjectRoot } from '../docs-config';
import { matchesGlob, toPosixPath } from './glob';
import type {
  DuplicateGroup,
  FileManagerConfig,
  FileStatLite,
  ScanResult,
  ScannedDir,
  ScannedFile,
  Severity,
  Violation,
} from './types';

function statLite(stat: fs.Stats): FileStatLite {
  return {
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    isFile: stat.isFile(),
    isDirectory: stat.isDirectory(),
  };
}

function sha256FileSync(filePath: string): string {
  const hash = crypto.createHash('sha256');
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest('hex');
}

function buildSkipMatchers(projectRoot: string, config: FileManagerConfig): (relativeDir: string, name: string) => boolean {
  const skipDirNames = new Set<string>([...SKIP_DIRS, ...config.scan.skipDirs.map((d) => d.split('/')[0])]);
  const skipPrefixes = config.scan.skipDirs
    .map((d) => toPosixPath(d).replace(/^\/+/, '').replace(/\/+$/, ''))
    .filter((d) => d.length > 0);

  return (relativeDir: string, name: string) => {
    if (skipDirNames.has(name)) return true;
    const rel = toPosixPath(relativeDir);
    const joined = rel ? `${rel}/${name}` : name;
    if (joined.startsWith('.git/')) return true;
    for (const prefix of skipPrefixes) {
      if (joined === prefix) return true;
      if (joined.startsWith(prefix + '/')) return true;
    }
    const abs = path.resolve(projectRoot, joined);
    if (!abs.startsWith(path.resolve(projectRoot) + path.sep) && abs !== path.resolve(projectRoot)) return true;
    return false;
  };
}

function severityCounts(violations: Violation[]): Record<Severity, number> {
  return violations.reduce<Record<Severity, number>>(
    (acc, v) => {
      acc[v.severity] += 1;
      return acc;
    },
    { info: 0, warning: 0, error: 0 }
  );
}

function ruleCounts(violations: Violation[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of violations) {
    if (!v.ruleId) continue;
    out[v.ruleId] = (out[v.ruleId] ?? 0) + 1;
  }
  return out;
}

export function scanProjectFiles(input: {
  projectRoot?: string;
  configPath: string;
  config: FileManagerConfig;
}): ScanResult {
  const projectRoot = input.projectRoot ? path.resolve(input.projectRoot) : getProjectRoot();
  const config = input.config;
  const configPath = path.resolve(projectRoot, input.configPath);

  const now = new Date().toISOString();
  const files: ScannedFile[] = [];
  const dirs: ScannedDir[] = [];
  const violations: Violation[] = [];
  const dirCounts: Record<string, number> = {};

  let totalDirs = 0;
  let totalBytes = 0;

  const skip = buildSkipMatchers(projectRoot, config);

  const allowedRootFiles = new Set(config.standards.allowedRoot.files);
  const allowedRootDirs = new Set(config.standards.allowedRoot.dirs);

  const fileNameRules = config.standards.namingRules.filter((r) => typeof r.fileNameRegex === 'string');
  const dirSegmentRules = config.standards.namingRules.filter((r) => typeof r.pathSegmentRegex === 'string');

  function checkRootAllowance(relativePath: string, isDir: boolean): void {
    const depth = relativePath.split('/').filter(Boolean).length;
    if (depth !== 1) return;
    const name = relativePath;
    if (isDir) {
      if (!allowedRootDirs.has(name)) {
        violations.push({
          id: `root-disallowed-dir:${name}`,
          severity: 'error',
          message: '根目錄出現未列入規範的資料夾（建議移動到正確位置或歸檔）',
          relativePath,
          ruleId: 'allowedRoot',
        });
      }
      return;
    }

    if (!allowedRootFiles.has(name)) {
      violations.push({
        id: `root-disallowed-file:${name}`,
        severity: 'error',
        message: '根目錄出現未列入規範的檔案（建議歸檔或移除）',
        relativePath,
        ruleId: 'allowedRoot',
      });
    }
  }

  function applyDirNamingRules(relativeDirPath: string): void {
    for (const rule of dirSegmentRules) {
      if (!rule.pathSegmentRegex) continue;
      if (!matchesGlob(rule.match.glob, relativeDirPath)) continue;
      const segments = relativeDirPath.split('/').filter(Boolean);
      if (segments.length === 0) continue;
      const segment = segments[segments.length - 1] ?? '';
      if (rule.excludeSegmentRegex) {
        const exclude = new RegExp(rule.excludeSegmentRegex);
        if (exclude.test(segment)) continue;
      }
      const re = new RegExp(rule.pathSegmentRegex);
      if (!re.test(segment)) {
        violations.push({
          id: `naming-dir:${rule.id}:${relativeDirPath}`,
          severity: rule.severity,
          message: rule.description,
          relativePath: relativeDirPath,
          ruleId: rule.id,
        });
      }
    }
  }

  function applyFileNamingRules(relativeFilePath: string, baseName: string): void {
    for (const rule of fileNameRules) {
      if (!rule.fileNameRegex) continue;
      if (!matchesGlob(rule.match.glob, relativeFilePath)) continue;
      const re = new RegExp(rule.fileNameRegex);
      if (!re.test(baseName)) {
        violations.push({
          id: `naming-file:${rule.id}:${relativeFilePath}`,
          severity: rule.severity,
          message: rule.description,
          relativePath: relativeFilePath,
          ruleId: rule.id,
        });
      }
    }
  }

  function walk(dirAbs: string, dirRel: string): void {
    const entries = fs.readdirSync(dirAbs, { withFileTypes: true });
    for (const entry of entries) {
      const name = entry.name;
      const rel = dirRel ? `${dirRel}/${name}` : name;
      if (entry.isDirectory()) {
        if (skip(dirRel, name)) continue;
        totalDirs += 1;
        checkRootAllowance(rel, true);
        applyDirNamingRules(rel);
        try {
          const stat = fs.statSync(path.join(dirAbs, name));
          const lite = statLite(stat);
          const normalizedRel = toPosixPath(rel);
          const parentDir = normalizedRel.includes('/') ? normalizedRel.split('/').slice(0, -1).join('/') : '';
          const depth = normalizedRel.split('/').filter(Boolean).length;
          dirs.push({
            relativePath: normalizedRel,
            absolutePath: path.join(dirAbs, name),
            stat: lite,
            baseName: name,
            parentDir,
            depth,
          });
        } catch {
          // ignore stat failures
        }
        walk(path.join(dirAbs, name), rel);
        continue;
      }

      if (!entry.isFile()) continue;
      const abs = path.join(dirAbs, name);
      const stat = fs.statSync(abs);
      const lite = statLite(stat);
      const ext = path.extname(name);

      const normalizedRel = toPosixPath(rel);
      const parentDir = normalizedRel.includes('/') ? normalizedRel.split('/').slice(0, -1).join('/') : '';
      const depth = normalizedRel.split('/').filter(Boolean).length;

      checkRootAllowance(normalizedRel, false);
      applyFileNamingRules(normalizedRel, name);

      files.push({
        relativePath: normalizedRel,
        absolutePath: abs,
        stat: lite,
        ext,
        baseName: name,
        parentDir,
        depth,
      });

      totalBytes += lite.size;
      dirCounts[parentDir] = (dirCounts[parentDir] ?? 0) + 1;
    }
  }

  walk(projectRoot, '');

  const duplicates: DuplicateGroup[] = [];
  if (config.redundancy.enabled) {
    const hashExtSet = new Set(config.scan.hashExtensions);
    const eligible = files.filter((f) => {
      if (f.stat.size < config.redundancy.minBytes) return false;
      if (f.stat.size > config.scan.maxFileBytesToHash) return false;
      if (!hashExtSet.has(f.ext)) return false;
      for (const dir of config.redundancy.scanDirs) {
        const prefix = toPosixPath(dir).replace(/\/+$/, '');
        if (prefix.length === 0) continue;
        if (f.relativePath === prefix) return true;
        if (f.relativePath.startsWith(prefix + '/')) return true;
      }
      return false;
    });

    const byHash = new Map<string, { bytes: number; files: Array<{ relativePath: string; mtimeMs: number }> }>();
    for (const f of eligible) {
      let hash: string;
      try {
        hash = sha256FileSync(f.absolutePath);
      } catch {
        continue;
      }
      const existing = byHash.get(hash);
      const item = { relativePath: f.relativePath, mtimeMs: f.stat.mtimeMs };
      if (!existing) {
        byHash.set(hash, { bytes: f.stat.size, files: [item] });
      } else {
        existing.files.push(item);
      }
    }

    for (const [contentHash, group] of byHash.entries()) {
      if (group.files.length <= 1) continue;
      duplicates.push({
        contentHash,
        bytes: group.bytes,
        files: group.files.sort((a, b) => b.mtimeMs - a.mtimeMs),
      });
    }
  }

  const topDirsByCount = Object.entries(dirCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([dir, count]) => ({ dir, count }));

  const summary = {
    totalFiles: files.length,
    totalDirs,
    totalBytes,
    violationsBySeverity: severityCounts(violations),
    violationsByRule: ruleCounts(violations),
    topDirsByCount,
  };

  return {
    scannedAt: now,
    projectRoot,
    configPath,
    files,
    dirs,
    violations,
    duplicates,
    summary,
  };
}
