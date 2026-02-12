# 資料庫完整性驗證清單

> **創建日期**: 2026-01-31
> **創建者**: Claude Opus 4.5
> **用途**: 驗證資料庫表格的完整性、關聯性與效能

---

## 📋 驗證步驟

### 1️⃣ Migration 檔案驗證

執行以下命令檢查 migration 檔案：

```bash
cd /Volumes/KLEVV-4T-1/Real\ Estate\ Management\ Projects/Owner-Property-Management-AI-SPA

# 列出所有 migration 檔案
ls -lh supabase/migrations/*.sql

# 檢查 SQL 語法
cat supabase/migrations/20260131000001_missing_core_tables.sql | grep "CREATE TABLE"
```

**預期結果**：應顯示 5 個新表格：
- ✅ `property_documents`
- ✅ `email_verifications`
- ✅ `identity_verification_records`
- ✅ `payment_transactions`
- ✅ `invoice_records`

---

### 2️⃣ 執行 Migration

```bash
# 啟動 Supabase
supabase start

# 執行 migration
supabase db reset

# 或逐步執行
supabase migration up
```

**驗證輸出**：
```
Applying migration 20260131000001_missing_core_tables.sql...
Migration 完成！
已建立：
  - 5 張核心表格
  - 6 個觸發器
  - 3 個輔助函數
  - 完整的 RLS 政策
  - 40+ 個索引
```

---

### 3️⃣ 表格存在性驗證

在 Supabase Studio 或 psql 中執行：

```sql
-- 檢查所有表格是否存在
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'property_documents',
    'email_verifications',
    'identity_verification_records',
    'payment_transactions',
    'invoice_records'
  )
ORDER BY table_name;
```

**預期結果**：應返回 5 筆記錄

---

### 4️⃣ 外鍵約束驗證

```sql
-- 檢查外鍵約束
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN (
    'property_documents',
    'email_verifications',
    'identity_verification_records',
    'payment_transactions',
    'invoice_records'
  )
ORDER BY tc.table_name, kcu.column_name;
```

**預期結果**：
- `property_documents`: owner_id → users_profile, ocr_parsing_log_id → ocr_parsing_logs
- `email_verifications`: user_id → users_profile
- `identity_verification_records`: user_id → users_profile, reviewed_by → users_profile
- `payment_transactions`: user_id → users_profile, bank_account_id → bank_accounts, invoice_id → invoice_records
- `invoice_records`: landlord_id → users_profile, tenant_id → users_profile, payment_transaction_id → payment_transactions

---

### 5️⃣ 索引驗證

```sql
-- 檢查索引
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'property_documents',
    'email_verifications',
    'identity_verification_records',
    'payment_transactions',
    'invoice_records'
  )
ORDER BY tablename, indexname;
```

**預期結果**：每個表格應有多個索引（6-10 個）

---

### 6️⃣ 觸發器驗證

```sql
-- 檢查觸發器
SELECT
    trigger_name,
    event_object_table AS table_name,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN (
    'property_documents',
    'payment_transactions',
    'invoice_records'
  )
ORDER BY event_object_table, trigger_name;
```

**預期結果**：
- `property_documents`: `update_property_documents_updated_at_trigger`
- `payment_transactions`: `generate_transaction_reference_trigger`
- `invoice_records`: `generate_invoice_number_trigger`, `calculate_invoice_amounts_trigger`

---

### 7️⃣ RLS 政策驗證

```sql
-- 檢查 RLS 是否啟用
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'property_documents',
    'email_verifications',
    'identity_verification_records',
    'payment_transactions',
    'invoice_records'
  );
```

**預期結果**：所有表格的 `rowsecurity` 應為 `t` (true)

```sql
-- 檢查 RLS 政策數量
SELECT
    schemaname,
    tablename,
    policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'property_documents',
    'email_verifications',
    'identity_verification_records',
    'payment_transactions',
    'invoice_records'
  )
ORDER BY tablename, policyname;
```

**預期結果**：每個表格應有 2-4 個政策

---

### 8️⃣ 輔助函數驗證

```sql
-- 檢查函數是否存在
SELECT
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_unverified_documents_count',
    'is_identity_verified',
    'get_pending_payments_for_property',
    'expire_email_verifications'
  )
ORDER BY routine_name;
```

**預期結果**：應返回 4 個函數

---

### 9️⃣ 資料完整性測試

#### 測試 1: 插入測試資料

```sql
-- 假設已有測試用戶 (user_id = 'test-user-uuid')

-- 1. 插入文件記錄
INSERT INTO property_documents (
    owner_id,
    document_type,
    document_name,
    file_path,
    uploaded_by
) VALUES (
    'test-user-uuid',
    'building_title',
    '測試權狀.pdf',
    'property_pdfs/test-property/test.pdf',
    'test-user-uuid'
);

-- 2. 插入郵件驗證
INSERT INTO email_verifications (
    user_id,
    email,
    verification_token
) VALUES (
    'test-user-uuid',
    'test@example.com',
    'test-token-' || gen_random_uuid()
);

-- 3. 插入支付交易
INSERT INTO payment_transactions (
    user_id,
    transaction_type,
    amount,
    payment_method
) VALUES (
    'test-user-uuid',
    'rent_payment',
    20000.00,
    'bank_transfer'
);

-- 4. 插入發票
INSERT INTO invoice_records (
    landlord_id,
    invoice_type,
    subtotal,
    buyer_name,
    seller_name,
    seller_tax_id,
    line_items
) VALUES (
    'test-user-uuid',
    'rent',
    20000.00,
    '測試租客',
    '測試房東',
    '12345678',
    '[{"description":"租金","quantity":1,"unit_price":20000,"amount":20000}]'::jsonb
);
```

#### 測試 2: 驗證觸發器

```sql
-- 驗證 transaction_reference 自動生成
SELECT transaction_reference
FROM payment_transactions
WHERE user_id = 'test-user-uuid'
ORDER BY created_at DESC
LIMIT 1;
-- 預期格式: TXN-20260131-XXXX

-- 驗證 invoice_number 自動生成
SELECT invoice_number, total_amount, tax_amount
FROM invoice_records
WHERE landlord_id = 'test-user-uuid'
ORDER BY created_at DESC
LIMIT 1;
-- 預期: invoice_number 格式 INV-20260131-XXXX
--      total_amount = 21000.00 (20000 + 5%)
--      tax_amount = 1000.00
```

#### 測試 3: 驗證輔助函數

```sql
-- 測試未驗證文件數量
SELECT get_unverified_documents_count('test-user-uuid');
-- 預期返回: 1 (因為剛插入的文件未驗證)

-- 測試實名認證狀態
SELECT is_identity_verified('test-user-uuid');
-- 預期返回: FALSE (因為沒有認證記錄)

-- 測試待付款金額
SELECT get_pending_payments_for_property('test-property-uuid');
-- 預期返回: 待付款交易總額
```

---

### 🔟 RLS 政策測試

使用不同角色測試存取權限：

```sql
-- 設定測試角色為房東
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "landlord-uuid", "role": "authenticated"}';

-- 測試房東能否查看自己的文件
SELECT COUNT(*) FROM property_documents WHERE owner_id = 'landlord-uuid';
-- 預期: 可以查看

-- 測試房東能否查看他人的文件
SELECT COUNT(*) FROM property_documents WHERE owner_id = 'other-user-uuid';
-- 預期: 0 (不可查看)

-- 重置角色
RESET role;
```

---

## ✅ 驗證清單

- [ ] Migration 檔案存在且語法正確
- [ ] 5 張新表格成功建立
- [ ] 所有外鍵約束正確設定
- [ ] 索引建立完成（40+ 個）
- [ ] 觸發器正常運作（6 個）
- [ ] RLS 政策啟用且配置正確
- [ ] 輔助函數可正常呼叫（4 個）
- [ ] 測試資料可成功插入
- [ ] 自動生成欄位正常運作
- [ ] RLS 權限隔離有效

---

## 🐛 常見問題排查

### 問題 1: Migration 執行失敗

**錯誤訊息**：`relation "ocr_parsing_logs" does not exist`

**解決方案**：
```bash
# 確保先執行基礎 migration
supabase migration up --target-version 20260130000002
```

---

### 問題 2: 觸發器未執行

**症狀**：`transaction_reference` 或 `invoice_number` 為 NULL

**解決方案**：
```sql
-- 檢查觸發器是否存在
SELECT * FROM pg_trigger WHERE tgname LIKE '%transaction%';

-- 重新建立觸發器
DROP TRIGGER IF EXISTS generate_transaction_reference_trigger ON payment_transactions;
CREATE TRIGGER generate_transaction_reference_trigger
    BEFORE INSERT ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION generate_transaction_reference();
```

---

### 問題 3: RLS 阻擋所有查詢

**症狀**：即使是 owner 也無法查詢資料

**解決方案**：
```sql
-- 暫時停用 RLS 檢查權限
ALTER TABLE property_documents DISABLE ROW LEVEL SECURITY;

-- 測試查詢
SELECT * FROM property_documents;

-- 檢查 auth.uid() 是否正確
SELECT auth.uid();

-- 重新啟用 RLS
ALTER TABLE property_documents ENABLE ROW LEVEL SECURITY;
```

---

## 📊 效能驗證

### 查詢效能測試

```sql
-- 測試索引效能
EXPLAIN ANALYZE
SELECT * FROM property_documents
WHERE owner_id = 'test-user-uuid'
  AND ocr_status = 'pending';

-- 預期: 應使用 Index Scan，execution time < 1ms
```

### 表格大小檢查

```sql
SELECT
    table_name,
    pg_size_pretty(pg_total_relation_size('public.' || table_name)) AS total_size,
    pg_size_pretty(pg_relation_size('public.' || table_name)) AS table_size,
    pg_size_pretty(pg_total_relation_size('public.' || table_name) -
                   pg_relation_size('public.' || table_name)) AS indexes_size
FROM (
    VALUES
        ('property_documents'),
        ('email_verifications'),
        ('identity_verification_records'),
        ('payment_transactions'),
        ('invoice_records')
) AS t(table_name);
```

---

## 🎯 驗證完成標準

所有新增表格應滿足：

✅ **結構完整性**
- 所有欄位類型正確
- 主鍵、外鍵、唯一約束設定正確
- CHECK 約束有效運作

✅ **效能優化**
- 關鍵欄位有索引
- 複合查詢有對應的複合索引
- JSONB 欄位有 GIN 索引

✅ **安全性**
- RLS 政策啟用
- 權限隔離有效
- 敏感資料加密（如適用）

✅ **自動化**
- 觸發器正常運作
- 輔助函數可呼叫
- 時間戳自動更新

✅ **資料完整性**
- 測試資料可插入
- 關聯查詢正確
- 級聯刪除有效

---

## 📝 驗證報告範本

```markdown
## 資料庫驗證報告

**驗證日期**: YYYY-MM-DD
**驗證者**: [Your Name]
**環境**: Local / Staging / Production

### 驗證結果

- [x] Migration 執行成功
- [x] 5 張表格建立完成
- [x] 外鍵約束正確
- [x] 索引建立完成
- [x] 觸發器運作正常
- [x] RLS 政策有效
- [x] 輔助函數可用
- [x] 測試資料驗證通過
- [x] 效能符合預期

### 問題記錄

- 無

### 建議

- 建議在正式環境部署前進行完整負載測試
```

---

**驗證清單結束**
