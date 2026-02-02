# Supabase Migrations 使用指南

## 📂 Migration 檔案狀態

### ✅ 當前有效的 Migration（請保留）

| 檔案名稱                                          | 日期       | 說明                                    | 表格數量 | 狀態       |
| ------------------------------------------------- | ---------- | --------------------------------------- | -------- | ---------- |
| `20260122000000_full_schema.sql`                  | 2026-01-22 | 完整初始 Schema                         | ~30      | ✅ 必須保留 |
| `20260122120000_create_properties_view.sql`       | 2026-01-22 | Properties 統一視圖                     | 1 View   | ✅ 必須保留 |
| `20260123000000_agent_authorization_rls.sql`      | 2026-01-23 | RLS Policy 與授權機制                   | 0        | ✅ 必須保留 |
| `20260130_super_admin_tables.sql`                 | 2026-01-30 | Super Admin 核心表格 (Gemini)           | ~20      | ✅ 必須保留 |
| `20260130_super_admin_missing_tables.sql`         | 2026-01-30 | Super Admin 補充表格                    | 8        | ✅ 必須保留 |
| `20260130_common_user_tables.sql`                 | 2026-01-30 | 通用使用者表格（所有角色共用）          | 15       | ✅ 必須保留 |
| `20260130_landlord_tables.sql`                    | 2026-01-30 | Landlord 專用表格（暫未創建，待補充）   | 22       | ⏳ 待創建   |
| `20260130_special_features_tables.sql`            | 2026-01-30 | 特殊功能表格 (AI Voice, 客戶, 廠商)     | 26       | ✅ 必須保留 |

**總計**: 8 個 migration 文件，約 **122 張表** + 1 個 View

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

## 📋 Migration 分類說明

### 1️⃣ 初始核心架構 (2026-01-22)
- **`20260122000000_full_schema.sql`**: 基礎 30 張表，包含 users_profile, agents, properties 基本結構
- **`20260122120000_create_properties_view.sql`**: 統一物件視圖，整合租賃和買賣物件

### 2️⃣ 安全與授權 (2026-01-23)
- **`20260123000000_agent_authorization_rls.sql`**: RLS 策略、Agent 授權機制、輔助函數

### 3️⃣ Super Admin 系統 (2026-01-30)
- **`20260130_super_admin_tables.sql`**: RBAC、系統設定、國際化、日誌監控（Gemini 完成）
- **`20260130_super_admin_missing_tables.sql`**: 補充缺失表格
  - `users_track_history` - 使用者追蹤
  - `tax_rates` - 稅率設定
  - `webhook_configs` - Webhook 配置
  - `elasticsearch_indices` - ES 索引管理
  - `perf_metrics` - 效能監控
  - `recommendation_logs` - 推薦記錄
  - `unit_conversion_logs` - 單位轉換
  - `version_history` - 版本歷史

### 4️⃣ 通用使用者功能 (2026-01-30)
- **`20260130_common_user_tables.sql`**: 所有使用者角色共用的表格
  - **通訊**: Messages, Email threads, User sessions
  - **通知**: Notification queue, Preferences
  - **文檔**: Document uploads, Media processing
  - **偏好**: Theme settings, Social auth
  - **生產力**: Calendar, Todo tasks, Drafts
  - **支援**: User feedback

### 5️⃣ Landlord 專用功能 (2026-01-30)
- **`20260130_landlord_tables.sql`**: 房東專用的 22 張表
  - **財務**: Bank accounts, Rental/Sales ledger, Tax reports
  - **物件**: Inventory, Status history, Type changes
  - **媒體**: Gallery, Panorama images, OCR logs
  - **內容**: Blog posts, Analytics, FAQs
  - **建築**: Communities, Title records, Facilities
  - **特殊**: ComfyUI styles, Call preferences, Agent directory

### 6️⃣ 特殊功能模組 (2026-01-30)
- **`20260130_special_features_tables.sql`**: 26 張特殊功能表
  - **AI Voice** (3): Virtual numbers, Call logs, AI conversations
  - **客戶管理** (8): Tenants/Buyers (contracted/leads), Inquiries, Viewings
  - **合約法律** (5): Lease/Sales agreements, Receipts, Signatures
  - **廠商管理** (6): Service providers, Maintenance vendors, Insurance
  - **附加功能** (4): Favorites, Comparisons, Reviews, VLM parsing

---

## 📋 Migration 執行順序

Supabase 會依照檔案名稱的時間戳記順序執行：

```
1. 20260122000000_full_schema.sql                  ← 基礎架構
2. 20260122120000_create_properties_view.sql       ← 視圖
3. 20260123000000_agent_authorization_rls.sql      ← RLS 安全
4. 20260130_super_admin_tables.sql                 ← Super Admin (Gemini)
5. 20260130_super_admin_missing_tables.sql         ← Super Admin 補充
6. 20260130_common_user_tables.sql                 ← 通用功能
7. 20260130_landlord_tables.sql                    ← Landlord (待創建)
8. 20260130_special_features_tables.sql            ← 特殊功能
```

**注意**: Landlord tables 尚未創建，請先創建該文件再執行 migration。

---

## 🚀 推薦操作流程

### 步驟 1：備份（如有重要資料）

```bash
# 導出現有資料
supabase db dump -f backup_$(date +%Y%m%d).sql
```

### 步驟 2：檢查 Migration 文件

```bash
cd supabase/migrations

# 確認所有必要的 migration 文件都存在
ls -la *.sql

# 應該看到以下文件：
# 20260122000000_full_schema.sql
# 20260122120000_create_properties_view.sql
# 20260123000000_agent_authorization_rls.sql
# 20260130_super_admin_tables.sql
# 20260130_super_admin_missing_tables.sql
# 20260130_common_user_tables.sql
# 20260130_special_features_tables.sql
# （暫缺）20260130_landlord_tables.sql
```

### 步驟 3：執行 Migration

#### 選項 A：完全重置（開發環境推薦）
```bash
# ⚠️ 警告：會清空所有資料
supabase db reset
```

#### 選項 B：增量更新（生產環境）
```bash
# 僅執行未執行的 migration
supabase migration up
```

### 步驟 4：驗證 Migration

```bash
# 檢查 migration 狀態
supabase migration list

# 檢查資料表數量
supabase db diff

# 預期結果：約 122 張表 + 1 個 View
```

### 步驟 5：測試驗證

```bash
# 啟動本地 Supabase
supabase start

# 在 Supabase Studio (http://localhost:54323) 中檢查：
# 1. 所有表格是否正確建立
# 2. RLS 策略是否啟用
# 3. 索引是否建立
# 4. 外鍵關聯是否正確
```

---

## 🧪 測試驗證清單

執行以下 SQL 查詢驗證 migration 是否成功：

```sql
-- 1. 檢查所有資料表是否建立（預期約 122+ 張表）
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- 預期結果：122+

-- 2. 檢查 RLS 是否啟用（所有表應該都啟用）
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
-- 預期結果：所有表的 rowsecurity 都是 true

-- 3. 檢查 Policy 數量（應該有大量 policies）
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
-- 預期結果：100+

-- 4. 檢查主要表格是否存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'users_profile', 'agents', 'roles', 'permissions',
    'properties_for_rent', 'properties_for_sale',
    'contracted_tenants', 'leads_buyers',
    'lease_agreements', 'sales_agreements',
    'virtual_phone_numbers', 'call_logs',
    'notification_queue', 'document_uploads'
  )
ORDER BY table_name;
-- 預期結果：應該返回所有查詢的表格

-- 5. 檢查索引數量
SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';
-- 預期結果：200+

-- 6. 檢查外鍵約束
SELECT COUNT(*) 
FROM information_schema.table_constraints 
WHERE constraint_schema = 'public' 
  AND constraint_type = 'FOREIGN KEY';
-- 預期結果：100+

-- 7. 檢查 Super Admin 表格
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'roles', 'permissions', 'role_permissions',
    'users_track_history', 'tax_rates', 'webhook_configs',
    'perf_metrics', 'version_history'
  )
ORDER BY table_name;
-- 預期結果：應該返回所有 Super Admin 表格

-- 8. 檢查通用表格
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'user_sessions', 'messages', 'notification_queue',
    'calendar_events', 'todo_tasks', 'user_feedback'
  )
ORDER BY table_name;
-- 預期結果：應該返回所有通用表格
```

---

## ⚠️ 常見問題

### Q1: Migration 執行失敗怎麼辦？

**A**: 檢查錯誤訊息並採取對應措施：

```bash
# 查看 Supabase 日誌
supabase status
supabase logs

# 如果是外鍵錯誤，檢查表格創建順序
# 如果是 RLS 策略衝突，檢查策略名稱是否重複

# 必要時重置資料庫
supabase db reset
```

### Q2: 缺少 Landlord tables 怎麼辦？

**A**: Landlord tables migration 文件尚未創建，您可以：
1. 等待後續創建該文件
2. 或者先執行其他 migration，Landlord 功能暫時不可用
3. 參考 Excel 定義自行創建該 migration

### Q3: 生產環境已有舊資料，如何遷移？

**A**: 不要直接執行 `db reset`！需要：
1. 保留所有舊 migration 檔案
2. 建立資料遷移腳本
3. 在測試環境驗證後才推送到生產
4. 建議聯繫資料庫管理員協助

### Q4: 本地與遠端 migration 不一致？

**A**: 
```bash
# 檢查差異
supabase db diff

# 從遠端拉取 migration（保留遠端）
supabase db pull

# 推送本地到遠端（覆蓋遠端，危險！）
supabase db push --include-all
```

### Q5: RLS 策略阻止了我的查詢？

**A**: 
```sql
-- 暫時停用 RLS（僅用於調試）
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;

-- 檢查當前用戶的角色
SELECT auth.uid(), auth.role();

-- 查看表格的 RLS 策略
SELECT * FROM pg_policies WHERE tablename = 'your_table';
```

### Q6: 如何回滾 Migration？

**A**: Supabase 不支援自動回滾，需要手動處理：
```bash
# 方法 1: 重置到特定版本（會丟失資料）
supabase db reset

# 方法 2: 手動建立反向 migration
# 創建新的 migration 文件來刪除表格或欄位
```

---

## 📚 相關文件

### 專案文檔
- [DATABASE_MIGRATION_COMPLETION_REPORT_2026-01-30.md](../../docs/DATABASE_MIGRATION_COMPLETION_REPORT_2026-01-30.md) - 完整的 migration 完成報告
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Migration 執行快速指南
- [PostgreSQL POLICY 設計規劃書.md](../../docs/資料庫設計進度報告/PostgreSQL%20POLICY%20設計規劃書.md) - RLS 策略設計
- [資料庫架構設計書.md](../../docs/technical-selection/database-architecture-design.md) - 整體架構設計

### Excel 分析結果
- `excel_tables_analysis.json` - 完整的 Excel 表格分析結果
- `completed_tables_checklist.txt` - 已完成表格清單

### 官方文檔
- [Supabase Migrations](https://supabase.com/docs/guides/database/migrations)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)

---

## 📊 Migration 統計

### 按類別統計

| 類別           | 文件                                      | 表格數 | 狀態 |
| -------------- | ----------------------------------------- | ------ | ---- |
| 初始架構       | `20260122000000_full_schema.sql`          | ~30    | ✅   |
| Properties     | `20260122120000_create_properties_view.sql` | 1 View | ✅   |
| RLS 安全       | `20260123000000_agent_authorization_rls.sql` | 0      | ✅   |
| Super Admin    | `20260130_super_admin_tables.sql`         | ~20    | ✅   |
| Super Admin 補充 | `20260130_super_admin_missing_tables.sql` | 8      | ✅   |
| 通用功能       | `20260130_common_user_tables.sql`         | 15     | ✅   |
| Landlord       | `20260130_landlord_tables.sql`            | 22     | ⏳   |
| 特殊功能       | `20260130_special_features_tables.sql`    | 26     | ✅   |
| **總計**       | **8 個文件**                              | **122+** | **87.5%** |

### 表格分類統計

```
📊 Super Admin 表格: ~28 張
   ├─ RBAC 系統: 3 張
   ├─ 系統設定: 4 張
   ├─ 國際化: 4 張
   ├─ 安全控制: 2 張
   └─ 日誌監控: 15 張

📊 Landlord 表格: 22 張
   ├─ 財務管理: 6 張
   ├─ 物件管理: 4 張
   ├─ 媒體文檔: 3 張
   ├─ 內容行銷: 3 張
   ├─ 建築資訊: 3 張
   └─ 特殊功能: 3 張

📊 通用表格: 15 張
   ├─ 通訊訊息: 3 張
   ├─ 通知系統: 2 張
   ├─ 文檔媒體: 3 張
   ├─ 使用者偏好: 2 張
   ├─ 生產力工具: 4 張
   └─ 回饋支援: 1 張

📊 特殊功能表格: 26 張
   ├─ AI Voice: 3 張
   ├─ 客戶管理: 8 張
   ├─ 合約法律: 5 張
   ├─ 廠商管理: 6 張
   └─ 附加功能: 4 張

📊 基礎表格: ~30 張 (from full_schema.sql)
```

---

## 🔄 版本記錄

| 版本 | 日期       | 說明                                        | 執行者           |
| ---- | ---------- | ------------------------------------------- | ---------------- |
| 1.0  | 2026-01-23 | 建立 README，標記過時 migration             | 原始團隊         |
| 2.0  | 2026-01-30 | 大幅更新，新增 6 個 migration 文件說明      | Claude Sonnet 4.5 |
| 2.0  | 2026-01-30 | 新增詳細分類、統計、測試清單                | Claude Sonnet 4.5 |

---

## 💡 下一步建議

1. **立即執行**: 
   ```bash
   supabase db reset
   ```

2. **創建 Landlord Migration**: 
   - 參考 Excel 中的 Landlord 表格定義
   - 創建 `20260130_landlord_tables.sql`
   - 包含財務、物件、媒體等 22 張表

3. **補充缺失表格**: 
   - 參考完成報告中的缺失清單
   - 依需求優先級逐步補充

4. **RLS 策略優化**: 
   - 檢視並調整各表格的 RLS 策略
   - 確保符合業務安全需求

5. **效能測試**: 
   - 使用大量測試數據驗證
   - 調整索引策略
   - 優化查詢效能

---

**最後更新**: 2026-01-30  
**維護者**: 開發團隊  
**文件版本**: 2.0
