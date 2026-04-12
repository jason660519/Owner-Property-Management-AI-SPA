import fs from 'fs';
import path from 'path';
import { loadFileManagerConfig } from '../lib/file-manager/config';
import { scanProjectFiles } from '../lib/file-manager/scan';
import { createPlanFromScan } from '../lib/file-manager/plan';
import { renderPlanMarkdown, renderScanMarkdown } from '../lib/file-manager/report';
import { appendScanMetrics } from '../lib/file-manager/metrics';

type Mode = 'scan' | 'plan';
type FailOn = 'none' | 'warning' | 'error';

function getArgValue(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  const value = process.argv[idx + 1];
  if (!value || value.startsWith('--')) return null;
  return value;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function parseMode(): Mode {
  const v = getArgValue('--mode');
  if (v === 'scan' || v === 'plan') return v;
  if (hasFlag('--plan')) return 'plan';
  return 'scan';
}

function parseFailOn(): FailOn {
  const v = getArgValue('--fail-on');
  if (v === 'warning' || v === 'error' || v === 'none') return v;
  return 'none';
}

function nowId(): string {
  return new Date().toISOString().replaceAll(':', '').replaceAll('.', '').replaceAll('-', '');
}

function mkdirp(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function writeText(filePath: string, content: string): void {
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf-8');
}

function writeJson(filePath: string, data: unknown): void {
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function shouldFail(failOn: FailOn, violations: { error: number; warning: number }): boolean {
  if (failOn === 'none') return false;
  if (failOn === 'error') return violations.error > 0;
  return violations.error > 0 || violations.warning > 0;
}

async function main(): Promise<void> {
  const mode = parseMode();
  const failOn = parseFailOn();

  const loaded = loadFileManagerConfig();
  const scan = scanProjectFiles({
    projectRoot: loaded.projectRoot,
    configPath: loaded.configPath,
    config: loaded.config,
  });
  appendScanMetrics({ projectRoot: loaded.projectRoot, scan });

  const reportBase = path.resolve(loaded.projectRoot, 'backups/file-manager/reports', nowId());
  const scanJsonPath = `${reportBase}.scan.json`;
  const scanMdPath = `${reportBase}.scan.md`;

  writeJson(scanJsonPath, scan);
  writeText(scanMdPath, renderScanMarkdown(scan));

  if (mode === 'plan') {
    const plan = createPlanFromScan({ scan, config: loaded.config });
    writeJson(`${reportBase}.plan.json`, plan);
    writeText(`${reportBase}.plan.md`, renderPlanMarkdown(plan));
  }

  const violations = scan.summary.violationsBySeverity;
  if (shouldFail(failOn, { error: violations.error, warning: violations.warning })) {
    process.exitCode = 2;
  }
}

void main();
