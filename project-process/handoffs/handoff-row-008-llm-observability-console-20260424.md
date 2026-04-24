# Handoff — Row 008 LLM Observability Console

> Date: 2026-04-24  
> Sprint: Sprint 1 — Trace/Eval Console MVP  
> Status: In Progress

## Context

User wants a unified UI to observe every LLM call process and result. Required fields include date, page, company, invocation, execution, adapter model, input/test prompt, test file, requested/effective model, real-time raw output, rendered output, evaluation, TTFT, E2E, throughput tokens/s, and HTTP status.

Existing route `/superadmin/dashboard/llm-monitor` is the correct home. It already has overall stats, AI usage logs, model comparison, token trends, voice quality, and budget/key panels.

## Decision

Use Row 008. Do not create a duplicate roadmap row.

Architecture borrows concepts from Langfuse/Phoenix:

- trace = one page/workflow operation
- invocation/span = one provider/adapter/evaluator call
- evaluation = score/label/explanation attached to invocation
- artifacts = large prompt/test file/raw/rendered payloads by reference

## Files Created

- `project-process/features/llm-observability-console-dev-spec-20260424.md`
- `project-process/features/tdd-llm-observability-console-20260424.md`
- `project-process/test-logs/test-llm-observability-console-2026-04-24.md`
- `project-process/dev-logs/008-development-log-summary.md`
- `project-process/handoffs/handoff-row-008-llm-observability-console-20260424.md`
- `apps/superadmin/unit_test/008/`
- `apps/superadmin/e2e/008/`
- `supabase/migrations/20260424100000_create_llm_observability_traces.sql`

## Files Updated

- `apps/superadmin/app/data/roadmap.ts`
- `apps/superadmin/app/superadmin/dashboard/llm-monitor/actions.ts`
- `apps/superadmin/app/superadmin/dashboard/llm-monitor/page.tsx`
- `apps/superadmin/app/superadmin/dashboard/llm-monitor/LLMMonitorClient.tsx`
- `apps/superadmin/app/superadmin/dashboard/llm-monitor/LLMMonitorClient.test.tsx`
- `apps/superadmin/lib/ai/observability.ts`
- `apps/superadmin/lib/adapter-evaluation-runs/insert-adapter-evaluation-run.ts`
- `apps/superadmin/app/api/ai-settings/adapter-runs/route.ts`
- `apps/superadmin/app/api/property-description/stream/route.ts`
- `apps/superadmin/app/api/property-description/stream/route.test.ts`

## Verification

- `npx tsc --noEmit --project apps/superadmin/tsconfig.json`
- `npm test --workspace superadmin -- LLMMonitorClient --runInBand --forceExit`
- `npm test --workspace superadmin -- app/api/property-description/stream/route.test.ts --runInBand --forceExit`
- `git diff --check`

## Next Work

1. Integrate non-adapter global evaluation batch report / recent report apply flow into observability.
2. Add Row 008 E2E smoke once auth/session fixture is ready.
3. Replace E2E-only timing in property-description with TTFT once provider streaming is chunked.
