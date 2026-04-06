// filepath: apps/superadmin/app/api/backup/browse-dirs/route.ts
// GET /api/backup/browse-dirs?path= → list subdirectories of the given path
// If path is empty, returns root-level volumes/drives

import { NextRequest, NextResponse } from 'next/server';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { platform } from 'os';

interface DirEntry {
  name: string;
  path: string;
}

function listRoots(): DirEntry[] {
  const os = platform();

  if (os === 'win32') {
    // List common drive letters
    const drives: DirEntry[] = [];
    for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
      const drivePath = `${letter}:\\`;
      try {
        readdirSync(drivePath);
        drives.push({ name: `${letter}:`, path: drivePath });
      } catch {
        // Drive doesn't exist or not accessible
      }
    }
    return drives;
  }

  // macOS / Linux: list /Volumes (macOS) or /mnt, /media (Linux)
  const roots: DirEntry[] = [{ name: '/', path: '/' }];

  if (os === 'darwin') {
    try {
      const volumes = readdirSync('/Volumes');
      for (const v of volumes) {
        roots.push({ name: v, path: `/Volumes/${v}` });
      }
    } catch { /* ignore */ }
  } else {
    // Linux
    for (const mountBase of ['/mnt', '/media']) {
      try {
        const entries = readdirSync(mountBase);
        for (const e of entries) {
          const full = `${mountBase}/${e}`;
          try {
            if (statSync(full).isDirectory()) {
              roots.push({ name: e, path: full });
            }
          } catch { /* skip */ }
        }
      } catch { /* ignore */ }
    }
  }

  return roots;
}

function listSubdirs(basePath: string): DirEntry[] {
  const dirs: DirEntry[] = [];
  try {
    const entries = readdirSync(basePath);
    for (const entry of entries) {
      if (entry.startsWith('.')) continue;
      const fullPath = join(basePath, entry);
      try {
        if (statSync(fullPath).isDirectory()) {
          dirs.push({ name: entry, path: fullPath });
        }
      } catch {
        // Permission denied or other error
      }
    }
  } catch {
    // Cannot read directory
  }
  dirs.sort((a, b) => a.name.localeCompare(b.name));
  return dirs;
}

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path') ?? '';

  if (!path) {
    return NextResponse.json({ dirs: listRoots(), current: '' });
  }

  return NextResponse.json({ dirs: listSubdirs(path), current: path });
}
