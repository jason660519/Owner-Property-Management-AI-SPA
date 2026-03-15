import { test, expect } from '@playwright/test';

test('Debug Login Failure', async ({ page }) => {
  const email = 'a0405142777@gmail.com';
  const password = '!qaz2wsX';

  // 1. Go to login page
  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');

  // 2. Fill form
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);

  // 3. Click submit and capture state
  console.log('Clicking login button...');
  await page.click('button[type="submit"]');

  // 4. Wait for potential error messages or navigation
  try {
    // Check if there's any alert or error text
    await page.waitForTimeout(2000);
    const errorText = await page.evaluate(() => {
      // Look for common error message patterns in the UI
      const bodyText = document.body.innerText;
      return bodyText.includes('失敗') || bodyText.includes('錯誤') || bodyText.includes('Invalid') 
        ? bodyText : 'No error text visible on screen';
    });
    console.log('UI Error Text Detection:', errorText);
    
    // Check network requests for failed auth
    page.on('response', response => {
      if (response.url().includes('auth/v1/token') && response.status() !== 200) {
        console.log(`Auth request failed: ${response.status()} ${response.statusText()}`);
      }
    });

    await page.waitForURL(/\/portal(\/)?$/, { timeout: 5000 });
    console.log('Login successful in Playwright!');
  } catch (e) {
    console.log('Login timed out or failed in Playwright.');
    await page.screenshot({ path: 'login-debug-error.png', fullPage: true });
    
    // Check for validation errors on inputs
    const emailError = await page.getAttribute('input[name="email"]', 'aria-invalid');
    const passwordError = await page.getAttribute('input[name="password"]', 'aria-invalid');
    console.log(`Validation - Email: ${emailError}, Password: ${passwordError}`);
  }
});
