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

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
}

function hasScopeFiles(dirPath: string, scope: DocsScope): boolean {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') && scope === 'docs') continue;
      if (SKIP_DIRS.has(entry.name)) continue;
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (scope === 'docs') {
          if (DOCS_EXTENSIONS.has(ext)) return true;
        } else {
          if (PROJECT_EXTENSIONS.has(ext) || entry.name === '.env' || entry.name.startsWith('.env.'))
            return true;
        }
      }
      if (entry.isDirectory() && hasScopeFiles(path.join(dirPath, entry.name), scope)) return true;
    }
  } catch {
    /* skip unreadable */
  }
  return false;
}

function buildTree(dirPath: string, relativePath: string, scope: DocsScope): TreeNode[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  const nodes: TreeNode[] = entries
    .filter((entry) => {
      if (entry.name.startsWith('.') && scope === 'docs') return false;
      if (SKIP_DIRS.has(entry.name)) return false;
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        return isProjectScopeFile(entry.name, ext, scope);
      }
      return hasScopeFiles(path.join(dirPath, entry.name), scope);
    })
    .map((entry) => {
      const entryRelPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        const children = buildTree(path.join(dirPath, entry.name), entryRelPath, scope);
        return {
          name: entry.name,
          path: entryRelPath,
          type: 'directory' as const,
          children,
        };
      }

      return {
        name: entry.name,
        path: entryRelPath,
        type: 'file' as const,
      };
    })
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  return nodes;
}

function countFiles(nodes: TreeNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.type === 'file') count++;
    if (node.children) count += countFiles(node.children);
  }
  return count;
}

export async function GET(request: NextRequest) {
  const scope = (request.nextUrl.searchParams.get('scope') || 'docs') as DocsScope;
  if (scope !== 'docs' && scope !== 'project') {
    return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
  }

  const ROOT = getRoot(scope);

  try {
    if (!fs.existsSync(ROOT)) {
      logDocsError('tree', `Root not found: ${ROOT}`);
      return NextResponse.json(
        { error: 'Directory not found', path: ROOT },
        { status: 404 }
      );
    }

    const tree = buildTree(ROOT, '', scope);
    const totalFiles = countFiles(tree);
    logDocsInfo('tree', `Served tree with ${totalFiles} files from ${ROOT} (scope=${scope})`);

    return NextResponse.json({ tree, totalFiles });
  } catch (error) {
    logDocsError('tree', 'Failed to read directory', error);
    return NextResponse.json(
      { error: 'Failed to read directory', details: String(error) },
      { status: 500 }
    );
  }
}
