import type { AdapterConfigTableRow } from './adapter-config-columns';
import { evaluateAdapterRun } from './adapter-evaluation';
import type { EvaluationsGlobalTableRow } from './evaluations-global-columns';

type AdapterChannel = 'cli' | 'http';

/**
 * 從 Adapter Config（CLI）與 HTTP Adapter Config 表格列中，挑出「最近一次測試已結束且
 * {@link evaluateAdapterRun} 判定為 pass」、或「目前正在執行／暫停中」的列，轉成全域評測
 * 表列（唯讀匯入）。
 *
 * 收錄條件：
 * - `runCount >= 1`（至少跑過一次）
 * - AND（`evaluation.level === 'pass'` **或** `runStatus` 為 running/paused）
 *
 * 將 running/paused 列也納入，是為了讓 panel 中按下 per-row「重跑」時，row 不會在測試中
 * 短暫消失（因 draft 進入 running 時 evaluation 以當下 renderedOutput 判定，可能尚不及格）。
 */
export function buildEvaluationsGlobalRowsFromAdapterTables(
  cliRows: AdapterConfigTableRow[],
  httpRows: AdapterConfigTableRow[],
  providerLabel: Record<string, string>,
): EvaluationsGlobalTableRow[] {
  const out: EvaluationsGlobalTableRow[] = [];
  let no = 0;

  const consider = (channel: AdapterChannel, tableRows: AdapterConfigTableRow[]) => {
    for (const row of tableRows) {
      const { item, draft } = row;
      if (!draft.runCount || draft.runCount < 1) continue;

      const requested = (draft.requestedModel?.trim() || item.model).trim();
      const effective = (draft.effectiveModel?.trim() || '').trim();
      const evaluation = evaluateAdapterRun({
        requestedModel: requested,
        effectiveModel: effective,
        renderedOutput: draft.renderedOutput,
        outputLines: draft.outputLines,
        errorType: draft.errorType,
        httpStatus: draft.httpStatus,
      });
      const isPass = evaluation.level === 'pass';
      const isInFlight = draft.runStatus === 'running' || draft.runStatus === 'paused';
      if (!isPass && !isInFlight) continue;

      no += 1;
      const providerName = providerLabel[item.provider] ?? item.provider;
      const channelLabel = channel === 'cli' ? 'CLI' : 'HTTP';
      const companyName = `${providerName} · ${channelLabel}`;

      const rawJoined = draft.outputLines.join('\n');

      out.push({
        id: `${channel}-adapter-pass-${item.id}`,
        no,
        companyName,
        transport: channel === 'cli' ? 'local' : 'internet',
        adapterModel: item.optionLabel,
        adapterChannel: channel,
        adapterItemId: item.id,
        testPrompt: draft.promptText.trim(),
        testFileNames: draft.testFileName.trim() ? [draft.testFileName.trim()] : [],
        runStatus: draft.runStatus,
        runStartedAtMs: draft.runStartedAtMs ?? null,
        requestedModel: requested,
        effectiveModel: effective,
        outputLines: [...draft.outputLines],
        rawOutput: rawJoined,
        renderedOutput: draft.renderedOutput,
        evaluation: evaluation.message,
        evaluationLevel: evaluation.level,
        ttftMs: draft.ttftMs ?? null,
        e2eMs: draft.e2eLatencyMs ?? null,
        throughputTokensPerSec: draft.tokensPerSec ?? null,
        httpStatus: draft.httpStatus ?? null,
        historyLastSummary: `${channelLabel} Adapter 測試${isPass ? '及格' : '中'}（${item.optionLabel}）`,
        historyLastAt: null,
        historyLogUrl: null,
        historyTotalRuns: draft.runCount,
        historyEntries: [],
      });
    }
  };

  consider('cli', cliRows);
  consider('http', httpRows);
  return out;
}
