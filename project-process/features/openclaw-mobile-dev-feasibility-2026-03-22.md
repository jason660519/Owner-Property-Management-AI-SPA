# OpenClaw 手機開發可行性與安全性評估報告

> 專案：Owner Property Management AI SPA
> 評估日期：2026-03-22
> 評估人：Claude Sonnet 4.6
> 版本：v1.0

---

## 一、OpenClaw 是什麼？

OpenClaw（前身：Clawdbot → Moltbot，2026 年 1 月正式更名）是由奧地利開發者 Peter Steinberger 於 2025 年 11 月開源的**自主 AI Agent 框架**。截至 2026 年 3 月，已累積超過 **250,000 GitHub Stars**，成為史上成長最快的 AI 工具之一。

### 核心架構

```
手機 (WhatsApp / Telegram / Signal / Discord)
        ↓ 指令訊息
OpenClaw Gateway（自托管於 macOS）
        ↓ 呼叫 LLM API
大型語言模型（Claude / GPT-4o / DeepSeek）
        ↓ 執行 Skill
本機工具（Shell、瀏覽器、IDE、檔案系統、Git）
```

**關鍵特性：**

- 100+ 內建 Skills，社群 ClawHub 已有 13,729+ 技能
- 本地運行，上下文以 Markdown 檔儲存（可讀/可編輯）
- 支援 iOS/Android Gateway node（WebSocket），實現跨裝置單一控制面板
- 多模型路由：可依任務複雜度自動切換 Claude / GPT-4o-mini / DeepSeek

---

## 二、與本專案「Prompt and IDE Setting」功能的整合機會

### 2.1 現有功能盤點

本專案 `apps/superadmin/app/superadmin/settings/api_key_and_model_setting/` 已實作：

| 功能模組                       | 現狀                                      |
| :----------------------------- | :---------------------------------------- |
| API Key 管理（多供應商）       | ✅ 已完成（Anthropic、OpenAI、Google 等） |
| System Prompt 編輯器           | ✅ 已完成（`SystemPromptEditor.tsx`）   |
| Prompt 庫管理（PromptLibrary） | ✅ 已完成（`PromptLibraryModal.tsx`）   |
| 模型評估器（ModelEvaluator）   | ✅ 已完成（`ModelEvaluator.tsx`）       |
| OCR System Prompt Panel        | ✅ 已完成（`OcrSystemPromptPanel.tsx`） |
| AI 自動開發與迭代              | ❌ 尚未完成                               |
| IDE 整合設定                   | ❌ 尚未建立                               |
| Token 消費預算管控             | ❌ 尚未建立                               |

### 2.2 整合方向：OpenClaw Coding Agent Skill

OpenClaw 的 `coding-agent` Skill 可透過 **MCP（Model Context Protocol）** 橋接，直接驅動以下 IDE：

| IDE               | 整合方式                                   | 支援程度    |
| :---------------- | :----------------------------------------- | :---------- |
| **VS Code** | Claude Code Extension + OpenClaw MCP Skill | ✅ 原生支援 |
| **Cursor**  | OpenClaw Shell Skill + Cursor CLI          | ✅ 支援     |
|                   |                                            |             |
| **Xcode**   | Claude Code + Xcode 整合                   | ✅ 原生支援 |

### 2.3 整合架構建議

```
你的 iPhone（Telegram Bot）
        ↓ 傳送開發指令（中文或英文）
OpenClaw Gateway（Mac Mini / MacBook，常駐背景）
        ↓ 解析意圖、載入專案 Context
Claude Code CLI（已在本機安裝）
        ↓ 讀取 CLAUDE.md / .claude/rules/
本專案 Monorepo（Next.js 15）
        ↓ 修改程式碼、執行測試、Git commit
本專案 Superadmin API（http://localhost:3001）
```

**新增「IDE Setting」Tab 的建議欄位：**

- OpenClaw Gateway 端口（預設 3333）
- 訊息通道選擇（Telegram Bot Token / Discord Bot Token）
- 允許的指令白名單（防止意外執行危險命令）
- Claude Code 工作目錄（指向本 Monorepo）
- 自動 Git Commit 開關
- 測試前置要求開關（TDD 模式）

---

## 三、手機開發可行性評估

### 3.1 可行性評分

| 評估面向     | 評分（1-10） | 說明                                            |
| :----------- | :----------: | :---------------------------------------------- |
| 技術可行性   | **9** | OpenClaw + Claude Code MCP 已有現成整合範例     |
| 操作便利性   | **8** | 透過 Telegram 傳文字指令，Claude 執行並回報結果 |
| 複雜任務處理 | **7** | 跨檔案重構需搭配明確的 CLAUDE.md 規則           |
| 錯誤回復能力 | **6** | 需設定 Git 安全網（每步驟自動 commit）          |
| 即時性       | **7** | 取決於 LLM API 回應速度，通常 10-60 秒/任務     |

**整體建議：可行，適合「方向性指令 + Claude 自主執行」的工作模式。**

### 3.2 適合用手機下達的指令類型

✅ **適合：**

- `「幫我在 PropertyEditForm 加一個備註欄位，required: false」`
- `「執行 superadmin 的所有 unit test 並回報結果」`
- `「把最近的修改 commit，訊息是：fix: 修正謄本欄位驗證」`
- `「檢查目前 TypeScript 錯誤有哪些」`
- `「更新 roadmap.ts 中 AI 自動開發功能的進度到 40%」`

❌ **不適合（建議仍在 PC 處理）：**

- 大規模架構重構（超過 10 個檔案）
- Database Migration 設計與執行
- 複雜的 RLS Policy 設定
- Production 部署操作

---

## 四、各家 Coding Agent Token 消費預算評估

### 4.1 Token 計價參考（2026 年 3 月）

| 供應商              | 模型              | Input ($/1M) | Output ($/1M) |      快取折扣 |  |
| :------------------ | :---------------- | -----------------------------: | ------------: | :- |
| **Anthropic** | Claude Sonnet 4.6 |                 $3.00 | $15.00 | 輸入快取 -90% |  |
| **Anthropic** | Claude Haiku 4.5  |                  $0.80 | $4.00 | 輸入快取 -90% |  |
| **OpenAI**    | GPT-4o            |                 $5.00 | $15.00 |            — |  |
| **OpenAI**    | GPT-4o-mini       |                  $0.15 | $0.60 |            — |  |
| **Google**    | Gemini 2.0 Flash  |                  $0.10 | $0.40 |            — |  |
| **DeepSeek**  | DeepSeek-V3       |                  $0.27 | $1.10 |     快取 -75% |  |

> 以上為估算值，請以各供應商官方定價頁為準。

### 4.2 本專案 OpenClaw 月消費估算

**情境假設：每天手機下達 20 個開發指令，每指令平均消耗 5,000 input + 2,000 output tokens**

| 模型路由策略             |     月消費估算 | 說明                                              |
| :----------------------- | -------------: | :------------------------------------------------ |
| 全用 Claude Sonnet 4.6   |    ~**$70/月** | 高品質，適合複雜任務                              |
| 全用 Claude Haiku 4.5    |    ~**$18/月** | 速度快，適合簡單查詢                              |
| 全用 GPT-4o-mini         |     ~**$5/月** | 最省錢，品質稍低                                  |
| **推薦：混合路由** | ~**$25-35/月** | Haiku 處理 70% 簡單任務，Sonnet 處理 30% 複雜任務 |

### 4.3 建議的預算控管機制

```
每日預算上限：$3 USD（約 900 次 Haiku 呼叫）
每月預算上限：$50 USD
警示閾值：50% / 75% / 90%
```

**實作方式（整合進本專案 Superadmin）：**

1. **API 端（已有架構）**

   - 在 `apps/superadmin/app/api/ai-settings/summary/route.ts` 加入每日 token 累計
   - 新增 `budget-alert` API endpoint
2. **OpenClaw 端**

   - 安裝 `budget-monitor` Cron Skill（每小時檢查）
   - 超過 75% 閾值自動切換至 Haiku
   - 超過 90% 閾值停止執行並發 Telegram 警告
3. **超級管理後台 UI（待實作）**

   - 新增「Token 預算設定」子頁面
   - 顯示各供應商即時消費圖表
   - 設定模型自動路由規則

---

## 五、安全性注意事項

### 5.1 通訊通道選擇建議

| 通道                   |   推薦度   | 原因                                                |
| :--------------------- | :--------: | :-------------------------------------------------- |
| **Telegram Bot** | ⭐⭐⭐⭐⭐ | 官方 Bot API、穩定、不違反 ToS、支援 chat_id 白名單 |
| **Signal**       |  ⭐⭐⭐⭐  | 端對端加密最強，但整合複雜度較高                    |
| **Discord**      |   ⭐⭐⭐   | 功能豐富，但伺服器暴露面較大                        |
| ~~WhatsApp~~          |     ❌     | 使用 Baileys 逆向工程，違反 Meta ToS，風險極高      |

**強烈建議使用 Telegram Bot，並設定：**

```python
# 僅允許你的 Telegram User ID 發送指令
ALLOWED_CHAT_IDS = ["你的_TELEGRAM_USER_ID"]
```

### 5.2 本機 Gateway 安全設定

```yaml
# OpenClaw config（建議設定）
auth:
  mode: token                    # 禁止 "none" 模式
  token: "強密碼（32位以上）"
gateway:
  expose_public: false           # 不暴露到公網
  allowed_origins: ["localhost"] # 僅本機存取
  port: 3333
```

### 5.3 Claude Code / 本專案專屬安全規則

在 `.claude/rules/` 中新增 OpenClaw 安全規則：

```markdown
## OpenClaw 遠端指令安全規則

1. **禁止執行的指令類型：**
   - `rm -rf` / `git reset --hard` / `git push --force`
   - 任何刪除 supabase/ 目錄的操作
   - 修改 .env / .env.local 檔案

2. **必須二次確認的操作：**
   - Migration 檔案的建立或修改
   - package.json dependencies 變更
   - Middleware 邏輯修改

3. **每次執行前必須：**
   - 確認當前 Git branch 不是 main
   - 執行前自動 stash 或 commit 保存點
```

### 5.4 API Key 安全管理

| 風險         | 緩解措施                                        |
| :----------- | :---------------------------------------------- |
| API Key 洩漏 | 使用 macOS Keychain 儲存，不放 .env 純文字      |
| 過度消費     | 在各供應商後台設定月消費硬限額（Hard Limit）    |
| 未授權使用   | OpenClaw 僅接受白名單 chat_id 的指令            |
| 指令注入攻擊 | 啟用 OpenClaw 的 sandbox 模式，敏感操作二次確認 |

**各供應商硬限額設定位置：**

- Anthropic: console.anthropic.com → Settings → Billing → Spend Limits
- OpenAI: platform.openai.com → Billing → Usage Limits
- Google AI: console.cloud.google.com → Budgets & alerts

---

## 六、實作路線圖

### Phase 1（1-2 週）：環境建置

- [ ] 安裝 OpenClaw Gateway（`npm install -g openclaw`）
- [ ] 建立 Telegram Bot（BotFather），設定 ALLOWED_CHAT_IDS
- [ ] 安裝 `coding-agent` Skill，指向本專案目錄
- [ ] 測試基本指令（列出檔案、執行測試）

### Phase 2（2-3 週）：整合超級管理後台

- [ ] 新增 `IDE Setting` Tab 至 `api_key_and_model_setting/page.tsx`
- [ ] 建立 OpenClaw 連線狀態顯示元件
- [ ] 建立 Token 預算設定 UI
- [ ] 建立模型自動路由規則設定

### Phase 3（3-4 週）：進階功能

- [ ] 實作每日/每月消費儀表板
- [ ] 建立指令白名單/黑名單管理介面
- [ ] 實作自動 Git checkpoint（每次 AI 修改前自動 commit）
- [ ] 建立 OpenClaw 執行日誌 viewer

---

## 七、結論與建議

OpenClaw + Claude Code 的組合**高度可行**，與本專案現有的 AI Settings 架構有自然的整合點：

1. **立即可行**：Telegram Bot + OpenClaw Gateway + Claude Code CLI，三者串接後即可從手機下指令開發。配置時間約 1-2 小時。
2. **預算建議**：初期設定月預算上限 **$30 USD**，混合路由（Haiku + Sonnet），實際使用後再調整。所有供應商務必在後台設定 Hard Limit，防止意外超支。
3. **安全第一**：

   - 使用 Telegram（非 WhatsApp）
   - Gateway 絕不暴露公網，搭配 VPN 或 Tailscale
   - 危險操作（Migration、生產部署）保留在電腦操作
4. **整合優先順序**：先實作 `IDE Setting` Tab 的 UI 骨架 → 再接 OpenClaw WebSocket 狀態 → 最後做預算監控。

---

## 參考資料

- [OpenClaw 官方文件](https://docs.openclaw.ai)
- [OpenClaw GitHub](https://github.com/openclaw/openclaw)
- [OpenClaw Coding Agent Skill (Claude Code MCP)](https://github.com/Enderfga/openclaw-claude-code-skill)
- [Token 消費優化指南](https://help.apiyi.com/en/openclaw-token-cost-optimization-claude-cache-guide-en.html)
- [Channel 安全性比較：Telegram vs WhatsApp vs Signal](https://zenvanriel.com/ai-engineer-blog/openclaw-channel-security-risks-comparison/)
- [OpenClaw 安全部署指南](https://docs.openclaw.ai/gateway/security)
- [OpenClaw vs Claude Code 比較](https://www.datacamp.com/blog/openclaw-vs-claude-code)
- [每月成本估算](https://www.thecaio.ai/blog/openclaw-pricing-guide)
