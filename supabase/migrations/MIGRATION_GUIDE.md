# Migration 文件快速參考指南

## 📁 Migration 文件列表

### 現有文件 (Gemini 同事完成)
1. `20260122000000_full_schema.sql` - 完整初始 schema
2. `20260122120000_create_properties_view.sql` - Properties 視圖
3. `20260123000000_agent_authorization_rls.sql` - Agent 授權 RLS
4. `20260130_super_admin_tables.sql` - Super Admin 核心表格

### 新增文件 (Claude Sonnet 4.5 完成)
5. `20260130_super_admin_missing_tables.sql` - Super Admin 缺失表格補完 (8 tables)
6. `20260130_landlord_tables.sql` - Landlord 相關表格 (22 tables)
7. `20260130_common_user_tables.sql` - 通用使用者表格 (15 tables)
8. `20260130_special_features_tables.sql` - 特殊功能表格 (26 tables)

---

## 🚀 執行 Migration

### 方法 1: 重置資料庫（開發環境推薦）
```bash
cd /Volumes/KLEVV-4T-1/Real\ Estate\ Management\ Projects/Owner-Property-Management-AI-SPA
supabase db reset
```
- ✅ 清空所有資料
- ✅ 按順序執行所有 migrations
- ✅ 適合開發和測試環境
- ⚠️  會刪除現有資料

### 方法 2: 應用新的 Migrations（生產環境）
```bash
cd /Volumes/KLEVV-4T-1/Real\ Estate\ Management\ Projects/Owner-Property-Management-AI-SPA
supabase migration up
```
- ✅ 保留現有資料
- ✅ 僅執行未執行的 migrations
- ✅ 適合生產環境更新
- ⚠️  需要處理數據遷移和相容性

---

## 📊 Migration 文件內容概覽

### 20260130_super_admin_missing_tables.sql
補充的 Super Admin 表格：
- `users_track_history` - 使用者追蹤歷史
- `tax_rates` - 稅率設定
- `webhook_configs` - Webhook 配置
- `elasticsearch_indices` - ES 索引
- `perf_metrics` - 效能指標
- `recommendation_logs` - 推薦記錄
- `unit_conversion_logs` - 單位轉換記錄
- `version_history` - 版本歷史

### 20260130_landlord_tables.sql
Landlord 專用表格（分 6 大類）：

**財務管理**
- Bank accounts, Rental ledger, Sales ledger, Rent receipts, Tax reports

**物件管理**
- Property inventory, Status history, Type change logs, Maintenance requests

**媒體文檔**
- Media gallery, Panorama images, OCR parsing logs

**內容行銷**
- Blog posts, Blog analytics, Property FAQs

**建築資訊**
- Buildings/communities, Building title records, Nearby facilities

**特殊功能**
- ComfyUI styles, Call preferences, Agent directory

### 20260130_common_user_tables.sql
所有用戶共用表格（分 6 大類）：

**通訊**
- User sessions, Messages, Email threads

**通知**
- Notification queue, Notification preferences

**文檔媒體**
- Document uploads, Upload progress, Media processing queue

**偏好設定**
- Theme settings, Social auth connections

**生產力**
- Calendar events, Todo tasks, Draft autosave, User activity logs

**支援**
- User feedback

### 20260130_special_features_tables.sql
特殊功能表格（分 5 大類）：

**AI Voice (3)**
- Virtual phone numbers, Call logs, AI conversations

**客戶管理 (8)**
- Contracted/Leads for Tenants & Buyers
- Inquiries, Viewing appointments

**合約法律 (5)**
- Lease/Sales agreements
- Deposit/Earnest money receipts
- Digital signatures

**廠商管理 (6)**
- Service providers, Maintenance vendors
- Legal services, Insurance, Interior designers

**附加功能 (4)**
- User favorites, Property comparisons
- User reviews, VLM parsing logs

---

## 🔍 檢查 Migration 狀態

### 查看已執行的 Migrations
```bash
supabase migration list
```

### 查看資料庫 Schema
```bash
supabase db dump --schema-only > schema_backup.sql
```

### 檢查特定表格是否存在
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

---

## 🛠️ 疑難排解

### 如果 Migration 失敗

1. **查看錯誤日誌**
```bash
supabase status
supabase logs
```

2. **回滾到特定 Migration**
```bash
supabase migration repair <migration_version>
```

3. **手動檢查 SQL**
```bash
psql -h localhost -p 54322 -d postgres -U postgres
\dt public.*
```

### 常見問題

**Q: 外鍵約束錯誤**
- A: 確認依賴的表格已存在，檢查執行順序

**Q: RLS 策略衝突**
- A: 檢查是否有重複的策略名稱

**Q: 索引創建失敗**
- A: 確認表格已存在，欄位名稱正確

---

## 📝 下一步動作

### 必須執行
1. 執行所有 migrations
2. 驗證表格結構正確性
3. 測試 RLS 策略

### 建議執行
1. 調整 RLS 策略以符合業務需求
2. 添加種子數據 (seed data)
3. 建立資料庫備份策略

### 可選執行
1. 效能測試與優化
2. 建立資料字典文檔
3. 設置監控告警

---

## 📞 支援資源

- **完整報告**: `docs/DATABASE_MIGRATION_COMPLETION_REPORT_2026-01-30.md`
- **Excel 分析**: `excel_tables_analysis.json`
- **Supabase 文檔**: https://supabase.com/docs/guides/database
- **PostgreSQL 文檔**: https://www.postgresql.org/docs/

---

**最後更新**: 2026-01-30  
**文件版本**: 1.0
