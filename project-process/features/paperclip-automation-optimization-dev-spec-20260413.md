# Paperclip 全自動開發流程優化 — DEV-SPEC

**功能代號（測試目錄／manifest）**: 133  
**功能名稱**: Paperclip 全自動開發流程優化（API 成本／卡住與重試／Mac mini 24h 穩定）  
**備註**: `roadmap.ts` 中此列的儀表板 **Row ID** 為陣列索引 +1（目前約 **132**），與 `apps/superadmin/unit_test/133` 之代號可並存，同 Row 130 使用 `unit_test/130` 之慣例。  
**版本**: 1.0  
**日期**: 2026/04/13  
**狀態**: 已實作（Superadmin + 運維文件 + 健康檢查腳本）  
**關聯**: 延伸 [Row 130 — Superadmin × Paperclip 開發流程整合](./paperclip-development-loop-dev-spec-20260412.md)

---

## 1. 目標與範圍

在 **不重寫 Paperclip 平台本體** 的前提下，優化本 monorepo 內可控制的環節，同時滿足三個等優先目標：

1. **壓低 LLM／API 帳單**：減少無效 dispatch、過長 context、重複輪詢與失敗後全量重跑。
2. **減少卡住與重試**：送單、worktree、agent heartbeat、merge 前檢查等路徑可觀測、可恢復、錯誤可理解。
3. **Mac mini 長時間運作穩定**：Docker、磁碟、睡眠、憑證與映像策略可預期，避免「半夜掛掉早上才發現」。

### 1.1 範圍內（可交付於本 repo）

- `docker/paperclip/`、`start.sh` / `stop.sh` 與 `.env.paperclip` 範例與文件化建議。
- `apps/superadmin` 內 Paperclip 整合：`lib/paperclip/*`、`app/api/paperclip/*`、`PromptEngineerModal`、`paperclip-worktrees`、相關輪詢與 UX 提示。
- 可選：**僅透過既有 Paperclip API／設定** 暴露的欄位（例如 agent budget、輪詢間隔、提示模板）做對齊；若 API 不支援則以文件與「手動在 Paperclip UI 設定」清單交付。

### 1.2 範圍外

- 修改 Paperclip 容器內私有程式碼或 fork 官方映像行為（除非未來明確開新項）。
- 取代使用者對 merge 與敏感變更的最終審核責任。

---

## 2. 使用者與系統情境

- **使用者**：超級管理員，從 `project-progress` 送單、追蹤 run、進 `paperclip-worktrees` 合併。
- **執行環境**：本機 Mac mini，Docker 跑 Paperclip，repo 掛載至容器 `/workspace`；任務使用隔離 worktree（沿用 Row 130 設計）。

---

## 3. 功能需求（驗收條件草案）

### 3.1 API 成本與效率

- [x] **輪詢策略**：`PromptEngineerModal` 送單後以 `getPaperclipIssuePollDelayMs` 自適應（含 blocked 放慢、in_progress 隨時間 backoff、連錯指數 backoff）；`PaperclipWorktreesClient` 以 `getWorktreesTablePollIntervalMs` 在 10–45s 間切換。
- [x] **單次送單成本可見**：維持既有 cost chip／worktrees 每列 cost；運維文件說明對帳與輪詢關係。
- [x] **Prompt 預設**：預設與各工作類別 Prompt 透過 `COST_AND_API_DISCIPLINE` 附加「成本與 API 節制」段落。
- [x] **環境變數分層**：見 `docs/operational-guides/paperclip-mac-mini-24h.md` 第三節。

### 3.2 卡住與重試

- [x] **錯誤分類**：`api-error-meta.ts` 依 HTTP status 分類；送單失敗與 cleanup 錯誤以 `formatPaperclipErrorWithHint` 顯示前綴 + 建議段落。
- [x] **可恢復動作**：錯誤文案內嵌建議（網路／認證／驗證／伺服器）；運維文件第六節排查順序。
- [x] **逾時與邊界**：Modal 輪詢維持 30 分鐘安全上限；運維文件涵蓋 health、agent、API key。

### 3.3 Mac mini 24h 穩定

- [x] **文件**：`docs/operational-guides/paperclip-mac-mini-24h.md`。
- [x] **可選腳本**：`tools/paperclip/health-check.sh`（非互動；檢查容器 + `GET /api/health`）。

---

## 4. 技術約束

- TypeScript strict，禁 `any`。
- 不新增根目錄雜檔；單檔不超過 500 行（必要時拆檔）。
- 與 Row 130 已存在的護欄（forbidden paths、worktree 協定）相容，不破壞既有測試基線。

---

## 5. 實作階段建議（供審查後排程）

| 階段 | 內容 |
|------|------|
| P0 | 輪詢 backoff、錯誤訊息分類、運維文件初稿 |
| P1 | Prompt 範本／設定 UX、manifest 與 nightly 銜接（若新增 E2E） |
| P2 | 可選健康檢查腳本、進階成本儀表（僅在 API 足夠時） |

---

## 6. 審查清單（審核者勾選）

- [ ] 三目標（成本／卡住／24h）範圍與優先順序同意。
- [ ] 驗收條件可測、可逐項勾完。
- [ ] 與 Row 130 邊界清楚，無重複造輪子。
- [ ] 同意進入實作後，再開分支並依 TDD-Spec 補測。

---

## 7. 變更紀錄

| 日期 | 說明 |
|------|------|
| 2026/04/13 | 初版規格（審查稿） |
