import { test, expect } from '@playwright/test';
import { loginAsSuperadmin } from '../utils/superadmin-auth';

const BASE_URL = 'http://localhost:3001';
const PEOPLE_DB_URL = `${BASE_URL}/superadmin/settings/people-database`;
const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL ?? 'http://127.0.0.1:9200';

test.describe('ID132 people-db acceptance paths', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperadmin(page, BASE_URL);
  });

  test('exact-match + dataset filter + source traceability', async ({ page, request }) => {
    test.setTimeout(60000);

    const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const exactRecordId = `id132-exact-${nonce}`;
    const otherDatasetRecordId = `id132-other-${nonce}`;
    const exactDataset = `台北市里長樣本-${nonce}`;
    const otherDataset = `企業名錄樣本-${nonce}`;
    const exactName = `ID132測試甲-${nonce}`;
    const otherName = `ID132測試乙-${nonce}`;
    const targetPhone = '27851310';

    const exactDoc = {
      record_id: exactRecordId,
      name: exactName,
      id_number: `A${String(Date.now()).slice(-9)}`,
      phone: targetPhone,
      address: '重陽路504巷弄9號',
      company: '南港里辦公處',
      data_source: exactDataset,
      quality_score: 0.93,
      ocr_confidence: 0.98,
      import_batch_id: `batch-${nonce}`,
      source_file_path: `resources/samples/台北市里長/${nonce}.pdf`,
      source_document_id: `doc-${nonce}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const otherDatasetDoc = {
      record_id: otherDatasetRecordId,
      name: otherName,
      id_number: `B${String(Date.now()).slice(-9)}`,
      phone: targetPhone,
      address: '台北市信義區',
      company: '企業名錄',
      data_source: otherDataset,
      quality_score: 0.62,
      ocr_confidence: 0.9,
      import_batch_id: `batch2-${nonce}`,
      source_file_path: `resources/samples/企業名錄/${nonce}.csv`,
      source_document_id: `doc2-${nonce}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const seedExact = await request.put(
      `${ELASTICSEARCH_URL}/people_database/_doc/${exactRecordId}?refresh=wait_for`,
      {
        data: exactDoc,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    const seedOther = await request.put(
      `${ELASTICSEARCH_URL}/people_database/_doc/${otherDatasetRecordId}?refresh=wait_for`,
      {
        data: otherDatasetDoc,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    expect(seedExact.ok()).toBeTruthy();
    expect(seedOther.ok()).toBeTruthy();

    try {
      await page.goto(PEOPLE_DB_URL);
      await page.getByRole('button', { name: '搜尋資料' }).click();

      const searchInput = page.getByPlaceholder('輸入姓名、電話、身分證字號…');
      await searchInput.fill(targetPhone);
      await page.getByRole('button', { name: '搜尋', exact: true }).click();

      // exact-match path: both seeded records share phone and are searchable
      await expect(page.getByText(exactName)).toBeVisible({ timeout: 20000 });
      await expect(page.getByText(otherName)).toBeVisible({ timeout: 20000 });
      // source traceability path
      await expect(page.getByText(exactDataset)).toBeVisible({ timeout: 20000 });
      await expect(page.getByText(otherDataset)).toBeVisible({ timeout: 20000 });

      // dataset multi-select path
      await page.getByRole('button', { name: '篩選' }).click();
      await page.getByRole('button', { name: '清空' }).click();
      const exactDatasetLabel = page.locator('label', { hasText: exactDataset });
      await exactDatasetLabel.locator('input[type="checkbox"]').check();
      await page.getByRole('button', { name: '搜尋', exact: true }).click();

      await expect(page.getByText(exactName)).toBeVisible({ timeout: 20000 });
      await expect(page.getByText(otherName)).toHaveCount(0);
    } finally {
      try {
        await request.delete(`${ELASTICSEARCH_URL}/people_database/_doc/${exactRecordId}?refresh=wait_for`);
      } catch {}
      try {
        await request.delete(`${ELASTICSEARCH_URL}/people_database/_doc/${otherDatasetRecordId}?refresh=wait_for`);
      } catch {}
    }
  });

  test('import history visualization panel', async ({ page }) => {
    const nonce = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const mockBatchLabel = `ID132匯入批次-${nonce}`;

    await page.route('**/api/people-db/import/batches?limit=8', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          batches: [
            {
              batch_id: `batch-${nonce}`,
              label: mockBatchLabel,
              data_source: '台北市里長樣本',
              status: 'completed',
              total_records: 320,
              processed_records: 320,
              skipped_records: 0,
              imported_by: '00000000-0000-0000-0000-000000000132',
              created_at: '2026-04-13T12:00:00Z',
              updated_at: '2026-04-13T12:30:00Z',
              error_message: null,
            },
          ],
        }),
      });
    });

    await page.goto(PEOPLE_DB_URL);
    await page.getByRole('button', { name: '搜尋資料' }).click();

    await expect(page.getByRole('heading', { name: '最近匯入批次' })).toBeVisible();
    await expect(page.getByText(mockBatchLabel)).toBeVisible();
    await expect(page.getByText('320/320')).toBeVisible();
    await expect(page.getByText('台北市里長樣本')).toBeVisible();
  });
});
