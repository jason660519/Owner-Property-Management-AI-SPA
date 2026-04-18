export type AdapterEvaluationLevel = 'pass' | 'warning' | 'fail' | 'pending';

export interface AdapterEvaluationResult {
  level: AdapterEvaluationLevel;
  message: string;
}

export interface EvaluateAdapterRunInput {
  requestedModel: string;
  effectiveModel: string;
  renderedOutput: string;
  outputLines: string[];
}

const MIN_MEANINGFUL_OUTPUT_CHARS = 8;

function normalizeModel(value: string): string {
  return value.trim().toLowerCase();
}

/** OpenRouter 回傳 `vendor/model`，設定表可能用短 slug；比對時改比「字母數字指紋」避免誤判。 */
function modelIdentityFingerprint(value: string): string {
  const tail = value.includes('/') ? (value.split('/').pop() ?? value) : value;
  return tail.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function modelsMatchForEvaluation(requested: string, effective: string): boolean {
  if (!requested || !effective) return false;
  if (normalizeModel(requested) === normalizeModel(effective)) return true;
  return modelIdentityFingerprint(requested) === modelIdentityFingerprint(effective);
}

function meaningfulCharCount(value: string): number {
  return value.replace(/\s+/g, '').length;
}

function hasRenderableOutput(renderedOutput: string): boolean {
  return meaningfulCharCount(renderedOutput) >= MIN_MEANINGFUL_OUTPUT_CHARS;
}

function hasRawOutput(outputLines: string[]): boolean {
  return outputLines.some((line) => meaningfulCharCount(line) > 0);
}

/** CLI 有完整 log，但 deriveResultFromLogs 只取最後一行時，render 可能過短；此時仍以 raw 整段為準。 */
function hasMeaningfulAdapterOutput(renderedOutput: string, outputLines: string[]): boolean {
  if (hasRenderableOutput(renderedOutput)) return true;
  const joined = outputLines.join('\n');
  return meaningfulCharCount(joined) >= MIN_MEANINGFUL_OUTPUT_CHARS;
}

function lastNonEmptyLine(lines: string[]): string {
  for (let i = lines.length - 1; i >= 0; i--) {
    const s = lines[i].trim();
    if (s) return s;
  }
  return '';
}

/**
 * 後端 fallback 回傳的「成功但無字」或明確失敗句，字數仍可能 ≥ 8，不得當成有效模型輸出。
 * 見 adapter-runs/route.ts 各 fallback 訊息字串。
 */
export function isExplicitEmptyOrErrorOutcome(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return (
    /無文字輸出/.test(t) ||
    /無輸出[：:]/.test(t) ||
    /未取得可讀文字/.test(t) ||
    /無法執行\s*(API\s*)?fallback/i.test(t) ||
    /fallback\s*失敗/i.test(t) ||
    /無可用\s+\w+\s*API/i.test(t) ||
    /缺少\s+API\s*key/i.test(t) ||
    /不支援的\s+provider\s+fallback/i.test(t) ||
    /no text output/i.test(t)
  );
}

function hasNoActualModelReply(renderedOutput: string, outputLines: string[]): boolean {
  if (isExplicitEmptyOrErrorOutcome(renderedOutput)) return true;
  if (!renderedOutput.trim() && isExplicitEmptyOrErrorOutcome(lastNonEmptyLine(outputLines))) return true;
  return false;
}

/**
 * Known model families and the aliases the model itself tends to use when self-reporting.
 * Order matters: families with longer / more specific aliases (e.g. `moonshot`) should match
 * before generic ones. The detector picks the alias whose first occurrence has the lowest index.
 */
const KNOWN_MODEL_FAMILIES: ReadonlyArray<{ family: string; aliases: ReadonlyArray<string> }> = [
  { family: 'minimax', aliases: ['minimax'] },
  { family: 'kimi', aliases: ['moonshot', 'kimi'] },
  { family: 'glm', aliases: ['chatglm', 'glm', 'z-ai'] },
  { family: 'gpt', aliases: ['chatgpt', 'gpt', 'openai'] },
  { family: 'claude', aliases: ['claude'] },
  { family: 'gemini', aliases: ['gemini'] },
  { family: 'qwen', aliases: ['qwen', 'tongyi', 'qianwen'] },
  { family: 'deepseek', aliases: ['deepseek'] },
  { family: 'llama', aliases: ['llama'] },
  { family: 'mistral', aliases: ['mistral'] },
  { family: 'grok', aliases: ['grok'] },
];

interface FamilyHit {
  family: string;
  alias: string;
  index: number;
}

function detectFamilyHit(text: string): FamilyHit | null {
  const lower = text.toLowerCase();
  let best: FamilyHit | null = null;
  for (const { family, aliases } of KNOWN_MODEL_FAMILIES) {
    for (const alias of aliases) {
      const idx = lower.indexOf(alias);
      if (idx === -1) continue;
      if (!best || idx < best.index || (idx === best.index && alias.length > best.alias.length)) {
        best = { family, alias, index: idx };
      }
    }
  }
  return best;
}

/**
 * Pull a version-fingerprint string out of `text`, anchored near the family alias when given.
 * Returns lowercase alphanumeric only (e.g. `m2.7` -> `m27`, `3.5` -> `35`, `4o` -> `4o`).
 */
function extractVersionFingerprint(text: string, anchorAlias?: string): string | null {
  const lower = text.toLowerCase();
  let scope = lower;
  if (anchorAlias) {
    const idx = lower.indexOf(anchorAlias);
    if (idx !== -1) {
      const start = idx + anchorAlias.length;
      scope = lower.slice(start, start + 40);
    }
  }
  const match = scope.match(/[a-z]?\d+(?:[.\-]\d+)+[a-z]?|\d+[a-z]/);
  if (!match) return null;
  return match[0].replace(/[^a-z0-9]/g, '');
}

export interface SelfReportedModel {
  family: string | null;
  versionFingerprint: string | null;
  raw: string | null;
}

/**
 * Parse the model's self-introduction from the rendered output.
 * Returns nulls when no recognizable family / version is mentioned, in which case the caller
 * should treat the response as "unverifiable" rather than mismatched.
 */
export function parseSelfReportedModel(text: string): SelfReportedModel {
  if (!text || !text.trim()) return { family: null, versionFingerprint: null, raw: null };
  const hit = detectFamilyHit(text);
  if (!hit) return { family: null, versionFingerprint: null, raw: null };
  const version = extractVersionFingerprint(text, hit.alias);
  const rawWindow = text.slice(hit.index, Math.min(text.length, hit.index + 40));
  return {
    family: hit.family,
    versionFingerprint: version,
    raw: rawWindow.trim() || text.toLowerCase().slice(hit.index, hit.index + 40),
  };
}

export type SelfReportComparison =
  | 'not-detected'
  | 'family-mismatch'
  | 'version-mismatch'
  | 'family-only-match'
  | 'match';

/**
 * Compare what the model said about itself against the requested model id.
 * Conservative by design: only `version-mismatch` is treated as a downgrade-worthy signal,
 * because models often refer to themselves by alternate names (Sonnet, ChatGLM, …) and
 * because a missing self-version isn't proof of failure.
 */
export function compareSelfReportToRequested(
  self: SelfReportedModel,
  requestedModel: string,
): SelfReportComparison {
  if (!self.family) return 'not-detected';
  const requestedHit = detectFamilyHit(requestedModel);
  if (!requestedHit) return 'not-detected';
  if (requestedHit.family !== self.family) return 'family-mismatch';
  const requestedVersion = extractVersionFingerprint(requestedModel, requestedHit.alias);
  if (!requestedVersion || !self.versionFingerprint) return 'family-only-match';
  return requestedVersion === self.versionFingerprint ? 'match' : 'version-mismatch';
}

export function evaluateAdapterRun(input: EvaluateAdapterRunInput): AdapterEvaluationResult {
  const requestedModel = input.requestedModel.trim();
  const effectiveModel = input.effectiveModel.trim();
  const renderedOutput = input.renderedOutput.trim();
  const modelMatched = !!requestedModel && modelsMatchForEvaluation(requestedModel, effectiveModel);
  const rawOk = hasRawOutput(input.outputLines);
  const outputMeaningfulEnough = hasMeaningfulAdapterOutput(renderedOutput, input.outputLines);

  if (!outputMeaningfulEnough) {
    return { level: 'fail', message: '不及格（render 與 raw 皆過短或空白）' };
  }

  if (hasNoActualModelReply(renderedOutput, input.outputLines)) {
    return { level: 'fail', message: '不及格（API／fallback 無可讀模型輸出）' };
  }

  if (!effectiveModel) {
    return { level: 'pending', message: '待判定（尚未取得實際模型）' };
  }

  if (!modelMatched) {
    return { level: 'warning', message: `模型不正確，暫時回退到 ${effectiveModel}` };
  }

  if (!rawOk) {
    return { level: 'pending', message: '待判定（raw output 不足）' };
  }

  // Cross-check the model's self-introduction against the requested model id.
  // The configured `effectiveModel` is just an echo of the request, so a silently-substituted
  // upstream version (e.g. OpenRouter routing m2.7 -> m2.1) only shows up here. Treat as fail:
  // the provider is misrepresenting the model and the user needs to know loudly.
  const selfReported = parseSelfReportedModel(renderedOutput);
  const comparison = compareSelfReportToRequested(selfReported, requestedModel);
  if (comparison === 'version-mismatch') {
    return {
      level: 'fail',
      message: `不及格（模型自報為 ${selfReported.raw ?? selfReported.family}，與請求的 ${requestedModel} 不一致，provider 可能未誠實回傳實際版本）`,
    };
  }

  return { level: 'pass', message: '模型正確（及格）' };
}
