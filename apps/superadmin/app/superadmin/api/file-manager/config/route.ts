import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { ensureFileManagerEnabled } from '../shared';
import { getProjectRoot } from '@/lib/docs-config';
import { loadFileManagerConfig, saveFileManagerConfig, safeParseConfig } from '@/lib/file-manager/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const enabled = ensureFileManagerEnabled();
  if (!enabled.ok) return enabled.response;

  try {
    const { projectRoot, configPath, config } = loadFileManagerConfig();
    const raw = fs.readFileSync(configPath, 'utf-8');
    return NextResponse.json({
      projectRoot,
      configPath: path.relative(projectRoot, configPath),
      config,
      raw,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load config', details: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const enabled = ensureFileManagerEnabled();
  if (!enabled.ok) return enabled.response;

  try {
    const body = (await request.json()) as unknown;
    const payload = body && typeof body === 'object' ? (body as { raw?: unknown; config?: unknown }) : null;
    const raw = payload && typeof payload.raw === 'string' ? payload.raw : null;
    const configValue = raw ? (JSON.parse(raw) as unknown) : payload?.config;

    const parsed = safeParseConfig(configValue);
    if (!parsed.ok) {
      return NextResponse.json({ error: 'Invalid config', details: parsed.error }, { status: 400 });
    }

    const projectRoot = getProjectRoot();
    const saved = saveFileManagerConfig({ projectRoot, config: parsed.config });
    return NextResponse.json({
      ok: true,
      projectRoot: saved.projectRoot,
      configPath: path.relative(saved.projectRoot, saved.configPath),
      config: saved.config,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save config', details: String(err) }, { status: 500 });
  }
}
