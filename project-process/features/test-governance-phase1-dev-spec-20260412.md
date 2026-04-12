# 測試治理 Phase 1 — DEV SPEC

**功能名稱**：Superadmin 測試治理（AI-native）Phase 1  
**版本**：1.0  
**日期**：2026/04/12  
**狀態**：實作中

---

## 1. 目標

建立最小可用的測試治理基礎，支援多 AI worker 並行改動後的測試可追蹤與可執行：

- 提供機器可讀測試清單（manifest）
- 提供一致性驗證（manifest validator）
- 提供 nightly 回歸入口（nightly runner）

---

## 2. 範圍

### In Scope

- 新增 `apps/superadmin/test-manifest.json`
- 新增 `tools/testing/validate-test-manifest.sh`
- 新增 `tools/testing/run-superadmin-nightly.sh`
- 在 `package.json` 補對應 script 入口
- 補 `apps/superadmin/unit_test/131/README.md`（記錄跨 ID 工具引用）

### Out of Scope

- 不做完整依賴圖（file-to-ID impact graph）
- 不做自動 quarantine 生命周期管理
- 不做 release gate 的強制阻擋

---

## 3. 資料模型（Manifest）

檔案：`apps/superadmin/test-manifest.json`

每個項目欄位：

- `id`: `common` 或三位數 ID（如 `131`）
- `name`: 測試群組名稱
- `tier`: `pr` / `nightly`
- `status`: `active` / `quarantine`
- `unitPaths`: Jest 路徑陣列
- `e2ePaths`: Playwright 路徑陣列
- `linkedToolScripts`: 關聯工具腳本（可空）

---

## 4. 驗證規則（Phase 1）

`validate-test-manifest.sh` 需驗證：

1. JSON 結構合法
2. 必填欄位存在且型別正確
3. `tier` 與 `status` 值在允許集合內
4. `unitPaths/e2ePaths/linkedToolScripts` 指向的路徑存在

失敗時 exit code 非 0，並輸出清楚錯誤訊息。

---

## 5. Nightly Runner 行為

`run-superadmin-nightly.sh` 流程：

1. 先執行 `validate-test-manifest.sh`
2. 讀取 manifest 中 `status=active` 且 `tier=nightly` 的測試路徑
3. 以 `jest --runInBand` 跑 unit paths
4. 以 `playwright test` 跑 e2e paths
5. 輸出 log 至 `logs/testing/`

---

## 6. 完成定義（DoD）

- manifest 驗證腳本可成功偵測錯誤與通過情境
- nightly runner 可從 manifest 動態取路徑並執行
- `npm` script 可一鍵執行 validate/nightly
- guide / 規則文件（update-project-progress / CLAUDE / AGENTS）已同步
