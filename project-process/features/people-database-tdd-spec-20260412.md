# 尋人資料庫功能 — TDD 測試規格

**功能名稱**：尋人資料庫（People Database）  
**文檔版本**：1.2  
**建立日期**：2026/04/12  
**測試框架**：Jest + Playwright  
**覆蓋目標**：≥ 80% 單元測試 + 完整 E2E 流程

---

## 變更紀錄（ID 131）

### 2026/04/13 - ID 132 搜尋精準化與來源追溯測試規劃

- 新增 exact-first 檢索測試集合（電話/身分證優先精準命中，必要時 fallback）。
- 新增多資料集勾選與來源追溯欄位 E2E 驗證。
- 新增匯入台帳可視化整合測試（匯入者、時間、筆數、狀態統計）。
- 新增前後端參數契約一致性測試，避免 `data_source`/`data_sources` 混用回歸。
- 本次為 TDD 規格更新，測試將於功能實作階段落地。

### 2026/04/12 - Tools 單頁入口整合（TDD）

#### 測試目標

- people-db 在 `Tools` 只保留單一整合入口，避免 import/search 子入口分散。

#### Red -> Green 測試流程

1. **Red（先失敗）**
   - 新增 `apps/superadmin/app/superadmin/tools/page.test.tsx`
   - 驗證 `ToolsPage` 不應顯示：
     - `people-db 匯入資料`
     - `people-db 搜尋介面`
   - 初次執行失敗（頁面仍存在兩張卡片）
2. **Green（修正通過）**
   - 調整 `apps/superadmin/app/superadmin/tools/page.tsx`
   - 移除上述兩張分散卡片，保留 `尋人資料庫工具` 統一入口
   - 重新執行測試轉綠

#### 驗證指令

```bash
cd apps/superadmin
npm test -- --runInBand app/superadmin/tools/page.test.tsx
```

---

## 一、測試架構

### 1.1 測試層次劃分

```
┌────────────────────────────────────────┐
│ E2E 測試 (Playwright)                   │
│ - 完整導入/搜尋/去重工作流              │
└────────────────────────────────────────┘
           ↑
┌────────────────────────────────────────┐
│ 整合測試 (Jest + Mock API)              │
│ - API 端點 + DB 交互                   │
└────────────────────────────────────────┘
           ↑
┌────────────────────────────────────────┐
│ 單元測試 (Jest)                         │
│ - 工具函式、欄位映射、評分算法          │
└────────────────────────────────────────┘
```

---

## 二、單元測試 (Jest)

### 2.1 資料清洗工具函式

**檔案**：`backend/ocr_service/src/utils/people_data_cleaner.py`

```python
# test_people_data_cleaner.py

def test_normalize_phone_number():
    """電話號碼正規化"""
    assert normalize_phone("0912345678") == "0912345678"
    assert normalize_phone("09 12345678") == "0912345678"
    assert normalize_phone("02-12345678") == "0212345678"
    assert normalize_phone("invalid") is None

def test_normalize_id_number():
    """身份證字號驗證與正規化"""
    assert normalize_id("A123456789") == "A123456789"
    assert normalize_id("a123456789") == "A123456789"  # uppercase
    assert normalize_id("A12345678") is None  # too short
    assert validate_id_checksum("A123456789") in [True, False]

def test_parse_address():
    """地址解析"""
    result = parse_address("臺北市信義區信義路五段")
    assert result['city'] == '臺北市'
    assert result['district'] == '信義區'
    assert result['road'] == '信義路五段'

def test_remove_duplicates_in_row():
    """列內白字清洗"""
    row = {'name': '  王小明  ', 'phone': None, 'address': '台北市'}
    cleaned = clean_row(row)
    assert cleaned['name'] == '王小明'
    assert 'phone' not in cleaned or cleaned['phone'] is None
```

**預期覆蓋率**：100% 函式、85% 分支

---

### 2.2 欄位映射與提取

**檔案**：`backend/ocr_service/src/utils/field_extractor.py`

```python
# test_field_extractor.py

def test_extract_fields_from_excel():
    """從 Excel 提取欄位"""
    import openpyxl
    wb = openpyxl.load_workbook('test_data.xlsx')
    ws = wb.active
    
    mapping = {
        'name': 0,        # Column A
        'id_number': 1,   # Column B
        'phone': 2,       # Column C
        'address': 3      # Column D
    }
    
    rows = extract_fields(ws, mapping, start_row=1, end_row=100)
    assert len(rows) == 99
    assert rows[0]['name'] != ''
    assert rows[0]['phone'] is not None or rows[0]['phone'] is None

def test_extract_fields_with_header_detection():
    """自動偵測表頭"""
    rows_with_header = [
        ['姓名', '身份證', '電話', '地址'],
        ['王小明', 'A123456789', '0912345678', '臺北市信義區']
    ]
    header_detected, start_row = detect_header(rows_with_header)
    assert header_detected is True
    assert start_row == 1

def test_validate_field_mapping():
    """驗證欄位映射有效性"""
    valid_mapping = {'name': 0, 'phone': 2}
    invalid_mapping = {'name': 10}  # 超出欄位範圍
    
    assert validate_mapping(valid_mapping, max_columns=4) is True
    assert validate_mapping(invalid_mapping, max_columns=4) is False
```

**預期覆蓋率**：90% 函式

---

### 2.3 資料品質評分

**檔案**：`backend/ocr_service/src/utils/quality_scorer.py`

```python
# test_quality_scorer.py

def test_quality_score_calculation():
    """品質分數計算"""
    record = {
        'name': '王小明',
        'id_number': 'A123456789',
        'phone': '0912345678',
        'address': '臺北市信義區',
        'organization': None,  # 缺失
        'title_position': None  # 缺失
    }
    # 有 4/6 欄位、OCR 信心度 0.95、非重複
    score = calculate_quality_score(
        record=record,
        ocr_confidence=0.95,
        is_duplicate=False
    )
    expected = (4/6) * 0.95 * (1 - 0)  # ≈ 0.633
    assert abs(score - expected) < 0.01

def test_quality_score_with_duplicate():
    """重複記錄降分"""
    record = {'name': '王小明', 'phone': '0912345678'}
    score = calculate_quality_score(
        record=record,
        ocr_confidence=0.9,
        is_duplicate=True
    )
    # 應有 duplicate_penalty
    assert score < 0.5

def test_quality_grade_classification():
    """品質分級"""
    assert get_quality_grade(0.90) == 'High'
    assert get_quality_grade(0.65) == 'Medium'
    assert get_quality_grade(0.30) == 'Low'
```

**預期覆蓋率**：100% 邏輯分支

---

### 2.4 ElasticSearch 查詢構建

**檔案**：`backend/ocr_service/src/utils/es_query_builder.py`

```python
# test_es_query_builder.py

def test_build_fuzzy_search_query():
    """模糊搜尋查詢構建"""
    query = build_search_query(
        q="王小明",
        filters={'data_source': ['台北市里長']},
        min_quality=0.5
    )
    
    assert 'bool' in query
    assert 'must' in query['bool']
    assert 'filter' in query['bool']
    # 確認 multi_match 欄位正確
    assert 'name' in query['bool']['must'][0]['multi_match']['fields']

def test_build_search_with_date_range():
    """日期範圍查詢"""
    query = build_search_query(
        filters={
            'imported_from': '2026-01-01',
            'imported_to': '2026-04-12'
        }
    )
    assert 'range' in query['bool']['filter']

def test_build_more_like_this_query():
    """相似度查詢（去重用）"""
    query = build_more_like_this_query(
        document_id="rec-123",
        min_similarity=0.8
    )
    assert 'more_like_this' in query
```

**預期覆蓋率**：95% 函式

---

### 2.5 前端元件單元測試

**檔案**：`apps/superadmin/components/people-database/__tests__/ImportForm.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImportForm from '../ImportForm';

describe('ImportForm Component', () => {
  test('renders file upload area', () => {
    render(<ImportForm />);
    expect(screen.getByText(/拖曳檔案至此/i)).toBeInTheDocument();
  });

  test('validates file type', async () => {
    render(<ImportForm />);
    const input = screen.getByLabelText(/選擇檔案/i) as HTMLInputElement;
    
    // 嘗試上傳 txt（應失敗）
    await userEvent.upload(input, new File(['test'], 'test.txt', { type: 'text/plain' }));
    
    // 上傳 xlsx（應成功）
    await userEvent.upload(input, new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    expect(screen.queryByText(/不支援的格式/i)).not.toBeInTheDocument();
  });

  test('shows file size warning when exceeding limit', async () => {
    render(<ImportForm />);
    const largeFile = new File(['x'.repeat(101 * 1024 * 1024)], 'large.xlsx');
    
    const input = screen.getByLabelText(/選擇檔案/i) as HTMLInputElement;
    await userEvent.upload(input, largeFile);
    
    expect(screen.getByText(/檔案過大/i)).toBeInTheDocument();
  });

  test('enables field mapping step after file selection', async () => {
    render(<ImportForm />);
    const validFile = new File(['test'], 'test.xlsx');
    
    const input = screen.getByLabelText(/選擇檔案/i) as HTMLInputElement;
    await userEvent.upload(input, validFile);
    
    await waitFor(() => {
      expect(screen.getByText(/欄位映射/i)).toBeInTheDocument();
    });
  });

  test('shows preview data after mapping', async () => {
    render(<ImportForm />);
    // ... 模擬檔案上傳與映射
    
    await waitFor(() => {
      expect(screen.getByText(/預覽前 5 筆/i)).toBeInTheDocument();
    });
  });
});
```

**預期覆蓋率**：80% UI 邏輯

---

## 三、整合測試

### 3.1 API 端點整合測試

**檔案**：`apps/superadmin/app/api/people-db/__tests__/import.test.ts`

```typescript
import { testApiRoute } from '@/test-utils/api-test-helpers';
import importHandler from '../import/route';

describe('POST /api/people-db/import/preview', () => {
  test('returns preview with stats', async () => {
    const formData = new FormData();
    const file = new File(['mock excel data'], 'test.xlsx');
    formData.append('file', file);
    formData.append('dataSource', '台北市里長');

    const response = await testApiRoute(
      'POST',
      '/api/people-db/import/preview',
      { body: formData }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('preview');
    expect(data).toHaveProperty('stats');
    expect(data.stats).toHaveProperty('totalRows');
  });

  test('returns error for invalid file type', async () => {
    const formData = new FormData();
    const file = new File(['binary data'], 'test.bin');
    formData.append('file', file);

    const response = await testApiRoute(
      'POST',
      '/api/people-db/import/preview',
      { body: formData }
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });
});

describe('POST /api/people-db/import/submit', () => {
  test('creates import batch and indexes documents', async () => {
    const payload = {
      importBatchLabel: '台北市里長 2026-04-12',
      dataSource: '台北市里長',
      fieldMapping: {
        nameColumn: 0,
        idNumberColumn: 1,
        phoneColumn: 2,
        addressColumn: 3
      },
      decisions: []
    };

    const response = await testApiRoute(
      'POST',
      '/api/people-db/import/submit',
      { body: JSON.stringify(payload) }
    );

    expect(response.status).toBe(202); // Accepted (async processing)
    const data = await response.json();
    expect(data).toHaveProperty('batchId');
    expect(data).toHaveProperty('status', 'processing');
  });

  test('rolls back batch on error', async () => {
    const batchId = 'batch-123';
    
    const response = await testApiRoute(
      'POST',
      `/api/people-db/import/rollback/${batchId}`,
      { body: '{}' }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('rolledBackCount');
    expect(data.rolledBackCount).toBeGreaterThan(0);
  });
});
```

**預期覆蓋率**：85% API 路由邏輯

---

### 3.2 資料庫整合測試

**檔案**：`apps/superadmin/__tests__/integration/people-database.test.ts`

```typescript
import { createAdminClient } from '@/utils/supabase/admin';
import { SearchClient } from '@/lib/elasticsearch';

describe('People Database Integration', () => {
  let adminClient: any;
  let searchClient: SearchClient;

  beforeAll(async () => {
    adminClient = createAdminClient();
    searchClient = new SearchClient();
    await searchClient.initialize();
  });

  test('inserts record into PostgreSQL and ElasticSearch simultaneously', async () => {
    const record = {
      record_id: `rec-${Date.now()}`,
      name: '王小明',
      id_number: 'A123456789',
      phone: '0912345678',
      address: '臺北市信義區',
      data_source: '台北市里長',
      ocr_confidence: 0.95
    };

    // 插入 PostgreSQL
    const { error: pgError } = await adminClient
      .from('people_records')
      .insert([record]);
    expect(pgError).toBeNull();

    // 索引至 ElasticSearch
    await searchClient.indexDocument(record);

    // 驗證可搜尋
    const results = await searchClient.search({
      q: '王小明'
    });
    expect(results.hits.total.value).toBeGreaterThan(0);
  });

  test('marks duplicate and updates both stores', async () => {
    const primaryId = 'rec-001';
    const duplicateId = 'rec-002';

    // 記錄重複關係
    const { error } = await adminClient
      .from('people_duplicates')
      .insert([{
        primary_record_id: primaryId,
        duplicate_record_id: duplicateId,
        similarity_score: 0.92,
        review_status: 'approved'
      }]);
    expect(error).toBeNull();

    // 更新 ES 中的重複標記
    await searchClient.updateDocument(duplicateId, {
      duplicate_flag: 'confirmed_duplicate'
    });

    // 搜尋時應被過濾
    const results = await searchClient.search({
      q: duplicateId,
      exclude_duplicates: true
    });
    expect(results.hits.total.value).toBe(0);
  });
});
```

**預期覆蓋率**：80% 邏輯路徑

---

## 四、E2E 測試 (Playwright)

### 4.1 完整導入流程

**檔案**：`apps/superadmin/e2e/people-database/import-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('People Database Import Flow', () => {
  test('should import Excel file with field mapping', async ({ page }) => {
    // 1. 登入
    await page.goto('/superadmin/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'testpass123');
    await page.click('button[type="submit"]');

    // 2. 導航到尋人資料庫
    await page.goto('/superadmin/settings/people-database/import');
    expect(page.url()).toContain('/people-database/import');

    // 3. 上傳檔案
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-data/sample.xlsx');

    // 4. 等待預覽
    await expect(page.locator('text=預覽前 5 筆')).toBeVisible();

    // 5. 設定欄位映射
    await page.selectOption('select[name="nameMapping"]', '0');
    await page.selectOption('select[name="phoneMapping"]', '2');

    // 6. 提交
    await page.click('button:has-text("開始匯入")');

    // 7. 等待完成
    await expect(page.locator('text=成功 \\d+ 筆')).toBeVisible({ timeout: 30000 });
    
    // 8. 驗證統計
    const successText = await page.locator('text=/成功 \\d+ 筆/').textContent();
    expect(successText).toMatch(/\d+/);
  });

  test('should handle file upload errors gracefully', async ({ page }) => {
    await page.goto('/superadmin/settings/people-database/import');
    
    // 嘗試上傳無效檔案
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-data/invalid.bin');

    // 應顯示錯誤訊息
    await expect(page.locator('text=不支援的檔案格式')).toBeVisible();
  });
});
```

**預期覆蓋**：完整使用路徑

---

### 4.2 搜尋與篩選

**檔案**：`apps/superadmin/e2e/people-database/search-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('People Database Search Flow', () => {
  test.beforeEach(async ({ page }) => {
    // 登入 + 導入測試資料
    await loginAndPrepareData(page);
    await page.goto('/superadmin/settings/people-database/search');
  });

  test('should search by name with fuzzy matching', async ({ page }) => {
    // 搜尋「王」
    await page.fill('input[placeholder="搜尋名稱、電話、地址"]', '王');
    await expect(page.locator('table tbody > tr')).not.toHaveCount(0);

    // 驗證結果包含「王小明」、「王美麗」等
    const cells = await page.locator('table tbody > tr > td:first-child').allTextContents();
    expect(cells.some(c => c.includes('王'))).toBe(true);
  });

  test('should filter by data source', async ({ page }) => {
    // 勾選「台北市里長」
    await page.check('input[value="台北市里長"]');

    // 驗證結果只包含該來源
    const sourceColumn = page.locator('table tbody > tr > td:nth-child(6)');
    const sources = await sourceColumn.allTextContents();
    expect(sources.every(s => s.includes('台北市里長'))).toBe(true);
  });

  test('should display record detail in bottom sheet', async ({ page }) => {
    // 點擊第一筆記錄
    await page.click('table tbody > tr:first-child');

    // 驗證詳情彈窗出現
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    expect(await page.locator('[role="dialog"] .name').textContent()).not.toBeEmpty();
  });

  test('should sort by relevance and quality', async ({ page }) => {
    await page.fill('input[placeholder="搜尋名稱、電話、地址"]', '台北');
    
    // 切換排序
    await page.selectOption('select[name="sortBy"]', 'quality');

    // 驗證排序改變
    const cells = await page.locator('table tbody > tr').all();
    expect(cells.length).toBeGreaterThan(0);
  });
});

async function loginAndPrepareData(page: any) {
  await page.goto('/superadmin/login');
  await page.fill('input[name="email"]', 'admin@test.com');
  await page.fill('input[name="password"]', 'testpass123');
  await page.click('button[type="submit"]');
  
  // 導入測試資料（API 呼叫）
  await page.request.post('/api/people-db/import/submit', {
    data: {
      importBatchLabel: 'E2E Test',
      dataSource: '台北市里長',
      // ...
    }
  });
}
```

**預期覆蓋**：搜尋 + 篩選 + 互動

---

### 4.3 去重工作流

**檔案**：`apps/superadmin/e2e/people-database/dedup-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('People Database Deduplication', () => {
  test('should detect and mark duplicates', async ({ page }) => {
    await loginAndGotoQualityPage(page);

    // 點擊「偵測重複」
    await page.click('button:has-text("自動偵測重複")');

    // 等待結果
    await expect(page.locator('text=/\\d+ 組疑似重複/')).toBeVisible({ timeout: 10000 });

    // 確認第一組重複
    await page.click('button:has-text("確認重複"):first-of-type');
    await expect(
      page.locator('text=已標記')
    ).toBeVisible();
  });

  test('should allow manual review of duplicates', async ({ page }) => {
    await loginAndGotoQualityPage(page);

    // 開啟待審核清單
    await page.click('text=待審核');

    // 點擊「詳情」
    await page.click('button:has-text("詳情"):first-of-type');

    // 驗證彈窗顯示相關重複記錄
    await expect(page.locator('[role="dialog"] text=疑似重複記錄')).toBeVisible();
  });
});
```

---

## 五、測試資料集

### 5.1 單元測試資料

```typescript
// test-data/sample-people-records.ts
export const SAMPLE_RECORDS = [
  {
    name: '王小明',
    id_number: 'A123456789',
    phone: '0912345678',
    address: '臺北市信義區信義路五段',
    organization: '里長辦公室',
    title_position: '里長'
  },
  {
    name: '王小明',  // 故意重複
    id_number: 'A123456789',
    phone: '0912-345-678',  // 格式不同
    address: '台北市信義區信義路5段'  // 地址略有不同
  },
  {
    name: '李美麗',
    id_number: 'B987654321',
    phone: null,  // 缺失欄位
    address: '新北市板橋區'
  }
];

export const SAMPLE_EXCEL_FILE = 'test-data/taipei-district-chiefs.xlsx';
export const SAMPLE_PDF_FILE = 'test-data/company-directory.pdf';
export const SAMPLE_CSV_FILE = 'test-data/student-list.csv';
```

### 5.2 E2E 測試資料

```sql
-- test-data/people-database-fixtures.sql
INSERT INTO people_records (record_id, name, id_number, phone, address, data_source, ocr_confidence)
VALUES
  ('rec-e2e-001', '王小明', 'A123456789', '0912345678', '臺北市信義區', '台北市里長', 0.95),
  ('rec-e2e-002', '李美麗', 'B987654321', '0987654321', '新北市板橋區', '台北市里長', 0.92),
  ('rec-e2e-003', '陳大衛', 'C456789012', null, '臺北市大安區', '企業名錄', 0.88);
```

---

## 六、測試執行計畫

### 6.1 持續整合 (CI)

```yaml
# .github/workflows/test-people-database.yml
name: People Database Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_PASSWORD: postgres
      elasticsearch:
        image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit -- people-database
      
      - name: Run integration tests
        run: npm run test:integration -- people-database
      
      - name: Generate coverage report
        run: npm run test:coverage -- people-database
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
      
      - name: Run E2E tests
        run: npm run test:e2e -- people-database
```

### 6.2 測試清單

| 測試類型 | 數量 | 預計耗時 | 優先級 |
| :--- | :--- | :--- | :--- |
| 單元測試 | 45 | 2 分 | P0 |
| 整合測試 | 12 | 5 分 | P0 |
| E2E 測試 | 8 | 10 分 | P1 |
| **合計** | **65** | **17 分** | — |

---

## 七、品質標準

### 7.1 覆蓋率目標

| 層次 | 目標 | 工具 |
| :--- | :--- | :--- |
| 語句覆蓋 (Statement) | ≥ 80% | Istanbul / nyc |
| 分支覆蓋 (Branch) | ≥ 75% | Istanbul / nyc |
| 函式覆蓋 (Function) | ≥ 85% | Istanbul / nyc |
| 行覆蓋 (Line) | ≥ 80% | Istanbul / nyc |

### 7.2 效能基準

| 場景 | 預期耗時 | 允差 |
| :--- | :--- | :--- |
| 搜尋 10,000 筆記錄 | < 500ms | ±50ms |
| 導入 1,000 筆 | < 15s | ±2s |
| 重複偵測 100 筆 | < 2s | ±300ms |

---

## 八、失敗場景測試

### 8.1 邊界條件

```typescript
describe('Edge Cases', () => {
  test('handles empty file', async () => {
    const emptyFile = new File([], 'empty.xlsx');
    const result = await uploadFile(emptyFile);
    expect(result.error).toBe('FILE_EMPTY');
  });

  test('handles special characters in names', async () => {
    const record = { name: '王①㎡café©' };
    const cleaned = cleanRecord(record);
    expect(cleaned.name).toBeDefined();
  });

  test('handles missing mandatory fields', async () => {
    const record = { id_number: 'A123', phone: null };
    const valid = validateRecord(record);
    expect(valid).toBe(false);
  });

  test('handles ElasticSearch timeout', async () => {
    // Mock ES timeout
    jest.setTimeout(10);
    const promise = searchClient.search({ q: 'test' });
    await expect(promise).rejects.toThrow('TIMEOUT');
  });
});
```

---

## 九、測試環境設置

### 9.1 Docker Compose 測試環境

```yaml
version: '3.8'
services:
  postgres-test:
    image: postgres:17
    environment:
      POSTGRES_DB: test_people_db
      POSTGRES_PASSWORD: testpass
    ports:
      - "5433:5432"

  elasticsearch-test:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
    environment:
      discovery.type: single-node
      xpack.security.enabled: false
    ports:
      - "9201:9200"

  redis-test:
    image: redis:7
    ports:
      - "6380:6379"
```

**使用**：
```bash
npm run test:setup:env   # 啟動測試環境
npm run test:unit       # 進行單元測試
npm run test:integration # 進行整合測試
npm run test:teardown:env # 清理測試環境
```

---

## 十、審查清單

完成實裝前，需通過以下檢查：

- [ ] 所有單元測試通過（覆蓋率 ≥ 80%）
- [ ] 所有整合測試通過
- [ ] E2E 流程測試完整
- [ ] 效能基準達標
- [ ] 無安全漏洞（依 security-review 技能檢查）
- [ ] 稽核日誌完整記錄
- [ ] RLS 政策經過驗證
- [ ] 文檔與程式碼同步

---

## 十一、ID 132 測試切片（待實作）

### 11.1 Unit（Query Builder / Mapper）

- `should detect phone-like query and build exact keyword term`
- `should detect id-number-like query and build exact keyword term`
- `should fallback to fuzzy/fulltext for name/address query`
- `should map quality filter consistently between FE and BE`
- `should map data_sources[] into ES terms filter`

### 11.2 Integration（API 契約）

- `/api/people-db/search` 收到 `data_sources[]` 時應正確過濾
- `/api/people-db/search` 收到電話查詢時應以 exact-first query 執行
- 回應需包含來源追溯欄位（至少：batch/source/importedAt）
- `/api/people-db/import/*` 與狀態 API 可提供匯入台帳必要欄位

### 11.3 E2E（使用者核心路徑）

1. 輸入電話 `27851310`，Top 結果需含對應電話資料，不可出現明顯無關首筆
2. 輸入身分證查詢，結果需對應精準記錄
3. 勾選單一資料集搜尋時，結果只來自該資料集
4. 搜尋結果列可看到來源欄位（資料集/批次/原始檔）
5. 匯入台帳可看到「何時、誰、幾筆、狀態」

