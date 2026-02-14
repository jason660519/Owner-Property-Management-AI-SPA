# Implementation Plan: IAM as Single Source of Truth (Option A)

> **創建日期**: 2026-02-14 | **創建者**: Claude  
> **最後修改**: 2026-02-14 | **修改者**: Claude | Phase 3 決策：採用 view + trigger  
> **關聯**: [PERMISSION_ARCHITECTURE.md](./PERMISSION_ARCHITECTURE.md) §0 — 方案 A 採用 IAM 為應用層角色單一來源

## 目標

- 所有業務角色（landlord、agent、tenant、buyer、vendor、auditor、potential_* 等）以 **IAM**（`iam_groups` / `iam_roles` / `get_user_roles()`）為單一真相來源。
- `users_profile.role` / `primary_role` 改為衍生欄位（由 IAM 同步或視圖計算），過渡期保留供既有 RLS 與前端，新 RLS 一律使用 `get_user_roles(auth.uid())` 或 `has_role()`。

## 分階段任務清單

### Phase 1：文件與約定（僅改文件）— 已完成

- [x] 在 [PERMISSION_ARCHITECTURE.md](./PERMISSION_ARCHITECTURE.md) 新增 §0：Postgres vs 應用層、IAM 為單一來源、應用層角色清單與資料範圍。
- [x] 在 §3.3 註明 RLS 以 `get_user_roles` / `has_role` 為準。
- [x] 建立本實作計畫並列舉後續 Phase。

### Phase 2：IAM 角色與群組補齊（不改既有 RLS）

- [x] **2.1** 確認 `iam_roles` 已包含所有業務角色：…缺則以 migration 新增。→ **已實作**：[20260214180000_phase2_iam_roles_groups_agent.sql](../../../supabase/migrations/20260214180000_phase2_iam_roles_groups_agent.sql) 新增 `agent`、`buyer`、`register`。
- [x] **2.2** 確認對應的 `iam_groups` 與 `iam_group_roles` 已存在（…仲介群組 → agent）。→ **已實作**：同上 migration 新增群組 `Agents` 並連結 `agent`。
- [x] **2.3** 註冊/ onboarding 寫入 IAM。→ **已實作**：`apps/web/lib/iam.ts` 的 `addUserToIamGroupByRole()`；`signUpWithRole`、auth callback（OAuth）、`acceptInviteCode` 在建立/更新使用者後皆會加入對應 IAM 群組。

### Phase 3：衍生欄位與同步策略 — 已決定：**View + Trigger**

**決策**：採用 DB 層衍生，以 **trigger 維護 cache**、**view 作為讀取介面**。單一真相為 IAM，讀取快且由 DB 自動同步。

- [x] **3.1** 決定衍生方式：**View + Trigger**（不採應用層同步）。
- [x] **3.2** **Trigger**：在 IAM 變更時更新 cache。→ **已實作**：[20260214180100_phase3_profile_sync_view_trigger.sql](../../../supabase/migrations/20260214180100_phase3_profile_sync_view_trigger.sql)：`sync_profile_roles_from_iam()`、trigger 於 `iam_group_members` / `iam_user_roles`；`get_user_roles()` 改為從 IAM 讀取；backfill 已執行。
- [x] **3.3** **View**：提供讀取介面。→ **已實作**：同上 migration 建立 `users_profile_with_role`（`SELECT * FROM users_profile`）。
- [x] **3.4** 註冊/改角色只寫 IAM；`switch_user_role` 過渡。→ **已實作**：註冊與 invite 改為寫 IAM（見 2.3）。`switch_user_role` 在 RPC 內設定 `app.bypass_role_protection` 後再更新 profile（[20260214180200_switch_user_role_bypass.sql](../../../supabase/migrations/20260214180200_switch_user_role_bypass.sql)）。

### Phase 4：RLS 遷移至 get_user_roles / has_role

- [x] **4.1** 新增 `has_role(lookup_user_id, role_name)`。→ **已實作**：[20260214180300_has_role_and_use_iam_in_helpers.sql](../../../supabase/migrations/20260214180300_has_role_and_use_iam_in_helpers.sql)。
- [x] **4.2（輔助/觸發器）** `validate_agent_authorization`、`is_owner_or_authorized_agent` 改為使用 `has_role()`。→ **已實作**：同上 migration。既有 RLS policies 仍檢查 `users_profile.role`（由 trigger 從 IAM 同步），故行為一致；可選後續將 policy 內改為 `has_role(auth.uid(), 'agent')`。
- [x] **4.3** 新功能與新表一律只使用 `get_user_roles` / `has_role`。→ **已約定**：[PERMISSION_ARCHITECTURE.md](./PERMISSION_ARCHITECTURE.md) §0.3 新程式約定。
- [x] **4.4** `users_profile.role` / `primary_role` 僅供前端顯示或報表用。→ **已約定**：同上 §0.2（衍生欄位、應用不得直接寫入）、§0.3。

### Phase 5：驗證與稽核

- [x] **5.1** 回歸測試：房東/仲介/租客/買方/廠商/稽核等情境之 CRUD 與可見範圍符合權限矩陣。→ **已建立檢查表**：[IAM_OPTION_A_REGRESSION_CHECKLIST.md](./IAM_OPTION_A_REGRESSION_CHECKLIST.md)，可手動勾選或依此撰寫 E2E。
- [x] **5.2** Superadmin IAM 稽核：確認 `get_postgres_roles_count()` 僅用於報表。→ **已確認**：僅在 [apps/superadmin/app/api/iam/audit/route.ts](../../../apps/superadmin/app/api/iam/audit/route.ts) 用於 `stats.postgresPredefinedRolesCount` 顯示，未參與任何權限邏輯。

---

## 小結

| Phase | 內容 | 改動範圍 |
| --- | --- | --- |
| 1 | 文件與約定 | 僅文件 |
| 2 | IAM 角色/群組補齊 | Migration + 註冊/onboarding |
| 3 | profile 衍生：view + trigger（trigger 維護 cache，view 讀取介面） | Migration（trigger + view） |
| 4 | RLS 改寫為 get_user_roles/has_role | Migrations（RLS policies） |
| 5 | 驗證與稽核 | 測試與檢查 |

建議執行順序：**Phase 1（已完成）→ Phase 2 → Phase 3（可與 2 並行）→ Phase 4 → Phase 5**。Phase 4 可依表拆分多個 migration 分批上線，以降低風險。

**已建立之 Migrations**  
- `20260214180000_phase2_iam_roles_groups_agent.sql`（Phase 2）  
- `20260214180100_phase3_profile_sync_view_trigger.sql`（Phase 3）  
- `20260214180200_switch_user_role_bypass.sql`（switch_user_role 過渡）  
- `20260214180300_has_role_and_use_iam_in_helpers.sql`（Phase 4：has_role + 輔助函數）  
執行：`npx supabase migration up` 或依專案流程套用（若遇 config 錯誤如 recovery template，可先修正 `supabase/config.toml` 或單獨套用上述 SQL）。
