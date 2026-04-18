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

  return { level: 'pass', message: '模型正確（及格）' };
}
