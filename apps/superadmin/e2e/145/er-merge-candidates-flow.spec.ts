import { test, expect } from '@playwright/test';
import { loginAsSuperadmin } from '../utils/superadmin-auth';

// Row 145 Sprint 4b — merge-candidates admin UI smoke.
//
// Goal: confirm the new page is reachable and its empty / populated states
// render without JS errors. This spec does NOT seed candidate data — the
// happy-path confirm/reject flow requires an ER worker run against real
// fixtures, which is scoped for Sprint 6 orchestrator tests.
//
// Passing criteria:
//   1. Page loads under superadmin auth.
//   2. Either the empty-state notice OR at least one merge-candidate card is
//      present (environment-dependent).
//   3. Sidebar nav entry "尋人資料庫 — 合併候選" is discoverable and links to
//      this page.

const BASE_URL = 'http://localhost:3001';
const MERGE_CANDIDATES_URL = `${BASE_URL}/superadmin/settings/people-database/merge-candidates`;

test.describe('Row 145 — Merge candidates admin UI', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperadmin(page, BASE_URL);
  });

  test('page loads and renders either empty state or candidate cards', async ({ page }) => {
    await page.goto(MERGE_CANDIDATES_URL);

    await expect(page.getByRole('heading', { name: '待確認的合併候選' })).toBeVisible({
      timeout: 10_000,
    });

    // Either the empty-state notice or at least one card must appear.
    const emptyNotice = page.getByText('目前沒有待確認的候選');
    const firstCard = page.getByTestId('merge-candidate-card').first();

    const emptyVisible = await emptyNotice.isVisible().catch(() => false);
    const cardVisible = await firstCard.isVisible().catch(() => false);
    expect(emptyVisible || cardVisible).toBe(true);
  });

  test('sidebar nav has an entry that links to merge-candidates', async ({ page }) => {
    await page.goto(`${BASE_URL}/superadmin`);
    const link = page.locator('a[href*="/people-database/merge-candidates"]').first();
    await expect(link).toHaveCount(1);
  });
});
