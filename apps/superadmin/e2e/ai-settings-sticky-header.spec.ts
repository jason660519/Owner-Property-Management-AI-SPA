import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';
const SETTINGS_URL = `${BASE_URL}/superadmin/settings/api_key_and_model_setting`;

test.describe('AI Settings – sticky header on scroll', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'a0405142777@gmail.com');
    await page.fill('input[type="password"]', 'NewPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/superadmin/);
  });

  test('header (API 金鑰管理 + tabs) stays visible when scrolling main content', async ({ page }) => {
    await page.goto(SETTINGS_URL);
    await page.waitForLoadState('networkidle');

    const main = page.locator('main');
    await expect(main).toBeVisible();

    const tabButton = page.getByRole('button', { name: 'API 金鑰管理' });
    await expect(tabButton).toBeVisible();

    const pageTitle = page.getByRole('heading', { name: 'Model and API key Settings' });
    await expect(pageTitle).toBeVisible();

    await main.evaluate((el) => {
      el.scrollTop = 400;
    });

    await expect(tabButton).toBeVisible();
    await expect(pageTitle).toBeVisible();
  });
});
