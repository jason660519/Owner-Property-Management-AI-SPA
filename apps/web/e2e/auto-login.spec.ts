import { test, expect } from '@playwright/test';

test('Auto Login and Keep Open', async ({ page, context }) => {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  test.skip(!email || !password, 'Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD in apps/web/.env.local');

  // 1. Perform login
  await page.goto('http://localhost:3000/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  // 2. Wait for redirect to portal
  await page.waitForURL(/\/portal(\/)?$/, { timeout: 15000 });
  console.log('Successfully logged in and redirected to /portal');

  // 3. Keep the page alive for a while so the preview can see it (if Trae shares context)
  // Note: Trae's internal browser might not share the same context as this playwright run.
  // But we can output the final URL and confirm status.
  const currentUrl = page.url();
  console.log(`Current Page URL: ${currentUrl}`);
  
  // Take a screenshot of the portal for verification
  await page.screenshot({ path: 'e2e-login-success.png' });
});
