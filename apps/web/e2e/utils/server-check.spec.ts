
import { test, expect } from '@playwright/test';

test('verify server accessibility and dev-status page', async ({ page }) => {
  console.log('Navigating to home page...');
  try {
    const homeResponse = await page.goto('/', { timeout: 10000 });
    console.log(`Home page status: ${homeResponse?.status()}`);
    expect(homeResponse?.status()).toBe(200);
  } catch (e) {
    console.error('Failed to load home page:', e);
    throw e;
  }

  console.log('Navigating to dev-status page...');
  try {
    const statusResponse = await page.goto('/dev-status', { timeout: 10000 });
    console.log(`Dev-status page status: ${statusResponse?.status()}`);
    expect(statusResponse?.status()).toBe(200);
    
    // Check for key elements
    await expect(page.getByText('專案開發進度儀表板')).toBeVisible();
    console.log('Dev-status page loaded successfully');
  } catch (e) {
    console.error('Failed to load dev-status page:', e);
    // Take screenshot on failure
    await page.screenshot({ path: 'server-check-failure.png' });
    throw e;
  }
});
