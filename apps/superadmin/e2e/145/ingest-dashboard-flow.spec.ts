import { test, expect } from '@playwright/test';
import { loginAsSuperadmin } from '../utils/superadmin-auth';

// Row 145 Sprint 6 — Ingestion monitoring dashboard smoke.
//
// Goal: confirm the new /ingest page is reachable and its three panels
// (stage counts, failed files, runs timeline) render without JS errors.
// This spec does NOT run the orchestrator against real fixtures — full
// happy-path (run orchestrator → monitor numbers move → retry a failed
// file) is gated on a seeded dataset and is deferred to Sprint 7.
//
// Passing criteria:
//   1. Page loads under superadmin auth.
//   2. "各階段檔案數" heading is visible (stage cards section).
//   3. Sidebar nav entry "尋人資料庫 — Ingestion 監控" is discoverable.

const BASE_URL = 'http://localhost:3001';
const INGEST_URL = `${BASE_URL}/superadmin/settings/people-database/ingest`;

test.describe('Row 145 — Ingestion monitoring dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperadmin(page, BASE_URL);
  });

  test('page loads and renders the three monitoring panels', async ({ page }) => {
    await page.goto(INGEST_URL);

    await expect(page.getByRole('heading', { name: 'Ingestion 監控' })).toBeVisible({
      timeout: 10_000,
    });

    // Section headings for the three panels
    await expect(page.getByRole('heading', { name: '各階段檔案數' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /失敗檔案/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: '最近執行記錄' })).toBeVisible();

    // At least the pending stage card should appear regardless of data
    await expect(page.getByTestId('stage-count-pending')).toBeVisible();
  });

  test('sidebar nav has an entry that links to the ingest dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/superadmin`);
    const link = page.locator('a[href*="/people-database/ingest"]').first();
    await expect(link).toHaveCount(1);
  });
});
