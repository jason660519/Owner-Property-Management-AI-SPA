/**
 * Types for the Model Role Catalog feature.
 * Manages AI model role/function classification tags.
 */

export interface RoleTag {
  id: string;
  tag_key: string;
  tag_label: string;
  description: string | null;
  sort_order: number;
  is_system: boolean;
}

export type RoleAssignmentSource = 'ai_online' | 'ai_offline' | 'manual';

export interface RoleAssignment {
  id: string;
  provider: string;
  model_id: string;
  tag_key: string;
  source: RoleAssignmentSource;
  confidence: number;
  classified_at: string;
  classified_by: string;
}

export type ModelStatus = 'available' | 'no_key' | 'invalid';

export interface ModelRoleCatalogRow {
  /** Provider machine key, e.g. 'openai' */
  provider: string;
  /** Provider display name, e.g. 'OpenAI' */
  providerName: string;
  /** Model machine id, e.g. 'gpt-4o' */
  modelId: string;
  /** Model display name, e.g. 'GPT-4o' */
  modelName: string;
  /** Parsed version string from model id or name */
  version: string;
  /** Availability status based on API key state */
  status: ModelStatus;
  /** Role tag assignments for this model */
  assignments: RoleAssignment[];
}

export interface ClassifyModelsRequest {
  mode: 'online' | 'offline';
  classifierProvider: string;
  classifierModelId: string;
}

export interface ClassifyModelsResult {
  ok: boolean;
  count: number;
  error?: string;
}

/** Shape returned by the classification LLM */
export interface ClassifyLLMResultItem {
  provider: string;
  model_id: string;
  tags: Array<{ tag_key: string; confidence: number }>;
}
