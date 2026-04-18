import { NextRequest, NextResponse } from 'next/server';
import {
  readHistory,
  addEntry,
  updateEntryStatus,
  type MergeStatus,
} from '@/lib/paperclip/merge-history';

export async function GET() {
  const entries = await readHistory();
  return NextResponse.json({ ok: true, entries });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON.' }, { status: 400 });
  }

  const action = body.action as string | undefined;

  // Update existing entry status
  if (action === 'update') {
    const slug = body.slug as string;
    const status = body.status as MergeStatus;
    if (!slug || !status) {
      return NextResponse.json(
        { ok: false, error: 'slug and status required.' },
        { status: 400 },
      );
    }
    const entry = await updateEntryStatus(slug, status, {
      mergeSha: body.mergeSha as string | undefined,
      prUrl: body.prUrl as string | undefined,
      prNumber: body.prNumber as number | undefined,
    });
    if (!entry) {
      return NextResponse.json({ ok: false, error: 'Entry not found.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, entry });
  }

  // Add new entry
  const slug = body.slug as string;
  const branch = body.branch as string;
  const status = (body.status as MergeStatus) ?? 'merged';
  const commitsMerged = (body.commitsMerged as number) ?? 0;

  if (!slug || !branch) {
    return NextResponse.json(
      { ok: false, error: 'slug and branch required.' },
      { status: 400 },
    );
  }

  const entry = await addEntry({
    slug,
    branch,
    status,
    commitsMerged,
    mergeSha: body.mergeSha as string | undefined,
    prUrl: body.prUrl as string | undefined,
    prNumber: body.prNumber as number | undefined,
    agentName: body.agentName as string | undefined,
  });

  return NextResponse.json({ ok: true, entry }, { status: 201 });
}
