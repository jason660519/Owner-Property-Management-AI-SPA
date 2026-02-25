/**
 * Owner AI - Local Dev Agent Extension for Cursor
 *
 * Polls /api/dev-tasks/next for pending Cursor tasks and injects the prompt
 * directly into Cursor's AI Chat panel using VS Code's internal API.
 *
 * No shell scripts. No Accessibility permissions. Works inside Cursor itself.
 */

import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';

const AGENT_ID = 'cursor-extension-agent';
const IDE_TYPE = 'Cursor';

interface DevTask {
  id: string;
  row_id: string;
  feature_name: string;
  ide: string;
  prompt: string;
  metadata: Record<string, unknown>;
  status: string;
}

interface TaskResponse {
  task: DevTask | null;
}

// Simple fetch using built-in http/https modules (no external deps)
function fetchJson<T>(url: string, options?: { method?: string; body?: string }): Promise<T> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const reqOptions: http.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options?.method ?? 'GET',
      headers: { 'Content-Type': 'application/json' },
    };

    const req = mod.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
      res.on('end', () => {
        try { resolve(JSON.parse(data) as T); }
        catch (e) { reject(new Error(`JSON parse error: ${e instanceof Error ? e.message : String(e)}`)); }
      });
    });

    req.on('error', reject);
    if (options?.body) req.write(options.body);
    req.end();
  });
}

async function markTaskComplete(
  baseUrl: string,
  taskId: string,
  status: 'succeeded' | 'failed',
  message: string,
): Promise<void> {
  await fetchJson(`${baseUrl}/api/dev-tasks/${taskId}`, {
    method: 'POST',
    body: JSON.stringify({
      status,
      resultSummary: { message, ide: IDE_TYPE, injectedVia: 'cursor-extension' },
    }),
  });
}

async function appendLogs(baseUrl: string, taskId: string, logs: string[]): Promise<void> {
  await fetchJson(`${baseUrl}/api/dev-tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify({ logs }),
  });
}

// Try multiple VS Code/Cursor commands for opening chat with a prompt
async function injectIntoChat(prompt: string, autoSubmit: boolean): Promise<string> {
  // Copy to clipboard first as reliable fallback
  await vscode.env.clipboard.writeText(prompt);

  // Commands to try in order (Cursor may use different IDs than VS Code)
  const chatCommands = [
    'workbench.action.chat.open',
    'cursor.openChat',
    'cursor.newChat',
    'aichat.newchat',
    'workbench.panel.chat.view.copilot.focus',
  ];

  for (const cmd of chatCommands) {
    try {
      // Try with query argument first
      await vscode.commands.executeCommand(cmd, { query: prompt, isPartialQuery: !autoSubmit });
      return `Injected via command: ${cmd} (prompt pre-filled${autoSubmit ? ' and submitted' : ', press Enter to run'})`;
    } catch {
      try {
        // Try without arguments (just open panel)
        await vscode.commands.executeCommand(cmd);
        return `Opened chat via: ${cmd} — prompt is in clipboard (Cmd+V to paste)`;
      } catch {
        // Try next command
      }
    }
  }

  // Fallback: show inline message
  return 'Chat panel could not be opened automatically — prompt is in clipboard (open Cursor Chat, then Cmd+V)';
}

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('ownerAiAgent');
  const baseUrl: string = config.get('superadminUrl', 'http://localhost:3001');
  const pollMs: number = config.get('pollIntervalMs', 5000);
  const autoSubmit: boolean = config.get('autoSubmit', false);

  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let isPolling = false;

  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.text = '$(sync~spin) Owner AI Agent';
  statusBar.tooltip = 'Owner AI Local Dev Agent is active';
  statusBar.show();
  context.subscriptions.push(statusBar);

  async function poll() {
    if (isPolling) return;
    isPolling = true;

    try {
      const url = `${baseUrl}/api/dev-tasks/next?ideType=${encodeURIComponent(IDE_TYPE)}&agentId=${AGENT_ID}`;
      const { task } = await fetchJson<TaskResponse>(url);

      if (!task) {
        statusBar.text = '$(check) Owner AI Agent';
        isPolling = false;
        return;
      }

      statusBar.text = `$(loading~spin) Task: ${task.feature_name.slice(0, 20)}…`;

      // Inject prompt into Cursor Chat
      const resultMsg = await injectIntoChat(task.prompt, autoSubmit);

      // Log and complete
      await appendLogs(baseUrl, task.id, [
        `Extension received task: ${task.id} (row ${task.row_id})`,
        resultMsg,
      ]);
      await markTaskComplete(baseUrl, task.id, 'succeeded', resultMsg);

      statusBar.text = '$(check) Owner AI Agent';

      // Show notification
      const action = await vscode.window.showInformationMessage(
        `Dev Task: ${task.feature_name}`,
        'Open Chat',
        'View Prompt',
      );

      if (action === 'Open Chat') {
        for (const cmd of ['workbench.action.chat.open', 'cursor.openChat']) {
          try { await vscode.commands.executeCommand(cmd); break; } catch { /* try next */ }
        }
      } else if (action === 'View Prompt') {
        const doc = await vscode.workspace.openTextDocument({ content: task.prompt, language: 'markdown' });
        await vscode.window.showTextDocument(doc);
      }

    } catch (err) {
      // Silently ignore network errors (superadmin might be offline)
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('ECONNREFUSED') && !msg.includes('ENOTFOUND')) {
        console.error('[OwnerAI] Poll error:', msg);
      }
    } finally {
      isPolling = false;
    }
  }

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(poll, pollMs);
    void poll(); // immediate first check
    statusBar.text = '$(sync~spin) Owner AI Agent';
    vscode.window.showInformationMessage(`Owner AI Agent started (polling ${baseUrl} every ${pollMs / 1000}s)`);
  }

  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    statusBar.text = '$(circle-slash) Owner AI Agent';
    vscode.window.showInformationMessage('Owner AI Agent stopped');
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('ownerAiAgent.startPolling', startPolling),
    vscode.commands.registerCommand('ownerAiAgent.stopPolling', stopPolling),
    { dispose: () => { if (pollTimer) clearInterval(pollTimer); } },
  );

  // Auto-start on activation
  startPolling();
}

export function deactivate() { /* cleanup handled by subscriptions */ }
