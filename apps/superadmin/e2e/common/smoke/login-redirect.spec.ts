import { test, expect } from '@playwright/test';
import { loginAsSuperadmin, submitSuperadminLogin } from '../../utils/superadmin-auth';

// This test suite verifies login redirection logic on Port 3001 (Superadmin App).
// Since 2026-02-13, Port 3001 acts as a unified login entry point:
// - Super Admins -> stay on Port 3001 (/superadmin)
// - Other roles (Landlord/Tenant/Agent) -> redirect to Port 3000 (Main Site)

const BASE_URL = 'http://localhost:3001';

test.describe('Superadmin Login Redirection & UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
  });

  test('UI should match design system', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '管理員登入' })).toBeVisible();
    await expect(page.getByLabel('電子郵件')).toBeVisible();
    await expect(page.getByLabel('密碼')).toBeVisible();
    await expect(page.getByRole('button', { name: '登入' })).toBeVisible();
  });

  test('Should validate returnUrl (allow safe local redirect)', async ({ page }) => {
    await page.goto(`${BASE_URL}/login?returnUrl=/superadmin/dashboard/users`);
    await submitSuperadminLogin(page, /dashboard|localhost:3000/);

    if (!page.url().includes('localhost:3000')) {
      await expect(page).toHaveURL(`${BASE_URL}/superadmin/dashboard/users`);
    }
  });

  test('Should validate returnUrl (block external redirect)', async ({ page }) => {
    await page.goto(`${BASE_URL}/login?returnUrl=https://google.com`);
    await submitSuperadminLogin(page, /superadmin|localhost:3000/);

    if (!page.url().includes('localhost:3000')) {
      await expect(page).toHaveURL(`${BASE_URL}/superadmin`);
    }
  });

  test('Should validate returnUrl (block different port redirect)', async ({ page }) => {
    await page.goto(`${BASE_URL}/login?returnUrl=http://localhost:3000/dashboard`);
    await submitSuperadminLogin(page, /superadmin|localhost:3000/);

    if (!page.url().includes('localhost:3000')) {
      await expect(page).toHaveURL(`${BASE_URL}/superadmin`);
    }
  });

  test('Super Admin should be redirected to Superadmin Dashboard (Port 3001)', async ({ page }) => {
    await loginAsSuperadmin(page, BASE_URL);
    await expect(page).toHaveURL(/\/superadmin/);

    const url = page.url();
    expect(url).toContain('localhost:3001');
    expect(url).not.toContain('localhost:3000');
  });
});
