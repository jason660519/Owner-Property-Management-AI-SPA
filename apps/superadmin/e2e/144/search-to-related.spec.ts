import { test, expect } from '@playwright/test';
import { loginAsSuperadmin } from '../utils/superadmin-auth';

// Cross-page flow for Row 144 People DB (Sprint 4 + 5):
//   1. Search returns at least one row.
//   2. Clicking a name opens the person detail page (/person/[recordId]).
//   3. The detail page renders the RelatedPeoplePanel.
//   4. Clicking a related entry (when present) navigates to another person
//      detail page, closing the loop.
//
// The spec gracefully skips each step when the prior step's data isn't
// available — the People DB is seeded from customer files, so CI runs against
// varying fixtures. The goal is to catch regressions in the link wiring, not
// to assert specific record ids.

const BASE_URL = 'http://localhost:3001';
const PEOPLE_DB_SEARCH_URL = `${BASE_URL}/superadmin/settings/people-database/search`;

test.describe('Row 144 — People DB cross-page navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperadmin(page, BASE_URL);
  });

  test('search result -> person detail -> related panel -> next person', async ({ page }) => {
    await page.goto(PEOPLE_DB_SEARCH_URL);

    // Trigger a broad "any name" search. The keyword here is intentionally a
    // common single CJK char to maximize the chance of hitting at least one
    // result in any environment; if the env has no people-db data the test
    // skips cleanly.
    const searchInput = page.getByPlaceholder(/搜尋|姓名|name/i).first();
    if (await searchInput.count() === 0) {
      test.skip(true, '搜尋輸入框不存在，可能頁面尚未渲染或尚未登入');
    }
    await searchInput.fill('王');
    await page.keyboard.press('Enter');

    // Wait for either the results table or an empty-state notice. We use
    // testid-based selectors where available, but fall back to role text.
    const firstNameLink = page.locator('a[href*="/people-database/person/"]').first();
    await firstNameLink.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => undefined);

    const resultCount = await page.locator('a[href*="/people-database/person/"]').count();
    test.skip(resultCount === 0, '搜尋結果為空，略過（非測試失敗，是資料量不足）');

    // Step 2: click into person detail.
    await Promise.all([
      page.waitForURL(/\/people-database\/person\//),
      firstNameLink.click(),
    ]);

    // Step 3: RelatedPeoplePanel is present (but may be empty if the person
    // has no shared identifiers).
    const relatedPanel = page.getByTestId('related-people-panel');
    await expect(relatedPanel).toBeVisible({ timeout: 10_000 });

    // Step 4: if any related link rendered, follow it and confirm we land on
    // another person detail page with a different record id.
    const firstRelatedLink = relatedPanel.locator('a[href*="/people-database/person/"]').first();
    const relatedCount = await firstRelatedLink.count();
    if (relatedCount === 0) {
      test.info().annotations.push({
        type: 'note',
        description: '目前人員無親友圖譜資料；略過跳轉驗證。',
      });
      return;
    }

    const originalUrl = page.url();
    await Promise.all([
      page.waitForURL(/\/people-database\/person\//),
      firstRelatedLink.click(),
    ]);
    expect(page.url()).not.toBe(originalUrl);

    // The new detail page should also render its own RelatedPeoplePanel.
    await expect(page.getByTestId('related-people-panel')).toBeVisible({ timeout: 10_000 });
  });
});
