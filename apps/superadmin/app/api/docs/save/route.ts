// filepath: apps/superadmin/app/api/docs/save/route.ts
// Save file under docs or project root. Superadmin-only; path validated.
// Project scope: all extensions allowed (including .env, secrets).

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getRoot, logDocsError, type DocsScope } from '@/lib/docs-config';

export const dynamic = 'force-dynamic';

function isSensitivePath(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return lower.includes('.env') || lower.includes('secret');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const filePath = typeof body?.path === 'string' ? body.path.trim() : '';
    const content = typeof body?.content === 'string' ? body.content : '';
    const scope = (body?.scope || request.nextUrl.searchParams.get('scope') || 'docs') as DocsScope;

    if (scope !== 'docs' && scope !== 'project') {
      return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
    }

    const ROOT = getRoot(scope);

    if (!filePath) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }

    const absolutePath = path.resolve(ROOT, filePath);
    const normalizedRoot = path.resolve(ROOT);
    if (
      !absolutePath.startsWith(normalizedRoot + path.sep) &&
      absolutePath !== normalizedRoot
    ) {
      logDocsError('save', `Path traversal rejected: ${filePath}`);
      return NextResponse.json(
        { error: 'Access denied: path traversal detected' },
        { status: 403 }
      );
    }

    const dir = path.dirname(absolutePath);
    if (!fs.existsSync(dir)) {
      return NextResponse.json(
        { error: 'Parent directory does not exist' },
        { status: 400 }
      );
    }

    if (fs.existsSync(absolutePath)) {
      const stat = fs.statSync(absolutePath);
      if (stat.isDirectory()) {
        return NextResponse.json({ error: 'Cannot overwrite a directory' }, { status: 400 });
      }
    }

    fs.writeFileSync(absolutePath, content, 'utf-8');
    const newStat = fs.statSync(absolutePath);

    const payload: { ok: boolean; path: string; lastModified: string; warning?: string } = {
      ok: true,
      path: filePath,
      lastModified: newStat.mtime.toISOString(),
    };
    if (isSensitivePath(filePath)) {
      payload.warning = '此路徑可能包含敏感資訊，請確認修改意圖。';
    }

    return NextResponse.json(payload);
  } catch (error) {
    logDocsError('save', 'Failed to save file', error);
    return NextResponse.json(
      { error: 'Failed to save file', details: String(error) },
      { status: 500 }
    );
  }
}
