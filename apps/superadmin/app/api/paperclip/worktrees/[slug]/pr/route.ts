// POST /api/paperclip/worktrees/[slug]/pr
// Push the agent branch and create a GitHub PR via gh CLI.

import { NextRequest, NextResponse } from 'next/server';
import { pushBranch, createPR, getPRStatus, buildPRBody } from '@/lib/paperclip/github';
import { addEntry } from '@/lib/paperclip/merge-history';
import { sanitizeSlug, BRANCH_PREFIX } from '@/lib/paperclip/worktree';

function repoRoot(): string {
  return process.cwd().replace(/\/apps\/superadmin$/, '');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await params;
  const slug = sanitizeSlug(rawSlug);
  if (!slug) {
    return NextResponse.json({ ok: false, error: 'Invalid slug.' }, { status: 400 });
  }

  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON.' }, { status: 400 });
  }

  const branch = `${BRANCH_PREFIX}${slug}`;
  const base = (body.baseBranch as string) ?? 'main';
  const root = repoRoot();

  // Check if PR already exists
  const existing = await getPRStatus(branch, root);
  if (existing) {
    return NextResponse.json({
      ok: true,
      alreadyExists: true,
      prUrl: existing.url,
      prNumber: existing.number,
      state: existing.state,
    });
  }

  // Push branch to origin
  try {
    await pushBranch(branch, root);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Push failed: ${err instanceof Error ? err.message : 'unknown'}` },
      { status: 502 },
    );
  }

  // Build PR content
  const title = (body.title as string) ?? `[Paperclip] ${slug}`;
  const prBody = (body.body as string) ?? buildPRBody({
    slug,
    filesChanged: (body.filesChanged as number) ?? 0,
    insertions: (body.insertions as number) ?? 0,
    deletions: (body.deletions as number) ?? 0,
    commitSubjects: (body.commitSubjects as string[]) ?? [],
    agentName: body.agentName as string | undefined,
  });

  try {
    const pr = await createPR({ branch, base, title, body: prBody, repoRoot: root });

    // Record in merge history
    addEntry({
      slug,
      branch,
      status: 'pr_created',
      prUrl: pr.url,
      prNumber: pr.number,
      commitsMerged: 0,
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      prUrl: pr.url,
      prNumber: pr.number,
      state: pr.state,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `PR creation failed: ${err instanceof Error ? err.message : 'unknown'}` },
      { status: 502 },
    );
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await params;
  const slug = sanitizeSlug(rawSlug);
  const branch = `${BRANCH_PREFIX}${slug}`;
  const root = repoRoot();

  const pr = await getPRStatus(branch, root);
  if (!pr) {
    return NextResponse.json({ ok: true, exists: false });
  }

  return NextResponse.json({
    ok: true,
    exists: true,
    url: pr.url,
    number: pr.number,
    state: pr.state,
  });
}
