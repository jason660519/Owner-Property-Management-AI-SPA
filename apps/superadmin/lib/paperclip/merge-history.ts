import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

export type MergeStatus = 'pending' | 'fixing' | 'merged' | 'pr_created';

export interface MergeHistoryEntry {
  slug: string;
  branch: string;
  status: MergeStatus;
  mergeSha?: string;
  prUrl?: string;
  prNumber?: number;
  commitsMerged: number;
  agentName?: string;
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'merge-history.json');

async function ensureDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function readHistory(): Promise<MergeHistoryEntry[]> {
  try {
    const raw = await readFile(HISTORY_FILE, 'utf-8');
    return JSON.parse(raw) as MergeHistoryEntry[];
  } catch {
    return [];
  }
}

async function writeHistory(entries: MergeHistoryEntry[]): Promise<void> {
  await ensureDir();
  await writeFile(HISTORY_FILE, JSON.stringify(entries, null, 2), 'utf-8');
}

export async function addEntry(
  entry: Omit<MergeHistoryEntry, 'createdAt' | 'updatedAt'>,
): Promise<MergeHistoryEntry> {
  const entries = await readHistory();
  const now = new Date().toISOString();
  const full: MergeHistoryEntry = { ...entry, createdAt: now, updatedAt: now };

  // Replace existing entry for same slug or append
  const idx = entries.findIndex((e) => e.slug === entry.slug);
  if (idx >= 0) {
    entries[idx] = { ...full, createdAt: entries[idx].createdAt };
  } else {
    entries.unshift(full);
  }

  await writeHistory(entries);
  return full;
}

export async function updateEntryStatus(
  slug: string,
  status: MergeStatus,
  extra?: Partial<Pick<MergeHistoryEntry, 'mergeSha' | 'prUrl' | 'prNumber'>>,
): Promise<MergeHistoryEntry | null> {
  const entries = await readHistory();
  const idx = entries.findIndex((e) => e.slug === slug);
  if (idx < 0) return null;

  entries[idx] = {
    ...entries[idx],
    status,
    ...extra,
    updatedAt: new Date().toISOString(),
  };

  await writeHistory(entries);
  return entries[idx];
}
