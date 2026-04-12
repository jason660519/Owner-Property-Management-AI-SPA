import { NextResponse } from 'next/server';

export function ensureFileManagerEnabled(): { ok: true } | { ok: false; response: NextResponse } {
  const enabled = process.env.FILE_MANAGER_ENABLE === 'true' || process.env.NODE_ENV !== 'production';
  if (!enabled) {
    return { ok: false, response: NextResponse.json({ error: 'File Manager disabled' }, { status: 403 }) };
  }
  return { ok: true };
}
