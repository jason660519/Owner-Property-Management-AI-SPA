import { NextRequest, NextResponse } from 'next/server';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import { createAdminClient } from '@/utils/supabase/admin';
import { decryptApiKey } from '@/lib/crypto';
import { AI_PROVIDERS, type AIProvider } from '@/lib/ai-providers';
import { shouldUseApiFallback } from '@/lib/adapter-runs/fallback';
import { ADAPTER_CONFIG_ITEMS } from '@/lib/adapter-config';
import { pickRecommendedModelByProvider } from '@/lib/pick-latest-model';

export const runtime = 'nodejs';

type RunStatus = 'idle' | 'running' | 'paused' | 'stopped';
type AdapterProvider = 'claude' | 'gemini' | 'codex' | 'kilo' | 'opencode';

type ActiveRun = {
  userId: string;
  adapterId: string;
  provider: AdapterProvider;
  status: RunStatus;
  process: ChildProcessWithoutNullStreams;
  command: string;
  logs: string[];
  resultText: string;
  resolvedModel: string;
  createdAt: number;
  updatedAt: number;
  tempDir?: string;
  tempFilePath?: string;
};

const activeRuns = new Map<string, ActiveRun>();
const MAX_LOG_LINES = 300;
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

function stripAnsi(raw: string): string {
  return raw.replace(/\u001b\[[0-9;]*m/g, '');
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

async function runAnthropicApiFallback(prompt: string, anthropicApiKey?: string): Promise<string> {
  if (!anthropicApiKey) return '無可用 ANTHROPIC_API_KEY，無法執行 API fallback。';
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 120,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = (data as { error?: { message?: string } }).error?.message ?? `HTTP ${response.status}`;
    return `Anthropic API fallback 失敗：${msg}`;
  }
  const text = (data as { content?: Array<{ text?: string }> }).content?.[0]?.text?.trim();
  return text ? `Anthropic API fallback 成功：${text}` : 'Anthropic API fallback 成功，但無文字輸出。';
}

async function runOpenAiCompatFallback(
  prompt: string,
  endpoint: string,
  model: string,
  apiKey?: string
): Promise<string> {
  if (!apiKey) return '缺少 API key，無法執行 fallback。';
  const useResponsesApi = /\/v1\/chat\/completions$/.test(endpoint) && /^gpt-5/i.test(model);
  const finalEndpoint = useResponsesApi
    ? endpoint.replace(/\/v1\/chat\/completions$/, '/v1/responses')
    : endpoint;
  const body = useResponsesApi
    ? {
        model,
        input: prompt,
        max_output_tokens: 120,
      }
    : {
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 120,
      };
  const response = await fetch(finalEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = (data as { error?: { message?: string } }).error?.message ?? `HTTP ${response.status}`;
    return `OpenAI-compatible fallback 失敗：${msg}`;
  }
  const text = useResponsesApi
    ? ((data as { output_text?: string }).output_text?.trim() ||
      (Array.isArray((data as { output?: Array<{ content?: Array<{ text?: string }> }> }).output)
        ? ((data as { output: Array<{ content?: Array<{ text?: string }> }> }).output
            .flatMap((o) => o.content ?? [])
            .map((c) => c.text ?? '')
            .join('')
            .trim())
        : ''))
    : ((data as { choices?: Array<{ message?: { content?: string } }> })
      .choices?.[0]?.message?.content?.trim() ?? '');
  return text ? `API fallback 成功：${text}` : 'API fallback 成功，但無文字輸出。';
}

async function runGeminiFallback(prompt: string, geminiApiKey?: string): Promise<string> {
  if (!geminiApiKey) return '缺少 GEMINI_API_KEY，無法執行 fallback。';
  return runGeminiFallbackWithModel(prompt, 'gemini-2.0-flash', geminiApiKey);
}

async function runGeminiFallbackWithModel(prompt: string, model: string, geminiApiKey?: string): Promise<string> {
  if (!geminiApiKey) return '缺少 GEMINI_API_KEY，無法執行 fallback。';
  const modelName = model.startsWith('models/') ? model : `models/${model}`;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 120 },
      }),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = (data as { error?: { message?: string } }).error?.message ?? `HTTP ${response.status}`;
    return `Gemini API fallback 失敗：${msg}`;
  }
  const text = (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
    .candidates?.[0]?.content?.parts
    ?.map((p) => (typeof p.text === 'string' ? p.text : ''))
    .join('')
    .trim();
  if (text) return `Gemini API fallback 成功：${text}`;

  const blockReason = (data as { promptFeedback?: { blockReason?: string } }).promptFeedback?.blockReason;
  if (blockReason) {
    return `Gemini API fallback 無輸出：prompt 被阻擋（${blockReason}）`;
  }
  const finishReason = (data as { candidates?: Array<{ finishReason?: string }> })
    .candidates?.[0]?.finishReason;
  if (finishReason) {
    return `Gemini API fallback 無輸出：finishReason=${finishReason}`;
  }
  return 'Gemini API fallback 無輸出：回應成功但未取得可讀文字。';
}

async function runProviderFallback(
  provider: AdapterProvider,
  prompt: string,
  env: Record<string, string>,
  fallbackModel: string
): Promise<string> {
  if (provider === 'claude') {
    // Anthropic messages API model comes from fallbackModel when resolved.
    if (!env.ANTHROPIC_API_KEY) return '缺少 ANTHROPIC_API_KEY，無法執行 fallback。';
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: fallbackModel,
        max_tokens: 120,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg = (data as { error?: { message?: string } }).error?.message ?? `HTTP ${response.status}`;
      return `Anthropic API fallback 失敗：${msg}`;
    }
    const text = (data as { content?: Array<{ text?: string }> }).content?.[0]?.text?.trim();
    return text ? `Anthropic API fallback 成功：${text}` : 'Anthropic API fallback 成功，但無文字輸出。';
  }
  if (provider === 'gemini') {
    return runGeminiFallbackWithModel(prompt, fallbackModel || 'gemini-2.0-flash', env.GEMINI_API_KEY);
  }
  if (provider === 'codex') {
    return runOpenAiCompatFallback(
      prompt,
      'https://api.openai.com/v1/chat/completions',
      fallbackModel || 'gpt-4o-mini',
      env.OPENAI_API_KEY
    );
  }
  if (provider === 'kilo' || provider === 'opencode') {
    return runOpenAiCompatFallback(
      prompt,
      'https://openrouter.ai/api/v1/chat/completions',
      fallbackModel || 'openai/gpt-4o-mini',
      env.OPENROUTER_API_KEY
    );
  }
  return '不支援的 provider fallback。';
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

function resolveFallbackModel(
  provider: AdapterProvider,
  requestedModel: string,
  availableModelsByProvider: Partial<Record<AIProvider, string[]>>
): { model: string; source: 'requested' | 'validated-cache' | 'default' } {
  const mapping: Record<AdapterProvider, { targetProvider: AIProvider; defaultModel: string }> = {
    claude: { targetProvider: 'anthropic', defaultModel: 'claude-sonnet-4-20250514' },
    gemini: { targetProvider: 'gemini', defaultModel: 'gemini-2.0-flash' },
    codex: { targetProvider: 'openai', defaultModel: 'gpt-4o-mini' },
    kilo: { targetProvider: 'openrouter', defaultModel: 'openrouter/auto' },
    opencode: { targetProvider: 'openrouter', defaultModel: 'openrouter/auto' },
  };
  const target = mapping[provider];
  const available = availableModelsByProvider[target.targetProvider] ?? [];
  const req = requestedModel.toLowerCase();
  if (requestedModel && available.includes(requestedModel)) {
    return { model: requestedModel, source: 'requested' };
  }
  // For OpenRouter-backed adapters, preserve model-family intent first.
  if ((provider === 'kilo' || provider === 'opencode') && req) {
    const familyHints: Array<{ family: string; aliases: string[] }> = [
      { family: 'kimi', aliases: ['kimi', 'moonshot'] },
      { family: 'glm', aliases: ['glm', 'zhipu'] },
      { family: 'minimax', aliases: ['minimax'] },
      { family: 'qwen', aliases: ['qwen'] },
      { family: 'gpt', aliases: ['gpt', 'openai'] },
      { family: 'claude', aliases: ['claude', 'anthropic'] },
      { family: 'gemini', aliases: ['gemini', 'google'] },
    ];
    const hint = familyHints.find((h) => h.aliases.some((a) => req.includes(a)));
    if (hint) {
      const matched = available.find((m) => {
        const s = m.toLowerCase();
        return hint.aliases.some((a) => s.includes(a));
      });
      if (matched) {
        return { model: matched, source: 'validated-cache' };
      }
    }
  }
  const recommended = pickRecommendedModelByProvider(target.targetProvider, available);
  if (recommended) {
    return { model: recommended, source: 'validated-cache' };
  }
  return { model: target.defaultModel, source: 'default' };
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
  const safePrompt = prompt || '你是哪一家的模型？';
  const cli = getCommand(provider, safePrompt, tempFilePath, resolvedModel);
  const keyEnv = await loadUserApiKeyEnv(auth.userId);
  const fallbackResolved = resolveFallbackModel(provider, resolvedModel, keyEnv.availableModelsByProvider);
  const child = spawn(cli.command, cli.args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      ...keyEnv.env,
    },
  });
  const commandPreview = [cli.command, ...cli.args].join(' ');
  const run: ActiveRun = {
    userId: auth.userId,
    adapterId,
    provider,
    status: 'running',
    process: child,
    command: commandPreview,
    logs: [],
    resultText: '',
    resolvedModel,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tempDir,
    tempFilePath,
  };
  activeRuns.set(runKey, run);
  pushLog(run, `啟動命令：${commandPreview}`);
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
  pushLog(run, `Fallback 模型解析：${fallbackResolved.model}（${fallbackResolved.source}）`);
  if (tempFilePath) pushLog(run, `掛載測試檔：${tempFilePath}`);

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
    run.status = 'stopped';
  });
  child.on('close', async (code, signal) => {
    pushLog(run, `程序已結束 (code=${code ?? 'null'}, signal=${signal ?? 'null'})`);
    const shouldFallback = shouldUseApiFallback(provider, code, signal, run.logs);
    if (shouldFallback) {
      run.status = 'running';
      pushLog(run, `偵測到 ${provider} CLI 失敗，切換到 API fallback...`);
      const fallbackMsg = await runProviderFallback(provider, safePrompt, keyEnv.env, fallbackResolved.model);
      pushLog(run, fallbackMsg);
      run.resultText = stripAnsi(fallbackMsg.replace(/^.*fallback 成功：/, '').trim());
    }
    if (!run.resultText) {
      run.resultText = deriveResultFromLogs(run.logs);
    }
    run.status = 'stopped';
    await cleanupTemp(run);
  });

  return NextResponse.json({
    success: true,
    status: run.status,
    command: run.command,
    pid: child.pid ?? null,
    logs: run.logs,
    resultText: run.resultText,
    resolvedModel: run.resolvedModel,
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

  const body = await request.json() as { adapterId?: string; action?: 'pause' | 'resume' | 'stop' };
  const adapterId = body.adapterId?.trim();
  const action = body.action;
  if (!adapterId || !action) {
    return NextResponse.json({ success: false, message: '缺少 adapterId 或 action' }, { status: 400 });
  }

  const run = activeRuns.get(keyOf(auth.userId, adapterId));
  if (!run) {
    return NextResponse.json({ success: false, message: '找不到執行中的 adapter' }, { status: 404 });
  }

  if (action === 'pause') {
    if (run.status === 'running') {
      run.process.kill('SIGSTOP');
      run.status = 'paused';
      pushLog(run, '已暫停執行（SIGSTOP）');
    }
  } else if (action === 'resume') {
    if (run.status === 'paused') {
      run.process.kill('SIGCONT');
      run.status = 'running';
      pushLog(run, '已恢復執行（SIGCONT）');
    }
  } else if (action === 'stop') {
    run.process.kill('SIGTERM');
    run.status = 'stopped';
    pushLog(run, '已發送停止訊號（SIGTERM）');
  }

  return NextResponse.json({
    success: true,
    status: run.status,
    command: run.command,
    pid: run.process.pid ?? null,
    logs: run.logs,
    resultText: run.resultText,
    resolvedModel: run.resolvedModel,
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
      resolvedModel: '',
      cursor: 0,
    });
  }

  return NextResponse.json({
    success: true,
    status: run.status,
    command: run.command,
    pid: run.process.pid ?? null,
    logs: run.logs.slice(Math.max(0, cursor)),
    resultText: run.resultText,
    resolvedModel: run.resolvedModel,
    cursor: run.logs.length,
  });
}

