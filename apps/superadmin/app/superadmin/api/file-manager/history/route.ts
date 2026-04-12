import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { ensureFileManagerEnabled } from '../shared';
import { getProjectRoot } from '@/lib/docs-config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const enabled = ensureFileManagerEnabled();
  if (!enabled.ok) return enabled.response;

  try {
    const projectRoot = getProjectRoot();
    const historyPath = path.resolve(projectRoot, 'backups/file-manager/history.json');
    if (!fs.existsSync(historyPath)) {
      return NextResponse.json({ plans: [] });
    }
    const raw = fs.readFileSync(historyPath, 'utf-8');
    const json = JSON.parse(raw) as unknown;
    if (!json || typeof json !== 'object') return NextResponse.json({ plans: [] });
    const plans = (json as { plans?: unknown }).plans;
    return NextResponse.json({ plans: Array.isArray(plans) ? plans : [] });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load history', details: String(err) }, { status: 500 });
  }
}
