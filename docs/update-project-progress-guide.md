# 專案進度儀表板更新指南

> **創建日期**: 2026-02-14 | **更新日期**: 2026-03-07 | **位置**: `docs/update-project-progress-guide.md`
> **用途**: 更新專案開發進度儀表板時，請依本指南操作（欄位、格式、連結規則、流程）。
> **文件格式**: 本專案採 **Markdown 優先**（見下方「文件格式：Markdown 優先」），Feature Spec / TDD Spec / TDD Progress Report 一律使用 `.md`，以利 AI 讀取與版本控制。

請將今天的工作內容更新至專案開發進度儀表板。

### 📋 背景說明

- **目標檔案**: `apps/superadmin/app/data/roadmap.ts`
- **儀表板位置**: http://localhost:3001/superadmin/dashboard/project-progress
- **今日日期**: （使用時請以當日日期為準）

---

## 🗂️ 四階段 Tab 架構

儀表板分為四個 Tab，對應功能生命週期：

| Tab              | Hash             | 說明                                   | 對應 `phase` 值 |
| :--------------- | :--------------- | :------------------------------------- | :---------------- |
| 開發 Development | `#development` | 功能開發進度（顯示**所有**功能） | `'development'` |
| 測試 Testing     | `#testing`     | 測試覆蓋率、測試狀態追蹤               | `'testing'`     |
| 部署 Deployment  | `#deployment`  | 部署環境、版本管理                     | `'deployment'`  |
| 運維 Operations  | `#operations`  | 正常運行率、錯誤率、回應時間           | `'operations'`  |

> **預設行為**: 未設定 `phase` 的功能歸為 `'development'`；有 `testCoverage > 0` 或 `testProgress` 者自動推導為 `'testing'`。

切換 Tab：點擊頁面上方的 Pill 按鈕，或在 URL 加 hash：

```
http://localhost:3001/superadmin/dashboard/project-progress#testing
```

---

## 🎯 Development Tab 欄位（共 14 欄）

| 欄 | 表頭 (EN / ZH)                                         | 資料來源                               | 說明                                                                                                                    |
| :-: | :----------------------------------------------------- | :------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- |
| 1 | **ID / 編碼**                                    | 自動產生                               | Row 順序，格式 `001`, `002`…                                                                                       |
| 2 | **Role/General / 按Role或通用分類**              | `category`                           | 按 Role 或通用分類（見常用分類），以 pill badge 顯示                                                                    |
| 3 | **Located Page / 按所屬頁面分類**                | `locatedPage`                        | 功能所屬頁面路徑（可不填，顯示 `—`）                                                                                 |
| 4 | **Feature / 按功能需求分類**                     | `name`                               | 功能需求名稱                                                                                                            |
| 5 | **DEV-SPEC (.md) / 功能規格 .md**                | `featureSpecDocPath`                 | Dev-Spec (.md) 連結，顯示為 `001-Dev-Spec.md`                                                                         |
| 6 | **TDD Spec (.md) / TDD 規格說明書 .md**          | `tddSpecDocPath`                     | TDD Spec (.md) 連結，顯示為 `001-TDD-Spec.md`                                                                         |
| 7 | **TDD Progress Report (.md) / TDD 進度報告 .md** | `docPath`                            | TDD Progress Report (.md) 連結，顯示為 `001-TDD-Report.md`                                                            |
| 8 | **Unit and Integration Test Script Folder Name** | 自動產生                               | 固定路徑 `apps/superadmin/unit_test/{ID}`（依 Row ID）                                                                |
| 9 | **E2E Acceptance Test Script Folder Name**       | 自動產生                               | 固定路徑 `apps/superadmin/e2e/{ID}`（依 Row ID）                                                                      |
| 10 | **TDD Progress / TDD進度**                       | `percentage`                         | 進度條，顯示 `feature.percentage %`                                                                                   |
| 11 | **E2E Test Progress / E2E測試進度**              | `e2eTestCoverage` / `testCoverage` | 進度條，優先用 `e2eTestCoverage`，fallback `testCoverage`                                                           |
| 12 | **Prompt and IDE Setting / Prompt 與 IDE 設定**  | UI 操作按鈕                            | 點擊開啟「設定 Prompt / 執行」Modal，在 Modal 內選擇 IDE、今日工作類別並編輯 Prompt（**不存入** roadmap.ts）      |
| 13 | **Status / 狀態**                                | `statusSelections`（記憶體）         | 下拉選擇列狀態（已完成/進行中/未開始/暫緩），頁面初次載入由 `deriveRowStatus()` 自動推導，**不寫入** roadmap.ts |
| 14 | **Notes / 備註**                                 | —                                     | 備註欄（目前顯示 `—`，預留擴充）                                                                                     |

> ⚠️ **測試腳本目錄注意**：欄8 的自動產生路徑為 `apps/superadmin/unit_test/{ID}/`（**非** `unit_and_integration_test`）。實際目前已有資料的子目錄為 `unit_test/002/` 和 `unit_test/004/`。

### 欄位與 roadmap.ts 對應摘要

| `roadmap.ts` 欄位                       | 儀表板用途                                                          |
| :---------------------------------------- | :------------------------------------------------------------------ |
| `name`                                  | 欄4：功能需求名稱                                                   |
| `category`                              | 欄2：Role/General 分類（badge）                                     |
| `locatedPage`                           | 欄3：所屬頁面路徑（可不填）                                         |
| `featureSpecDocPath`                    | 欄5：Dev-Spec (.md) 連結（顯示為 `001-Dev-Spec.md`）              |
| `tddSpecDocPath`                        | 欄6：TDD Spec (.md) 連結（顯示為 `001-TDD-Spec.md`）              |
| `docPath`                               | 欄7：TDD Progress Report (.md) 連結（顯示為 `001-TDD-Report.md`） |
| `percentage`                            | 欄10：TDD 進度條（同時供統計卡片使用）                              |
| `e2eTestCoverage` / `testCoverage`    | 欄11：E2E 進度條                                                    |
| `lastModifiedBy` / `lastModifiedDate` | 不在 Development Tab 顯示（仍建議填寫）                             |

### 送出 Prompt 與本地 Agent 流程（全自動化到 TDD + 測試 + git push）

1. **送出 Prompt**：在 Development Tab 點「設定 Prompt / 執行」→ 選擇 IDE（如 Cursor）、今日工作類別（可選）、編輯 Prompt → 按「送出 Prompt」。會建立一筆 `dev_tasks` 任務（狀態 `queued`）。
2. **本地 Agent 領取**：在專案根目錄執行 `cd tools/local-agent && npm run cursor`（需先 `npm run build`）。Agent 會輪詢 `GET /api/dev-tasks/next?ideType=Cursor`，領取後任務變為 `running`，並寫入 `.cursor/dev-tasks/task-<id>.md`、複製 Prompt 到剪貼簿、開啟 Cursor 並注入 Composer（Cmd+I → Cmd+V）。
3. **完成工作**：依 Prompt 完成 TDD、更新 TDD Progress Report、測試腳本全部通過、`git commit and push`。
4. **標記完成**：在專案根目錄執行
   `./scripts/complete-dev-task.sh <taskId> succeeded`
   任務會更新為 `succeeded`，儀表板 Modal 的輪詢會顯示最新狀態。

- 任務 ID 可在 Modal 下方「任務 ID」取得；若關閉 Modal，可從 `.cursor/dev-tasks/task-<id>.md` 檔名取得。
- `SUPERADMIN_BASE_URL` 預設為 `http://localhost:3001`，可設環境變數覆寫。
- Claude CLI 版本：`cd tools/local-agent && npm run claude`，使用 `tools/local-agent/run-claude.sh`。

---

## 🧪 Testing Tab 專屬欄位

| 欄位                 | 說明               | 型別                                                |
| :------------------- | :----------------- | :-------------------------------------------------- |
| `phase`            | 設為 `'testing'` | `PhaseType`                                       |
| `testStatus`       | 測試狀態           | `'pending' \| 'in_progress' \| 'passed' \| 'failed'` |
| `testCoverage`     | 整體測試覆蓋率 %   | `number`                                          |
| `unitTestCoverage` | 單元測試覆蓋率 %   | `number`                                          |
| `e2eTestCoverage`  | E2E 測試覆蓋率 %   | `number`                                          |
| `defectCount`      | 缺陷數量           | `number`                                          |
| `testLog`          | 測試日誌文字       | `string`                                          |

---

## 🚀 Deployment Tab 專屬欄位

| 欄位             | 說明                    | 型別                                                       |
| :--------------- | :---------------------- | :--------------------------------------------------------- |
| `phase`        | 設為 `'deployment'`   | `PhaseType`                                              |
| `deployStatus` | 部署狀態                | `'not_deployed' \| 'staging' \| 'production' \| 'rollback'` |
| `deployEnv`    | 部署環境描述            | `string`                                                 |
| `version`      | 版本號（如 `v1.2.3`） | `string`                                                 |
| `deployDate`   | 部署日期                | `string`                                                 |

---

## 📡 Operations Tab 專屬欄位

| 欄位                | 說明                  | 型別          |
| :------------------ | :-------------------- | :------------ |
| `phase`           | 設為 `'operations'` | `PhaseType` |
| `uptimePercent`   | 正常運行率 %          | `number`    |
| `errorRate`       | 錯誤率 %              | `number`    |
| `avgResponseTime` | 平均回應時間 ms       | `number`    |
| `lastIncident`    | 最近事件描述          | `string`    |

---

## 📁 工作文件放哪裡

| 要寫的內容                     | 放這裡                         | roadmap 欄位                                 |
| :----------------------------- | :----------------------------- | :------------------------------------------- |
| 開發日誌                       | `project-process/dev-logs/`  | `devLogDocPath`                            |
| 測試報告 / TDD Progress Report | `project-process/test-logs/` | **`docPath`**（欄7 顯示）            |
| 功能規格說明書（Feature Spec） | `project-process/features/`  | **`featureSpecDocPath`**（欄5 連結） |
| TDD 規格說明書                 | `project-process/features/`  | **`tddSpecDocPath`**（欄6 連結）     |
| 操作指南或設計文件             | `docs/` 下對應分類           | —                                           |

- 檔名帶日期，例如：`dev-behavior-monitor-2026-03-07.md`
- 沒有對應文件時，欄位留空字串 `""` 即可

---

## 📄 文件格式：Markdown

本專案依 **docs-as-code** 做法，規格與報告類文件一律使用 **Markdown（.md）** 作為單一真相來源：

- **Feature Spec**、**TDD Spec**、**TDD Progress Report** 皆以 `.md` 撰寫與存放，路徑在 `roadmap.ts` 的 `featureSpecDocPath`、`tddSpecDocPath`、`docPath` 中填寫為 **以 `/` 開頭的 .md 路徑**（例如 `/project-process/features/admin-dashboard-20260206.md`）。
- **優點**：AI 讀取時 token 較少、語意集中；版本控制與 diff 友善；必要時可由 Superadmin 文件檢視器即時渲染為 HTML，無需維護兩份格式。
- **歷史**：原 `project-process/features/*.html` 已於 2026-02-25 全數轉為對應 `.md`，`roadmap.ts` 已更新為指向 `.md`。舊 `.html` 檔仍保留於 repo 作為存檔，新文件請一律新增 `.md`。

---

## 🔗 文件路徑規則

路徑以**專案根目錄**為準，**一律以 `/` 開頭**，寫入 `docPath` / `featureSpecDocPath` / `tddSpecDocPath`。**一律使用 .md 副檔名**（見「文件格式：Markdown 優先」）：

- `docs/` 底下：`/docs/子路徑/檔名.md`
- `project-process/` 底下：`/project-process/dev-logs/dev-xxx-2026-03-07.md`、`/project-process/features/xxx-spec-20260307.md`

---

## 🧱 測試腳本目錄慣例

| 類型           | 路徑（依 Row ID）                   | 範例                               |
| :------------- | :---------------------------------- | :--------------------------------- |
| 單元與整合測試 | `apps/superadmin/unit_test/{ID}/` | `apps/superadmin/unit_test/002/` |
| E2E 測試       | `apps/superadmin/e2e/{ID}/`       | `apps/superadmin/e2e/004/`       |

> Row ID 對應 `RAW_FEATURES` 陣列順序（1-based），儀表板**欄8/欄9** 自動產生對應連結。
>
> ⚠️ **注意**：實際測試目錄為 `apps/superadmin/unit_test/`（非 `unit_and_integration_test`）。E2E 目錄除編號子目錄外，也有命名目錄（如 `apps/superadmin/e2e/ai-settings/`），可依功能分類存放。

---

## 🔄 更新流程

1. **讀取現有資料**：讀取 `apps/superadmin/app/data/roadmap.ts` 的 `RAW_FEATURES` 陣列
2. **識別 Row ID**：直接看儀表板 Development Tab 的 ID 欄（001, 002…），對應陣列順序
3. **決定 phase**

   - 功能仍在開發中 → 不填或填 `phase: 'development'`
   - 開始寫測試 → `phase: 'testing'`，填 `testStatus`、`testCoverage` 等
   - 已部署到環境 → `phase: 'deployment'`，填 `deployStatus`、`version`
   - 上線監控中 → `phase: 'operations'`，填 `uptimePercent`、`errorRate`
4. **新增或更新項目**

   - **更新**：找到對應的 `name` 進行修改
   - **新增**：在 `RAW_FEATURES` 陣列末尾加入新物件；請同時更新 `ROADMAP_DATA.lastUpdated`（第467行附近）為當日日期
5. **必填欄位**：`name`、`category`、`percentage`、`lastModifiedBy`、`lastModifiedDate`
6. **選填但建議填寫**：`locatedPage`、`featureSpecDocPath`、`tddSpecDocPath`、`docPath`、`e2eTestCoverage`、`devLog`

---

## 📝 新增任務範例

```typescript
// === 2026-03-07 新增任務 ===
{
    name: "功能名稱（中英雙語建議）",
    locatedPage: "superadmin/dashboard/xxx",   // 或 "web/landlord/xxx"，待建則寫 "xxx (待建)"
    percentage: 0,                              // 0~100
    phase: "development",                       // 若省略，系統自動推導
    category: "超級管理員 (Super Admin)",       // 見常用分類
    points: 5,                                  // Story Points（工作量估算）
    featureSpecDocPath: "/project-process/features/xxx-spec-20260307.md",
    tddSpecDocPath: "/project-process/features/tdd-xxx-20260307.md",
    docPath: "",                                // TDD Progress Report（完成後填入）
    devLog: "### 今日完成項目\n- ...",
    testProgress: "0%（尚未開始）",
    testLog: "",
    lastModifiedBy: "Claude Sonnet 4.7",        // 執行此次工作的 AI 或工程師
    lastModifiedDate: "2026/03/07"
},
```

---

## ✅ 輸出範例

更新完成後，請回應：

```
✅ 已更新專案進度儀表板

更新項目: [功能名稱]
Row ID: #[陣列順序]
Phase: [development/testing/deployment/operations]
進度: [X]%
說明:
- [更新重點1]
- [更新重點2]

詳細內容已寫入: apps/superadmin/app/data/roadmap.ts
```

---

## 📝 常用分類（category）

- `超級管理員 (Super Admin)`
- `買家 (Buyer)`
- `房東 (Landlord)`
- `租客 (Tenant)`
- `通用/系統 (General/System)`
- `專案管理與工具 (Project Management)`
- `測試與品質保證 (Testing & QA)`
- `合約與法務 (Contracts & Legal)`
- `公司頁面 (Company Pages)`
- `金流支付 (Payments)`
- `第三方加值服務 (Third Party)`

---

## 🧩 元件架構

```
apps/superadmin/app/superadmin/dashboard/project-progress/
├── page.tsx                    # 主頁面：Tab 切換 + hash 導航（~89 行）
├── types.ts                    # ProjectProgressSettingsPayload（含 activePhase）
├── actions.ts                  # getProjectProgressSettings / setProjectProgressSettings
└── components/
    ├── PhaseTabBar.tsx         # Pill 風格四階段 Tab 列
    ├── SharedStatsCards.tsx    # 各階段差異化統計卡片
    ├── ProgressBar.tsx         # 通用進度條
    ├── StatCard.tsx            # 通用統計卡片
    ├── DevelopmentTab.tsx      # 開發 Tab（14 欄：ID/Role/LocatedPage/Feature/DEV-SPEC/TDD-Spec/TDD-Report/Unit-Folder/E2E-Folder/TDD進度/E2E進度/Prompt/Status/Notes）~1626 行
    ├── DevelopmentTab.view.test.tsx  # DevelopmentTab 視覺測試
    ├── TestingTab.tsx          # 測試 Tab（testStatus/coverage/defect）
    ├── DeploymentTab.tsx       # 部署 Tab（deployStatus/env/version）
    └── OperationsTab.tsx       # 運維 Tab（uptime/errorRate/responseTime）
```

### 測試腳本目錄

```
apps/superadmin/
├── unit_test/                  # 單元與整合測試（非 unit_and_integration_test）
│   ├── 002/                    # 行為監控相關測試
│   └── 004/                    # 雲端空間管理相關測試
└── e2e/                        # E2E / 驗收測試
    ├── 004/                    # 編號 subdir（storage dashboard）
    ├── ai-settings/            # 命名 subdir（AI 設定相關 E2E）
    └── *.spec.ts               # 其他 E2E 測試
```

---

## 🔑 重要欄位補充說明（`RoadmapFeature` 介面）

以下欄位為 `roadmap.ts` 中定義但指南未充分說明的欄位：

| 欄位                                            | 說明                                                 |
| :---------------------------------------------- | :--------------------------------------------------- |
| `devCompletedCount` / `devTodoCount`        | 開發任務完成數/總數，顯示為「完成數/TODO數」         |
| `testScriptCount` / `testScriptPassedCount` | 測試腳本總數 / 已通過數（顯示通過率）                |
| `testScriptPath`                              | 測試腳本實際目錄路徑（相對專案根）                   |
| `devLogDocPath`                               | 開發日誌文件路徑（`project-process/dev-logs/` 下） |
| `developmentProgress`                         | 開發進度的文字描述（非百分比，供摘要說明）           |
| `workCategory`                                | 工作類別（如「重構/優化」「維運」「文件撰寫」）      |
| `points`                                      | Story Points，工作量估算                             |
| `mode`                                        | AI 模式（如 `'agent'`、`'chat'`）                |
| `model`                                       | 使用的 AI 模型名稱（如 `'claude-sonnet-4-6'`）     |

---

## 🚦 Status 自動推導邏輯（`deriveRowStatus()`）

頁面載入時系統自動推導每列狀態（**不**寫入 roadmap.ts）：

| 條件                                                                  | 推導狀態        |
| :-------------------------------------------------------------------- | :-------------- |
| `developmentProgress` 或 `testProgress` 包含「暫緩/暫停/on hold」 | `on_hold`     |
| `percentage >= 100`                                                 | `completed`   |
| `percentage > 0`                                                    | `in_progress` |
| `phase === 'operations'` 或 `'deployment'`                        | `completed`   |
| `phase === 'testing'` 或 `testStatus === 'in_progress'`           | `in_progress` |
| 其他                                                                  | `not_started` |

工程師可在儀表板 Status 欄的下拉選單手動覆寫（僅本次瀏覽會話有效，頁面重整後恢復自動推導）。
