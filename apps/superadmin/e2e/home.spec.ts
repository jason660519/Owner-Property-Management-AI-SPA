import { test, expect } from '@playwright/test';

test.describe('Superadmin Home Page', () => {
  test('should render sidebar and dashboard content', async ({ page }) => {
    await page.goto('/superadmin');

    // Check Sidebar
    await expect(page.getByText('RESA Admin')).toBeVisible();
    await expect(page.getByText('總覽')).toBeVisible();
    await expect(page.getByText('用戶管理')).toBeVisible();

    // Check Dashboard Content
    await expect(page.getByText('超級管理員儀表板')).toBeVisible();
    
    // Check Stats Cards (first card: IAM用戶群組概覽 with 總用戶/活躍用戶/在線用戶數, etc.)
    await expect(page.getByText('IAM用戶群組概覽')).toBeVisible();
    await expect(page.getByText('總用戶/活躍用戶/在線用戶數')).toBeVisible();
    await expect(page.getByText('物件與部落格概覽')).toBeVisible();
    await expect(page.getByText('總物件數（含有效與無效）')).toBeVisible();
    await expect(page.getByText('出售物件概覽')).toBeVisible();
    await expect(page.getByText('出租物件概覽')).toBeVisible();
  });

  test('should navigate to users page', async ({ page }) => {
    await page.goto('/superadmin');
    await page.getByRole('link', { name: '用戶管理' }).click();
    await expect(page).toHaveURL(/\/superadmin\/users/);
    await expect(page.getByText('User Management')).toBeVisible();
  });
});
