// GET /api/paperclip/work-summary
//
// Scans all Paperclip worktree branches and cross-references with VIS issue
// status to produce a merge-readiness report. Used by /review-agent-work
// skill and work-summary-check cron.

import { NextResponse } from 'next/server';
import { makeDockerGitRunner } from '@/lib/paperclip/worktree';

const PAPERCLIP_CONTAINER = process.env.PAPERCLIP_CONTAINER_NAME ?? 'paperclip-paperclip-1';
const BRANCH_PREFIX = 'feature/paperclip-';

const SHARED_FILE_PATTERNS = [
  'apps/superadmin/app/api/admin/sync-roadmap-to-vis/route.ts',
  'apps/superadmin/app/superadmin/dashboard/project-progress/components/ExportProgressDialog.tsx',
  'apps/superadmin/app/superadmin/dashboard/project-progress/components/ExportToVISButton.tsx',
  'apps/superadmin/scripts/sync-roadmap-to-vis.ts',
];

const CONFLICT_PRONE_FILES = [
  'apps/superadmin/app/data/roadmap.ts',
  'apps/superadmin/app/superadmin/dashboard/project-progress/page.tsx',
];

interface BranchSummary {
  slug: string;
  branch: string;
  commitsAhead: number;
  lastCommit: { sha: string; subject: string; author: string; date: string } | null;
  diffStat: { insertions: number; deletions: number; filesChanged: number };
  issues: string[];
  mergeReady: boolean;
}

async function containerGit(...args: string[]): Promise<string> {
  const runner = makeDockerGitRunner(PAPERCLIP_CONTAINER);
  const { stdout } = await runner(args);
  return stdout;
}

function parseDiffStatSummary(stat: string): { insertions: number; deletions: number; filesChanged: number } {
  const files = stat.match(/(\d+) files? changed/)?.[1] ?? '0';
  const ins = stat.match(/(\d+) insertions?\(\+\)/)?.[1] ?? '0';
  const del = stat.match(/(\d+) deletions?\(-\)/)?.[1] ?? '0';
  return { insertions: Number(ins), deletions: Number(del), filesChanged: Number(files) };
}

export async function GET() {
  let branchList: string;
  try {
    branchList = await containerGit('branch', '--list', `${BRANCH_PREFIX}*`, '--format=%(refname:short)');
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Failed to list branches: ${err instanceof Error ? err.message : 'unknown'}` },
      { status: 502 },
    );
  }

  const branches = branchList.trim().split('\n').filter(Boolean);
  if (branches.length === 0) {
    return NextResponse.json({
      ok: true, timestamp: new Date().toISOString(),
      readyToMerge: 0, inProgress: 0, hasIssues: 0, branches: [],
    });
  }

  const results: BranchSummary[] = [];

  for (const branch of branches) {
    const slug = branch.replace(BRANCH_PREFIX, '');
    try {
      const aheadStr = await containerGit('rev-list', '--count', `main..${branch}`);
      const commitsAhead = Number(aheadStr.trim()) || 0;
      if (commitsAhead === 0) continue;

      const stat = await containerGit('diff', '--stat', `main..${branch}`);
      const diffStat = parseDiffStatSummary(stat);

      let lastCommit: BranchSummary['lastCommit'] = null;
      try {
        const logLine = await containerGit('log', '-1', '--format=%H\x1f%s\x1f%an\x1f%cI', branch);
        const parts = logLine.trim().split('\x1f');
        if (parts.length >= 4) {
          lastCommit = { sha: parts[0], subject: parts[1], author: parts[2], date: parts[3] };
        }
      } catch { /* ignore */ }

      const issues: string[] = [];

      const deletedFiles = await containerGit('diff', '--name-only', '--diff-filter=D', `main..${branch}`);
      const wronglyDeleted = deletedFiles.trim().split('\n').filter(Boolean)
        .filter(f => SHARED_FILE_PATTERNS.some(p => f.includes(p)));
      if (wronglyDeleted.length > 0) {
        issues.push(`wrongly_deleted_shared_files: ${wronglyDeleted.length} files`);
      }

      const changedFiles = await containerGit('diff', '--name-only', `main..${branch}`);
      const conflictProne = changedFiles.trim().split('\n').filter(Boolean)
        .filter(f => CONFLICT_PRONE_FILES.some(p => f.includes(p)));
      if (conflictProne.length > 0) {
        issues.push(`modifies_shared_files: ${conflictProne.join(', ')}`);
      }

      results.push({
        slug, branch, commitsAhead, lastCommit, diffStat, issues,
        mergeReady: commitsAhead > 0 && issues.length === 0,
      });
    } catch { /* skip */ }
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    readyToMerge: results.filter(r => r.mergeReady).length,
    inProgress: results.filter(r => !r.mergeReady && r.issues.length === 0).length,
    hasIssues: results.filter(r => r.issues.length > 0).length,
    branches: results,
  });
}
