# AI Adapter 註冊規則

> 新增 / 修改 `apps/superadmin/lib/adapter-config.ts` 之前**必讀**。
> 違反規則會被 pre-commit hook 擋下（`tools/testing/lint-adapter-model-ids.sh`）。

---

## `model` 欄位前綴規則

`provider` 對應 `model` 前綴的對照：

| provider | `model` 允許的前綴 | 範例 |
| :-- | :-- | :-- |
| `opencode` | `opencode/` 或 `openrouter/` | `opencode/grok-code-fast-1` / `openrouter/minimax/minimax-m2.5` |
| `kilo` | `opencode/` 或 `openrouter/` | `openrouter/qwen/qwen3.6-plus` |
| `claude` / `codex` / `gemini` | 無限制（CLI 直接收 slug） | `claude-opus-4-7` / `gpt-5.3-codex` / `gemini-3.1-pro-preview` |

### 為什麼必要

`opencode` / `kilo` CLI 會把 model 字串直接丟給 aggregator（OpenRouter）。漏了 `openrouter/` 或 `opencode/` 前綴時 CLI 會 fallback 到 `openrouter/auto`，**不報錯**，實際跑的模型由 OpenRouter 自行決定（通常是 DeepSeek 系 free tier），造成：

- 測試結果不可控（同一 row 不同時間回不同模型）
- 計費錯誤（走到付費 tier 但管理面板以為走免費 tier）
- 版本偷換不可見（例：曾經 `minimax/minimax-m2.7` 被靜默路由到 M2.1，詳見 `project-process/dev-logs/dev-ai-settings-adapter-self-report-2026-04-19.md` §2 困難 B）

---

## `provider` 與 `cliCommandTemplate` 對應

| provider | CLI binary | cliCommandTemplate |
| :-- | :-- | :-- |
| `claude` | `claude` | `claude -p "<prompt>"` |
| `codex` | `codex` | `codex exec "<prompt>"` |
| `gemini` | `agent`（Cursor CLI） | `agent -p "<prompt>"` |
| `kilo` | `kilo` | `kilo run "<prompt>"` |
| `opencode` | `opencode` | `opencode run "<prompt>"` |

完整 CLI 指令文件：`docs/Adapter CLIs/`（透過 `/update-cli-docs` 同步）。

---

## id / optionValue 命名慣例

- 格式：`<provider-short>-<vendor>-<model-version>`
- 只允許 lowercase + 連字號；`.` 版本號轉 `-`（例：`qwen3.6-plus` → `qwen-3-6-plus`）
- 範例：`claude-opus-4-7`、`opencode-minimax-m2-5`、`kilo-qwen-3-6-plus`
- `id === optionValue`（目前慣例，可於未來解耦）

---

## Legacy exemptions（暫時豁免清單）

`lint-adapter-model-ids.sh` 內含 `LEGACY_EXEMPTIONS` Set，列出**預存**於 lint 出現前的違規 row，允許短期豁免（印 warning 但不 fail）。

當前豁免清單（截至 2026-04-21）：

- `opencode-glm-5-1`

**處理流程**：Row 100 P1 baseline self-report 盤點會逐一確認模型真實 id，修正後於**同一個 PR**中：

1. 修正 `apps/superadmin/lib/adapter-config.ts` 的 `model` 欄位
2. 從 `LEGACY_EXEMPTIONS` 移除該 id

**禁止新增豁免**：新加入的 row 不得寫進 `LEGACY_EXEMPTIONS`，否則失去 lint 抓雷的意義。

---

## 測試

- 單元測試：`apps/superadmin/unit_test/100/lint-adapter-model-ids.test.js`（6 cases：合法 / 違規 / 豁免 / 不受限 provider / mixed）
- 手動驗證：`bash tools/testing/lint-adapter-model-ids.sh`
- Manifest 登記：test-manifest.json `id: "100"`

---

## 相關檔案

- 設定表：[apps/superadmin/lib/adapter-config.ts](../../../apps/superadmin/lib/adapter-config.ts)
- Lint：[tools/testing/lint-adapter-model-ids.sh](../../../tools/testing/lint-adapter-model-ids.sh)
- Pre-commit hook：[.husky/pre-commit](../../../.husky/pre-commit) step 4
- Dev log 背景：[project-process/dev-logs/dev-ai-settings-adapter-self-report-2026-04-19.md](../../../project-process/dev-logs/dev-ai-settings-adapter-self-report-2026-04-19.md) §2 困難 B、§4.3、§5
