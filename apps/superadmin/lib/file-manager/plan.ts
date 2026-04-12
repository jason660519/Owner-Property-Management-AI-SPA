import path from 'path';
import { matchesGlob, toPosixPath } from './glob';
import type { FileManagerConfig, PlanAction, PlanResult, ScanResult } from './types';

function isoDateFolder(iso: string): string {
  const date = iso.includes('T') ? iso.split('T')[0] : iso.slice(0, 10);
  return date;
}

function makePlanId(nowIso: string): string {
  const safe = nowIso.replaceAll(':', '').replaceAll('.', '').replaceAll('-', '');
  return `fm_${safe}`;
}

function ensureRelativePath(inputPath: string): string {
  const normalized = toPosixPath(inputPath).replace(/^\/+/, '');
  const withoutTraversal = normalized.split('/').filter((p) => p !== '..').join('/');
  return withoutTraversal;
}

function computeArchiveTarget(config: FileManagerConfig, scannedAtIso: string, destinationSubdir: string, fromRelativePath: string): string {
  const dateFolder = isoDateFolder(scannedAtIso);
  const rel = ensureRelativePath(fromRelativePath);
  const sub = ensureRelativePath(destinationSubdir);
  const root = ensureRelativePath(config.actions.archiveRoot);
  return toPosixPath(path.posix.join(root, dateFolder, sub, rel));
}

export function createPlanFromScan(input: {
  scan: ScanResult;
  config: FileManagerConfig;
}): PlanResult {
  const scan = input.scan;
  const config = input.config;

  const createdAt = new Date().toISOString();
  const planId = makePlanId(createdAt);

  const fileSet = new Set(scan.files.map((f) => f.relativePath));
  const actions: PlanAction[] = [];
  const warnings: string[] = [];

  const deleteRules = config.actions.deleteRules;
  const archiveRules = config.actions.archiveRules;
  const allowedRootFiles = new Set(config.standards.allowedRoot.files);
  const allowedRootDirs = new Set(config.standards.allowedRoot.dirs);

  for (const d of scan.dirs) {
    const rel = d.relativePath;
    const depth = d.depth;

    let matched: PlanAction | null = null;
    for (const rule of deleteRules) {
      if (matchesGlob(rule.match.glob, rel)) {
        matched = {
          type: 'delete',
          from: rel,
          ruleId: rule.id,
          reason: rule.description,
        };
        break;
      }
    }

    if (!matched) {
      for (const rule of archiveRules) {
        if (matchesGlob(rule.match.glob, rel)) {
          const to = computeArchiveTarget(config, scan.scannedAt, rule.destinationSubdir, rel);
          matched = {
            type: 'archive',
            from: rel,
            to,
            ruleId: rule.id,
            reason: rule.description,
          };
          break;
        }
      }
    }

    if (!matched && config.actions.archiveRootUnknown && depth === 1) {
      const name = rel;
      if (!allowedRootDirs.has(name) && !allowedRootFiles.has(name)) {
        const to = computeArchiveTarget(config, scan.scannedAt, 'root-unknown', rel);
        matched = {
          type: 'archive',
          from: rel,
          to,
          ruleId: 'root-unknown',
          reason: '根目錄未列入規範的資料夾歸檔',
        };
      }
    }

    if (matched) actions.push(matched);
  }

  for (const f of scan.files) {
    const rel = f.relativePath;
    const depth = f.depth;

    let matched: PlanAction | null = null;
    for (const rule of deleteRules) {
      if (matchesGlob(rule.match.glob, rel)) {
        matched = {
          type: 'delete',
          from: rel,
          ruleId: rule.id,
          reason: rule.description,
          bytes: f.stat.size,
        };
        break;
      }
    }

    if (!matched) {
      for (const rule of archiveRules) {
        if (matchesGlob(rule.match.glob, rel)) {
          const to = computeArchiveTarget(config, scan.scannedAt, rule.destinationSubdir, rel);
          matched = {
            type: 'archive',
            from: rel,
            to,
            ruleId: rule.id,
            reason: rule.description,
            bytes: f.stat.size,
          };
          break;
        }
      }
    }

    if (!matched && config.actions.archiveRootUnknown && depth === 1) {
      const name = rel;
      if (!allowedRootFiles.has(name) && !allowedRootDirs.has(name)) {
        const to = computeArchiveTarget(config, scan.scannedAt, 'root-unknown', rel);
        matched = {
          type: 'archive',
          from: rel,
          to,
          ruleId: 'root-unknown',
          reason: '根目錄未列入規範的檔案歸檔',
          bytes: f.stat.size,
        };
      }
    }

    if (matched) {
      actions.push(matched);
    }
  }

  if (config.redundancy.enabled && config.redundancy.action === 'archive_duplicates') {
    for (const group of scan.duplicates) {
      const keep = group.files[0];
      for (const dupe of group.files.slice(1)) {
        if (!fileSet.has(dupe.relativePath)) continue;
        const to = computeArchiveTarget(config, scan.scannedAt, 'duplicates', dupe.relativePath);
        actions.push({
          type: 'archive',
          from: dupe.relativePath,
          to,
          ruleId: 'duplicate-content',
          reason: `與 ${keep.relativePath} 內容完全相同（SHA-256=${group.contentHash}）`,
          bytes: group.bytes,
        });
      }
    }
  }

  const byFrom = new Map<string, PlanAction>();
  for (const action of actions) {
    const existing = byFrom.get(action.from);
    if (!existing) {
      byFrom.set(action.from, action);
      continue;
    }
    if (existing.type === action.type) continue;
    if (existing.type === 'delete') continue;
    if (action.type === 'delete') {
      byFrom.set(action.from, action);
      continue;
    }
  }

  const dedupedActions = Array.from(byFrom.values()).sort((a, b) => a.from.localeCompare(b.from));

  for (const action of dedupedActions) {
    if (action.type === 'delete' && (action.from.startsWith('apps/') || action.from.startsWith('packages/'))) {
      warnings.push(`刪除動作涉及原始碼路徑：${action.from}（建議先在 UI 內確認）`);
    }
    if (action.type !== 'delete' && action.to && action.to.startsWith('apps/')) {
      warnings.push(`歸檔/移動目的地位於 apps/：${action.from} -> ${action.to}（建議避免影響 build）`);
    }
  }

  return {
    planId,
    createdAt,
    projectRoot: scan.projectRoot,
    configPath: scan.configPath,
    scan: { scannedAt: scan.scannedAt, summary: scan.summary },
    actions: dedupedActions,
    warnings,
  };
}
