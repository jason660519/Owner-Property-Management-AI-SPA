/**
 * Tests for the pure Markdown exporter in lib/ai/agent-report.ts.
 *
 * These lock in:
 *   - Frontmatter (title + timestamp formatting)
 *   - Every agent from AI_AGENT_REGISTRY gets its own section
 *   - Configured agents render Primary + Fallbacks + guardrails
 *   - Unconfigured agents render the "尚未設定" warning
 *   - Recommendation filtering matches AgentRecommendationPanel behavior
 *   - Filename helper produces a YYYY-MM-DD stamped .md file
 */

import {
  generateAgentReportMarkdown,
  makeAgentReportFilename,
  filterCatalogForAgent,
} from '@/lib/ai/agent-report';
import { AI_AGENT_REGISTRY, getAgentByKey } from '@/lib/ai/agent-registry';
import type { AgentAssignment } from '@/lib/types/agent-assignment';
import type { ModelRoleCatalogRow } from '@/lib/types/model-role-catalog';
import type { ModelEvaluation } from '@/lib/hooks/useAISettings';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FROZEN_NOW = new Date('2026-04-12T03:45:00Z');

const contractAssignment: AgentAssignment = {
  id: 'a1',
  agent_key: 'contract_assistant',
  is_enabled: true,
  primary_provider: 'anthropic',
  primary_model_id: 'claude-opus-4-20250514',
  primary_config: { temperature: 0.2, max_tokens: 8192 },
  fallbacks: [
    { provider: 'openai', model_id: 'gpt-4o', trigger: 'rate_limit', config: {} },
    { provider: 'gemini', model_id: 'gemini-1.5-pro', trigger: 'error', config: {} },
    {
      provider: 'anthropic',
      model_id: 'claude-sonnet-4-20250514',
      trigger: 'cost_over',
      config: {},
    },
  ],
  guardrails: { max_monthly_usd: 5 },
  notes: '合約條款精度優先 | 後援也保持高水準',
  updated_by: null,
  updated_at: '2026-04-12T00:00:00Z',
  created_at: '2026-04-12T00:00:00Z',
};

const propertyAssignment: AgentAssignment = {
  ...contractAssignment,
  id: 'a2',
  agent_key: 'property_description',
  primary_model_id: 'claude-sonnet-4-20250514',
  fallbacks: [],
  notes: null,
};

const catalogRows: ModelRoleCatalogRow[] = [
  {
    provider: 'anthropic',
    providerName: 'Anthropic',
    modelId: 'claude-opus-4-20250514',
    modelName: 'Claude Opus 4',
    version: '4',
    status: 'available',
    assignments: [
      { id: 'r1', provider: 'anthropic', model_id: 'claude-opus-4-20250514', tag_key: 'ad_copy_generation', source: 'manual', confidence: 1, classified_at: '', classified_by: '' },
    ],
  },
  {
    provider: 'openai',
    providerName: 'OpenAI',
    modelId: 'gpt-4o',
    modelName: 'GPT-4o',
    version: '4o',
    status: 'available',
    assignments: [
      { id: 'r2', provider: 'openai', model_id: 'gpt-4o', tag_key: 'transcript_visual_parse', source: 'ai_online', confidence: 0.8, classified_at: '', classified_by: '' },
    ],
  },
  {
    provider: 'grok',
    providerName: 'xAI Grok',
    modelId: 'grok-2-vision',
    modelName: 'Grok 2 Vision',
    version: '2',
    status: 'invalid',
    assignments: [],
  },
  {
    provider: 'kimi',
    providerName: 'Kimi',
    modelId: 'moonshot-v1-128k',
    modelName: 'Moonshot v1 128K',
    version: 'v1-128k',
    status: 'no_key',
    assignments: [],
  },
];

const evaluations: ModelEvaluation[] = [
  {
    provider: 'openai',
    model_id: 'gpt-4o',
    model_name: 'GPT-4o',
    is_working: true,
    specialties: ['vision'],
    is_candidate: true,
    notes: '',
    last_tested_at: '2026-04-11T12:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateAgentReportMarkdown', () => {
  const md = generateAgentReportMarkdown({
    assignmentsByKey: {
      contract_assistant: contractAssignment,
      property_description: propertyAssignment,
    },
    catalogRows,
    evaluations,
    now: FROZEN_NOW,
  });

  it('renders the report title and a stable UTC timestamp', () => {
    expect(md).toContain('# AI Agent 模型選擇與設定快照');
    expect(md).toContain('**匯出時間**：2026-04-12 03:45 UTC');
  });

  it('includes every agent from AI_AGENT_REGISTRY in the TOC and body', () => {
    for (const agent of AI_AGENT_REGISTRY) {
      expect(md).toContain(`(#${agent.key})`); // TOC link
      expect(md).toContain(`<a id="${agent.key}"></a>`); // section anchor
      expect(md).toContain(`### ${agent.label} (\`${agent.key}\`)`); // heading
    }
  });

  it('renders Primary + temperature + max_tokens + guardrail for configured agents', () => {
    expect(md).toContain('`anthropic` / `claude-opus-4-20250514`');
    expect(md).toContain('| Temperature | 0.2 |');
    expect(md).toContain('| Max tokens | 8192 |');
    expect(md).toContain('| 月上限 (USD) | $5 |');
  });

  it('escapes pipe characters in free-text notes so Markdown tables stay valid', () => {
    // Notes contain an unescaped "|" that would break the table layout.
    expect(md).toContain('合約條款精度優先 \\| 後援也保持高水準');
  });

  it('lists fallbacks with trigger labels in priority order', () => {
    expect(md).toMatch(/1\. `openai` \/ `gpt-4o` — 觸發：\*\*超過速率限制\*\*/);
    expect(md).toMatch(/2\. `gemini` \/ `gemini-1\.5-pro` — 觸發：\*\*呼叫錯誤\*\*/);
    expect(md).toMatch(
      /3\. `anthropic` \/ `claude-sonnet-4-20250514` — 觸發：\*\*超過成本上限\*\*/,
    );
  });

  it('renders "尚未設定" for agents without an assignment row', () => {
    // blog_generator isn't in assignmentsByKey.
    const section = sliceAgentSection(md, '### 部落格生成');
    expect(section).toContain('⚠️ **尚未設定**');
  });

  /** Slice out one agent's section by matching the end-of-section marker (\n---\n). */
  function sliceAgentSection(markdown: string, heading: string): string {
    const start = markdown.indexOf(heading);
    if (start < 0) throw new Error(`heading not found: ${heading}`);
    // The markdown table separator row (|:---|:---|) also contains "---",
    // so we must search for the standalone section delimiter `\n---\n`.
    const rel = markdown.slice(start).indexOf('\n---\n');
    return rel < 0 ? markdown.slice(start) : markdown.slice(start, start + rel);
  }

  it('recommendation filter mirrors AgentRecommendationPanel behavior', () => {
    // ad_generator's suggestedTagKeys === ['ad_copy_generation'] — only
    // Claude Opus has that tag in our fixture, so gpt-4o must be filtered out
    // from the ad_generator recommendation table.
    const section = sliceAgentSection(md, '### 廣告文案');
    expect(section).toContain('claude-opus-4-20250514');
    expect(section).not.toContain('gpt-4o');
  });

  it('renders the "最近測試" column as ✅ 正常 when an evaluation says so', () => {
    // GPT-4o has is_working=true in our evaluations fixture, and
    // transcript_visual_parse agent should include it in its recommendation.
    const section = sliceAgentSection(md, '### 謄本視覺解析');
    expect(section).toContain('gpt-4o');
    expect(section).toContain('✅ 正常');
  });

  it('statistics footer reports agent counts correctly', () => {
    expect(md).toContain(`- Agent 總數：${AI_AGENT_REGISTRY.length}`);
    expect(md).toContain('- 已設定：2');
    expect(md).toContain(`- 未設定：${AI_AGENT_REGISTRY.length - 2}`);
  });

  it('warns when an agent has no catalog match after filtering', () => {
    // photo_generation wants 'photo_generation' tag, which no catalog row has.
    const section = sliceAgentSection(md, '### 照片生成');
    expect(section).toContain('無符合條件的模型');
  });

  describe('top-N cap', () => {
    // Build 25 synthetic available rows, each tagged with `legal_contract`
    // so they match contract_assistant's filter after the tag was added
    // in migration 20260412110000.
    const manyRows: ModelRoleCatalogRow[] = Array.from({ length: 25 }, (_, i) => ({
      provider: 'openai',
      providerName: 'OpenAI',
      modelId: `fake-model-${i.toString().padStart(2, '0')}`,
      modelName: `Fake Model ${i}`,
      version: `v${i}`,
      status: 'available' as const,
      assignments: [
        {
          id: `fa-${i}`,
          provider: 'openai',
          model_id: `fake-model-${i.toString().padStart(2, '0')}`,
          tag_key: 'legal_contract',
          source: 'manual' as const,
          confidence: 1,
          classified_at: '',
          classified_by: '',
        },
      ],
    }));

    it('caps contract_assistant to 10 rows by default', () => {
      const output = generateAgentReportMarkdown({
        assignmentsByKey: {},
        catalogRows: manyRows,
        evaluations: [],
        now: FROZEN_NOW,
      });
      const section = output.slice(output.indexOf('### 合約助理'));
      const nextMarker = section.indexOf('\n---\n');
      const agentSection = nextMarker < 0 ? section : section.slice(0, nextMarker);

      // Count Markdown table body rows (|-rows not header or separator).
      const bodyRows = (agentSection.match(/^\| OpenAI \|/gm) ?? []).length;
      expect(bodyRows).toBe(10);
      expect(agentSection).toContain('還有 15 個符合條件的模型未列出');
      expect(agentSection).toContain('依標籤 `legal_contract` 篩選，共 25 筆，僅列前 10');
    });

    it('respects a custom maxRecommendationsPerAgent of 3', () => {
      const output = generateAgentReportMarkdown({
        assignmentsByKey: {},
        catalogRows: manyRows,
        evaluations: [],
        now: FROZEN_NOW,
        maxRecommendationsPerAgent: 3,
      });
      const section = output.slice(output.indexOf('### 合約助理'));
      const nextMarker = section.indexOf('\n---\n');
      const agentSection = nextMarker < 0 ? section : section.slice(0, nextMarker);
      const bodyRows = (agentSection.match(/^\| OpenAI \|/gm) ?? []).length;
      expect(bodyRows).toBe(3);
      expect(agentSection).toContain('還有 22 個符合條件的模型未列出');
    });

    it('emits no truncation notice when maxRecommendationsPerAgent=0 (uncapped)', () => {
      const output = generateAgentReportMarkdown({
        assignmentsByKey: {},
        catalogRows: manyRows,
        evaluations: [],
        now: FROZEN_NOW,
        maxRecommendationsPerAgent: 0,
      });
      const section = output.slice(output.indexOf('### 合約助理'));
      const nextMarker = section.indexOf('\n---\n');
      const agentSection = nextMarker < 0 ? section : section.slice(0, nextMarker);
      const bodyRows = (agentSection.match(/^\| OpenAI \|/gm) ?? []).length;
      expect(bodyRows).toBe(25);
      expect(agentSection).not.toContain('還有');
    });
  });
});

describe('filterCatalogForAgent', () => {
  it('returns all available models when suggestedTagKeys is empty', () => {
    // After migration 20260412110000 every registry agent has a tag, so we
    // synthesize an empty-tag agent here to exercise the fallback branch.
    const emptyAgent: Parameters<typeof filterCatalogForAgent>[0] = {
      key: '__empty__',
      label: 'Empty',
      description: '',
      // icon type comes from lucide-react; the helper never renders it so any
      // truthy value works for the unit test.
      icon: (() => null) as unknown as Parameters<typeof filterCatalogForAgent>[0]['icon'],
      group: 'support',
      suggestedTagKeys: [],
    };
    const out = filterCatalogForAgent(emptyAgent, catalogRows);
    // available: anthropic/claude-opus + openai/gpt-4o. Not grok (invalid) or kimi (no_key).
    expect(out.map((r) => r.modelId).sort()).toEqual([
      'claude-opus-4-20250514',
      'gpt-4o',
    ]);
  });

  it('filters by tag when suggestedTagKeys is set', () => {
    const ad = getAgentByKey('ad_generator');
    if (!ad) throw new Error('expected ad_generator to exist');
    const out = filterCatalogForAgent(ad, catalogRows);
    // Only Claude Opus has ad_copy_generation in fixture.
    expect(out.map((r) => r.modelId)).toEqual(['claude-opus-4-20250514']);
  });

  it('excludes rows with status=no_key even when they carry the right tag', () => {
    const withTag: ModelRoleCatalogRow[] = [
      {
        provider: 'z',
        providerName: 'Z',
        modelId: 'z-model',
        modelName: 'Z',
        version: 'v',
        status: 'no_key',
        assignments: [
          { id: 'x', provider: 'z', model_id: 'z-model', tag_key: 'transcript_visual_parse', source: 'manual', confidence: 1, classified_at: '', classified_by: '' },
        ],
      },
    ];
    const visual = getAgentByKey('transcript_visual_parse');
    if (!visual) throw new Error('expected transcript_visual_parse to exist');
    expect(filterCatalogForAgent(visual, withTag)).toEqual([]);
  });
});

describe('makeAgentReportFilename', () => {
  it('produces a YYYY-MM-DD filename', () => {
    const name = makeAgentReportFilename(new Date('2026-04-12T12:00:00Z'));
    // Allowed to differ by ±1 day from UTC depending on the test runner TZ —
    // so just assert the shape, not the exact date.
    expect(name).toMatch(/^agent-config-\d{4}-\d{2}-\d{2}\.md$/);
  });
});
