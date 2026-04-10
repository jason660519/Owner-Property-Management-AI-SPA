// API: generate model research reports by calling Claude with the web_search tool.
// Iterates over the supplied targets sequentially, upserts each result, and
// returns the final rows. Mock mode (when ?mock=1) returns deterministic stub
// data without hitting the network — useful for frontend development.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { decryptApiKey } from '@/lib/crypto';
import { resolveUserId } from '@/lib/resolve-ai-settings-user';

type ResearchStatus = 'pending' | 'researching' | 'done' | 'failed';

interface GenerateTarget {
  provider: string;
  modelId: string;
  modelName: string;
}

interface GenerateRequestBody {
  userId: string;
  targets: GenerateTarget[];
  evaluatorModel?: string;
  evaluatorProvider?: string;
}

interface StructuredFields {
  company_name: string | null;
  version_label: string | null;
  input_price_per_1m: number | null;
  output_price_per_1m: number | null;
  context_window: number | null;
  knowledge_cutoff: string | null;
  capabilities: string[];
  source_urls: string[];
}

const DEFAULT_EVALUATOR_MODEL = 'claude-opus-4-6';
const DEFAULT_EVALUATOR_PROVIDER = 'anthropic';
const PER_TARGET_TIMEOUT_MS = 90_000;
const MAX_TOKENS = 4096;

function buildPrompt(target: GenerateTarget): string {
  return `你是一位 AI 模型分析師。請以網路搜尋為基礎，調查以下模型並產出研究報告：

公司：${target.provider}
模型 ID：${target.modelId}
模型名稱：${target.modelName}

請務必：
1. 使用 web_search 查詢「該公司官方定價頁面」與「該模型的官方文件 / 發布頁」
2. 至少引用 2 個來源連結（必須是真實 URL）
3. 報告開頭請用繁體中文撰寫一段 markdown：包含公司簡介、模型定位、優勢、注意事項
4. 報告結尾必須輸出一個 \`\`\`json\`\`\` 區塊，schema 如下（資訊不確定時欄位回 null，不要編造）：
\`\`\`json
{
  "company_name": "string",
  "version_label": "string",
  "input_price_per_1m": 3.0,
  "output_price_per_1m": 15.0,
  "context_window": 200000,
  "knowledge_cutoff": "2024-04",
  "capabilities": ["text", "vision", "tool_use"],
  "source_urls": ["https://...", "https://..."]
}
\`\`\`

注意：input_price_per_1m / output_price_per_1m 單位為「美金 / 1M tokens」。`;
}

// ---------------------------------------------------------------------------
// Anthropic helpers
// ---------------------------------------------------------------------------

interface AnthropicTextBlock { type: 'text'; text: string }
interface AnthropicToolUseBlock { type: 'server_tool_use'; name?: string; input?: { query?: string } }
interface AnthropicWebSearchResultItem { type?: 'web_search_result'; url?: string; title?: string }
interface AnthropicWebSearchResultBlock {
  type: 'web_search_tool_result';
  content?: AnthropicWebSearchResultItem[];
}
type AnthropicContentBlock =
  | AnthropicTextBlock
  | AnthropicToolUseBlock
  | AnthropicWebSearchResultBlock
  | { type: string; [k: string]: unknown };

function extractAnthropicTextAndUrls(content: AnthropicContentBlock[]): { text: string; urls: string[] } {
  let text = '';
  const urls: string[] = [];
  for (const block of content) {
    if (block.type === 'text' && typeof (block as AnthropicTextBlock).text === 'string') {
      text += (block as AnthropicTextBlock).text;
    } else if (block.type === 'web_search_tool_result') {
      const items = (block as AnthropicWebSearchResultBlock).content ?? [];
      for (const item of items) {
        if (item && typeof item.url === 'string' && item.url.length > 0) {
          urls.push(item.url);
        }
      }
    }
  }
  return { text: text.trim(), urls };
}

function parseStructuredJson(text: string, fallbackUrls: string[]): StructuredFields {
  const empty: StructuredFields = {
    company_name: null,
    version_label: null,
    input_price_per_1m: null,
    output_price_per_1m: null,
    context_window: null,
    knowledge_cutoff: null,
    capabilities: [],
    source_urls: [],
  };
  const match = text.match(/```json\s*([\s\S]*?)```/i);
  if (!match) return { ...empty, source_urls: dedupe(fallbackUrls) };

  try {
    const raw = JSON.parse(match[1]) as Partial<StructuredFields>;
    const sources = Array.isArray(raw.source_urls) ? raw.source_urls.filter((u): u is string => typeof u === 'string') : [];
    return {
      company_name: typeof raw.company_name === 'string' ? raw.company_name : null,
      version_label: typeof raw.version_label === 'string' ? raw.version_label : null,
      input_price_per_1m: typeof raw.input_price_per_1m === 'number' ? raw.input_price_per_1m : null,
      output_price_per_1m: typeof raw.output_price_per_1m === 'number' ? raw.output_price_per_1m : null,
      context_window: typeof raw.context_window === 'number' ? raw.context_window : null,
      knowledge_cutoff: typeof raw.knowledge_cutoff === 'string' ? raw.knowledge_cutoff : null,
      capabilities: Array.isArray(raw.capabilities)
        ? raw.capabilities.filter((c): c is string => typeof c === 'string')
        : [],
      source_urls: dedupe([...sources, ...fallbackUrls]),
    };
  } catch {
    return { ...empty, source_urls: dedupe(fallbackUrls) };
  }
}

function stripJsonFence(text: string): string {
  return text.replace(/```json\s*[\s\S]*?```/i, '').trim();
}

function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr.filter(Boolean)));
}

// ---------------------------------------------------------------------------
// Provider-specific evaluator callers — each returns { text, urls }
// ---------------------------------------------------------------------------

type EvaluatorCaller = (apiKey: string, model: string, prompt: string) => Promise<{ text: string; urls: string[] }>;

function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(PER_TARGET_TIMEOUT_MS);
}

async function callAnthropic(apiKey: string, model: string, prompt: string) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: timeoutSignal(),
  });

  const data = (await res.json().catch(() => ({}))) as {
    content?: AnthropicContentBlock[];
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
  return extractAnthropicTextAndUrls(data.content ?? []);
}

async function callOpenAI(apiKey: string, model: string, prompt: string) {
  // Uses the Responses API (https://api.openai.com/v1/responses) which natively
  // supports the `web_search` tool. The legacy /chat/completions endpoint does
  // not expose web search.
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: prompt,
      tools: [{ type: 'web_search' }],
      max_output_tokens: MAX_TOKENS,
    }),
    signal: timeoutSignal(),
  });

  const data = (await res.json().catch(() => ({}))) as {
    output?: Array<{
      type?: string;
      content?: Array<{
        type?: string;
        text?: string;
        annotations?: Array<{ type?: string; url?: string; url_citation?: { url?: string } }>;
      }>;
    }>;
    output_text?: string;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);

  let text = '';
  const urls: string[] = [];
  for (const item of data.output ?? []) {
    if (item?.type !== 'message' || !Array.isArray(item.content)) continue;
    for (const block of item.content) {
      if (typeof block?.text === 'string') text += block.text;
      for (const ann of block?.annotations ?? []) {
        const url = ann?.url ?? ann?.url_citation?.url;
        if (typeof url === 'string' && url.length > 0) urls.push(url);
      }
    }
  }
  if (!text && typeof data.output_text === 'string') text = data.output_text;
  return { text: text.trim(), urls };
}

async function callGemini(apiKey: string, model: string, prompt: string) {
  // Google Gemini uses the v1beta endpoint with the `google_search` tool to
  // ground responses with citations from Google Search.
  const name = model.startsWith('models/') ? model : `models/${model}`;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${name}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens: MAX_TOKENS },
      }),
      signal: timeoutSignal(),
    }
  );

  const data = (await res.json().catch(() => ({}))) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      groundingMetadata?: {
        groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
      };
    }>;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);

  const candidate = data.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .map((p) => (typeof p?.text === 'string' ? p.text : ''))
    .join('')
    .trim();
  const urls: string[] = [];
  for (const chunk of candidate?.groundingMetadata?.groundingChunks ?? []) {
    const uri = chunk?.web?.uri;
    if (typeof uri === 'string' && uri.length > 0) urls.push(uri);
  }
  return { text, urls };
}

async function callGrok(apiKey: string, model: string, prompt: string) {
  // xAI Grok exposes Live Search via the `search_parameters` field on the
  // standard chat completions endpoint. Citations come back as a top-level array.
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: MAX_TOKENS,
      search_parameters: {
        mode: 'on',
        sources: [{ type: 'web' }, { type: 'news' }],
      },
    }),
    signal: timeoutSignal(),
  });

  const data = (await res.json().catch(() => ({}))) as {
    choices?: Array<{ message?: { content?: string } }>;
    citations?: string[];
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);

  const text = (data.choices?.[0]?.message?.content ?? '').trim();
  const urls = Array.isArray(data.citations) ? data.citations.filter((u): u is string => typeof u === 'string') : [];
  return { text, urls };
}

async function callPerplexity(apiKey: string, model: string, prompt: string) {
  // Perplexity Sonar models have built-in web search; every response includes
  // citations (newer API uses `search_results`, older uses `citations`).
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: MAX_TOKENS,
    }),
    signal: timeoutSignal(),
  });

  const data = (await res.json().catch(() => ({}))) as {
    choices?: Array<{ message?: { content?: string } }>;
    citations?: string[];
    search_results?: Array<{ url?: string; title?: string }>;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);

  const text = (data.choices?.[0]?.message?.content ?? '').trim();
  const urls: string[] = [];
  if (Array.isArray(data.citations)) {
    for (const c of data.citations) if (typeof c === 'string') urls.push(c);
  }
  if (Array.isArray(data.search_results)) {
    for (const r of data.search_results) {
      if (r?.url && typeof r.url === 'string') urls.push(r.url);
    }
  }
  return { text, urls };
}

const EVALUATOR_CALLERS: Record<string, EvaluatorCaller> = {
  anthropic: callAnthropic,
  openai: callOpenAI,
  gemini: callGemini,
  grok: callGrok,
  perplexity: callPerplexity,
};

function getEvaluatorCaller(provider: string): EvaluatorCaller | null {
  return EVALUATOR_CALLERS[provider] ?? null;
}

function buildMockResult(target: GenerateTarget): { text: string; urls: string[] } {
  const text = `## ${target.modelName}（Mock）

這是 mock 回應，用於前端開發。實際呼叫請移除 \`?mock=1\`。

\`\`\`json
{
  "company_name": "${target.provider}",
  "version_label": "mock-1.0",
  "input_price_per_1m": 1.0,
  "output_price_per_1m": 5.0,
  "context_window": 128000,
  "knowledge_cutoff": "2024-12",
  "capabilities": ["text", "tool_use"],
  "source_urls": ["https://example.com/pricing", "https://example.com/docs"]
}
\`\`\``;
  return { text, urls: ['https://example.com/pricing', 'https://example.com/docs'] };
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const isMock = searchParams.get('mock') === '1';

  try {
    const supabase = createAdminClient();
    const body = (await request.json()) as GenerateRequestBody;
    const { userId: requestedUserId, targets } = body;
    const evaluatorModel = body.evaluatorModel ?? DEFAULT_EVALUATOR_MODEL;
    const evaluatorProvider = body.evaluatorProvider ?? DEFAULT_EVALUATOR_PROVIDER;

    if (!requestedUserId || !Array.isArray(targets) || targets.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userId = await resolveUserId(supabase, requestedUserId);
    if (!userId) {
      return NextResponse.json({ error: '找不到可用的使用者' }, { status: 401 });
    }

    // Pick the evaluator caller for the chosen provider
    const evaluatorCaller = isMock ? null : getEvaluatorCaller(evaluatorProvider);
    if (!isMock && !evaluatorCaller) {
      return NextResponse.json(
        { error: `不支援的評審 provider：${evaluatorProvider}` },
        { status: 400 }
      );
    }

    // Resolve evaluator API key (skip in mock mode)
    let apiKey = '';
    if (!isMock) {
      const { data: keyRow, error: keyError } = await supabase
        .from('ai_api_keys')
        .select('api_key_encrypted, iv')
        .eq('user_id', userId)
        .eq('provider', evaluatorProvider)
        .eq('is_active', true)
        .single();
      if (keyError || !keyRow) {
        return NextResponse.json(
          { error: `請先設定並驗證 ${evaluatorProvider} 評審金鑰` },
          { status: 400 }
        );
      }
      try {
        apiKey = await decryptApiKey(keyRow.api_key_encrypted, keyRow.iv);
      } catch {
        return NextResponse.json({ error: '評審金鑰解密失敗' }, { status: 500 });
      }
    }

    const results: unknown[] = [];

    for (const target of targets) {
      // Mark as researching
      await supabase
        .from('ai_model_research_reports')
        .upsert(
          {
            user_id: userId,
            provider: target.provider,
            model_id: target.modelId,
            model_name: target.modelName,
            generator_model: evaluatorModel,
            generator_provider: evaluatorProvider,
            generation_status: 'researching' as ResearchStatus,
            generation_error: null,
          },
          { onConflict: 'user_id,provider,model_id' }
        );

      try {
        const { text, urls } = isMock
          ? buildMockResult(target)
          : await evaluatorCaller!(apiKey, evaluatorModel, buildPrompt(target));

        const structured = parseStructuredJson(text, urls);
        const reportMarkdown = stripJsonFence(text);

        const { data: row, error: upsertError } = await supabase
          .from('ai_model_research_reports')
          .upsert(
            {
              user_id: userId,
              provider: target.provider,
              model_id: target.modelId,
              model_name: target.modelName,
              company_name: structured.company_name,
              version_label: structured.version_label,
              input_price_per_1m: structured.input_price_per_1m,
              output_price_per_1m: structured.output_price_per_1m,
              context_window: structured.context_window,
              knowledge_cutoff: structured.knowledge_cutoff,
              capabilities: structured.capabilities,
              source_urls: structured.source_urls,
              report_markdown: reportMarkdown,
              generator_model: evaluatorModel,
              generator_provider: evaluatorProvider,
              generation_status: 'done' as ResearchStatus,
              generation_error: null,
              generated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,provider,model_id' }
          )
          .select()
          .single();

        if (upsertError) throw upsertError;
        results.push(row);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        const { data: failedRow } = await supabase
          .from('ai_model_research_reports')
          .upsert(
            {
              user_id: userId,
              provider: target.provider,
              model_id: target.modelId,
              model_name: target.modelName,
              generator_model: evaluatorModel,
              generator_provider: evaluatorProvider,
              generation_status: 'failed' as ResearchStatus,
              generation_error: message,
              generated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,provider,model_id' }
          )
          .select()
          .single();
        results.push(failedRow);
        console.error(`[model-research/generate] failed for ${target.provider}/${target.modelId}:`, message);
      }
    }

    return NextResponse.json({ success: true, reports: results });
  } catch (err) {
    console.error('[AI Settings] POST model-research/generate error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate reports' },
      { status: 500 }
    );
  }
}
