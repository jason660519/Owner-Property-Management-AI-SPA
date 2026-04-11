// Reads Paperclip configuration from NEXT_PUBLIC_* env vars.
// Used by the Send-to-Paperclip preview — safe to call from client components.

import type { PaperclipRoleId, PaperclipRoleMapping } from './types';

export interface PaperclipConfig {
  baseUrl: string;
  mapping: PaperclipRoleMapping;
}

const DEFAULT_BASE_URL = 'http://localhost:3187';

/**
 * Read Paperclip config from env. All vars are optional — missing company /
 * agent IDs just produce a preview with empty fields so the user can see what
 * would need to be filled in.
 */
export function getPaperclipConfig(): PaperclipConfig {
  const baseUrl = process.env.NEXT_PUBLIC_PAPERCLIP_BASE_URL ?? DEFAULT_BASE_URL;
  const companyId = process.env.NEXT_PUBLIC_PAPERCLIP_COMPANY_ID ?? '';

  const roleEnv: Record<PaperclipRoleId, string | undefined> = {
    fullstack: process.env.NEXT_PUBLIC_PAPERCLIP_AGENT_FULLSTACK,
    database: process.env.NEXT_PUBLIC_PAPERCLIP_AGENT_DATABASE,
    qa: process.env.NEXT_PUBLIC_PAPERCLIP_AGENT_QA,
    devops: process.env.NEXT_PUBLIC_PAPERCLIP_AGENT_DEVOPS,
    architect: process.env.NEXT_PUBLIC_PAPERCLIP_AGENT_ARCHITECT,
    uiux: process.env.NEXT_PUBLIC_PAPERCLIP_AGENT_UIUX,
  };

  const roleToAgentId: Partial<Record<PaperclipRoleId, string>> = {};
  (Object.entries(roleEnv) as Array<[PaperclipRoleId, string | undefined]>).forEach(
    ([role, id]) => {
      if (id) roleToAgentId[role] = id;
    },
  );

  return {
    baseUrl,
    mapping: { companyId, roleToAgentId },
  };
}
