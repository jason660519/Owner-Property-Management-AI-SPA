# IAM 操作指南 (IAM Operational Guides)

> 本目錄為專案 IAM（身份與存取管理）之 **Single Source of Truth**，含權限架構、SOP、實作計畫與回歸測試檢查表。

## 目錄

| 檔案 | 說明 |
|------|------|
| [PERMISSION_ARCHITECTURE.md](./PERMISSION_ARCHITECTURE.md) | **權限與群組架構**：Postgres vs 應用層、Option A 單一來源、角色清單、群組階層、權限矩陣、技術實作、文件治理與 SSOT |
| [IAM_SOP.md](./IAM_SOP.md) | **IAM 標準作業程序**：使用者入職、權限變更、緊急撤銷、定期覆核、Kill Switch |
| [iam_single_source_option_a.md](./iam_single_source_option_a.md) | **實作計畫 (Option A)**：Phase 1～5、migration 與程式約定 |
| [IAM_OPTION_A_REGRESSION_CHECKLIST.md](./IAM_OPTION_A_REGRESSION_CHECKLIST.md) | **Option A 回歸測試檢查表**：上線後各角色存取驗證 |

權限矩陣、RLS 約定、遷移與測試請以 [PERMISSION_ARCHITECTURE.md](./PERMISSION_ARCHITECTURE.md) 及上述文件為準。

**相關**：Auth 畫面樹、登入／註冊／密碼重設流程與驗收規格見 [docs/proposals/auth-redesign.md](../proposals/auth-redesign.md)。
