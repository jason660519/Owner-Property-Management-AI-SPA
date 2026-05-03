# 專案進度儀表板更新指南

> **創建日期**: 2026-02-14 | **更新日期**: 2026-04-28 | **位置**: `docs/update-project-progress-guide.md`
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

| 欄 | 表頭 (EN / ZH)                                         | 資料來源                               | 說明                                                                                                                                                                                                  |
| :-: | :----------------------------------------------------- | :------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | **ID / 編碼**                                    | `id`                                  | 固定 Feature ID，格式 `001`, `002`…；不得再用陣列順序臨時計算                                                                                                                                        |
| 2 | **Role/General / 按Role或通用分類**              | `category`                           | 按 Role 或通用分類（見常用分類），以 pill badge 顯示                                                                                                                                                  |
| 3 | **Located Page / 按所屬頁面分類**                | `locatedPage`                        | 功能所屬頁面路徑（可不填，顯示 `—`）                                                                                                                                                               |
| 4 | **Feature / 按功能需求分類**                     | `name`                               | 功能需求名稱                                                                                                                                                                                          |
| 5 | **DEV-SPEC (.md) / 功能規格 .md**                | `featureSpecDocPath`                 | Dev-Spec (.md) 連結，顯示為 `001-Dev-Spec.md`                                                                                                                                                       |
| 6 | **TDD Spec (.md) / TDD 規格說明書 .md**          | `tddSpecDocPath`                     | TDD Spec (.md) 連結，顯示為 `001-TDD-Spec.md`                                                                                                                                                       |
| 7 | **TDD Progress Report (.md) / TDD 進度報告 .md** | `docPath`                            | TDD Progress Report (.md) 連結，顯示為 `001-TDD-Report.md`                                                                                                                                          |
| 8 | **Unit and Integration Test Script Folder Name** | `testScriptPath` / fallback            | 固定路徑 `apps/superadmin/unit_test/{ID}`（依 Feature ID）                                                                                                                                          |
| 9 | **E2E Acceptance Test Script Folder Name**       | `id`                                  | 固定路徑 `apps/superadmin/e2e/{ID}`（依 Feature ID）                                                                                                                                                |
| 10 | **TDD Progress / TDD進度**                       | `percentage`                         | 進度條，顯示 `feature.percentage %`                                                                                                                                                                 |
| 11 | **E2E Test Progress / E2E測試進度**              | `e2eTestCoverage` / `testCoverage` | 進度條，優先用 `e2eTestCoverage`，fallback `testCoverage`                                                                                                                                         |
| 12 | **Prompt and IDE Setting / Prompt 與 IDE 設定**  | UI 操作按鈕                            | 點擊開啟「設定 Prompt / 執行」Modal，在 Modal 內選擇 IDE、今日工作類別並編輯 Prompt（**不存入** roadmap.ts）                                                                                    |
| 13 | **Development Log Summary / 開發日誌匯總**       | `devLogDocPath` / fallback 路徑      | 開啟任務 ID 專屬頁面 `/superadmin/dashboard/project-progress/task/{ID}/dev-log`；頁面優先讀 `devLogDocPath`，若未設定則 fallback 到 `/project-process/dev-logs/{ID}-development-log-summary.md` |
| 14 | **Notes / 備註**                                 | —                                     | 備註欄（目前顯示 `—`，預留擴充）                                                                                                                                                                   |

> ⚠️ **測試腳本目錄注意**：欄8 的自動產生路徑為 `apps/superadmin/unit_test/{ID}/`（**非** `unit_and_integration_test`）。

## 🆔 Feature ID 辨識防呆（必讀）

本專案曾發生「用陣列順序或 table row 順序推算 ID，導致文件掛到錯列」的事故。之後請把以下規則視為硬性規則：

1. **唯一真值是 `roadmap.ts` 每個 feature 物件的 `id` 欄位**。
   - ID 欄顯示、Prompt、Paperclip 任務、測試目錄、開發日誌 fallback 都必須讀 `feature.id`。
   - 禁止再用 `RAW_FEATURES` index、Development Tab 過濾後列序、或 regex count 推算正式 ID。
2. **若 user 提供截圖或明確說 ID 084，先以該 ID 為準**。
   - 再到 `apps/superadmin/app/data/roadmap.ts` 搜尋 `id: "084"` 核對 `name`。
   - 不要先用 feature 名稱反推另一個 ID，再覆蓋 user 提供的 ID。
3. **feature 名稱只能用來定位候選，不能單獨當作 ID 依據**。
   - 同一主題可能有相近名稱。
   - 缺欄位或 phase 變更不應影響 ID。
4. **正式下手前，至少核對以下 4 項是否一致**：
   - user / 儀表板顯示的 ID
   - `roadmap.ts` 內的 `id`
   - `roadmap.ts` 內的 exact feature `name`
   - `apps/superadmin/unit_test/{ID}`、`apps/superadmin/e2e/{ID}`、`devLogDocPath`
5. **修改完成後，再做一次回寫驗證**：
   - `id`
   - `devLogDocPath`
   - `featureSpecDocPath`
   - `tddSpecDocPath`
   - `docPath`
   - `testScriptPath`
   - 以上欄位都不得殘留錯的 Feature ID。

### 常見錯誤示例

- 錯誤作法：用 `RAW_FEATURES` 陣列順序或 table 過濾後列序當作正式 ID。
- 錯誤原因：前面新增、移動、phase 變更、hidden row 或 tab filter 都可能造成 row 序號漂移。
- 正確作法：只讀 `feature.id`。若 `id` 缺失，先補上固定 ID，再更新任何文件或測試路徑。

### 安全辨識 Feature ID 的標準 Node 檢查範本

以下範本的目的只有一個：**從 `roadmap.ts` 的固定 `id` 欄位查詢 feature**。

```bash
node - <<'NODE'
const fs = require('fs');

const filePath = 'apps/superadmin/app/data/roadmap.ts';
const targetName = '開發環境 Docker 整合 - Paperclip 自動啟停';
const content = fs.readFileSync(filePath, 'utf8');

const featureBlockPattern = /\\{\\s*id:\\s*"([^"]+)",[\\s\\S]*?name:\\s*"([^"]+)"/g;
const features = [...content.matchAll(featureBlockPattern)].map((match) => ({
   id: match[1],
   name: match[2],
}));

const feature = features.find((item) => item.name === targetName);
if (!feature) throw new Error(`Feature not found: ${targetName}`);

console.log(JSON.stringify({
   featureId: feature.id,
   name: feature.name,
}, null, 2));
NODE
```

#### 使用規則

1. 先把 `targetName` 改成你要核對的 feature 名稱。
2. 執行後只把輸出的 `featureId` 當作**正式 ID 來源**。
3. 若輸出的 `featureId` 與 user / 儀表板顯示 ID 不一致，**先停下來查明原因**，不要直接改檔。
4. 核對通過後，再建立 `apps/superadmin/unit_test/{ID}`、`apps/superadmin/e2e/{ID}` 與對應 `.md` 文件。

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
| `devLogDocPath`                         | 欄13：開發日誌匯總頁的 md 主來源                                    |
| `lastModifiedBy` / `lastModifiedDate` | 不在 Development Tab 顯示（仍建議填寫）                             |

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
- 開發日誌匯總頁 URL 固定為：`/superadmin/dashboard/project-progress/task/{Feature-ID}/dev-log`

---

🔗 文件路徑規則

路徑以**專案根目錄**為準，**一律以 `/` 開頭**，寫入 `docPath` / `featureSpecDocPath` / `tddSpecDocPath`。**一律使用 .md 副檔名**

- `docs/` 底下：`/docs/子路徑/檔名.md`
- `project-process/` 底下：`/project-process/dev-logs/dev-xxx-2026-03-07.md`、`/project-process/features/xxx-spec-20260307.md`

---

## 🧱 測試腳本目錄慣例

| 類型           | 路徑（依 Feature ID）               | 範例                               |
| :------------- | :---------------------------------- | :--------------------------------- |
| 單元與整合測試 | `apps/superadmin/unit_test/{ID}/` | `apps/superadmin/unit_test/002/` |
| E2E 測試       | `apps/superadmin/e2e/{ID}/`       | `apps/superadmin/e2e/004/`       |

> Feature ID 對應 `roadmap.ts` 每個 feature 物件的固定 `id` 欄位，儀表板**欄8/欄9** 依此產生對應連結。
>
> ⚠️ **注意**：實際測試目錄為 `apps/superadmin/unit_test/`（非 `unit_and_integration_test`）。E2E 請採「ID 專屬 + common」雙軌：`apps/superadmin/e2e/{ID}/` 與 `apps/superadmin/e2e/common/`，避免根層散落 `.spec.ts`。

### 跨 ID 可重用工具（必讀）

為避免把通用工具誤放到單一 ID 的測試資料夾，請遵循以下規範：

| 類型                                         | 放置路徑                                                             | 範例                                                                      |
| :------------------------------------------- | :------------------------------------------------------------------- | :------------------------------------------------------------------------ |
| **單一 ID 驗收腳本**（只服務某個 Row） | `apps/superadmin/unit_test/{ID}/` 或 `apps/superadmin/e2e/{ID}/` | `apps/superadmin/e2e/131/people-database-single-page-workspace.spec.ts` |
| **跨功能共用 E2E（非特定 ID）**        | `apps/superadmin/e2e/common/`                                      | `apps/superadmin/e2e/common/smoke/login-redirect.spec.ts`               |
| **跨 ID 可重用工具**（多個功能會用）   | `tools/<domain>/`                                                  | `tools/people-db/check-es.sh`, `tools/people-db/seed-es-sample.sh`    |

**硬性規則**：

1. `testScriptPath` 只填 ID 專屬測試目錄（`apps/superadmin/unit_test/{ID}`），**不要**填 `tools/...`。
2. `tools/...` 腳本若被某個 ID 使用，需在該 ID 的 `unit_test/{ID}/README.md` 註明「如何呼叫工具」。
3. `tools/...` 腳本命名需表意清楚，建議採 `check-*` / `seed-*` / `convert-*`。
4. `tools/...` 若有參數，需提供 `--help`，並在對應 `docs/operational-guides/*.md` 補上使用範例。

**判斷口訣**：

- 只為某一個 Feature ID 驗收而寫 → 放 `unit_test/{ID}` 或 `e2e/{ID}`
- 不是單一 ID，且屬於通用 UI/流程驗收 → 放 `e2e/common`
- 以後其他 Feature ID 也可能拿來用 → 放 `tools/...`

---

## 🔄 更新流程

1. **讀取現有資料**：讀取 `apps/superadmin/app/data/roadmap.ts` 的 `RAW_FEATURES` 陣列
2. **識別 Feature ID**：直接看儀表板 Development Tab 的 ID 欄（001, 002…），並以 `roadmap.ts` 的 `id` 欄位核對

   - 若 user 已提供 ID / 截圖，先以該 ID 為主，再到 `roadmap.ts` 搜尋 `id: "{ID}"` 驗證名稱與欄位。
   - 禁止用 `RAW_FEATURES` index、table row index、或依賴可選欄位的 regex / parser 估算。
3. **決定 phase**

   - 功能仍在開發中 → 不填或填 `phase: 'development'`
   - 開始寫測試 → `phase: 'testing'`，填 `testStatus`、`testCoverage` 等
   - 已部署到環境 → `phase: 'deployment'`，填 `deployStatus`、`version`
   - 上線監控中 → `phase: 'operations'`，填 `uptimePercent`、`errorRate`
4. **新增或更新項目**

   - **更新**：找到對應的 `name` 進行修改
   - **新增**：在 `RAW_FEATURES` 陣列末尾加入新物件
5. **必填欄位**：`name`、`category`、`percentage`、`lastModifiedBy`、`lastModifiedDate`
6. **選填但建議填寫**：`locatedPage`、`featureSpecDocPath`、`tddSpecDocPath`、`docPath`、`e2eTestCoverage`、`devLog`
7. **建立配套文件與目錄**（每次更新進度時必須檢查）：

   根據 Feature ID（如 `027`），檢查並建立以下檔案與目錄：

   | 項目                | 路徑                                                         | roadmap.ts 欄位        | 說明                                            |
   | :------------------ | :----------------------------------------------------------- | :--------------------- | :---------------------------------------------- |
   | Dev Spec            | `project-process/features/{功能名}-dev-spec-{YYYYMMDD}.md` | `featureSpecDocPath` | 功能規格說明書，含架構、API、檔案清單、擴充指南 |
   | TDD Spec            | `project-process/features/tdd-{功能名}-{YYYYMMDD}.md`      | `tddSpecDocPath`     | 測試規格，含單元/整合/E2E 測試案例、Mock 策略   |
   | TDD Progress Report | `project-process/test-logs/test-{功能名}-{YYYY-MM-DD}.md`  | `docPath`            | 測試進度報告，含覆蓋率、手動驗證紀錄、待辦      |
   | Unit Test 目錄      | `apps/superadmin/unit_test/{Feature-ID}/`                  | `testScriptPath`     | 單元與整合測試腳本存放處                        |
   | E2E Test 目錄       | `apps/superadmin/e2e/{Feature-ID}/`                        | —                     | E2E 驗收測試腳本存放處                          |

   **流程**：


   1. 確認 Feature ID（如 `027`）
      - 先核對 user / 儀表板顯示的 ID 是否一致
      - 再核對 feature `name` 與 `apps/superadmin/unit_test/{ID}`、`apps/superadmin/e2e/{ID}` 是否對齊
   2. 建立上述 3 個 `.md` 文件（若已存在則更新內容）
   3. 建立 `unit_test/{Feature-ID}/` 和 `e2e/{Feature-ID}/` 目錄（若已存在則跳過）
   4. 在 roadmap.ts 中填入 `featureSpecDocPath`、`tddSpecDocPath`、`docPath`、`testScriptPath`
   5. 回讀檢查 `id`、`devLogDocPath`、`testScriptPath`，確認沒有掛到別的 Feature ID

   **範例**（Feature ID = 027，備份系統）：

   ```
   project-process/features/backup-system-dev-spec-20260406.md
   project-process/features/tdd-backup-system-20260406.md
   project-process/test-logs/test-backup-system-2026-04-06.md
   apps/superadmin/unit_test/027/
   apps/superadmin/e2e/027/
   ```

---

## 📝 新增任務範例

```typescript
// === 2026-04-06 新增任務 ===
{
    name: "功能名稱（中英雙語建議）",
    locatedPage: "superadmin/dashboard/xxx",   // 或 "web/landlord/xxx"，待建則寫 "xxx (待建)"
    percentage: 0,                              // 0~100
    phase: "development",                       // 若省略，系統自動推導
    category: "超級管理員 (Super Admin)",       // 見常用分類
    points: 5,                                  // Story Points（工作量估算）
    featureSpecDocPath: "/project-process/features/xxx-dev-spec-20260406.md",
    tddSpecDocPath: "/project-process/features/tdd-xxx-20260406.md",
    docPath: "/project-process/test-logs/test-xxx-2026-04-06.md",
    testScriptPath: "apps/superadmin/unit_test/028",
    devLog: "### 今日完成項目\n- ...",
    testProgress: "0%（尚未開始）",
    testLog: "",
    lastModifiedBy: "Claude Opus 4.6",          // 執行此次工作的 AI 或工程師
    lastModifiedDate: "2026/04/06"
},
```

> ⚠️ **重要**：新增任務後，務必同步建立上述 3 個 `.md` 文件和 2 個測試目錄，否則儀表板的連結會指向空白頁面。

---

## ✅ 輸出範例

更新完成後，請回應：

```
✅ 已更新專案進度儀表板

更新項目: [功能名稱]
Feature ID: #[roadmap.ts id]
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
    ├── DevelopmentTab.tsx      # 開發 Tab（14 欄：ID/Role/LocatedPage/Feature/DEV-SPEC/TDD-Spec/TDD-Report/Unit-Folder/E2E-Folder/TDD進度/E2E進度/Prompt/DevLogSummary/Notes）
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
    ├── 131/                    # 編號 subdir（people database）
    ├── common/                 # 跨功能共用 E2E（不綁定單一 ID）
    │   ├── smoke/              # nightly 快速健康檢查層
    │   └── regression/         # nightly 完整回歸層
    └── utils/                  # E2E 共用 helper
```

---

## 🔑 重要欄位補充說明（`RoadmapFeature` 介面）

以下欄位為 `roadmap.ts` 中定義但指南未充分說明的欄位：

| 欄位                                            | 說明                                                          |
| :---------------------------------------------- | :------------------------------------------------------------ |
| `devCompletedCount` / `devTodoCount`        | 開發任務完成數/總數，顯示為「完成數/TODO數」                  |
| `testScriptCount` / `testScriptPassedCount` | 測試腳本總數 / 已通過數（顯示通過率）                         |
| `testScriptPath`                              | 測試腳本實際目錄路徑（相對專案根）                            |
| `devLogDocPath`                               | 開發日誌文件路徑；欄13 會開啟任務 ID 專屬頁並以此 md 為主來源 |
| `developmentProgress`                         | 開發進度的文字描述（非百分比，供摘要說明）                    |
| `workCategory`                                | 工作類別（如「重構/優化」「維運」「文件撰寫」）               |
| `points`                                      | Story Points，工作量估算                                      |
| `mode`                                        | AI 模式（如 `'agent'`、`'chat'`）                         |
| `model`                                       | 使用的 AI 模型名稱（如 `'claude-sonnet-4-6'`）              |

---

## 🚦 狀態統計卡片自動推導邏輯（`deriveRowStatus()`）

雖然 Development Tab 已不再顯示 `Status` 下拉欄，但頁面上方的狀態統計卡片仍會自動推導每列狀態（**不**寫入 roadmap.ts）：

| 條件                                                                  | 推導狀態        |
| :-------------------------------------------------------------------- | :-------------- |
| `developmentProgress` 或 `testProgress` 包含「暫緩/暫停/on hold」 | `on_hold`     |
| `percentage >= 100`                                                 | `completed`   |
| `percentage > 0`                                                    | `in_progress` |
| `phase === 'operations'` 或 `'deployment'`                        | `completed`   |
| `phase === 'testing'` 或 `testStatus === 'in_progress'`           | `in_progress` |
| 其他                                                                  | `not_started` |

---

## 🧭 測試治理 Phase 1（AI-native 最小落地）

為支援「1 人 + 多 AI worker（Paperclip/Hermes/Cursor Agent）」並行開發，採用下列最小治理組件：

1. **機器可讀測試清單**

   - 檔案：`apps/superadmin/test-manifest.json`
   - 目的：定義每個 ID / common 的 unit 與 e2e 測試路徑、執行層級（`pr` / `nightly`）、狀態（`active` / `quarantine`）。
   - `tier=nightly` 時需標示 `nightlyLayer`：`smoke` 或 `regression`。
   - `tier=nightly` 時需標示 `nightlyOrder`（非負整數），供同層執行排序（數字越小越先執行）。
2. **一致性驗證腳本**

   - 檔案：`tools/testing/validate-test-manifest.sh`
   - 目的：在本地或 CI 驗證 manifest 結構、路徑存在性、tier/status 合法值。
3. **Nightly 回歸腳本**

   - 檔案：`tools/testing/run-superadmin-nightly.sh`
   - 目的：每日/排程執行 active 測試並輸出 log；先跑 manifest 驗證，再依 `nightlyLayer` 順序執行（先 smoke，後 regression）。

### 規則補充

- `roadmap.ts` 仍是「人讀進度儀表板」來源；`test-manifest.json` 是「機器執行測試編排」來源，兩者職責不同。
- `quarantine` 僅做短期隔離，需在對應 ID 的 README 註記原因與修復計畫。
- 新增測試腳本時，除了更新 `roadmap.ts`，也要同步更新 `test-manifest.json`。
