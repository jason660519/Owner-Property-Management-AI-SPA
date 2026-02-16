# 專案進度儀表板更新指南

> **創建日期**: 2026-02-14 | **來源**: 自 `.claude/prompts/update-project-progress.prompt.md` 遷移至 docs，供所有 AI 與協作者參考
> **用途**: 更新專案開發進度儀表板時，請依本指南操作（欄位、格式、連結規則、流程）。

請將今天的工作內容更新至專案開發進度儀表板。

## 📋 背景說明

- **目標檔案**: `project-process/roadmap.js`（或直接更新 `apps/superadmin/app/data/roadmap.ts`，儀表板讀取此檔）
- **資料結構**: `ROADMAP_DATA.features` 陣列（若為 roadmap.js 則為 `window.ROADMAP_DATA`）
- **儀表板位置**: http://localhost:3001/superadmin/dashboard/project-progress
- **今日日期**: （使用時請以當日日期為準）

## 🎯 更新欄位

請更新或新增以下欄位（欄位名稱以 `roadmap.ts` 為準，若使用 roadmap.js 請對應轉換）：

| 欄位 | 說明 | 格式要求 |
|------|------|----------|
| `name` | 功能與說明 (Feature) | 簡述功能名稱；對應儀表板「功能與說明」欄 |
| `category` | 工作分類 | 如: `專案管理與工具 (Project Management)`、`超級管理員 (Super Admin)` |
| `docPath` | 功能文件路徑 | 專案根相對路徑，用於產生「Docs」超連結（見下方「文件與超連結」） |
| `acceptanceCriteria` | 完成標準 | 列出驗收標準 (條列式，`\n` 換行) |
| `percentage` | 開發進度 | 數字 0–100 |
| `testCoverage` | 測試覆蓋 | 數字 0–100（可選） |
| `devLog` | 開發日誌 | 詳細記錄，可含超連結（見下方「文件與超連結」） |
| `testProgress` / `testLog` | 測試日誌 | 測試記錄，可含超連結（見下方「文件與超連結」） |
| `lastModifiedBy` | 最後修改者 | 如: `Claude Sonnet 4.5`、`Trae AI` |
| `lastModifiedDate` | 最後修改日期 | 格式: `2026-02-14` 或 `2026/02/14-22:30` |

## 📝 開發日誌格式 (devLog)

使用以下結構化格式：

```markdown
### 今日完成項目
- [項目1]
- [項目2]

### 技術難點與解決方案
- **問題**: [描述]
  **解決**: [方案]

### 重點心得
- [心得1]
- [心得2]

### 避坑指南
⚠️ [注意事項1]
⚠️ [注意事項2]

### 下階段計畫
- [ ] [待辦事項1]
- [ ] [待辦事項2]
```

## 🔗 文件與超連結（Feature / Dev Log / Test Log）

儀表板會將文件路徑轉成 **Superadmin 專案檔案檢視器** 連結（`/superadmin/docs`），點擊後在站內開啟檔案；`.html` 會以**預覽模式**渲染，`.md` 會以 Markdown 渲染。

### 1. Feature 欄的「Docs」連結（`docPath`）

- **用途**：該功能/任務的說明文件，儀表板會在「功能與說明」欄顯示可點擊的「Docs」。
- **填寫方式**：填寫**專案根目錄起的相對路徑**，以 `/` 開頭。

| 文件位置 | `docPath` 範例 | 說明 |
|----------|----------------|------|
| 專案內 `project-process/`、`docs/` 等 | `/project-process/features/admin-dashboard-20260206.html` | 儀表板自動轉成 `scope=project` |
| 專案內 `docs/` 目錄 | `/docs/operational-guides/deployment-guides/cloud-deployment-platform-selection-guide.md` | 儀表板自動轉成 `scope=docs` |

**規則**：
- 路徑以 **`/docs/`** 開頭 → 在「專案文件」檢視器開啟（相對於 repo 的 `docs/` 目錄）。
- 其他路徑（如 `/project-process/...`）→ 在「專案檔案」檢視器開啟（相對於專案根目錄）。
- 無文件時可留空字串 `""`。

### 2. Dev Log / Test Log 內的超連結

- **用途**：在 `devLog`、`testProgress` 或 `testLog` 文字中引用開發日誌、測試日誌等文件。
- **目前行為**：儀表板以**純文字**顯示這兩個欄位；若在內容中寫入「專案檔案檢視器」的 URL，使用者可複製貼上到瀏覽器開啟。之後若儀表板改為可點擊連結，下列格式即可直接使用。

**可點擊連結寫法**（站內路徑，不帶 host）：

- 專案根下檔案（如 `project-process/dev-logs/xxx.md`）：
  ```
  /superadmin/docs?scope=project&path=project-process/dev-logs/dev-dashboard-refactor-2026-02-13.md
  ```
- 專案內 `docs/` 目錄下檔案：
  ```
  /superadmin/docs?scope=docs&path=deployment-guides/cloud-deployment-platform-selection-guide.md
  ```

**path 規則**：
- `scope=project`：path 為**專案根相對路徑**，**不要**開頭 `/`（例如 `project-process/features/xxx.html`）。
- `scope=docs`：path 為**相對於 `docs/` 目錄**的路徑，不含前綴 `/docs/`（例如 `deployment-guides/xxx.md`）。

**在日誌中撰寫範例**（工程師可複製 path 部分即可）：

```
詳見: /superadmin/docs?scope=project&path=project-process/dev-logs/dev-dashboard-refactor-2026-02-13.md
```

或簡短說明 + 路徑，方便之後改為可點擊：

```
詳見: [開發日誌] /superadmin/docs?scope=project&path=project-process/dev-logs/dev-dashboard-refactor-2026-02-13.md
```

### 3. 建議的檔案放置

| 類型 | 建議目錄 | 範例 path（用於 docPath 或 Dev/Test Log 連結） |
|------|----------|-----------------------------------------------|
| 功能說明 / 報告 | `project-process/features/` | `/project-process/features/admin-dashboard-20260206.html` |
| 開發日誌 | `project-process/dev-logs/` | `project-process/dev-logs/dev-dashboard-refactor-2026-02-13.md` |
| 測試日誌 | `project-process/test-logs/` | `project-process/test-logs/test-dashboard-refactor-2026-02-13.md` |
| 專案文件 (docs/) | `docs/` | `/docs/operational-guides/deployment-guides/xxx.md` → path 填 `operational-guides/deployment-guides/xxx.md`（scope=docs） |

## 🔄 處理流程

1. **讀取現有資料**
   - 讀取 `project-process/roadmap.js` 或 `apps/superadmin/app/data/roadmap.ts`
   - 解析 `ROADMAP_DATA.features` 陣列（roadmap.js 則為 `window.ROADMAP_DATA`）

2. **任務識別與編號**
   - **項目 ID 計算方式**：依據 `features` 陣列中 `name` 欄位的出現順序，從 1 開始編號
   - **如何查詢項目 ID**：
     ```bash
     # 方法 1: 使用 grep 查詢（推薦）
     grep -n "name:" apps/superadmin/app/data/roadmap.ts | grep -n "您的功能名稱"
     # 輸出範例: 96:250: name: "OAuth 用戶新增角色功能修復"
     # → 項目 ID 為 #96（冒號前的第一個數字）

     # 方法 2: 查看所有項目列表
     grep "name:" apps/superadmin/app/data/roadmap.ts | nl
     ```

   - **若使用者有指定編號或功能名稱**
     → 找到對應項目，直接更新內容
     → 範例：「更新 #96」、「更新 OAuth 用戶新增角色功能修復」

   - **若使用者未指定**
     → 在 `features` 陣列末尾新增一筆（注意欄位與現有結構一致）
     → 新增後，使用上述方法查詢並**告知使用者新項目的 ID 編號**

3. **整理今日工作**
   - 根據今天的 Git commits、討論內容、修改的檔案
   - 彙整為結構化的開發日誌（devLog / testProgress 或 testLog）
   - 若有對應文件，依上方「文件與超連結」填寫 `docPath` 或日誌內連結

4. **寫入資料**
   - 更新或新增至 `ROADMAP_DATA.features`
   - 若只更新了 `roadmap.js`，需同步更新 `apps/superadmin/app/data/roadmap.ts`（儀表板讀取此檔）
   - 保持原有格式與縮排

5. **回應確認**
   - 列出更新的功能名稱或編號
   - 摘要說明更新內容

## ✅ 輸出範例

更新完成後，請回應：

```
✅ 已更新專案進度儀表板

更新項目 ID: #96
功能名稱: OAuth 用戶新增角色功能修復（Add Role Feature Fix）

摘要:
- 修復 Server Action：改用 admin 客戶端繞過 RLS
- 修復前端路由：router.push → window.location.href
- 修復 IAM 映射：補齊 ROLE_TO_GROUP_NAME 缺失的角色

詳細內容已寫入: apps/superadmin/app/data/roadmap.ts（行 250-278）
```

**重要提醒**：
- 新增項目時，務必告知使用者**項目 ID 編號**（使用 `grep -n` 查詢）
- 更新現有項目時，請在回應中包含項目 ID 以便追蹤

## 🔢 ID 編號追蹤

### 如何查詢項目 ID

項目 ID 按照 `features` 陣列中的順序從 1 開始編號。查詢方法：

```bash
# 查詢特定功能的 ID（推薦）
grep -n "name:" apps/superadmin/app/data/roadmap.ts | grep -n "功能名稱關鍵字"

# 範例輸出：96:250:            name: "OAuth 用戶新增角色功能修復"
# 解讀：項目 ID = #96（第一個數字），檔案行號 = 250（第二個數字）

# 查看所有項目列表及編號
grep "name:" apps/superadmin/app/data/roadmap.ts | nl

# 查看最新項目的 ID（陣列末尾）
grep "name:" apps/superadmin/app/data/roadmap.ts | nl | tail -5
```

### ID 編號規則

1. **ID 不可重複使用**：即使刪除項目，其 ID 也不應分配給新項目
2. **新增項目**：一律附加到陣列末尾，自動獲得下一個可用 ID
3. **更新項目**：使用 ID 或功能名稱精確定位
4. **ID 查詢**：新增或更新後，務必查詢並告知使用者項目 ID

### 最新項目 ID

截至 2026-02-16，最新項目 ID：**#96**
- 功能名稱：OAuth 用戶新增角色功能修復（Add Role Feature Fix）
- 新增日期：2026/02/16-23:30
- 負責人：Claude Sonnet 4.5

## 🚨 注意事項

- **務必告知項目 ID**：新增或更新項目後，使用 `grep -n` 查詢並在回應中明確說明項目 ID
- 確保 JSON/TS 格式正確（注意逗號、引號、跳脫字元）
- 開發日誌、測試日誌中的換行請使用 `\n`
- `docPath` 為專案根相對路徑、以 `/` 開頭；無文件時留空字串 `""`
- Dev Log / Test Log 內若放連結，使用站內路徑 `/superadmin/docs?scope=...&path=...`（見上方「文件與超連結」）
- 時間戳記使用當前時間（台灣時區 UTC+8）
- Git commit hash 請使用短版本 (前 7 碼)

## 🤖 自動化選項（進階）

- **自動分析今日工作**: 根據 Git commits 和對話歷史自動生成
- **智能分類**: 自動判斷工作分類（前端/後端/部署/測試等）
- **進度計算**: 根據 checklist 完成度自動計算百分比
- **關聯任務**: 自動連結相關的文件、PR、Issue
- **文件連結**: 依功能或日誌檔路徑自動填寫 `docPath` 或 Dev/Test Log 內的 `/superadmin/docs?scope=...&path=...` 連結
