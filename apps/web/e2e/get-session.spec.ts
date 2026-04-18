import { test, expect } from '@playwright/test';

test('Get Session after password login', async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  test.skip(!email || !password, 'Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD in apps/web/.env.local');

  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');

  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);

  await page.click('button[type="submit"]');

  // Wait for login to complete and redirect to portal
  await page.waitForURL(/\/portal(\/)?$/, { timeout: 15_000 });

  // Extract cookies
  const cookies = await page.context().cookies();
  const sbCookies = cookies.filter(cookie => cookie.name.startsWith('sb-'));

  // Extract storage
  const storageData = await page.evaluate(() => {
    const data: Record<string, string> = {};
    const storageTypes = ['localStorage', 'sessionStorage'] as const;
    storageTypes.forEach(type => {
      const storage = window[type];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith('sb-')) {
          data[`${type}:${key}`] = storage.getItem(key) || '';
        }
      }
    });
    return data;
  });

  console.log('---SESSION_DATA_START---');
  console.log(JSON.stringify({ cookies: sbCookies, storage: storageData }));
  console.log('---SESSION_DATA_END---');
});
