// Pure function that turns PromptEngineerModal state into a
// Paperclip issue POST submission. Frontend-only, no network.
//
// When roleId is empty (user forgot to pick a role), autoRouteRole kicks in
// and assigns a role based on keyword matching against the title. The
// description is annotated with a tag so agents know the route was automatic.

import type {
  PaperclipIssuePayload,
  PaperclipRoleId,
  PaperclipRoleMapping,
  PaperclipSubmission,
} from './types';
import { autoRouteRole, formatAutoRouteTag } from './auto-route';
import type { AutoRouteResult } from './auto-route';

const ALL_ROLES: readonly PaperclipRoleId[] = [
  'fullstack',
  'database',
  'sdet',
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

export interface BuildIssuePayloadResult extends PaperclipSubmission {
  /** When roleId was empty and auto-routing kicked in, this describes the
   *  decision. Undefined when the user explicitly picked a role. */
  autoRoute?: AutoRouteResult;
}

export function buildIssuePayload(args: BuildIssuePayloadArgs): BuildIssuePayloadResult {
  const { rowId, featureName, ideLabel, roleId, promptText, baseUrl, mapping } = args;

  const rawTitle = `[Row ${rowId}] ${featureName}`.trim();
  const title =
    rawTitle.length > MAX_TITLE_LENGTH ? rawTitle.slice(0, MAX_TITLE_LENGTH) : rawTitle;

  // ── Resolve effective role ──────────────────────────────────────────
  // When the user explicitly picked a role, honour it. Otherwise, auto-
  // route based on the title keywords (fallback → architect for triage).
  let effectiveRole: PaperclipRoleId | undefined;
  let autoRoute: AutoRouteResult | undefined;

  if (roleId) {
    effectiveRole = roleId;
  } else {
    autoRoute = autoRouteRole(title);
    effectiveRole = autoRoute.role;
  }

  const assigneeAgentId = effectiveRole
    ? mapping.roleToAgentId[effectiveRole]
    : undefined;

  // ── Build description ──────────────────────────────────────────────
  const roleLabel = autoRoute
    ? `${effectiveRole} (${formatAutoRouteTag(autoRoute)})`
    : (roleId || '(未指定)');

  const description = [
    `**Row ID**: ${rowId}`,
    `**Feature**: ${featureName}`,
    `**Role**: ${roleLabel}`,
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
    ...(autoRoute ? { autoRoute } : {}),
  };
}

/** Type guard — narrows string to PaperclipRoleId. */
export function isValidPaperclipRole(id: string): id is PaperclipRoleId {
  return (ALL_ROLES as readonly string[]).includes(id);
}
