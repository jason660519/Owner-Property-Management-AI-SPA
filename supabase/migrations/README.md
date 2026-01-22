# Supabase Migrations 使用指南

## 📂 Migration 檔案狀態

### ✅ 當前有效的 Migration（請保留）

| 檔案名稱                                     | 日期       | 說明                  | 狀態       |
| -------------------------------------------- | ---------- | --------------------- | ---------- |
| `20260122000000_full_schema.sql`             | 2026-01-22 | 完整 30 張表 Schema   | ✅ 必須保留 |
| `20260123000000_agent_authorization_rls.sql` | 2026-01-23 | RLS Policy 與授權機制 | ✅ 必須保留 |

### ⚠️ 過時的 Migration（建議刪除）

| 檔案名稱                                      | 日期       | 狀態     | 可否刪除 |
| --------------------------------------------- | ---------- | -------- | -------- |
| `20260112000000_initial_schema.sql`           | 2026-01-12 | ⚠️ 已過時 | ✅ 可刪除 |
| `20260116000000_add_property_documents.sql`   | 2026-01-16 | ⚠️ 已過時 | ✅ 可刪除 |
| `20260116000001_add_core_business_tables.sql` | 2026-01-16 | ⚠️ 已過時 | ✅ 可刪除 |

---

## 🔧 清理指南

### 選項 A：完全重建（推薦用於開發環境）

如果您的資料庫尚未部署到生產環境，建議完全重建：

```bash
# 1. 刪除舊的 migration 檔案
cd supabase/migrations
rm 20260112000000_initial_schema.sql
rm 20260116000000_add_property_documents.sql
rm 20260116000001_add_core_business_tables.sql

# 2. 重置 Supabase 本地資料庫（警告：會清空所有資料）
supabase db reset

# 3. 重新執行 migration
supabase db push
```

### 選項 B：保留歷史記錄（生產環境）

如果已有生產資料，需要保留所有 migration 檔案以維持歷史記錄：

```bash
# 保留所有檔案，不做任何刪除
# Supabase 會依時間序執行所有 migration
```

**注意事項**：
- 舊 migration 使用 `properties` 表（以 `agent_id` 為主）
- 新 migration 使用 `Property_Sales` 和 `Property_Rentals` 表（以 `owner_id` 為主）
- 如果保留舊檔案，需要建立額外的 migration 來刪除舊表或處理衝突

---

## 📋 Migration 執行順序

Supabase 會依照檔案名稱的時間戳記順序執行：

```
1. 20260112000000_initial_schema.sql          ← 舊版（建議刪除）
2. 20260116000000_add_property_documents.sql  ← 舊版（建議刪除）
3. 20260116000001_add_core_business_tables.sql ← 舊版（建議刪除）
4. 20260122000000_full_schema.sql             ← ✅ 保留
5. 20260123000000_agent_authorization_rls.sql ← ✅ 保留
```

---

## 🚀 推薦操作流程

### 步驟 1：備份（如有重要資料）

```bash
# 導出現有資料
supabase db dump -f backup_$(date +%Y%m%d).sql
```

### 步驟 2：清理舊 Migration

```bash
cd supabase/migrations

# 刪除過時的檔案
rm 20260112000000_initial_schema.sql
rm 20260116000000_add_property_documents.sql
rm 20260116000001_add_core_business_tables.sql

# 同時刪除對應的 ._ 系統檔案（macOS）
rm ._20260112000000_initial_schema.sql
rm ._20260116000000_add_property_documents.sql
rm ._20260116000001_add_core_business_tables.sql
```

### 步驟 3：驗證 Migration

```bash
# 檢查剩餘的 migration 檔案
ls -la

# 應該只看到：
# - 20260122000000_full_schema.sql
# - 20260123000000_agent_authorization_rls.sql
# - README.md
```

### 步驟 4：重置並重新執行

```bash
# 重置本地資料庫（警告：會清空所有資料）
supabase db reset

# 檢查 migration 狀態
supabase migration list

# 應該會看到：
# ✅ 20260122000000_full_schema.sql
# ✅ 20260123000000_agent_authorization_rls.sql
```

### 步驟 5：測試驗證

```bash
# 啟動本地 Supabase
supabase start

# 檢查資料表是否正確建立
supabase db diff

# 測試 RLS Policy
# 在 Supabase Studio (http://localhost:54323) 中測試
```

---

## 🧪 測試驗證清單

執行以下 SQL 查詢驗證 migration 是否成功：

```sql
-- 1. 檢查所有資料表是否建立（應該有 31 張表：30 張業務表 + 1 張授權表）
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- 預期結果：31

-- 2. 檢查 RLS 是否啟用（所有表應該都啟用）
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
-- 預期結果：所有表的 rowsecurity 都是 true

-- 3. 檢查 Policy 數量（應該有 60+ 個 policies）
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
-- 預期結果：60+

-- 4. 檢查輔助函數是否建立（應該有 4 個函數）
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%agent%';
-- 預期結果：
-- - check_agent_permission
-- - is_owner_or_authorized_agent
-- - get_authorized_landlords
-- - expire_outdated_authorizations
-- - validate_agent_authorization

-- 5. 檢查索引是否建立
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_agent%';
-- 預期結果：6 個 agent_authorizations 相關索引
```

---

## ⚠️ 常見問題

### Q1: 刪除舊 migration 後，Supabase 報錯怎麼辦？

**A**: 如果 Supabase 已經執行過舊 migration，需要重置資料庫：

```bash
supabase db reset
```

### Q2: 生產環境已經使用舊 Schema，如何遷移？

**A**: 不要刪除舊 migration！需要建立額外的 migration 來：
1. 遷移資料從舊表到新表
2. 刪除舊表
3. 這需要專門的資料遷移腳本

### Q3: 本地與遠端 migration 不一致怎麼辦？

**A**: 
```bash
# 檢查差異
supabase db diff

# 從遠端拉取 migration
supabase db pull

# 或強制推送本地到遠端（危險！）
supabase db push --include-all
```

---

## 📚 相關文件

- [PostgreSQL POLICY 設計規劃書.md](../../docs/資料庫設計進度報告/PostgreSQL%20POLICY%20設計規劃書.md)
- [資料庫架構設計書.md](../../docs/專案架構說明/資料庫架構設計書.md)
- [Supabase 官方文件](https://supabase.com/docs/guides/database/migrations)

---

## 🔄 版本記錄

| 版本 | 日期       | 說明                            |
| ---- | ---------- | ------------------------------- |
| 1.0  | 2026-01-23 | 建立 README，標記過時 migration |
