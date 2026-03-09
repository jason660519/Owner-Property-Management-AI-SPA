// filepath: apps/superadmin/app/api/transcript-parse/local/route.ts
// created: 2026-03-09 | creator: GitHub Copilot
// Calls the local Python CLI parser directly via child_process.
// Does NOT require the OCR HTTP service to be running.

import { execFile } from 'child_process';
import path from 'path';
import { promisify } from 'util';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const execFileAsync = promisify(execFile);

// Project root is two levels up from apps/superadmin (where Next.js dev runs)
const PROJECT_ROOT = path.resolve(process.cwd(), '../..');
const OCR_DIR = path.join(PROJECT_ROOT, 'backend/ocr_service');
const PYTHON_BIN = path.join(OCR_DIR, 'venv/bin/python3');
const CLI_SCRIPT = path.join(OCR_DIR, 'parse_local_cli.py');

export async function POST(request: NextRequest) {
  let body: { documentId?: string };
  try {
    body = (await request.json()) as { documentId?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { documentId } = body;
  if (!documentId) {
    return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
  }

  try {
    const { stdout, stderr } = await execFileAsync(
      PYTHON_BIN,
      [CLI_SCRIPT, documentId],
      {
        cwd: OCR_DIR,
        timeout: 30_000,
        env: {
          ...process.env,
          // Python CLI expects SUPABASE_URL; Next.js stores it as NEXT_PUBLIC_SUPABASE_URL
          SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        },
        maxBuffer: 5 * 1024 * 1024, // 5 MB
      },
    );

    if (stderr) {
      console.warn('[LocalParse CLI] stderr:', stderr);
    }

    const data = JSON.parse(stdout) as Record<string, unknown>;
    if ('error' in data) {
      return NextResponse.json({ error: data.error }, { status: 422 });
    }
    return NextResponse.json(data);
  } catch (err: unknown) {
    // execFileAsync throws an ExecFileException which has .stderr and .stdout properties
    const execErr = err as { message?: string; stderr?: string; stdout?: string; code?: number };
    const stderr = execErr.stderr ?? '';
    const stdout = execErr.stdout ?? '';
    const message = execErr.message ?? String(err);

    console.error('[LocalParse CLI] exit code:', execErr.code);
    console.error('[LocalParse CLI] stderr:', stderr);
    console.error('[LocalParse CLI] stdout:', stdout);

    // CLI script writes JSON {"error": "..."} to stdout on failure
    const outputToSearch = stdout || stderr;
    try {
      const jsonMatch = outputToSearch.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { error?: string };
        if (parsed.error) {
          return NextResponse.json({ error: parsed.error }, { status: 422 });
        }
      }
    } catch {
      // ignore parse failure
    }

    if (message.includes('ENOENT') || stderr.includes('No such file')) {
      return NextResponse.json(
        { error: 'Python venv 未初始化，請先在 backend/ocr_service/ 執行 python3 -m venv venv && venv/bin/pip install -r requirements.txt' },
        { status: 503 },
      );
    }

    const detail = stderr.trim() || message;
    return NextResponse.json({ error: '地端解析失敗：' + detail }, { status: 500 });
  }
}

