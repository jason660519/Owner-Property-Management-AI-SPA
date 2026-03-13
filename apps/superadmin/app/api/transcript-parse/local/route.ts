// filepath: apps/superadmin/app/api/transcript-parse/local/route.ts
// created: 2026-03-09 | creator: GitHub Copilot
// updated: 2026-03-14 | updater: Claude Sonnet 4.6
// Calls the local OCR HTTP service (FastAPI on port 8819) to parse a transcript PDF.
// Falls back to CLI subprocess when OCR_LOCAL_CLI_SCRIPT is set and the HTTP service
// is unreachable (SERVICE_UNAVAILABLE / ECONNREFUSED).

import { execFile } from 'child_process';
import { promisify } from 'util';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// HTTP service path (P2)
// ---------------------------------------------------------------------------

function getHttpServiceUrl(): string {
  // OCR_HTTP_SERVICE_URL lets operators override; default matches minimal_app.py port
  return (process.env.OCR_HTTP_SERVICE_URL ?? 'http://localhost:8819').replace(/\/$/, '');
}

async function callHttpService(documentId: string): Promise<Response> {
  const url = `${getHttpServiceUrl()}/api/v1/documents/${encodeURIComponent(documentId)}/parse-local`;
  // 30 s timeout using AbortSignal
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    return await fetch(url, { method: 'POST', signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// CLI fallback (legacy)
// ---------------------------------------------------------------------------

async function callCliSubprocess(documentId: string): Promise<{ data: Record<string, unknown>; error?: string }> {
  const ocrDir = process.env.OCR_LOCAL_DIR;
  const cliScript = process.env.OCR_LOCAL_CLI_SCRIPT;
  const pythonBin = process.env.OCR_LOCAL_PYTHON_BIN || 'python3';

  if (!ocrDir || !cliScript) {
    return { data: {}, error: '地端解析尚未設定：OCR_HTTP_SERVICE_URL（HTTP 服務）或 OCR_LOCAL_DIR + OCR_LOCAL_CLI_SCRIPT（CLI）均未設定' };
  }

  try {
    const { stdout, stderr } = await execFileAsync(
      pythonBin,
      [cliScript, documentId],
      {
        cwd: ocrDir,
        timeout: 30_000,
        env: {
          ...process.env,
          SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        },
        maxBuffer: 5 * 1024 * 1024,
      },
    );
    if (stderr) console.warn('[LocalParse CLI] stderr:', stderr);
    const parsed = JSON.parse(stdout) as Record<string, unknown>;
    return { data: parsed };
  } catch (err: unknown) {
    const execErr = err as { message?: string; stderr?: string; stdout?: string; code?: number };
    const stderr = execErr.stderr ?? '';
    const stdout = execErr.stdout ?? '';

    // CLI writes JSON {"error": "..."} to stdout on failure
    const outputToSearch = stdout || stderr;
    try {
      const jsonMatch = outputToSearch.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { error?: string };
        if (parsed.error) return { data: {}, error: parsed.error };
      }
    } catch { /* ignore */ }

    const message = execErr.message ?? String(err);
    if (message.includes('ENOENT') || stderr.includes('No such file')) {
      return { data: {}, error: '找不到 Python 或 CLI 腳本，請確認 OCR_LOCAL_PYTHON_BIN / OCR_LOCAL_DIR / OCR_LOCAL_CLI_SCRIPT' };
    }
    return { data: {}, error: '地端解析失敗（CLI）：' + (stderr.trim() || message) };
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

  // ── Try HTTP service first ─────────────────────────────────────────────
  let httpUnavailable = false;
  try {
    const httpRes = await callHttpService(documentId);
    const contentType = httpRes.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');

    if (httpRes.ok && isJson) {
      const data = await httpRes.json() as Record<string, unknown>;
      return NextResponse.json(data);
    }

    if (httpRes.status === 422 && isJson) {
      // No text layer — let the frontend know so it can auto-fallback to cloud
      const errBody = await httpRes.json() as { detail?: string };
      return NextResponse.json(
        { error: errBody.detail ?? 'PDF 無可提取的文字層，請改用雲端解析。' },
        { status: 422 },
      );
    }

    if (httpRes.status === 404 && isJson) {
      const errBody = await httpRes.json() as { detail?: string };
      return NextResponse.json({ error: errBody.detail ?? '找不到該文件' }, { status: 404 });
    }

    if (httpRes.status >= 500) {
      // Service returned an error — fall through to CLI if available
      httpUnavailable = true;
    } else {
      const text = await httpRes.text();
      return NextResponse.json({ error: `OCR 服務回應異常 (${httpRes.status}): ${text.slice(0, 200)}` }, { status: 502 });
    }
  } catch (e) {
    // ECONNREFUSED / AbortError = service not running → fall through to CLI
    const msg = e instanceof Error ? e.message : String(e);
    const isConnRefused = msg.includes('ECONNREFUSED') || msg.includes('fetch failed') || msg.includes('AbortError');
    if (!isConnRefused) {
      return NextResponse.json({ error: '地端解析請求失敗：' + msg }, { status: 500 });
    }
    httpUnavailable = true;
  }

  // ── HTTP service not available → fall back to CLI subprocess ──────────
  if (httpUnavailable) {
    const hasCli = !!(process.env.OCR_LOCAL_DIR && process.env.OCR_LOCAL_CLI_SCRIPT);
    if (!hasCli) {
      return NextResponse.json(
        { error: '地端 OCR 服務未啟動（http://localhost:8819 無回應），且未設定 CLI 備用路徑（OCR_LOCAL_DIR / OCR_LOCAL_CLI_SCRIPT）。請先執行 uvicorn minimal_app:app --port 8819 或設定 CLI 環境變數。' },
        { status: 503 },
      );
    }

    const { data, error } = await callCliSubprocess(documentId);
    if (error) {
      return NextResponse.json({ error }, { status: 422 });
    }
    if ('error' in data) {
      return NextResponse.json({ error: data.error }, { status: 422 });
    }
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: '地端解析服務異常' }, { status: 502 });
}
