import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { ROADMAP_DATA } from '@/app/data/roadmap';
import { getProjectRoot } from '@/lib/docs-config';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import { canUseProjectFilePath } from '@/app/superadmin/dashboard/project-progress/components/development-table/path-utils';
import {
  buildFallbackDevLogDocPath,
  normalizeRowIdInput,
  resolveConfiguredDevLogDocPath,
} from '@/app/superadmin/dashboard/project-progress/components/development-table/types';

export const dynamic = 'force-dynamic';

const DEV_LOG_ALLOWED_PREFIXES = ['project-process/', 'docs/'] as const;

type DevLogDocPathState = 'configured' | 'missing' | 'invalid';

function buildDevLogPayload(rowId: string) {
  const numeric = /^\d+$/.test(rowId) ? parseInt(rowId, 10) : Number.NaN;
  const feature =
    !Number.isNaN(numeric) && numeric >= 1 && numeric <= ROADMAP_DATA.features.length
      ? ROADMAP_DATA.features[numeric - 1]
      : null;

  const configuredValue = feature?.devLogDocPath?.trim() || null;
  const configuredPath = feature ? resolveConfiguredDevLogDocPath(feature) : null;
  const docPathState: DevLogDocPathState = configuredValue
    ? (configuredPath ? 'configured' : 'invalid')
    : 'missing';
  const resolvedPath = configuredPath ?? buildFallbackDevLogDocPath(rowId);

  return {
    configuredValue,
    docPathState,
    resolvedPath,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireSuperadmin({
    request,
    routeLabel: '/api/project-progress/dev-log',
  });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const rowId = normalizeRowIdInput(request.nextUrl.searchParams.get('rowId') ?? '');
  if (!rowId) {
    return NextResponse.json({ error: 'Missing rowId parameter' }, { status: 400 });
  }

  const payload = buildDevLogPayload(rowId);
  if (!canUseProjectFilePath(payload.resolvedPath, DEV_LOG_ALLOWED_PREFIXES)) {
    return NextResponse.json(
      {
        error: 'Resolved dev log path is not allowed',
        path: payload.resolvedPath,
        docPathState: payload.docPathState,
        configuredValue: payload.configuredValue,
      },
      { status: 400 },
    );
  }

  const projectRoot = getProjectRoot();
  const absolutePath = path.resolve(projectRoot, payload.resolvedPath);
  const normalizedRoot = path.resolve(projectRoot);
  if (
    !absolutePath.startsWith(normalizedRoot + path.sep) &&
    absolutePath !== normalizedRoot
  ) {
    return NextResponse.json(
      {
        error: 'Access denied: path traversal detected',
        path: payload.resolvedPath,
        docPathState: payload.docPathState,
        configuredValue: payload.configuredValue,
      },
      { status: 403 },
    );
  }

  if (!fs.existsSync(absolutePath)) {
    return NextResponse.json(
      {
        error: 'File not found',
        path: payload.resolvedPath,
        docPathState: payload.docPathState,
        configuredValue: payload.configuredValue,
      },
      { status: 404 },
    );
  }

  const stat = fs.statSync(absolutePath);
  if (!stat.isFile()) {
    return NextResponse.json(
      {
        error: 'Not a file',
        path: payload.resolvedPath,
        docPathState: payload.docPathState,
        configuredValue: payload.configuredValue,
      },
      { status: 400 },
    );
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');
  return NextResponse.json({
    content,
    path: payload.resolvedPath,
    name: path.basename(payload.resolvedPath),
    lastModified: stat.mtime.toISOString(),
    size: stat.size,
    docPathState: payload.docPathState,
    configuredValue: payload.configuredValue,
  });
}
