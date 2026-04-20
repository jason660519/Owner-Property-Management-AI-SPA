/**
 * Adapter-runs injects bookkeeping lines into `logs`; OpenCode/Kilo CLIs may also
 * print binding/diagnostic lines. These must not count as model output for grading
 * or for {@link deriveResultFromLogs} in adapter-runs/route.ts.
 */

export function stripAdapterLogTimestamp(line: string): string {
  return line.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '').trim();
}

/** True when `coreLine` is already timestamp-stripped (and optionally `[stderr]` stripped). */
export function isAdapterRunMetaContent(coreLine: string): boolean {
  const s = coreLine.replace(/^\[stderr\]\s*/i, '').trim();
  if (!s) return true;
  const patterns: RegExp[] = [
    /^啟動命令：/,
    /^API Key 來源：/,
    /^選定模型：/,
    /^Fallback 模型解析：/,
    /^降級鏈（/,
    /^掛載測試檔：/,
    /^CLI 啟動：/,
    /^CLI primary 成功/,
    /^CLI 降級成功/,
    /^CLI 降級鏈已耗盡/,
    /^HTTP 執行中：/,
    /^HTTP 回應成功/,
    /^HTTP primary 成功/,
    /^HTTP 降級成功/,
    /^HTTP 降級鏈已耗盡/,
    /^HTTP 失敗：/,
    /^降級到 /,
    /^程序已結束\s*\(/,
    /^偵測到 .*CLI 失敗/i,
    /^切換到 API fallback/i,
    /^API fallback 成功/i,
    /^OpenAI-compatible fallback 失敗/i,
    /^Anthropic API fallback/i,
    /^Gemini API fallback/i,
    /^binding model:/i,
  ];
  return patterns.some((re) => re.test(s));
}

/** Full log line as stored in `run.logs` (may include `[HH:MM:SS]` prefix). */
export function isAdapterRunMetaLine(line: string): boolean {
  const withoutTs = stripAdapterLogTimestamp(line);
  const core = withoutTs.replace(/^\[stderr\]\s*/i, '').trim();
  return isAdapterRunMetaContent(core);
}
