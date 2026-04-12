import { test, expect } from '@playwright/test';
import { loginAsSuperadmin } from '../utils/superadmin-auth';

const BASE_URL = 'http://localhost:3001';
const PEOPLE_DB_URL = `${BASE_URL}/superadmin/settings/people-database`;
const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL ?? 'http://127.0.0.1:9200';

test.describe('People DB single-page workspace (ID 131)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperadmin(page, BASE_URL);
  });

  test('switches import/search tabs and must hit seeded fixture via real API', async ({ page, request }) => {
    const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const fixtureRecordId = `e2e-people-db-${nonce}`;
    const fixtureIdNumber = `A${String(Date.now()).slice(-9)}`;
    const fixtureDoc = {
      // fixture values are based on real Taipei village chiefs sample shape
      record_id: fixtureRecordId,
      name: '闕貴卿',
      id_number: fixtureIdNumber,
      phone: '27851310',
      address: '研究院路一段101巷25號',
      organization: '南港里辦公處',
      data_source: '台北市里長樣本',
      quality_score: 0.92,
      ocr_confidence: 0.96,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const seedResponse = await request.put(
      `${ELASTICSEARCH_URL}/people_database/_doc/${fixtureRecordId}?refresh=wait_for`,
      {
        data: fixtureDoc,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    expect(seedResponse.ok()).toBeTruthy();

    try {
      await page.goto(PEOPLE_DB_URL);

    await expect(page.getByRole('heading', { name: '尋人資料庫' })).toBeVisible();
    await expect(page.getByRole('button', { name: '匯入資料' })).toBeVisible();
    await expect(page.getByRole('button', { name: '搜尋資料' })).toBeVisible();

    // default tab = import workspace
    await expect(page.getByText('匯入人員資料')).toBeVisible();

    await page.getByRole('button', { name: '搜尋資料' }).click();
    await expect(page.getByRole('heading', { name: '搜尋人員資料庫' })).toBeVisible();

    const searchInput = page.getByPlaceholder('輸入姓名、電話、身分證字號…');
    await searchInput.fill(fixtureIdNumber);
    await page.getByRole('button', { name: '搜尋' }).click();

      await expect(page.getByText('搜尋結果')).toBeVisible();
      await expect(page.getByText(fixtureIdNumber)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('台北市里長樣本')).toBeVisible({ timeout: 10000 });
    } finally {
      await request.delete(
        `${ELASTICSEARCH_URL}/people_database/_doc/${fixtureRecordId}?refresh=wait_for`
      );
    }
  });
});
