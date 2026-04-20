根據今日對話中完成的所有工作，自動產生每日進度報告並更新至專案系統。

## 旗標

| 旗標 | 行為 |
| :-- | :-- |
| `--no-vis` | 跳過步驟五（不開 Playwright、不建 VIS Issue），其餘步驟照跑。供 `/wrap-up` 等全自動編排器呼叫。 |

## 完整流程（依序執行）

### 步驟一：掃描今日工作內容

- 回顧本次對話中所有已完成的任務（程式碼修改、bug 修復、功能開發、文件撰寫等）
- 彙整每項任務的交付物與完成度百分比

### 步驟二：撰寫 Dev Log Markdown

- 依照 `docs/update-project-progress-guide.md` 的格式撰寫完整報告
- 報告內容必須包含：
  1. **本日完成任務清單**（條列式，含交付物與完成度 %）
  2. **技術困難**（問題現象 → 排查過程 → 根因分析 → 解決方案）
  3. **踩雷事件**（重工/延遲情境 + 事前可預防指標）
  4. **下次避免措施**（流程優化、工具導入、自動化需求）
  5. **明日優先工作**（預估工時、相依性、風險）
- 檔案存放至：`project-process/dev-logs/dev-{功能描述}-{YYYY-MM-DD}.md`

### 步驟三：更新 roadmap.ts

- 讀取 `apps/superadmin/app/data/roadmap.ts` 的 `RAW_FEATURES` 陣列
- 找到對應的 Row，更新以下欄位：
  - `percentage`（進度百分比）
  - `devLog`（開發日誌摘要）
  - `devLogDocPath`（指向步驟二的 .md 檔案路徑）
  - `lastModifiedBy`：填入執行者名稱
  - `lastModifiedDate`：填入今日日期（YYYY/MM/DD）
- 若為全新功能，在陣列末尾新增條目（含必填欄位 name/category/percentage）

### 步驟四：判斷是否需要建立 VIS Paperclip Issue

根據以下規則自主判斷：

**必須建 issue 的情況：**

- 修復了 bug（尤其是影響用戶體驗的）
- 完成了新功能或重要重構
- 發現了需要後續跟進的技術債
- 有 blocked 或需要其他人介入的事項

**不需建 issue 的情況：**

- 純文件更新（README、註解）
- 微小的 style/typo 修正
- 尚未完成的半成品（下次再報）

**判斷後的行為：**

- 若判斷「需要建 issue」→ 執行步驟五
- 若判斷「不需要」→ 跳過步驟五，直接輸出完成摘要

### 步驟五：在 VIS Paperclip 建立 Issue

- 使用 Playwright CLI 或 Playwright MCP 開啟 `http://localhost:3187/VIS/agents/ceo/dashboard`
- 點擊「New Issue」
- 自動填入：
  - **標題**：`[Row {ID}] {功能名稱簡述}`
  - **專案**：Owner Property Management AI SPA
  - **描述**：包含問題摘要、修復內容、影響檔案、狀態
- 根據工作性質自主判斷 issue 狀態建議：
  - `Done`：已完成且驗證通過
  - `In Review`：已完成但需要 code review
  - `In Progress`：部分完成，明日繼續
  - `Blocked`：被其他任務擋住
- **送出前詢問用戶確認**（因為是不可逆操作）

### 步驟六：輸出完成摘要

格式：

```
✅ 已完成每日進度報告

📄 Dev Log: project-process/dev-logs/dev-xxx-YYYY-MM-DD.md
📊 Roadmap: Row {ID} 已更新（{舊%} → {新%}）
🎫 VIS Issue: {VIS-XX} 已建立（或「本次無需建 issue」）
```

## 瀏覽器工具優先序

1. Playwright CLI（`bash tools/testing/playwright-cli.sh`）— 最省 token
2. Playwright MCP — 備選
3. 其他瀏覽器工具 — 最後手段

## 注意事項

- 回覆用繁體中文，程式碼註解用英文
- 若今日無實質工作（純討論/規劃），告知用戶「今日無需產生報告」
- 若涉及多個 Row，每個都要更新
