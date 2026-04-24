import type { AdapterConfigTableRow } from './adapter-config-columns';
import { evaluateAdapterRun } from './adapter-evaluation';
import type { EvaluationsGlobalTableRow } from './evaluations-global-columns';
import {
  inferExecutionPlaneFromAdapterProvider,
  invocationPathFromAdapterChannel,
} from './evaluations-global-columns';

type AdapterChannel = 'cli' | 'http';

/**
 * 從 Adapter Config（CLI）與 HTTP Adapter Config 表格列中，挑出「最近一次測試已結束且
 * {@link evaluateAdapterRun} 判定為 pass」、或「目前正在執行／暫停中」的列，轉成全域評測
 * 表列（唯讀匯入）。
 *
 * 收錄條件：
 * - **從未執行**（`runCount < 1`）：仍顯示一列（評價為尚未測試），方便在全域評測表直接啟動 Ollama 等新 adapter
 * - **已執行**：`evaluation.level === 'pass'` **或** `runStatus` 為 running/paused
 * - **已執行但不及格**且非執行中：不顯示（維持原行為，請回 Adapter 分頁重跑通過後再匯入）
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
      const neverRun = !draft.runCount || draft.runCount < 1;

      const requested = (draft.requestedModel?.trim() || item.model).trim();
      const effective = (draft.effectiveModel?.trim() || '').trim();
      const evaluation = neverRun
        ? ({ level: 'pending' as const, message: '尚未測試' })
        : evaluateAdapterRun({
            requestedModel: requested,
            effectiveModel: effective,
            renderedOutput: draft.renderedOutput,
            outputLines: draft.outputLines,
            errorType: draft.errorType,
            httpStatus: draft.httpStatus,
          });
      const isPass = evaluation.level === 'pass';
      const isInFlight = draft.runStatus === 'running' || draft.runStatus === 'paused';
      if (!neverRun && !isPass && !isInFlight) continue;

      no += 1;
      const providerName = providerLabel[item.provider] ?? item.provider;
      const channelLabel = channel === 'cli' ? 'CLI' : 'HTTP';
      const companyName = providerName;

      const rawJoined = neverRun ? '' : draft.outputLines.join('\n');

      out.push({
        id: `${channel}-adapter-pass-${item.id}`,
        no,
        companyName,
        invocationPath: invocationPathFromAdapterChannel(channel),
        executionPlane: inferExecutionPlaneFromAdapterProvider(item.provider),
        adapterModel: item.optionLabel,
        adapterChannel: channel,
        adapterItemId: item.id,
        testPrompt: draft.promptText.trim(),
        testFileNames: draft.testFileName.trim() ? [draft.testFileName.trim()] : [],
        runStatus: draft.runStatus,
        runStartedAtMs: draft.runStartedAtMs ?? null,
        requestedModel: requested,
        effectiveModel: neverRun ? '' : effective,
        outputLines: neverRun ? [] : [...draft.outputLines],
        rawOutput: rawJoined,
        renderedOutput: neverRun ? '' : draft.renderedOutput,
        evaluation: evaluation.message,
        evaluationLevel: evaluation.level,
        ttftMs: neverRun ? null : (draft.ttftMs ?? null),
        e2eMs: neverRun ? null : (draft.e2eLatencyMs ?? null),
        throughputTokensPerSec: neverRun ? null : (draft.tokensPerSec ?? null),
        httpStatus: neverRun ? null : (draft.httpStatus ?? null),
        historyLastSummary: neverRun
          ? `尚未執行測試（${channelLabel}）`
          : `${channelLabel} Adapter 測試${isPass ? '及格' : '中'}（${item.optionLabel}）`,
        historyLastAt: null,
        historyLogUrl: null,
        historyTotalRuns: neverRun ? 0 : draft.runCount,
        historyEntries: [],
      });
    }
  };

  consider('cli', cliRows);
  consider('http', httpRows);
  return out;
}
