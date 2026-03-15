// filepath: apps/superadmin/app/api/transcript-parse/local/route.ts
// created: 2026-03-09 | creator: GitHub Copilot
// updated: 2026-03-14 | updater: Claude Sonnet 4.6
//
// Strategy (evaluated in order):
//   1. CLI --file mode  : Next.js downloads the PDF, writes a temp file,
//                         runs parse_local_cli.py --file <path>.
//                         No Supabase env vars needed in Python.
//                         CLI script located via OCR_LOCAL_DIR or auto-detected.
//   2. HTTP /parse-content: POSTs file bytes to FastAPI service (new endpoint).
//   3. CLI document_id mode (legacy): passes document_id, needs Python to reach Supabase.
//   4. 503 — nothing configured / reachable.

import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const runtime = 'nodejs';

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Shared: download file from Supabase in Next.js (has credentials)
// ---------------------------------------------------------------------------

async function downloadDocument(
  documentId: string,
): Promise<{ fileBuffer: Buffer; error?: never } | { fileBuffer?: never; error: string }> {
  const adminClient = createAdminClient();

  const { data: doc, error: docError } = await adminClient
    .from('property_documents')
    .select('file_path')
    .eq('id', documentId)
    .single();

  if (docError || !doc?.file_path) {
    return { error: '找不到該文件（document_id 無效或文件已刪除）' };
  }

  try {
    const { data: blob, error: dlErr } = await adminClient.storage
      .from('property-documents')
      .download(doc.file_path as string);
    if (dlErr || !blob) {
      return { error: `無法從儲存空間下載文件：${dlErr?.message ?? '未知錯誤'}` };
    }
    return { fileBuffer: Buffer.from(await blob.arrayBuffer()) };
  } catch (e) {
    return { error: `下載文件失敗：${e instanceof Error ? e.message : String(e)}` };
  }
}

// ---------------------------------------------------------------------------
// Auto-detect OCR service directory (no env var required)
// ---------------------------------------------------------------------------

function findOcrServiceDir(): string | null {
  if (process.env.OCR_LOCAL_DIR) return process.env.OCR_LOCAL_DIR;
  // In monorepo: Next.js cwd is the project root when running `next dev`
  const candidates = [
    path.join(process.cwd(), 'backend', 'ocr_service'),
    path.join(process.cwd(), '..', '..', 'backend', 'ocr_service'),
    path.join(process.cwd(), '..', 'backend', 'ocr_service'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'parse_local_cli.py'))) return dir;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Strategy 1: CLI --file mode
// Next.js downloads the PDF → writes temp file → Python parses it locally
// No Supabase env vars needed inside Python.
// ---------------------------------------------------------------------------

async function callCliFileMode(
  documentId: string,
): Promise<{ data: Record<string, unknown>; error?: string; noTextLayer?: boolean; unavailable?: boolean }> {
  const ocrDir = findOcrServiceDir();
  if (!ocrDir) return { data: {}, unavailable: true };

  const cliScript = process.env.OCR_LOCAL_CLI_SCRIPT ?? path.join(ocrDir, 'parse_local_cli.py');
  // Prefer venv python (has all deps); fall back to env var or system python3
  const venvPython = path.join(ocrDir, 'venv', 'bin', 'python3');
  const pythonBin = process.env.OCR_LOCAL_PYTHON_BIN || (fs.existsSync(venvPython) ? venvPython : 'python3');

  // Download file in Next.js
  const downloaded = await downloadDocument(documentId);
  if (downloaded.error || !downloaded.fileBuffer) return { data: {}, error: downloaded.error || '無法下載文件內容' };

  // Write to temp file
  const tmpPath = path.join(os.tmpdir(), `transcript_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`);
  try {
    fs.writeFileSync(tmpPath, downloaded.fileBuffer);
  } catch (e) {
    return { data: {}, error: `寫入暫存檔失敗：${e instanceof Error ? e.message : String(e)}` };
  }

  try {
    const { stdout, stderr } = await execFileAsync(
      pythonBin,
      [cliScript, '--file', tmpPath],
      { cwd: ocrDir, timeout: 30_000, maxBuffer: 5 * 1024 * 1024 },
    );
    if (stderr) console.warn('[LocalParse CLI --file] stderr:', stderr);

    const parsed = JSON.parse(stdout) as Record<string, unknown>;
    if ('error' in parsed) {
      const msg = parsed.error as string;
      const noTextLayer = msg.includes('無可提取的文字層') || msg.includes('請改用雲端解析');
      return { data: {}, error: msg, noTextLayer };
    }
    // Attach document_id for traceability
    return { data: { document_id: documentId, ...parsed } };
  } catch (err: unknown) {
    const execErr = err as { message?: string; stderr?: string; stdout?: string };
    const stderr = execErr.stderr ?? '';
    const stdout = execErr.stdout ?? '';
    const outputToSearch = stdout || stderr;
    try {
      const m = outputToSearch.match(/\{[\s\S]*\}/);
      if (m) {
        const p = JSON.parse(m[0]) as { error?: string };
        if (p.error) {
          const noTextLayer = p.error.includes('無可提取的文字層') || p.error.includes('請改用雲端解析');
          return { data: {}, error: p.error, noTextLayer };
        }
      }
    } catch { /* ignore */ }

    const message = execErr.message ?? String(err);
    if (message.includes('ENOENT') || stderr.includes('No such file')) {
      return { data: {}, error: '找不到 Python 執行檔，請確認 python3 是否在 PATH 中，或設定 OCR_LOCAL_PYTHON_BIN' };
    }
    return { data: {}, error: '地端解析失敗：' + (stderr.trim() || message) };
  } finally {
    try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// Strategy 2: HTTP /api/v1/parse-content (new endpoint, bytes upload)
// ---------------------------------------------------------------------------

async function callHttpService(
  documentId: string,
): Promise<{ data: Record<string, unknown>; error?: string; noTextLayer?: boolean; unavailable?: boolean }> {
  const baseUrl = (process.env.OCR_HTTP_SERVICE_URL ?? 'http://localhost:8819').replace(/\/$/, '');

  const downloaded = await downloadDocument(documentId);
  if (downloaded.error || !downloaded.fileBuffer) return { data: {}, error: downloaded.error || '無法下載文件內容' };

  const url = `${baseUrl}/api/v1/parse-content`;
  const formData = new FormData();
  formData.append(
    'file',
    new Blob([downloaded.fileBuffer.buffer as ArrayBuffer], { type: 'application/pdf' }),
    'transcript.pdf',
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(url, { method: 'POST', body: formData, signal: controller.signal });
    const isJson = (res.headers.get('content-type') ?? '').includes('application/json');

    if (res.ok && isJson) {
      const data = (await res.json()) as Record<string, unknown>;
      return { data: { document_id: documentId, ...data } };
    }
    if (res.status === 422 && isJson) {
      const body = (await res.json()) as { detail?: string };
      const msg = body.detail ?? 'PDF 無可提取的文字層，請改用雲端解析。';
      return { data: {}, error: msg, noTextLayer: true };
    }
    if (res.status === 404) {
      // New endpoint not yet deployed — service needs restart
      return { data: {}, unavailable: true };
    }
    const text = await res.text();
    return { data: {}, error: `OCR 服務回應異常 (${res.status}): ${text.slice(0, 200)}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const connErr = msg.includes('ECONNREFUSED') || msg.includes('fetch failed') || msg.includes('ENOTFOUND') || msg.includes('AbortError');
    if (connErr) return { data: {}, unavailable: true };
    return { data: {}, error: '地端解析請求失敗：' + msg };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

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

  // ── Strategy 1: CLI --file (auto-detected, no Supabase creds in Python) ──
  const ocrDir = findOcrServiceDir();
  if (ocrDir) {
    const { data, error, noTextLayer } = await callCliFileMode(documentId);
    if (!error) return NextResponse.json(data);
    if (noTextLayer) return NextResponse.json({ error }, { status: 422 });
    // Fall through to HTTP on ENOENT (python not found), etc.
    if (!error.includes('找不到 Python') && !error.includes('ENOENT')) {
      return NextResponse.json({ error }, { status: 422 });
    }
  }

  // ── Strategy 2: HTTP service /api/v1/parse-content ────────────────────────
  const httpResult = await callHttpService(documentId);
  if (!httpResult.unavailable) {
    if (httpResult.error) {
      return NextResponse.json({ error: httpResult.error }, { status: httpResult.noTextLayer ? 422 : 422 });
    }
    return NextResponse.json(httpResult.data);
  }

  // ── Nothing worked ────────────────────────────────────────────────────────
  if (!ocrDir) {
    return NextResponse.json(
      {
        error:
          '找不到地端解析器（parse_local_cli.py）。請確認 backend/ocr_service 目錄存在，' +
          '或設定 OCR_LOCAL_DIR 環境變數指向該目錄。',
      },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      error:
        '地端解析失敗：找不到可用的 Python 執行檔。請確認 python3 在系統 PATH 中，' +
        '或設定 OCR_LOCAL_PYTHON_BIN 環境變數。',
    },
    { status: 503 },
  );
}
