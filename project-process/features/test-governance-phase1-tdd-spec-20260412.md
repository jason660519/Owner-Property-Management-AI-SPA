# 測試治理 Phase 1 — TDD SPEC

**功能名稱**：Superadmin 測試治理（AI-native）Phase 1  
**版本**：1.0  
**日期**：2026/04/12  
**框架**：Jest / Playwright / Shell script

---

## 1. 測試策略

採「紅 -> 綠」最小迭代：

1. 先建立 manifest schema 與驗證條件（預期可抓出錯誤）
2. 補齊可通過資料（valid manifest）
3. 以 nightly runner 串接實際測試執行流程

---

## 2. 測試案例

### 2.1 Manifest 驗證腳本

檔案：`tools/testing/validate-test-manifest.sh`

#### Case A: 正確 manifest

- 輸入：完整欄位 + 路徑存在
- 預期：exit 0，輸出 `validation passed`

#### Case B: 缺少必填欄位

- 輸入：缺 `tier` / `status`
- 預期：exit 1，輸出缺欄位錯誤

#### Case C: enum 非法

- 輸入：`tier=weekly` 或 `status=paused`
- 預期：exit 1，輸出 enum 錯誤

#### Case D: 路徑不存在

- 輸入：`unitPaths` 或 `e2ePaths` 包含不存在路徑
- 預期：exit 1，輸出 missing path

---

### 2.2 Nightly Runner

檔案：`tools/testing/run-superadmin-nightly.sh`

#### Case E: 驗證先於執行

- 當 manifest 無效時
- 預期：nightly runner 直接失敗，不執行測試

#### Case F: active+nightly 路徑收斂

- 輸入：manifest 含 `pr/nightly`、`active/quarantine`
- 預期：只執行 `active + nightly`

#### Case G: log 產出

- 執行 nightly runner
- 預期：在 `logs/testing/` 產生 timestamp log

---

## 3. 手動驗證清單

- [ ] `tools/testing/validate-test-manifest.sh` 可獨立執行
- [ ] `tools/testing/run-superadmin-nightly.sh` 可獨立執行
- [ ] `npm run test:manifest:superadmin` 可執行
- [ ] `npm run test:nightly:superadmin` 可執行
- [ ] `apps/superadmin/unit_test/131/README.md` 可追溯工具腳本

---

## 4. 驗收標準

- manifest 變更可被腳本自動驗證
- nightly runner 可自動組合測試路徑並執行
- 規範文件與腳本行為一致
