// PaperclipRuntime — AgentRuntime implementation backed by the Paperclip
// HTTP service at NEXT_PUBLIC_PAPERCLIP_BASE_URL.
//
// This is a thin forwarding layer: every method delegates to the corresponding
// function in lib/paperclip/client.ts after injecting the transport config
// (baseUrl / apiKey / companyId) the caller no longer needs to pass.
//
// No behavior changes vs. calling the client directly — the goal at this
// phase is only to introduce the seam, so routes stop importing
// lib/paperclip/client.ts directly.

import {
  createIssue,
  updateIssue,
  fetchIssueCost,
  fetchIssueRunLog,
  fetchIssueStatus,
} from '@/lib/paperclip/client';

import type {
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
} from './interface';

export interface PaperclipRuntimeConfig {
  baseUrl: string;
  apiKey: string;
  /** Required by createIssue only. Absent-OK routes (status / cost / run-log
   *  / update) don't hit company-scoped endpoints, so the factory allows
   *  this to be missing. createIssue checks at call time. */
  companyId?: string;
}

export class PaperclipRuntime implements AgentRuntime {
  readonly name = 'paperclip';

  constructor(private readonly config: PaperclipRuntimeConfig) {}

  createIssue(input: CreateIssueInput): Promise<CreateIssueResult> {
    if (!this.config.companyId) {
      return Promise.resolve({
        ok: false,
        status: 500,
        error: 'NEXT_PUBLIC_PAPERCLIP_COMPANY_ID not set.',
      });
    }
    return createIssue({
      baseUrl: this.config.baseUrl,
      companyId: this.config.companyId,
      apiKey: this.config.apiKey,
      ...input,
    });
  }

  updateIssue(input: UpdateIssueInput): Promise<UpdateIssueResult> {
    return updateIssue({
      baseUrl: this.config.baseUrl,
      apiKey: this.config.apiKey,
      ...input,
    });
  }

  fetchIssueCost(input: FetchIssueCostInput): Promise<FetchIssueCostResult> {
    return fetchIssueCost({
      baseUrl: this.config.baseUrl,
      apiKey: this.config.apiKey,
      ...input,
    });
  }

  fetchIssueRunLog(
    input: FetchIssueRunLogInput,
  ): Promise<FetchIssueRunLogResult> {
    return fetchIssueRunLog({
      baseUrl: this.config.baseUrl,
      apiKey: this.config.apiKey,
      ...input,
    });
  }

  fetchIssueStatus(
    input: FetchIssueStatusInput,
  ): Promise<FetchIssueStatusResult> {
    return fetchIssueStatus({
      baseUrl: this.config.baseUrl,
      apiKey: this.config.apiKey,
      ...input,
    });
  }
}
