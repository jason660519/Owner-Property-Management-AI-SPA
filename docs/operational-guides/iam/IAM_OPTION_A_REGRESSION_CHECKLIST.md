# IAM Option A 回歸測試檢查表

> **創建日期**: 2026-02-14 | **關聯**: [iam_single_source_option_a.md](./iam_single_source_option_a.md) Phase 5.1  
> **用途**: 驗證「IAM 為單一來源 + view/trigger 同步 profile」上線後，各角色存取符合 [PERMISSION_ARCHITECTURE.md](./PERMISSION_ARCHITECTURE.md) 權限矩陣。

---

## 前置條件

- 本地 Supabase 已執行完 Option A 相關 migrations（Phase 2～4）。
- 可用的測試帳號或能註冊新帳號、使用邀請碼。

---

## 1. 註冊與 IAM 同步

| # | 情境 | 預期結果 | 通過 |
|---|------|----------|:----:|
| 1.1 | 新用戶註冊（role = landlord） | 註冊成功；`users_profile` 有該筆；`iam_group_members` 有該 user 加入 Standard Landlords；profile.role / primary_role 為 landlord（由 trigger 同步） | ☐ |
| 1.2 | 新用戶註冊（role = agent） | 同上；加入 Agents 群組；profile 顯示 agent | ☐ |
| 1.3 | OAuth 首次登入（無 profile） | 建立 profile 並加入 Standard Landlords；redirect 至 landlord dashboard | ☐ |
| 1.4 | 使用邀請碼登入（邀請 role = landlord） | 若有 group_id 則加入該群組，否則加入 Standard Landlords；profile.role 由 trigger 更新 | ☐ |

---

## 2. 房東 (landlord)

| # | 情境 | 預期結果 | 通過 |
|---|------|----------|:----:|
| 2.1 | 登入後進入 landlord dashboard | 可進入，僅看到自己相關導航與資料 | ☐ |
| 2.2 | 列出物件 | 僅看到 `owner_id = 自己` 的銷售/出租物件 | ☐ |
| 2.3 | 建立/編輯/刪除物件 | 僅能操作自己的物件 | ☐ |
| 2.4 | 仲介授權 | 可建立/編輯 agent_authorizations（landlord_id = 自己） | ☐ |

---

## 3. 仲介 (agent)

| # | 情境 | 預期結果 | 通過 |
|---|------|----------|:----:|
| 3.1 | 登入後進入 agent dashboard | 可進入 | ☐ |
| 3.2 | 列出物件 | 僅看到經 agent_authorizations 授權的房東物件 | ☐ |
| 3.3 | 更新授權物件狀態 | 僅在授權範圍內且具 can_update_property_status 時可更新 | ☐ |
| 3.4 | 查看授權房東的 profile | 僅能 SELECT 有授權關係的房東 profile | ☐ |

---

## 4. Superadmin / IAM 稽核 (Phase 5.2)

| # | 情境 | 預期結果 | 通過 |
|---|------|----------|:----:|
| 4.1 | Superadmin 登入 → IAM 稽核頁 | 可開啟稽核頁，顯示 users/groups/roles/members 與統計 | ☐ |
| 4.2 | 稽核頁「Postgres 角色數」 | 數值來自 `get_postgres_roles_count()`，僅用於顯示；無任何 RLS 或權限邏輯依賴此值 | ☐ |

---

## 5. 角色切換（過渡）

| # | 情境 | 預期結果 | 通過 |
|---|------|----------|:----:|
| 5.1 | Super Admin 呼叫 switch_user_role | 可成功切換目標使用者的 primary_role（RPC 內 bypass 生效） | ☐ |
| 5.2 | 一般用戶嘗試直接改 profile.role | 被 protect trigger 阻擋（若前端有該寫入） | ☐ |

---

## 執行方式

- **手動**：依表逐項操作並勾選。
- **自動化**：可依此表撰寫 E2E（例：`e2e/flows/iam/option-a-regression.spec.ts`），覆蓋 1.1～1.2、2.1～2.2、3.1～3.2、4.1。

---

## 備註

- 租客 (tenant)、買方 (buyer)、廠商 (vendor)、稽核 (auditor) 等角色若已有對應功能，可依權限矩陣補上類似 2、3 的檢查項。
- 若發現 RLS 與矩陣不符，應記錄並修正 policy 或 `has_role()` 使用方式。
