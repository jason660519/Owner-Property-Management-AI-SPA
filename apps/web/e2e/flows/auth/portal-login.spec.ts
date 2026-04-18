import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const SUPERADMIN_URL = 'http://localhost:3001';

test.describe('Role Portal Login Flow', () => {
  test('Multi-role user should be redirected to Portal', async ({ page }) => {
    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;
    test.skip(!email || !password, 'Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD in apps/web/.env.local');

    // 1. Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // 2. Expect redirect to Portal
    await page.waitForURL(/\/portal/);
    await expect(page.getByText('歡迎回來')).toBeVisible();
    await expect(page.getByText('請選擇您要進入的身分工作區')).toBeVisible();

    // 3. Check for Role Cards
    await expect(page.getByText('超級管理員 (Super Admin)')).toBeVisible();
    await expect(page.getByText('房東 (Landlord)')).toBeVisible();

    // 4. Test Landlord Redirect
    // Since clicking might navigate away, we can check href or click and wait
    // Let's click Landlord
    await page.getByText('房東 (Landlord)').click();
    await page.waitForURL(/\/landlord\/dashboard/);
    await expect(page.url()).toContain(`${BASE_URL}/landlord/dashboard`);
  });

  test('Portal should allow navigation to Super Admin (Port 3001)', async ({ page }) => {
    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;
    test.skip(!email || !password, 'Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD in apps/web/.env.local');

    // 1. Login directly to Portal (if session persists) or login again
    // Playwright creates new context per test, so login again
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/portal/);

    // 2. Click Super Admin
    // Note: This is an external navigation to port 3001
    await page.getByText('超級管理員 (Super Admin)').click();
    
    // 3. Wait for URL to change to port 3001
    // We increase timeout because starting/loading the other app might take a moment
    await page.waitForURL(/localhost:3001\/superadmin\/dashboard/, { timeout: 10000 });
    expect(page.url()).toContain('localhost:3001/superadmin/dashboard');
  });
});
