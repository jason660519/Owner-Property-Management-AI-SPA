import { NextRequest, NextResponse } from 'next/server';
import { spawn, type ChildProcessByStdio } from 'node:child_process';
import type { Readable } from 'node:stream';

/**
 * The exact subprocess shape produced by `spawn(..., { stdio: ['ignore', 'pipe', 'pipe'] })`:
 * stdin is null (ignored), stdout and stderr are readable streams. Using
 * ChildProcessWithoutNullStreams here would falsely claim stdin is also
 * writable and causes TS2322 on assignment.
 */
type AdapterChildProcess = ChildProcessByStdio<null, Readable, Readable>;
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import { createAdminClient } from '@/utils/supabase/admin';
import { decryptApiKey } from '@/lib/crypto';
import { AI_PROVIDERS, type AIProvider } from '@/lib/ai-providers';
import { shouldUseApiFallback } from '@/lib/adapter-runs/fallback';
import { isAdapterRunMetaContent } from '@/lib/adapter-runs/adapter-run-meta-lines';
import { extractChatCompletionAssistantText } from '@/lib/adapter-runs/extract-chat-completion-text';
import { extractOpenAiResponsesOutputText } from '@/lib/adapter-runs/extract-openai-responses-text';
import { ADAPTER_CONFIG_ITEMS, DEFAULT_ADAPTER_TEST_PROMPT } from '@/lib/adapter-config';
import {
  KILO_GATEWAY_BASE,
  OPENCODE_ZEN_CHAT_COMPLETIONS_URL,
  openCodeZenChatModelId,
} from '@/lib/ai-key-validation/kilo-opencode-zen';
import { pickRecommendedModelByProvider } from '@/lib/pick-latest-model';
import { insertAdapterEvaluationRun } from '@/lib/adapter-evaluation-runs/insert-adapter-evaluation-run';

/**
 * Chained fallback design (2026-04-21): CLI mode only retries through more CLI attempts,
 * HTTP mode only retries through more HTTP attempts. Cross-path fallback (CLI→HTTP) is
 * removed so the CLI-vs-HTTP speed/stability comparison on the settings page stays honest.
 * Each adapter row supplies its downgrade chain via `fallbackModels` in adapter-config.ts.
 */

export const runtime = 'nodejs';

const OLLAMA_CLOUD_HTTP_BASE = process.env.OLLAMA_CLOUD_BASE_URL?.replace(/\/$/, '') || 'https://ollama.com';
const OLLAMA_LOCAL_HTTP_BASE = process.env.OLLAMA_LOCAL_BASE_URL?.replace(/\/$/, '') || 'http://localhost:11434';

type RunStatus = 'idle' | 'running' | 'paused' | 'stopped';
type AdapterProvider =
  | 'claude'
  | 'gemini'
  | 'codex'
  | 'kilo'
  | 'opencode'
  | 'ollama_cloud'
  | 'ollama_local';

type ActiveRun = {
  userId: string;
  adapterId: string;
  provider: AdapterProvider;
  status: RunStatus;
  mode: 'cli' | 'http';
  process: AdapterChildProcess | null;
  command: string;
  logs: string[];
  resultText: string;
  testPrompt: string;
  testFileName: string | null;
  requestedModel: string;
  effectiveModel: string;
  modelSource: string;
  ttftMs: number | null;
  e2eLatencyMs: number | null;
  tokensPerSec: number | null;
  httpStatus: number | null;
  retryCount: number;
  errorType: string;
  successRateRecent: number | null;
  createdAt: number;
  updatedAt: number;
  tempDir?: string;
  tempFilePath?: string;
};

const activeRuns = new Map<string, ActiveRun>();
const runHistoryByAdapter = new Map<string, boolean[]>();
const MAX_LOG_LINES = 300;
const HISTORY_WINDOW = 10;
const PROVIDER_ENV_KEY = Object.fromEntries(
  AI_PROVIDERS.map((p) => [p.id, p.envKey])
) as Record<AIProvider, string>;

function keyOf(userId: string, adapterId: string): string {
  return `${userId}:${adapterId}`;
}

function pushLog(run: ActiveRun, line: string): void {
  const time = new Date().toLocaleTimeString('zh-TW', { hour12: false });
  run.logs.push(`[${time}] ${line}`);
  if (run.logs.length > MAX_LOG_LINES) run.logs.splice(0, run.logs.length - MAX_LOG_LINES);
  run.updatedAt = Date.now();
}

function getSuccessRateRecent(runKey: string): number | null {
  const arr = runHistoryByAdapter.get(runKey) ?? [];
  if (arr.length === 0) return null;
  const successCount = arr.filter(Boolean).length;
  return successCount / arr.length;
}

function pushRunHistory(runKey: string, success: boolean): number | null {
  const arr = runHistoryByAdapter.get(runKey) ?? [];
  arr.push(success);
  if (arr.length > HISTORY_WINDOW) arr.splice(0, arr.length - HISTORY_WINDOW);
  runHistoryByAdapter.set(runKey, arr);
  return getSuccessRateRecent(runKey);
}

function stripAnsi(raw: string): string {
  /**
   * Match full CSI sequences `ESC [ <params> <final>` — params may include
   * digits/semicolons/`?`/`!`/etc., final is any letter. Also handles DEC private
   * modes like `ESC [ ? 25 l` (cursor hide) that `ollama run` emits on every
   * token; without this they leak into the "last meaningful line" heuristic.
   */
  return raw.replace(/\u001b\[[0-9;?!<>=]*[A-Za-z]/g, '');
}

/** `adapter-config` 用 `openrouter/<vendor>/<id>`；OpenRouter HTTP API 的 `model` 須為 `<vendor>/<id>`。 */
function openRouterModelForApiRequest(model: string): string {
  return model.startsWith('openrouter/') ? model.slice('openrouter/'.length) : model;
}

/** Kilo Gateway / OpenCode Zen `chat/completions`：剝除 aggregator 前綴，避免重複前綴或格式不符。 */
function aggregatorModelForOpenAiChat(model: string): string {
  if (model.startsWith('openrouter/')) return model.slice('openrouter/'.length);
  if (model.startsWith('opencode/')) return model.slice('opencode/'.length);
  return model;
}

function extractOllamaChatText(data: unknown): string {
  const messageText = (data as { message?: { content?: string } })?.message?.content;
  if (typeof messageText === 'string' && messageText.trim()) return messageText.trim();
  const responseText = (data as { response?: string })?.response;
  if (typeof responseText === 'string') return responseText.trim();
  return '';
}

function deriveResultFromLogs(lines: string[]): string {
  const ignored = [
    /tool debug/i,
    /functionDeclarations/i,
    /requested model/i,
    /effective model/i,
    /endpoint:/i,
    /status:\s*\d+/i,
    /request id:/i,
    /^\[stderr\]\s*>/,
    /^\[stderr\]\s*\[debug info\]/i,
    /^程序已結束/,
    /^啟動命令：/,
    /^API Key 來源：/,
  ];
  const cleaned = lines
    .map((line) => stripAnsi(line))
    .map((line) => line.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '').trim())
    .map((line) => line.replace(/^\[stderr\]\s*/i, '').trim())
    .filter(Boolean)
    .filter((line) => !isAdapterRunMetaContent(line))
    .filter((line) => !ignored.some((p) => p.test(line)));
  if (!cleaned.length) return '';
  return cleaned[cleaned.length - 1] ?? '';
}

function getCommand(
  provider: AdapterProvider,
  prompt: string,
  filePath?: string,
  adapterModel?: string
): { command: string; args: string[] } {
  switch (provider) {
    case 'claude':
      return adapterModel
        ? { command: 'claude', args: ['--model', adapterModel, '-p', prompt] }
        : { command: 'claude', args: ['-p', prompt] };
    case 'gemini':
      return adapterModel
        ? { command: 'agent', args: ['--model', adapterModel, '-p', prompt] }
        : { command: 'agent', args: ['-p', prompt] };
    case 'codex':
      return adapterModel
        ? { command: 'codex', args: ['exec', '-m', adapterModel, prompt] }
        : { command: 'codex', args: ['exec', prompt] };
    case 'kilo':
      return filePath
        ? adapterModel
          ? { command: 'kilo', args: ['-m', adapterModel, 'run', '-f', filePath, prompt] }
          : { command: 'kilo', args: ['run', '-f', filePath, prompt] }
        : adapterModel
          ? { command: 'kilo', args: ['-m', adapterModel, 'run', prompt] }
          : { command: 'kilo', args: ['run', prompt] };
    case 'opencode':
      return filePath
        ? adapterModel
          ? { command: 'opencode', args: ['-m', adapterModel, 'run', '-f', filePath, prompt] }
          : { command: 'opencode', args: ['run', '-f', filePath, prompt] }
        : adapterModel
          ? { command: 'opencode', args: ['-m', adapterModel, 'run', prompt] }
          : { command: 'opencode', args: ['run', prompt] };
    case 'ollama_cloud':
    case 'ollama_local':
      // Both share the same `ollama` CLI; the model slug (e.g. `:cloud` suffix) determines
      // whether the local daemon proxies to ollama.com or runs fully on-prem.
      return adapterModel
        ? { command: 'ollama', args: ['run', adapterModel, prompt] }
        : { command: 'ollama', args: ['run', prompt] };
    default:
      return { command: 'echo', args: ['Unsupported provider'] };
  }
}

async function writeTempFileIfNeeded(file: File | null): Promise<{ tempDir?: string; tempFilePath?: string }> {
  if (!file) return {};
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'adapter-run-'));
  const safeName = file.name.replace(/[^\w.\-]/g, '_') || 'input.bin';
  const tempFilePath = path.join(tempDir, safeName);
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(tempFilePath, buf);
  return { tempDir, tempFilePath };
}

async function cleanupTemp(run: ActiveRun): Promise<void> {
  if (run.tempFilePath) {
    await fs.rm(run.tempFilePath, { force: true }).catch(() => undefined);
  }
  if (run.tempDir) {
    await fs.rm(run.tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

function classifyHttpError(status: number | null, message: string): string {
  if (/timeout/i.test(message)) return 'timeout';
  if (status === 429) return '429';
  if (status != null && status >= 500) return '5xx';
  if (status != null && status >= 400) return '4xx';
  if (/schema/i.test(message)) return 'schema';
  if (/empty output|無輸出/i.test(message)) return 'empty_output';
  return message ? 'runtime_error' : '';
}

/**
 * Single HTTP attempt for `model`. Mutates `run` in place with latest attempt's metrics
 * (httpStatus, ttftMs, tokensPerSec, resultText, errorType). Wall time is not tracked here;
 * the enclosing {@link runHttpChain} accumulates cumulative e2e across attempts.
 */
async function runHttpAttempt(
  run: ActiveRun,
  prompt: string,
  env: Record<string, string>,
  model: string
): Promise<void> {
  const startedAt = Date.now();
  /** gpt-5 系推理較慢；25s 易 AbortError，與 max_output 一併放寬 */
  const timeoutMs =
    run.provider === 'ollama_cloud' || run.provider === 'ollama_local'
      ? 120_000
      : run.provider === 'codex' && /^gpt-5/i.test(model)
        ? 120_000
        : 25_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let text = '';
  let statusCode: number | null = null;
  try {
    pushLog(run, `HTTP 執行中：provider=${run.provider}, model=${model}`);
    if (run.provider === 'claude') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY ?? '',
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 320,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: controller.signal,
      });
      statusCode = res.status;
      const data = await res.json().catch(() => ({}));
      text = (data as { content?: Array<{ text?: string }> }).content?.[0]?.text?.trim() ?? '';
      if (!res.ok) {
        const msg = (data as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`;
        throw new Error(msg);
      }
    } else if (run.provider === 'gemini') {
      const modelName = model.startsWith('models/') ? model : `models/${model}`;
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${env.GEMINI_API_KEY ?? ''}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 320 },
          }),
          signal: controller.signal,
        }
      );
      statusCode = res.status;
      const data = await res.json().catch(() => ({}));
      text = (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
        .candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? '')
        .join('')
        .trim() ?? '';
      if (!res.ok) {
        const msg = (data as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`;
        throw new Error(msg);
      }
    } else if (run.provider === 'ollama_cloud' || run.provider === 'ollama_local') {
      const isCloud = run.provider === 'ollama_cloud';
      const base = isCloud ? OLLAMA_CLOUD_HTTP_BASE : OLLAMA_LOCAL_HTTP_BASE;
      const apiKey = isCloud
        ? (env.OLLAMA_API_KEY?.trim() ?? '')
        : (env.OLLAMA_LOCAL_API_KEY?.trim() ?? '');
      if (isCloud && !apiKey) {
        run.errorType = 'empty_output';
        run.resultText = '';
        pushLog(run, 'HTTP 失敗：需要 Ollama Cloud 金鑰（OLLAMA_API_KEY）');
        clearTimeout(timeout);
        return;
      }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      const res = await fetch(`${base}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          stream: false,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: controller.signal,
      });
      statusCode = res.status;
      const data = await res.json().catch(() => ({}));
      text = extractOllamaChatText(data);
      if (!res.ok) {
        const msg = (data as { error?: string })?.error ?? `HTTP ${res.status}`;
        throw new Error(typeof msg === 'string' ? msg : `HTTP ${res.status}`);
      }
    } else {
      let endpoint: string;
      let apiKey: string | undefined;
      switch (run.provider) {
        case 'codex':
          endpoint = 'https://api.openai.com/v1/chat/completions';
          apiKey = env.OPENAI_API_KEY;
          break;
        case 'kilo':
          endpoint = `${KILO_GATEWAY_BASE}/chat/completions`;
          apiKey = env.KILO_API_KEY;
          break;
        case 'opencode':
          endpoint = OPENCODE_ZEN_CHAT_COMPLETIONS_URL;
          apiKey = env.OPENCODE_API_KEY;
          break;
      }
      const useResponsesApi = run.provider === 'codex' && /^gpt-5/i.test(model);
      const finalEndpoint = useResponsesApi ? 'https://api.openai.com/v1/responses' : endpoint;
      const hitsOpenRouter = finalEndpoint.includes('openrouter.ai');
      const hitsOpenCodeZen = finalEndpoint.includes('opencode.ai');
      const apiModel = hitsOpenRouter
        ? openRouterModelForApiRequest(model)
        : hitsOpenCodeZen
          ? openCodeZenChatModelId(model)
          : aggregatorModelForOpenAiChat(model);
      const chatMaxTokens = run.provider === 'codex' && !useResponsesApi ? 320 : 2048;
      const body = useResponsesApi
        ? { model: apiModel, input: prompt, max_output_tokens: 2048 }
        : {
            model: apiModel,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: chatMaxTokens,
          };
      const res = await fetch(finalEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey ?? ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      statusCode = res.status;
      const data = await res.json().catch(() => ({}));
      text = useResponsesApi
        ? extractOpenAiResponsesOutputText(data)
        : extractChatCompletionAssistantText(data);
      if (!res.ok) {
        const msg = (data as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`;
        throw new Error(msg);
      }
    }
    const attemptMs = Date.now() - startedAt;
    run.httpStatus = statusCode;
    run.ttftMs = attemptMs;
    run.tokensPerSec = text ? Math.max(text.length / Math.max(1, attemptMs / 1000), 0) : null;
    run.resultText = text;
    run.errorType = text ? '' : 'empty_output';
    pushLog(run, text ? `HTTP 回應成功（${text.length} chars）` : 'HTTP 回應成功，但無輸出');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'HTTP run failed';
    run.httpStatus = statusCode;
    run.ttftMs = null;
    run.tokensPerSec = null;
    run.resultText = '';
    run.errorType = classifyHttpError(statusCode, message);
    pushLog(run, `HTTP 失敗：${message}`);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Run HTTP attempts down the fallback chain until one succeeds or the chain exhausts.
 * CLI-mode uses its own chain ({@link runCliChain}); no cross-path fallback.
 */
async function runHttpChain(
  run: ActiveRun,
  prompt: string,
  env: Record<string, string>,
  models: string[]
): Promise<void> {
  const chainStartedAt = Date.now();
  for (let i = 0; i < models.length; i++) {
    if (run.status === 'stopped') {
      run.e2eLatencyMs = Date.now() - chainStartedAt;
      return;
    }
    const model = models[i];
    if (i > 0) {
      pushLog(run, `降級到 ${model}（第 ${i} 層）`);
    }
    await runHttpAttempt(run, prompt, env, model);
    run.e2eLatencyMs = Date.now() - chainStartedAt;
    if (!run.errorType && run.resultText) {
      run.effectiveModel = model;
      run.modelSource = i === 0 ? 'requested' : `fallback-http:${i}`;
      run.retryCount = i;
      pushLog(run, i === 0 ? 'HTTP primary 成功' : `HTTP 降級成功（第 ${i} 層 / ${model}）`);
      return;
    }
    run.retryCount = i + 1;
  }
  pushLog(run, 'HTTP 降級鏈已耗盡');
}

/**
 * Single CLI attempt. Spawns the configured binary for `model`, streams stdout/stderr to
 * `run.logs`, and resolves once the process closes. Returns whether this attempt yielded
 * usable model output so the chain can decide to move on.
 */
async function runCliAttempt(
  run: ActiveRun,
  provider: AdapterProvider,
  prompt: string,
  tempFilePath: string | undefined,
  env: Record<string, string>,
  model: string
): Promise<{ success: boolean; derivedText: string; signal: NodeJS.Signals | null }> {
  const cli = getCommand(provider, prompt, tempFilePath, model);
  const commandPreview = [cli.command, ...cli.args].join(' ');
  run.command = commandPreview;
  pushLog(run, `CLI 啟動：${commandPreview}`);
  const attemptStartIdx = run.logs.length;
  return new Promise((resolve) => {
    const child = spawn(cli.command, cli.args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ...env,
      },
    });
    run.process = child;
    child.stdout.on('data', (chunk: Buffer | string) => {
      String(chunk)
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((line) => pushLog(run, line));
    });
    child.stderr.on('data', (chunk: Buffer | string) => {
      String(chunk)
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((line) => pushLog(run, `[stderr] ${line}`));
    });
    child.on('error', (err) => {
      pushLog(run, `程序錯誤：${err.message}`);
      resolve({ success: false, derivedText: '', signal: null });
    });
    child.on('close', (code, signal) => {
      pushLog(run, `程序已結束 (code=${code ?? 'null'}, signal=${signal ?? 'null'})`);
      const attemptLogs = run.logs.slice(attemptStartIdx);
      const failed = shouldUseApiFallback(provider, code, signal, attemptLogs);
      const derivedText = deriveResultFromLogs(attemptLogs);
      const success = !failed && Boolean(derivedText);
      resolve({ success, derivedText, signal });
    });
  });
}

/**
 * Run CLI attempts down the fallback chain. Each attempt spawns the same binary with the
 * next model in the chain — no cross-path HTTP fallback.
 */
async function runCliChain(
  run: ActiveRun,
  provider: AdapterProvider,
  prompt: string,
  tempFilePath: string | undefined,
  env: Record<string, string>,
  models: string[]
): Promise<void> {
  const chainStartedAt = Date.now();
  for (let i = 0; i < models.length; i++) {
    if (run.status === 'stopped') {
      run.e2eLatencyMs = Date.now() - chainStartedAt;
      return;
    }
    const model = models[i];
    if (i > 0) {
      pushLog(run, `降級到 ${model}（第 ${i} 層）`);
    }
    const { success, derivedText, signal } = await runCliAttempt(
      run,
      provider,
      prompt,
      tempFilePath,
      env,
      model,
    );
    run.e2eLatencyMs = Date.now() - chainStartedAt;
    // User-initiated stop: bail out, don't advance chain.
    if (signal === 'SIGTERM' || signal === 'SIGKILL' || signal === 'SIGINT') {
      return;
    }
    if (success) {
      run.effectiveModel = model;
      run.modelSource = i === 0 ? 'requested' : `fallback-cli:${i}`;
      run.resultText = derivedText;
      run.retryCount = i;
      pushLog(run, i === 0 ? 'CLI primary 成功' : `CLI 降級成功（第 ${i} 層 / ${model}）`);
      return;
    }
    run.retryCount = i + 1;
  }
  pushLog(run, 'CLI 降級鏈已耗盡');
}

async function loadUserApiKeyEnv(userId: string): Promise<{
  env: Record<string, string>;
  sourceByEnvKey: Record<string, 'supabase' | 'process.env'>;
  availableModelsByProvider: Partial<Record<AIProvider, string[]>>;
}> {
  const supabase = createAdminClient();
  const [keysRes, cacheRes] = await Promise.all([
    supabase
      .from('ai_api_keys')
      .select('provider, api_key_encrypted, iv, is_active')
      .eq('user_id', userId)
      .eq('is_active', true),
    supabase
      .from('ai_key_validation_cache')
      .select('provider, available_models, validated_at')
      .eq('user_id', userId)
      .order('validated_at', { ascending: false }),
  ]);

  const env: Record<string, string> = {};
  const sourceByEnvKey: Record<string, 'supabase' | 'process.env'> = {};
  const availableModelsByProvider: Partial<Record<AIProvider, string[]>> = {};

  for (const row of keysRes.data ?? []) {
    const provider = row.provider as AIProvider;
    const envKey = PROVIDER_ENV_KEY[provider];
    if (!envKey || !row.api_key_encrypted || !row.iv) continue;
    try {
      const plaintext = await decryptApiKey(row.api_key_encrypted, row.iv);
      if (plaintext) {
        env[envKey] = plaintext;
        sourceByEnvKey[envKey] = 'supabase';
      }
    } catch {
      // Ignore decrypt failures and continue with env fallback.
    }
  }

  for (const p of AI_PROVIDERS) {
    if (!env[p.envKey] && process.env[p.envKey]) {
      env[p.envKey] = process.env[p.envKey] as string;
      sourceByEnvKey[p.envKey] = 'process.env';
    }
  }

  for (const row of cacheRes.data ?? []) {
    const provider = row.provider as AIProvider;
    if (availableModelsByProvider[provider]) continue;
    const models = Array.isArray(row.available_models)
      ? (row.available_models as string[]).filter(Boolean)
      : [];
    availableModelsByProvider[provider] = models;
  }

  return { env, sourceByEnvKey, availableModelsByProvider };
}

function preflightStrictModelCheck(
  provider: AdapterProvider,
  requestedModel: string,
  availableModelsByProvider: Partial<Record<AIProvider, string[]>>
): { ok: true } | { ok: false; message: string } {
  if (!requestedModel) return { ok: true };

  /**
   * Ollama (cloud/local) is intentionally excluded: users can `ollama pull` arbitrary tags at any
   * time, and the `/api/tags` snapshot in the validation cache is never a closed world. Strict
   * preflight would reject real models like `kimi-k2.6:cloud` that aren't in the cached list.
   */
  const strictMapping: Partial<Record<AdapterProvider, AIProvider>> = {
    claude: 'anthropic',
    gemini: 'gemini',
    codex: 'openai',
  };
  const targetProvider = strictMapping[provider];
  if (!targetProvider) return { ok: true };

  const available = availableModelsByProvider[targetProvider] ?? [];
  if (available.length === 0) return { ok: true };
  if (available.includes(requestedModel)) return { ok: true };

  const suggested = pickRecommendedModelByProvider(targetProvider, available)
    ?? available[0]
    ?? '';
  const suggestionText = suggested ? ` 建議改用：${suggested}` : '';
  return {
    ok: false,
    message: `Model preflight 失敗：${provider} 不支援「${requestedModel}」。${suggestionText}`.trim(),
  };
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const auth = await requireSuperadmin({
    request,
    adminClient: supabase,
    routeLabel: 'api/ai-settings/adapter-runs',
  });
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
  }

  const form = await request.formData();
  const adapterId = String(form.get('adapterId') || '').trim();
  const provider = String(form.get('provider') || '').trim() as AdapterProvider;
  const mode = String(form.get('mode') || 'cli').trim() === 'http' ? 'http' : 'cli';
  const requestedModel = String(form.get('model') || '').trim();
  const prompt = String(form.get('prompt') || '').trim();
  const file = form.get('file');

  if (!adapterId || !provider) {
    return NextResponse.json({ success: false, message: '缺少 adapterId 或 provider' }, { status: 400 });
  }

  const runKey = keyOf(auth.userId, adapterId);
  const adapter = ADAPTER_CONFIG_ITEMS.find((item) => item.id === adapterId);
  const resolvedModel = requestedModel || adapter?.model || '';
  const existing = activeRuns.get(runKey);
  if (existing && (existing.status === 'running' || existing.status === 'paused')) {
    return NextResponse.json({ success: false, message: '該 adapter 已在執行中' }, { status: 409 });
  }

  const { tempDir, tempFilePath } = await writeTempFileIfNeeded(file instanceof File ? file : null);
  const safePrompt = prompt || DEFAULT_ADAPTER_TEST_PROMPT;
  const testFileName = file instanceof File ? file.name : null;
  const keyEnv = await loadUserApiKeyEnv(auth.userId);
  const preflight = preflightStrictModelCheck(provider, resolvedModel, keyEnv.availableModelsByProvider);
  if (!preflight.ok) {
    return NextResponse.json({ success: false, message: preflight.message }, { status: 400 });
  }
  /** Build the chain: primary first, then configured fallback slugs. Same-path only. */
  const chainModels = resolvedModel
    ? [resolvedModel, ...(adapter?.fallbackModels ?? [])]
    : (adapter?.fallbackModels ?? []);
  const previewCli = getCommand(provider, safePrompt, tempFilePath, resolvedModel);
  const commandPreview = [previewCli.command, ...previewCli.args].join(' ');
  const run: ActiveRun = {
    userId: auth.userId,
    adapterId,
    provider,
    mode,
    status: 'running',
    process: null,
    command: mode === 'http' ? `HTTP ${provider} ${resolvedModel}` : commandPreview,
    logs: [],
    resultText: '',
    testPrompt: safePrompt,
    testFileName,
    requestedModel: resolvedModel,
    effectiveModel: resolvedModel,
    modelSource: 'requested',
    ttftMs: null,
    e2eLatencyMs: null,
    tokensPerSec: null,
    httpStatus: null,
    retryCount: 0,
    errorType: '',
    successRateRecent: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tempDir,
    tempFilePath,
  };
  activeRuns.set(runKey, run);
  pushLog(run, `啟動命令：${run.command}`);
  const sourceSummary = Object.entries(keyEnv.sourceByEnvKey)
    .map(([k, source]) => `${k}:${source}`)
    .join(', ');
  if (sourceSummary) {
    pushLog(run, `API Key 來源：${sourceSummary}`);
  } else {
    pushLog(run, '未偵測到可用 API Key（Supabase / process.env）');
  }
  if (resolvedModel) {
    pushLog(run, `選定模型：${resolvedModel}`);
  }
  if (chainModels.length > 1) {
    pushLog(run, `降級鏈（${mode}）：${chainModels.slice(1).join(' → ')}`);
  }
  if (tempFilePath) pushLog(run, `掛載測試檔：${tempFilePath}`);

  if (chainModels.length === 0) {
    run.status = 'stopped';
    pushLog(run, '無可執行模型（primary 與 fallback 均為空）');
    await cleanupTemp(run);
    return NextResponse.json({
      success: false,
      message: '無可執行模型',
      status: run.status,
      logs: run.logs,
      cursor: run.logs.length,
    }, { status: 400 });
  }

  const chainPromise =
    mode === 'http'
      ? runHttpChain(run, safePrompt, keyEnv.env, chainModels)
      : runCliChain(run, provider, safePrompt, tempFilePath, keyEnv.env, chainModels);

  void chainPromise.finally(async () => {
    if (!run.resultText) {
      run.resultText = deriveResultFromLogs(run.logs);
    }
    const success = Boolean(run.resultText) && !run.errorType;
    run.successRateRecent = pushRunHistory(runKey, success);
    if (run.status !== 'stopped') {
      run.status = 'stopped';
    }
    await cleanupTemp(run);
    void insertAdapterEvaluationRun({
      userId: run.userId,
      adapterId: run.adapterId,
      provider: run.provider,
      mode: run.mode,
      requestedModel: run.requestedModel,
      effectiveModel: run.effectiveModel,
      modelSource: run.modelSource,
      logs: run.logs,
      resultText: run.resultText,
      testPrompt: run.testPrompt,
      testFileName: run.testFileName,
      ttftMs: run.ttftMs,
      e2eLatencyMs: run.e2eLatencyMs,
      tokensPerSec: run.tokensPerSec,
      httpStatus: run.httpStatus,
      errorType: run.errorType,
    });
  });

  return NextResponse.json({
    success: true,
    status: run.status,
    command: run.command,
    pid: run.process?.pid ?? null,
    logs: run.logs,
    resultText: run.resultText,
    requestedModel: run.requestedModel,
    effectiveModel: run.effectiveModel,
    modelSource: run.modelSource,
    ttftMs: run.ttftMs,
    e2eLatencyMs: run.e2eLatencyMs,
    tokensPerSec: run.tokensPerSec,
    httpStatus: run.httpStatus,
    retryCount: run.retryCount,
    errorType: run.errorType,
    successRateRecent: run.successRateRecent,
    cursor: run.logs.length,
  });
}

export async function PATCH(request: NextRequest) {
  const supabase = createAdminClient();
  const auth = await requireSuperadmin({
    request,
    adminClient: supabase,
    routeLabel: 'api/ai-settings/adapter-runs',
  });
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
  }

  const body = await request.json() as { adapterId?: string; action?: 'pause' | 'resume' | 'stop'; mode?: 'cli' | 'http' };
  const adapterId = body.adapterId?.trim();
  const action = body.action;
  const mode = body.mode === 'http' ? 'http' : 'cli';
  if (!adapterId || !action) {
    return NextResponse.json({ success: false, message: '缺少 adapterId 或 action' }, { status: 400 });
  }

  const run = activeRuns.get(keyOf(auth.userId, adapterId));
  if (!run) {
    return NextResponse.json({ success: false, message: '找不到執行中的 adapter' }, { status: 404 });
  }

  if (run.mode !== mode) {
    return NextResponse.json({ success: false, message: 'run mode 不一致' }, { status: 409 });
  }

  if (run.mode === 'http' && action !== 'stop') {
    return NextResponse.json({ success: false, message: 'HTTP 模式不支援 pause/resume' }, { status: 400 });
  }

  if (action === 'pause') {
    if (run.status === 'running') {
      run.process?.kill('SIGSTOP');
      run.status = 'paused';
      pushLog(run, '已暫停執行（SIGSTOP）');
    }
  } else if (action === 'resume') {
    if (run.status === 'paused') {
      run.process?.kill('SIGCONT');
      run.status = 'running';
      pushLog(run, '已恢復執行（SIGCONT）');
    }
  } else if (action === 'stop') {
    run.process?.kill('SIGTERM');
    run.status = 'stopped';
    pushLog(run, '已發送停止訊號（SIGTERM）');
  }

  return NextResponse.json({
    success: true,
    status: run.status,
    command: run.command,
    pid: run.process?.pid ?? null,
    logs: run.logs,
    resultText: run.resultText,
    requestedModel: run.requestedModel,
    effectiveModel: run.effectiveModel,
    modelSource: run.modelSource,
    ttftMs: run.ttftMs,
    e2eLatencyMs: run.e2eLatencyMs,
    tokensPerSec: run.tokensPerSec,
    httpStatus: run.httpStatus,
    retryCount: run.retryCount,
    errorType: run.errorType,
    successRateRecent: run.successRateRecent,
    cursor: run.logs.length,
  });
}

export async function GET(request: NextRequest) {
  const supabase = createAdminClient();
  const auth = await requireSuperadmin({
    request,
    adminClient: supabase,
    routeLabel: 'api/ai-settings/adapter-runs',
  });
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
  }

  const adapterId = request.nextUrl.searchParams.get('adapterId')?.trim();
  const mode = request.nextUrl.searchParams.get('mode') === 'http' ? 'http' : 'cli';
  const cursorRaw = request.nextUrl.searchParams.get('cursor');
  const cursor = Number.isFinite(Number(cursorRaw)) ? Number(cursorRaw) : 0;
  if (!adapterId) {
    return NextResponse.json({ success: false, message: '缺少 adapterId' }, { status: 400 });
  }

  const run = activeRuns.get(keyOf(auth.userId, adapterId));
  if (!run) {
    return NextResponse.json({
      success: true,
      status: 'idle' satisfies RunStatus,
      command: '',
      pid: null,
      logs: [],
      resultText: '',
      requestedModel: '',
      effectiveModel: '',
      modelSource: '',
      ttftMs: null,
      e2eLatencyMs: null,
      tokensPerSec: null,
      httpStatus: null,
      retryCount: 0,
      errorType: '',
      successRateRecent: null,
      cursor: 0,
    });
  }
  if (run.mode !== mode) {
    return NextResponse.json({
      success: true,
      status: 'idle' satisfies RunStatus,
      command: '',
      pid: null,
      logs: [],
      resultText: '',
      requestedModel: '',
      effectiveModel: '',
      modelSource: '',
      ttftMs: null,
      e2eLatencyMs: null,
      tokensPerSec: null,
      httpStatus: null,
      retryCount: 0,
      errorType: '',
      successRateRecent: null,
      cursor: 0,
    });
  }

  return NextResponse.json({
    success: true,
    status: run.status,
    command: run.command,
    pid: run.process?.pid ?? null,
    logs: run.logs.slice(Math.max(0, cursor)),
    resultText: run.resultText,
    requestedModel: run.requestedModel,
    effectiveModel: run.effectiveModel,
    modelSource: run.modelSource,
    ttftMs: run.ttftMs,
    e2eLatencyMs: run.e2eLatencyMs,
    tokensPerSec: run.tokensPerSec,
    httpStatus: run.httpStatus,
    retryCount: run.retryCount,
    errorType: run.errorType,
    successRateRecent: run.successRateRecent,
    cursor: run.logs.length,
  });
}
