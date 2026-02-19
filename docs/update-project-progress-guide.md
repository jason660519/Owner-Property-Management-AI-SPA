# 專案進度儀表板更新指南

> **創建日期**: 2026-02-14 | **更新日期**: 2026-02-19 | **位置**: `docs/update-project-progress-guide.md`
> **用途**: 更新專案開發進度儀表板時，請依本指南操作（欄位、格式、連結規則、流程）。

請將今天的工作內容更新至專案開發進度儀表板。

## 📋 背景說明

- **目標檔案**: `apps/superadmin/app/data/roadmap.ts`
- **儀表板位置**: http://localhost:3001/superadmin/dashboard/project-progress
- **今日日期**: （使用時請以當日日期為準）

---

## 🗂️ 四階段 Tab 架構（2026-02-19 新增）

儀表板現在分為四個 Tab，對應功能生命週期：

| Tab | Hash | 說明 | 對應 `phase` 值 |
|:----|:-----|:-----|:----------------|
| 開發 Development | `#development` | 功能開發進度（預設顯示所有功能） | `'development'` |
| 測試 Testing | `#testing` | 測試覆蓋率、測試狀態追蹤 | `'testing'` |
| 部署 Deployment | `#deployment` | 部署環境、版本管理 | `'deployment'` |
| 運維 Operations | `#operations` | 正常運行率、錯誤率、回應時間 | `'operations'` |

> **預設行為**: 未設定 `phase` 的功能，系統會自動推導：有 `testCoverage > 0` 或 `testProgress` 者歸為 `'testing'`，其餘歸為 `'development'`。

### 如何切換 Tab

直接點擊頁面上方的 Pill 按鈕，或在 URL 後加 hash：
```
http://localhost:3001/superadmin/dashboard/project-progress#testing
```

---

## 🎯 資料欄位與儀表板對應

請更新或新增 `ROADMAP_DATA.features` 陣列中的物件（實際資料放在 `RAW_FEATURES`）。

### Development Tab 欄位（13 欄）

| 欄位 (`roadmap.ts`)  | 儀表板欄位名稱 (Header)             | 說明與格式 |
| ---------------------- | ----------------------------------- | ---------- |
| `name`               | **Feature**                   | 功能名稱 |
| `category`           | **Category**                  | 工作分類 |
| `acceptanceCriteria` | **Feature Spec URL**          | 功能規格與驗收標準 |
| `docPath`            | **Dev Progress URL**          | 開發進度文件路徑（顯示為連結） |
| `testProgress`       | **TTD Spec URL**              | 測試標準與日誌（顯示為文字） |
| `percentage`         | **Dev Progress**              | 開發進度條 (0-100) |
| `testCoverage`       | **Test Coverage**             | 測試覆蓋度進度條 (0-100) |
| `mode`               | **Mode**                      | AI 模式：`'agent'` / `'plan'` / `'chat'` |
| `model`              | **MODEL**                     | 使用的模型名稱 |
| `aiPrompt`           | **PROMPT**                    | 提示詞或設計提示 |
| `lastModifiedBy`     | **Last Modified**             | 最後修改者 |
| `lastModifiedDate`   | **Last Modified**             | 最後修改日期 |

### Testing Tab 專屬欄位

| 欄位 | 說明 | 型別 |
|:-----|:-----|:-----|
| `phase` | 設為 `'testing'` | `PhaseType` |
| `testStatus` | 測試狀態 | `'pending' \| 'in_progress' \| 'passed' \| 'failed'` |
| `unitTestCoverage` | 單元測試覆蓋率 % | `number` |
| `e2eTestCoverage` | E2E 測試覆蓋率 % | `number` |
| `defectCount` | 缺陷數量 | `number` |
| `testLog` | 測試日誌文字 | `string` |

### Deployment Tab 專屬欄位

| 欄位 | 說明 | 型別 |
|:-----|:-----|:-----|
| `phase` | 設為 `'deployment'` | `PhaseType` |
| `deployStatus` | 部署狀態 | `'not_deployed' \| 'staging' \| 'production' \| 'rollback'` |
| `deployEnv` | 部署環境描述 | `string` |
| `version` | 版本號（如 `v1.2.3`） | `string` |
| `deployDate` | 部署日期 | `string` |

### Operations Tab 專屬欄位

| 欄位 | 說明 | 型別 |
|:-----|:-----|:-----|
| `phase` | 設為 `'operations'` | `PhaseType` |
| `uptimePercent` | 正常運行率 % | `number` |
| `errorRate` | 錯誤率 % | `number` |
| `avgResponseTime` | 平均回應時間 ms | `number` |
| `lastIncident` | 最近事件描述 | `string` |

> ⚠️ `devLog` 欄位目前在儀表板中未直接顯示，但建議保留在 `roadmap.ts` 中作為詳細記錄。

---

## 📁 今天的工作檔案放哪裡（工程師必看）

| 我要寫的內容 | 檔案放這裡 | 填進 roadmap 的路徑範例 |
| :--- | :--- | :--- |
| **今天做了什麼（開發日誌）** | `project-process/dev-logs/` | `/project-process/dev-logs/dev-主題-2026-02-19.md` |
| **怎麼測的（測試方法／測試報告）** | `project-process/test-logs/` | `/project-process/test-logs/test-主題-2026-02-19.md` |
| **某個功能的規格／說明（總覽）** | `project-process/features/` | `/project-process/features/功能名-20260219.html` |
| **操作指南或設計文件** | `docs/` 下對應分類 | `/docs/operational-guides/xxx.md` |

- 檔名要帶日期，例如：`dev-phase-tab-refactor-2026-02-19.md`。
- 若今天**沒有**對應文件，該欄位留空字串 `""` 即可。

---

## 🔗 文件路徑規則（`docPath` 寫法參考）

`docPath` 會變成 **Superadmin 專案檔案檢視器** 的連結。路徑以**專案根目錄**為準，**一律以 `/` 開頭**。

- **放在 `docs/` 底下的文件**：`docPath` 寫 `/docs/子路徑/檔名.md`
- **放在 `project-process/` 底下**：`docPath` 寫 `/project-process/...`

若無文件，請留空字串 `""`。

---

## 🔄 更新流程

1. **讀取現有資料**
   - 讀取 `apps/superadmin/app/data/roadmap.ts`（資料在 `RAW_FEATURES` 陣列）

2. **任務識別與編號**
   - **項目 ID** 為該項目在 `features` 陣列中的順序 (Index + 1)，Dashboard 顯示為 `001`、`002`…
   - 查詢方式：直接看儀表板 Development Tab 的 ID 欄

3. **決定 phase**
   - 功能仍在開發中 → 不填或填 `phase: 'development'`
   - 開始寫測試 → `phase: 'testing'`，填 `testStatus`、`testCoverage` 等
   - 已部署到環境 → `phase: 'deployment'`，填 `deployStatus`、`version`
   - 上線監控中 → `phase: 'operations'`，填 `uptimePercent`、`errorRate`

4. **新增或更新項目**
   - **更新**: 找到對應的 `name` 進行修改
   - **新增**: 在 `RAW_FEATURES` 陣列末尾加入新物件（ROADMAP_DATA 會自動 map）

5. **填寫必填欄位**
   - `name`、`category`、`percentage`、`lastModifiedBy`、`lastModifiedDate`
   - 若涉及 AI 開發，填寫 `mode`、`model`、`aiPrompt`

6. **寫入檔案**
   - 更新 `apps/superadmin/app/data/roadmap.ts`

---

## ✅ 輸出範例

更新完成後，請回應：

```
✅ 已更新專案進度儀表板

更新項目: [功能名稱]
ID: #[陣列順序]
Phase: [development/testing/deployment/operations]
進度: [X]%
說明:
- [更新重點1]
- [更新重點2]

詳細內容已寫入: apps/superadmin/app/data/roadmap.ts
```

---

## 📝 常用分類參考

- `超級管理員 (Super Admin)`
- `買家 (Buyer)`
- `房東 (Landlord)`
- `租客 (Tenant)`
- `通用/系統 (General/System)`
- `專案管理與工具 (Project Management)`
- `測試與品質保證 (Testing & QA)`
- `認證與權限`（可自訂新分類）

---

## 🧩 元件架構參考（2026-02-19 更新）

```
apps/superadmin/app/superadmin/dashboard/project-progress/
├── page.tsx                    # 主頁面（87 行）：Tab 切換 + hash 導航
├── types.ts                    # ProjectProgressSettingsPayload（含 activePhase）
├── actions.ts                  # getProjectProgressSettings / setProjectProgressSettings
└── components/
    ├── PhaseTabBar.tsx         # Pill 風格四階段 Tab 列
    ├── SharedStatsCards.tsx    # 各階段差異化統計卡片
    ├── ProgressBar.tsx         # 通用進度條
    ├── StatCard.tsx            # 通用統計卡片
    ├── DevelopmentTab.tsx      # 開發 Tab（完整 13 欄表格功能）
    ├── TestingTab.tsx          # 測試 Tab（testStatus/coverage/defect）
    ├── DeploymentTab.tsx       # 部署 Tab（deployStatus/env/version）
    └── OperationsTab.tsx       # 運維 Tab（uptime/errorRate/responseTime）
```
