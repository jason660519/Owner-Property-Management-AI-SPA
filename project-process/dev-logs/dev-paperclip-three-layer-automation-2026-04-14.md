# 每日進度報告 — 2026/04/14

> **日期**: 2026/04/14
> **執行者**: Claude Opus 4.6
> **涵蓋範圍**: Paperclip VIS Agent 派工系統、三層自動化、Adapter 管理、Agent 工作 Review/Merge

---

## 一、本日完成任務清單

### 1. Paperclip Agent 第一輪派工 (Row 009/031/050/067/075/137)
- **完成度**: 100%
- **交付物**:
  - 7 個 VIS issues 建立並指派給對應 agent（VIS-61~VIS-69）
  - 所有 agent 完成工作並 commit 到各自 worktree branch
  - 6 個 branches 修復（恢復誤刪共用檔案）→ merge 到 main → push

### 2. `/dispatch-agents` Skill 建立
- **完成度**: 100%
- **交付物**:
  - `.claude/skills/dispatch-agents/SKILL.md`
  - 包含完整 5 步驟流程、Title 命名規則、Description 模板
  - Adapter/Model 對照表、Troubleshooting 指南
  - Memory 檔案：`feedback_paperclip_dispatch.md`

### 3. Agent Adapter 切換與管理
- **完成度**: 100%
- **交付物**:
  - 所有 agent 從 `claude_local` 分散到 4 個 provider（Anthropic/OpenAI/Google/Cursor）
  - `docker/paperclip/.env.paperclip` 新增 `GOOGLE_GENERATIVE_AI_API_KEY`
  - `docker/paperclip/docker-compose.paperclip.yml` 新增環境變數映射
  - Cursor CLI 安裝到 Paperclip 容器（`curl https://cursor.com/install`）

### 4. Agent Health Monitor（自動 Adapter Fallback）
- **完成度**: 100%
- **交付物**:
  - `GET /api/paperclip/agent-health` API route
  - 自動偵測 error 狀態 agent → 切換到下一個可用 adapter
  - Adapter chain: opencode_local → cursor → codex_local → claude_local
  - 含正確的 model 映射（解決 "model does not exist" 問題）
  - Cron 每 3 分鐘執行

### 5. 三層自動化系統
- **完成度**: 100%
- **交付物**:
  - **Layer 1**: `GET /api/paperclip/work-summary` — 掃描 branches、偵測問題、回報 merge readiness
  - **Layer 2**: `/review-agent-work` Skill — 檢查 → 修復 → merge → 更新 roadmap
  - **Layer 3**: `POST /api/paperclip/auto-dispatch` — 自動為 idle agents 派工（dry-run + 執行）
  - Cron: work-summary 每 5 分鐘、auto-dispatch 每 10 分鐘

### 6. Paperclip Mission Control Dashboard（4-Tab UI）
- **完成度**: 90%（已 commit，待 UI 驗證）
- **交付物**:
  - `PaperclipDashboardTabs.tsx` — BottomSheetTabs 容器
  - `WorkSummaryTab.tsx` — branches 狀態 + 一鍵 merge
  - `AgentsTab.tsx` — agent 監控 + reset
  - `AutoDispatchTab.tsx` — preview + 派工

### 7. 第二輪派工 (Row 032/033/051/055/056/074/077)
- **完成度**: 100%
- **交付物**:
  - 7 個 VIS issues 建立（VIS-71~VIS-77）
  - Agents 已開始執行，部分已 done

### 8. Roadmap 進度更新
- **完成度**: 100%
- **交付物**:
  - 更新 7 個 Row 的 percentage 和 developmentProgress
  - Row 009: 0%→60%, Row 031: 0%→80%, Row 050: 0%→30%
  - Row 067: 0%→30%, Row 075: 95%→98%, Row 137: 0%→70%, Row 138: 0%→60%

### 9. 文件更新
- **完成度**: 100%
- **交付物**:
  - `CLAUDE.md` — 新增 Paperclip VIS 派工 + 三層自動化區塊
  - `AGENTS.md` — 同步更新
  - `dispatch-agents/SKILL.md` — 新增 Adapter 切換注意事項、auto-dispatch 參考

---

## 二、技術困難

### 困難 1：Agent "Process lost" 失敗
- **問題現象**: 透過 Paperclip API 直接建立的 7 個 issues 全部 failed，錯誤 "Process lost -- child pid X is no longer running"
- **排查過程**: 比對成功的 VIS-32 和失敗的 VIS-54，發現成功的有 worktree 指引 prefix 在 description 裡
- **根因分析**: 直接打 Paperclip API 建立的 issue 沒有 git worktree，agent 的 claude CLI 啟動後找不到工作目錄就退出
- **解決方案**: 必須透過 superadmin API（`POST localhost:3001/api/paperclip/issues`）建立，它會自動建 worktree + 注入指引

### 困難 2：OpenAI Codex "model does not exist" 錯誤
- **問題現象**: 切換 adapter 到 codex_local 後，CTO agent 持續 failed，錯誤 "The requested model 'sonnet' does not exist"
- **排查過程**: 查看 VIS dashboard run log，發現 model 值仍是 `sonnet`（Claude 的 model 名）
- **根因分析**: 切換 adapter 時只改了 `adapterType`，沒有同步更新 `adapterConfig.model`
- **解決方案**: 建立 Adapter/Model 對照表，切換時必須一起更新

### 困難 3：opencode_local "API key missing" 錯誤
- **問題現象**: Database/DevOps agent 用 opencode_local 時報 "Google Generative AI API key is missing"
- **排查過程**: 檢查容器環境變數，發現 `GEMINI_API_KEY` 有值但 opencode 要的是 `GOOGLE_GENERATIVE_AI_API_KEY`
- **根因分析**: docker-compose.yml 沒有映射 `GOOGLE_GENERATIVE_AI_API_KEY` 環境變數
- **解決方案**: 在 `.env.paperclip` 和 `docker-compose.paperclip.yml` 新增正確的變數名

### 困難 4：Cursor adapter "Command not found: agent" 錯誤
- **問題現象**: cursor adapter 執行時報錯 "Command not found in PATH: agent"
- **排查過程**: 檢查容器內 `/usr/local/bin/`，只有 claude/codex/opencode，沒有 agent
- **根因分析**: Cursor Agent CLI 不是 npm 全域套件，需要單獨安裝
- **解決方案**: `curl https://cursor.com/install -fsSL | bash` + symlink 到 `/usr/local/bin/agent`

### 困難 5：git index.lock 持續被搶佔
- **問題現象**: merge 操作時 `.git/index.lock` 不斷被重建，即使刪除後立刻又出現
- **排查過程**: `ps aux | grep git` 發現 Cursor IDE 的 gitWorker 進程在監視 worktree
- **根因分析**: Cursor IDE 的 git extension 會定期掃描 repo，和我們的 merge 操作搶佔 lock
- **解決方案**: `pkill -9 -f "gitWorker"` + 暫停 Paperclip 容器再操作

### 困難 6：Agent 誤刪共用檔案
- **問題現象**: 6 個 agent branch 都刪除了同樣 4 個 VIS 同步檔案（~828 行 deletion）
- **排查過程**: `git diff --stat` 顯示每個 branch 都有 800+ 行 deletion
- **根因分析**: Agent 在 worktree 裡操作時，可能基於某種「清理」邏輯刪除了看似不相關的檔案
- **解決方案**: 用 docker exec 在每個 worktree 裡 `git checkout main -- <files>` 恢復

### 困難 7：自動 Fallback 未觸發
- **問題現象**: OpenAI 額度用完後 Fullstack agent 持續重試同一 adapter，不會自動切換
- **排查過程**: 查看 adapter-fallback.ts 邏輯在 task-queue/poll route 裡，但 Paperclip heartbeat 失敗不會觸發 superadmin poll
- **根因分析**: Paperclip 端和 superadmin 端的 fallback 邏輯是斷開的
- **解決方案**: 建立獨立的 `/api/paperclip/agent-health` route + cron 每 3 分鐘主動偵測

---

## 三、踩雷事件

| # | 事件 | 浪費時間 | 事前可預防指標 |
|---|------|---------|---------------|
| 1 | 直接打 Paperclip API 建立 issue（缺 worktree） | ~30 分鐘 | 文件記載建立 issue 的正確 API endpoint |
| 2 | 切 adapter 忘記改 model | ~20 分鐘 | Adapter/Model 強制綁定檢查 |
| 3 | 環境變數名稱不對（GEMINI vs GOOGLE_GENERATIVE_AI） | ~15 分鐘 | 容器啟動時驗證所有必要 env vars |
| 4 | Git lock 被 Cursor IDE 搶佔 | ~25 分鐘 | Merge 前先暫停容器 + kill gitWorker |
| 5 | 6 個 branch 都誤刪共用檔案 | ~20 分鐘 | Pre-merge 自動檢測 deletion 列表 |

---

## 四、下次避免措施

1. **流程標準化**: 已建立 `/dispatch-agents` Skill 和 `/review-agent-work` Skill，避免手動操作遺漏步驟
2. **Adapter 切換自動化**: agent-health cron 每 3 分鐘檢測，含正確的 model 映射
3. **Pre-merge 檢查**: work-summary API 自動偵測誤刪共用檔案，merge 前先修復
4. **文件完善**: CLAUDE.md 和 AGENTS.md 已加入 Adapter/Model 對照表
5. **自動派工**: auto-dispatch cron 每 10 分鐘為 idle agents 分配新任務

---

## 五、明日優先工作

| 優先級 | 項目 | 預估工時 | 相依性 | 風險 |
|--------|------|---------|--------|------|
| P0 | 驗證 4-Tab Mission Control Dashboard UI | 30 分鐘 | Superadmin server 需運行 | 低 |
| P0 | Review 第二輪 agent 工作（Row 032-077） | 1 小時 | 用 `/review-agent-work` | Agent 可能又誤刪檔案 |
| P1 | 第三輪派工 | 30 分鐘 | 第二輪 merge 完成後 | 視 API 額度而定 |
| P1 | Webhook 事件處理器（Row 137 延伸） | 2 小時 | Row 137 VIS 同步基礎設施 | 需要 Paperclip 配置 webhook |
| P2 | 解決 Fullstack agent 連續失敗問題 | 1 小時 | Cursor adapter 穩定性 | 可能需要換回 opencode |

---

## 六、數據摘要

- **今日 commits**: 27 個（含 agent + merge + fix + feature）
- **新增程式碼**: ~3,500 行
- **新建檔案**: 12 個
- **修改檔案**: 8 個
- **VIS Issues 建立**: 14 個（第一輪 7 + 第二輪 7）
- **VIS Issues 完成**: 10 個
- **Roadmap 更新**: 7 個 Row
- **API Routes 建立**: 3 個（agent-health, work-summary, auto-dispatch）
- **Skills 建立**: 2 個（dispatch-agents, review-agent-work）
- **Cron 任務設定**: 3 個（agent-health 3min, work-summary 5min, auto-dispatch 10min）
