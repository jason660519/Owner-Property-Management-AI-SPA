# 開發日誌：登入／Portal／IAM 角色流程與 Superadmin 全角色選單

> **創建日期**: 2026-02-16 | **創建者**: Claude (Auto)
> **最後修改**: 2026-02-16 | **版本**: 1.0

## 今日完成項目

- 登入後一律導向 Portal（`/portal`），不再依單一角色直接跳 dashboard；Portal 為唯一入口。
- 登入流程：新增 `syncUserRolesToAuthMetadata` 同步 IAM 角色至 Auth `user_metadata`，middleware 與登入頁邏輯一致；改為 fire-and-forget 不阻塞導向。
- 新增 `normalizeRoles()`（`apps/web/lib/roles.ts`），統一角色格式（string / `role_name` 物件）為字串陣列；登入與 middleware 共用。
- Middleware：`user_metadata.roles` 為空時導向 `/portal`，避免舊 session 誤導向單一角色 dashboard。
- Portal 只顯示 2 張角色卡問題：根因為測試帳號僅在 2 個 IAM 群組；新增 migration `20260216170000_assign_test_user_all_iam_groups.sql`，將測試用戶加入所有 IAM 群組，Portal 顯示 11 張角色卡。
- Superadmin「Invite User」角色下拉：改為從 DB `iam_roles` 載入（`getRoles()`），不再寫死 8 個；`getRoles()` 改為使用 admin client（service_role）以回傳完整清單。
- Migration `20260216160000_seed_all_iam_roles.sql` 補齊 16 個 iam_roles；新增 `docs/operational-guides/iam/SYSTEM_ROLES_REFERENCE.md` 角色清單說明。
- Playwright MCP：建立 `chromium_headless_shell-1200` → `chromium_headless_shell-1208` 符號連結以通過啟動；以測試帳密執行登入 → Portal → Superadmin 邀請角色下拉驗證（16 選項、Portal 11 張卡）。

## 技術難點與解決方案

- **問題 1**：登入後卡在「Rendering...」或直接進 landlord dashboard，多角色用戶進不了 Portal。  
  **解決**：不等 `syncUserRolesToAuthMetadata` 完成即導向 `/portal`（fire-and-forget）；登入後一律 `window.location.href = '/portal'`，單一來源為 IAM。
- **問題 2**：Portal 只顯示「超級管理員」「房東」兩張卡。  
  **解決**：Portal 角色來自 `get_user_roles` RPC（IAM 群組／直接角色）。測試帳號僅在 2 個群組，故只 2 卡；新增 migration 將該用戶加入所有 `iam_groups`，觸發 trigger 同步 `users_profile.roles`，Portal 顯示 11 張卡。
- **問題 3**：Superadmin Invite User 角色下拉只顯示 2 個選項。  
  **解決**：改為呼叫 `getRoles()` 從 `iam_roles` 查詢；`getRoles()` 改為使用 `createAdminClient()` 繞過 RLS，確保回傳全表；並以 migration 補齊所有 iam_roles 種子。
- **問題 4**：`normalizeRoles` 放在 `'use server'` 檔案內導致 Build Error（Server Actions must be async）。  
  **解決**：將 `normalizeRoles` 移至 `apps/web/lib/roles.ts`（非 server 模組），登入頁改從該處 import。

## 重點心得

- 登入／Portal／middleware 的角色來源須一致：登入時以 IAM 為準並寫入 `user_metadata.roles`，middleware 僅讀取 metadata，避免 RPC 在 edge 的複雜度。
- Portal 顯示的是「當前使用者被指派的角色」，不是系統全部角色；要讓測試帳號看到多張卡，需在 IAM 為該用戶加入多個群組。
- Superadmin 的「可選角色」應來自 `iam_roles` 全表（admin 查詢），與 Portal 的「我的角色」語意不同。

## 避坑指南

- ⚠️ `'use server'` 檔案內匯出的函式必須為 async，純輔助函式應放在一般 lib 檔。
- ⚠️ 登入後導向不要阻塞在 sync metadata，否則易卡在 Loading；用 `void syncUserRolesToAuthMetadata(...)` 即可。
- ⚠️ Playwright MCP 若要求 `chromium_headless_shell-1200` 而本機只有 1208，可建符號連結 `chromium_headless_shell-1200` → `chromium_headless_shell-1208`。

## 下階段計畫

- [ ] 視需求為其他測試帳號或正式環境使用者配置 IAM 群組（不一定要「全部群組」）。
- [ ] 若在 Superadmin 後台變更使用者 IAM 角色，評估是否在該流程內呼叫 sync 更新 Auth `user_metadata.roles`，使下次造訪 /login 時 middleware 導向正確。
- [ ] E2E：新增「多角色用戶登入後必進 Portal」「Portal 角色卡數量與 IAM 一致」等案例，避免回歸。

## 相關文件

- [系統角色清單 (SYSTEM_ROLES_REFERENCE.md)](/docs/operational-guides/iam/SYSTEM_ROLES_REFERENCE.md)
- [登入與 Portal 流程] 本專案 `apps/web/app/(auth)/login/page.tsx`、`apps/web/middleware.ts`、`apps/web/app/portal/page.tsx`
