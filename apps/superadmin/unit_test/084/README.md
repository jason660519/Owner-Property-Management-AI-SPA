# Feature ID 084 Unit Tests

第一階段 targeted tests 位於：

- `apps/superadmin/lib/transcript-parse/__tests__/intake-router.test.ts`
- `apps/superadmin/lib/transcript-parse/__tests__/intake-router.samples.test.ts`
- `apps/superadmin/lib/transcript-parse/__tests__/intake-page-classifier.test.ts`
- `apps/superadmin/lib/transcript-parse/__tests__/report-standard.test.ts`
- `apps/superadmin/lib/transcript-parse/__tests__/confirmed-result-to-property-details.test.ts`
- `apps/superadmin/lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts`
- `apps/superadmin/app/api/transcript-intake/runs/__tests__/route.test.ts`
- `apps/superadmin/app/api/transcript-intake/runs/[id]/__tests__/route.test.ts`
- `apps/superadmin/app/api/transcript-intake/runs/[id]/process/__tests__/route.test.ts`
- `apps/superadmin/components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx`

執行：

```bash
npm test -- --runTestsByPath lib/transcript-parse/__tests__/intake-router.test.ts --runInBand
npm test -- --runTestsByPath lib/transcript-parse/__tests__/intake-router.samples.test.ts --runInBand
npm test -- --runTestsByPath lib/transcript-parse/__tests__/intake-page-classifier.test.ts --runInBand
npm test -- --runTestsByPath lib/transcript-parse/__tests__/report-standard.test.ts --runInBand
npm test -- --runTestsByPath lib/transcript-parse/__tests__/confirmed-result-to-property-details.test.ts --runInBand
npm test -- --runTestsByPath app/api/transcript-intake/runs/__tests__/route.test.ts 'app/api/transcript-intake/runs/[id]/__tests__/route.test.ts' --runInBand
npm test -- --runTestsByPath lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts 'app/api/transcript-intake/runs/[id]/process/__tests__/route.test.ts' --runInBand
npm test -- --runTestsByPath components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx --runInBand --no-watchman --forceExit
```
