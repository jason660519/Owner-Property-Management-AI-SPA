import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  getRoot,
  SKIP_DIRS,
  DOCS_EXTENSIONS,
  PROJECT_EXTENSIONS,
  isProjectScopeFile,
  logDocsError,
  logDocsInfo,
  type DocsScope,
} from '@/lib/docs-config';

export const dynamic = 'force-dynamic';

interface SearchResult {
  path: string;
  name: string;
  matches: { line: number; text: string }[];
}

function isSearchableFile(entryName: string, scope: DocsScope): boolean {
  const ext = path.extname(entryName).toLowerCase();
  return isProjectScopeFile(entryName, ext, scope);
}

function searchFiles(
  dir: string,
  query: string,
  relativePath: string,
  scope: DocsScope
): SearchResult[] {
  const results: SearchResult[] = [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.') && scope === 'docs') continue;
    if (SKIP_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      results.push(...searchFiles(fullPath, query, relPath, scope));
    } else if (entry.isFile() && isSearchableFile(entry.name, scope)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        const queryLower = query.toLowerCase();
        const matches: { line: number; text: string }[] = [];

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(queryLower)) {
            const lineText = lines[i].trim();
            const idx = lineText.toLowerCase().indexOf(queryLower);
            const start = Math.max(0, idx - 60);
            const end = Math.min(lineText.length, idx + query.length + 60);
            let snippet = lineText.substring(start, end);
            if (start > 0) snippet = '...' + snippet;
            if (end < lineText.length) snippet = snippet + '...';

            matches.push({ line: i + 1, text: snippet });
            if (matches.length >= 5) break;
          }
        }

        if (matches.length > 0) {
          results.push({ path: relPath, name: entry.name, matches });
        }
      } catch {
        /* skip unreadable */
      }
    }
  }

  return results;
}

export async function GET(request: NextRequest) {
  const scope = (request.nextUrl.searchParams.get('scope') || 'docs') as DocsScope;
  if (scope !== 'docs' && scope !== 'project') {
    return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
  }

  const ROOT = getRoot(scope);

  try {
    const query = request.nextUrl.searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    if (!fs.existsSync(ROOT)) {
      logDocsError('search', `Root not found: ${ROOT}`);
      return NextResponse.json(
        { error: 'Directory not found' },
        { status: 404 }
      );
    }

    const results = searchFiles(ROOT, query.trim(), '', scope);
    results.sort((a, b) => b.matches.length - a.matches.length);

    logDocsInfo('search', `Query "${query.trim()}" returned ${results.length} results (scope=${scope})`);

    return NextResponse.json({
      results,
      total: results.length,
      query: query.trim(),
    });
  } catch (error) {
    logDocsError('search', 'Search failed', error);
    return NextResponse.json(
      { error: 'Search failed', details: String(error) },
      { status: 500 }
    );
  }
}
