import { test, expect } from '@playwright/test';

test('Test login with a0405142777@gmail.com', async ({ page }) => {
  console.log('🔐 Testing login...');

  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');

  await page.fill('input[name="email"]', 'a0405142777@gmail.com');
  await page.fill('input[name="password"]', 'NewPassword123!');

  await page.click('button[type="submit"]');

  // Wait and capture any error messages or success
  await page.waitForTimeout(3000);

  // Take screenshot
  await page.screenshot({ path: '/tmp/login-test.png' });

  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);

  // Check for error messages
  const errorText = await page.locator('body').textContent();

  if (
    errorText?.includes('無法取得') ||
    errorText?.includes('錯誤') ||
    errorText?.includes('失敗')
  ) {
    console.log('❌ Login failed with error');
    console.log('Error message found on page');
  } else if (currentUrl.includes('dashboard')) {
    console.log('✅ Login successful! Redirected to dashboard');
  } else {
    console.log('⚠️ Still on login page');
  }

  console.log('\n頁面內容片段:');
  console.log(errorText?.substring(0, 500));
});
