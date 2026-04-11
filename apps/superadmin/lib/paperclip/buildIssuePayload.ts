// Pure function that turns PromptEngineerModal state into a
// Paperclip issue POST submission. Frontend-only, no network.

import type {
  PaperclipIssuePayload,
  PaperclipRoleId,
  PaperclipRoleMapping,
  PaperclipSubmission,
} from './types';

const ALL_ROLES: readonly PaperclipRoleId[] = [
  'fullstack',
  'database',
  'qa',
  'devops',
  'architect',
  'uiux',
] as const;

/** Max characters we allow in a Paperclip issue title. Paperclip itself may
 *  impose its own limit — 200 is a conservative floor that fits most UIs. */
const MAX_TITLE_LENGTH = 200;

export interface BuildIssuePayloadArgs {
  rowId: string;
  featureName: string;
  ideLabel: string;
  /** Empty string means "no role picked yet" — still produces a valid preview. */
  roleId: PaperclipRoleId | '';
  promptText: string;
  /** Paperclip base URL, with or without trailing slash. */
  baseUrl: string;
  mapping: PaperclipRoleMapping;
}

export function buildIssuePayload(args: BuildIssuePayloadArgs): PaperclipSubmission {
  const { rowId, featureName, ideLabel, roleId, promptText, baseUrl, mapping } = args;

  const rawTitle = `[Row ${rowId}] ${featureName}`.trim();
  const title =
    rawTitle.length > MAX_TITLE_LENGTH ? rawTitle.slice(0, MAX_TITLE_LENGTH) : rawTitle;

  const assigneeAgentId = roleId ? mapping.roleToAgentId[roleId] : undefined;

  const description = [
    `**Row ID**: ${rowId}`,
    `**Feature**: ${featureName}`,
    `**Role**: ${roleId || '(未指定)'}`,
    `**IDE**: ${ideLabel || '(未指定)'}`,
    '',
    '---',
    '',
    promptText,
  ].join('\n');

  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const endpoint = `${normalizedBase}/api/companies/${mapping.companyId}/issues`;

  const payload: PaperclipIssuePayload = {
    title,
    description,
    status: 'todo',
    priority: 'medium',
    ...(assigneeAgentId ? { assigneeAgentId } : {}),
  };

  return {
    companyId: mapping.companyId,
    endpoint,
    payload,
  };
}

/** Type guard — narrows string to PaperclipRoleId. */
export function isValidPaperclipRole(id: string): id is PaperclipRoleId {
  return (ALL_ROLES as readonly string[]).includes(id);
}
