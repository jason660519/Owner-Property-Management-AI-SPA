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
