import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';
const STORAGE_URL = `${BASE_URL}/superadmin/dashboard/storage`;

test.describe('Superadmin – Cloud Storage Dashboard quotas tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'a0405142777@gmail.com');
    await page.fill('input[type="password"]', 'NewPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/superadmin/);
  });

  test('can navigate to storage dashboard and open quotas tab', async ({ page }) => {
    await page.goto(STORAGE_URL);
    await expect(page.getByRole('heading', { name: '雲端空間管理' })).toBeVisible();

    // Switch to 用戶配額管理 tab
    await page.getByRole('button', { name: '用戶配額管理' }).click();

    // Either see empty-state text or a quotas table; both mean the tab rendered correctly.
    const emptyState = page.getByText('目前尚無任何配額紀錄。');
    const tableHeader = page.getByRole('columnheader', { name: '用戶配額管理' }).or(
      page.getByRole('columnheader', { name: 'User ID' })
    );

    await expect(emptyState.or(tableHeader)).toBeVisible();
  });
});

