import fs from 'fs';
import path from 'path';
import type { ScanResult } from './types';

interface MetricsEntry {
  scannedAt: string;
  totalFiles: number;
  totalDirs: number;
  totalBytes: number;
  duplicateGroups: number;
  violationsBySeverity: { error: number; warning: number; info: number };
  violationsByRule: Record<string, number>;
}

interface MetricsFile {
  version: 1;
  entries: MetricsEntry[];
}

function readMetrics(filePath: string): MetricsFile {
  if (!fs.existsSync(filePath)) return { version: 1, entries: [] };
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(raw) as unknown;
    if (!json || typeof json !== 'object') return { version: 1, entries: [] };
    const entries = (json as { entries?: unknown }).entries;
    if (!Array.isArray(entries)) return { version: 1, entries: [] };
    const parsed = entries
      .map((e) => {
        if (!e || typeof e !== 'object') return null;
        const scannedAt = (e as { scannedAt?: unknown }).scannedAt;
        const totalFiles = (e as { totalFiles?: unknown }).totalFiles;
        const totalDirs = (e as { totalDirs?: unknown }).totalDirs;
        const totalBytes = (e as { totalBytes?: unknown }).totalBytes;
        const duplicateGroups = (e as { duplicateGroups?: unknown }).duplicateGroups;
        const violationsBySeverity = (e as { violationsBySeverity?: unknown }).violationsBySeverity;
        const violationsByRule = (e as { violationsByRule?: unknown }).violationsByRule;
        if (typeof scannedAt !== 'string') return null;
        if (typeof totalFiles !== 'number' || typeof totalDirs !== 'number' || typeof totalBytes !== 'number') return null;
        if (typeof duplicateGroups !== 'number') return null;
        if (!violationsBySeverity || typeof violationsBySeverity !== 'object') return null;
        const v = violationsBySeverity as { error?: unknown; warning?: unknown; info?: unknown };
        if (typeof v.error !== 'number' || typeof v.warning !== 'number' || typeof v.info !== 'number') return null;
        const rules = typeof violationsByRule === 'object' && violationsByRule !== null ? (violationsByRule as Record<string, number>) : {};
        return {
          scannedAt,
          totalFiles,
          totalDirs,
          totalBytes,
          duplicateGroups,
          violationsBySeverity: { error: v.error, warning: v.warning, info: v.info },
          violationsByRule: rules,
        } satisfies MetricsEntry;
      })
      .filter((e): e is MetricsEntry => e !== null);
    return { version: 1, entries: parsed };
  } catch {
    return { version: 1, entries: [] };
  }
}

function writeMetrics(filePath: string, metrics: MetricsFile): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(metrics, null, 2) + '\n', 'utf-8');
}

export function appendScanMetrics(input: { projectRoot: string; scan: ScanResult; maxEntries?: number }): string {
  const projectRoot = path.resolve(input.projectRoot);
  const maxEntries = typeof input.maxEntries === 'number' ? input.maxEntries : 200;
  const metricsPath = path.resolve(projectRoot, 'backups/file-manager/metrics.json');
  const metrics = readMetrics(metricsPath);

  const entry: MetricsEntry = {
    scannedAt: input.scan.scannedAt,
    totalFiles: input.scan.summary.totalFiles,
    totalDirs: input.scan.summary.totalDirs,
    totalBytes: input.scan.summary.totalBytes,
    duplicateGroups: input.scan.duplicates.length,
    violationsBySeverity: input.scan.summary.violationsBySeverity,
    violationsByRule: input.scan.summary.violationsByRule,
  };

  const next = [entry, ...metrics.entries].slice(0, maxEntries);
  writeMetrics(metricsPath, { version: 1, entries: next });
  return metricsPath;
}
