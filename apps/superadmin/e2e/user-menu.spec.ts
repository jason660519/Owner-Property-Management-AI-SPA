import { test, expect } from '@playwright/test';
import { loginAsSuperadmin } from './utils/superadmin-auth';

const BASE_URL = 'http://localhost:3001';

test.describe('Superadmin User Menu', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperadmin(page, BASE_URL);
  });

  test('Should open user menu and navigate to Profile', async ({ page }) => {
    // Open menu
    await page.getByRole('button', { name: 'User menu' }).click();
    
    // Check options
    await expect(page.getByRole('menuitem', { name: 'Profile' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Settings' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Sign out' })).toBeVisible();
    
    // Click Profile
    await page.getByRole('menuitem', { name: 'Profile' }).click();
    
    // Verify URL
    await expect(page).toHaveURL(`${BASE_URL}/profile`);
    await expect(page.getByRole('heading', { name: '個人檔案' })).toBeVisible();
  });

  test('Should navigate to Settings', async ({ page }) => {
    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByRole('menuitem', { name: 'Settings' }).click();
    
    await expect(page).toHaveURL(`${BASE_URL}/superadmin/settings`);
    await expect(page.getByRole('heading', { name: 'LLM AI 服務設定' })).toBeVisible();
  });

  test('Should sign out and redirect to login', async ({ page }) => {
    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });
});
