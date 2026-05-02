// POST /api/ai-settings/cli-eval-runs
//
// Headless CLI evaluation runner.
//
// Three tools (claude / codex / copilot) launch via:
//   ollama launch <tool> --model <ollama-cloud-model> --yes -- <tool-flags...>
//
// OpenCode is special: its `ollama launch opencode` headless mode hangs
// because OPENCODE_CONFIG_CONTENT injection doesn't propagate cleanly.
// We bypass `ollama launch` for opencode and spawn `opencode run` directly
// with our own OPENCODE_CONFIG_CONTENT env that defines the ollama provider
// inline (verified working in terminal, 2026-05-03).
//
// Verified working (terminal + API, exit=0, non-empty stdout):
//   - claude:   ollama launch claude   --model <m> --yes -- -p "<prompt>"
//   - codex:    ollama launch codex    --model <m> --yes -- exec --oss \
//                  --local-provider ollama-chat -m <m> "<prompt>"
//   - copilot:  ollama launch copilot  --model <m> --yes -- -p "<prompt>" --allow-all-tools
//   - opencode: opencode run -m ollama/<m> "<prompt>"
//                  (with OPENCODE_CONFIG_CONTENT defining ollama provider)

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import { createAdminClient } from '@/utils/supabase/admin';
import { OLLAMA_CLOUD_MODELS } from '@/app/superadmin/settings/api_key_and_model_setting/cli-eval-tool-config';

export const runtime = 'nodejs';

const RUN_TIMEOUT_MS = 120_000;
const MAX_OUTPUT_BYTES = 256 * 1024;
const OLLAMA_BIN = process.env.OLLAMA_CLI_PATH || 'ollama';
const OPENCODE_BIN = process.env.OPENCODE_CLI_PATH || 'opencode';
const OLLAMA_OPENAI_BASE_URL = 'http://127.0.0.1:11434/v1';

type CodingTool = 'claude' | 'codex' | 'opencode' | 'copilot';

type ToolPlan = {
  /** Binary to invoke. */
  binary: string;
  /** argv (excluding binary). */
  args: string[];
  /** Extra env merged on top of process.env. */
  extraEnv?: Record<string, string>;
  status: 'verified' | 'unverified' | 'todo';
  notes?: string;
};

/** Build the inline opencode config that registers `ollama` as a provider. */
function buildOpencodeInlineConfig(): string {
  return JSON.stringify({
    $schema: 'https://opencode.ai/config.json',
    provider: {
      ollama: {
        npm: '@ai-sdk/openai-compatible',
        options: { baseURL: OLLAMA_OPENAI_BASE_URL },
        models: Object.fromEntries(OLLAMA_CLOUD_MODELS.map((m) => [m, {}])),
      },
    },
  });
}

function planForTool(tool: CodingTool, prompt: string, model: string): ToolPlan {
  switch (tool) {
    case 'claude':
      return {
        binary: OLLAMA_BIN,
        args: ['launch', 'claude', '--model', model, '--yes', '--', '-p', prompt],
        status: 'verified',
      };
    case 'codex':
      return {
        binary: OLLAMA_BIN,
        // `--oss --local-provider ollama-chat -m <model>` is required because
        // codex 0.87 defaults to ChatGPT-account auth, which the ollama proxy
        // refuses for non-OpenAI cloud models. The OSS path bypasses that.
        args: ['launch', 'codex', '--model', model, '--yes', '--',
          'exec', '--oss', '--local-provider', 'ollama-chat', '-m', model, prompt],
        status: 'verified',
        notes: 'codex 走 --oss + --local-provider ollama-chat 的 OSS 路徑；stdout 為空時會從 stderr 擷取 final answer。',
      };
    case 'copilot':
      return {
        binary: OLLAMA_BIN,
        // GitHub Copilot CLI 1.0.10's `-p` is non-interactive; --allow-all-tools
        // is required for the prompt mode to actually run without user prompts.
        args: ['launch', 'copilot', '--model', model, '--yes', '--',
          '-p', prompt, '--allow-all-tools'],
        status: 'verified',
        notes: 'copilot 結尾會附 token / 時間統計。',
      };
    case 'opencode':
      // Bypass `ollama launch opencode` entirely (it hangs in headless mode).
      // Spawn opencode directly and inject the ollama provider via env.
      return {
        binary: OPENCODE_BIN,
        args: ['run', '-m', `ollama/${model}`, prompt],
        extraEnv: { OPENCODE_CONFIG_CONTENT: buildOpencodeInlineConfig() },
        status: 'verified',
        notes: 'opencode 走「直接呼叫 + OPENCODE_CONFIG_CONTENT 注入 ollama provider」，未經 ollama launch wrapper。',
      };
  }
}

type RunResult = {
  success: boolean;
  status: 'done' | 'failed';
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  e2eMs: number;
  ttftMs: number | null;
  errorType: string;
  message: string;
};

/** Strip ANSI escape sequences (CSI, SGR, OSC, etc.). */
function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\[[0-9;?]*[a-zA-Z]/g, '').replace(/\][^]*/g, '');
}

/**
 * codex exec writes all model tokens (including thinking + final answer) to
 * STDERR when stdout is a pipe (it expects a TTY for stdout). Extract the
 * "codex" sections (final answer) and skip "thinking" sections.
 */
function extractCodexAnswerFromStderr(stderr: string): string {
  const clean = stripAnsi(stderr);
  // After ANSI strip the stream looks like alternating lines such as
  //   "thinking\n用\nthinking\n戶\n..."
  //   "codex\n我是\ncodex\n OpenAI\n..."
  // We keep only the segments that follow a "codex" header until the next
  // tagged header, and drop "thinking", "user", "deprecated", "mcp..." lines.
  const lines = clean.split('\n');
  let inCodex = false;
  const out: string[] = [];
  const HEADER_RE = /^(thinking|codex|user|deprecated:|mcp:|mcp startup:|approval:|sandbox:|model:|provider:|workdir:|session id:)/i;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (HEADER_RE.test(line)) {
      inCodex = /^codex\b/i.test(line);
      continue;
    }
    if (inCodex) out.push(line);
  }
  return out.join('').replace(/\s+/g, ' ').trim();
}

function runPlan(plan: ToolPlan, codingTool: CodingTool): Promise<RunResult> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    let firstByteAt: number | null = null;
    let stdout = '';
    let stderr = '';
    let killed = false;

    const child = spawn(plan.binary, plan.args, {
      env: { ...process.env, ...(plan.extraEnv ?? {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const timer = setTimeout(() => {
      killed = true;
      try { child.kill('SIGKILL'); } catch { /* swallow */ }
    }, RUN_TIMEOUT_MS);

    const captureStream = (chunk: Buffer, target: 'stdout' | 'stderr') => {
      if (firstByteAt == null) firstByteAt = Date.now();
      const text = chunk.toString('utf8');
      if (target === 'stdout') {
        stdout = (stdout + text).slice(-MAX_OUTPUT_BYTES);
      } else {
        stderr = (stderr + text).slice(-MAX_OUTPUT_BYTES);
      }
    };

    child.stdout.on('data', (chunk: Buffer) => captureStream(chunk, 'stdout'));
    child.stderr.on('data', (chunk: Buffer) => captureStream(chunk, 'stderr'));

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        success: false,
        status: 'failed',
        command: `${plan.binary} ${plan.args.join(' ')}`,
        stdout,
        stderr: stderr + `\n[spawn-error] ${err.message}`,
        exitCode: null,
        e2eMs: Date.now() - startedAt,
        ttftMs: firstByteAt == null ? null : firstByteAt - startedAt,
        errorType: 'spawn_error',
        message: `無法啟動 ${plan.binary}：${err.message}。請確認該 binary 已安裝並在 PATH 中。`,
      });
    });

    child.on('close', (exitCode) => {
      clearTimeout(timer);
      const e2eMs = Date.now() - startedAt;
      const ttftMs = firstByteAt == null ? null : firstByteAt - startedAt;
      const cmdLabel = `${plan.binary} ${plan.args.join(' ')}`;
      if (killed) {
        resolve({
          success: false,
          status: 'failed',
          command: cmdLabel,
          stdout,
          stderr,
          exitCode,
          e2eMs,
          ttftMs,
          errorType: 'timeout',
          message: `CLI 執行超過 ${Math.round(RUN_TIMEOUT_MS / 1000)} 秒已強制終止。`,
        });
        return;
      }
      // codex writes model output to stderr when stdout is a pipe. Promote
      // the extracted codex segment back into stdout for downstream consumers.
      let effectiveStdout = stdout;
      if (codingTool === 'codex' && stdout.trim().length === 0 && stderr.length > 0) {
        const extracted = extractCodexAnswerFromStderr(stderr);
        if (extracted) effectiveStdout = extracted;
      }
      const ok = (exitCode == null || exitCode === 0) && effectiveStdout.trim().length > 0;
      let errorType = '';
      if (!ok) {
        if (exitCode != null && exitCode !== 0) errorType = `exit-${exitCode}`;
        else errorType = 'empty_output';
      }
      resolve({
        success: ok,
        status: ok ? 'done' : 'failed',
        command: cmdLabel,
        stdout: effectiveStdout,
        stderr,
        exitCode,
        e2eMs,
        ttftMs,
        errorType,
        message: ok
          ? 'CLI 已完成回應。'
          : (exitCode != null && exitCode !== 0
            ? `CLI 以非零退出碼結束（exit ${exitCode}）。詳細見 stderr。`
            : 'CLI 結束但無模型輸出。'),
      });
    });
  });
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const auth = await requireSuperadmin({
    request,
    adminClient: supabase,
    routeLabel: 'api/ai-settings/cli-eval-runs',
  });
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
  }

  let body: { codingTool?: string; ollamaModel?: string; prompt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: '請求 body 必須是 JSON。' }, { status: 400 });
  }

  const codingTool = (body.codingTool ?? '').trim() as CodingTool;
  const ollamaModel = (body.ollamaModel ?? '').trim();
  const prompt = (body.prompt ?? '').trim();

  if (!['claude', 'codex', 'opencode', 'copilot'].includes(codingTool)) {
    return NextResponse.json({ success: false, message: `不支援的 codingTool: ${codingTool}` }, { status: 400 });
  }
  if (!ollamaModel) {
    return NextResponse.json({ success: false, message: '缺少 ollamaModel。' }, { status: 400 });
  }
  if (!prompt) {
    return NextResponse.json({ success: false, message: '缺少 prompt。' }, { status: 400 });
  }

  const plan = planForTool(codingTool, prompt, ollamaModel);

  if (plan.status === 'todo') {
    return NextResponse.json({
      success: false,
      status: 'failed',
      command: '(skipped)',
      stdout: '',
      stderr: '',
      exitCode: null,
      e2eMs: 0,
      ttftMs: null,
      errorType: 'todo',
      message: plan.notes ?? '此 CLI 尚未支援 headless 模式。',
      codingTool,
      ollamaModel,
    });
  }

  const result = await runPlan(plan, codingTool);

  return NextResponse.json({
    ...result,
    codingTool,
    ollamaModel,
    notes: plan.notes,
    toolStatus: plan.status,
  });
}
