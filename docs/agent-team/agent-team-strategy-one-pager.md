# Agent Team 策略提案（一頁式決策版）

> **文件用途**：提供團隊決策與排期所需的最小必要資訊。閱讀時間目標 5 分鐘。  
> **最後更新**：2026/04/22  
> **版本**：v0.2（納入產品化路徑，尚未進入排期）

---

## 一、我們要解決什麼問題

目前 AI Agent 的運作是「人工派工 → 單一 Agent 單打獨鬥 → 人工 review」。隨著 Roadmap Row 數量持續增加，這個流程有三個根本瓶頸：

1. **缺乏分工**：所有角色都由同一個 Adapter 實例執行，沒有設計、測試、基礎建設的專業分工
2. **記憶無法傳遞**：任務之間沒有結構化的 lesson 傳遞，同類錯誤重複發生
3. **協作靠人腦**：兩個 Agent 之間如何銜接，完全依賴人工介入，無法自動化

---

## 二、我們的答案

**建構自有 Agent Team Runtime**，融合現有兩套系統的優點：

| 來源 | 保留的優點 | 不再沿用的缺點 |
|---|---|---|
| **Paperclip** | 派工流程、worktree 隔離、Adapter 路由、VIS 儀表板 | 純輪詢（無事件驅動）、角色無分化 |
| **Hermes-agent** | 結構化記憶（MEMORY.md + Honcho）、lesson 萃取、cron 排程 | 不與 Superadmin Supabase 整合、無 VIS 觀測 |

**核心主張**：  
> 不替換、不大爆炸遷移。現行 Paperclip 繼續服務既有 Row；Agent Team Runtime 在 feature flag 保護下平行上線，逐步吸收新任務。

**產品化主張**：  
> 不直接另開獨立 repo。先在本 monorepo 的 `packages/agent-team` 孵化，透過真實 Row 驗證抽象邊界；穩定後再抽離為獨立專案並發布版本。

---

## 三、MVP 範圍（目標 4–6 週）

**進入條件**：3 個試點 Row 同時滿足：任務說明完整、已有測試基準、不涉及跨租戶敏感資料。

| # | 交付物 | 負責方向 | 週期 |
|---|---|---|---|
| M0 | `packages/agent-team` 套件骨架（workspace 套件 + 對外 API） | 架構 | 第 1 週 |
| M1 | 角色協作協定（Agent-to-Agent 訊息契約 TypeScript 介面） | 架構 | 第 1–2 週 |
| M2 | LocalRuntime 最小實作（取代 501 佔位） | 後端 | 第 1–2 週 |
| M3 | 事件流 Supabase schema（`agent_team_events` 表） | 後端 | 第 2 週 |
| M4 | 4 角色啟用（Architect、Fullstack、QA、DevOps）+ 角色系統提示 | 提示工程 | 第 3–4 週 |
| M5 | task-level context（任務開始/結束時寫入記憶） | 後端 | 第 4–5 週 |
| M6 | 可觀測面板（VIS 儀表板新增 Agent Team 頁籤） | 前端 | 第 5–6 週 |

**不做（MVP 明確排除）**：  
- 自動 lesson 跨任務傳遞（V1）  
- CEO/CTO/UI-UX 三角色（V1）  
- 模型成本自動最佳化（V1）  
- 多租戶隔離的 Agent Memory（V1）  

---

## 四、V1 範圍（目標 2–3 個月，MVP 後啟動）

| # | 交付物 | 說明 |
|---|---|---|
| V1-1 | 全 8 角色啟用（+ CEO、CTO、Database Engineer、UI-UX Designer） | 增加設計與資料庫分化 |
| V1-2 | 跨任務 lesson memory（Hermes MemoryProvider 整合） | 同類錯誤自動學習 |
| V1-3 | 自動仲裁（CEO/CTO 對規格衝突介入） | 減少人工 review 次數 |
| V1-4 | 成本治理（per-role token budget，超標自動降級 model） | 降低每 Row 的模型費用 |
| V1-5 | 回滾策略（Agent Team 部分失敗可降回 Paperclip Runtime） | 確保上線安全網 |
| V1-6 | 獨立專案抽離與版本發布（例如 npm/internal registry） | 讓其他專案可安裝使用 |

---

## 五、五個決策點

在排期前，團隊需對以下五點取得共識：

| # | 決策問題 | 建議選項 | 影響 |
|---|---|---|---|
| D1 | **資料主權**：Agent Memory 存放位置 | 存本地 Supabase（建議）或 Hermes Honcho？ | 決定記憶查詢方式與跨環境同步策略 |
| D2 | **事件模型**：訊息傳遞方式 | Supabase Realtime（建議）或輪詢？ | 決定 LocalRuntime 複雜度與延遲 |
| D3 | **角色責任界線**：Fullstack 是否可要求 Architect 修改規格 | 允許雙向溝通（建議）或單向流水線？ | 決定訊息契約的 `direction` 欄位設計 |
| D4 | **產品化路徑**：是否先做獨立專案 | 先 `packages/agent-team` 孵化（建議）再抽離，或直接獨立 repo？ | 決定開發速度與抽象品質 |
| D5 | **Fallback 策略**：Agent 失敗時 | 自動降回 Paperclip（建議）或立即通知人工？ | 決定 factory.ts 的 error boundary 邏輯 |

---

## 六、Go / No-Go 標準

**Go 條件（同時滿足）**：
- [ ] 五個決策點已完成團隊共識
- [ ] 已選定 3 個試點 Row（風險低、說明完整）
- [ ] LocalRuntime 不影響現行 Paperclip 流量（feature flag 隔離確認）
- [ ] 試點 Row 成功標準明確：3 Row 全部 merge 且測試通過率 ≥ 90%
- [ ] MVP 工作可切成 2 個 2 週 sprint，每 sprint 有可獨立驗收的輸出

**No-Go 觸發條件**（任一）：
- 試點 Row 中有跨租戶敏感資料無法隔離
- 現行 Paperclip 佇列 backlog 超過 30 個待處理任務（不適合同期引入新系統）
- D1 與 D2 無法在 1 週內達成共識

---

## 七、預估成本與風險

| 項目 | 估算 | 說明 |
|---|---|---|
| 開發工時 | 4–6 週 × 1–2 人 | MVP 主要是基礎建設 |
| 模型費用增量 | +15–30%（試點期） | 多角色多呼叫，但每呼叫 context 更小 |
| 維運負擔 | 低（MVP 共用現有 Supabase + Paperclip 基礎建設） | |
| 最大風險 | 角色規格漂移（Architect 與 Fullstack 對同一 Row 產生不同設計） | 對策：V1-3 自動仲裁 |

---

## 八、建議的第一步

1. 本週內完成五個決策點共識（尤其 D4 產品化路徑）
2. 在 monorepo 建立 `packages/agent-team`，先放 M0 + M1 的介面與型別
3. 選出 3 個試點 Row（建議從 Roadmap 中標記 `development` 且已有測試基準的 Row 選起）
4. 以 workspace 依賴方式接到 `apps/superadmin`，開始 M2（LocalRuntime 最小實作）

> 完整架構設計見：[agent-team-blueprint-v1.md](./agent-team-blueprint-v1.md)

---

## 九、第一批 2 週 Sprint（可直接排期）

### Sprint 目標

在不影響既有 Paperclip 流量前提下，完成 M0 + M1 + M2 的最小閉環：

- `packages/agent-team` 可被 `apps/superadmin` 以 workspace 方式引用
- Agent-to-Agent 訊息契約完成並可被型別檢查
- `LocalRuntime` 不再是 501 佔位，至少可處理 create / status 路徑

### 任務拆解

| 優先序 | 任務 | 主要產出 | 預估 |
|---|---|---|---|
| P0 | 建立 `packages/agent-team` 套件骨架 | `package.json`、`tsconfig.json`、`src/index.ts` | 0.5 天 |
| P0 | 建立 runtime/roles/events/memory 基本資料夾 | 最小模組結構與 placeholder 匯出 | 0.5 天 |
| P1 | 定義 `AgentMessage`、`AgentRole`、`MessageIntent` 型別 | 可重用型別與匯出入口 | 1 天 |
| P1 | 定義 `AgentRuntime` 介面（套件內版本） | 與 superadmin 現有邊界對齊 | 1 天 |
| P1 | 新增 `LocalRuntime` 最小骨架 | `createIssue` / `fetchIssueStatus` 可運作 | 2 天 |
| P2 | `apps/superadmin` 接入 workspace 套件 | factory 可切到 package 的 LocalRuntime | 1 天 |
| P2 | 基礎測試（型別 + 單元） | 確保 interface 與匯出不破壞 | 1 天 |
| P2 | 排程驗收與回顧 | demo + backlog 調整 | 0.5 天 |

### Sprint 驗收條件

- `apps/superadmin` 在 `AGENT_RUNTIME=local` 下可成功初始化 `LocalRuntime`
- 至少一條 create / status 路徑可完整走通（即使仍是 mock store）
- `packages/agent-team` 對外 API 由 `src/index.ts` 單一入口管理
- 未改動生產派工路徑（`AGENT_RUNTIME=paperclip` 行為不變）
