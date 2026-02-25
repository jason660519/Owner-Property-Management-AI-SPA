/* eslint-disable no-console */

/**
 * LocalAgent for dev-tasks:
 * - polls /api/dev-tasks/next for a given IDE type
 * - dispatches to an IDE-specific adapter
 *
 * Cursor adapter: copies prompt to clipboard + injects into Cursor Composer via AppleScript
 * Claude CLI adapter: runs `claude --dangerously-skip-permissions -p <prompt>`
 */

import 'cross-fetch/polyfill';
import { spawn } from 'child_process';
import { accessSync, constants } from 'fs';
import http from 'http';
import path from 'path';
import fs from 'fs/promises';

type IDEType = 'Cursor' | 'VSCode' | 'Antigravity' | 'Claude CLI' | 'TRAE';
type DevTaskStatus = 'queued' | 'running' | 'succeeded' | 'failed';

interface DevTask {
  id: string;
  user_id: string;
  row_id: string;
  feature_name: string;
  ide: IDEType;
  prompt: string;
  metadata: Record<string, unknown>;
  status: DevTaskStatus;
}
interface NextTaskResponse { task: DevTask | null; }
interface ExecutionContext { baseUrl: string; agentId: string; }
interface ExecutionResult { status: DevTaskStatus; summary: Record<string, unknown>; logs: string[]; }
interface IDEAdapter {
  ideType: IDEType;
  canHandle(task: DevTask): boolean;
  execute(task: DevTask, ctx: ExecutionContext): Promise<ExecutionResult>;
}

// --- Shared helpers ---

/** Find a binary: env var → known paths → fallback to PATH name. */
function findBinary(envVar: string, candidates: string[], fallback: string): string {
  const fromEnv = process.env[envVar];
  if (fromEnv) return fromEnv;
  for (const p of candidates) {
    try { accessSync(p, constants.X_OK); return p; } catch { /* not here */ }
  }
  return fallback;
}

/** Build a markdown task file content. whenDoneInstruction: optional line for Cursor (mark task complete after work). */
function buildTaskMarkdown(task: DevTask, whenDoneInstruction?: string): string {
  const sections = [
    `# Dev Task ${task.row_id} – ${task.feature_name}`,
    '',
    '## Context',
    `- IDE: ${task.ide}`,
    `- Row ID: ${task.row_id}`,
    `- Task ID: ${task.id}`,
    '',
    '## Prompt',
    '',
    task.prompt,
    '',
    '## Metadata',
    '```json',
    JSON.stringify(task.metadata ?? {}, null, 2),
    '```',
    '',
    '> 依照上述 Prompt 與 Metadata，使用指定 IDE 執行 TDD 開發與測試。',
  ];
  if (whenDoneInstruction) {
    sections.push(
      '',
      '## When you\'re done',
      '',
      '確認完成今日的 TDD Progress Report、測試腳本全部通過並 git commit and push 後，執行：',
      '',
      whenDoneInstruction,
      ''
    );
  }
  return sections.join('\n');
}

/** Copy text to macOS clipboard via pbcopy. */
async function copyToClipboard(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('pbcopy', [], { stdio: ['pipe', 'ignore', 'ignore'] });
    proc.stdin!.write(text, 'utf8');
    proc.stdin!.end();
    proc.on('close', code => (code === 0 ? resolve() : reject(new Error(`pbcopy exited ${code}`))));
    proc.on('error', reject);
  });
}

/** Run an AppleScript string via osascript. */
async function runAppleScript(script: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('osascript', ['-e', script], { stdio: 'pipe' });
    let stderr = '';
    proc.stderr!.on('data', (d: Buffer) => { stderr += d.toString(); });
    proc.on('close', code => (code === 0 ? resolve() : reject(new Error(stderr.trim() || `osascript exit ${code}`))));
    proc.on('error', reject);
  });
}

/**
 * Check if AppleScript keystroke injection is allowed (Accessibility permission).
 * Prints a warning with setup instructions if not granted.
 */
async function checkAppleScriptPermission(): Promise<boolean> {
  try {
    // Test actual keystroke permission by sending empty string (harmless, no-op)
    await runAppleScript('tell application "System Events" to keystroke ""');
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('1002') || msg.includes('not allowed')) {
      console.warn('');
      console.warn('╔══════════════════════════════════════════════════════════════╗');
      console.warn('║  ⚠️  AppleScript Accessibility Permission Required            ║');
      console.warn('╠══════════════════════════════════════════════════════════════╣');
      console.warn('║  One-time setup (< 30 seconds):                              ║');
      console.warn('║                                                              ║');
      console.warn('║  1. Apple menu → System Settings                             ║');
      console.warn('║  2. Privacy & Security → Accessibility                       ║');
      console.warn('║  3. Click "+" and add your terminal app:                     ║');
      console.warn('║     • Terminal.app  (/Applications/Utilities/Terminal.app)   ║');
      console.warn('║     • iTerm.app     (/Applications/iTerm.app)                ║');
      console.warn('║  4. Enable the toggle next to the app                        ║');
      console.warn('║  5. Restart this agent (npm run cursor)                      ║');
      console.warn('║                                                              ║');
      console.warn('║  Until then: prompt will still be copied to clipboard.       ║');
      console.warn('║  Manually: Cmd+I in Cursor → Cmd+V to paste.                ║');
      console.warn('╚══════════════════════════════════════════════════════════════╝');
      console.warn('');
    }
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Adapters ---

/**
 * CursorAdapter:
 * 1. Writes a task .md file to .cursor/dev-tasks/
 * 2. Copies the prompt to the macOS clipboard
 * 3. Spawns Cursor with the project root
 * 4. Uses AppleScript to open Cursor Composer (Cmd+I) and paste (Cmd+V)
 *
 * Env vars (all optional):
 *   CURSOR_CLI_PATH          – path to Cursor binary
 *   CURSOR_COMPOSER_KEY      – key for Cmd+<key> to open Composer (default: "i")
 *   CURSOR_OPEN_DELAY_MS     – ms to wait after spawning before AppleScript (default: 2500)
 */
class CursorAdapter implements IDEAdapter {
  ideType: IDEType = 'Cursor';

  canHandle(task: DevTask): boolean { return task.ide === 'Cursor'; }

  async execute(task: DevTask, _ctx: ExecutionContext): Promise<ExecutionResult> {
    const projectRoot = process.env.PROJECT_ROOT ?? path.resolve(__dirname, '..', '..', '..');
    const tasksDir = path.join(projectRoot, '.cursor', 'dev-tasks');
    await fs.mkdir(tasksDir, { recursive: true });

    const whenDoneInstruction = `\`\`\`bash\n./scripts/complete-dev-task.sh ${task.id} succeeded\n\`\`\``;
    const filePath = path.join(tasksDir, `task-${task.id}.md`);
    await fs.writeFile(filePath, buildTaskMarkdown(task, whenDoneInstruction), 'utf8');

    const cursorCmd = findBinary('CURSOR_CLI_PATH', [
      '/Applications/IDEs/Cursor.app/Contents/MacOS/Cursor',
      '/Applications/Cursor.app/Contents/MacOS/Cursor',
    ], 'cursor');

    const composerKey = process.env.CURSOR_COMPOSER_KEY ?? 'i'; // Cmd+I = Cursor Composer
    const delayMs = Number(process.env.CURSOR_OPEN_DELAY_MS ?? 2500);

    const logs: string[] = [];

    // 1. Copy prompt to clipboard
    await copyToClipboard(task.prompt);
    logs.push('Prompt copied to clipboard');

    // 2. Open Cursor with project root (opens/focuses the window)
    const cursorProc = spawn(cursorCmd, [projectRoot], { detached: true, stdio: 'ignore' });
    cursorProc.unref();
    logs.push(`Cursor launched: ${cursorCmd} ${projectRoot}`);

    // 3. Wait for Cursor window to be ready
    await sleep(delayMs);

    // 4. AppleScript: activate → open Composer → paste
    const script = [
      'tell application "Cursor" to activate',
      'delay 1.5',
      'tell application "System Events"',
      '  tell process "Cursor"',
      `    keystroke "${composerKey}" using command down`,
      '    delay 1',
      '    keystroke "v" using command down',
      '  end tell',
      'end tell',
    ].join('\n');

    try {
      await runAppleScript(script);
      logs.push(`AppleScript: Cmd+${composerKey.toUpperCase()} opened Cursor Composer, Cmd+V pasted prompt`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logs.push(`AppleScript injection failed: ${msg}`);
      logs.push('Fallback: prompt is in clipboard — open Cursor Composer (Cmd+I) and paste with Cmd+V');
      console.warn('[CursorAdapter] AppleScript error:', msg);
      console.warn('[CursorAdapter] If this is a permissions issue, grant Accessibility access:');
      console.warn('[CursorAdapter]   System Settings > Privacy & Security > Accessibility → allow Terminal/iTerm2');
    }

    logs.push(`Task file for reference: ${filePath}`);
    logs.push('Task left as RUNNING. When you finish (TDD report, tests pass, git commit & push), run: ./scripts/complete-dev-task.sh ' + task.id + ' succeeded');

    return {
      status: 'running',
      summary: {
        message: 'Task delivered to Cursor. Complete the work then run: ./scripts/complete-dev-task.sh ' + task.id + ' succeeded',
        ide: 'Cursor',
        featureName: task.feature_name,
        taskFile: filePath,
        composerKey: `Cmd+${composerKey.toUpperCase()}`,
        completeCommand: `./scripts/complete-dev-task.sh ${task.id} succeeded`,
      },
      logs,
    };
  }
}

/**
 * ClaudeCLIAdapter:
 * Spawns `claude --dangerously-skip-permissions -p <prompt> --add-dir <projectRoot>`
 * and waits for completion.
 *
 * Env vars (all optional):
 *   CLAUDE_CLI_PATH – path to claude binary (default: ~/.local/bin/claude)
 */
class ClaudeCLIAdapter implements IDEAdapter {
  ideType: IDEType = 'Claude CLI';

  canHandle(task: DevTask): boolean { return task.ide === 'Claude CLI'; }

  async execute(task: DevTask, _ctx: ExecutionContext): Promise<ExecutionResult> {
    const projectRoot = process.env.PROJECT_ROOT ?? path.resolve(__dirname, '..', '..', '..');
    const tasksDir = path.join(projectRoot, '.claude', 'dev-tasks');
    await fs.mkdir(tasksDir, { recursive: true });

    const filePath = path.join(tasksDir, `task-${task.id}.md`);
    await fs.writeFile(filePath, buildTaskMarkdown(task), 'utf8');

    const homeDir = process.env.HOME ?? '';
    const claudeCmd = findBinary('CLAUDE_CLI_PATH', [
      path.join(homeDir, '.local', 'bin', 'claude'),
      '/usr/local/bin/claude',
    ], 'claude');

    const logs: string[] = [
      `Task file written: ${filePath}`,
      `Running: ${claudeCmd} --dangerously-skip-permissions -p [prompt] --add-dir ${projectRoot}`,
    ];

    console.log('[ClaudeCLI] Spawning claude, this may take several minutes...');

    return new Promise<ExecutionResult>((resolve) => {
      const child = spawn(
        claudeCmd,
        ['--dangerously-skip-permissions', '-p', task.prompt, '--add-dir', projectRoot],
        { cwd: projectRoot, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env } },
      );

      child.stdout!.on('data', (chunk: Buffer) => {
        const text = chunk.toString().trim();
        if (text) {
          const line = text.length > 2000 ? `${text.slice(0, 2000)}…` : text;
          logs.push(line);
          console.log('[ClaudeCLI]', line.slice(0, 200));
        }
      });

      child.stderr!.on('data', (chunk: Buffer) => {
        const msg = chunk.toString().trim();
        if (msg) {
          const line = msg.length > 500 ? `${msg.slice(0, 500)}…` : msg;
          logs.push(`[stderr] ${line}`);
          console.error('[ClaudeCLI stderr]', line.slice(0, 200));
        }
      });

      child.on('error', (err: Error) => {
        console.error('[ClaudeCLI] Spawn error:', err.message);
        resolve({
          status: 'failed',
          summary: {
            message: `Failed to spawn claude CLI: ${err.message}`,
            hint: `Ensure "${claudeCmd}" is executable. Set CLAUDE_CLI_PATH to override.`,
          },
          logs: [...logs, `Spawn error: ${err.message}`],
        });
      });

      child.on('close', (code: number | null) => {
        const exitCode = code ?? -1;
        console.log('[ClaudeCLI] Exited with code', exitCode);
        resolve({
          status: exitCode === 0 ? 'succeeded' : 'failed',
          summary: {
            message: `Claude CLI exited with code ${exitCode}`,
            ide: 'Claude CLI',
            featureName: task.feature_name,
            taskFile: filePath,
            exitCode,
          },
          logs,
        });
      });
    });
  }
}

class NoopVSCodeAdapter implements IDEAdapter {
  ideType: IDEType = 'VSCode';
  canHandle(t: DevTask) { return t.ide === 'VSCode'; }
  async execute(task: DevTask) {
    return { status: 'succeeded' as const, summary: { message: 'VSCode no-op' }, logs: [`VSCode no-op for task ${task.id}`] };
  }
}
class NoopAntigravityAdapter implements IDEAdapter {
  ideType: IDEType = 'Antigravity';
  canHandle(t: DevTask) { return t.ide === 'Antigravity'; }
  async execute(task: DevTask) {
    return { status: 'succeeded' as const, summary: { message: 'Antigravity no-op' }, logs: [`Antigravity no-op for task ${task.id}`] };
  }
}
class NoopTRAEAdapter implements IDEAdapter {
  ideType: IDEType = 'TRAE';
  canHandle(t: DevTask) { return t.ide === 'TRAE'; }
  async execute(task: DevTask) {
    return { status: 'succeeded' as const, summary: { message: 'TRAE no-op' }, logs: [`TRAE no-op for task ${task.id}`] };
  }
}

const ADAPTERS: IDEAdapter[] = [
  new CursorAdapter(),
  new ClaudeCLIAdapter(),
  new NoopVSCodeAdapter(),
  new NoopAntigravityAdapter(),
  new NoopTRAEAdapter(),
];

// --- HTTP helpers ---

async function fetchNextTask(baseUrl: string, ide: IDEType, agentId: string): Promise<DevTask | null> {
  const url = new URL('/api/dev-tasks/next', baseUrl);
  url.searchParams.set('ideType', ide);
  url.searchParams.set('agentId', agentId);
  const res = await fetch(url.toString());
  if (!res.ok) { console.error('[LocalAgent] fetchNextTask error:', res.status); return null; }
  return ((await res.json()) as NextTaskResponse).task ?? null;
}

async function appendLogs(baseUrl: string, taskId: string, logs: string[]): Promise<void> {
  const res = await fetch(new URL(`/api/dev-tasks/${taskId}`, baseUrl).toString(), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ logs }),
  });
  if (!res.ok) console.error('[LocalAgent] appendLogs error:', res.status, await res.text());
}

async function completeTask(
  baseUrl: string, taskId: string, status: DevTaskStatus, resultSummary: Record<string, unknown>,
): Promise<void> {
  const res = await fetch(new URL(`/api/dev-tasks/${taskId}`, baseUrl).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, resultSummary }),
  });
  if (!res.ok) console.error('[LocalAgent] completeTask error:', res.status, await res.text());
}

// --- Wake server (optional): GET /wake?ide=Cursor 讓前端送出 Prompt 後可立即觸發一輪領取 ---

function startWakeServer(wakeRequested: { value: boolean }): http.Server {
  const port = Number(process.env.LOCAL_AGENT_WAKE_PORT) || 3847;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
    if (req.method === 'GET' && url.pathname === '/wake') {
      wakeRequested.value = true;
      res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      });
      res.end('OK');
      return;
    }
    res.writeHead(404);
    res.end();
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`[LocalAgent] Wake server http://127.0.0.1:${port}/wake (frontend can trigger immediate poll)`);
  });
  return server;
}

// --- Main loop ---

async function main() {
  const baseUrl = process.env.SUPERADMIN_BASE_URL ?? 'http://localhost:3001';
  const ide = (process.env.LOCAL_AGENT_IDE ?? 'Cursor') as IDEType;
  const agentId = process.env.LOCAL_AGENT_ID ?? `local-agent-${ide.toLowerCase().replace(/\s/g, '-')}`;
  // Auto-resolve project root: when built to dist/, go up 3 levels (dist → local-agent → tools → project root)
  const projectRoot = process.env.PROJECT_ROOT ?? path.resolve(__dirname, '..', '..', '..');

  const wakeRequested = { value: false };
  startWakeServer(wakeRequested);

  console.log('[LocalAgent] Starting');
  console.log(`  IDE     = ${ide}`);
  console.log(`  Target  = ${baseUrl}`);
  console.log(`  AgentID = ${agentId}`);
  console.log(`  Project = ${projectRoot}`);
  console.log('');

  // Pre-check AppleScript permissions for Cursor (macOS only)
  if (ide === 'Cursor' && process.platform === 'darwin') {
    await checkAppleScriptPermission();
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const task = await fetchNextTask(baseUrl, ide, agentId);
      if (!task) {
        if (wakeRequested.value) wakeRequested.value = false;
        else await sleep(5000);
        continue;
      }

      const adapter = ADAPTERS.find(a => a.canHandle(task));
      if (!adapter) {
        console.warn('[LocalAgent] No adapter for IDE:', task.ide);
        await appendLogs(baseUrl, task.id, [`No adapter for IDE ${task.ide}`]);
        await completeTask(baseUrl, task.id, 'failed', { message: `No adapter for IDE ${task.ide}` });
        continue;
      }

      console.log('\n[LocalAgent] ▶ Task:', task.id);
      console.log('  Row     :', task.row_id, '|', task.feature_name);
      console.log('  Prompt  :', task.prompt.slice(0, 100) + (task.prompt.length > 100 ? '…' : ''));

      const result = await adapter.execute(task, { baseUrl, agentId });

      if (result.logs.length > 0) await appendLogs(baseUrl, task.id, result.logs);
      if (result.status !== 'running') {
        await completeTask(baseUrl, task.id, result.status, result.summary);
        console.log('[LocalAgent] ✓ Done:', task.id, '→', result.status);
      } else {
        console.log('[LocalAgent] ✓ Task delivered (running). Complete work then run: ./scripts/complete-dev-task.sh', task.id, 'succeeded');
      }
    } catch (err) {
      console.error('[LocalAgent] Loop error:', err);
      await sleep(5000);
    }
  }
}

void main();
