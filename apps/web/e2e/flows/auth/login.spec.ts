import { test, expect } from '@playwright/test';

test('password login reaches portal', async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  test.skip(!email || !password, 'Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD in apps/web/.env.local');

  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');

  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);

  await page.click('button[type="submit"]');

  await page.waitForURL(/\/portal(\/)?$/, { timeout: 15_000 });

  await expect(page).toHaveURL(/\/portal(\/)?$/);
  await page.screenshot({ path: '/tmp/login-test.png' });
});
