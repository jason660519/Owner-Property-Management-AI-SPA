import fs from 'fs';
import path from 'path';
import type { ApplyResult, PlanAction, PlanResult } from './types';
import { toPosixPath } from './glob';

interface AppliedActionRecord {
  action: PlanAction;
  fromAbs: string;
  toAbs?: string;
  backupAbs: string;
  itemType: 'file' | 'dir';
}

function ensureInsideRoot(projectRoot: string, absPath: string): boolean {
  const root = path.resolve(projectRoot);
  const resolved = path.resolve(absPath);
  return resolved === root || resolved.startsWith(root + path.sep);
}

function uniqueDestination(absPath: string): string {
  if (!fs.existsSync(absPath)) return absPath;
  const dir = path.dirname(absPath);
  const ext = path.extname(absPath);
  const base = path.basename(absPath, ext);
  for (let i = 1; i <= 999; i += 1) {
    const candidate = path.join(dir, `${base}__${i}${ext}`);
    if (!fs.existsSync(candidate)) return candidate;
  }
  return absPath;
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

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function readHistory(historyPath: string): { plans: Array<{ planId: string; appliedAt: string; backupDir: string }> } {
  if (!fs.existsSync(historyPath)) return { plans: [] };
  try {
    const raw = fs.readFileSync(historyPath, 'utf-8');
    const json = JSON.parse(raw) as unknown;
    if (!json || typeof json !== 'object') return { plans: [] };
    const plansValue = (json as { plans?: unknown }).plans;
    if (!Array.isArray(plansValue)) return { plans: [] };
    const plans = plansValue
      .map((p) => {
        if (!p || typeof p !== 'object') return null;
        const planId = (p as { planId?: unknown }).planId;
        const appliedAt = (p as { appliedAt?: unknown }).appliedAt;
        const backupDir = (p as { backupDir?: unknown }).backupDir;
        if (typeof planId !== 'string' || typeof appliedAt !== 'string' || typeof backupDir !== 'string') return null;
        return { planId, appliedAt, backupDir };
      })
      .filter((p): p is { planId: string; appliedAt: string; backupDir: string } => p !== null);
    return { plans };
  } catch {
    return { plans: [] };
  }
}

export function applyPlanToProject(input: { plan: PlanResult; projectRoot: string }): ApplyResult {
  const projectRoot = path.resolve(input.projectRoot);
  const plan = input.plan;
  const appliedAt = new Date().toISOString();
  const backupDir = path.resolve(projectRoot, 'backups/file-manager', plan.planId);
  const backupFilesDir = path.resolve(backupDir, 'files');
  const manifestPath = path.resolve(backupDir, 'manifest.json');
  const historyPath = path.resolve(projectRoot, 'backups/file-manager/history.json');

  fs.mkdirSync(backupFilesDir, { recursive: true });

  const appliedActions: PlanAction[] = [];
  const skippedActions: Array<PlanAction & { skipReason: string }> = [];
  const manifestRecords: AppliedActionRecord[] = [];

  for (const action of plan.actions) {
    const fromRel = toPosixPath(action.from);
    const fromAbs = path.resolve(projectRoot, fromRel);
    if (!ensureInsideRoot(projectRoot, fromAbs)) {
      skippedActions.push({ ...action, skipReason: '來源路徑不在專案根目錄下' });
      continue;
    }
    if (!fs.existsSync(fromAbs)) {
      skippedActions.push({ ...action, skipReason: '來源不存在（可能已被移動/刪除）' });
      continue;
    }
    const stat = fs.statSync(fromAbs);
    const itemType: 'file' | 'dir' = stat.isDirectory() ? 'dir' : 'file';
    if (!stat.isFile() && !stat.isDirectory()) {
      skippedActions.push({ ...action, skipReason: '目前僅支援操作檔案或資料夾（其他項目已略過）' });
      continue;
    }

    const backupAbs = path.resolve(backupFilesDir, fromRel);
    if (itemType === 'dir') {
      rmrf(backupAbs);
      copyRecursive(fromAbs, backupAbs);
    } else {
      fs.mkdirSync(path.dirname(backupAbs), { recursive: true });
      fs.copyFileSync(fromAbs, backupAbs);
    }

    if (action.type === 'delete') {
      if (itemType === 'dir') {
        rmrf(fromAbs);
      } else {
        fs.unlinkSync(fromAbs);
      }
      appliedActions.push(action);
      manifestRecords.push({ action, fromAbs, backupAbs, itemType });
      continue;
    }

    const toRel = typeof action.to === 'string' ? toPosixPath(action.to) : null;
    if (!toRel) {
      skippedActions.push({ ...action, skipReason: '缺少目的地路徑' });
      continue;
    }

    const toAbsRaw = path.resolve(projectRoot, toRel);
    if (!ensureInsideRoot(projectRoot, toAbsRaw)) {
      skippedActions.push({ ...action, skipReason: '目的地路徑不在專案根目錄下' });
      continue;
    }

    const toAbs = uniqueDestination(toAbsRaw);
    if (toAbs === toAbsRaw && fs.existsSync(toAbsRaw)) {
      skippedActions.push({ ...action, skipReason: '目的地已存在且無法取得可用的唯一名稱' });
      continue;
    }

    fs.mkdirSync(path.dirname(toAbs), { recursive: true });
    fs.renameSync(fromAbs, toAbs);

    const appliedAction: PlanAction = {
      ...action,
      to: toPosixPath(path.relative(projectRoot, toAbs)),
    };
    appliedActions.push(appliedAction);
    manifestRecords.push({ action: appliedAction, fromAbs, toAbs, backupAbs, itemType });
  }

  const manifest = {
    plan,
    appliedAt,
    projectRoot,
    records: manifestRecords.map((r) => ({
      action: r.action,
      fromAbs: r.fromAbs,
      toAbs: r.toAbs,
      backupAbs: r.backupAbs,
      itemType: r.itemType,
    })),
    skippedActions,
  };
  writeJson(manifestPath, manifest);

  const history = readHistory(historyPath);
  const nextPlans = [
    { planId: plan.planId, appliedAt, backupDir: toPosixPath(path.relative(projectRoot, backupDir)) },
    ...history.plans.filter((p) => p.planId !== plan.planId),
  ].slice(0, 50);
  writeJson(historyPath, { plans: nextPlans });

  return {
    planId: plan.planId,
    appliedAt,
    projectRoot,
    backupDir: toPosixPath(path.relative(projectRoot, backupDir)),
    manifestPath: toPosixPath(path.relative(projectRoot, manifestPath)),
    appliedActions,
    skippedActions,
  };
}
