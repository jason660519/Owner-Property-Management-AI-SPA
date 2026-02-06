import { test } from '@playwright/test';

test('Create test account for manual testing', async ({ page }) => {
  console.log('📝 Creating test account...');

  await page.goto('http://localhost:3000/register');
  await page.waitForLoadState('networkidle');

  await page.fill('input[name="fullName"]', 'Jason Test');
  await page.fill('input[name="email"]', 'jason.test@example.com');
  await page.fill('input[name="password"]', 'Test1234!');
  await page.fill('input[name="confirmPassword"]', 'Test1234!');

  const termsCheckbox = page.locator('input[type="checkbox"]');
  await termsCheckbox.check();

  await page.click('button[type="submit"]');

  await page.waitForTimeout(4000);

  console.log('✅ Test account created successfully!');
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('📧 Email: jason.test@example.com');
  console.log('🔑 Password: Test1234!');
  console.log('═══════════════════════════════════════');
});
