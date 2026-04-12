import { test, expect } from '@playwright/test';
import { loginAsSuperadmin } from '../../utils/superadmin-auth';

const BASE_URL = 'http://localhost:3001';

test.describe('Superadmin Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperadmin(page, BASE_URL);
  });

  test('should render sidebar and system overview', async ({ page }) => {
    await page.goto(`${BASE_URL}/superadmin`);

    // Check Sidebar
    await expect(page.getByText('RESA Admin')).toBeVisible();
    await expect(page.getByText('總覽')).toBeVisible();
    await expect(page.getByText('用戶管理')).toBeVisible();

    // Check Dashboard Content
    await expect(page.getByText('系統概覽')).toBeVisible();

    // Check Stats Cards (first card: IAM用戶群組概覽 with 總用戶/活躍用戶/在線用戶數, etc.)
    await expect(page.getByText('IAM用戶群組概覽')).toBeVisible();
    await expect(page.getByText('總用戶/活躍用戶/在線用戶數')).toBeVisible();
    await expect(page.getByText('物件與部落格概覽')).toBeVisible();
    await expect(page.getByText('總物件數（含有效與無效）')).toBeVisible();
    await expect(page.getByText('出售物件概覽')).toBeVisible();
    await expect(page.getByText('出租物件概覽')).toBeVisible();
  });

  test('should navigate to users page', async ({ page }) => {
    await page.goto(`${BASE_URL}/superadmin`);
    await page.getByRole('link', { name: '用戶管理' }).click();
    await expect(page).toHaveURL(/\/superadmin\/users/);
    await expect(page.getByText('User Management')).toBeVisible();
  });
});
