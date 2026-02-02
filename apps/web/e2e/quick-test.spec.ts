import { test, expect } from '@playwright/test';

test('Quick Registration Test', async ({ page }) => {
  const testEmail = `test-${Date.now()}@example.com`;

  console.log('📝 Testing registration flow...');

  await page.goto('http://localhost:3000/register');
  await page.waitForLoadState('networkidle');

  await page.fill('input[name="fullName"]', 'Test User');
  await page.fill('input[name="email"]', testEmail);
  await page.fill('input[name="password"]', 'TestPassword123!');
  await page.fill('input[name="confirmPassword"]', 'TestPassword123!');

  const termsCheckbox = page.locator('input[type="checkbox"]');
  await termsCheckbox.check();

  await page.click('button[type="submit"]');

  await expect(page.locator('text=/註冊成功|成功|success/i').first()).toBeVisible({
    timeout: 5000,
  });
  console.log('✅ Registration successful!');

  await page.waitForURL('**/login', { timeout: 5000 });
  console.log('✅ Redirected to login page after 3 seconds!');

  console.log('\n🎉 Registration flow is working correctly!');
});
