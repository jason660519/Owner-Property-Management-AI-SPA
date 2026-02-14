import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

test.describe('Profile Page Content', () => {
  test.beforeEach(async ({ page }) => {
    // Login as super admin
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'a0405142777@gmail.com');
    await page.fill('input[type="password"]', 'NewPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/superadmin/);
    
    // Navigate to profile page
    await page.goto(`${BASE_URL}/profile`);
  });

  test('Should display correct profile information', async ({ page }) => {
    // Check page title
    await expect(page.getByRole('heading', { name: '個人檔案' })).toBeVisible();

    // Check display name (from DB: 測試用戶)
    await expect(page.getByText('測試用戶')).toBeVisible();

    // Check roles (badges)
    // Use .first() or more specific selector since "超級管理員" appears in both badge and primary role section
    await expect(page.locator('.bg-purple-600').getByText('超級管理員')).toBeVisible();
    await expect(page.getByText('房東')).toBeVisible();

    // Check contact info
    await expect(page.getByText('a0405142777@gmail.com')).toBeVisible();
    await expect(page.getByText('+61 0405142777')).toBeVisible();
    await expect(page.getByText('Sydney, Australia')).toBeVisible();

    // Check primary role in security section
    await expect(page.getByText('主要角色：超級管理員')).toBeVisible();
  });
});
