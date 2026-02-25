# 功能規格：超級管理員的 RBAC CRUD 平台 — 2026/02/21

> 由 HTML 遷移為 Markdown，以利 AI 讀取與版本控制。原始檔：`admin-rbac-crud-spec-20260221.html`

---

# 功能規格：超級管理員的 RBAC CRUD 平台

超級管理員

0%

待開發

2026/02/21

8 SP

高

## 一、功能描述

超級管理員可透過此平台對系統中所有角色（Role）進行完整的 CRUD 操作，並精細設定每個角色對各系統資源的讀取（Read）、寫入（Write）、刪除（Delete）權限。支援角色繼承與稽核日誌。

## 二、驗收標準 (Acceptance Criteria)

- 可建立、編輯、刪除角色（Role），角色名稱需唯一，不可重複

- 可對角色設定細粒度權限（讀取、寫入、刪除各資源模組），以權限矩陣呈現

- 角色變更需有稽核紀錄（修改者、修改時間、異動內容），不可刪除稽核日誌

- 支援角色繼承功能，子角色可繼承父角色的所有權限，並可額外新增或覆蓋部分權限

- 刪除角色前需確認沒有使用者被指派此角色，否則顯示警告並阻止刪除

## 三、頁面版面示意

┌─────────────────────────────────────────────────────┐
│  角色管理 (RBAC)                    [+ 新增角色]     │
├────────────────┬────────────────────────────────────┤
│  角色列表       │  角色詳情：landlord                  │
│  ────────────  │  ─────────────────────────────────  │
│  ▶ super_admin │  名稱: landlord                     │
│  ▶ landlord ◀  │  繼承自: [authenticated]            │
│  ▶ tenant      │                                    │
│  ▶ buyer       │  權限矩陣：                          │
│  ▶ agent       │  資源          Read  Write  Delete  │
│                │  /properties   ✓     ✓      ✓      │
│  [新增角色]    │  /tenants      ✓     ✓      ✗      │
│                │  /finances     ✓     ✓      ✗      │
│                │  /users        ✓     ✗      ✗      │
│                │                                    │
│                │  [儲存變更]  [重置預設]  [刪除角色]  │
└────────────────┴────────────────────────────────────┘

## 四、角色繼承示意

authenticated (基礎角色)
├── landlord
│   ├── landlord_assistant  (繼承 landlord，限制 Delete)
│   └── landlord_accountant (繼承 landlord，僅限財務模組)
├── tenant
├── buyer
└── super_admin (最高權限，不受繼承限制)

## 五、資料模型

| 資料表 | 說明 |
| --- | --- |
| `iam_roles` | 角色定義（id, name, description, parent_role_id） |
| `iam_permissions` | 權限定義（id, resource, action: read/write/delete） |
| `iam_role_permissions` | 角色與權限的多對多關聯 |
| `iam_group_members` | 使用者與角色群組的關聯 |
| `rbac_audit_logs` | 角色/權限變更稽核紀錄（修改者、前後值、時間戳） |

## 六、技術實作方向

後端：Next.js Server Actions + Supabase admin client。角色 CRUD 操作須使用 service_role key 繞過 RLS。

前端：左側角色列表 + 右側權限矩陣（checkbox grid），即時 optimistic update。

稽核：每次角色/權限變更後，自動寫入 `rbac_audit_logs`（不可被 UI 刪除）。
