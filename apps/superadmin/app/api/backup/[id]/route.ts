// filepath: apps/superadmin/app/api/backup/[id]/route.ts
// GET    /api/backup/[id]  → download backup file
// DELETE /api/backup/[id]  → delete backup file

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = path.resolve(process.cwd(), 'backups');

function safeId(id: string) {
  return /^backup_\d{8}_\d{6}$/.test(id) ? id : null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const safeBackupId = safeId(id);
  if (!safeBackupId) return NextResponse.json({ error: 'Invalid backup id' }, { status: 400 });

  const filepath = path.join(BACKUP_DIR, `${safeBackupId}.json`);
  if (!fs.existsSync(filepath)) return NextResponse.json({ error: 'Backup not found' }, { status: 404 });

  const content = fs.readFileSync(filepath);
  return new NextResponse(content, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${safeBackupId}.json"`,
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const safeBackupId = safeId(id);
  if (!safeBackupId) return NextResponse.json({ error: 'Invalid backup id' }, { status: 400 });

  const filepath = path.join(BACKUP_DIR, `${safeBackupId}.json`);
  if (!fs.existsSync(filepath)) return NextResponse.json({ error: 'Backup not found' }, { status: 404 });

  fs.unlinkSync(filepath);
  return NextResponse.json({ success: true });
}
