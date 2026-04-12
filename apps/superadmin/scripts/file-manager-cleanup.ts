import fs from 'fs';
import path from 'path';
import { loadFileManagerConfig } from '../lib/file-manager/config';

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

function daysToMs(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

async function main(): Promise<void> {
  const loaded = loadFileManagerConfig();
  const retentionDays = loaded.config.actions.backupRetentionDays;
  const cutoff = Date.now() - daysToMs(retentionDays);

  const base = path.resolve(loaded.projectRoot, 'backups/file-manager');
  if (!fs.existsSync(base)) return;

  const entries = fs.readdirSync(base);
  for (const name of entries) {
    if (name === 'history.json') continue;
    const abs = path.join(base, name);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(abs);
    } catch {
      continue;
    }
    if (stat.mtimeMs >= cutoff) continue;
    rmrf(abs);
  }
}

void main();
