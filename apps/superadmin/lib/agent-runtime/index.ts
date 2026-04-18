// Public API for the agent-runtime abstraction layer.
//
// Route handlers and server utilities should import ONLY from this file —
// e.g. `import { getAgentRuntime } from '@/lib/agent-runtime'`.
// Directly importing paperclip-runtime.ts or lib/paperclip/client.ts from
// outside this folder defeats the abstraction.

export { getAgentRuntime, getAgentRuntimeOrThrow } from './factory';

export type {
  AgentRuntime,
  CreateIssueInput,
  UpdateIssueInput,
  FetchIssueCostInput,
  FetchIssueRunLogInput,
  FetchIssueStatusInput,
  CreateIssueResult,
  UpdateIssueResult,
  FetchIssueCostResult,
  FetchIssueRunLogResult,
  FetchIssueStatusResult,
  IssueResource,
  IssueCostSnapshot,
  IssueRunLogSnapshot,
  IssueStatusSnapshot,
  GetRuntimeResult,
} from './interface';

export { PaperclipRuntime } from './paperclip-runtime';
export type { PaperclipRuntimeConfig } from './paperclip-runtime';
