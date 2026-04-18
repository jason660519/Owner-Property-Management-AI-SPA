// AgentRuntime — abstraction layer over the agent execution backend.
//
// Design goals (Phase 0 of Paperclip decoupling):
//   1. Keep the surface narrow: only the 5 operations that actually cross a
//      network boundary today (everything in lib/paperclip/client.ts).
//      Local concerns (git worktree, GitHub PR, merge history, polling) stay
//      in their own modules — they are not tied to any runtime.
//   2. Hide transport-level config (baseUrl / apiKey / companyId) behind the
//      runtime factory. Callers pass only business-relevant args.
//   3. Keep Paperclip's error-discipline: never throw; return a discriminated
//      { ok: true, ... } | { ok: false, status, error, detail? } union.
//
// Future implementations (e.g. LocalRuntime backed by Supabase + child_process)
// simply satisfy this interface. A caller that imports from '@/lib/agent-runtime'
// should never need to know which backend is active.

import type {
  CreateIssueArgs,
  CreateIssueResult,
  UpdateIssueArgs,
  UpdateIssueResult,
  FetchIssueCostArgs,
  FetchIssueCostResult,
  FetchIssueRunLogArgs,
  FetchIssueRunLogResult,
  FetchIssueStatusArgs,
  FetchIssueStatusResult,
} from '@/lib/paperclip/client';

// Re-export result/snapshot types so callers can import from agent-runtime
// without reaching into lib/paperclip (step toward full decoupling).
export type {
  CreateIssueResult,
  UpdateIssueResult,
  FetchIssueCostResult,
  FetchIssueRunLogResult,
  FetchIssueStatusResult,
} from '@/lib/paperclip/client';

export type {
  PaperclipIssueResource as IssueResource,
  PaperclipIssueCostSnapshot as IssueCostSnapshot,
  PaperclipIssueRunLogSnapshot as IssueRunLogSnapshot,
  PaperclipIssueStatusSnapshot as IssueStatusSnapshot,
} from '@/lib/paperclip/client';

// Args without transport-level config — runtime owns baseUrl/apiKey/companyId.
export type CreateIssueInput = Omit<
  CreateIssueArgs,
  'baseUrl' | 'apiKey' | 'companyId'
>;
export type UpdateIssueInput = Omit<UpdateIssueArgs, 'baseUrl' | 'apiKey'>;
export type FetchIssueCostInput = Omit<FetchIssueCostArgs, 'baseUrl' | 'apiKey'>;
export type FetchIssueRunLogInput = Omit<
  FetchIssueRunLogArgs,
  'baseUrl' | 'apiKey'
>;
export type FetchIssueStatusInput = Omit<
  FetchIssueStatusArgs,
  'baseUrl' | 'apiKey'
>;

/**
 * The active backend that executes agent work. Currently only PaperclipRuntime
 * implements this, backed by the external Paperclip service. A LocalRuntime
 * (Supabase + spawn) is planned for Phase 1.
 */
export interface AgentRuntime {
  /** Stable identifier for logs / feature flags — e.g. 'paperclip', 'local'. */
  readonly name: string;

  createIssue(input: CreateIssueInput): Promise<CreateIssueResult>;
  updateIssue(input: UpdateIssueInput): Promise<UpdateIssueResult>;
  fetchIssueCost(input: FetchIssueCostInput): Promise<FetchIssueCostResult>;
  fetchIssueRunLog(input: FetchIssueRunLogInput): Promise<FetchIssueRunLogResult>;
  fetchIssueStatus(input: FetchIssueStatusInput): Promise<FetchIssueStatusResult>;
}

/**
 * Result discriminator used by factory — lets callers report a clean error
 * when runtime cannot be constructed (missing env vars, unknown backend).
 */
export type GetRuntimeResult =
  | { ok: true; runtime: AgentRuntime }
  | { ok: false; status: number; error: string };
