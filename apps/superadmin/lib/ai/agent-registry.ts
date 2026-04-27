/**
 * Static, hard-coded registry of AI Agents that can be configured on the
 * "模型選擇與設定" (Agent Model Assignment) sheet tab.
 *
 * Why hard-coded: Phase 1 of the feature deliberately keeps this list
 * in source so there's no CRUD surface to maintain. Agents are low-churn
 * (they represent real product capabilities), and a new agent requires a
 * code change anyway to wire the backend call-site. When Phase 2 adds the
 * dispatcher, we may reconsider promoting this to a DB table, but for now
 * source-of-truth lives here.
 *
 * `key` MUST match the `module_key` convention used elsewhere in the
 * codebase (see lib/ai/prompt-safety.ts and ai_modules_assigned_function
 * table) so that the future `resolveAgentModel(agentKey)` helper can share
 * the same canonical naming.
 */

import type { LucideIcon } from 'lucide-react';
import {
  Bot,
  Code,
  FileSignature,
  FileText,
  Home,
  Image as ImageIcon,
  Megaphone,
  MessageCircle,
  Mic,
  ScanText,
  Video,
  Wrench,
} from 'lucide-react';

export type AgentGroup = 'content' | 'transcript' | 'media' | 'dev' | 'support';

export interface AgentDef {
  /** Snake_case identifier. Must equal module_key in prompt-safety.ts. */
  key: string;
  /** Chinese display name shown in the left rail. */
  label: string;
  /** One-line description shown under the label. */
  description: string;
  icon: LucideIcon;
  group: AgentGroup;
  /**
   * Optional suggested tag_keys from ai_model_role_tags. Used by the
   * Recommendations panel to pre-filter the ModelRoleCatalogTable to
   * models that already carry one of these capability tags.
   */
  suggestedTagKeys: string[];
}

export interface AgentGroupMeta {
  label: string;
  order: number;
}

export const AGENT_GROUPS: Record<AgentGroup, AgentGroupMeta> = {
  content:    { label: '內容生成',       order: 1 },
  transcript: { label: '謄本解析',       order: 2 },
  media:      { label: '媒體生成',       order: 3 },
  dev:        { label: '開發與工具',     order: 4 },
  support:    { label: '客服 / 通用',    order: 5 },
};

export const AI_AGENT_REGISTRY: readonly AgentDef[] = [
  // ── content ──
  {
    key: 'contract_assistant',
    label: '合約助理',
    description: '解析 / 生成租賃與買賣合約條款',
    icon: FileSignature,
    group: 'content',
    suggestedTagKeys: ['legal_contract'],
  },
  {
    key: 'property_description',
    label: '房源描述',
    description: '依基本資料生成房源介紹文案',
    icon: Home,
    group: 'content',
    suggestedTagKeys: ['ad_copy_generation'],
  },
  {
    key: 'blog_generator',
    label: '部落格生成',
    description: '自動生成房市部落格長文',
    icon: FileText,
    group: 'content',
    suggestedTagKeys: ['ad_copy_generation'],
  },
  {
    key: 'ad_generator',
    label: '廣告文案',
    description: '生成廣告投放文案與標語',
    icon: Megaphone,
    group: 'content',
    suggestedTagKeys: ['ad_copy_generation'],
  },
  // ── transcript ──
  {
    key: 'transcript_detection',
    label: '謄本筆數偵測',
    description: '偵測謄本中建號/地號筆數',
    icon: ScanText,
    group: 'transcript',
    suggestedTagKeys: ['transcript_detection'],
  },
  {
    key: 'transcript_review',
    label: '謄本筆數審核',
    description: '審核偵測組的筆數結果',
    icon: ScanText,
    group: 'transcript',
    suggestedTagKeys: ['transcript_review'],
  },
  {
    key: 'transcript_visual_parse',
    label: '謄本視覺解析',
    description: '解析謄本圖片中的全部欄位',
    icon: ScanText,
    group: 'transcript',
    suggestedTagKeys: ['transcript_visual_parse'],
  },
  {
    key: 'transcript_audit',
    label: '謄本解析審核',
    description: '審核視覺解析組的結果是否正確',
    icon: ScanText,
    group: 'transcript',
    suggestedTagKeys: ['transcript_audit'],
  },
  {
    key: 'transcript_detail_builder',
    label: '謄本明細草稿',
    description: '依解析與審核結果產生建物土地車位明細草稿',
    icon: ScanText,
    group: 'transcript',
    suggestedTagKeys: ['transcript_detail_builder'],
  },
  // ── media ──
  {
    key: 'photo_generation',
    label: '照片生成編輯',
    description: '空屋出清、家具替換、室內後製',
    icon: ImageIcon,
    group: 'media',
    suggestedTagKeys: ['photo_generation'],
  },
  {
    key: 'video_generation',
    label: '影片 P2V',
    description: '圖片轉建案動畫 (Picture-to-Video)',
    icon: Video,
    group: 'media',
    suggestedTagKeys: ['video_generation'],
  },
  {
    key: 'voice_generation',
    label: '語音生成',
    description: '物件介紹語音 TTS',
    icon: Mic,
    group: 'media',
    suggestedTagKeys: ['voice_generation'],
  },
  // ── dev ──
  {
    key: 'software_dev_engineer',
    label: '軟體開發助理',
    description: 'Code review、補測試、重構建議',
    icon: Code,
    group: 'dev',
    suggestedTagKeys: ['code_generation'],
  },
  {
    key: 'ttd_engineer',
    label: 'TDD 工程師',
    description: '依需求產生測試骨架與用例',
    icon: Wrench,
    group: 'dev',
    suggestedTagKeys: ['code_generation'],
  },
  // ── support ──
  {
    key: 'web_assistant',
    label: '網站助理',
    description: '站內客服聊天與常見問題回應',
    icon: MessageCircle,
    group: 'support',
    suggestedTagKeys: ['general_assistant'],
  },
] as const;

/** Default icon for agents we haven't thought of an icon for. */
export const DEFAULT_AGENT_ICON: LucideIcon = Bot;

export function getAgentByKey(key: string): AgentDef | undefined {
  return AI_AGENT_REGISTRY.find((a) => a.key === key);
}

/**
 * Return agents grouped by AgentGroup, with groups in `AGENT_GROUPS.order`.
 * Within each group, agents preserve the order in which they appear in
 * `AI_AGENT_REGISTRY`.
 */
export function getAgentsByGroup(): Array<{ group: AgentGroup; meta: AgentGroupMeta; agents: AgentDef[] }> {
  const groupMap = new Map<AgentGroup, AgentDef[]>();
  for (const agent of AI_AGENT_REGISTRY) {
    const arr = groupMap.get(agent.group) ?? [];
    arr.push(agent);
    groupMap.set(agent.group, arr);
  }
  return (Object.keys(AGENT_GROUPS) as AgentGroup[])
    .sort((a, b) => AGENT_GROUPS[a].order - AGENT_GROUPS[b].order)
    .map((group) => ({
      group,
      meta: AGENT_GROUPS[group],
      agents: groupMap.get(group) ?? [],
    }));
}

/** Keys allowed when validating incoming API payloads. */
export const VALID_AGENT_KEYS: ReadonlySet<string> = new Set(
  AI_AGENT_REGISTRY.map((a) => a.key),
);
