/**
 * Pure Markdown report generator for the "模型選擇與設定" feature.
 *
 * Given the current state of:
 *   - Hard-coded agent registry (`AI_AGENT_REGISTRY`)
 *   - Agent assignments from DB (`ai_agent_model_assignments`)
 *   - Model role catalog rows (from `useModelRoleCatalog`)
 *   - Model evaluations (from `ai_model_evaluations`)
 *
 * ...emits a Markdown snapshot that can be dropped into
 * `project-process/dev-logs/` as an audit trail.
 *
 * This file is intentionally free of React / DOM / fetch so it's trivial
 * to unit-test with plain fixtures.
 */

import type { AgentDef } from '@/lib/ai/agent-registry';
import { AGENT_GROUPS, getAgentsByGroup } from '@/lib/ai/agent-registry';
import type { AgentAssignment, FallbackTrigger } from '@/lib/types/agent-assignment';
import type { ModelRoleCatalogRow } from '@/lib/types/model-role-catalog';
import type { ModelEvaluation } from '@/lib/hooks/useAISettings';

// ---------------------------------------------------------------------------
// Public input shape
// ---------------------------------------------------------------------------

export interface AgentReportInput {
  assignmentsByKey: Record<string, AgentAssignment>;
  catalogRows: ModelRoleCatalogRow[];
  evaluations: ModelEvaluation[];
  /** Override for tests — defaults to new Date() at call time. */
  now?: Date;
  /**
   * Maximum recommended models to include per agent. Default 10.
   * When truncated, a "... and N more" note is appended so the reader knows
   * the table is capped. Set to 0 (or Infinity) for no cap.
   */
  maxRecommendationsPerAgent?: number;
}

export const DEFAULT_MAX_RECOMMENDATIONS_PER_AGENT = 10;

// ---------------------------------------------------------------------------
// Label helpers (kept here so the test doesn't need a DOM)
// ---------------------------------------------------------------------------

const TRIGGER_LABELS: Record<FallbackTrigger, string> = {
  rate_limit: '超過速率限制',
  error: '呼叫錯誤',
  cost_over: '超過成本上限',
};

function statusLabel(status: ModelRoleCatalogRow['status']): string {
  switch (status) {
    case 'available':
      return '✅ 可用';
    case 'invalid':
      return '❌ 金鑰無效';
    default:
      return '— 無金鑰';
  }
}

function formatDateTime(d: Date): string {
  // YYYY-MM-DD HH:mm (UTC) — stable for audit logs regardless of viewer tz.
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    ` ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`
  );
}

function escapePipe(text: string): string {
  return text.replace(/\|/g, '\\|');
}

/** Filter catalog rows for a given agent, mirroring AgentRecommendationPanel logic. */
export function filterCatalogForAgent(
  agent: AgentDef,
  catalogRows: ModelRoleCatalogRow[],
): ModelRoleCatalogRow[] {
  if (agent.suggestedTagKeys.length === 0) {
    return catalogRows.filter((r) => r.status === 'available');
  }
  const wanted = new Set(agent.suggestedTagKeys);
  return catalogRows.filter(
    (r) => r.assignments.some((a) => wanted.has(a.tag_key)) && r.status !== 'no_key',
  );
}

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function renderAgentStrategy(agent: AgentDef, assignment: AgentAssignment | undefined): string[] {
  const lines: string[] = [];
  lines.push(`### ${agent.label} (\`${agent.key}\`)`);
  lines.push('');
  lines.push(`> ${agent.description}`);
  lines.push('');

  if (!assignment) {
    lines.push('⚠️ **尚未設定** — 點擊右側「還原為預設」即可套用系統預設策略。');
    lines.push('');
    return lines;
  }

  const { primary_config: cfg, guardrails, notes, is_enabled } = assignment;
  lines.push('| 設定 | 值 |');
  lines.push('|:---|:---|');
  lines.push(`| 啟用 | ${is_enabled ? '✅ Yes' : '⛔ No'} |`);
  lines.push(
    `| Primary | \`${assignment.primary_provider}\` / \`${assignment.primary_model_id}\` |`,
  );
  if (cfg.temperature !== undefined) lines.push(`| Temperature | ${cfg.temperature} |`);
  if (cfg.max_tokens !== undefined) lines.push(`| Max tokens | ${cfg.max_tokens} |`);
  if (cfg.top_p !== undefined) lines.push(`| top_p | ${cfg.top_p} |`);
  if (cfg.reasoning_effort) lines.push(`| reasoning_effort | ${cfg.reasoning_effort} |`);
  if (guardrails.max_monthly_usd !== undefined) {
    lines.push(`| 月上限 (USD) | $${guardrails.max_monthly_usd} |`);
  }
  if (guardrails.require_tags?.length) {
    lines.push(`| 必備標籤 | ${guardrails.require_tags.join(', ')} |`);
  }
  if (guardrails.forbid_providers?.length) {
    lines.push(`| 禁用 provider | ${guardrails.forbid_providers.join(', ')} |`);
  }
  if (notes) {
    lines.push(`| 備註 | ${escapePipe(notes)} |`);
  }
  lines.push('');

  if (assignment.fallbacks.length > 0) {
    lines.push('**Fallbacks**（依序嘗試）：');
    lines.push('');
    assignment.fallbacks.forEach((fb, i) => {
      lines.push(
        `${i + 1}. \`${fb.provider}\` / \`${fb.model_id}\` — 觸發：**${TRIGGER_LABELS[fb.trigger]}**`,
      );
    });
    lines.push('');
  } else {
    lines.push('_無 Fallbacks 設定_');
    lines.push('');
  }

  return lines;
}

function renderAgentRecommendations(
  agent: AgentDef,
  catalogRows: ModelRoleCatalogRow[],
  evalByKey: Map<string, ModelEvaluation>,
  maxPerAgent: number,
): string[] {
  const lines: string[] = [];
  const allFiltered = filterCatalogForAgent(agent, catalogRows);
  const capped = maxPerAgent > 0 && allFiltered.length > maxPerAgent;
  const filtered = capped ? allFiltered.slice(0, maxPerAgent) : allFiltered;
  const truncatedCount = capped ? allFiltered.length - filtered.length : 0;

  if (agent.suggestedTagKeys.length === 0) {
    lines.push(
      `**推薦模型** — ⚠️ 未指定 \`suggestedTagKeys\`，顯示全部 available 模型（${allFiltered.length} 筆${capped ? `，僅列前 ${filtered.length}` : ''}）。`,
    );
  } else {
    lines.push(
      `**推薦模型** — 依標籤 \`${agent.suggestedTagKeys.join('`, `')}\` 篩選，共 ${allFiltered.length} 筆${capped ? `，僅列前 ${filtered.length}` : ''}。`,
    );
  }
  lines.push('');

  if (filtered.length === 0) {
    lines.push('_無符合條件的模型。請先在此頁面右上角「重新分類 (AI)」或新增/驗證金鑰。_');
    lines.push('');
    return lines;
  }

  lines.push('| Provider | Model | 狀態 | 最近測試 | 角色標籤 |');
  lines.push('|:---|:---|:---|:---|:---|');
  for (const row of filtered) {
    const evalRow = evalByKey.get(`${row.provider}::${row.modelId}`);
    const working =
      evalRow?.is_working === undefined
        ? '—'
        : evalRow.is_working
        ? '✅ 正常'
        : '❌ 失敗';
    const tagCell =
      row.assignments.length === 0
        ? '—'
        : row.assignments.map((a) => `\`${a.tag_key}\``).join(', ');
    lines.push(
      `| ${escapePipe(row.providerName)} | \`${row.modelId}\` | ${statusLabel(row.status)} | ${working} | ${tagCell} |`,
    );
  }
  if (truncatedCount > 0) {
    lines.push('');
    lines.push(`_… 還有 ${truncatedCount} 個符合條件的模型未列出（超過上限 ${maxPerAgent}）。_`);
  }
  lines.push('');
  return lines;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render the full 14-agent snapshot as a Markdown string.
 * Safe to call on both server and client — no side effects.
 */
export function generateAgentReportMarkdown(input: AgentReportInput): string {
  const { assignmentsByKey, catalogRows, evaluations } = input;
  const now = input.now ?? new Date();
  const maxPerAgent =
    input.maxRecommendationsPerAgent ?? DEFAULT_MAX_RECOMMENDATIONS_PER_AGENT;

  // Build eval lookup once.
  const evalByKey = new Map<string, ModelEvaluation>();
  for (const e of evaluations) {
    evalByKey.set(`${e.provider}::${e.model_id}`, e);
  }

  const lines: string[] = [];
  lines.push('# AI Agent 模型選擇與設定快照');
  lines.push('');
  lines.push(`**匯出時間**：${formatDateTime(now)}`);
  lines.push('');
  lines.push(
    '本報告為 `ai_agent_model_assignments`（全平台共用）+ `ai_model_role_assignments`（模型能力標籤）的當前快照。',
  );
  lines.push(
    '產生頁面：`/superadmin/settings/api_key_and_model_setting#agent-config`',
  );
  lines.push('');
  lines.push('---');
  lines.push('');

  // Table of contents.
  lines.push('## 目錄');
  lines.push('');
  const groups = getAgentsByGroup();
  for (const { meta, agents } of groups) {
    lines.push(`- **${meta.label}**`);
    for (const a of agents) {
      lines.push(`  - [${a.label}](#${a.key})`);
    }
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // Per-group, per-agent sections.
  for (const { group, meta, agents } of groups) {
    lines.push(`## ${meta.label}`);
    lines.push('');
    for (const agent of agents) {
      lines.push(`<a id="${agent.key}"></a>`);
      lines.push('');
      lines.push(...renderAgentStrategy(agent, assignmentsByKey[agent.key]));
      lines.push(...renderAgentRecommendations(agent, catalogRows, evalByKey, maxPerAgent));
      lines.push('---');
      lines.push('');
    }
    // `group` is kept for future use (e.g. per-group summary stats).
    void group;
    void AGENT_GROUPS;
  }

  // Footer.
  const totalAgents = groups.reduce((sum, g) => sum + g.agents.length, 0);
  const configured = Object.keys(assignmentsByKey).length;
  lines.push('## 統計');
  lines.push('');
  lines.push(`- Agent 總數：${totalAgents}`);
  lines.push(`- 已設定：${configured}`);
  lines.push(`- 未設定：${totalAgents - configured}`);
  lines.push(`- Catalog 模型數：${catalogRows.length}`);
  lines.push(
    `- Catalog available 數：${catalogRows.filter((r) => r.status === 'available').length}`,
  );
  lines.push('');
  lines.push('<sub>本檔案由 Agent Config 面板自動生成；手動修改不會被保留。</sub>');
  lines.push('');

  return lines.join('\n');
}

/**
 * Convenience helper to produce a filename like
 * `agent-config-2026-04-12.md`.
 */
export function makeAgentReportFilename(now: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  return `agent-config-${y}-${m}-${d}.md`;
}
