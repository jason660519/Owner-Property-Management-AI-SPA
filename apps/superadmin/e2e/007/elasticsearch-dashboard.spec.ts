import { test, expect } from '@playwright/test';
import { loginAsSuperadmin } from '../utils/superadmin-auth';

const BASE_URL = 'http://localhost:3001';
const ES_URL = `${BASE_URL}/superadmin/dashboard/elasticsearch`;

test.describe('Superadmin – Elasticsearch 管理中心', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperadmin(page, BASE_URL);
  });

  test('can navigate to the Elasticsearch dashboard via sidebar', async ({ page }) => {
    await page.goto(`${BASE_URL}/superadmin`);

    // Sidebar link should exist
    await page.getByRole('link', { name: 'Elasticsearch' }).click();
    await page.waitForURL(`**/elasticsearch`);

    await expect(page.getByRole('heading', { name: 'Elasticsearch 管理中心' })).toBeVisible();
  });

  test('dashboard renders cluster health and index stats sections', async ({ page }) => {
    await page.goto(ES_URL);

    await expect(page.getByText('叢集健康狀態')).toBeVisible();
    await expect(page.getByText('索引統計')).toBeVisible();
    await expect(page.getByText('中文搜尋測試')).toBeVisible();
  });

  test('shows connection error state gracefully when ES is offline', async ({ page }) => {
    // Intercept API calls and simulate offline state
    await page.route('**/api/elasticsearch?action=health', (route) =>
      route.fulfill({ status: 503, body: JSON.stringify({ error: 'Service unavailable' }) })
    );
    await page.route('**/api/elasticsearch?action=stats', (route) =>
      route.fulfill({ status: 503, body: JSON.stringify({ error: 'Service unavailable' }) })
    );

    await page.goto(ES_URL);

    await expect(page.getByText('無法連線至 Elasticsearch')).toBeVisible();
  });

  test('displays green health status when ES is healthy', async ({ page }) => {
    await page.route('**/api/elasticsearch?action=health', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'green',
          number_of_nodes: 1,
          active_primary_shards: 5,
          active_shards: 5,
        }),
      })
    );
    await page.route('**/api/elasticsearch?action=stats', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          index_name: 'property_documents',
          doc_count: 42,
          store_size_in_bytes: 2097152,
        }),
      })
    );

    await page.goto(ES_URL);

    await expect(page.getByText('GREEN')).toBeVisible();
    await expect(page.getByText('42')).toBeVisible();
  });

  test('search input triggers a search request and shows results', async ({ page }) => {
    await page.route('**/api/elasticsearch?action=health', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'green', number_of_nodes: 1, active_primary_shards: 5, active_shards: 5 }),
      })
    );
    await page.route('**/api/elasticsearch?action=stats', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ index_name: 'property_documents', doc_count: 1, store_size_in_bytes: 1024 }),
      })
    );
    await page.route('**/api/elasticsearch?action=search**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            {
              document_id: 'doc-1',
              owner_name: '王小明',
              property_address: '台北市信義區松仁路100號',
              score: 0.95,
              highlight: {},
            },
          ],
        }),
      })
    );

    await page.goto(ES_URL);

    const searchInput = page.getByPlaceholder(/輸入屋主姓名/);
    await searchInput.fill('王小明');
    await page.getByRole('button', { name: '搜尋' }).click();

    await expect(page.getByText('王小明')).toBeVisible();
    await expect(page.getByText(/台北市信義區/)).toBeVisible();
    // Ensure no raw HTML tags appear in the rendered output
    await expect(page.locator('em')).toHaveCount(0);
  });

  test('Enter key triggers search', async ({ page }) => {
    await page.route('**/api/elasticsearch**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: [], status: 'green', number_of_nodes: 1,
          active_primary_shards: 0, active_shards: 0, index_name: 'property_documents',
          doc_count: 0, store_size_in_bytes: 0 }),
      })
    );

    await page.goto(ES_URL);

    const searchInput = page.getByPlaceholder(/輸入屋主姓名/);
    await searchInput.fill('台北市');
    await searchInput.press('Enter');

    await expect(page.getByText('找不到符合的結果')).toBeVisible();
  });

  test('reindex button triggers POST request and shows confirmation message', async ({ page }) => {
    await page.route('**/api/elasticsearch?action=health', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'green', number_of_nodes: 1, active_primary_shards: 5, active_shards: 5 }),
      })
    );
    await page.route('**/api/elasticsearch?action=stats', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ index_name: 'property_documents', doc_count: 0, store_size_in_bytes: 0 }),
      })
    );
    await page.route('**/api/elasticsearch?action=reindex', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'reindex started' }),
      })
    );

    await page.goto(ES_URL);

    // Handle the confirm() dialog
    page.on('dialog', (dialog) => dialog.accept());

    await page.getByRole('button', { name: '重建索引' }).click();

    await expect(page.getByText('已觸發重建索引排程')).toBeVisible();
  });

  test('refresh button re-fetches data', async ({ page }) => {
    let callCount = 0;
    await page.route('**/api/elasticsearch?action=health', (route) => {
      callCount++;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'green', number_of_nodes: callCount, active_primary_shards: 5, active_shards: 5 }),
      });
    });
    await page.route('**/api/elasticsearch?action=stats', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ index_name: 'property_documents', doc_count: 0, store_size_in_bytes: 0 }),
      })
    );

    await page.goto(ES_URL);
    await expect(page.getByText('GREEN')).toBeVisible();

    await page.getByRole('button', { name: '重新整理' }).click();

    // Should have fetched health at least twice (initial + refresh)
    await expect(page.getByText('GREEN')).toBeVisible();
    expect(callCount).toBeGreaterThanOrEqual(2);
  });
});
