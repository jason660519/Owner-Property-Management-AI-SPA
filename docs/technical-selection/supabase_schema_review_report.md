# Supabase Schema 規劃審視報告

> **創建日期**: 2026-02-16  
> **創建者**: Claude  
> **版本**: 1.0  
> **文件類型**: 技術審視報告

---

## 1. 摘要

本報告針對專案 **Owner Real Estate Agent SaaS** 的 Supabase/PostgreSQL Schema 規劃進行審視，依據「依用途區分」「依可見性與存取權限」「自訂 Schema 命名模式」等維度評估現狀，並提出可行建議。

**結論概要**：目前所有業務表均置於 **單一 `public` Schema**，與 Supabase 預設行為一致、API 暴露單純；對現階段單一應用、中等規模表數量而言**整體得當**。若未來朝向模組邊界清晰、權限分層或多租戶隔離演進，可再考慮引入自訂 Schema。

---

## 2. 現狀總覽

### 2.1 Schema 使用情形

| Schema       | 用途說明                         | 本專案使用方式 |
|-------------|----------------------------------|----------------|
| **public**  | 應用程式主要資料表、視圖、函數   | ✅ 所有業務表、View、RPC、Trigger 均在此 |
| **auth**    | Supabase Auth 系統（users, sessions 等） | ✅ 僅透過 FK 參照 `auth.users(id)` 與 View 讀取，未直接建表 |
| **storage** | 儲存桶與物件中繼資料             | ✅ 僅在 RPC（如 `get_storage_summary`、`identify_orphaned_files`）及 Storage Policy 中讀寫 |
| **realtime**| 即時訂閱設定                     | 未在 migrations 中直接操作 |
| **自訂 Schema** | 無                             | 未建立任何 `CREATE SCHEMA` |

- **未建立**任何自訂 Schema（如 `business`、`analytics`、`iam`、`billing` 等）。此處「iam」指的是「一個名為 iam 的 **PostgreSQL Schema**」（命名空間），不是指 IAM 權限系統本身；見下方 2.1.1 名詞釐清。
- 有一張表 **未顯式寫出 schema**：`transfer_tokens`（依 `search_path` 落在 `public`），建議補上 `public.` 以一致且避免日後 search_path 變動影響。

#### 2.1.1 名詞釐清：PostgreSQL Schema vs IAM 權限系統

| 名詞 | 說明 | 本專案狀況 |
|------|----------|-------------|
| **PostgreSQL Schema** | 資料庫內的**命名空間**，用來放表、視圖、函數（例如 `public`、自訂的 `iam`、`analytics`）。建立「Schema iam」= 會有 `iam.xxx` 這種物件。 | **未**建立名為 `iam` 的 Schema；所有表都在 `public`。 |
| **IAM（Identity and Access Management）** | **權限管理系統**：誰有什麼角色、能存取什麼。通常用「角色／群組／成員」等表與 RLS 實作。 | **有**使用。實作在 `public` 內：`public.iam_roles`、`public.iam_groups`、`public.iam_group_members`、`public.iam_group_roles`、`public.iam_user_roles`，以及 RLS 輔助函數 `public.get_user_roles()`、`public.has_role()`。存取權由 IAM 角色＋RLS 控制。 |

結論：**本專案確實用 IAM 管理 access right**；只是 IAM 相關表與函數都放在 **`public` Schema**，以表名前綴 `iam_*` 區分，而非放在一個名為 `iam` 的獨立 PostgreSQL Schema。

### 2.2 public 內物件概略分類

依職責概分（同一實體可能在不同 migration 以不同命名出現，以下以主要/實際使用為準）：

| 分類             | 代表表格 / 視圖 / 函數 |
|------------------|------------------------|
| 身份與核心       | `users_profile`, `iam_roles`, `iam_groups`, `iam_group_members`, `iam_group_roles`, `iam_user_roles`, `roles`, `permissions`, `role_permissions`, `agent_authorizations` |
| 物件資產         | `Property_Sales`, `Property_Rentals`, `Property_Photos`, `Property_Inventory`, `property_documents`, `buildings_communities`, `media_gallery` 等 |
| 潛在客戶與預約   | `Leads_Tenants`, `Leads_Buyers`, `Viewing_Appointments_*`, `Tenant_Inquiries`, `Buyer_Intentions`, `landlord_customers` |
| 合約與交易       | `Lease_Agreements`, `Sales_Agreements`, `Contracted_*`, `Purchase_Offers`, `Payment_Workflow` |
| 財務與帳務       | `Rental_Ledger`, `Sales_Ledger`, `Earnest_Money_Receipts`, `Deposit_Receipts`, `payment_transactions`, `invoice_records` 等 |
| 營運與廠商       | `Agent_Directory`, `Maintenance_Vendors`, `Maintenance_Quotes`, `Interior_Designers`, `Escrow_Legal_Services` |
| AI 與設定        | `AI_Chat_Logs`, `ai_api_keys`, `ai_model_selections`, `ai_feature_modules`, `ai_system_prompts`, `ai_usage_logs`, `avialable_ai_models_and_version` 等 |
| 內容與支援       | `Blog_Posts`, `Glossary_Terms`, `System_Notifications`, `contact_messages`, `form_drafts` |
| 系統與 Superadmin| `platform_settings`, `llm_configs`, `audit_logs`, `api_call_logs`, `logs`, `users_track_history` 等 |
| 視圖與 RPC       | `public.properties`（Property_Sales + Property_Rentals 統一介面）, `public.users_profile_with_role`, `public.iam_users_view`（讀取 auth.users）, `get_user_roles`, `has_role`, `get_storage_summary`, `get_properties_without_blog_counts` 等 |

所有上述物件皆在 **public**，PostgREST 預設僅暴露 public，故目前 **API 可見範圍 = 整個 public**。

### 2.3 跨 Schema 依賴

- **auth**：多表 `REFERENCES auth.users(id)`；`public.iam_users_view` 從 `auth.users` 選欄位供 IAM 使用。未在 auth 建表，符合「僅透過 API/函數使用 Auth」的建議。
- **storage**：僅在 `public` 的 **SECURITY DEFINER** RPC 與 Storage Policy 中存取 `storage.objects` / `storage.buckets`，未把業務表建在 storage，符合 Supabase 使用方式。

---

## 3. 依「用途」維度評估

對照您提供的用途分類：

| 用途類型     | 說明           | 本專案對應 |
|-------------|----------------|------------|
| Public      | 主要業務資料   | ✅ 全部在 public，符合 |
| Auth        | 認證資料       | ✅ 僅引用 auth.users，不建表於 auth |
| Storage     | 儲存中繼資料   | ✅ 僅透過 RPC/Policy 使用 storage |
| Realtime    | 即時訂閱       | 未在 migrations 直接操作，可接受 |
| GraphQL     | 虛擬 Schema   | 未使用 pg_graphql，N/A |
| 自訂 Schema | 分層/多租戶等  | 未使用，見下節建議 |

結論：**依用途區分上，與 Supabase 預設模型一致，無不當之處。**

---

## 4. 依「可見性與存取權限」評估

- **API 可見**：僅暴露 public，且未在 Dashboard 的「exposed schemas」新增其他 schema，因此 **PostgREST 只會對 public 產生 REST 端點**，行為單一、可預期。
- **隱藏 Schema**：auth、storage、realtime 未暴露給 API，僅透過後端/函數使用，**符合安全與產品設計**。
- **RLS**：業務表均啟用 RLS，並以 `auth.uid()`、`get_user_roles`/`has_role`、owner_id 等做權限控制；IAM 相關表與 View 的存取範圍與專案需求一致。

結論：**可見性與權限設計與「僅 public 對外」的假設相符，無明顯風險。**

---

## 5. 自訂 Schema 命名模式與是否採用

目前**未**採用下列常見模式：

- 分層：如 `raw` / `business` / `analytics`
- 多租戶：如 `tenant_a` / `tenant_b`
- 功能模組：如 `billing` / `inventory` / `user_profiles`

對本專案現階段而言：

- 應用為**單一產品、單一 DB**，權限主要靠 **RLS + IAM 角色** 區分，而非 schema 邊界。
- 表數量雖多，但尚可透過**命名前綴**（如 `ai_*`、`iam_*`、`Property_*`）在 public 內區分模組。
- 若**未來**出現下列需求，再考慮引入自訂 Schema 會較有收益：
  - 需要**依 Schema 設定不同預設權限**（例如某 schema 僅 service_role 可讀寫）。
  - **報表/分析** 與線上業務要**強隔離**（例如獨立 `analytics` schema，由 ETL 寫入、不暴露給 PostgREST）。
  - **多租戶** 改為「一租戶一 schema」的硬隔離。
  - 大量使用會**自建很多表**的 extension（例如 TimescaleDB），希望集中在 `extensions` 或單一 schema 管理。

結論：**目前不採用自訂 Schema 是合理選擇；保留未來在確有需求時再拆分即可。**

---

## 6. 其他發現與建議

### 6.1 建議修正（低成本）

| 項目 | 說明 | 建議 |
|------|------|------|
| **transfer_tokens 未顯式 schema** | 建表時未寫 `public.`，依 search_path 落在 public | 在 migration 中改為 `CREATE TABLE public.transfer_tokens (...)`，並在後續新 migration 或同一檔中將索引、RLS、COMMENT 改為 `public.transfer_tokens`，保持一致性 |
| **文件與實作不一致** | CLAUDE.md 寫「unified_properties_view」為標準查詢介面 | 實際 View 名稱為 `public.properties`。建議在 CLAUDE.md 或架構文件中統一改為「`public.properties`（統一銷售/出租物件之 View）」避免誤解 |

### 6.2 命名一致性（中長期）

- 目前混用 **PascalCase**（如 `Property_Sales`, `Leads_Tenants`）與 **snake_case**（如 `users_profile`, `ai_api_keys`）。
- 若團隊偏好統一，可訂定「新表一律 snake_case」，舊表待大版本或重構時再考慮重新命名（需一併調整 FK、View、RPC、應用程式碼）。

### 6.3 search_path 與 SECURITY DEFINER

- 部分 RPC 已使用 `SET search_path = public`（例如 `get_properties_without_blog_counts`、`has_role`），有助於避免 search_path 注入與行為不確定。
- 建議：**所有 SECURITY DEFINER 函數** 皆顯式設定 `SET search_path = public`（或僅限必要 schema），以符合安全最佳實踐。

### 6.4 表數量與未來拆分

- 若 public 表數量持續增加，且團隊希望「模組邊界」更清晰，可**僅在未來**評估：
  - 將 **AI 相關**（ai_*、AI_Chat_Logs 等）遷至 `ai` 或 `features.ai`；
  - 將 **Superadmin/系統**（audit_logs、platform_settings、logs 等）遷至 `system` 或 `admin`。
- 若拆分，須在 Supabase Dashboard 的 **Database → API Settings → exposed schemas** 中加入對應 schema，否則 PostgREST 不會暴露該 schema 的端點。

---

## 7. 總結表（對照您提供的分類）

| Schema 名稱   | 主要用途               | API 是否可見 | 本專案狀態 |
|---------------|------------------------|--------------|------------|
| public        | 應用程式主要資料表     | 是（預設）   | ✅ 全部業務表與 View 在此 |
| auth          | 使用者認證與授權       | 否           | ✅ 僅 FK 與 View 引用 |
| storage       | 檔案儲存中繼資料       | 否           | ✅ 僅 RPC/Policy 使用 |
| realtime      | 即時訂閱設定           | 否           | 未在 migrations 直接操作 |
| graphql       | GraphQL 虛擬 Schema    | 否（GraphQL API） | 未使用 |
| 自訂 Schema   | 業務分層/多租戶等      | 需手動設定   | 未使用，現階段可接受 |

**整體結論**：  
本專案 Schema 規劃**與 Supabase 預設模型一致、權限與可見性設定合理**，對目前單一應用與規模而言**得當**。僅建議：  
1）將 `transfer_tokens` 顯式改為 `public.transfer_tokens`；  
2）文件與實作統一為 `public.properties`；  
3）所有 SECURITY DEFINER 函數設定 `search_path`；  
4）未來若有明確的模組邊界、多租戶或分析隔離需求，再評估引入自訂 Schema 並在 API Settings 中設定暴露範圍。
