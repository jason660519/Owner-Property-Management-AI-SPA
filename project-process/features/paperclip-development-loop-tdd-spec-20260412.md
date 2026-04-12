# Superadmin × Paperclip 開發流程整合 — TDD SPEC

**功能 ID**: 130  
**功能名稱**: Superadmin × Paperclip 開發流程整合（Prompt→Issue→Worktree→Diff→Merge）  
**版本**: 1.0  
**日期**: 2026/04/12  
**測試框架**: Jest（單元/路由整合）  
**狀態**: 測試基線已建立並通過

---

## 1. 測試目標

確保以下高風險區塊在重構後仍維持可用：

1. issue 建立與 worktree 隔離流程正確。
2. auto-route 與 payload 建構規則穩定。
3. diff/merge/cleanup 安全防線不回歸。
4. status/run-log/cost 查詢路由輸出一致。

---

## 2. 現況測試盤點（實際檔案）

### 2.1 `apps/superadmin/lib/paperclip/__tests__`

- `auto-route.test.ts`
- `buildIssuePayload.test.ts`
- `client.test.ts`
- `diff-parser.test.ts`
- `git-hook.test.ts`
- `links.test.ts`
- `worktree.test.ts`

### 2.2 `apps/superadmin/app/api/paperclip/**/__tests__`

- `issues/__tests__/route.test.ts`
- `issues/[issueId]/status/__tests__/route.test.ts`
- `issues/[issueId]/run-log/__tests__/route.test.ts`
- `issues/[issueId]/cost/__tests__/route.test.ts`
- `worktrees/__tests__/route.test.ts`
- `worktrees/cleanup/__tests__/route.test.ts`
- `worktrees/[slug]/diff/__tests__/route.test.ts`
- `worktrees/[slug]/merge/__tests__/route.test.ts`

### 2.3 E2E 驗收腳本（Playwright）

- `apps/superadmin/e2e/130/paperclip-development-loop.spec.ts`
  - 流程：`project-progress` 搜尋 row 130 → `PromptEngineerModal` 預覽送單 → mock 送出 issue → `paperclip-worktrees` 檢視 diff。
  - 設計：以 route mock 固定 `/api/paperclip/*` 回應，避免外部 Paperclip 服務波動造成 flaky。
  - 雙模式：提供 `E2E_SUPERADMIN_EMAIL` / `E2E_SUPERADMIN_PASSWORD` 時必跑；未提供時在 CI 輸出明確 warning 並以 skip 結束（不強制整體 pipeline fail）。

---

## 3. 已驗證基線（2026/04/12）

執行命令：

`npm run test --workspace superadmin -- paperclip --runInBand`

結果：

- Test Suites: `15 passed`
- Tests: `234 passed`
- 失敗: `0`
- 總耗時: 約 `1–3s`（依機器與當下負載而定）

---

## 4. TDD 測試分層與案例要點

### 4.1 單元測試（Pure / Utility）

- auto-route
  - 關鍵字命中對應角色。
  - 無命中走 architect fallback。
  - ASCII boundary 避免誤判。
- payload builder
  - title/description/agentId 組裝正確。
  - company/baseUrl 缺失時行為可預期。
- git-hook / worktree util
  - forbidden path 解析與攔截規則。
  - slug 正規化、防 traversal。
- diff parser / links
  - diff 區塊解析穩定。
  - deep-link/search-link URL 組裝正確。

### 4.2 路由整合測試（Next API）

- issues route
  - payload 驗證失敗會回 4xx。
  - 建立失敗時執行 best-effort cleanup。
  - assignee 缺失可觸發 server auto-route。
- worktrees routes
  - 列表可讀取 worktree summary。
  - diff 回傳 commits/stat/diff 資料。
  - merge 支援 dry-run 與真 merge 路徑。
  - cleanup 可正確刪除 worktree/branch。
- issue sub-routes
  - status / run-log / cost 正確回傳 snapshot。

---

## 5. 待補測試（下一輪）

1. **已補 E2E happy-path，待 CI 帳密整合**
   - 腳本已建立：`apps/superadmin/e2e/130/paperclip-development-loop.spec.ts`
   - 待事項：在 CI 注入 `E2E_SUPERADMIN_EMAIL` / `E2E_SUPERADMIN_PASSWORD`，將 skip 轉為正式執行。
2. **Merge 衝突場景**
   - 人為製造 conflict，驗證 UI error 與 recover 指引。
3. **長時間 run-log 穩定性**
   - 模擬大輸出與輪詢中斷重連。

---

## 6. 覆蓋策略與門檻（建議）

- `lib/paperclip/*`: line ≥ 85%
- `app/api/paperclip/*`: line ≥ 85%，branch ≥ 80%
- CI gate:
  - `npm run test --workspace superadmin -- paperclip --runInBand`
  - 後續補上 paperclip 專屬 coverage 任務與閾值檢查

---

## 7. 追蹤欄位對齊（Roadmap）

- `phase`: testing
- `testStatus`: passed
- `unitTestCoverage`: 95（維持現值）
- `testCoverage`: 92（維持現值）
- `e2eTestCoverage`: 88（維持現值，待補正式 E2E 腳本）

