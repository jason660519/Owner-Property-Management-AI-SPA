import fs from 'fs';
import path from 'path';
import type { RollbackResult } from './types';

interface ManifestRecord {
  action: { type: string; from: string; to?: string };
  fromAbs: string;
  toAbs?: string;
  backupAbs: string;
  itemType?: 'file' | 'dir';
}

function rmrf(target: string): void {
  if (!fs.existsSync(target)) return;
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(target)) {
      rmrf(path.join(target, entry));
    }
    fs.rmdirSync(target);
    return;
  }
  fs.unlinkSync(target);
}

function copyRecursive(fromAbs: string, toAbs: string): void {
  const stat = fs.statSync(fromAbs);
  if (stat.isDirectory()) {
    fs.mkdirSync(toAbs, { recursive: true });
    for (const entry of fs.readdirSync(fromAbs)) {
      copyRecursive(path.join(fromAbs, entry), path.join(toAbs, entry));
    }
    return;
  }
  fs.mkdirSync(path.dirname(toAbs), { recursive: true });
  fs.copyFileSync(fromAbs, toAbs);
}

function readJsonFile(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as unknown;
}

function safeGetRecords(json: unknown): ManifestRecord[] {
  if (!json || typeof json !== 'object') return [];
  const records = (json as { records?: unknown }).records;
  if (!Array.isArray(records)) return [];
  const out: ManifestRecord[] = [];
  for (const item of records) {
    if (!item || typeof item !== 'object') continue;
    const fromAbs = (item as { fromAbs?: unknown }).fromAbs;
    const toAbs = (item as { toAbs?: unknown }).toAbs;
    const backupAbs = (item as { backupAbs?: unknown }).backupAbs;
    const itemType = (item as { itemType?: unknown }).itemType;
    const action = (item as { action?: unknown }).action;
    if (typeof fromAbs !== 'string' || typeof backupAbs !== 'string') continue;
    if (!action || typeof action !== 'object') continue;
    const type = (action as { type?: unknown }).type;
    const from = (action as { from?: unknown }).from;
    const to = (action as { to?: unknown }).to;
    if (typeof type !== 'string' || typeof from !== 'string') continue;
    out.push({
      action: { type, from, to: typeof to === 'string' ? to : undefined },
      fromAbs,
      toAbs: typeof toAbs === 'string' ? toAbs : undefined,
      backupAbs,
      itemType: itemType === 'dir' || itemType === 'file' ? itemType : undefined,
    });
  }
  return out;
}

export function rollbackPlanFromBackup(input: {
  projectRoot: string;
  planId: string;
}): RollbackResult {
  const projectRoot = path.resolve(input.projectRoot);
  const planId = input.planId;
  const backupDir = path.resolve(projectRoot, 'backups/file-manager', planId);
  const manifestPath = path.resolve(backupDir, 'manifest.json');
  const rolledBackAt = new Date().toISOString();

  const errors: string[] = [];
  let restoredCount = 0;

  if (!fs.existsSync(manifestPath)) {
    return {
      planId,
      rolledBackAt,
      projectRoot,
      backupDir: path.relative(projectRoot, backupDir),
      restoredCount: 0,
      errors: ['找不到 manifest.json，無法回滾'],
    };
  }

  let manifestJson: unknown;
  try {
    manifestJson = readJsonFile(manifestPath);
  } catch (err) {
    return {
      planId,
      rolledBackAt,
      projectRoot,
      backupDir: path.relative(projectRoot, backupDir),
      restoredCount: 0,
      errors: [`讀取 manifest.json 失敗：${String(err)}`],
    };
  }

  const records = safeGetRecords(manifestJson);
  for (const record of records) {
    try {
      if (!fs.existsSync(record.backupAbs)) {
        errors.push(`備份檔不存在：${record.backupAbs}`);
        continue;
      }

      if (record.action.type === 'archive' || record.action.type === 'move') {
        if (record.toAbs && fs.existsSync(record.toAbs)) {
          try {
            rmrf(record.toAbs);
          } catch {
            errors.push(`無法移除目前的目的地檔案：${record.toAbs}`);
          }
        }
      }

      if (fs.existsSync(record.fromAbs)) {
        try {
          rmrf(record.fromAbs);
        } catch {
          errors.push(`無法移除目前的來源路徑：${record.fromAbs}`);
        }
      }

      const backupStat = fs.statSync(record.backupAbs);
      if (backupStat.isDirectory()) {
        copyRecursive(record.backupAbs, record.fromAbs);
      } else {
        fs.mkdirSync(path.dirname(record.fromAbs), { recursive: true });
        fs.copyFileSync(record.backupAbs, record.fromAbs);
      }
      restoredCount += 1;
    } catch (err) {
      errors.push(`回滾失敗：${record.action.from}（${String(err)}）`);
    }
  }

  return {
    planId,
    rolledBackAt,
    projectRoot,
    backupDir: path.relative(projectRoot, backupDir),
    restoredCount,
    errors,
  };
}
