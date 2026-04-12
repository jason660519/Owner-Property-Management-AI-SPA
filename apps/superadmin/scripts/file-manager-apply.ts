import fs from 'fs';
import path from 'path';
import { getProjectRoot } from '../lib/docs-config';
import { applyPlanToProject } from '../lib/file-manager/apply';
import { renderApplyMarkdown, renderPlanMarkdown } from '../lib/file-manager/report';
import type { PlanResult } from '../lib/file-manager/types';

function getArgValue(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  const value = process.argv[idx + 1];
  if (!value || value.startsWith('--')) return null;
  return value;
}

function readJson(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as unknown;
}

function isPlanResult(value: unknown): value is PlanResult {
  if (!value || typeof value !== 'object') return false;
  const planId = (value as { planId?: unknown }).planId;
  const actions = (value as { actions?: unknown }).actions;
  const createdAt = (value as { createdAt?: unknown }).createdAt;
  if (typeof planId !== 'string' || typeof createdAt !== 'string') return false;
  if (!Array.isArray(actions)) return false;
  return true;
}

function writeText(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
}

async function main(): Promise<void> {
  const planPath = getArgValue('--plan');
  if (!planPath) {
    process.stderr.write('Missing --plan <path-to-plan.json>\n');
    process.exitCode = 1;
    return;
  }

  const projectRoot = getProjectRoot();
  const absPlanPath = path.isAbsolute(planPath) ? planPath : path.resolve(projectRoot, planPath);
  if (!fs.existsSync(absPlanPath)) {
    process.stderr.write(`Plan not found: ${absPlanPath}\n`);
    process.exitCode = 1;
    return;
  }

  const json = readJson(absPlanPath);
  if (!isPlanResult(json)) {
    process.stderr.write('Invalid plan JSON\n');
    process.exitCode = 1;
    return;
  }

  const result = applyPlanToProject({ plan: json, projectRoot });
  const backupAbs = path.resolve(projectRoot, result.backupDir);
  writeText(path.join(backupAbs, 'plan.md'), renderPlanMarkdown(json));
  writeText(path.join(backupAbs, 'apply.md'), renderApplyMarkdown(result));
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

void main();
