# 開發日誌 — Row 100 AI Settings Adapter 自報版本驗證（2026-04-19）

**Row ID**：100
**功能名稱**：超級管理員-AI 服務設定（API 金鑰與模型費用）
**對應頁面**：`/superadmin/settings/api_key_and_model_setting#adapter-config`
**DEV-SPEC**：`/project-process/features/ai-settings-adapter-self-report-dev-spec-20260419.md`
**TDD-SPEC**：`/project-process/features/tdd-ai-settings-adapter-self-report-20260419.md`
**TDD Progress Report**：`/project-process/test-logs/test-ai-settings-adapter-self-report-2026-04-19.md`
**狀態**：✅ Done — 邏輯與設定皆完成、實機驗證通過、25/25 unit tests 全綠

---

## 1) 本日完成任務清單（交付物 + 完成度）

| #   | 任務                                                                              | 具體交付物                                                                                                | 完成度 |
| :-: | :-------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- | :----: |
|  1  | 識別「OpenCode CLI + MiniMax M2.7」evaluation 邏輯漏洞（誤判 pass）               | 問題定位文件（本檔 §2 困難 A）                                                                            |  100%  |
|  2  | 新增 `parseSelfReportedModel` 純函式，從模型回應抽取家族 + 版本指紋                | `apps/superadmin/app/superadmin/settings/api_key_and_model_setting/adapter-evaluation.ts`（新增 ~120 行） |  100%  |
|  3  | 新增 `compareSelfReportToRequested`，回傳 5 種比對狀態                            | 同上                                                                                                      |  100%  |
|  4  | 在 `evaluateAdapterRun` 加第三道檢查（version-mismatch → fail 級別）              | 同上                                                                                                      |  100%  |
|  5  | 補齊 15 個新測試（含截圖回歸 case：m2.7 served as m2.1）                          | `apps/superadmin/app/superadmin/settings/api_key_and_model_setting/__tests__/adapter-evaluation.test.ts`  |  100%  |
|  6  | 確認 OpenCode CLI 真實可用 MiniMax 模型清單（`opencode models`）                  | 本檔 §2 困難 B 表格                                                                                       |  100%  |
|  7  | 將 Kilo / OpenCode 兩列 MiniMax adapter id 從 `minimax/minimax-m2.7` 改為 `openrouter/minimax/minimax-m2.5` | `apps/superadmin/lib/adapter-config.ts`（行 86-107、152-168）                                             |  100%  |
|  8  | Label 加註「（實際 M2.5）」並補檔內註解說明 OpenRouter 偷換版本之事實             | 同上                                                                                                      |  100%  |
|  9  | 實機驗證：requested = effective = `openrouter/minimax/minimax-m2.5`，模型自報 M2.5、evaluation pass | 截圖確認（`source: requested`）                                                                           |  100%  |

---

## 2) 遭遇困難（現象 → 排查 → 根因 → 解法）

### 困難 A：evaluation 顯示 pass，但實際模型版本被偷換

- **問題現象**
  Adapter Config 表格 row「OpenCode CLI + MiniMax M2.7」執行測試 prompt「你是哪一家的模型？型號是？」後：
  - `requested = minimax/minimax-m2.7`
  - `effective = minimax/minimax-m2.7`
  - 模型回應：「我是 **MiniMax-M2.1**，由 MiniMax 公司构建的AI助手。」
  - Evaluation badge：**模型正確（及格）** 🟢

- **排查過程**
  1. 讀 `adapter-evaluation.ts` 的 `evaluateAdapterRun` 完整流程，確認所有判斷分支。
  2. 比對 `requested` vs `effective` — 兩者通過 `modelIdentityFingerprint` 比對（皆為 `minimaxminimaxm27`）。
  3. 檢查 `effectiveModel` 來源：route.ts 中 `effectiveModel` 由請求 payload echo 回傳（API 端的 fallback `source: requested`），完全沒驗證模型自報內容。
  4. 確認測試 prompt 本意就是要「拿模型自報跟 requested 對拍」，但程式碼沒做這步。

- **根因分析**
  Evaluation 流程把「模型 echo 的 id」誤當成「模型實際身分」。在 OpenRouter 這類聚合 router 上，`m2.7` 是空殼端點、會 silently route 到 m2.1，而 echo 回來的 id 仍是 m2.7，這條線從未被檢查。

- **最終解決方案**
  新增三段式邏輯：
  1. `parseSelfReportedModel(text)`：從 renderedOutput 抽家族（minimax/kimi/glm/gpt/claude/...）+ 版本指紋（如 `m21`、`35`、`4o`）。
  2. `compareSelfReportToRequested(self, requested)`：回傳 `match` / `version-mismatch` / `family-mismatch` / `family-only-match` / `not-detected`。
  3. `evaluateAdapterRun` 在原本 pass 條件後加檢查：**只有 `version-mismatch` 才降為 fail**（保守策略，避免假陽性）。

  訊息範例：「不及格（模型自報為 MiniMax-M2.1，與請求的 minimax/minimax-m2.7 不一致，provider 可能未誠實回傳實際版本）」

### 困難 B：找正確 MiniMax 模型 id 時發現 OpenCode model 命名規則不直觀

- **問題現象**
  `apps/superadmin/lib/adapter-config.ts` 寫的是 `minimax/minimax-m2.7`（無 provider prefix），但 OpenCode CLI 認識的全名是 `openrouter/minimax/minimax-m2.7`。

- **排查過程**
  1. `which opencode && opencode --version` → `1.4.6` 已安裝。
  2. `opencode models | grep minimax` → 拿到全部可用清單。
  3. 比對 [adapter-config.ts:91, 146](apps/superadmin/lib/adapter-config.ts:91) 寫法與 CLI 期望格式。

  CLI 真實清單：
  | Model ID | 備註 |
  |---|---|
  | `opencode/minimax-m2.5` | OpenCode 原生 |
  | `opencode/minimax-m2.5-free` | 免費層 |
  | `openrouter/minimax/minimax-m2` / `m2.1` / `m2.5` / `m2.7` | OpenRouter 聚合 |

- **根因分析**
  OpenCode 1.x 的 CLI model id 採用 `<provider>/<vendor>/<model>` 三段式，舊有 config 只寫了後兩段，導致 CLI 走 fallback 路徑 → 接到 OpenRouter 的 `openrouter/auto`，再被 router 隨機 route 到能用的版本。

- **最終解決方案**
  - id 改為 `openrouter/minimax/minimax-m2.5`（補上 provider prefix + 換成會誠實自報的版本）
  - Label 維持「MiniMax M2.7」並加「（實際 M2.5）」註記
  - 在 adapter-config.ts 內補 JSDoc 解釋為何不用 m2.7

### 困難 C：本地 dev server 已被佔用，preview_start 無法接管

- **問題現象**
  `mcp__Claude_Preview__preview_start` 回傳 `Port 3001 is required by this server but is in use by another process`。

- **排查過程**
  - `curl -s http://localhost:3001/...` 回 307（redirect to login），確認 dev server 確實在跑。
  - 改用 `mcp__chrome-devtools__navigate_page` 接已開的 Chrome instance，仍被 login wall 擋住。

- **根因分析**
  Preview MCP 設計上只能管自己 spawn 的 server；外部已啟動的 Next.js dev server 沒辦法被它接管。Login wall 又擋住了非互動式驗證。

- **最終解決方案**
  - 改靠 (a) 單元測試覆蓋邏輯正確性 (b) 由使用者人工登入後實機驗證
  - 使用者實機跑「OpenCode CLI + MiniMax M2.7（實際 M2.5）」確認模型自報 M2.5、evaluation 顯示 pass，與我們改 id 後預期一致

---

## 3) 本日踩雷事件與事前可預防指標

| 踩雷事件                                                              | 影響                                                       | 事前可預防指標                                                                  |
| :-------------------------------------------------------------------- | :--------------------------------------------------------- | :------------------------------------------------------------------------------ |
| 第一次寫好 `parseSelfReportedModel` 後，邏輯被 revert（未 commit 期間） | 同樣的程式碼寫了兩次（雖然第二次有微調為 fail 級別）       | 完成階段性邏輯後立即 git stash 或暫存到 worktree，避免被中途 revert             |
| Adapter id 缺 provider prefix 已存在數週都沒被發現                    | OpenCode 走錯路徑、跑 `openrouter/auto`、計費與測試結果不可控 | CI 加一道 lint：所有 `provider: 'opencode' \| 'kilo'` 的 `model` 欄位必須以 `opencode/` 或 `openrouter/` 開頭 |
| Evaluation 判定只比對 config 端字串、未驗模型自報                     | provider 偷換版本長期沒人發現                              | 評估邏輯必須有「外部證據」交叉驗證（已落地：自報版本核對）                      |
| `m2.7` 這種「廠商還沒釋出但 OpenRouter 列表上有」的版本號常見          | 表面 200 OK 但實際是其他版本，誤導測試結果                  | Adapter row 新增 `model_existence_validated_at` 欄位；nightly 驗證一次模型自報 vs requested |

---

## 4) 下次避免措施（流程 / 工具 / 自動化）

### 4.1 流程優化

1. **新增 `provider model id` 命名規範**到 `.claude/rules/general.md`：
   - `opencode` / `kilo` provider 的 `model` 欄位必須含 provider prefix（`opencode/...` 或 `openrouter/...`）。
   - 任何聚合 router（OpenRouter、Together、AnyScale）模型一律標 prefix。
2. **PR checklist 加一行**：「若新增 / 修改 adapter row，是否已在本機跑過一次測試 prompt 並核對模型自報？」

### 4.2 工具導入

1. **CI 規則 `tools/testing/lint-adapter-model-ids.sh`**：
   - 掃 `apps/superadmin/lib/adapter-config.ts`
   - 對每個 row 比對其 `provider` 與 `model` 字串前綴
   - 輸出未通過的 row 名稱與建議修正
2. **`scripts/verify-adapter-self-report.ts`**（nightly job）：
   - 對所有 `status === 'planned'` 或 `'active'` 的 adapter，用統一 prompt 跑一次測試
   - 解析自報、比對 requested、產生報告
   - 結果寫到 `apps/superadmin/lib/adapter-config.ts` 旁邊的 `adapter-self-report-history.json`
   - 連續 3 次 mismatch → 自動建 issue

### 4.3 自動化腳本需求

| 腳本 | 觸發 | 用途 | 預估工時 |
| :--- | :--- | :--- | :--: |
| `tools/testing/lint-adapter-model-ids.sh` | pre-commit / CI | 阻擋缺 provider prefix 的 adapter id 進 main | 1.5h |
| `scripts/verify-adapter-self-report.ts` | nightly cron | 跨 adapter 偷換版本偵測 | 4h |
| `tools/people-db/check-opencode-models.sh` | 手動 / 升級 OpenCode CLI 後 | 比對 CLI `models` 與 adapter-config.ts 差異 | 1h |

---

## 5) 明日優先工作項目（預估工時 / 相依性 / 風險）

| 優先序 | 項目                                                                              | 預估工時 | 相依性                                       | 風險                                                                                                                              |
| :----: | :-------------------------------------------------------------------------------- | :-----: | :------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
|   P0   | 把 `parseSelfReportedModel` 邏輯延伸到「家族別名表」白名單機制                    |   2h    | 今日 evaluation 邏輯（已落地）               | 假陽性風險：GLM 自稱 ChatGLM、Sonnet 4.7 自稱 Sonnet 4 等內部代號；要先收集樣本                                                  |
|   P0   | 寫 `tools/testing/lint-adapter-model-ids.sh`，加入 pre-commit                     |   1.5h  | 無                                           | bash 在 Windows worktree 上不一定可跑；需要 Node 腳本後備                                                                         |
|   P1   | 把今日新增的 `parseSelfReportedModel` 文件加到 `.claude/rules/backend/ai-adapter.md` |   0.5h  | 無                                           | 低                                                                                                                                |
|   P1   | 對其餘 adapter row（Kimi、GLM、Qwen）也跑一次測試 prompt，記錄基準自報結果       |   1.5h  | 需 OPENROUTER / MOONSHOT / DASHSCOPE API key | 部分 row 是 `status: 'planned'` 沒實際金鑰，需先決定 scope                                                                       |
|   P2   | 設計 `scripts/verify-adapter-self-report.ts` nightly job（先寫 spec）              |   2h    | P0 白名單機制                                | 需與既有 `tools/testing/run-superadmin-nightly.sh` 整合；nightlyLayer 與 nightlyOrder 要釐清                                     |
|   P2   | 把 OpenRouter「m2.7 是空殼」這個發現寫進 `docs/Adapter CLIs/OpenCode_CLI.md`       |   0.5h  | 無                                           | 文件容易過時；建議引用 `opencode models` 命令作為 source of truth                                                                |

**今日全部交付物已 commit-ready，未推 push（依 CLAUDE.md：commit 需明確指示）**

---

## 6) 變更檔案清單（git diff 範圍）

| 檔案                                                                                                          | 類型     | 說明                                                       |
| :------------------------------------------------------------------------------------------------------------ | :------- | :--------------------------------------------------------- |
| `apps/superadmin/app/superadmin/settings/api_key_and_model_setting/adapter-evaluation.ts`                     | Modified | 新增 122 行：family detector + version fingerprint + 第三道檢查 |
| `apps/superadmin/app/superadmin/settings/api_key_and_model_setting/__tests__/adapter-evaluation.test.ts`      | Modified | 新增 114 行：15 個新測試案例，含截圖回歸 case               |
| `apps/superadmin/lib/adapter-config.ts`                                                                       | Modified | Kilo / OpenCode 兩列 MiniMax adapter 改 id + label 加註     |
| `project-process/dev-logs/dev-ai-settings-adapter-self-report-2026-04-19.md`                                  | New      | 本檔（綜合日誌）                                           |
| `project-process/test-logs/test-ai-settings-adapter-self-report-2026-04-19.md`                                | New      | TDD Progress Report                                        |
| `project-process/features/ai-settings-adapter-self-report-dev-spec-20260419.md`                               | New      | Dev Spec                                                   |
| `project-process/features/tdd-ai-settings-adapter-self-report-20260419.md`                                    | New      | TDD Spec                                                   |

---

## 7) 測試摘要

```
Test Suites: 1 passed, 1 total
Tests:       25 passed, 25 total
Time:        0.504 s
File:        apps/superadmin/app/superadmin/settings/api_key_and_model_setting/__tests__/adapter-evaluation.test.ts
```

新增測試覆蓋：
- 截圖回歸：`m2.7 served as m2.1` → fail
- m2.5 自報 m2.5 → pass
- 自報無版本 → pass（保守不誤殺）
- 自報跨家族 → pass（避免 model mention competitor 誤殺）
- `parseSelfReportedModel` 5 個 unit tests
- `compareSelfReportToRequested` 5 個 unit tests

---

## 8) 簽核

- 開發者：Claude Opus 4.7 (1M context)
- 驗證者：Jason（實機跑 OpenCode CLI + MiniMax 確認模型自報 M2.5）
- 日期：2026-04-19
