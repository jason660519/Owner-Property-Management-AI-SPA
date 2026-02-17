# 專案進度儀表板更新指南

> **創建日期**: 2026-02-14 | **更新日期**: 2026-02-18
> **用途**: 更新專案開發進度儀表板時，請依本指南操作（欄位、格式、連結規則、流程）。

請將今天的工作內容更新至專案開發進度儀表板。

## 📋 背景說明

- **目標檔案**: `apps/superadmin/app/data/roadmap.ts`
- **儀表板位置**: http://localhost:3001/superadmin/dashboard/project-progress
- **今日日期**: （使用時請以當日日期為準）

## 🎯 資料欄位與儀表板對應

請更新或新增 `ROADMAP_DATA.features` 陣列中的物件。以下為欄位與儀表板顯示的對應關係：

| 欄位 (`roadmap.ts`) | 儀表板欄位名稱 (Header) | 說明與格式 |
|-------------------|-----------------------|------------|
| `name` | **Feature** | 功能名稱 |
| `category` | **Category** | 工作分類，如 `專案管理與工具 (Project Management)` |
| `acceptanceCriteria` | **Feature Spec URL** | **(顯示為純文字)** 功能規格與驗收標準，支援 `\n` 換行 |
| `docPath` | **Dev Progress & Log Report** | **(顯示為連結)** 開發日誌或功能文件的路徑（見下方路徑規則） |
| `testProgress` | **TEST STANDARD & LOG URL** | **(顯示為純文字)** 測試進度說明，支援 `\n` 換行 |
| `percentage` | **Dev Progress** | 開發進度條 (0-100) |
| `testCoverage` | **Test Coverage** | 測試覆蓋度進度條 (0-100) |
| `mode` | **Mode** | (新功能) AI 模式，可選值: `'agent'`, `'plan'`, `'chat'` |
| `model` | **MODEL** | (新功能) 使用的模型名稱 |
| `aiPrompt` | **PROMPT** | (新功能) 提示詞或設計提示 |
| `lastModifiedBy` | **Last Modified** | 最後修改者 |
| `lastModifiedDate` | **Last Modified** | 最後修改日期 |

> ⚠️ **注意**: `devLog` 欄位目前在儀表板中未直接顯示，但建議仍保留在 `roadmap.ts` 中作為詳細記錄。儀表板主要顯示 `docPath` 連結與 `testProgress` 文字。

## 🔗 文件路徑規則 (`docPath`)

`docPath` 欄位會被轉換為 **Superadmin 專案檔案檢視器** 的連結。

| 文件位置 | `docPath` 寫法範例 | 說明 |
|----------|-------------------|------|
| **專案文件** (`docs/` 目錄下) | `/docs/operational-guides/guide.md` | 以 `/docs/` 開頭，對應 `scope=docs` |
| **專案根目錄其他檔案** | `/project-process/features/demo.html` | 以 `/` 開頭，對應 `scope=project` |

若無文件，請留空字串 `""`。

## 🔄 更新流程

1.  **讀取現有資料**
    - 讀取 `apps/superadmin/app/data/roadmap.ts`

2.  **任務識別與編號**
    - **項目 ID** 為該項目在 `features` 陣列中的順序 (Index + 1)。
    - **查詢 ID**:
      ```bash
      grep -n "name:" apps/superadmin/app/data/roadmap.ts | grep "關鍵字"
      # 輸出範例: 250: name: "功能名稱" -> 行號 250，需推算它是第幾個 item
      ```
      更簡單的方式是直接查看儀表板或計算陣列索引。

3.  **新增或更新項目**
    - **更新**: 找到對應的 `name` 或 ID 進行修改。
    - **新增**: 在 `features` 陣列末尾加入新物件。

4.  **填寫內容**
    - 務必更新 `percentage` (開發進度) 與 `testProgress` (測試進度)。
    - 若有相關文件，填寫 `docPath`。
    - 若涉及 AI 開發，填寫 `mode`, `model`, `aiPrompt`。

5.  **寫入檔案**
    - 更新 `apps/superadmin/app/data/roadmap.ts`。

## ✅ 輸出範例

更新完成後，請回應：

```
✅ 已更新專案進度儀表板

更新項目: [功能名稱]
ID: #[陣列順序]
進度: [X]%
說明:
- [更新重點1]
- [更新重點2]

詳細內容已寫入: apps/superadmin/app/data/roadmap.ts
```

## 📝 常用分類參考

- `超級管理員 (Super Admin)`
- `買家 (Buyer)`
- `房東 (Landlord)`
- `租客 (Tenant)`
- `通用/系統 (General/System)`
- `專案管理與工具 (Project Management)`
- `測試與品質保證 (Testing & QA)`
- `認證與權限` (可自訂新分類)
