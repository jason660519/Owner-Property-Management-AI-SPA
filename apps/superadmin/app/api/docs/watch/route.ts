import path from 'path';
import fs from 'fs';
import {
  getRoot,
  isProjectScopeFile,
  logDocsError,
  logDocsInfo,
  type DocsScope,
} from '@/lib/docs-config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scope = (url.searchParams.get('scope') || 'docs') as DocsScope;
  if (scope !== 'docs' && scope !== 'project') {
    return new Response(
      JSON.stringify({ error: 'Invalid scope' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const ROOT = getRoot(scope);
  const encoder = new TextEncoder();
  let cleanupFn: (() => void) | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const { default: chokidar } = await import('chokidar');

      let closed = false;
      let heartbeatId: ReturnType<typeof setInterval>;

      if (!fs.existsSync(ROOT)) {
        logDocsError('watch', `Root not found: ${ROOT}`);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ event: 'error', message: 'Directory not found or not readable' })}\n\n`
          )
        );
        controller.close();
        return;
      }

      const watcher = chokidar.watch(ROOT, {
        ignored: /(^|[\/\\])\../,
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 300,
          pollInterval: 100,
        },
      });

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeatId);
        try {
          watcher.close();
        } catch (e) {
          logDocsError('watch', 'Error closing watcher', e);
        }
      };
      cleanupFn = cleanup;

      const sendEvent = (event: string, filePath: string) => {
        if (closed) return;
        try {
          const relativePath = path.relative(ROOT, filePath);
          const name = path.basename(filePath);
          const ext = path.extname(filePath).toLowerCase();
          if (
            event !== 'unlinkDir' &&
            event !== 'addDir' &&
            !isProjectScopeFile(name, ext, scope)
          ) {
            return;
          }
          const data = JSON.stringify({
            event,
            path: relativePath.replace(/\\/g, '/'),
            timestamp: Date.now(),
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch (e) {
          logDocsError('watch', 'Error sending event', e);
        }
      };

      heartbeatId = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          cleanup();
        }
      }, 30000);

      watcher
        .on('add', (p: string) => sendEvent('add', p))
        .on('change', (p: string) => sendEvent('change', p))
        .on('unlink', (p: string) => sendEvent('unlink', p))
        .on('addDir', (p: string) => sendEvent('addDir', p))
        .on('unlinkDir', (p: string) => sendEvent('unlinkDir', p));

      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ event: 'connected', timestamp: Date.now() })}\n\n`
        )
      );
      logDocsInfo('watch', `SSE connected, watching ${ROOT} (scope=${scope})`);
    },
    cancel() {
      if (cleanupFn) {
        cleanupFn();
        cleanupFn = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
