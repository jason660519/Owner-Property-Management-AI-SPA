import { getProjectRoot } from '../lib/docs-config';
import { rollbackPlanFromBackup } from '../lib/file-manager/rollback';

function getArgValue(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  const value = process.argv[idx + 1];
  if (!value || value.startsWith('--')) return null;
  return value;
}

async function main(): Promise<void> {
  const planId = getArgValue('--planId') ?? getArgValue('--plan-id');
  if (!planId || planId.trim().length === 0) {
    process.stderr.write('Missing --planId <planId>\n');
    process.exitCode = 1;
    return;
  }

  const projectRoot = getProjectRoot();
  const result = rollbackPlanFromBackup({ projectRoot, planId: planId.trim() });
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  if (result.errors.length > 0) process.exitCode = 2;
}

void main();
