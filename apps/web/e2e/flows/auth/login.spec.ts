import { test, expect } from '@playwright/test';

test('Test login with a0405142777@gmail.com', async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL ?? 'a0405142777@gmail.com';
  const password = process.env.E2E_TEST_PASSWORD ?? '!qaz2wsX';

  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');

  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);

  await page.click('button[type="submit"]');

  await page.waitForURL(/\/portal(\/)?$/, { timeout: 15_000 });

  await expect(page).toHaveURL(/\/portal(\/)?$/);
  await page.screenshot({ path: '/tmp/login-test.png' });
});
