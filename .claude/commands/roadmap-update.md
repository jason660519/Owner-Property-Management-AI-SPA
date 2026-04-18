更新專案進度儀表板 `apps/superadmin/app/data/roadmap.ts` 的 `RAW_FEATURES` 陣列。

## 流程

1. 讀取 `apps/superadmin/app/data/roadmap.ts`，了解現有項目與 `RoadmapFeature` 型別定義
2. 如果 `$ARGUMENTS` 有指定功能名稱或描述，以此為依據；否則根據最近的 git diff / commit 推斷本次完成的工作
3. 在 `RAW_FEATURES` 中找到對應項目並更新，或在陣列末端新增

## 必填欄位

| 欄位               | 說明                                         |
| :----------------- | :------------------------------------------- |
| `name`             | 功能名稱                                     |
| `category`         | 分類（見下方）                               |
| `percentage`       | 開發進度 0–100                               |
| `lastModifiedBy`   | 修改者，如 `Claude Opus 4.6`                 |
| `lastModifiedDate` | 今天日期，格式 `YYYY/MM/DD`                  |

## Phase 規則

| `phase`       | 何時設定             | 額外欄位                                                    |
| :------------ | :------------------- | :---------------------------------------------------------- |
| `development` | 功能開發中（預設）   | —                                                           |
| `testing`     | 開始寫測試           | `testStatus`, `testCoverage`, `unitTestCoverage`, `e2eTestCoverage` |
| `deployment`  | 已部署               | `deployStatus`, `deployEnv`, `version`, `deployDate`        |
| `operations`  | 上線監控中           | `uptimePercent`, `errorRate`, `avgResponseTime`             |

## 常用 category 值

- `超級管理員 (Super Admin)`
- `通用/系統 (General/System)`
- `專案管理與工具 (Project Management)`
- `房東 (Landlord)`
- `租客 (Tenant)`
- `買家 (Buyer)`
- `測試與品質保證 (Testing & QA)`

## 注意事項

- 只改 `RAW_FEATURES` 陣列，不動其他程式碼
- 更新時保持既有項目的其他欄位不變
- 日期用當天實際日期
- `percentage` 應反映實際完成度，不要隨意灌到 100
