import { test, expect } from '@playwright/test';
import { SUPERADMIN_EMAIL, loginAsSuperadmin } from './utils/superadmin-auth';

const BASE_URL = 'http://localhost:3001';

test.describe('Profile Page Content', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperadmin(page, BASE_URL);
    await page.goto(`${BASE_URL}/profile`);
  });

  test('Should display correct profile information', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '個人檔案' })).toBeVisible();
    await expect(page.getByText('超級管理員')).toBeVisible();
    await expect(page.getByText(SUPERADMIN_EMAIL ?? '')).toBeVisible();
    await expect(page.getByText('主要角色：超級管理員')).toBeVisible();
  });
});
