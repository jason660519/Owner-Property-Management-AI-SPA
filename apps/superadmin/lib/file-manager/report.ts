import type { ApplyResult, PlanResult, ScanResult, Severity } from './types';

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(idx === 0 ? 0 : 2)} ${units[idx]}`;
}

function severityLine(summary: Record<Severity, number>): string {
  return `error=${summary.error} | warning=${summary.warning} | info=${summary.info}`;
}

export function renderScanMarkdown(scan: ScanResult): string {
  const lines: string[] = [];
  lines.push(`# File Manager Scan Report`);
  lines.push(``);
  lines.push(`- scannedAt: ${scan.scannedAt}`);
  lines.push(`- projectRoot: ${scan.projectRoot}`);
  lines.push(`- configPath: ${scan.configPath}`);
  lines.push(``);
  lines.push(`## Summary`);
  lines.push(``);
  lines.push(`- files: ${scan.summary.totalFiles}`);
  lines.push(`- dirs: ${scan.summary.totalDirs}`);
  lines.push(`- totalBytes: ${formatBytes(scan.summary.totalBytes)}`);
  lines.push(`- violations: ${severityLine(scan.summary.violationsBySeverity)}`);
  lines.push(`- duplicateGroups: ${scan.duplicates.length}`);
  lines.push(``);
  lines.push(`## Violations`);
  lines.push(``);
  if (scan.violations.length === 0) {
    lines.push(`- none`);
  } else {
    for (const v of scan.violations.slice(0, 300)) {
      const rule = v.ruleId ? ` (${v.ruleId})` : '';
      lines.push(`- [${v.severity}] ${v.relativePath}${rule}: ${v.message}`);
    }
    if (scan.violations.length > 300) {
      lines.push(`- ... truncated (${scan.violations.length - 300} more)`);
    }
  }
  lines.push(``);
  lines.push(`## Duplicates`);
  lines.push(``);
  if (scan.duplicates.length === 0) {
    lines.push(`- none`);
  } else {
    for (const g of scan.duplicates.slice(0, 80)) {
      lines.push(`- sha256=${g.contentHash} bytes=${g.bytes} files=${g.files.length}`);
      for (const f of g.files.slice(0, 10)) {
        lines.push(`  - ${f.relativePath}`);
      }
      if (g.files.length > 10) {
        lines.push(`  - ... truncated (${g.files.length - 10} more)`);
      }
    }
    if (scan.duplicates.length > 80) {
      lines.push(`- ... truncated (${scan.duplicates.length - 80} more groups)`);
    }
  }
  lines.push(``);
  lines.push(`## Top Dirs (by file count)`);
  lines.push(``);
  for (const row of scan.summary.topDirsByCount) {
    lines.push(`- ${row.dir || '(root)'}: ${row.count}`);
  }
  lines.push(``);
  return lines.join('\n');
}

export function renderPlanMarkdown(plan: PlanResult): string {
  const lines: string[] = [];
  lines.push(`# File Manager Plan`);
  lines.push(``);
  lines.push(`- planId: ${plan.planId}`);
  lines.push(`- createdAt: ${plan.createdAt}`);
  lines.push(`- scannedAt: ${plan.scan.scannedAt}`);
  lines.push(`- actions: ${plan.actions.length}`);
  lines.push(``);
  if (plan.warnings.length > 0) {
    lines.push(`## Warnings`);
    lines.push(``);
    for (const w of plan.warnings) lines.push(`- ${w}`);
    lines.push(``);
  }
  lines.push(`## Actions`);
  lines.push(``);
  if (plan.actions.length === 0) {
    lines.push(`- none`);
    lines.push(``);
    return lines.join('\n');
  }
  for (const a of plan.actions.slice(0, 500)) {
    if (a.type === 'delete') {
      lines.push(`- [delete] ${a.from} (${a.ruleId}): ${a.reason}`);
    } else {
      lines.push(`- [${a.type}] ${a.from} -> ${a.to ?? ''} (${a.ruleId}): ${a.reason}`);
    }
  }
  if (plan.actions.length > 500) {
    lines.push(`- ... truncated (${plan.actions.length - 500} more)`);
  }
  lines.push(``);
  return lines.join('\n');
}

export function renderApplyMarkdown(result: ApplyResult): string {
  const lines: string[] = [];
  lines.push(`# File Manager Apply Result`);
  lines.push(``);
  lines.push(`- planId: ${result.planId}`);
  lines.push(`- appliedAt: ${result.appliedAt}`);
  lines.push(`- backupDir: ${result.backupDir}`);
  lines.push(`- manifestPath: ${result.manifestPath}`);
  lines.push(`- appliedActions: ${result.appliedActions.length}`);
  lines.push(`- skippedActions: ${result.skippedActions.length}`);
  lines.push(``);
  if (result.skippedActions.length > 0) {
    lines.push(`## Skipped`);
    lines.push(``);
    for (const s of result.skippedActions.slice(0, 200)) {
      lines.push(`- [${s.type}] ${s.from}: ${s.skipReason}`);
    }
    if (result.skippedActions.length > 200) {
      lines.push(`- ... truncated (${result.skippedActions.length - 200} more)`);
    }
    lines.push(``);
  }
  return lines.join('\n');
}
