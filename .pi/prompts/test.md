Run tests for the specified scope.

## Usage
- `/test` — run all tests in current app directory
- `/test <path>` — run a specific test file

## Steps
1. Detect which app we're in (web, superadmin, web-au)
2. Run `npx jest` (unit) or `npm run test:e2e` (E2E) as appropriate
3. Report results concisely: passed/failed/skipped counts
4. If failures exist, show the first 3 failure messages
