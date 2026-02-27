import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

test.describe('IAM Management Page', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Go to login page
    await page.goto(`${BASE_URL}/login`);
    
    // 2. Perform Login
    await page.fill('input[type="email"]', 'a0405142777@gmail.com');
    await page.fill('input[type="password"]', 'NewPassword123!');
    await page.click('button[type="submit"]');
    
    // 3. Wait for redirect to dashboard
    await page.waitForURL(/\/superadmin/);
    
    // 4. Navigate to the IAM Management page
    await page.goto(`${BASE_URL}/superadmin/dashboard/iam-management`);
  });

  test('should render the page title', async ({ page }) => {
    // Check Title
    await expect(page.getByText('權限快照 IAM Management')).toBeVisible();
  });

  test('should display audit logs table', async ({ page }) => {
    // Wait for data to load
    await expect(page.getByRole('table')).toBeVisible();
    
    // Check table headers
    await expect(page.getByRole('columnheader', { name: '時間戳記' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '操作者' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '類型' })).toBeVisible();
    
    // Check if rows exist (assuming mock data is returned)
    // We wait for the loading state to disappear
    await expect(page.getByText('載入中...')).not.toBeVisible();
    // Assuming at least one row from mock data
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThan(0);
  });

  test('should have CSV export button', async ({ page }) => {
    await expect(page.getByRole('button', { name: '匯出 CSV' })).toBeVisible();
  });
});
