import { test, expect } from '@playwright/test';
import { loginAsSuperadmin } from './utils/superadmin-auth';

test.describe('Theme Toggle', () => {
  test('should switch between light and dark themes and persist preference', async ({ page }) => {
    await loginAsSuperadmin(page, 'http://localhost:3001');
    
    await page.goto('/superadmin/dashboard');
    
    // Ensure the header is loaded
    await expect(page.getByText('Owner AI')).toBeVisible();

    const html = page.locator('html');
    
    // 4. Test Light Mode
    // Target the button with title "Light Mode"
    const lightButton = page.getByTitle('Light Mode').first();
    await expect(lightButton).toBeVisible();
    await lightButton.click();
    await expect(html).not.toHaveClass(/dark/);
    
    // 5. Test Dark Mode
    const darkButton = page.getByTitle('Dark Mode').first();
    await expect(darkButton).toBeVisible();
    await darkButton.click();
    await expect(html).toHaveClass(/dark/);
    
    // 6. Reload and verify persistence
    await page.reload();
    await expect(html).toHaveClass(/dark/);
  });
});
