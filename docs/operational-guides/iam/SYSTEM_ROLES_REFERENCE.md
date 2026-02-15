# 系統角色清單 (System Roles Reference)

> **創建日期**: 2026-02-16 | **用途**: 供 Superadmin 與開發者查閱「自訂角色」與種子角色。

## 自訂角色來源

本系統的**應用層角色**全部來自資料表 `public.iam_roles`，與 Supabase Auth 的**系統預設角色**（`anon`、`authenticated`、`service_role`）分開：

- **Supabase 系統預定義**：用於 RLS / API 權限，不在「邀請使用者／指派角色」清單中。
- **自訂角色 (iam_roles)**：由 migration 種子或 Superadmin 後續新增，用於 Portal、邀請、群組權限等。

## Migration 種子產生的角色（約 15 個）

以下為目前 migration 寫入 `iam_roles` 的 name（唯一），實際數量以 DB 為準。

| 角色 name | 說明 (description 摘要) |
|-----------|--------------------------|
| `super_admin` | 完整系統存取 |
| `landlord` | 房東／物件擁有者 |
| `tenant` | 租客（檢視合約、繳租） |
| `contract_tenant` | 合約承租人 |
| `potential_tenant` | 潛在租客／尋找租屋 |
| `buyer` | 買家（檢視購買相關） |
| `contract_buyer` | 合約買方 |
| `potential_buyer` | 潛在買方 |
| `agent` | 仲介 |
| `vendor` | 服務提供者／供應商 |
| `auditor` | 稽核／唯讀財務 |
| `register` | 已註冊但尚未加入群組（sync 預設） |
| `unregister` | 未註冊／訪客 |
| `system_engineer` | 系統工程師 |
| `cybersecurity_engineer` | 資安工程師 |

**查詢實際筆數**（在 Supabase SQL Editor 或本機）：

```sql
SELECT COUNT(*) FROM public.iam_roles;
SELECT name, description FROM public.iam_roles ORDER BY name;
```

## Superadmin 如何選擇「全部」角色

- **邀請使用者 (Invite User)**：角色下拉選單改為從 **`iam_roles` 查詢**（`getRoles()`），不再使用前端寫死的 8 個選項，因此 Superadmin 可選擇**所有**出現在 DB 中的角色（含上述種子與未來自訂）。
- **編輯群組 (Edit Group)**：群組可指派的多選角色同樣來自 `getRoles()`，即 `iam_roles` 全表。

因此：

- **自訂角色**：在 `iam_roles` 新增一筆（例如透過 SQL 或未來管理 UI），即會出現在 Superadmin 的「邀請使用者」與「編輯群組」中。
- **Supabase 系統預定義**：`anon` / `authenticated` / `service_role` 不在此清單，僅用於後端／RLS，不在 Portal 或邀請流程中供選。

## 相關檔案

- 角色查詢：`apps/superadmin/app/superadmin/groups/actions.ts` → `getRoles()`
- 邀請表單：`apps/superadmin/components/admin/users/InviteUserModal.tsx`（依 `getRoles()` 渲染選單）
- Portal 顯示用 metadata：`apps/web/config/roles.ts`（ROLE_METADATA，僅影響 Portal 卡片顯示與導向，不影響 Superadmin 可選角色範圍）
