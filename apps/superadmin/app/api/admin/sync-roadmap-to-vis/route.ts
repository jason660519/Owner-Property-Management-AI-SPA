// POST /api/admin/sync-roadmap-to-vis
// Streams SSE progress events while bulk-migrating roadmap features to Paperclip VIS.
// Body: { mode: 'batch' | 'incremental', dry_run: boolean }
//
// SSE event formats:
//   data: {"type":"progress","current":N,"total":N,"message":"..."}
//   data: {"type":"done","success":N,"skipped":N,"failed":N}
//   data: {"type":"error","message":"..."}

import { ROADMAP_DATA } from '@/app/data/roadmap';
import type { RoadmapFeature } from '@/app/data/roadmap';

type SyncMode = 'batch' | 'incremental';
type IssuePriority = 'low' | 'medium' | 'high' | 'urgent';

interface IssuePayload {
  title: string;
  description: string;
  status: 'todo';
  priority: IssuePriority;
}

function derivePriority(f: RoadmapFeature): IssuePriority {
  if (f.deployStatus === 'production' || f.phase === 'operations') return 'urgent';
  if (f.phase === 'testing') return 'high';
  const isDev = (f.phase ?? 'development') === 'development';
  if (isDev) return (f.percentage ?? 0) >= 50 ? 'medium' : 'low';
  return 'medium';
}

function buildDescription(f: RoadmapFeature): string {
  const lines: string[] = [];
  if (f.acceptanceCriteria) {
    lines.push('## Acceptance Criteria', '', f.acceptanceCriteria, '');
  }
  if (f.featureSpecDocPath) {
    lines.push(`**Feature Spec**: [${f.featureSpecDocPath}](${f.featureSpecDocPath})`, '');
  }
  if (f.locatedPage) lines.push(`**Located page**: \`${f.locatedPage}\``, '');
  lines.push(`**Category**: ${f.category}`);
  lines.push(`**Phase**: ${f.phase ?? 'development'}`);
  lines.push(`**Progress**: ${f.percentage ?? 0}%`);
  if (f.points) lines.push(`**Story points**: ${f.points}`);
  return lines.join('\n').trim();
}

function buildPayload(f: RoadmapFeature): IssuePayload {
  return {
    title: `[${f.category}] ${f.name}`.slice(0, 200),
    description: buildDescription(f),
    status: 'todo',
    priority: derivePriority(f),
  };
}

function sseMessage(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function createIssue(
  baseUrl: string,
  companyId: string,
  apiKey: string,
  payload: IssuePayload,
  signal: AbortSignal,
): Promise<{ id: string; identifier?: string }> {
  const resp = await fetch(`${baseUrl}/api/companies/${companyId}/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
    signal,
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${body.slice(0, 200)}`);
  }
  const body = (await resp.json()) as Record<string, unknown>;
  return {
    id: String(body.id ?? ''),
    identifier: typeof body.identifier === 'string' ? body.identifier : undefined,
  };
}

export async function POST(request: Request): Promise<Response> {
  const { mode = 'batch', dry_run = false } = (await request.json()) as {
    mode?: SyncMode;
    dry_run?: boolean;
  };

  const baseUrl = (process.env.NEXT_PUBLIC_PAPERCLIP_BASE_URL ?? 'http://localhost:3187').replace(/\/$/, '');
  const companyId = process.env.NEXT_PUBLIC_PAPERCLIP_COMPANY_ID ?? '';
  const apiKey = process.env.PAPERCLIP_API_KEY ?? process.env.PAPERCLIP_ADMIN_API_KEY ?? '';

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  const write = (chunk: string) => writer.write(enc.encode(chunk));

  const controller = new AbortController();
  request.signal.addEventListener('abort', () => controller.abort());

  async function run(): Promise<void> {
    try {
      if (!dry_run && (!companyId || !apiKey)) {
        await write(sseMessage({ type: 'error', message: 'Missing Paperclip config (COMPANY_ID / API_KEY).' }));
        return;
      }

      const features = ROADMAP_DATA.features;
      const toSync = mode === 'incremental'
        ? features.filter(f => !f.vis_issue_id)
        : features;

      let success = 0;
      let skipped = 0;
      let failed = 0;

      for (let i = 0; i < toSync.length; i++) {
        if (controller.signal.aborted) break;
        const f = toSync[i];
        const current = i + 1;

        if (mode === 'batch' && f.vis_issue_id) {
          await write(sseMessage({
            type: 'progress',
            current,
            total: toSync.length,
            message: `⏭ ${f.vis_issue_id} already synced: ${f.name}`,
          }));
          skipped++;
          continue;
        }

        const payload = buildPayload(f);

        if (dry_run) {
          await write(sseMessage({
            type: 'progress',
            current,
            total: toSync.length,
            message: `📋 [dry-run] ${payload.title} (${payload.priority})`,
          }));
          success++;
          continue;
        }

        let attempts = 0;
        let lastErr = '';
        while (attempts < 3) {
          try {
            const created = await createIssue(baseUrl, companyId, apiKey, payload, controller.signal);
            const visId = created.identifier ?? created.id;
            await write(sseMessage({
              type: 'progress',
              current,
              total: toSync.length,
              message: `✅ ${visId} — ${f.name}`,
            }));
            success++;
            break;
          } catch (err) {
            lastErr = err instanceof Error ? err.message : String(err);
            attempts++;
            if (lastErr.includes('429') && attempts < 3) {
              await sleep(60_000);
            } else if (attempts < 3) {
              await sleep(Math.pow(2, attempts) * 1000);
            }
          }
        }

        if (attempts === 3) {
          await write(sseMessage({
            type: 'progress',
            current,
            total: toSync.length,
            message: `❌ ${f.name}: ${lastErr}`,
          }));
          failed++;
        }

        // Rate limit: 5 req/s
        await sleep(200);
      }

      await write(sseMessage({ type: 'done', success, skipped, failed }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await write(sseMessage({ type: 'error', message }));
    } finally {
      await writer.close();
    }
  }

  void run();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
