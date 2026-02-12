import { test, expect } from '@playwright/test';

test.describe('Theme Toggle', () => {
  test('should toggle theme and persist preference', async ({ page }) => {
    // 1. Navigate to the dashboard
    await page.goto('/superadmin');
    
    // Ensure the header is loaded
    await expect(page.getByText('Owner AI')).toBeVisible();

    // 2. Check initial state (assuming default is light or system default)
    // We check the 'dark' class on the html element
    const html = page.locator('html');
    
    // Get the toggle button
    const toggleButton = page.getByTestId('theme-toggle');
    await expect(toggleButton).toBeVisible();

    // 3. Toggle to Dark Mode (or opposite of current)
    // First, let's see what current state is.
    const isDarkInitially = await html.evaluate((el) => el.classList.contains('dark'));
    
    await toggleButton.click();
    
    // 4. Verify class changed
    const isDarkAfterClick = await html.evaluate((el) => el.classList.contains('dark'));
    expect(isDarkAfterClick).toBe(!isDarkInitially);
    
    // 5. Reload page to test persistence
    await page.reload();
    
    // 6. Verify class persists
    await expect(page.getByText('Owner AI')).toBeVisible(); // Wait for hydration
    const isDarkAfterReload = await html.evaluate((el) => el.classList.contains('dark'));
    expect(isDarkAfterReload).toBe(isDarkAfterClick);
    
    // 7. Toggle back
    await toggleButton.click();
    const isDarkFinal = await html.evaluate((el) => el.classList.contains('dark'));
    expect(isDarkFinal).toBe(isDarkInitially);
  });
});
