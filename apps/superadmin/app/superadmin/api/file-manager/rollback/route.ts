import { NextRequest, NextResponse } from 'next/server';
import { ensureFileManagerEnabled } from '../shared';
import { getProjectRoot } from '@/lib/docs-config';
import { rollbackPlanFromBackup } from '@/lib/file-manager/rollback';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const enabled = ensureFileManagerEnabled();
  if (!enabled.ok) return enabled.response;

  try {
    const body = (await request.json()) as unknown;
    const planId = body && typeof body === 'object' ? (body as { planId?: unknown }).planId : null;
    if (typeof planId !== 'string' || planId.trim().length === 0) {
      return NextResponse.json({ error: 'Missing planId' }, { status: 400 });
    }

    const projectRoot = getProjectRoot();
    const result = rollbackPlanFromBackup({ projectRoot, planId: planId.trim() });
    return NextResponse.json({ ok: result.errors.length === 0, result });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to rollback', details: String(err) }, { status: 500 });
  }
}
