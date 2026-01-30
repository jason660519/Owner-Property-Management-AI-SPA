# 房東物件管理系統 - 完整資料庫架構文件

> **創建日期**: 2026-01-31
> **創建者**: Claude Opus 4.5
> **最後修改**: 2026-01-31
> **修改者**: Claude Opus 4.5
> **版本**: 1.0
> **資料庫**: PostgreSQL 17 + Supabase

---

## 📋 目錄

1. [概述](#概述)
2. [資料庫統計](#資料庫統計)
3. [核心表格清單](#核心表格清單)
4. [新增表格詳細說明](#新增表格詳細說明)
5. [表格關聯圖](#表格關聯圖)
6. [命名規範](#命名規範)
7. [索引策略](#索引策略)
8. [RLS 政策概覽](#rls-政策概覽)
9. [輔助函數清單](#輔助函數清單)
10. [資料完整性驗證](#資料完整性驗證)

---

## 📊 概述

本系統為房東物件管理平台，支援出租/出售物件管理、潛客 CRM、合約管理、財務帳務、OCR 權狀辨識、實名認證、支付處理與發票管理等完整功能。

### 技術棧

- **資料庫**: PostgreSQL 17.x
- **雲端平台**: Supabase
- **安全機制**: Row Level Security (RLS)
- **檔案儲存**: Supabase Storage
- **驗證機制**: Supabase Auth

---

## 📈 資料庫統計

| 類別 | 數量 | 說明 |
|------|------|------|
| **總表格數** | 115+ | 包含所有業務表格 |
| **視圖數** | 1 | `properties` 統一物件介面 |
| **觸發器數** | 15+ | 自動化資料處理 |
| **函數數** | 20+ | 業務邏輯與權限檢查 |
| **索引數** | 200+ | 效能優化 |
| **RLS 政策數** | 100+ | 資料存取控制 |

---

## 📑 核心表格清單

### A. 身份與權限 (3 表)

| 表名 | 用途 | 關鍵欄位 |
|------|------|--------|
| `users_profile` | 所有使用者基本資料 | id, role, display_name, email, phone |
| `roles` | 角色定義 | id, name (super_admin/landlord/agent/tenant) |
| `permissions` | 權限定義 | id, code, module, description |

### B. 物件資產管理 (6 表)

| 表名 | 用途 | 關鍵欄位 | 狀態 |
|------|------|--------|------|
| `Property_Sales` | 出售物件 | id, owner_id, address, price, status | ✅ 已建立 |
| `Property_Rentals` | 出租物件 | id, owner_id, address, monthly_rent, status | ✅ 已建立 |
| `Property_Photos` | 物件照片 | id, property_id, storage_path, is_primary | ✅ 已建立 |
| `property_inventory` | 出租物件財產清單 | id, property_id, item_name, condition | ✅ 已建立 |
| `buildings_communities` | 社區大樓資料 | id, name, address, amenities | ✅ 已建立 |
| `properties` (VIEW) | 統一物件介面 | 合併 Sales + Rentals | ✅ 已建立 |

### C. 建物與權狀資料 (2 表)

| 表名 | 用途 | 關鍵欄位 | 狀態 |
|------|------|--------|------|
| `building_title_records` | 建物權狀詳細資料 | id, property_id, title_number, ocr_extracted | ✅ 已建立 |
| `ocr_parsing_logs` | OCR 解析記錄 | id, document_type, status, structured_data | ✅ 已建立 |

### D. 文件管理 (2 表) 🆕

| 表名 | 用途 | 關鍵欄位 | 狀態 |
|------|------|--------|------|
| `property_documents` | 物件文件生命週期管理 | id, property_id, document_type, ocr_status | ✅ **新增** |
| `document_uploads` | 通用文件上傳記錄 | id, user_id, document_type, file_path | ✅ 已建立 |

### E. 驗證與認證 (2 表) 🆕

| 表名 | 用途 | 關鍵欄位 | 狀態 |
|------|------|--------|------|
| `email_verifications` | 郵件驗證 | id, user_id, verification_token, status | ✅ **新增** |
| `identity_verification_records` | 實名認證 | id, user_id, verification_type, status | ✅ **新增** |

### F. 財務與帳務管理 (9 表)

| 表名 | 用途 | 關鍵欄位 | 狀態 |
|------|------|--------|------|
| `bank_accounts` | 房東銀行帳戶 | id, landlord_id, account_number, is_default | ✅ 已建立 |
| `rental_ledger` | 租金收支明細 | id, property_id, transaction_date, amount | ✅ 已建立 |
| `sales_ledger` | 買賣收支明細 | id, property_id, transaction_type, amount | ✅ 已建立 |
| `rent_receipts` | 租金收據 | id, rental_ledger_id, receipt_number | ✅ 已建立 |
| `tax_reports` | 稅務報表記錄 | id, landlord_id, report_year, total_income | ✅ 已建立 |
| `Earnest_Money_Receipts` | 預付訂金 | id, sale_id, amount, received_at | ✅ 已建立 |
| `Deposit_Receipts` | 定金簽收記錄 | id, property_id, amount | ✅ 已建立 |
| `payment_transactions` | 支付交易詳細記錄 | id, transaction_type, status, amount | ✅ **新增** |
| `invoice_records` | 發票管理 | id, invoice_number, status, total_amount | ✅ **新增** |

### G. 潛在客戶與業務機會 (9 表)

| 表名 | 用途 | 關鍵欄位 | 狀態 |
|------|------|--------|------|
| `leads_tenants` | 潛在租客資料 | id, landlord_id, name, lead_status | ✅ 已建立 |
| `leads_buyers` | 潛在買方資料 | id, landlord_id, budget_min/max, lead_status | ✅ 已建立 |
| `contracted_tenants` | 成交租客資料 | id, tenant_id, lease_agreement_id, move_in_date | ✅ 已建立 |
| `contracted_buyers` | 成交買方資料 | id, buyer_id, property_id, purchase_price | ✅ 已建立 |
| `tenant_inquiries` | 租客留言記錄 | id, property_id, inquirer_name, message | ✅ 已建立 |
| `buyer_inquiries` | 買方留言記錄 | id, property_id, inquirer_name, status | ✅ 已建立 |
| `viewing_appointments_tenant` | 租客預約看房 | id, property_id, preferred_date, status | ✅ 已建立 |
| `viewing_appointments_buyer` | 買方預約看房 | id, property_id, visitor_name, status | ✅ 已建立 |
| `Purchase_Offers` | 購買出價記錄 | id, property_id, buyer_id, offer_price | ✅ 已建立 |

### H. 合約與交易管理 (5 表)

| 表名 | 用途 | 關鍵欄位 | 狀態 |
|------|------|--------|------|
| `lease_agreements` | 租賃合約 | id, landlord_id, tenant_id, start_date, status | ✅ 已建立 |
| `sales_agreements` | 買賣合約 | id, seller_id, buyer_id, purchase_price, status | ✅ 已建立 |
| `Payment_Workflow` | 交易付款流程 | id, sale_id, stage (escrow/tax/transfer) | ✅ 已建立 |
| `Deposit_Receipts` | 簽約定金簽收 | id, property_id, amount | ✅ 已建立 |
| `Earnest_Money_Receipts` | 誠意金收據 | id, sale_id, amount | ✅ 已建立 |

### I. 維護與運營 (8 表)

| 表名 | 用途 | 關鍵欄位 | 狀態 |
|------|------|--------|------|
| `maintenance_requests` | 維修申請 | id, property_id, category, priority, status | ✅ 已建立 |
| `Maintenance_Vendors` | 維修廠商 | id, vendor_name, specialty, contact_info | ✅ 已建立 |
| `Maintenance_Quotes` | 維修報價單 | id, property_id, vendor_id, quoted_amount | ✅ 已建立 |
| `Interior_Designers` | 室內設計師 | id, name, contact_info | ✅ 已建立 |
| `Escrow_Legal_Services` | 法律與過戶服務 | id, name, contact_info | ✅ 已建立 |
| `property_status_history` | 物件狀態變更歷史 | id, property_id, old_status, new_status | ✅ 已建立 |
| `property_type_change_logs` | 物件轉租轉賣記錄 | id, property_id, old_type, new_type | ✅ 已建立 |
| `agent_directory` | 仲介名單 | id, landlord_id, agent_name, rating | ✅ 已建立 |

### J. 仲介授權 (1 表)

| 表名 | 用途 | 關鍵欄位 | 狀態 |
|------|------|--------|------|
| `agent_authorizations` | 仲介授權詳細管理 | id, landlord_id, agent_id, permissions, valid_until | ✅ 已建立 |

### K. 媒體與文檔 (5 表)

| 表名 | 用途 | 關鍵欄位 | 狀態 |
|------|------|--------|------|
| `media_gallery` | 媒體庫 | id, owner_id, file_path, related_entity_type | ✅ 已建立 |
| `panorama_images` | 360度全景圖 | id, property_id, room_name, panorama_url | ✅ 已建立 |
| `ocr_parsing_logs` | OCR 解析記錄 | id, document_type, status, structured_data | ✅ 已建立 |
| `document_uploads` | 文件上傳記錄 | id, user_id, document_type, is_verified | ✅ 已建立 |
| `Property_Photos` | 物件照片 | id, property_id, storage_path, is_primary | ✅ 已建立 |

### L. 用戶通用功能 (15 表)

| 表名 | 用途 | 狀態 |
|------|------|------|
| `user_sessions` | 會話狀態 | ✅ 已建立 |
| `messages` | 訊息記錄 | ✅ 已建立 |
| `email_threads` | Email 線程 | ✅ 已建立 |
| `notification_queue` | 通知佇列 | ✅ 已建立 |
| `notification_preferences` | 通知偏好設定 | ✅ 已建立 |
| `calendar_events` | 行事曆事件 | ✅ 已建立 |
| `todo_tasks` | 待辦事項 | ✅ 已建立 |
| `draft_autosave` | 草稿自動儲存 | ✅ 已建立 |
| `user_activity_logs` | 用戶活動記錄 | ✅ 已建立 |
| `theme_settings` | 主題設定 | ✅ 已建立 |
| `social_auth_connections` | 社交帳號連結 | ✅ 已建立 |
| `upload_progress` | 上傳進度記錄 | ✅ 已建立 |
| `media_processing_queue` | 媒體處理佇列 | ✅ 已建立 |
| `user_feedback` | 用戶回饋 | ✅ 已建立 |
| (更多 1 個) | ... | ✅ 已建立 |

### M. 內容與行銷 (5 表)

| 表名 | 用途 | 狀態 |
|------|------|------|
| `blog_posts` | 部落格文章 | ✅ 已建立 |
| `blog_analytics` | 部落格分析 | ✅ 已建立 |
| `Glossary_Terms` | 術語表 | ✅ 已建立 |
| `property_faqs` | 物件 FAQ | ✅ 已建立 |
| `nearby_facilities` | 鄰近設施 | ✅ 已建立 |

### N. 特殊功能 (4 表)

| 表名 | 用途 | 狀態 |
|------|------|------|
| `comfyui_styles` | ComfyUI 風格設定 | ✅ 已建立 |
| `virtual_phone_numbers` | 虛擬電話號碼 | ✅ 已建立 |
| `call_logs` | 通話記錄 | ✅ 已建立 |
| `ai_conversations` | AI 對話歷史 | ✅ 已建立 |

### O. 系統管理與超級管理員 (30+ 表)

| 表名 | 用途 | 狀態 |
|------|------|------|
| `roles` | 角色定義 | ✅ 已建立 |
| `permissions` | 權限定義 | ✅ 已建立 |
| `role_permissions` | 角色權限對應 | ✅ 已建立 |
| `platform_settings` | 平臺設定 | ✅ 已建立 |
| `llm_configs` | LLM 模型配置 | ✅ 已建立 |
| `seo_configs` | SEO 設定 | ✅ 已建立 |
| `notification_templates` | 通知模板 | ✅ 已建立 |
| `currencies` | 貨幣設定 | ✅ 已建立 |
| `exchange_rates` | 匯率 | ✅ 已建立 |
| `i18n_glossary` | 國際化辭彙 | ✅ 已建立 |
| `regions_settings` | 地區設定 | ✅ 已建立 |
| `whitelist_blacklist` | 白名單/黑名單 | ✅ 已建立 |
| `rate_limit_configs` | 速率限制配置 | ✅ 已建立 |
| `audit_logs` | 審計日誌 | ✅ 已建立 |
| `api_call_logs` | API 呼叫日誌 | ✅ 已建立 |
| `error_logs` | 錯誤日誌 | ✅ 已建立 |
| `system_maintenance_logs` | 系統維護日誌 | ✅ 已建立 |
| `backup_restore_logs` | 備份恢復日誌 | ✅ 已建立 |
| `ai_performance_metrics` | AI 效能指標 | ✅ 已建立 |
| `web_analytics` | 網站分析 | ✅ 已建立 |
| `users_track_history` | 用戶追蹤歷史 | ✅ 已建立 |
| `tax_rates` | 稅率設定 | ✅ 已建立 |
| `webhook_configs` | Webhook 配置 | ✅ 已建立 |
| `elasticsearch_indices` | ElasticSearch 索引 | ✅ 已建立 |
| `perf_metrics` | 效能監控指標 | ✅ 已建立 |
| (更多 5+ 個) | ... | ✅ 已建立 |

---

## 🆕 新增表格詳細說明

### 1. property_documents (物件文件管理表)

**用途**：統一管理所有與物件相關的文件，追蹤 OCR 處理狀態與驗證流程。

**核心欄位**：

```sql
CREATE TABLE property_documents (
    id UUID PRIMARY KEY,
    property_id UUID,                  -- 關聯物件
    owner_id UUID NOT NULL,            -- 擁有者
    document_type TEXT NOT NULL,       -- 'building_title', 'lease_contract', etc.
    file_path TEXT NOT NULL,           -- Storage 路徑

    -- OCR 處理
    ocr_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    ocr_parsing_log_id UUID,           -- 關聯 ocr_parsing_logs
    ocr_confidence_score NUMERIC(5,2),

    -- 驗證
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID,
    verified_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**關聯**：
- `owner_id` → `users_profile.id`
- `ocr_parsing_log_id` → `ocr_parsing_logs.id`
- `verified_by` → `users_profile.id`

**索引**：
- `idx_property_documents_property` (property_id)
- `idx_property_documents_owner` (owner_id)
- `idx_property_documents_ocr_status` (ocr_status)

---

### 2. email_verifications (郵件驗證表)

**用途**：管理用戶郵箱驗證流程，支援註冊驗證、郵箱變更等場景。

**核心欄位**：

```sql
CREATE TABLE email_verifications (
    id UUID PRIMARY KEY,
    user_id UUID,                      -- 使用者
    email TEXT NOT NULL,               -- 待驗證郵箱
    verification_token TEXT UNIQUE,    -- 驗證令牌
    status TEXT DEFAULT 'pending',     -- 'pending', 'verified', 'expired'
    expires_at TIMESTAMPTZ,            -- 過期時間
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**關聯**：
- `user_id` → `users_profile.id`

**特殊功能**：
- 自動過期函數 `expire_email_verifications()`
- 24小時有效期

---

### 3. identity_verification_records (實名認證記錄表)

**用途**：管理使用者實名認證流程，包含證件上傳、OCR 辨識、人工審核。

**核心欄位**：

```sql
CREATE TABLE identity_verification_records (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    verification_type TEXT NOT NULL,   -- 'id_card', 'passport', 'driver_license'

    -- 身份資訊（加密）
    full_name TEXT NOT NULL,
    id_number_encrypted TEXT,
    date_of_birth DATE,

    -- 文件路徑
    document_front_path TEXT,          -- 證件正面
    document_back_path TEXT,           -- 證件背面
    selfie_path TEXT,                  -- 手持證件自拍

    -- OCR 與 AI 驗證
    ocr_extracted_data JSONB,
    ai_risk_score NUMERIC(5,2),        -- 風險分數 0-100
    face_match_score NUMERIC(5,2),     -- 人臉比對分數

    -- 審核狀態
    status TEXT DEFAULT 'pending',     -- 'pending', 'approved', 'rejected'
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,

    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ             -- 認證有效期（1-2年）
);
```

**關聯**：
- `user_id` → `users_profile.id`
- `reviewed_by` → `users_profile.id`

**安全性**：
- `id_number_encrypted` 使用加密存儲
- 敏感資料僅超級管理員可存取

---

### 4. payment_transactions (支付交易表)

**用途**：記錄所有支付交易的詳細資訊，整合第三方支付平台。

**核心欄位**：

```sql
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    property_id UUID,

    -- 交易資訊
    transaction_type TEXT NOT NULL,    -- 'rent_payment', 'deposit_payment', etc.
    amount NUMERIC(12,2) NOT NULL,
    currency_code TEXT DEFAULT 'TWD',

    -- 支付方式
    payment_method TEXT NOT NULL,      -- 'bank_transfer', 'credit_card', 'stripe'
    payment_provider TEXT,             -- 'stripe', 'ecpay', 'line_pay'

    -- 狀態
    status TEXT DEFAULT 'pending',     -- 'pending', 'completed', 'failed', 'refunded'

    -- 交易識別
    transaction_reference TEXT UNIQUE, -- 內部交易編號 (自動生成)
    external_transaction_id TEXT,      -- 第三方平台交易 ID

    -- 時間戳
    initiated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- 關聯
    invoice_id UUID                    -- 關聯發票
);
```

**關聯**：
- `user_id` → `users_profile.id`
- `invoice_id` → `invoice_records.id`

**自動化**：
- 觸發器自動生成 `transaction_reference` (格式: `TXN-20260131-XXXX`)

---

### 5. invoice_records (發票記錄表)

**用途**：管理所有發票的開立、發送與追蹤，支援電子發票整合。

**核心欄位**：

```sql
CREATE TABLE invoice_records (
    id UUID PRIMARY KEY,
    invoice_number TEXT UNIQUE,        -- 發票號碼 (自動生成)
    invoice_type TEXT NOT NULL,        -- 'rent', 'sale', 'service'

    -- 關聯
    landlord_id UUID NOT NULL,
    tenant_id UUID,
    property_id UUID,
    payment_transaction_id UUID,

    -- 金額
    subtotal NUMERIC(12,2) NOT NULL,
    tax_rate NUMERIC(5,2) DEFAULT 5.00,
    tax_amount NUMERIC(12,2),          -- 自動計算
    total_amount NUMERIC(12,2),        -- 自動計算

    -- 狀態
    status TEXT DEFAULT 'draft',       -- 'draft', 'issued', 'paid', 'cancelled'
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    is_paid BOOLEAN DEFAULT FALSE,

    -- 電子發票
    e_invoice_number TEXT UNIQUE,      -- 政府電子發票號碼
    e_invoice_carrier TEXT,            -- 手機條碼
    e_invoice_upload_status TEXT,

    -- 買賣方資訊
    buyer_name TEXT NOT NULL,
    buyer_tax_id TEXT,                 -- 統一編號
    seller_name TEXT NOT NULL,
    seller_tax_id TEXT NOT NULL,

    -- 品項明細
    line_items JSONB DEFAULT '[]',     -- 發票項目清單

    -- 檔案
    pdf_path TEXT,                     -- PDF 發票路徑
    xml_path TEXT,                     -- 電子發票 XML

    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**關聯**：
- `landlord_id` → `users_profile.id`
- `tenant_id` → `users_profile.id`
- `payment_transaction_id` → `payment_transactions.id`

**自動化**：
- 觸發器自動生成 `invoice_number` (格式: `INV-20260131-XXXX`)
- 觸發器自動計算 `tax_amount` 和 `total_amount`

---

## 🔗 表格關聯圖

### 核心關聯架構

```
users_profile (用戶)
    │
    ├─── Property_Sales / Property_Rentals (物件)
    │      │
    │      ├─── property_documents 🆕 (文件管理)
    │      │      └─── ocr_parsing_logs (OCR 記錄)
    │      │
    │      ├─── contracted_tenants / contracted_buyers (成交客戶)
    │      │      └─── lease_agreements / sales_agreements (合約)
    │      │             └─── payment_transactions 🆕 (交易)
    │      │                    └─── invoice_records 🆕 (發票)
    │      │
    │      ├─── leads_tenants / leads_buyers (潛客)
    │      │      └─── viewing_appointments (預約)
    │      │
    │      └─── rental_ledger / sales_ledger (帳務)
    │
    ├─── email_verifications 🆕 (郵件驗證)
    │
    ├─── identity_verification_records 🆕 (實名認證)
    │
    ├─── agent_authorizations (仲介授權)
    │
    └─── bank_accounts (銀行帳戶)
```

---

## 📐 命名規範

### 表格命名

| 規則 | 範例 | 說明 |
|------|------|------|
| **新表** | snake_case | `property_documents`, `email_verifications` |
| **舊表** | PascalCase | `Property_Sales`, `Lease_Agreements` (逐步遷移中) |

### 欄位命名

| 類型 | 規則 | 範例 |
|------|------|------|
| **一般欄位** | snake_case | `property_id`, `monthly_rent` |
| **布林值** | is_ / has_ | `is_verified`, `has_pets` |
| **時間戳** | _at 後綴 | `created_at`, `verified_at` |
| **外鍵** | _id 後綴 | `owner_id`, `property_id` |

### 狀態欄位值

統一使用 **小寫 + 底線** 格式：

```sql
status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
```

---

## 🚀 索引策略

### 索引類型

1. **單欄位索引**：常用查詢欄位
   ```sql
   CREATE INDEX idx_property_documents_owner ON property_documents(owner_id);
   ```

2. **複合索引**：多條件查詢
   ```sql
   CREATE INDEX idx_rental_ledger_property_date
   ON rental_ledger(property_id, transaction_date DESC);
   ```

3. **部分索引**：條件過濾
   ```sql
   CREATE INDEX idx_email_verifications_pending
   ON email_verifications(expires_at) WHERE status = 'pending';
   ```

4. **GIN 索引**：JSONB 與陣列
   ```sql
   CREATE INDEX idx_property_documents_tags
   ON property_documents USING gin(tags);
   ```

### 效能優化建議

- 為 `WHERE` 子句常用欄位建立索引
- 外鍵欄位必須有索引
- `created_at` / `updated_at` 建立降序索引（`DESC`）
- 避免過度索引（每個表格 < 10 個索引）

---

## 🔒 RLS 政策概覽

### 政策分層

1. **L1: 使用者層**
   - 使用者僅能存取自己的資料
   - 仲介可查看授權房東的資料

2. **L2: 物件層**
   - 房東管理自己的物件
   - 仲介可查看/管理授權物件

3. **L3: 交易層**
   - 房東查看物件相關交易
   - 租客查看自己的交易記錄

4. **L4: 超級管理員**
   - 完整存取所有資料

### 新增表格 RLS 政策

#### property_documents

```sql
-- 房東管理自己的文件
CREATE POLICY "landlords_manage_own_documents"
ON property_documents FOR ALL
USING (auth.uid() = owner_id);

-- 仲介查看授權物件文件
CREATE POLICY "agents_view_authorized_documents"
ON property_documents FOR SELECT
USING (public.is_owner_or_authorized_agent(auth.uid(), owner_id, property_id));
```

#### email_verifications

```sql
-- 使用者僅能查看/更新自己的驗證記錄
CREATE POLICY "users_view_own_verifications"
ON email_verifications FOR SELECT
USING (auth.uid() = user_id);
```

#### identity_verification_records

```sql
-- 使用者查看自己的認證記錄
CREATE POLICY "users_view_own_verification"
ON identity_verification_records FOR SELECT
USING (auth.uid() = user_id);

-- 超級管理員管理所有認證
CREATE POLICY "super_admins_manage_verifications"
ON identity_verification_records FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users_profile
        WHERE id = auth.uid() AND role = 'super_admin'
    )
);
```

#### payment_transactions

```sql
-- 使用者查看自己的交易
CREATE POLICY "users_view_own_transactions"
ON payment_transactions FOR SELECT
USING (auth.uid() = user_id);

-- 房東查看物件相關交易
CREATE POLICY "landlords_view_property_transactions"
ON payment_transactions FOR SELECT
USING (
    property_id IN (
        SELECT id FROM Property_Sales WHERE owner_id = auth.uid()
        UNION
        SELECT id FROM Property_Rentals WHERE owner_id = auth.uid()
    )
);
```

#### invoice_records

```sql
-- 房東管理自己開立的發票
CREATE POLICY "landlords_manage_own_invoices"
ON invoice_records FOR ALL
USING (auth.uid() = landlord_id);

-- 租客查看自己的發票
CREATE POLICY "tenants_view_own_invoices"
ON invoice_records FOR SELECT
USING (auth.uid() = tenant_id);
```

---

## 🛠️ 輔助函數清單

### 新增函數

#### 1. get_unverified_documents_count

```sql
get_unverified_documents_count(p_user_id UUID) RETURNS INTEGER
```

**用途**：取得使用者未驗證的文件數量

**範例**：
```sql
SELECT get_unverified_documents_count('user-uuid-here');
-- 返回: 3
```

---

#### 2. is_identity_verified

```sql
is_identity_verified(p_user_id UUID) RETURNS BOOLEAN
```

**用途**：檢查使用者是否已完成有效的實名認證

**範例**：
```sql
SELECT is_identity_verified('user-uuid-here');
-- 返回: TRUE 或 FALSE
```

---

#### 3. get_pending_payments_for_property

```sql
get_pending_payments_for_property(p_property_id UUID) RETURNS NUMERIC
```

**用途**：取得物件的待付款交易總額

**範例**：
```sql
SELECT get_pending_payments_for_property('property-uuid-here');
-- 返回: 50000.00
```

---

### 既有核心函數

#### 4. is_owner_or_authorized_agent

```sql
is_owner_or_authorized_agent(
    p_user_id UUID,
    p_landlord_id UUID,
    p_property_id UUID
) RETURNS BOOLEAN
```

**用途**：檢查使用者是否為物件擁有者或授權仲介

---

#### 5. check_agent_permission

```sql
check_agent_permission(
    p_agent_id UUID,
    p_landlord_id UUID,
    p_permission_key TEXT,
    p_property_id UUID
) RETURNS BOOLEAN
```

**用途**：檢查仲介是否有特定權限（考慮時效性與物件範圍）

---

#### 6. expire_email_verifications

```sql
expire_email_verifications() RETURNS VOID
```

**用途**：自動將過期的郵件驗證狀態更新為 `expired`

**執行方式**：定期執行（建議每小時）

---

## ✅ 資料完整性驗證

### 外鍵約束檢查

所有新增表格皆設定適當的外鍵約束：

```sql
-- property_documents
FOREIGN KEY (owner_id) REFERENCES users_profile(id) ON DELETE CASCADE
FOREIGN KEY (ocr_parsing_log_id) REFERENCES ocr_parsing_logs(id)

-- email_verifications
FOREIGN KEY (user_id) REFERENCES users_profile(id) ON DELETE CASCADE

-- identity_verification_records
FOREIGN KEY (user_id) REFERENCES users_profile(id) ON DELETE CASCADE
FOREIGN KEY (reviewed_by) REFERENCES users_profile(id)

-- payment_transactions
FOREIGN KEY (user_id) REFERENCES users_profile(id)
FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
FOREIGN KEY (invoice_id) REFERENCES invoice_records(id)

-- invoice_records
FOREIGN KEY (landlord_id) REFERENCES users_profile(id)
FOREIGN KEY (tenant_id) REFERENCES users_profile(id)
FOREIGN KEY (payment_transaction_id) REFERENCES payment_transactions(id)
```

### CHECK 約束

所有枚舉欄位使用 CHECK 約束確保資料有效性：

```sql
-- 範例
CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
CHECK (verification_type IN ('id_card', 'passport', 'driver_license'))
CHECK (payment_method IN ('bank_transfer', 'credit_card', 'stripe', ...))
```

### 唯一約束

關鍵識別欄位設定唯一約束：

```sql
-- 範例
UNIQUE(verification_token)                    -- email_verifications
UNIQUE(transaction_reference)                 -- payment_transactions
UNIQUE(invoice_number)                        -- invoice_records
UNIQUE(user_id, status) WHERE status = 'approved' -- identity_verification_records
```

---

## 📊 效能監控建議

### 查詢效能

1. **慢查詢追蹤**
   ```sql
   SELECT * FROM pg_stat_statements
   WHERE mean_exec_time > 1000  -- 超過 1 秒的查詢
   ORDER BY mean_exec_time DESC;
   ```

2. **索引使用率**
   ```sql
   SELECT schemaname, tablename, indexname, idx_scan
   FROM pg_stat_user_indexes
   WHERE idx_scan = 0  -- 未使用的索引
   ORDER BY tablename;
   ```

### 表格大小監控

```sql
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;
```

---

## 🔄 未來優化方向

### 1. 資料分區（Partitioning）

對於高增長表格考慮時間分區：

```sql
-- 範例：payment_transactions 按月分區
CREATE TABLE payment_transactions_2026_01
    PARTITION OF payment_transactions
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

**適用表格**：
- `payment_transactions`
- `audit_logs`
- `user_activity_logs`
- `api_call_logs`

### 2. 讀寫分離

考慮設定 Read Replicas 處理大量查詢：

- 主資料庫：寫入操作
- 從資料庫：報表、分析查詢

### 3. 快取策略

- 使用 Redis 快取熱門查詢結果
- 物件清單、使用者資料快取 5-15 分鐘
- 財務報表快取 1 小時

---

## 📝 Changelog

| 日期 | 版本 | 修改者 | 修改內容 |
|------|------|--------|----------|
| 2026-01-31 | 1.0 | Claude Opus 4.5 | 初始版本：新增 5 張核心表格、完整資料庫架構文件 |

---

## 📚 相關文檔

- [CLAUDE.md](../CLAUDE.md) - AI 開發規範
- [本專案檔案命名規則與新增文件歸檔總則](./本專案檔案命名規則與新增文件歸檔總則.md)
- [OCR 規劃報告](./OCR開發進度+使用+測試報告/OCR規劃報告.md)
- [Migration 檔案](../supabase/migrations/)

---

**文件結束**
