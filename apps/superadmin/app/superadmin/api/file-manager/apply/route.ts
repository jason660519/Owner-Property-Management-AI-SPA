import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { ensureFileManagerEnabled } from '../shared';
import { getProjectRoot } from '@/lib/docs-config';
import { applyPlanToProject } from '@/lib/file-manager/apply';
import { renderApplyMarkdown, renderPlanMarkdown } from '@/lib/file-manager/report';
import type { PlanResult } from '@/lib/file-manager/types';

export const dynamic = 'force-dynamic';

function isPlanResult(value: unknown): value is PlanResult {
  if (!value || typeof value !== 'object') return false;
  const planId = (value as { planId?: unknown }).planId;
  const actions = (value as { actions?: unknown }).actions;
  const createdAt = (value as { createdAt?: unknown }).createdAt;
  if (typeof planId !== 'string' || typeof createdAt !== 'string') return false;
  if (!Array.isArray(actions)) return false;
  return true;
}

export async function POST(request: NextRequest) {
  const enabled = ensureFileManagerEnabled();
  if (!enabled.ok) return enabled.response;

  try {
    const body = (await request.json()) as unknown;
    const plan = body && typeof body === 'object' ? (body as { plan?: unknown }).plan : null;
    if (!isPlanResult(plan)) {
      return NextResponse.json({ error: 'Invalid plan payload' }, { status: 400 });
    }

    const projectRoot = getProjectRoot();
    const result = applyPlanToProject({ plan, projectRoot });

    const backupAbs = path.resolve(projectRoot, result.backupDir);
    try {
      fs.writeFileSync(path.join(backupAbs, 'plan.md'), renderPlanMarkdown(plan), 'utf-8');
      fs.writeFileSync(path.join(backupAbs, 'apply.md'), renderApplyMarkdown(result), 'utf-8');
    } catch {
      return NextResponse.json({
        ok: true,
        result,
        warning: '套用成功，但寫入報告檔案失敗',
      });
    }

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to apply plan', details: String(err) }, { status: 500 });
  }
}
