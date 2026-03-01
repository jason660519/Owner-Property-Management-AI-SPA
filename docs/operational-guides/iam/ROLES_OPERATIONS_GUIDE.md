# IAM Roles Operations Guide

> **目的**：工程師在新增、編輯、觀察 IAM roles 時的**唯一參考文檔**。
>
> **涵蓋**：Roles 清單、資料庫結構、CRUD 操作、RLS 約定、測試檢查表。
>
> **最後更新**：2026-03-01 | **版本**：1.0

---

## 快速導航

- 👉 [系統架構](#系統架構) — Postgres vs 應用層、單一真相來源（Option A）
- 👉 [完整 Roles 清單](#完整-roles-清單)（14 種自定義角色）
- 👉 [資料庫操作](#資料庫操作) — 如何查詢、新增、編輯
- 👉 [前端 & RLS 約定](#前端--rls-約定) — 權限判斷規則
- 👉 [回歸測試檢查表](#回歸測試檢查表) — 上線驗證清單

---

## 系統架構

### 兩層角色系統

本系統採用 **Option A**：應用層角色以 **IAM 為單一真相來源**。

| 層級 | 系統 | 位置 | 用途 |
|------|------|------|------|
| **資料庫層** | PostgreSQL 內建角色 | Supabase Auth | 決定「誰能連線」(anon / authenticated / service_role) |
| **應用層** | 自定義業務角色 | `public.iam_roles` 表 | 決定「能做什麼」(landlord, tenant, agent, vendor 等) |

**關鍵約定**：
- Postgres 角色**不要**新增自訂角色（僅用 anon / authenticated / service_role）
- 所有業務角色來自 `iam_roles` 表
- RLS / 應用程式權限判斷使用 `has_role(auth.uid(), 'role_name')` 或 `get_user_roles(auth.uid())`
- `users_profile.role` 為**衍生欄位**（由 trigger 從 IAM 同步），**不是**權限判斷的來源

---

## 完整 Roles 清單

### 當前 14 種自定義角色

查詢實時資料庫（推薦）：

```sql
-- 查詢所有角色
SELECT id, name, description, created_at, parent_role_id
FROM public.iam_roles
ORDER BY name;

-- 查詢數量
SELECT COUNT(*) as total_roles FROM public.iam_roles;
```

### 角色參考表

| # | Role Name | 說明 | 主要權限範圍 | 群組來源 |
|---|-----------|------|-------------|---------|
| 1 | `super_admin` | 系統超級管理員 | 全系統存取、IAM 管理、Security Logs | Administrators |
| 2 | `system_engineer` | 系統工程師 | 系統設定可寫、infrastructure、日誌 | System Engineering Team |
| 3 | `cybersecurity_engineer` | 資安工程師 | Security Logs 全權、稽核唯讀 | Security Operations Center |
| 4 | `landlord` | 房東 / 物件擁有者 | 自有物件、租賃合約、仲介授權 | Standard Landlords |
| 5 | `agent` | 仲介 | 房東的仲介名單-協助房東處理物件 | Agents |
| 6 | `tenant` | 租客 | 自己的租約、繳費、維修申請 | Active Tenants |
| 7 | `contract_tenant` | 合約租客 | 同 tenant（已簽約）| Active Tenants |
| 8 | `potential_tenant` | 潛在租客 | 公開物件瀏覽、預約看房 | Potential Tenants |
| 9 | `buyer` | 買家 | 自己的買賣合約、相關文件 | Active Buyers |
| 10 | `contract_buyer` | 合約買方 | 同 buyer（已簽約）| Active Buyers |
| 11 | `potential_buyer` | 潛在買方 | 公開物件瀏覽、預約看房 | Potential Buyers |
| 12 | `vendor` | 廠商 / 服務提供者 | 被指派的工單（Work Orders） | Vendors |
| 13 | `auditor` | 稽核 / 財務審查 | 財務與稽核相關唯讀 | Financial Auditors |
| 14 | `register` | 已註冊用戶 | 基礎存取（新用戶初始角色） | Registered Users |

**備註**：
- `unregister` 為遺留角色（已棄用），可忽略或在 migration 中移除
- 資料庫中實時數量以 SQL 查詢為準，不同時期可能新增自訂角色

---

## 資料庫操作

### 表結構

```sql
-- 主表
CREATE TABLE public.iam_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,           -- 角色名稱（landlord, tenant 等）
  description TEXT,                    -- 說明
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  parent_role_id UUID REFERENCES iam_roles(id) -- 父角色（層級關係，可選）
);

-- 群組表（包含使用者及其角色）
CREATE TABLE public.iam_groups (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,           -- 群組名稱（Standard Landlords 等）
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 群組-角色 關聯
CREATE TABLE public.iam_group_roles (
  id UUID PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES iam_groups(id),
  role_id UUID NOT NULL REFERENCES iam_roles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, role_id)
);

-- 群組-使用者 關聯
CREATE TABLE public.iam_group_members (
  id UUID PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES iam_groups(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- 使用者-角色 關聯（直接賦予，無需群組）
CREATE TABLE public.iam_user_roles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role_id UUID NOT NULL REFERENCES iam_roles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role_id)
);
```

### CRUD 操作

#### 查詢

```sql
-- 1. 查詢所有角色
SELECT * FROM public.iam_roles ORDER BY name;

-- 2. 查詢特定角色
SELECT * FROM public.iam_roles WHERE name = 'landlord';

-- 3. 查詢使用者的所有角色（含群組）
SELECT DISTINCT ir.name
FROM public.iam_roles ir
LEFT JOIN public.iam_group_roles igr ON ir.id = igr.role_id
LEFT JOIN public.iam_group_members igm ON igr.group_id = igm.group_id
LEFT JOIN public.iam_user_roles iur ON ir.id = iur.role_id
WHERE igm.user_id = 'user_uuid_here' OR iur.user_id = 'user_uuid_here'
ORDER BY ir.name;

-- 4. 查詢群組及其角色
SELECT g.name as group_name, STRING_AGG(r.name, ', ' ORDER BY r.name) as roles
FROM public.iam_groups g
LEFT JOIN public.iam_group_roles gr ON g.id = gr.group_id
LEFT JOIN public.iam_roles r ON gr.role_id = r.id
GROUP BY g.id, g.name
ORDER BY g.name;
```

#### 新增角色

**方式 1：SQL 直接插入**

```sql
INSERT INTO public.iam_roles (name, description)
VALUES ('custom_role_name', '角色說明文字')
ON CONFLICT (name) DO NOTHING
RETURNING id, name;
```

**方式 2：Migration 檔案**

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_custom_role.sql
INSERT INTO public.iam_roles (name, description)
VALUES
  ('custom_role_1', '說明'),
  ('custom_role_2', '說明')
ON CONFLICT (name) DO NOTHING;
```

**方式 3：Superadmin 後台**（若已實作）

- 登入 http://localhost:3001/superadmin/dashboard/iam-management#roles
- 點擊「新增角色」，填入名稱與說明
- 系統會自動插入 `iam_roles` 並更新相關群組

#### 編輯角色

```sql
-- 更新角色說明
UPDATE public.iam_roles
SET description = '更新後的說明'
WHERE name = 'role_name';

-- 更新角色名稱（謹慎！會影響 RLS）
UPDATE public.iam_roles
SET name = 'new_role_name'
WHERE id = 'role_id_here';
-- ⚠️ 若 RLS 已硬編碼此角色名，需同步更新 policy
```

#### 刪除角色

```sql
-- 軟刪除：標記為非活躍（推薦）
UPDATE public.iam_roles
SET is_active = false  -- 若表有此欄位
WHERE name = 'role_name';

-- 硬刪除：直接移除（謹慎！檢查是否有使用者持有）
DELETE FROM public.iam_user_roles WHERE role_id = (SELECT id FROM iam_roles WHERE name = 'role_name');
DELETE FROM public.iam_group_roles WHERE role_id = (SELECT id FROM iam_roles WHERE name = 'role_name');
DELETE FROM public.iam_roles WHERE name = 'role_name';
```

### 觀察 iam_roles 表

#### 監控使用情況

```sql
-- 查詢每個角色的使用者數量
SELECT
  ir.name,
  COUNT(DISTINCT iur.user_id) as direct_users,
  COUNT(DISTINCT igm.user_id) as via_groups,
  COUNT(DISTINCT COALESCE(iur.user_id, igm.user_id)) as total_users
FROM public.iam_roles ir
LEFT JOIN public.iam_user_roles iur ON ir.id = iur.role_id
LEFT JOIN public.iam_group_roles igr ON ir.id = igr.role_id
LEFT JOIN public.iam_group_members igm ON igr.group_id = igm.group_id
GROUP BY ir.name
ORDER BY total_users DESC;

-- 查詢孤立角色（無人持有、無群組指派）
SELECT ir.name
FROM public.iam_roles ir
LEFT JOIN public.iam_user_roles iur ON ir.id = iur.role_id
LEFT JOIN public.iam_group_roles igr ON ir.id = igr.role_id
WHERE iur.role_id IS NULL AND igr.role_id IS NULL
ORDER BY ir.name;
```

---

## 前端 & RLS 約定

### RLS 權限判斷

**禁止做法**（舊方式，正在淘汰）：

```sql
-- ❌ 不要直接讀取 profile.role
WHERE users_profile.role = 'landlord'
```

**推薦做法**（新 RLS 必用）：

```sql
-- ✅ 使用 has_role() helper
WHERE auth.has_role(auth.uid(), 'landlord')

-- ✅ 或使用 get_user_roles()
WHERE 'landlord' = ANY(auth.get_user_roles(auth.uid()))
```

### Helper 函數

```sql
-- 定義在 Supabase 的 public schema
-- has_role(user_id, role_name) -> boolean
CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    -- 直接角色
    SELECT 1 FROM public.iam_user_roles iur
    JOIN public.iam_roles ir ON iur.role_id = ir.id
    WHERE iur.user_id = p_user_id AND ir.name = p_role_name
    UNION ALL
    -- 透過群組的角色
    SELECT 1 FROM public.iam_group_members igm
    JOIN public.iam_group_roles igr ON igm.group_id = igr.group_id
    JOIN public.iam_roles ir ON igr.role_id = ir.id
    WHERE igm.user_id = p_user_id AND ir.name = p_role_name
  );
END;
$$ LANGUAGE PLPGSQL STABLE;

-- get_user_roles(user_id) -> TEXT[]
CREATE OR REPLACE FUNCTION public.get_user_roles(p_user_id UUID)
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY_AGG(DISTINCT ir.name) FROM (
    -- 直接角色
    SELECT ir.name FROM public.iam_user_roles iur
    JOIN public.iam_roles ir ON iur.role_id = ir.id
    WHERE iur.user_id = p_user_id
    UNION ALL
    -- 透過群組的角色
    SELECT ir.name FROM public.iam_group_members igm
    JOIN public.iam_group_roles igr ON igm.group_id = igr.group_id
    JOIN public.iam_roles ir ON igr.role_id = ir.id
    WHERE igm.user_id = p_user_id
  ) ir;
END;
$$ LANGUAGE PLPGSQL STABLE;
```

### 前端使用

```typescript
// Server Action / Server Component
import { createClient } from '@/utils/supabase/server';

export async function getUserRoles(userId: string) {
  const supabase = createClient();
  const { data: roles } = await supabase
    .rpc('get_user_roles', { p_user_id: userId });
  return roles || [];
}

export async function checkHasRole(userId: string, roleName: string) {
  const supabase = createClient();
  const { data: hasRole } = await supabase
    .rpc('has_role', { p_user_id: userId, p_role_name: roleName });
  return hasRole || false;
}
```

---

## 回歸測試檢查表

> **用途**：IAM 角色系統上線或更新後，驗證各角色存取符合預期。
>
> **執行方式**：手動操作（逐項勾選）或編寫 E2E 自動化測試。

### 1. 註冊與 IAM 同步

| # | 情境 | 預期結果 | ✓ |
|---|------|---------|:--:|
| 1.1 | 新用戶註冊（role = landlord） | ✓ 註冊成功；users_profile 有該筆；加入 Standard Landlords 群組；profile.role = landlord（由 trigger 同步） | ☐ |
| 1.2 | 新用戶註冊（role = agent） | ✓ 同上；加入 Agents 群組；profile.role = agent | ☐ |
| 1.3 | OAuth 首次登入（無 profile） | ✓ 自動建立 profile；加入 Standard Landlords；redirect 至 landlord dashboard | ☐ |
| 1.4 | 使用邀請碼登入（邀請 role = landlord） | ✓ 加入指定群組或 Standard Landlords；profile.role 由 trigger 更新 | ☐ |

### 2. 房東 (landlord) 權限驗證

| # | 情境 | 預期結果 | ✓ |
|---|------|---------|:--:|
| 2.1 | 登入後進入 landlord dashboard | ✓ 可進入；僅看到自己相關的導航與內容 | ☐ |
| 2.2 | 列出物件 | ✓ 僅顯示 `owner_id = 自己` 的銷售/出租物件（RLS 過濾） | ☐ |
| 2.3 | 建立/編輯/刪除物件 | ✓ 僅能操作自己的物件；嘗試他人物件時被拒絕（403） | ☐ |
| 2.4 | 仲介授權管理 | ✓ 可建立/編輯 agent_authorizations（landlord_id = 自己）；查看授權清單 | ☐ |

### 3. 仲介 (agent) 權限驗證

| # | 情境 | 預期結果 | ✓ |
|---|------|---------|:--:|
| 3.1 | 登入後進入 agent dashboard | ✓ 可進入；僅看到 agent 相關功能 | ☐ |
| 3.2 | 列出物件 | ✓ 僅顯示經 agent_authorizations 授權的房東物件；無授權物件被隱藏 | ☐ |
| 3.3 | 更新授權物件狀態 | ✓ 僅在授權範圍內 + 具 can_update_property_status 時可更新；無權限時被拒絕 | ☐ |
| 3.4 | 查看授權房東 profile | ✓ 僅能 SELECT 有授權關係的房東 profile；無授權時被拒絕 | ☐ |

### 4. 租客/買家 基本驗證

| # | 情境 | 預期結果 | ✓ |
|---|------|---------|:--:|
| 4.1 | 租客登入 | ✓ 進入 tenant dashboard；僅看到自己的租約、繳費、維修申請 | ☐ |
| 4.2 | 買家登入 | ✓ 進入 buyer dashboard；僅看到自己的買賣合約與相關文件 | ☐ |
| 4.3 | 潛在租客瀏覽物件 | ✓ 只能看公開物件；預約看房功能可用 | ☐ |
| 4.4 | 潛在買家瀏覽物件 | ✓ 只能看公開物件；預約看房功能可用 | ☐ |

### 5. Superadmin 與稽核

| # | 情境 | 預期結果 | ✓ |
|---|------|---------|:--:|
| 5.1 | Superadmin 登入 IAM 管理頁 | ✓ http://localhost:3001/superadmin/dashboard/iam-management；可訪問 roles、users、groups 各 tab | ☐ |
| 5.2 | 查看 roles tab | ✓ 顯示所有 14 種角色；可新增/編輯/刪除（若實作） | ☐ |
| 5.3 | 查看 users tab | ✓ 列出所有用戶；可查看其角色、群組、授權狀態 | ☐ |
| 5.4 | 查看 groups tab | ✓ 列出所有群組；顯示每個群組包含的用戶與角色 | ☐ |
| 5.5 | 稽核員登入 | ✓ 可訪問 audit dashboard；財務資料唯讀；無修改權限 | ☐ |

### 6. 角色切換與過渡

| # | 情境 | 預期結果 | ✓ |
|---|------|---------|:--:|
| 6.1 | Superadmin 呼叫角色切換 RPC | ✓ `switch_user_role(user_id, new_role_name)` 成功；使用者的 primary_role 與群組關聯更新；使用者需重新登入以取得新 JWT | ☐ |
| 6.2 | 一般用戶嘗試直接改 profile.role | ✓ 被 trigger 阻擋（若有 protect trigger）；DB 返回錯誤信息 | ☐ |

### 7. RLS 驗證

| # | 情境 | 預期結果 | ✓ |
|---|------|---------|:--:|
| 7.1 | 跨角色存取測試 | ✓ 用 tenant 帳號嘗試讀取 landlord 物件 → 被 RLS 拒絕；用 agent 帳號嘗試讀取無授權物件 → 被拒絕 | ☐ |
| 7.2 | RLS 政策套用 | ✓ 新 RLS 規則有使用 `has_role()` 或 `get_user_roles()` | ☐ |

---

## 常見操作手冊

### 場景 A：新增自訂角色

**步驟**：

1. **決定角色名稱** （e.g., `property_manager`）
2. **撰寫 Migration**：
   ```sql
   -- supabase/migrations/20260301120000_add_property_manager_role.sql
   INSERT INTO public.iam_roles (name, description)
   VALUES ('property_manager', '物件經理 - 負責物件維護與租戶協調');
   ```
3. **執行 Migration**：
   ```bash
   supabase migration up
   ```
4. **驗證**：
   ```sql
   SELECT * FROM public.iam_roles WHERE name = 'property_manager';
   ```
5. **新增相關 RLS（若需要）**：編輯 `supabase/migrations/` 中的 RLS policy 檔案，加入 `has_role(auth.uid(), 'property_manager')` 判斷邏輯。
6. **更新前端角色 metadata**（若需要）：編輯 `apps/web/config/roles.ts` 的 `ROLE_METADATA`，供 Portal 顯示。

### 場景 B：編輯已存在的角色說明

**步驟**：

1. **SSH 進本機 Supabase 或直接執行 SQL**：
   ```sql
   UPDATE public.iam_roles
   SET description = '更新後的說明文字'
   WHERE name = 'landlord';
   ```
2. **驗證**：
   ```sql
   SELECT name, description FROM public.iam_roles WHERE name = 'landlord';
   ```

### 場景 C：查詢特定使用者的所有角色

**步驟**：

```sql
-- 假設用戶 UUID 為 abc123
SELECT DISTINCT ir.name
FROM public.iam_roles ir
LEFT JOIN public.iam_group_roles igr ON ir.id = igr.role_id
LEFT JOIN public.iam_group_members igm ON igr.group_id = igm.group_id
LEFT JOIN public.iam_user_roles iur ON ir.id = iur.role_id
WHERE igm.user_id = 'abc123' OR iur.user_id = 'abc123'
ORDER BY ir.name;
```

### 場景 D：監控哪些角色未被使用

**步驟**：

```sql
SELECT ir.name
FROM public.iam_roles ir
LEFT JOIN public.iam_user_roles iur ON ir.id = iur.role_id
LEFT JOIN public.iam_group_roles igr ON ir.id = igr.role_id
WHERE iur.role_id IS NULL AND igr.role_id IS NULL
ORDER BY ir.name;
```

---

## 相關檔案引用

| 用途 | 檔案 | 說明 |
|------|------|------|
| 權限架構全景 | [PERMISSION_ARCHITECTURE.md](./PERMISSION_ARCHITECTURE.md) | 深入的架構設計、Option A 說明、群組層級（已簡化，建議讀本文 [系統架構](#系統架構) 段落） |
| 實作計畫 | [iam_single_source_option_a.md](./iam_single_source_option_a.md) | 5-phase 遷移計畫、技術細節（已完成，供參考） |
| 標準作業程序 | [IAM_SOP.md](./IAM_SOP.md) | 使用者入職、權限變更、緊急撤銷、定期覆核 |
| Superadmin 後台 | `apps/superadmin/dashboard/iam-management/` | 直觀的 UI 管理 roles、users、groups（推薦前端操作） |
| 前端角色 metadata | `apps/web/config/roles.ts` | Portal 卡片顯示、導航邏輯（僅影響前端 UI，不影響 IAM）|
| 群組查詢 action | `apps/superadmin/app/superadmin/groups/actions.ts` | `getRoles()` - 供邀請表單、群組編輯下拉選單使用 |

---

## 故障排除

### Q: 為什麼 Superadmin 無法在「邀請用戶」看到新增的角色？

**答**：檢查：
1. Migration 是否已執行：`SELECT COUNT(*) FROM iam_roles;`
2. 角色名稱是否正確（大小寫敏感）：`SELECT * FROM iam_roles WHERE name LIKE '%your_role%';`
3. 前端是否有快取：清除 browser cache 或重新啟動開發伺服器

### Q: 使用者的角色為何顯示異常？

**答**：
1. 檢查 trigger 是否正常同步：`SELECT profile.role FROM users_profile WHERE id = 'user_uuid';` vs `SELECT get_user_roles('user_uuid');`
2. 檢查使用者是否在 `iam_group_members` 或 `iam_user_roles` 中
3. 若 profile.role 與實際角色不符，可執行：
   ```sql
   -- 手動觸發同步（假設有 refresh_user_roles trigger）
   UPDATE auth.users SET updated_at = now() WHERE id = 'user_uuid';
   ```

### Q: RLS 返回「permission denied」，但使用者應該有存取權？

**答**：
1. 檢查 RLS policy 是否正確使用 `has_role()`：`SELECT * FROM pg_policies WHERE tablename = 'table_name';`
2. 驗證使用者的角色：`SELECT get_user_roles('user_uuid');`
3. 測試 helper 函數：`SELECT has_role('user_uuid', 'role_name');`

---

## 更新歷史

| 日期 | 版本 | 異動 |
|------|------|------|
| 2026-03-01 | 1.0 | 初版整合（14 種角色、CRUD、RLS 約定、回歸測試表） |

---

## 連絡與反饋

若發現文檔過期或不符實情，請：
1. 提報 issue 至專案 GitHub
2. 直接編輯此檔案並提交 PR
3. 通知 Superadmin / IAM 維護者

**最後維護者**：Claude Sonnet 4.6 | **最後更新**：2026-03-01
