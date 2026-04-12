import { test } from '@playwright/test';

const resolutions = [
  { width: 1920, height: 1080, name: 'desktop-1080p' },
  { width: 1366, height: 768, name: 'laptop' },
  { width: 375, height: 812, name: 'mobile' },
];

test('Generate screenshots for Superadmin Login', async ({ page }) => {
  for (const res of resolutions) {
    await page.setViewportSize({ width: res.width, height: res.height });
    await page.goto('http://localhost:3001/login');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `apps/superadmin/e2e/screenshots/login-${res.name}.png`, fullPage: true });
  }
});
