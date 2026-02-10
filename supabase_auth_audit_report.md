# Supabase Auth & Permission Audit Report

**Date:** 2026-02-10  
**Environment:** Local Development (`localhost:54323`)  
**Scope:** Auth, Roles, Groups, Permissions (RLS), Functions, Frontend Routes

---

## 1. 使用者統計 (User Statistics)

目前系統中共有 **3** 位使用者，全數皆已驗證 email。

| Metric | Count |
| :--- | :--- |
| **Total Users** | 3 |
| **Verified** | 3 (100%) |
| **Unverified** | 0 (0%) |

**詳細清單：**

| Email | Created At | Last Sign In | Status |
| :--- | :--- | :--- | :--- |
| `superadmin@example.com` | 2026-02-10 03:00:30 | 2026-02-10 03:00:30 | Verified |
| `test-tenant@example.com` | 2026-02-10 03:00:30 | 2026-02-10 03:00:30 | Verified |
| `test-landlord@example.com` | 2026-02-10 03:00:30 | 2026-02-10 03:00:30 | Verified |

---

## 2. 角色分析 (Role Analysis)

系統目前採用混合式角色管理：
1.  **Legacy/Simple**: `users_profile.roles` (Array)
2.  **IAM System**: `iam_roles` (Table)

**使用者分佈 (基於 `users_profile`)：**

| Role Name | User Count | Description |
| :--- | :--- | :--- |
| `super_admin` | 1 | 系統最高管理者 |
| `landlord` | 1 | 房東 (Property Owner) |
| `tenant` | 1 | 租客 |

**IAM 角色定義清單 (`iam_roles`)：**
-   `super_admin`: Full system access with no restrictions
-   `landlord`: Property owner access
-   `tenant`: Tenant access
-   `vendor`: Service provider access
-   `auditor`: Read-only access to financial records
-   `potential_tenant`: Limited access

---

## 3. 群組盤點 (Group Analysis)

目前 IAM 群組系統 (`iam_groups`) 已建立但尚未投入使用（無成員）。

| Group Name | Description | Members | System Managed |
| :--- | :--- | :--- | :--- |
| **Administrators** | System Super Admins | 0 | Yes |
| **Standard Landlords** | Default group for new registered landlords | 0 | No |
| **Active Tenants** | Tenants with at least one active contract | 0 | No |

**建議：** 需將現有使用者遷移至對應的 IAM 群組中，以發揮群組權限管理的效益。

---

## 4. 細部權限矩陣 (Detailed Permission Matrix)

### 4.1 資料表存取權限 (RLS Policies)

以下列出關鍵資料表的 Row Level Security (RLS) 策略摘要：

| Table | Policy Name | Roles | Operation | Condition (Who can access) |
| :--- | :--- | :--- | :--- | :--- |
| **users_profile** | `public_view_basic_profiles` | anon, auth | SELECT | `true` (公開可讀基本資料) |
| **users_profile** | `users_view_own_profile` | public | SELECT | `auth.uid() = id` (僅自己可讀詳細資料) |
| **users_profile** | `users_update_own_profile` | public | UPDATE | `auth.uid() = id` (僅自己可修) |
| **properties** | `anyone_view_published_properties` | public | SELECT | `status = 'published'` |
| **properties** | `landlords_manage_own_properties` | public | ALL | `owner_id = auth.uid()` |
| **property_documents** | `landlords_manage_own_documents` | public | ALL | `owner_id = auth.uid()` |
| **user_sessions** | `Users can view their own sessions` | public | SELECT | `user_id = auth.uid()` |

### 4.2 函式執行權限 (Function Grants)

所有自訂函式目前皆位於 `public` schema，且大多數預設授權給 `PUBLIC` (anon + authenticated) 執行。

**高風險函式注意：**

| Function | Type | Security Definer | Risk Level | Description |
| :--- | :--- | :--- | :--- | :--- |
| `add_user_role` | RPC | **YES** | **HIGH** | 允許新增角色。若無內部權限檢查，可能被濫用提升權限。 |
| `switch_user_role` | RPC | **YES** | Medium | 允許使用者切換自身角色。 |
| `get_user_roles` | RPC | **YES** | Low | 查詢使用者角色。 |

---

## 5. 頁面存取控制 (Page Access Control)

前端應用 (`apps/web` & `apps/superadmin`) 透過 Middleware 與 Layout 進行路由保護。

### 5.1 公開頁面 (Public Routes)
-   `/` (Home)
-   `/login`, `/register`, `/forgot-password` (Auth)
-   `/about`, `/contact`, `/pricing`, `/services`
-   `/properties/*` (個別房源查看)

### 5.2 受保護頁面 (Protected Routes)

| Route Prefix | Required Role | App | Redirect Logic |
| :--- | :--- | :--- | :--- |
| `/landlord/*` | `landlord` | Web | 導向 `/login` 或 `/landlord/dashboard` |
| `/tenant/*` | `tenant` | Web | 導向 `/login` 或 `/tenant/dashboard` |
| `/buyer/*` | `buyer` | Web | 導向 `/login` 或 `/buyer/dashboard` |
| `/superadmin/*`| `super_admin` | Superadmin | 導向 `/login` (Port 3001) |

---

## 6. 安全建議 (Security Recommendations)

### 🔴 嚴重 (Critical)
1.  **`add_user_role` 函式權限過大**：
    -   **問題**：該函式為 `SECURITY DEFINER` 且開放給 `PUBLIC` 執行。雖然參數需要 `user_id`，但若未在函式內檢查「呼叫者是否為 Super Admin」，任何登入使用者可能透過 RPC 呼叫為自己或他人新增 `super_admin` 角色。
    -   **建議**：立即撤銷 `PUBLIC` 執行權限，僅授權給 `service_role`，或在函式內加入嚴格的權限檢查（如 `IF NOT is_super_admin(auth.uid()) THEN RAISE EXCEPTION ...`）。

### 🟡 中等 (Medium)
1.  **IAM 群組未啟用**：
    -   **問題**：`iam_groups` 與 `iam_group_members` 資料表為空，目前的權限檢查仍依賴 `users_profile.roles`。
    -   **建議**：完成 IAM 遷移，將 `users_profile` 的角色邏輯同步至 `iam_user_roles` 或 `iam_group_members`，統一管理模型。

### 🟢 低 (Low)
1.  **公開函式暴露**：
    -   **問題**：大量工具函式（如 `generate_invoice_number`）暴露給 `PUBLIC`。雖然可能無直接寫入風險，但增加了攻擊面。
    -   **建議**：移除不必要的 `GRANT EXECUTE TO PUBLIC`，僅對前端確實需要呼叫的 RPC 函式開放。

---

## 7. 附錄

### 自動化盤點工具
請使用隨附的 `supabase_audit_queries.sql` 進行定期盤點。

**建議執行週期：**
-   每週一次（開發階段）
-   每次重大版本發布前（Production）

**執行方式：**
```bash
# 需安裝 Supabase CLI 或 PostgreSQL Client
psql "postgresql://postgres:postgres@localhost:54322/postgres" -f supabase_audit_queries.sql
```
