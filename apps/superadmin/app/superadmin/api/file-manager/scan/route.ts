import { NextResponse } from 'next/server';
import { ensureFileManagerEnabled } from '../shared';
import { loadFileManagerConfig } from '@/lib/file-manager/config';
import { scanProjectFiles } from '@/lib/file-manager/scan';
import { renderScanMarkdown } from '@/lib/file-manager/report';
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
    const markdown = renderScanMarkdown(scan);
    return NextResponse.json({ scan, markdown, metricsPath });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to scan project', details: String(err) }, { status: 500 });
  }
}
