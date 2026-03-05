# IAM 操作指南 (IAM Operational Guides)

> 本目錄為專案 IAM（身份與存取管理）之 **Single Source of Truth**。
>
> **👉 工程師新增/編輯 roles、查詢 iam_roles 表請直接參考 [ROLES_OPERATIONS_GUIDE.md](./ROLES_OPERATIONS_GUIDE.md)**

## 快速導航

| 場景 | 檔案 |
|------|------|
| **新增、編輯、觀察 roles 及 iam_roles 表** ⭐ | [ROLES_OPERATIONS_GUIDE.md](./ROLES_OPERATIONS_GUIDE.md) |
| 系統架構全景、權限矩陣、技術細節 | [PERMISSION_ARCHITECTURE.md](./PERMISSION_ARCHITECTURE.md) |
| 使用者入職、權限變更、緊急撤銷 SOP | [IAM_SOP.md](./IAM_SOP.md) |
| 5-phase 遷移計畫（已完成，供參考） | [iam_single_source_option_a.md](./iam_single_source_option_a.md) |

---

## 完整檔案索引

| 檔案 | 說明 | 用途 |
|------|------|------|
| **[ROLES_OPERATIONS_GUIDE.md](./ROLES_OPERATIONS_GUIDE.md)** | **14 種角色完整參考、資料庫 CRUD、RLS 約定、回歸測試表** | 日常工程師操作必讀 ⭐⭐⭐ |
| [PERMISSION_ARCHITECTURE.md](./PERMISSION_ARCHITECTURE.md) | 權限與群組架構、Option A 說明、技術實作細節 | 深入理解系統設計 |
| [IAM_SOP.md](./IAM_SOP.md) | 使用者入職、權限變更、緊急撤銷、定期覆核 | 操作流程參考 |
| [iam_single_source_option_a.md](./iam_single_source_option_a.md) | 5-phase 遷移計畫、程式約定 | 歷史參考（已完成） |
| [IAM_OPTION_A_REGRESSION_CHECKLIST.md](./IAM_OPTION_A_REGRESSION_CHECKLIST.md) | Option A 回歸測試檢查表 | 已整合至 ROLES_OPERATIONS_GUIDE.md |
| [SYSTEM_ROLES_REFERENCE.md](./SYSTEM_ROLES_REFERENCE.md) | 角色清單與種子資料 | 已整合至 ROLES_OPERATIONS_GUIDE.md |

---

## 相關文件

- Auth 流程與驗收規格：[docs/proposals/auth-redesign.md](../proposals/auth-redesign.md)
- Superadmin IAM 管理後台：`apps/superadmin/dashboard/iam-management/`
