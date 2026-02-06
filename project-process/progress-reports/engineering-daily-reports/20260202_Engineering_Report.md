# 工程師每日工作報告 (Engineering Daily Report)

> **日期**: 2026-02-02  
> **工程師**: AI Assistant (Antigravity)  
> **工時**: 4 小時 (08:25 - 09:12)  
> **專案模組**: Access Control System (IAM)

---

## 1. 任務摘要 (Executive Summary)

本日主要工作為重新設計與實作系統的權限管理架構。捨棄了原有的靜態矩陣設計，轉而採用更具擴充性的 **Group-Based IAM (AWS Style)** 架構。完成了資料庫 Schema 遷移、前端管理後台 (Next.js) 開發，以及相關文件的標準化重整。

## 2. 完成事項詳情 (Detailed Accomplishments)

### 2.1 文件體系重整 (Documentation Restructuring)
- **清理舊文件**:
  - 移除了過時的 `complete_permission_matrix.md` 與 `permission_matrix_analysis.md`。
  - 清除了分散於各處的 access matrix 草稿。
- **建立新標準**:
  - 創建目錄結構: `docs/access-matrix-design-guidelines-and-process/` (含 design, flow, templates)。
  - 發布政策文件:
    - `FILE_NAMING_CONVENTION.md`: 規範命名格式 (YYYYMMDD_vX.X_Type_Desc)。
    - `ACCESS_CONTROL_POLICY.md`: 定義文件存取的單一真理來源 (SSOT)。
  - 撰寫新規範: `20260202_v1.0_Spec_IAM-Group-Based-System-Design.md`。
- **架構術語精煉 (Terminology Refinement)**:
  - 將 `Unified Object Interface` 更名為 **`Data Schema & Abstraction Layer`**。
  - 將 `properties` 更名為 **`unified_properties_view` (Unified Property Index)**，明確區分 SQL View 與一般 Table。
  - 在架構文件中明訂 **View (查詢用的菜單)** 與 **RPC (特殊運算用的訂單)** 的使用場景區別。

### 2.2 資料庫架構實作 (Database Implementation)
- **Schema Migration (`20260202000000_create_iam_group_system.sql`)**:
  - 建立核心表格: `iam_groups`, `iam_roles`, `iam_group_members`, `iam_group_roles`。
  - 實作安全視圖: `iam_users_view` (用於安全地暴露 `auth.users` 給管理後台)。
  - 實作預存程序: `get_user_roles(user_id)`，用於遞迴計算使用者的有效權限 (Direct + Group)。
- **資料初始化**:
  - 預設角色: `super_admin`, `landlord`, `tenant`, `vendor`, `auditor`。
  - 預設群組: `Administrators`, `Standard Landlords`, `Active Tenants`。
  - 啟用 RLS (Row Level Security) 保護所有 IAM 表格。

### 2.3 前端管理後台開發 (Frontend Development - Next.js)
- **套件整合**:
  - 引入 `@casl/react`, `@casl/ability` 處理前端權限邏輯。
  - 引入 `@tanstack/react-table` 處理複雜資料表格。
- **頁面開發**:
  - **群組管理 (`/admin/groups`)**: 顯示群組列表、成員計數及掛載的角色。
  - **使用者管理 (`/admin/users`)**: 顯示使用者列表，支援將使用者指派至特定群組 (Modal UI)。
- **基礎設施**:
  - 建立 `utils/supabase/server.ts` 與 `client.ts` 處理 SSR/CSR 連線。
  - 建立 `lib/permissions/roleService.ts` 封裝權限查詢邏輯。

### 2.4 技術問題排除 (Troubleshooting)
- **Next.js 啟動錯誤**: 解決 `invalid digit found in string` 錯誤，透過清除 `.next` 緩存並使用 `--turbo` 標籤重啟。
- **路徑解析錯誤**: 修復 `actions.ts` 中 `@/utils/...` alias 路徑無法解析的問題，補全了缺少的工具檔案。

---

## 3. 程式碼變更摘要 (Code Changes Summary)

| 類型    | 檔案路徑                                              | 變更說明                     |
| :------ | :---------------------------------------------------- | :--------------------------- |
| **SQL** | `supabase/migrations/20260202...iam_group_system.sql` | 建立 IAM 核心表格與 RLS      |
| **SQL** | `supabase/migrations/20260202...iam_users_view.sql`   | 建立使用者列表視圖           |
| **Doc** | `docs/access-matrix-design.../20260202...Spec...md`   | 權限系統設計規格書           |
| **TSX** | `apps/web/app/admin/groups/page.tsx`                  | 群組列表頁面                 |
| **TSX** | `apps/web/app/admin/users/page.tsx`                   | 使用者管理頁面               |
| **TS**  | `apps/web/lib/permissions/ability.ts`                 | CASL 權限定義                |
| **TS**  | `apps/web/utils/supabase/*.ts`                        | Supabase Client/Server Utils |

---

## 4. 待辦事項 (Todolist)

- [ ] 完成「角色 (Role)」的 CRUD 管理介面 (目前僅能從資料庫修改)。
- [ ] 實作更細緻的 CASL 規則 (將 'manage property' 具體對應到 RLS)。
- [ ] 補充使用者移除群組的確認對話框 UI 優化。
