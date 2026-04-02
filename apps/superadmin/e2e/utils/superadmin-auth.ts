import { test, type Page } from '@playwright/test';

export const SUPERADMIN_EMAIL = process.env.PLAYWRIGHT_SUPERADMIN_EMAIL ?? null;
export const SUPERADMIN_PASSWORD = process.env.PLAYWRIGHT_SUPERADMIN_PASSWORD ?? null;

function requireSuperadminCredentials() {
  test.skip(!SUPERADMIN_EMAIL || !SUPERADMIN_PASSWORD, 'Missing PLAYWRIGHT_SUPERADMIN_EMAIL or PLAYWRIGHT_SUPERADMIN_PASSWORD');

  return {
    email: SUPERADMIN_EMAIL as string,
    password: SUPERADMIN_PASSWORD as string,
  };
}

export async function submitSuperadminLogin(page: Page, successMatcher: RegExp = /\/superadmin/) {
  const { email, password } = requireSuperadminCredentials();

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  await Promise.race([
    page.waitForURL(successMatcher),
    page.getByRole('alert').filter({ hasText: 'Invalid login credentials' }).waitFor(),
  ]);

  if (page.url().includes('/login')) {
    throw new Error('Superadmin Playwright credentials are invalid. Update PLAYWRIGHT_SUPERADMIN_EMAIL / PLAYWRIGHT_SUPERADMIN_PASSWORD.');
  }
}

export async function loginAsSuperadmin(page: Page, baseUrl: string, successMatcher: RegExp = /\/superadmin/) {
  await page.goto(`${baseUrl}/login`);
  await submitSuperadminLogin(page, successMatcher);
}