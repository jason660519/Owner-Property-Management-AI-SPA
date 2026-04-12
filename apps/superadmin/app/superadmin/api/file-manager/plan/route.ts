import { NextResponse } from 'next/server';
import { ensureFileManagerEnabled } from '../shared';
import { loadFileManagerConfig } from '@/lib/file-manager/config';
import { scanProjectFiles } from '@/lib/file-manager/scan';
import { createPlanFromScan } from '@/lib/file-manager/plan';
import { renderPlanMarkdown, renderScanMarkdown } from '@/lib/file-manager/report';
import { appendScanMetrics } from '@/lib/file-manager/metrics';

export const dynamic = 'force-dynamic';

export async function POST() {
  const enabled = ensureFileManagerEnabled();
  if (!enabled.ok) return enabled.response;

  try {
    const loaded = loadFileManagerConfig();
    const scan = scanProjectFiles({
      projectRoot: loaded.projectRoot,
      configPath: loaded.configPath,
      config: loaded.config,
    });
    const metricsPath = appendScanMetrics({ projectRoot: loaded.projectRoot, scan });
    const plan = createPlanFromScan({ scan, config: loaded.config });
    return NextResponse.json({
      scan,
      plan,
      metricsPath,
      markdown: {
        scan: renderScanMarkdown(scan),
        plan: renderPlanMarkdown(plan),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create plan', details: String(err) }, { status: 500 });
  }
}
