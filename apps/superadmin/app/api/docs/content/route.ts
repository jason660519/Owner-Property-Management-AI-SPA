import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  getRoot,
  DOCS_EXTENSIONS,
  PROJECT_EXTENSIONS,
  isProjectScopeFile,
  logDocsError,
  type DocsScope,
} from '@/lib/docs-config';

export const dynamic = 'force-dynamic';

function isAllowedContentPath(absolutePath: string, scope: DocsScope): boolean {
  const name = path.basename(absolutePath);
  const ext = path.extname(absolutePath).toLowerCase();
  if (scope === 'docs') {
    return DOCS_EXTENSIONS.has(ext);
  }
  return (
    PROJECT_EXTENSIONS.has(ext) || name === '.env' || name.startsWith('.env.')
  );
}

export async function GET(request: NextRequest) {
  const scope = (request.nextUrl.searchParams.get('scope') || 'docs') as DocsScope;
  if (scope !== 'docs' && scope !== 'project') {
    return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
  }

  const ROOT = getRoot(scope);

  try {
    const filePath = request.nextUrl.searchParams.get('path');

    if (!filePath) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
    }

    const absolutePath = path.resolve(ROOT, filePath);
    const normalizedRoot = path.resolve(ROOT);
    if (
      !absolutePath.startsWith(normalizedRoot + path.sep) &&
      absolutePath !== normalizedRoot
    ) {
      logDocsError('content', `Path traversal rejected: ${filePath}`);
      return NextResponse.json(
        { error: 'Access denied: path traversal detected' },
        { status: 403 }
      );
    }

    if (!isAllowedContentPath(absolutePath, scope)) {
      return NextResponse.json(
        { error: `File type not supported in scope ${scope}` },
        { status: 400 }
      );
    }

    if (!fs.existsSync(absolutePath)) {
      return NextResponse.json({ error: 'File not found', path: filePath }, { status: 404 });
    }

    const stat = fs.statSync(absolutePath);
    if (!stat.isFile()) {
      return NextResponse.json({ error: 'Not a file' }, { status: 400 });
    }

    let content: string;
    try {
      content = fs.readFileSync(absolutePath, 'utf-8');
    } catch {
      return NextResponse.json(
        { error: 'File is not readable as text' },
        { status: 400 }
      );
    }

    const lastModified = stat.mtime.toISOString();

    return NextResponse.json({
      content,
      path: filePath,
      name: path.basename(filePath),
      lastModified,
      size: stat.size,
    });
  } catch (error) {
    logDocsError('content', 'Failed to read file', error);
    return NextResponse.json(
      { error: 'Failed to read file', details: String(error) },
      { status: 500 }
    );
  }
}
