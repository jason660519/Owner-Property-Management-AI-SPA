// filepath: apps/superadmin/app/api/fp-converter/route.ts
// API route: accept a single .fp file upload, run convert_fp.py, return PDF binary

import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink, mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { createClient } from '@/utils/supabase/server';

const execFileAsync = promisify(execFile);

// Resolve the path to convert_fp.py relative to the monorepo root.
// process.cwd() is apps/superadmin/ when running `npm run dev` inside that dir.
function resolveConverterScript(): string {
  const candidates = [
    path.resolve(process.cwd(), '../../tools/fp-converter/convert_fp.py'),
    path.resolve(process.cwd(), 'tools/fp-converter/convert_fp.py'),
  ];
  // Return the first candidate that likely exists (checked at boot, not per-request)
  return candidates[0];
}

const CONVERTER_SCRIPT = resolveConverterScript();

// Verify caller is super_admin
async function requireSuperAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: roleRows } = await supabase.rpc('get_user_roles', {
      lookup_user_id: user.id,
    });
    const roles = Array.isArray(roleRows)
      ? roleRows.map((r: { role_name: string }) => r.role_name)
      : [];
    return (
      roles.includes('super_admin') ||
      user.user_metadata?.role === 'super_admin'
    );
  } catch {
    return false;
  }
}

// Validate that the bytes start with the FinePrint magic header "FINC"
function isFpFile(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x46 && // F
    bytes[1] === 0x49 && // I
    bytes[2] === 0x4e && // N
    bytes[3] === 0x43    // C
  );
}

export const config = {
  api: { bodyParser: false },
};

export async function POST(request: NextRequest) {
  // Auth check
  const authorized = await requireSuperAdmin();
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: '無效的請求格式' }, { status: 400 });
  }

  const uploaded = formData.get('file');
  if (!uploaded || !(uploaded instanceof File)) {
    return NextResponse.json({ error: '請上傳 .fp 檔案' }, { status: 400 });
  }

  // Validate extension
  if (!uploaded.name.toLowerCase().endsWith('.fp')) {
    return NextResponse.json({ error: '只接受 .fp 格式檔案' }, { status: 400 });
  }

  // Validate file size (max 5MB per file — FinePrint files are typically <100KB)
  if (uploaded.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: '檔案過大（上限 5MB）' }, { status: 400 });
  }

  const bytes = new Uint8Array(await uploaded.arrayBuffer());

  // Validate FinePrint magic bytes to prevent arbitrary file processing
  if (!isFpFile(bytes)) {
    return NextResponse.json({ error: '檔案不是有效的 FinePrint .fp 格式' }, { status: 400 });
  }

  // Write to a secure temp directory
  const tempDir = await mkdtemp(path.join(tmpdir(), 'fp-conv-'));
  // Sanitize filename: keep only safe characters
  const safeName = uploaded.name.replace(/[^a-zA-Z0-9\u4e00-\u9fff\u3400-\u4dbf\-_.·]/g, '_');
  const inputPath = path.join(tempDir, safeName);
  const outputDir = path.join(tempDir, 'out');

  try {
    await writeFile(inputPath, bytes);

    // Run the Python converter
    await execFileAsync(
      '/opt/homebrew/bin/python3',
      [CONVERTER_SCRIPT, inputPath, '--output', outputDir, '--format', 'pdf'],
      { timeout: 30_000 },
    );

    // Find the generated PDF
    const pdfName = safeName.replace(/\.fp$/i, '.pdf');
    const pdfPath = path.join(outputDir, pdfName);
    const pdfBytes = await readFile(pdfPath);

    // Sanitize output filename for Content-Disposition
    const displayName = encodeURIComponent(
      uploaded.name.replace(/\.fp$/i, '.pdf'),
    );

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${displayName}`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[fp-converter] conversion error:', message);
    return NextResponse.json(
      { error: `轉換失敗：${message.slice(0, 200)}` },
      { status: 500 },
    );
  } finally {
    // Clean up temp files silently
    try {
      await unlink(inputPath).catch(() => undefined);
      const pdfName = safeName.replace(/\.fp$/i, '.pdf');
      await unlink(path.join(outputDir, pdfName)).catch(() => undefined);
      await import('fs/promises').then(fs =>
        fs.rmdir(outputDir).catch(() => undefined),
      );
      await import('fs/promises').then(fs =>
        fs.rmdir(tempDir).catch(() => undefined),
      );
    } catch {
      // Silently ignore cleanup errors
    }
  }
}
