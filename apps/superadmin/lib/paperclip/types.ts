// Shared types for the Paperclip integration (Send-to-Paperclip draft).
// Paperclip is an AI-company control plane (https://docs.paperclip.ing).
// This file only describes the subset of its REST API we care about.

/** Work categories from PromptEngineerModal that map 1:1 to Paperclip agents. */
export type PaperclipRoleId =
  | 'fullstack'
  | 'database'
  | 'sdet'
  | 'qa'
  | 'devops'
  | 'architect'
  | 'uiux';

/** Valid values for POST /api/companies/{companyId}/issues `status`. */
export type PaperclipIssueStatus =
  | 'todo'
  | 'backlog'
  | 'blocked'
  | 'in_progress'
  | 'in_review'
  | 'done'
  | 'cancelled';

/** Valid values for POST /api/companies/{companyId}/issues `priority`. */
export type PaperclipIssuePriority = 'low' | 'medium' | 'high' | 'urgent';

/** Body of POST /api/companies/{companyId}/issues. */
export interface PaperclipIssuePayload {
  title: string;
  description: string;
  status?: PaperclipIssueStatus;
  priority?: PaperclipIssuePriority;
  assigneeAgentId?: string;
  parentId?: string;
  projectId?: string;
  goalId?: string;
}

/** Everything needed to make or preview the POST request. */
export interface PaperclipSubmission {
  /** Target Paperclip company ID. May be empty when not yet configured. */
  companyId: string;
  /** Fully-qualified POST endpoint, e.g. http://localhost:3187/api/companies/abc/issues. */
  endpoint: string;
  /** Body that would be POSTed to {endpoint}. */
  payload: PaperclipIssuePayload;
}

/** Static mapping from PromptEngineerModal role → Paperclip agent ID. */
export interface PaperclipRoleMapping {
  /** Paperclip company ID that owns the agents below. */
  companyId: string;
  /** Partial map — unmapped roles submit with no assignee. */
  roleToAgentId: Partial<Record<PaperclipRoleId, string>>;
}

// ── Unified status model ─────────────────────────────────────────────

/** Local task DB statuses (paperclip_tasks.status). */
export type PaperclipLocalTaskStatus =
  | 'submitted' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'tripped';

/** Agent-level statuses reported by the Paperclip API. */
export type PaperclipAgentStatus =
  | 'idle' | 'running' | 'error' | 'paused';

/** Event types recorded in paperclip_task_events for audit. */
export type PaperclipTaskEventType =
  | 'dispatched' | 'resumed' | 'paused' | 'heartbeat_run'
  | 'cron_triggered' | 'adapter_switched' | 'status_changed'
  | 'retry' | 'cancelled' | 'completed';

/** Error categories for standardized UI messages. */
export type PaperclipErrorCategory =
  | 'quota_exceeded' | 'adapter_crash' | 'network' | 'auth' | 'task_error' | 'unknown';

export function classifyError(message: string): PaperclipErrorCategory {
  const lower = message.toLowerCase();
  if (lower.includes('quota') || lower.includes('rate limit') || lower.includes('429') || lower.includes('billing'))
    return 'quota_exceeded';
  if (lower.includes('adapter_failed') || lower.includes('model does not exist'))
    return 'adapter_crash';
  if (lower.includes('network') || lower.includes('econnrefused') || lower.includes('timeout'))
    return 'network';
  if (lower.includes('401') || lower.includes('403') || lower.includes('unauthorized'))
    return 'auth';
  if (lower.includes('task') || lower.includes('issue'))
    return 'task_error';
  return 'unknown';
}

export const ERROR_CATEGORY_LABELS: Record<PaperclipErrorCategory, string> = {
  quota_exceeded: 'API quota exceeded — consider switching adapter',
  adapter_crash: 'Adapter failure — try a different adapter/model',
  network: 'Network error — check Paperclip container',
  auth: 'Authentication error — check API key',
  task_error: 'Task-level error — review prompt/code',
  unknown: 'Unknown error',
};
